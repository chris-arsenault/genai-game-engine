/**
 * SaveManager
 *
 * Coordinates save/load operations across all game managers.
 * Implements autosave functionality triggered by game events.
 *
 * Features:
 * - Centralized save coordination
 * - Multiple save slots
 * - Autosave on key game events
 * - Save metadata (timestamp, playtime, version)
 * - Error handling and recovery
 */

import { factionSlice } from '../state/slices/factionSlice.js';
import { tutorialSlice } from '../state/slices/tutorialSlice.js';
import { districtSlice } from '../state/slices/districtSlice.js';
import { npcSlice } from '../state/slices/npcSlice.js';
import {
  createInspectorExportArtifacts,
  SPATIAL_HISTORY_BUDGET_BYTES
} from '../telemetry/inspectorTelemetryExporter.js';
import { TelemetryArtifactWriterAdapter } from '../telemetry/TelemetryArtifactWriterAdapter.js';
import { buildTutorialTranscript } from '../tutorial/serializers/tutorialTranscriptSerializer.js';

export class SaveManager {
  constructor(eventBus, managers = {}) {
    this.eventBus = eventBus;
    this.events = eventBus; // Legacy alias maintained for compatibility

    // Manager references
    this.storyFlagManager = managers.storyFlagManager;
    this.questManager = managers.questManager;
    this.factionManager = managers.factionManager;
    this.tutorialSystem = managers.tutorialSystem;
    this.worldStateStore = managers.worldStateStore ?? null;
    this.storage =
      managers.storage ??
      (typeof globalThis !== 'undefined' && globalThis.localStorage
        ? globalThis.localStorage
        : null);
    this.tutorialTranscriptRecorder = managers.tutorialTranscriptRecorder ?? null;

    // Save state
    this.autosaveEnabled = true;
    this.autosaveInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.lastAutosaveTime = 0;
    this.gameStartTime = Date.now();

    // Configuration
    this.config = {
      storageKeyPrefix: 'save_',
      metadataKey: 'save_metadata',
      version: 1,
      maxSaveSlots: 10,
      maxSlotNameLength: 32,
      verifyWorldStateParity: true,
    };

    // Telemetry export integration
    const telemetryAdapterCandidate = managers.telemetryAdapter;
    this._telemetryAdapter =
      telemetryAdapterCandidate && typeof telemetryAdapterCandidate.writeArtifacts === 'function'
        ? telemetryAdapterCandidate
        : null;
    const telemetryWriters = Array.isArray(managers.telemetryWriters) ? [...managers.telemetryWriters] : null;
    this._telemetrySeedWriters = telemetryWriters;
    this._spatialMetricsProvider = null;
    if (typeof managers.spatialMetricsProvider === 'function') {
      this.registerSpatialMetricsProvider(managers.spatialMetricsProvider);
    }
    const controlBindingsProvider = managers.controlBindingsObservationProvider;
    this._controlBindingsObservationProvider =
      typeof controlBindingsProvider === 'function' ? controlBindingsProvider : null;

    // Event unsubscriber references
    this._offQuestCompleted = null;
    this._offObjectiveCompleted = null;
    this._offAreaEntered = null;
    this._offCaseCompleted = null;
    this._offInventoryAdded = null;
    this._offInventoryRemoved = null;
    this._offInventoryUpdated = null;
    this._lastInventoryAutosave = 0;

    console.log('[SaveManager] Initialized');
  }

  /**
   * Initialize the save manager and subscribe to autosave events
   */
  init() {
    this.subscribeToAutosaveEvents();
    this.lastAutosaveTime = Date.now();
    console.log('[SaveManager] Autosave enabled');
  }

  /**
   * Subscribe to events that trigger autosave
   */
  subscribeToAutosaveEvents() {
    // Autosave on quest completion
    this._offQuestCompleted = this.eventBus.on('quest:completed', (data) => {
      console.log(`[SaveManager] Quest completed (${data.questId}), autosaving...`);
      this.saveGame('autosave');
    });

    // Autosave on major objectives only (optional - can be configured)
    this._offObjectiveCompleted = this.eventBus.on('objective:completed', (data) => {
      // Only autosave on major objectives (not every single objective)
      // You can add logic here to determine "major" objectives
      if (this.isMajorObjective(data.objectiveId)) {
        console.log(`[SaveManager] Major objective completed (${data.objectiveId}), autosaving...`);
        this.saveGame('autosave');
      }
    });

    // Autosave when entering new areas
    this._offAreaEntered = this.eventBus.on('area:entered', (data) => {
      console.log(`[SaveManager] Entered area (${data.areaId}), autosaving...`);
      this.saveGame('autosave');
    });

    // Autosave when case is completed
    this._offCaseCompleted = this.eventBus.on('case:completed', (data) => {
      console.log(`[SaveManager] Case completed (${data.caseId}), autosaving...`);
      this.saveGame('autosave');
    });

    const inventoryAutosave = () => {
      if (!this.autosaveEnabled) {
        return;
      }

      const now = Date.now();
      if (now - this._lastInventoryAutosave < 1000) {
        return;
      }

      this._lastInventoryAutosave = now;
      console.log('[SaveManager] Inventory changed, autosaving...');
      this.saveGame('autosave');
    };

    this._offInventoryAdded = this.eventBus.on('inventory:item_added', inventoryAutosave);
    this._offInventoryUpdated = this.eventBus.on('inventory:item_updated', inventoryAutosave);
    this._offInventoryRemoved = this.eventBus.on('inventory:item_removed', inventoryAutosave);
  }

  /**
   * Check if an objective is considered "major" for autosave purposes
   * @param {string} objectiveId
   * @returns {boolean}
   */
  isMajorObjective(objectiveId) {
    // Major objectives typically involve significant story progression
    const majorKeywords = ['solve', 'complete', 'discover', 'confront', 'unlock'];
    return majorKeywords.some(keyword => objectiveId.toLowerCase().includes(keyword));
  }

  /**
   * Save the game to a specific slot
   * @param {string} slot - Save slot name (default: 'autosave')
   * @returns {boolean} Success
   */
  saveGame(slot = 'autosave') {
    const resolvedSlot = this._normalizeSlotName(slot);
    try {
      // Calculate current playtime
      const playtime = Date.now() - this.gameStartTime;

      let snapshot = null;

      if (this.worldStateStore) {
        snapshot = this.worldStateStore.snapshot();
      }

      const legacyGameData = this.collectLegacyGameData(snapshot?.inventory);

      if (snapshot && this.config.verifyWorldStateParity) {
        this.verifySnapshotParity(snapshot, legacyGameData);
      }

      const gameData = snapshot ? { ...snapshot } : legacyGameData;

      if (typeof gameData.tutorialComplete === 'undefined') {
        gameData.tutorialComplete = legacyGameData.tutorialComplete ?? false;
      }

      // Create save object
      const slotLabel =
        typeof slot === 'string' && slot.trim().length ? slot.trim() : resolvedSlot;

      const saveData = {
        version: this.config.version,
        timestamp: Date.now(),
        playtime,
        slot: resolvedSlot,
        gameData,
        meta: {
          snapshotSource: snapshot ? 'worldStateStore' : 'legacy-managers',
          slotLabel,
        },
      };

      // Serialize and save to persistent storage
      const serialized = JSON.stringify(saveData);
      const storageKey = this.config.storageKeyPrefix + resolvedSlot;
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }
      this.storage.setItem(storageKey, serialized);

      // Update save metadata
      this.updateSaveMetadata(resolvedSlot, saveData);

      // Emit success event
      this.eventBus.emit('game:saved', {
        slot: resolvedSlot,
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
      });

      this._lastInventoryAutosave = Date.now();
      console.log(`[SaveManager] Game saved to slot: ${resolvedSlot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to save game:', error);
      this.eventBus.emit('game:save_failed', {
        slot: resolvedSlot,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Load the game from a specific slot
   * @param {string} slot - Save slot name (default: 'autosave')
   * @returns {boolean} Success
   */
  loadGame(slot = 'autosave') {
    const resolvedSlot = this._normalizeSlotName(slot);
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      // Retrieve save data from storage
      const storageKey = this.config.storageKeyPrefix + resolvedSlot;
      const serialized = this.storage.getItem(storageKey);

      if (!serialized) {
        console.warn(`[SaveManager] No save found in slot: ${resolvedSlot}`);
        return false;
      }

      // Parse save data
      const saveData = JSON.parse(serialized);

      // Version check
      if (saveData.version !== this.config.version) {
        console.warn(`[SaveManager] Save version mismatch: ${saveData.version} vs ${this.config.version}`);
        // Could implement migration here
      }

      // Restore game data to all managers
      this.restoreStoryFlags(saveData.gameData.storyFlags);
      this.restoreQuestData(saveData.gameData.quests);
      this.restoreFactionData(saveData.gameData.factions);
      this.restoreTutorialData(saveData.gameData.tutorial ?? saveData.gameData.tutorialComplete);

      if (this.worldStateStore) {
        this.worldStateStore.hydrate(saveData.gameData);
      }

      // Update game start time to account for saved playtime
      this.gameStartTime = Date.now() - saveData.playtime;

      // Emit success event
      this.eventBus.emit('game:loaded', {
        slot: resolvedSlot,
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
      });

      console.log(`[SaveManager] Game loaded from slot: ${resolvedSlot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to load game:', error);
      this.eventBus.emit('game:load_failed', {
        slot: resolvedSlot,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get list of available save slots with metadata
   * @returns {Array} Array of save slot info
   */
  getSaveSlots() {
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      const metadata = this._readMetadata();
      const entries = Object.entries(metadata);
      entries.sort((a, b) => {
        const timestampA = a[1]?.timestamp ?? 0;
        const timestampB = b[1]?.timestamp ?? 0;
        return timestampB - timestampA;
      });

      return entries.map(([slot, data]) => this._transformMetadataEntry(slot, data));
    } catch (error) {
      console.error('[SaveManager] Failed to get save slots:', error);
      return [];
    }
  }

  /**
   * Retrieve metadata for a specific save slot.
   * @param {string} slot
   * @returns {Object|null}
   */
  getSaveSlotMetadata(slot) {
    const resolvedSlot = this._normalizeSlotName(slot);

    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      const metadata = this._readMetadata();
      const entry = metadata[resolvedSlot];
      if (!entry) {
        return null;
      }
      return this._transformMetadataEntry(resolvedSlot, entry);
    } catch (error) {
      console.error('[SaveManager] Failed to read save slot metadata:', error);
      return null;
    }
  }

  /**
   * Determine whether a save slot exists.
   * @param {string} slot
   * @returns {boolean}
   */
  slotExists(slot) {
    const resolvedSlot = this._normalizeSlotName(slot);
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }
      const metadata = this._readMetadata();
      return Object.prototype.hasOwnProperty.call(metadata, resolvedSlot);
    } catch (error) {
      console.error('[SaveManager] Failed to check save slot existence:', error);
      return false;
    }
  }

  /**
   * Delete a save slot
   * @param {string} slot - Save slot name
   * @returns {boolean} Success
   */
  deleteSave(slot) {
    const resolvedSlot = this._normalizeSlotName(slot);
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      // Remove from storage
      const storageKey = this.config.storageKeyPrefix + resolvedSlot;
      this.storage.removeItem(storageKey);

      // Remove from metadata
      const metadata = this._readMetadata();
      if (Object.prototype.hasOwnProperty.call(metadata, resolvedSlot)) {
        delete metadata[resolvedSlot];
        this._writeMetadata(metadata);
      }

      console.log(`[SaveManager] Deleted save slot: ${resolvedSlot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to delete save:', error);
      return false;
    }
  }

  /**
   * Update save metadata for slot list
   * @param {string} slot
   * @param {Object} saveData
   */
  updateSaveMetadata(slot, saveData) {
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      const resolvedSlot = this._normalizeSlotName(slot);
      const metadata = this._readMetadata();
      const slotExists = Object.prototype.hasOwnProperty.call(metadata, resolvedSlot);

      metadata[resolvedSlot] = {
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
        version: saveData.version ?? this.config.version,
        slotType: this._isAutosaveSlot(resolvedSlot) ? 'auto' : 'manual',
        label: saveData.meta?.slotLabel ?? resolvedSlot,
        snapshotSource: saveData.meta?.snapshotSource ?? null,
      };

      let removedSlots = [];
      if (!slotExists && !this._isAutosaveSlot(resolvedSlot)) {
        removedSlots = this._enforceSlotCapacity(metadata, resolvedSlot);
      }

      this._writeMetadata(metadata);

      for (const removedSlot of removedSlots) {
        this._removeSlotStorage(removedSlot);
      }
    } catch (error) {
      console.error('[SaveManager] Failed to update save metadata:', error);
    }
  }

  /**
   * Check if autosave should trigger based on interval
   * Call this in your game update loop if you want time-based autosave
   * @param {number} currentTime - Current timestamp
   * @returns {boolean} Should autosave
   */
  shouldAutosave(currentTime) {
    if (!this.autosaveEnabled) return false;
    return (currentTime - this.lastAutosaveTime) >= this.autosaveInterval;
  }

  /**
   * Trigger a manual autosave (for interval-based autosave)
   * Call this from your game loop
   */
  updateAutosave() {
    const currentTime = Date.now();
    if (this.shouldAutosave(currentTime)) {
      console.log('[SaveManager] Interval autosave triggered');
      this.saveGame('autosave');
      this.lastAutosaveTime = currentTime;
    }
  }

  /**
   * Execute a burst of autosave operations for QA stress validation.
   * Useful for confirming SaveLoad overlay stability during high churn scenarios.
   * @param {object} [options]
   * @param {number} [options.iterations=20] - Number of autosaves to perform.
   * @param {number} [options.delayMs=0] - Delay between saves (milliseconds).
   * @param {string} [options.slot='autosave'] - Slot to target during the burst.
   * @param {boolean} [options.collectResults=false] - Whether to include per-iteration success flags.
   * @param {Function} [options.onIteration] - Optional callback for each iteration.
   * @param {boolean} [options.exportInspector=false] - When true, exports inspector telemetry after the burst.
   * @param {object} [options.exportOptions] - Options forwarded to exportInspectorSummary when exportInspector is true.
   * @returns {Promise<object>} Summary of the burst execution.
   */
  async runAutosaveBurst(options = {}) {
    const iterations = Math.max(1, Math.floor(options.iterations ?? 20));
    const slot = this._normalizeSlotName(options.slot ?? 'autosave');
    const delayMs = Math.max(0, options.delayMs ?? 0);
    const collect = options.collectResults === true;
    const onIteration = typeof options.onIteration === 'function' ? options.onIteration : null;

    let failures = 0;
    const results = collect ? [] : null;

    for (let i = 0; i < iterations; i++) {
      const success = this.saveGame(slot);
      if (!success) {
        failures += 1;
      }
      if (collect) {
        results.push({ iteration: i, success });
      }
      if (onIteration) {
        try {
          onIteration({ iteration: i, success, slot });
        } catch (error) {
          console.warn('[SaveManager] runAutosaveBurst iteration hook failed', error);
        }
      }
      if (delayMs > 0 && i < iterations - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    let exportResult = null;
    const shouldExport = options.exportInspector === true;
    if (shouldExport) {
      exportResult = await this.exportInspectorSummary(options.exportOptions || {});
    }

    const summary = { iterations, failures, slot };
    if (collect) {
      summary.results = results;
    }
    if (shouldExport) {
      summary.exportResult = exportResult;
    }
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('telemetry:autosave_burst_completed', summary);
    }
    return summary;
  }

  _normalizeSlotName(slot) {
    if (typeof slot === 'number' && Number.isFinite(slot)) {
      const numeric = Math.max(0, Math.floor(slot));
      return `slot${numeric}`.slice(0, this.config.maxSlotNameLength ?? 32);
    }

    const fallback = 'autosave';
    if (typeof slot !== 'string') {
      return fallback;
    }

    const trimmed = slot.trim();
    if (!trimmed.length) {
      return fallback;
    }

    const lowered = trimmed.toLowerCase();
    if (lowered === 'autosave') {
      return 'autosave';
    }

    const sanitized = lowered
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-_]+/, '')
      .replace(/[-_]+$/, '');

    const limit = Math.max(8, this.config.maxSlotNameLength ?? 32);
    const truncated = sanitized.slice(0, limit);
    return truncated.length ? truncated : fallback;
  }

  _isAutosaveSlot(slot) {
    return slot === 'autosave';
  }

  _readMetadata() {
    const serialized = this.storage?.getItem?.(this.config.metadataKey);
    if (!serialized) {
      return {};
    }

    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return { ...parsed };
  }

  _writeMetadata(metadata) {
    const payload = metadata && typeof metadata === 'object' ? metadata : {};
    this.storage.setItem(this.config.metadataKey, JSON.stringify(payload));
  }

  _transformMetadataEntry(slot, raw = {}) {
    const slotType = raw.slotType ?? (this._isAutosaveSlot(slot) ? 'auto' : 'manual');
    const label = typeof raw.label === 'string' && raw.label.trim().length ? raw.label : slot;
    return {
      slot,
      timestamp: raw.timestamp ?? null,
      playtime: raw.playtime ?? 0,
      version: raw.version ?? this.config.version,
      slotType,
      label,
      snapshotSource: raw.snapshotSource ?? null,
    };
  }

  _enforceSlotCapacity(metadata, preservedSlot) {
    const removed = [];
    const manualEntries = [];

    for (const [slot, data] of Object.entries(metadata)) {
      const slotType = data?.slotType ?? (this._isAutosaveSlot(slot) ? 'auto' : 'manual');
      if (slotType === 'manual') {
        manualEntries.push({
          slot,
          timestamp: Number.isFinite(data?.timestamp) ? data.timestamp : 0,
        });
      }
    }

    const maxSlotsValue = this._coerceNonNegativeInteger(this.config.maxSaveSlots);
    const maxSlots = Math.max(1, maxSlotsValue || 0);

    if (manualEntries.length <= maxSlots) {
      return removed;
    }

    manualEntries.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.slot.localeCompare(b.slot);
      }
      return a.timestamp - b.timestamp;
    });

    let removalsNeeded = manualEntries.length - maxSlots;
    for (const entry of manualEntries) {
      if (removalsNeeded <= 0) {
        break;
      }
      if (entry.slot === preservedSlot) {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(metadata, entry.slot)) {
        continue;
      }

      delete metadata[entry.slot];
      removed.push(entry.slot);
      removalsNeeded -= 1;
    }

    return removed;
  }

  _removeSlotStorage(slot) {
    if (!this.storage) {
      return;
    }

    try {
      const storageKey = this.config.storageKeyPrefix + slot;
      this.storage.removeItem(storageKey);
      console.log(`[SaveManager] Pruned save slot due to capacity: ${slot}`);
    } catch (error) {
      console.warn('[SaveManager] Failed to prune save slot:', slot, error);
    }
  }

  _coerceNonNegativeInteger(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
    return 0;
  }

  _truncateStringArray(values, limit = 6) {
    if (!Array.isArray(values) || values.length === 0) {
      return [];
    }
    const result = [];
    for (const entry of values) {
      if (typeof entry === 'string' && entry.length) {
        result.push(entry);
        if (result.length >= limit) {
          break;
        }
      }
    }
    return result;
  }

  _formatDurationLabel(ms) {
    const value = this._coerceNonNegativeInteger(ms);
    if (value <= 0) {
      return '0s';
    }
    if (value < 1000) {
      return `${value}ms`;
    }
    if (value < 60000) {
      const seconds = value / 1000;
      return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(value / 60000);
    const seconds = Math.round((value % 60000) / 1000);
    if (seconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  }

  _buildEmptyControlBindingsSummary(source = 'unavailable') {
    return {
      source,
      totalEvents: 0,
      durationMs: 0,
      durationLabel: '0s',
      firstEventAt: null,
      lastEventAt: null,
      actionsVisited: [],
      actionsVisitedCount: 0,
      actionsRemapped: [],
      actionsRemappedCount: 0,
      listModesVisited: [],
      pageRange: null,
      lastSelectedAction: null,
      metrics: {
        selectionMoves: 0,
        selectionBlocked: 0,
        listModeChanges: 0,
        listModeUnchanged: 0,
        pageNavigations: 0,
        pageNavigationBlocked: 0,
        pageSetChanges: 0,
        pageSetBlocked: 0,
        captureStarted: 0,
        captureCancelled: 0,
        bindingsApplied: 0,
        bindingsReset: 0,
        manualOverrideEvents: 0,
      },
      captureCancelReasons: {},
      dwell: {
        count: 0,
        totalMs: 0,
        averageMs: 0,
        averageLabel: '0s',
        maxMs: 0,
        maxLabel: '0s',
        minMs: 0,
        minLabel: '0s',
        lastMs: 0,
        lastLabel: '0s',
        lastAction: null,
        longestAction: null,
      },
      ratios: {
        selectionBlocked: {
          numerator: 0,
          denominator: 0,
          value: 0,
          percentage: '0%',
        },
        pageNavigationBlocked: {
          numerator: 0,
          denominator: 0,
          value: 0,
          percentage: '0%',
        },
      },
    };
  }

  _normalizeControlBindingsSummary(rawSummary) {
    if (!rawSummary || typeof rawSummary !== 'object') {
      return this._buildEmptyControlBindingsSummary('empty');
    }

    const metrics = rawSummary.metrics ?? {};
    const captureCancelReasonsRaw = metrics.captureCancelReasons ?? rawSummary.captureCancelReasons ?? {};
    const captureCancelReasons = {};
    if (captureCancelReasonsRaw && typeof captureCancelReasonsRaw === 'object') {
      for (const [reason, count] of Object.entries(captureCancelReasonsRaw)) {
        if (typeof reason !== 'string' || !reason.length) {
          continue;
        }
        captureCancelReasons[reason] = this._coerceNonNegativeInteger(count);
      }
    }

    const pageRange = rawSummary.pageRange;
    let normalizedPageRange = null;
    if (pageRange && typeof pageRange === 'object') {
      const min = this._coerceNonNegativeInteger(pageRange.min);
      const max = this._coerceNonNegativeInteger(pageRange.max);
      if (min || max) {
        normalizedPageRange = { min, max: Math.max(min, max) };
      }
    }

    const dwellRaw = rawSummary.dwell ?? {};
    const dwellCount = this._coerceNonNegativeInteger(dwellRaw.count);
    const dwellTotalMs = this._coerceNonNegativeInteger(dwellRaw.totalMs);
    const dwellAverageMs = this._coerceNonNegativeInteger(
      dwellRaw.averageMs != null
        ? dwellRaw.averageMs
        : dwellCount > 0
          ? Math.round(dwellTotalMs / dwellCount)
          : 0
    );
    const dwellMaxMs = this._coerceNonNegativeInteger(dwellRaw.maxMs);
    const dwellMinMs = this._coerceNonNegativeInteger(dwellRaw.minMs);
    const dwellLastMs = this._coerceNonNegativeInteger(dwellRaw.lastMs ?? dwellRaw.lastDurationMs);

    const dwellSummary = {
      count: dwellCount,
      totalMs: dwellTotalMs,
      averageMs: dwellAverageMs,
      averageLabel:
        typeof dwellRaw.averageLabel === 'string' && dwellRaw.averageLabel.length
          ? dwellRaw.averageLabel
          : this._formatDurationLabel(dwellAverageMs),
      maxMs: dwellMaxMs,
      maxLabel:
        typeof dwellRaw.maxLabel === 'string' && dwellRaw.maxLabel.length
          ? dwellRaw.maxLabel
          : this._formatDurationLabel(dwellMaxMs),
      minMs: dwellMinMs,
      minLabel:
        typeof dwellRaw.minLabel === 'string' && dwellRaw.minLabel.length
          ? dwellRaw.minLabel
          : this._formatDurationLabel(dwellMinMs),
      lastMs: dwellLastMs,
      lastLabel:
        typeof dwellRaw.lastLabel === 'string' && dwellRaw.lastLabel.length
          ? dwellRaw.lastLabel
          : this._formatDurationLabel(dwellLastMs),
      lastAction:
        typeof dwellRaw.lastAction === 'string' && dwellRaw.lastAction.length
          ? dwellRaw.lastAction
          : null,
      longestAction:
        typeof dwellRaw.longestAction === 'string' && dwellRaw.longestAction.length
          ? dwellRaw.longestAction
          : null,
    };

    const ratiosRaw = rawSummary.ratios ?? {};
    const sanitizeRatio = (entry) => {
      const numerator = this._coerceNonNegativeInteger(entry?.numerator);
      const denominator = this._coerceNonNegativeInteger(entry?.denominator);
      let value = typeof entry?.value === 'number' && Number.isFinite(entry.value)
        ? entry.value
        : denominator > 0
          ? numerator / denominator
          : 0;
      value = Math.max(0, Math.min(1, value));
      const rounded = Math.round(value * 1000) / 1000;
      const percentage =
        typeof entry?.percentage === 'string' && entry.percentage.length
          ? entry.percentage
          : `${Math.round(value * 100)}%`;
      return {
        numerator,
        denominator,
        value: rounded,
        percentage,
      };
    };

    return {
      source: 'observation-log',
      totalEvents: this._coerceNonNegativeInteger(rawSummary.totalEvents),
      durationMs: this._coerceNonNegativeInteger(rawSummary.durationMs),
      durationLabel:
        typeof rawSummary.durationLabel === 'string' && rawSummary.durationLabel.length
          ? rawSummary.durationLabel
          : `${this._coerceNonNegativeInteger(rawSummary.durationMs)}ms`,
      firstEventAt:
        typeof rawSummary.firstEventAt === 'number' && Number.isFinite(rawSummary.firstEventAt)
          ? rawSummary.firstEventAt
          : null,
      lastEventAt:
        typeof rawSummary.lastEventAt === 'number' && Number.isFinite(rawSummary.lastEventAt)
          ? rawSummary.lastEventAt
          : null,
      lastSelectedAction:
        typeof rawSummary.lastSelectedAction === 'string' && rawSummary.lastSelectedAction.length
          ? rawSummary.lastSelectedAction
          : null,
      actionsVisited: this._truncateStringArray(rawSummary.actionsVisited, 6),
      actionsVisitedCount: Array.isArray(rawSummary.actionsVisited) ? rawSummary.actionsVisited.length : 0,
      actionsRemapped: this._truncateStringArray(rawSummary.actionsRemapped, 6),
      actionsRemappedCount: Array.isArray(rawSummary.actionsRemapped) ? rawSummary.actionsRemapped.length : 0,
      listModesVisited: this._truncateStringArray(rawSummary.listModesVisited ?? rawSummary.listModesSeen, 6),
      pageRange: normalizedPageRange,
      metrics: {
        selectionMoves: this._coerceNonNegativeInteger(metrics.selectionMoves),
        selectionBlocked: this._coerceNonNegativeInteger(metrics.selectionBlocked),
        listModeChanges: this._coerceNonNegativeInteger(metrics.listModeChanges),
        listModeUnchanged: this._coerceNonNegativeInteger(metrics.listModeUnchanged),
        pageNavigations: this._coerceNonNegativeInteger(metrics.pageNavigations),
        pageNavigationBlocked: this._coerceNonNegativeInteger(metrics.pageNavigationBlocked),
        pageSetChanges: this._coerceNonNegativeInteger(metrics.pageSetChanges),
        pageSetBlocked: this._coerceNonNegativeInteger(metrics.pageSetBlocked),
        captureStarted: this._coerceNonNegativeInteger(metrics.captureStarted),
        captureCancelled: this._coerceNonNegativeInteger(metrics.captureCancelled),
        bindingsApplied: this._coerceNonNegativeInteger(metrics.bindingsApplied),
        bindingsReset: this._coerceNonNegativeInteger(metrics.bindingsReset),
        manualOverrideEvents: this._coerceNonNegativeInteger(metrics.manualOverrideEvents),
      },
      captureCancelReasons,
      dwell: dwellSummary,
      ratios: {
        selectionBlocked: sanitizeRatio(ratiosRaw.selectionBlocked ?? {}),
        pageNavigationBlocked: sanitizeRatio(ratiosRaw.pageNavigationBlocked ?? {}),
      },
    };
  }

  _collectControlBindingsSummary() {
    if (!this._controlBindingsObservationProvider) {
      return this._buildEmptyControlBindingsSummary();
    }

    try {
      const summary = this._controlBindingsObservationProvider();
      if (!summary) {
        return this._buildEmptyControlBindingsSummary('empty');
      }
      return this._normalizeControlBindingsSummary(summary);
    } catch (error) {
      console.warn('[SaveManager] Failed to gather control bindings summary for inspector', error);
      return this._buildEmptyControlBindingsSummary('error');
    }
  }

  /**
   * Provide aggregated telemetry for SaveManager inspector tooling.
   * @returns {Object}
   */
  getInspectorSummary() {
    const generatedAt = Date.now();
    if (!this.worldStateStore || typeof this.worldStateStore.select !== 'function') {
      return {
        generatedAt,
        source: 'unavailable',
        factions: {
          lastCascadeEvent: null,
          cascadeTargets: [],
          recentMemberRemovals: [],
        },
        tutorial: {
          latestSnapshot: null,
          snapshots: [],
          transcript: [],
        },
        engine: {
          spatialHash: null,
        },
        controlBindings: this._collectControlBindingsSummary(),
        districts: buildEmptyDistrictInspectorSummary(),
        npcs: buildEmptyNpcInspectorSummary(),
      };
    }

    let cascadeSummary = {
      lastCascadeEvent: null,
      cascadeTargets: [],
    };
    let recentMemberRemovals = [];
    let tutorialSnapshots = [];
    let latestSnapshot = null;
    let tutorialTranscript = [];
    let districtInspectorSummary = buildEmptyDistrictInspectorSummary();
    let npcInspectorSummary = buildEmptyNpcInspectorSummary();

    try {
      cascadeSummary = this.worldStateStore.select(
        factionSlice.selectors.selectFactionCascadeSummary
      );
    } catch (error) {
      console.warn('[SaveManager] Failed to gather faction cascade summary for inspector', error);
    }

    try {
      recentMemberRemovals = this.worldStateStore.select(
        factionSlice.selectors.selectRecentMemberRemovals
      );
    } catch (error) {
      console.warn('[SaveManager] Failed to gather faction removal telemetry for inspector', error);
    }

    try {
      tutorialSnapshots = this.worldStateStore.select(tutorialSlice.selectors.selectPromptHistorySnapshots);
      latestSnapshot = this.worldStateStore.select(tutorialSlice.selectors.selectLatestPromptSnapshot);
    } catch (error) {
      console.warn('[SaveManager] Failed to gather tutorial snapshots for inspector', error);
    }

    if (this.tutorialTranscriptRecorder?.getTranscript) {
      try {
        const rawTranscript = this.tutorialTranscriptRecorder.getTranscript();
        tutorialTranscript = buildTutorialTranscript(rawTranscript);
      } catch (error) {
        console.warn('[SaveManager] Failed to build tutorial transcript for inspector', error);
      }
    }

    try {
      const districtRoot = this.worldStateStore.select(districtSlice.selectors.selectRoot);
      const districtRecords = this.worldStateStore.select(districtSlice.selectors.selectAllDistricts);
      districtInspectorSummary = buildDistrictInspectorSummary(districtRoot, districtRecords);
    } catch (error) {
      console.warn('[SaveManager] Failed to gather district telemetry for inspector', error);
    }

    try {
      const npcRoot = this.worldStateStore.select(npcSlice.selectors.selectRoot);
      const npcRecords = this.worldStateStore.select(npcSlice.selectors.selectNpcSummaries);
      npcInspectorSummary = buildNpcInspectorSummary(npcRoot, npcRecords);
    } catch (error) {
      console.warn('[SaveManager] Failed to gather NPC telemetry for inspector', error);
    }

    const factionInspectorSummary = {
      ...(cascadeSummary ?? { lastCascadeEvent: null, cascadeTargets: [] }),
      recentMemberRemovals: Array.isArray(recentMemberRemovals)
        ? recentMemberRemovals
        : [],
    };
    const spatialMetrics = this.getSpatialMetricsTelemetry();
    const controlBindings = this._collectControlBindingsSummary();

    return {
      generatedAt,
      source: 'worldStateStore',
      factions: factionInspectorSummary,
      tutorial: {
        latestSnapshot: latestSnapshot ?? null,
        snapshots: Array.isArray(tutorialSnapshots) ? tutorialSnapshots : [],
        transcript: Array.isArray(tutorialTranscript) ? tutorialTranscript : [],
      },
      engine: {
        spatialHash: spatialMetrics,
      },
      controlBindings,
      districts: districtInspectorSummary,
      npcs: npcInspectorSummary,
    };
  }

  /**
   * Produce JSON/CSV export artifacts capturing inspector telemetry.
   * Optionally invokes a writer callback for each artifact produced.
   * @param {Object} options
   * @param {Function} [options.writer] - Receives artifact descriptors `{ filename, content, mimeType, type }`
   * @param {string|string[]} [options.formats] - 'json', 'csv', 'transcript-csv', 'transcript-md'
   * @param {string} [options.prefix] - File prefix override
   * @returns {{summary: Object, artifacts: Array}}
   */
  async exportInspectorSummary(options = {}) {
    const summary = this.getInspectorSummary();
    const { summary: sanitizedSummary, artifacts } = createInspectorExportArtifacts(summary, options);

    const prefix = options.prefix ?? 'save-inspector';
    const context = {
      prefix,
      formats: Array.from(
        new Set(
          artifacts.map((artifact) => artifact.type).filter((type) => typeof type === 'string')
        )
      ),
      artifactCount: artifacts.length,
      source: sanitizedSummary.source,
      ...(options.context ?? {}),
      ...(options.writerContext ?? {}),
    };

    this.eventBus?.emit?.('telemetry:export_started', {
      artifactCount: artifacts.length,
      context,
    });

    let metrics = null;

    try {
      const writer = options.writer;
      if (typeof writer === 'function') {
        for (const artifact of artifacts) {
          try {
            await Promise.resolve(writer({ ...artifact }, context));
          } catch (error) {
            console.warn('[SaveManager] Telemetry export writer failed', error);
            this.eventBus?.emit?.('telemetry:artifact_failed', {
              writerId: 'legacy-writer',
              filename: artifact.filename,
              errorMessage: error instanceof Error ? error.message : String(error),
              context,
            });
          }
        }
      } else {
        const adapter =
          options.writerAdapter ??
          this._telemetryAdapter ??
          this._instantiateTelemetryAdapter();

        if (adapter) {
          metrics = await adapter.writeArtifacts(artifacts, context);
        }
      }

      this.eventBus?.emit?.('telemetry:export_completed', {
        artifactCount: artifacts.length,
        context,
        metrics,
      });
    } catch (error) {
      this.eventBus?.emit?.('telemetry:export_failed', {
        artifactCount: artifacts.length,
        context,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const spatialSnapshot = sanitizedSummary?.engine?.spatialHash ?? null;
    if (spatialSnapshot) {
      const budgetStatusPayload = {
        type: 'spatialHash',
        status: spatialSnapshot.payloadBudgetStatus ?? 'unknown',
        payloadBytes: Number.isFinite(spatialSnapshot.payloadBytes)
          ? spatialSnapshot.payloadBytes
          : null,
        budgetBytes:
          spatialSnapshot.payloadBudgetBytes ?? SPATIAL_HISTORY_BUDGET_BYTES,
        exceededBy: Number.isFinite(spatialSnapshot.payloadBudgetExceededBy)
          ? spatialSnapshot.payloadBudgetExceededBy
          : 0,
        context,
      };

      if (
        budgetStatusPayload.status === 'exceeds_budget' &&
        typeof console !== 'undefined'
      ) {
        console.warn(
          '[SaveManager] Inspector spatial telemetry payload exceeds budget',
          {
            payloadBytes: budgetStatusPayload.payloadBytes,
            budgetBytes: budgetStatusPayload.budgetBytes,
            exceededBy: budgetStatusPayload.exceededBy,
          }
        );
      }

      this.eventBus?.emit?.('telemetry:export_budget_status', budgetStatusPayload);
    }

    return {
      summary: sanitizedSummary,
      artifacts,
      metrics,
    };
  }

  /**
   * Register provider for spatial metrics snapshots used in telemetry exports.
   * @param {Function|null} provider
   */
  registerSpatialMetricsProvider(provider) {
    if (typeof provider === 'function') {
      this._spatialMetricsProvider = provider;
      return;
    }

    if (provider === null) {
      this._spatialMetricsProvider = null;
    }
  }

  /**
   * Retrieve spatial metrics snapshot for telemetry exports.
   * @returns {Object|null}
   */
  getSpatialMetricsTelemetry() {
    if (typeof this._spatialMetricsProvider !== 'function') {
      return null;
    }

    try {
      const snapshot = this._spatialMetricsProvider();
      if (!snapshot || typeof snapshot !== 'object') {
        return null;
      }
      return snapshot;
    } catch (error) {
      console.warn('[SaveManager] Failed to gather spatial hash metrics for inspector', error);
      return null;
    }
  }

  // ==================== Data Collection Methods ====================

  /**
   * Collect game data using legacy manager scrapers.
   * Provides fallback during WorldStateStore migration.
   * @returns {Object}
   */
  collectLegacyGameData(inventorySnapshot = null) {
    const storyFlags = this.collectStoryFlags();
    const quests = this.collectQuestData();
    const factions = this.collectFactionData();
    const tutorialState = this.collectTutorialState();
    const tutorialProgress = this.tutorialSystem?.getProgress?.() ?? null;
    const completedStepsCount = normalizeCompletedSteps(tutorialProgress?.completedSteps);
    const totalSteps = Number.isFinite(tutorialProgress?.totalSteps)
      ? Math.max(0, Math.trunc(tutorialProgress.totalSteps))
      : 0;
    const derivedCompletion = totalSteps > 0 && completedStepsCount >= totalSteps;
    const tutorialComplete =
      tutorialState.completed || Boolean(this.tutorialSystem?.isComplete?.()) || derivedCompletion;
    const tutorialSkipped = tutorialState.skipped || Boolean(this.tutorialSystem?.skipped);
    const currentStepIndex = Number.isFinite(tutorialProgress?.currentStepIndex)
      ? Math.trunc(tutorialProgress.currentStepIndex)
      : -1;

    const inventory = inventorySnapshot
      ? {
          items: Array.isArray(inventorySnapshot.items)
            ? inventorySnapshot.items.map((item) => ({ ...item }))
            : [],
          equipped: inventorySnapshot.equipped ? { ...inventorySnapshot.equipped } : {},
          lastUpdatedAt: inventorySnapshot.lastUpdatedAt ?? Date.now(),
        }
      : {
          items: [],
          equipped: {},
          lastUpdatedAt: Date.now(),
        };

    return {
      storyFlags,
      quests,
      factions,
      tutorialComplete,
      inventory,
      tutorial: {
        completed: Boolean(tutorialComplete),
        completedSteps: completedStepsCount,
        skipped: Boolean(tutorialSkipped),
        totalSteps: tutorialProgress?.totalSteps ?? 0,
        currentStep: tutorialProgress?.currentStep ?? null,
        currentStepIndex,
        lastActionAt: null,
      },
      dialogue: null,
    };
  }

  /**
   * Collect story flags from StoryFlagManager
   * @returns {Object}
   */
  collectStoryFlags() {
    if (!this.storyFlagManager) return {};
    return this.storyFlagManager.serialize();
  }

  /**
   * Collect quest data from QuestManager
   * @returns {Object}
   */
  collectQuestData() {
    if (!this.questManager) return {};
    return this.questManager.serialize();
  }

  /**
   * Collect faction data from FactionManager
   * @returns {Object}
   */
  collectFactionData() {
    if (!this.factionManager) return {};
    return {
      version: 1,
      reputation: this.factionManager.reputation,
      timestamp: Date.now(),
    };
  }

  /**
   * Collect tutorial completion status
   * @returns {boolean}
   */
  collectTutorialData() {
    return this.collectTutorialState().completed;
  }

  /**
   * Collect tutorial state from storage (completion + skip flags).
   * @returns {{completed: boolean, skipped: boolean}}
   */
  collectTutorialState() {
    if (!this.storage) {
      return {
        completed: false,
        skipped: false,
      };
    }

    return {
      completed: this.storage.getItem('tutorial_completed') === 'true',
      skipped: this.storage.getItem('tutorial_skipped') === 'true',
    };
  }

  // ==================== Data Restoration Methods ====================

  /**
   * Restore story flags to StoryFlagManager
   * @param {Object} data
   */
  restoreStoryFlags(data) {
    if (!this.storyFlagManager || !data) return;
    this.storyFlagManager.deserialize(data);
  }

  /**
   * Restore quest data to QuestManager
   * @param {Object} data
   */
  restoreQuestData(data) {
    if (!this.questManager || !data) return;
    this.questManager.deserialize(data);
  }

  /**
   * Restore faction data to FactionManager
   * @param {Object} data
   */
  restoreFactionData(data) {
    if (!this.factionManager || !data) return;
    if (data.reputation) {
      this.factionManager.reputation = data.reputation;
      console.log('[SaveManager] Faction reputation restored');
    }
  }

  /**
   * Restore tutorial completion status
   * @param {boolean} completed
   */
  restoreTutorialData(tutorialState) {
    if (!this.storage) return;

    const isCompleted =
      typeof tutorialState === 'boolean'
        ? tutorialState
        : Boolean(tutorialState?.completed);
    const isSkipped = typeof tutorialState === 'object' ? Boolean(tutorialState.skipped) : false;

    if (isCompleted) {
      this.storage.setItem('tutorial_completed', 'true');
    } else {
      this.storage.removeItem?.('tutorial_completed');
    }

    if (isSkipped) {
      this.storage.setItem('tutorial_skipped', 'true');
    } else {
      this.storage.removeItem?.('tutorial_skipped');
    }
  }

  /**
   * Compare WorldStateStore snapshot with legacy data to detect divergences.
   * @param {Object} snapshot
   * @param {Object} legacyData
   */
  verifySnapshotParity(snapshot, legacyData) {
    if (!snapshot || !legacyData) return;

    try {
      const comparableSnapshot = {
        storyFlags: summarizeStoryFlags(snapshot.storyFlags),
        quests: summarizeQuestState(snapshot.quests),
        factions: summarizeFactionState(snapshot.factions),
        tutorialComplete: snapshot.tutorialComplete,
        tutorial: summarizeTutorialState(snapshot.tutorial),
        dialogue: summarizeDialogueState(snapshot.dialogue),
        inventory: summarizeInventoryState(snapshot.inventory),
      };

      const comparableLegacy = {
        storyFlags: summarizeStoryFlags(legacyData.storyFlags),
        quests: summarizeQuestState(legacyData.quests),
        factions: summarizeFactionState(legacyData.factions),
        tutorialComplete: legacyData.tutorialComplete,
        tutorial: summarizeTutorialState(legacyData.tutorial),
        dialogue: summarizeDialogueState(legacyData.dialogue),
        inventory: summarizeInventoryState(legacyData.inventory),
      };

      if (!deepEqual(comparableSnapshot, comparableLegacy)) {
        console.warn('[SaveManager] WorldStateStore snapshot differs from legacy collectors', {
          snapshot: comparableSnapshot,
          legacy: comparableLegacy,
        });
      }
    } catch (error) {
      console.warn('[SaveManager] Failed to verify world state parity', error);
    }
  }

  /**
   * Get current playtime in milliseconds
   * @returns {number}
   */
  getPlaytime() {
    return Date.now() - this.gameStartTime;
  }

  /**
   * Enable autosave
   */
  enableAutosave() {
    this.autosaveEnabled = true;
    console.log('[SaveManager] Autosave enabled');
  }

  /**
   * Disable autosave
   */
  disableAutosave() {
    this.autosaveEnabled = false;
    console.log('[SaveManager] Autosave disabled');
  }

  _instantiateTelemetryAdapter() {
    if (this._telemetryAdapter) {
      return this._telemetryAdapter;
    }

    const seedWriters = Array.isArray(this._telemetrySeedWriters) ? [...this._telemetrySeedWriters] : [];
    this._telemetryAdapter = new TelemetryArtifactWriterAdapter({
      eventBus: this.eventBus,
      writers: seedWriters,
    });
    this._telemetrySeedWriters = null;
    return this._telemetryAdapter;
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Perform final autosave before cleanup
    if (this.autosaveEnabled) {
      this.saveGame('autosave');
    }

    if (this._offQuestCompleted) {
      this._offQuestCompleted();
      this._offQuestCompleted = null;
    }
    if (this._offObjectiveCompleted) {
      this._offObjectiveCompleted();
      this._offObjectiveCompleted = null;
    }
    if (this._offAreaEntered) {
      this._offAreaEntered();
      this._offAreaEntered = null;
    }
    if (this._offCaseCompleted) {
      this._offCaseCompleted();
      this._offCaseCompleted = null;
    }
    if (this._offInventoryAdded) {
      this._offInventoryAdded();
      this._offInventoryAdded = null;
    }
    if (this._offInventoryRemoved) {
      this._offInventoryRemoved();
      this._offInventoryRemoved = null;
    }
    if (this._offInventoryUpdated) {
      this._offInventoryUpdated();
      this._offInventoryUpdated = null;
    }
    console.log('[SaveManager] Cleanup complete');
  }
}

function summarizeStoryFlags(storyFlags) {
  if (!storyFlags || typeof storyFlags !== 'object') {
    return {};
  }

  const source =
    storyFlags.flags && typeof storyFlags.flags === 'object'
      ? storyFlags.flags
      : storyFlags;

  const normalized = {};
  for (const [flagId, entry] of Object.entries(source)) {
    if (!entry || typeof entry !== 'object') {
      normalized[flagId] = entry ?? null;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(entry, 'value')) {
      normalized[flagId] = entry.value;
    } else {
      normalized[flagId] = entry;
    }
  }
  return normalized;
}

function summarizeQuestState(questState) {
  const normalizeIds = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return [...new Set(input.map(String))].sort();
    }
    if (typeof input === 'object') {
      return Object.keys(input)
        .map(String)
        .sort();
    }
    return [];
  };

  if (!questState || typeof questState !== 'object') {
    return {
      active: [],
      completed: [],
      failed: [],
    };
  }

  const activeIds = new Set();
  const completedIds = new Set();
  const failedIds = new Set();

  for (const id of normalizeIds(questState.activeIds)) {
    activeIds.add(id);
  }
  for (const id of normalizeIds(questState.completedIds)) {
    completedIds.add(id);
  }
  for (const id of normalizeIds(questState.failedIds)) {
    failedIds.add(id);
  }

  if (Array.isArray(questState.activeQuests)) {
    for (const id of questState.activeQuests) {
      activeIds.add(String(id));
    }
  }
  if (Array.isArray(questState.completedQuests)) {
    for (const id of questState.completedQuests) {
      completedIds.add(String(id));
    }
  }
  if (Array.isArray(questState.failedQuests)) {
    for (const id of questState.failedQuests) {
      failedIds.add(String(id));
    }
  }

  return {
    active: Array.from(activeIds).sort(),
    completed: Array.from(completedIds).sort(),
    failed: Array.from(failedIds).sort(),
  };
}

function summarizeFactionState(factionState) {
  if (!factionState || typeof factionState !== 'object') {
    return {};
  }

  const normalized = {};

  if (factionState.byId && typeof factionState.byId === 'object') {
    for (const [factionId, record] of Object.entries(factionState.byId)) {
      if (!record || typeof record !== 'object') continue;
      normalized[factionId] = {
        fame: Number.isFinite(record.fame) ? record.fame : 0,
        infamy: Number.isFinite(record.infamy) ? record.infamy : 0,
      };
    }
    return normalized;
  }

  if (factionState.reputation && typeof factionState.reputation === 'object') {
    for (const [factionId, record] of Object.entries(factionState.reputation)) {
      if (!record || typeof record !== 'object') continue;
      normalized[factionId] = {
        fame: Number.isFinite(record.fame) ? record.fame : 0,
        infamy: Number.isFinite(record.infamy) ? record.infamy : 0,
      };
    }
  }

  return normalized;
}

function normalizeCompletedSteps(value) {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  return 0;
}

function summarizeTutorialState(tutorial) {
  if (!tutorial) {
    return null;
  }

  const completedSteps = normalizeCompletedSteps(tutorial.completedSteps);

  return {
    completed: Boolean(tutorial.completed),
    skipped: Boolean(tutorial.skipped),
    totalSteps: tutorial.totalSteps ?? 0,
    completedSteps,
  };
}

function summarizeDialogueState(dialogue) {
  if (!dialogue) {
    return null;
  }

  const historyTotal = Object.values(dialogue.historyByNpc ?? {}).reduce((sum, entries) => {
    if (!Array.isArray(entries)) return sum;
    return sum + entries.length;
  }, 0);

  return {
    transcriptEnabled: Boolean(dialogue.transcriptEnabled),
    historyTotal,
    activeNpc: dialogue.active?.npcId ?? null,
    activeDialogueId: dialogue.active?.dialogueId ?? null,
    completedNpcCount: Object.keys(dialogue.completedByNpc ?? {}).length,
  };
}

function summarizeInventoryState(inventory) {
  if (!inventory) {
    return {
      itemIds: [],
      quantities: {},
      equipped: {},
    };
  }

  const items = Array.isArray(inventory.items) ? inventory.items : [];
  const itemIds = [];
  const quantities = {};

  for (const item of items) {
    if (!item || typeof item.id !== 'string') {
      continue;
    }
    itemIds.push(item.id);
    const quantity = Number.isFinite(item.quantity) ? Math.trunc(item.quantity) : 1;
    quantities[item.id] = quantity;
  }

  itemIds.sort();

  return {
    itemIds,
    quantities,
    equipped: inventory.equipped ? { ...inventory.equipped } : {},
  };
}

function buildEmptyDistrictInspectorSummary() {
  return {
    lastUpdatedAt: null,
    lastLockdownAt: null,
    restrictedDistricts: [],
    metrics: {
      total: 0,
      restricted: 0,
      fastTravelDisabled: 0,
      infiltrationLocked: 0,
      infiltrationUnlocked: 0,
      lockdownEvents: 0,
    },
  };
}

function buildDistrictInspectorSummary(rootState, districts) {
  const summary = buildEmptyDistrictInspectorSummary();
  if (rootState && typeof rootState === 'object') {
    summary.lastUpdatedAt = rootState.lastUpdatedAt ?? null;
  }

  const records = Array.isArray(districts) ? districts : [];
  const restrictedRecords = [];

  let fastTravelDisabled = 0;
  let infiltrationLocked = 0;
  let infiltrationUnlocked = 0;
  let lockdownEvents = 0;
  let lastLockdownAt = null;

  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    const access = record.access ?? {};
    const restrictions = Array.isArray(access.restrictions) ? access.restrictions : [];
    const activeRestrictions = restrictions.filter((entry) => entry && entry.active);

    const fastTravelEnabled = Boolean(access.fastTravelEnabled);
    if (!fastTravelEnabled) {
      fastTravelDisabled += 1;
    }

    const infiltrationRoutes = Array.isArray(record.infiltrationRoutes)
      ? record.infiltrationRoutes
      : [];
    const unlockedRoutes = infiltrationRoutes.filter((route) => route && route.unlocked);
    infiltrationUnlocked += unlockedRoutes.length;
    infiltrationLocked += Math.max(0, infiltrationRoutes.length - unlockedRoutes.length);

    const analytics = record.analytics ?? {};
    if (Number.isFinite(analytics.lockdownsTriggered)) {
      lockdownEvents += Math.max(0, Math.floor(analytics.lockdownsTriggered));
    }
    if (Number.isFinite(analytics.lastLockdownAt)) {
      lastLockdownAt = Math.max(lastLockdownAt ?? 0, analytics.lastLockdownAt);
    }

    if (activeRestrictions.length) {
      let lastRestrictionChangeAt = null;
      for (const restriction of activeRestrictions) {
        if (Number.isFinite(restriction?.lastChangedAt)) {
          lastRestrictionChangeAt = Math.max(
            lastRestrictionChangeAt ?? restriction.lastChangedAt,
            restriction.lastChangedAt
          );
        }
      }
      if (!lastRestrictionChangeAt && Array.isArray(access.restrictionLog) && access.restrictionLog.length) {
        const lastEntry = access.restrictionLog[access.restrictionLog.length - 1];
        if (Number.isFinite(lastEntry?.timestamp)) {
          lastRestrictionChangeAt = lastEntry.timestamp;
        }
      }

      restrictedRecords.push({
        id: record.id ?? null,
        name: record.name ?? record.id ?? 'Unknown district',
        tier: record.tier ?? null,
        controllingFaction: record.controllingFaction?.current ?? null,
        stability: {
          rating: record.stability?.rating ?? null,
          value: Number.isFinite(record.stability?.current)
            ? record.stability.current
            : null,
          lastChangedAt: record.stability?.lastChangedAt ?? null,
        },
        fastTravelEnabled,
        activeRestrictionCount: activeRestrictions.length,
        lastRestrictionChangeAt: lastRestrictionChangeAt ?? null,
        restrictions: activeRestrictions.map((restriction) => ({
          id: restriction.id ?? null,
          type: restriction.type ?? 'generic',
          description: restriction.description ?? '',
          lastChangedAt: restriction.lastChangedAt ?? null,
        })),
        infiltrationLocked: Math.max(
          0,
          infiltrationRoutes.length - unlockedRoutes.length
        ),
        infiltrationUnlocked: unlockedRoutes.length,
        lockdownsTriggered: Math.max(
          0,
          Number.isFinite(analytics.lockdownsTriggered)
            ? Math.floor(analytics.lockdownsTriggered)
            : 0
        ),
        lastLockdownAt: Number.isFinite(analytics.lastLockdownAt)
          ? analytics.lastLockdownAt
          : null,
      });
    }
  }

  restrictedRecords.sort((a, b) => {
    const countDiff = (b.activeRestrictionCount ?? 0) - (a.activeRestrictionCount ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }
    const timeA = a.lastRestrictionChangeAt ?? 0;
    const timeB = b.lastRestrictionChangeAt ?? 0;
    return timeB - timeA;
  });

  summary.restrictedDistricts = restrictedRecords.slice(0, 8);
  summary.metrics = {
    total: records.length,
    restricted: restrictedRecords.length,
    fastTravelDisabled,
    infiltrationLocked,
    infiltrationUnlocked,
    lockdownEvents,
  };
  summary.lastLockdownAt = lastLockdownAt ?? null;

  return summary;
}

function buildEmptyNpcInspectorSummary() {
  return {
    lastUpdatedAt: null,
    alerts: [],
    suspicious: [],
    metrics: {
      total: 0,
      alerts: 0,
      suspicious: 0,
      knowsPlayer: 0,
      witnessedCrimes: 0,
    },
  };
}

function buildNpcInspectorSummary(rootState, npcSummaries) {
  const summary = buildEmptyNpcInspectorSummary();
  if (rootState && typeof rootState === 'object') {
    summary.lastUpdatedAt = rootState.lastUpdatedAt ?? null;
  }

  const records = Array.isArray(npcSummaries) ? npcSummaries : [];
  const alerting = [];
  const suspicious = [];
  let knowsPlayer = 0;
  let witnessedCrimes = 0;

  for (const npc of records) {
    if (!npc || typeof npc !== 'object') {
      continue;
    }

    if (npc.knowsPlayer) {
      knowsPlayer += 1;
    }

    const witnessed = Number.isFinite(npc.witnessedCrimes)
      ? npc.witnessedCrimes
      : Number.isFinite(npc.interactions?.witnessedCrimes)
        ? npc.interactions.witnessedCrimes
        : 0;
    witnessedCrimes += Math.max(0, witnessed);

    if (npc.alert?.active) {
      alerting.push({
        id: npc.id ?? null,
        name: npc.name ?? npc.id ?? 'Unknown NPC',
        factionId: npc.factionId ?? null,
        reason: npc.alert.reason ?? null,
        updatedAt: Number.isFinite(npc.alert.updatedAt)
          ? npc.alert.updatedAt
          : npc.lastInteractionAt ?? null,
        status: npc.status ?? 'unknown',
      });
    }

    if (npc.suspicion?.active) {
      suspicious.push({
        id: npc.id ?? null,
        name: npc.name ?? npc.id ?? 'Unknown NPC',
        factionId: npc.factionId ?? null,
        reason: npc.suspicion.reason ?? null,
        updatedAt: Number.isFinite(npc.suspicion.updatedAt)
          ? npc.suspicion.updatedAt
          : npc.lastInteractionAt ?? null,
        status: npc.status ?? 'unknown',
      });
    }
  }

  alerting.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  suspicious.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  summary.alerts = alerting.slice(0, 10);
  summary.suspicious = suspicious.slice(0, 10);
  summary.metrics = {
    total: records.length,
    alerts: alerting.length,
    suspicious: suspicious.length,
    knowsPlayer,
    witnessedCrimes,
  };

  return summary;
}

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (a === null || b === null) {
    return a === b;
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let index = 0; index < a.length; index += 1) {
      if (!deepEqual(a[index], b[index])) {
        return false;
      }
    }
    return true;
  }

  if (typeof a === 'object') {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (let i = 0; i < aKeys.length; i += 1) {
      if (aKeys[i] !== bKeys[i]) {
        return false;
      }
      if (!deepEqual(a[aKeys[i]], b[bKeys[i]])) {
        return false;
      }
    }
    return true;
  }

  return Object.is(a, b);
}
