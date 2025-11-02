import { AssetLoader, AssetLoadError } from './AssetLoader.js';
import { eventBus } from '../events/EventBus.js';

/**
 * Asset priority tiers for loading optimization.
 * @enum {string}
 */
export const AssetPriority = {
  CRITICAL: 'critical', // Core UI, player sprites, essential SFX (<3s)
  DISTRICT: 'district', // District-specific assets (<1s per district)
  OPTIONAL: 'optional'  // Particles, ambient sounds (background load)
};

/**
 * AssetManager - Manages asset lifecycle with lazy loading and reference counting.
 * Performance targets: <3s initial load, <1s per district.
 *
 * Features:
 * - Reference counting for automatic cleanup
 * - Priority-based loading queues
 * - Lazy loading on demand
 * - Asset grouping and batch preloading
 * - Progress tracking per priority tier
 * - EventBus integration for loading events
 *
 * @class AssetManager
 * @example
 * const manager = new AssetManager();
 * await manager.loadManifest('assets/manifest.json');
 *
 * // Load critical assets first
 * await manager.preloadGroup('ui', AssetPriority.CRITICAL);
 *
 * // Lazy load on demand
 * const sprite = await manager.getAsset('player-sprite');
 *
 * // Release when done
 * manager.releaseAsset('player-sprite');
 */
export class AssetManager {
  /**
   * Creates a new AssetManager.
   * @param {object} options - Configuration options
   * @param {AssetLoader} options.loader - Custom asset loader (optional)
   * @param {object} [options.concurrency] - Optional per-priority concurrency overrides
   */
  constructor(options = {}) {
    this.loader = options.loader || new AssetLoader();
    this.assets = new Map(); // assetId -> { data, refCount, type, group, priority }
    this.loading = new Map(); // assetId -> Promise
    this.manifest = null; // Asset manifest data
    this.groups = new Map(); // groupName -> Set<assetId>
    this.priorityQueues = {
      [AssetPriority.CRITICAL]: [],
      [AssetPriority.DISTRICT]: [],
      [AssetPriority.OPTIONAL]: []
    };
    const concurrencyOverrides = options.concurrency || {};
    const resolveConcurrency = (priority, fallback) => {
      const override = concurrencyOverrides[priority];
      if (Number.isFinite(override) && override > 0) {
        return Math.floor(override);
      }
      return fallback;
    };
    this.concurrency = {
      [AssetPriority.CRITICAL]: resolveConcurrency(AssetPriority.CRITICAL, 1),
      [AssetPriority.DISTRICT]: resolveConcurrency(AssetPriority.DISTRICT, 2),
      [AssetPriority.OPTIONAL]: resolveConcurrency(AssetPriority.OPTIONAL, 1)
    };
    this.activeLoads = {
      [AssetPriority.CRITICAL]: 0,
      [AssetPriority.DISTRICT]: 0,
      [AssetPriority.OPTIONAL]: 0
    };
    this.loadingStats = {
      [AssetPriority.CRITICAL]: { loaded: 0, total: 0 },
      [AssetPriority.DISTRICT]: { loaded: 0, total: 0 },
      [AssetPriority.OPTIONAL]: { loaded: 0, total: 0 }
    };
  }

  /**
   * Loads asset manifest file.
   * Manifest format: { assets: [{ id, url, type, group, priority }], groups: {...} }
   * @param {string} url - Manifest URL
   * @returns {Promise<void>}
   */
  async loadManifest(url) {
    try {
      this.manifest = await this.loader.loadJSON(url);
      this._buildGroups();
      eventBus.emit('asset:manifest-loaded', { manifest: this.manifest });
    } catch (error) {
      const telemetry = AssetLoadError.buildTelemetryContext(error, {
        consumer: 'AssetManager.loadManifest',
        manifestUrl: url
      });
      telemetry.error = telemetry.message;
      console.error('Failed to load manifest:', error, telemetry);
      eventBus.emit('asset:manifest-failed', telemetry);
      throw error;
    }
  }

  /**
   * Builds group registry from manifest.
   * @private
   */
  _buildGroups() {
    if (!this.manifest || !this.manifest.assets) {
      return;
    }

    this.groups.clear();

    for (let i = 0; i < this.manifest.assets.length; i++) {
      const asset = this.manifest.assets[i];
      if (asset.group) {
        if (!this.groups.has(asset.group)) {
          this.groups.set(asset.group, new Set());
        }
        this.groups.get(asset.group).add(asset.id);
      }
    }
  }

  /**
   * Loads an asset by ID with reference counting.
   * If already loaded, increments reference count.
   * If loading, returns existing promise.
   * Otherwise, starts new load.
   *
   * @param {string} assetId - Asset identifier
   * @param {object} [options]
   * @param {AssetPriority|string} [options.priority] - Override priority for queue placement
   * @param {boolean} [options.trackProgress=false] - Whether to update loading stats for this load
   * @returns {Promise<any>} Loaded asset data
   */
  async loadAsset(assetId, options = {}) {
    // Already loaded - increment reference
    if (this.assets.has(assetId)) {
      const asset = this.assets.get(assetId);
      asset.refCount++;
      eventBus.emit('asset:reference-acquired', { assetId, refCount: asset.refCount });
      return asset.data;
    }

    // Currently loading - return existing promise
    if (this.loading.has(assetId)) {
      return this.loading.get(assetId);
    }

    const assetInfo = this._getAssetInfo(assetId);
    if (!assetInfo) {
      throw new Error(`Asset not found in manifest: ${assetId}`);
    }

    const priority = this._normalizePriority(
      options.priority || assetInfo.priority || AssetPriority.OPTIONAL
    );

    const deferred = this._createDeferred();
    this.loading.set(assetId, deferred.promise);

    this.priorityQueues[priority].push({
      assetId,
      assetInfo,
      priority,
      deferred,
      trackProgress: options.trackProgress === true
    });

    this._processQueues();

    return deferred.promise;
  }

  /**
   * Loads asset data from disk.
   * @private
   * @param {string} assetId - Asset identifier
   * @param {object|null} assetInfo - Resolved asset info from manifest
   * @returns {Promise<any>} Asset data
   */
  async _loadAssetData(assetId, assetInfo = null) {
    const resolvedInfo = assetInfo || this._getAssetInfo(assetId);
    if (!resolvedInfo) {
      throw new Error(`Asset not found in manifest: ${assetId}`);
    }

    const { url, type } = resolvedInfo;
    eventBus.emit('asset:loading', { assetId, url, type });

    return await this.loader._loadAssetByType(url, type);
  }

  /**
   * Gets asset info from manifest.
   * @private
   * @param {string} assetId - Asset identifier
   * @returns {object|null} Asset info
   */
  _getAssetInfo(assetId) {
    if (!this.manifest || !this.manifest.assets) {
      return null;
    }

    for (let i = 0; i < this.manifest.assets.length; i++) {
      if (this.manifest.assets[i].id === assetId) {
        return this.manifest.assets[i];
      }
    }

    return null;
  }

  /**
   * Normalizes priority input to a known tier.
   * @private
   * @param {string} priority
   * @returns {AssetPriority}
   */
  _normalizePriority(priority) {
    if (priority === AssetPriority.CRITICAL || priority === AssetPriority.DISTRICT || priority === AssetPriority.OPTIONAL) {
      return priority;
    }

    const normalized = typeof priority === 'string' ? priority.toLowerCase() : '';
    switch (normalized) {
      case AssetPriority.CRITICAL:
        return AssetPriority.CRITICAL;
      case AssetPriority.DISTRICT:
        return AssetPriority.DISTRICT;
      case AssetPriority.OPTIONAL:
        return AssetPriority.OPTIONAL;
      default:
        return AssetPriority.OPTIONAL;
    }
  }

  /**
   * Creates a deferred promise wrapper for queue entries.
   * @private
   * @returns {{promise: Promise<any>, resolve: Function, reject: Function}}
   */
  _createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }

  /**
   * Processes queued loads according to priority ordering and concurrency caps.
   * @private
   */
  _processQueues() {
    const priorities = [AssetPriority.CRITICAL, AssetPriority.DISTRICT, AssetPriority.OPTIONAL];

    for (let i = 0; i < priorities.length; i++) {
      const priority = priorities[i];

      if (this._hasBlockingHigherPriority(priority)) {
        continue;
      }

      const queue = this.priorityQueues[priority];
      while (
        queue.length > 0 &&
        this.activeLoads[priority] < this.concurrency[priority] &&
        !this._hasBlockingHigherPriority(priority)
      ) {
        const entry = queue.shift();
        this._startQueuedLoad(entry);
      }
    }
  }

  /**
   * Determines whether a higher priority tier is still active or queued.
   * @private
   * @param {AssetPriority} priority
   * @returns {boolean}
   */
  _hasBlockingHigherPriority(priority) {
    const priorities = [AssetPriority.CRITICAL, AssetPriority.DISTRICT, AssetPriority.OPTIONAL];
    const index = priorities.indexOf(priority);

    for (let i = 0; i < index; i++) {
      const tier = priorities[i];
      if (this.priorityQueues[tier].length > 0 || this.activeLoads[tier] > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Starts a queued asset load respecting telemetry and progress tracking.
   * @private
   * @param {{assetId: string, assetInfo: object, priority: AssetPriority, deferred: {resolve: Function, reject: Function}, trackProgress: boolean}} entry
   */
  _startQueuedLoad(entry) {
    const { assetId, assetInfo, priority, deferred, trackProgress } = entry;
    this.activeLoads[priority]++;

    this._loadAssetData(assetId, assetInfo)
      .then((data) => {
        this.loading.delete(assetId);
        this.assets.set(assetId, {
          data,
          refCount: 1,
          type: assetInfo.type,
          group: assetInfo.group,
          priority
        });
        eventBus.emit('asset:loaded', { assetId, type: assetInfo.type });
        deferred.resolve(data);
      })
      .catch((error) => {
        this.loading.delete(assetId);
        const telemetry = AssetLoadError.buildTelemetryContext(error, {
          assetId,
          consumer: 'AssetManager.loadAsset'
        });
        telemetry.error = telemetry.message;
        eventBus.emit('asset:failed', telemetry);
        deferred.reject(error);
      })
      .finally(() => {
        if (trackProgress) {
          const stats = this.loadingStats[priority];
          stats.loaded = Math.min(stats.loaded + 1, stats.total);
          this._emitPriorityProgress(priority);
        }

        if (this.activeLoads[priority] > 0) {
          this.activeLoads[priority]--;
        }

        this._processQueues();
      });
  }

  /**
   * Gets a loaded asset without loading it.
   * @param {string} assetId - Asset identifier
   * @returns {any|null} Asset data or null if not loaded
   */
  getAsset(assetId) {
    const asset = this.assets.get(assetId);
    return asset ? asset.data : null;
  }

  /**
   * Releases an asset reference, unloading if count reaches 0.
   * @param {string} assetId - Asset identifier
   */
  releaseAsset(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return;
    }

    asset.refCount--;
    eventBus.emit('asset:reference-released', { assetId, refCount: asset.refCount });

    if (asset.refCount <= 0) {
      this._unloadAsset(assetId);
    }
  }

  /**
   * Unloads an asset and frees memory.
   * @private
   * @param {string} assetId - Asset identifier
   */
  _unloadAsset(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return;
    }

    // Clean up asset data
    if (asset.data) {
      // For images, clear src to free memory
      if (asset.data instanceof HTMLImageElement) {
        asset.data.src = '';
      }
      // For audio, pause and clear
      if (asset.data instanceof HTMLAudioElement) {
        asset.data.pause();
        asset.data.src = '';
      }
    }

    this.assets.delete(assetId);
    eventBus.emit('asset:unloaded', { assetId });
  }

  /**
   * Preloads all assets in a group with specified priority.
   * @param {string} groupName - Group name
   * @param {AssetPriority} priority - Loading priority (optional)
   * @returns {Promise<Map<string, any>>} Map of assetId -> loaded data
   */
  async preloadGroup(groupName, priority = null) {
    const assetIds = this.groups.get(groupName);
    if (!assetIds || assetIds.size === 0) {
      console.warn(`Group not found or empty: ${groupName}`);
      return new Map();
    }

    const assets = Array.from(assetIds).map(id => {
      const info = this._getAssetInfo(id);
      return {
        id,
        url: info.url,
        type: info.type,
        priority: priority || info.priority
      };
    });

    return this.preloadAssets(assets);
  }

  /**
   * Preloads multiple assets with priority-based loading.
   * @param {Array<{id, url, type, priority}>} assets - Assets to preload
   * @returns {Promise<Map<string, any>>} Map of assetId -> loaded data
   */
  async preloadAssets(assets) {
    // Sort by priority
    const critical = [];
    const district = [];
    const optional = [];

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const normalized = this._normalizePriority(asset.priority);
      switch (normalized) {
        case AssetPriority.CRITICAL:
          critical.push(asset);
          break;
        case AssetPriority.DISTRICT:
          district.push(asset);
          break;
        case AssetPriority.OPTIONAL:
          optional.push(asset);
          break;
        default:
          optional.push(asset);
      }
    }

    const results = new Map();

    // Load critical assets first (sequential for priority)
    if (critical.length > 0) {
      eventBus.emit('asset:priority-loading', {
        priority: AssetPriority.CRITICAL,
        count: critical.length
      });
      const criticalResults = await this._queuePriorityBatch(critical, AssetPriority.CRITICAL, true);
      for (const [id, data] of criticalResults) {
        results.set(id, data);
      }
    }

    // Load district assets (parallel within tier)
    if (district.length > 0) {
      eventBus.emit('asset:priority-loading', {
        priority: AssetPriority.DISTRICT,
        count: district.length
      });
      const districtResults = await this._queuePriorityBatch(district, AssetPriority.DISTRICT, true);
      for (const [id, data] of districtResults) {
        results.set(id, data);
      }
    }

    // Load optional assets in background (don't block)
    if (optional.length > 0) {
      eventBus.emit('asset:priority-loading', {
        priority: AssetPriority.OPTIONAL,
        count: optional.length
      });
      // Fire and forget for optional assets
      this._queuePriorityBatch(optional, AssetPriority.OPTIONAL, false);
    }

    return results;
  }

  /**
   * Queues a batch of assets for loading and optionally waits for completion.
   * @private
   * @param {Array<{id: string, priority: AssetPriority|string}>} assets
   * @param {AssetPriority} priority
   * @param {boolean} awaitResults
   * @returns {Promise<Map<string, any>>}
   */
  async _queuePriorityBatch(assets, priority, awaitResults) {
    this.loadingStats[priority].loaded = 0;
    this.loadingStats[priority].total = assets.length;

    const tasks = assets.map(asset => {
      const normalizedPriority = this._normalizePriority(asset.priority || priority);

      return this.loadAsset(asset.id, {
        priority: normalizedPriority,
        trackProgress: true
      }).then(data => ({
        status: 'fulfilled',
        id: asset.id,
        data
      })).catch(error => ({
        status: 'rejected',
        id: asset.id,
        error,
        priority: normalizedPriority
      }));
    });

    if (awaitResults) {
      const settled = await Promise.all(tasks);
      const results = new Map();

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === 'fulfilled') {
          results.set(result.id, result.data);
        } else if (result.status === 'rejected') {
          this._reportPriorityFailure(result.id, result.priority || priority, result.error);
        }
      }

      return results;
    }

    Promise.all(tasks).then((settled) => {
      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === 'rejected') {
          this._reportPriorityFailure(result.id, result.priority || priority, result.error);
        }
      }
    }).catch(error => {
      console.error('Unexpected optional preload failure:', error);
    });

    // Optional loads run in background; return empty map but ensure progress events fire.
    return new Map();
  }

  /**
   * Logs priority load failures with structured telemetry.
   * @private
   * @param {string} assetId
   * @param {AssetPriority} priority
   * @param {Error} error
   */
  _reportPriorityFailure(assetId, priority, error) {
    const telemetry = AssetLoadError.buildTelemetryContext(error, {
      assetId,
      priority,
      consumer: 'AssetManager._queuePriorityBatch'
    });
    telemetry.error = telemetry.message;
    console.error(`Failed to load ${priority} asset ${assetId}:`, error, telemetry);
  }

  /**
   * Emits progress event for a priority tier.
   * @private
   * @param {AssetPriority} priority - Priority tier
   */
  _emitPriorityProgress(priority) {
    const stats = this.loadingStats[priority];
    const percentage = stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0;

    eventBus.emit('asset:progress', {
      priority,
      loaded: stats.loaded,
      total: stats.total,
      percentage
    });
  }

  /**
   * Unloads all assets in a group.
   * @param {string} groupName - Group name
   */
  unloadGroup(groupName) {
    const assetIds = this.groups.get(groupName);
    if (!assetIds) {
      return;
    }

    for (const assetId of assetIds) {
      const asset = this.assets.get(assetId);
      if (asset) {
        // Force unload regardless of ref count
        asset.refCount = 0;
        this._unloadAsset(assetId);
      }
    }

    eventBus.emit('asset:group-unloaded', { groupName });
  }

  /**
   * Unloads all unused assets (ref count = 0).
   * Useful for memory cleanup between levels.
   */
  unloadUnused() {
    const toUnload = [];

    for (const [assetId, asset] of this.assets) {
      if (asset.refCount <= 0) {
        toUnload.push(assetId);
      }
    }

    for (let i = 0; i < toUnload.length; i++) {
      this._unloadAsset(toUnload[i]);
    }

    eventBus.emit('asset:cleanup', { unloaded: toUnload.length });
  }

  /**
   * Gets loading statistics for a priority tier.
   * @param {AssetPriority} priority - Priority tier
   * @returns {{loaded: number, total: number, percentage: number}}
   */
  getLoadingStats(priority) {
    const stats = this.loadingStats[priority];
    const percentage = stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0;

    return {
      loaded: stats.loaded,
      total: stats.total,
      percentage
    };
  }

  /**
   * Gets overall asset statistics.
   * @returns {{loaded: number, loading: number, groups: number, memory: number}}
   */
  getStats() {
    return {
      loaded: this.assets.size,
      loading: this.loading.size,
      groups: this.groups.size,
      memory: this._estimateMemoryUsage()
    };
  }

  /**
   * Estimates memory usage in bytes (rough approximation).
   * @private
   * @returns {number} Estimated bytes
   */
  _estimateMemoryUsage() {
    let bytes = 0;

    for (const asset of this.assets.values()) {
      if (asset.data instanceof HTMLImageElement) {
        // Rough estimate: width * height * 4 bytes per pixel
        bytes += asset.data.width * asset.data.height * 4;
      } else if (typeof asset.data === 'object') {
        // Rough estimate for JSON: stringify length * 2
        bytes += JSON.stringify(asset.data).length * 2;
      }
    }

    return bytes;
  }

  /**
   * Clears all assets and resets manager state.
   */
  clear() {
    // Unload all assets
    for (const assetId of this.assets.keys()) {
      this._unloadAsset(assetId);
    }

    this.assets.clear();
    this.loading.clear();
    this.groups.clear();
    this.manifest = null;

    // Reset stats
    for (const priority in this.loadingStats) {
      this.loadingStats[priority].loaded = 0;
      this.loadingStats[priority].total = 0;
    }

    eventBus.emit('asset:cleared');
  }
}
