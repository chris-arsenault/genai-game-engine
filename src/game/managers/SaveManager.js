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
    this.events = eventBus;

    // Manager references
    this.storyFlagManager = managers.storyFlagManager;
    this.questManager = managers.questManager;
    this.factionManager = managers.factionManager;
    this.tutorialSystem = managers.tutorialSystem;

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
    };

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
    this.events.subscribe('quest:completed', (data) => {
      console.log(`[SaveManager] Quest completed (${data.questId}), autosaving...`);
      this.saveGame('autosave');
    });

    // Autosave on major objectives only (optional - can be configured)
    this.events.subscribe('objective:completed', (data) => {
      // Only autosave on major objectives (not every single objective)
      // You can add logic here to determine "major" objectives
      if (this.isMajorObjective(data.objectiveId)) {
        console.log(`[SaveManager] Major objective completed (${data.objectiveId}), autosaving...`);
        this.saveGame('autosave');
      }
    });

    // Autosave when entering new areas
    this.events.subscribe('area:entered', (data) => {
      console.log(`[SaveManager] Entered area (${data.areaId}), autosaving...`);
      this.saveGame('autosave');
    });

    // Autosave when case is completed
    this.events.subscribe('case:completed', (data) => {
      console.log(`[SaveManager] Case completed (${data.caseId}), autosaving...`);
      this.saveGame('autosave');
    });
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

      // Collect data from all managers
      const gameData = {
        storyFlags: this.collectStoryFlags(),
        quests: this.collectQuestData(),
        factions: this.collectFactionData(),
        tutorialComplete: this.collectTutorialData(),
      };

      // Create save object
      const saveData = {
        version: this.config.version,
        timestamp: Date.now(),
        playtime,
        slot,
        gameData,
      };

      // Serialize and save to localStorage
      const serialized = JSON.stringify(saveData);
      const storageKey = this.config.storageKeyPrefix + slot;
      localStorage.setItem(storageKey, serialized);

      // Update save metadata
      this.updateSaveMetadata(slot, saveData);

      // Emit success event
      this.events.emit('game:saved', {
        slot,
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
      });

      console.log(`[SaveManager] Game saved to slot: ${slot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to save game:', error);
      this.events.emit('game:save_failed', {
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
      // Retrieve save data from localStorage
      const storageKey = this.config.storageKeyPrefix + slot;
      const serialized = localStorage.getItem(storageKey);

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
      this.restoreTutorialData(saveData.gameData.tutorialComplete);

      // Update game start time to account for saved playtime
      this.gameStartTime = Date.now() - saveData.playtime;

      // Emit success event
      this.events.emit('game:loaded', {
        slot,
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
      });

      console.log(`[SaveManager] Game loaded from slot: ${slot}`);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to load game:', error);
      this.events.emit('game:load_failed', {
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
      const metadataSerialized = localStorage.getItem(this.config.metadataKey);
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
      // Remove from localStorage
      const storageKey = this.config.storageKeyPrefix + slot;
      localStorage.removeItem(storageKey);

      // Remove from metadata
      const metadataSerialized = localStorage.getItem(this.config.metadataKey);
      if (metadataSerialized) {
        const metadata = JSON.parse(metadataSerialized);
        delete metadata[slot];
        localStorage.setItem(this.config.metadataKey, JSON.stringify(metadata));
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
      // Get existing metadata
      const metadataSerialized = localStorage.getItem(this.config.metadataKey);
      const metadata = metadataSerialized ? JSON.parse(metadataSerialized) : {};

      // Update metadata for this slot
      metadata[slot] = {
        timestamp: saveData.timestamp,
        playtime: saveData.playtime,
        version: saveData.version,
      };

      // Save updated metadata
      localStorage.setItem(this.config.metadataKey, JSON.stringify(metadata));
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
    // Check localStorage for tutorial completion
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('tutorial_completed') === 'true';
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
  restoreTutorialData(completed) {
    if (typeof localStorage === 'undefined') return;
    if (completed) {
      localStorage.setItem('tutorial_completed', 'true');
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
    console.log('[SaveManager] Cleanup complete');
  }
}
