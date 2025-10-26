import { AssetLoader } from './AssetLoader.js';
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
      console.error('Failed to load manifest:', error);
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
   * @returns {Promise<any>} Loaded asset data
   */
  async loadAsset(assetId) {
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

    // Start new load
    const promise = this._loadAssetData(assetId);
    this.loading.set(assetId, promise);

    try {
      const data = await promise;
      this.loading.delete(assetId);

      const assetInfo = this._getAssetInfo(assetId);
      this.assets.set(assetId, {
        data,
        refCount: 1,
        type: assetInfo.type,
        group: assetInfo.group,
        priority: assetInfo.priority
      });

      eventBus.emit('asset:loaded', { assetId, type: assetInfo.type });
      return data;

    } catch (error) {
      this.loading.delete(assetId);
      eventBus.emit('asset:failed', { assetId, error: error.message });
      throw error;
    }
  }

  /**
   * Loads asset data from disk.
   * @private
   * @param {string} assetId - Asset identifier
   * @returns {Promise<any>} Asset data
   */
  async _loadAssetData(assetId) {
    const assetInfo = this._getAssetInfo(assetId);
    if (!assetInfo) {
      throw new Error(`Asset not found in manifest: ${assetId}`);
    }

    eventBus.emit('asset:loading', { assetId, url: assetInfo.url, type: assetInfo.type });

    return await this.loader._loadAssetByType(assetInfo.url, assetInfo.type);
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
      switch (asset.priority) {
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
      const criticalResults = await this._loadPriorityBatch(critical, AssetPriority.CRITICAL);
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
      const districtResults = await this._loadPriorityBatch(district, AssetPriority.DISTRICT);
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
      this._loadPriorityBatch(optional, AssetPriority.OPTIONAL).catch(error => {
        console.warn('Optional asset loading failed:', error);
      });
    }

    return results;
  }

  /**
   * Loads a batch of assets with progress tracking.
   * @private
   * @param {Array<{id, url, type}>} assets - Assets to load
   * @param {AssetPriority} priority - Priority tier
   * @returns {Promise<Map<string, any>>} Loaded assets
   */
  async _loadPriorityBatch(assets, priority) {
    this.loadingStats[priority].loaded = 0;
    this.loadingStats[priority].total = assets.length;

    const results = new Map();
    const promises = [];

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const promise = this.loadAsset(asset.id)
        .then(data => {
          results.set(asset.id, data);
          this.loadingStats[priority].loaded++;
          this._emitPriorityProgress(priority);
        })
        .catch(error => {
          console.error(`Failed to load ${priority} asset ${asset.id}:`, error);
          this.loadingStats[priority].loaded++;
          this._emitPriorityProgress(priority);
        });

      promises.push(promise);
    }

    await Promise.all(promises);
    return results;
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
