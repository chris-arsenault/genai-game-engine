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
      verifyWorldStateParity: true,
    };

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
      const saveData = {
        version: this.config.version,
        timestamp: Date.now(),
        playtime,
        slot,
        gameData,
        meta: {
          snapshotSource: snapshot ? 'worldStateStore' : 'legacy-managers',
        },
      };

      // Serialize and save to persistent storage
      const serialized = JSON.stringify(saveData);
      const storageKey = this.config.storageKeyPrefix + slot;
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }
      this.storage.setItem(storageKey, serialized);

      // Update save metadata
      this.updateSaveMetadata(slot, saveData);

      // Emit success event
      this.eventBus.emit('game:saved', {
        slot,
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
      });

      this._lastInventoryAutosave = Date.now();
      console.log(`[SaveManager] Game saved to slot: ${slot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to save game:', error);
      this.eventBus.emit('game:save_failed', {
        slot,
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
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      // Retrieve save data from storage
      const storageKey = this.config.storageKeyPrefix + slot;
      const serialized = this.storage.getItem(storageKey);

      if (!serialized) {
        console.warn(`[SaveManager] No save found in slot: ${slot}`);
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
        slot,
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
      });

      console.log(`[SaveManager] Game loaded from slot: ${slot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to load game:', error);
      this.eventBus.emit('game:load_failed', {
        slot,
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

      const metadataSerialized = this.storage.getItem(this.config.metadataKey);
      if (!metadataSerialized) {
        return [];
      }

      const metadata = JSON.parse(metadataSerialized);
      return Object.entries(metadata).map(([slot, data]) => ({
        slot,
        timestamp: data.timestamp,
        playtime: data.playtime,
        version: data.version,
      }));
    } catch (error) {
      console.error('[SaveManager] Failed to get save slots:', error);
      return [];
    }
  }

  /**
   * Delete a save slot
   * @param {string} slot - Save slot name
   * @returns {boolean} Success
   */
  deleteSave(slot) {
    try {
      if (!this.storage) {
        throw new Error('Storage unavailable');
      }

      // Remove from storage
      const storageKey = this.config.storageKeyPrefix + slot;
      this.storage.removeItem(storageKey);

      // Remove from metadata
      const metadataSerialized = this.storage.getItem(this.config.metadataKey);
      if (metadataSerialized) {
        const metadata = JSON.parse(metadataSerialized);
        delete metadata[slot];
        this.storage.setItem(this.config.metadataKey, JSON.stringify(metadata));
      }

      console.log(`[SaveManager] Deleted save slot: ${slot}`);
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

      // Get existing metadata
      const metadataSerialized = this.storage.getItem(this.config.metadataKey);
      const metadata = metadataSerialized ? JSON.parse(metadataSerialized) : {};

      // Update metadata for this slot
      metadata[slot] = {
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
        version: saveData.version,
      };

      // Save updated metadata
      this.storage.setItem(this.config.metadataKey, JSON.stringify(metadata));
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
    const tutorialComplete = this.collectTutorialData();
    const tutorialProgress = this.tutorialSystem?.getProgress?.() ?? null;
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
        completedSteps: [],
        skipped: false,
        totalSteps: tutorialProgress?.totalSteps ?? 0,
        currentStep: tutorialProgress?.currentStep ?? null,
        currentStepIndex: tutorialProgress?.currentStepIndex ?? -1,
        lastActionAt: null,
      },
      dialogue: {
        active: null,
        historyByNpc: {},
        completedByNpc: {},
        transcriptEnabled: false,
        historyLimit: 0,
      },
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
    if (!this.storage) {
      return false;
    }
    return this.storage.getItem('tutorial_completed') === 'true';
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
        storyFlags: snapshot.storyFlags,
        quests: snapshot.quests,
        factions: snapshot.factions,
        tutorialComplete: snapshot.tutorialComplete,
        tutorial: summarizeTutorialState(snapshot.tutorial),
        dialogue: summarizeDialogueState(snapshot.dialogue),
        inventory: summarizeInventoryState(snapshot.inventory),
      };

      const comparableLegacy = {
        storyFlags: legacyData.storyFlags,
        quests: legacyData.quests,
        factions: legacyData.factions,
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

function summarizeTutorialState(tutorial) {
  if (!tutorial) {
    return null;
  }

  const completedSteps = Array.isArray(tutorial.completedSteps)
    ? tutorial.completedSteps.length
    : typeof tutorial.completedSteps === 'number'
    ? tutorial.completedSteps
    : 0;

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

function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    console.warn('[SaveManager] deepEqual comparison failed', error);
    return false;
  }
}
