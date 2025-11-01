/**
 * SaveManager
 *
 * Handles complete game state serialization and persistence.
 * Saves to localStorage with fallback to sessionStorage.
 * Supports multiple save slots, autosave, and cloud backup hooks.
 *
 * Save Data Structure:
 * {
 *   version: '1.0',
 *   timestamp: number,
 *   slot: number,
 *   player: {...},
 *   quests: {...},
 *   factions: {...},
 *   worldState: {...},
 *   storyFlags: {...},
 *   cases: {...},
 *   meta: { playtime, screenshot, etc. }
 * }
 */

export class SaveManager {
  constructor(game) {
    this.game = game;
    this.saveVersion = '1.0.0';
    this.maxSlots = 5;
    this.autosaveInterval = 5 * 60 * 1000; // 5 minutes
    this.autosaveTimer = 0;
    this.storageKey = 'memory_syndicate_save';

    // Track if save is in progress (prevent concurrent saves)
    this.isSaving = false;
    this.isLoading = false;

    // Storage availability
    this.hasLocalStorage = this.checkStorageAvailable('localStorage');
    this.hasSessionStorage = this.checkStorageAvailable('sessionStorage');
  }

  /**
   * Initialize save manager
   */
  init() {
    if (!this.hasLocalStorage && !this.hasSessionStorage) {
      console.error('[SaveManager] No storage available! Saves will not persist.');
      return;
    }

    console.log('[SaveManager] Initialized');
    console.log(`[SaveManager] Storage: localStorage=${this.hasLocalStorage}, sessionStorage=${this.hasSessionStorage}`);

    // Start autosave timer
    this.startAutosave();
  }

  /**
   * Check if storage is available
   * @param {string} type - 'localStorage' or 'sessionStorage'
   * @returns {boolean}
   */
  checkStorageAvailable(type) {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get storage (localStorage with fallback to sessionStorage)
   * @returns {Storage}
   */
  getStorage() {
    if (this.hasLocalStorage) {
      return window.localStorage;
    } else if (this.hasSessionStorage) {
      return window.sessionStorage;
    }
    return null;
  }

  /**
   * Save game to specific slot
   * @param {number} slot - Save slot (0-4, or -1 for autosave)
   * @returns {Promise<boolean>}
   */
  async save(slot = 0) {
    if (this.isSaving) {
      console.warn('[SaveManager] Save already in progress');
      return false;
    }

    if (slot < -1 || slot >= this.maxSlots) {
      console.error(`[SaveManager] Invalid slot: ${slot}`);
      return false;
    }

    this.isSaving = true;

    try {
      console.log(`[SaveManager] Saving to slot ${slot}...`);

      // Collect game state from all managers
      const saveData = {
        version: this.saveVersion,
        timestamp: Date.now(),
        slot,

        // Player state
        player: this.serializePlayer(),

        // Quest state
        quests: this.game.questManager?.serialize() || {},

        // Faction state
        factions: this.game.factionManager?.serialize() || {},

        // World state
        worldState: this.game.worldStateManager?.serialize() || {},

        // Story flags
        storyFlags: this.game.storyFlagManager?.serialize() || {},

        // Case state
        cases: this.game.caseManager?.serialize() || {},

        // NPC memory state
        npcMemory: this.game?.gameSystems?.npcMemory?.serialize?.() || null,

        // Investigation state
        investigation: this.game.investigationSystem?.serialize?.() || {},

        // Meta information
        meta: this.serializeMeta()
      };

      // Compress and save
      const compressed = this.compressSaveData(saveData);
      const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;

      const storage = this.getStorage();
      if (!storage) {
        throw new Error('No storage available');
      }

      storage.setItem(slotKey, compressed);

      console.log(`[SaveManager] Saved successfully to slot ${slot}`);
      console.log(`[SaveManager] Save size: ${(compressed.length / 1024).toFixed(2)} KB`);

      // Emit save event
      if (this.game.eventBus) {
        this.game.eventBus.emit('game:saved', { slot });
      }

      return true;
    } catch (error) {
      console.error('[SaveManager] Save failed:', error);

      // Check if quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.error('[SaveManager] Storage quota exceeded. Try deleting old saves.');
        if (this.game.eventBus) {
          this.game.eventBus.emit('save:error', { reason: 'quota_exceeded' });
        }
      }

      return false;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Load game from specific slot
   * @param {number} slot - Save slot (0-4, or -1 for autosave)
   * @returns {Promise<boolean>}
   */
  async load(slot = 0) {
    if (this.isLoading) {
      console.warn('[SaveManager] Load already in progress');
      return false;
    }

    if (slot < -1 || slot >= this.maxSlots) {
      console.error(`[SaveManager] Invalid slot: ${slot}`);
      return false;
    }

    this.isLoading = true;

    try {
      console.log(`[SaveManager] Loading from slot ${slot}...`);

      const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;
      const storage = this.getStorage();

      if (!storage) {
        throw new Error('No storage available');
      }

      const compressed = storage.getItem(slotKey);
      if (!compressed) {
        console.warn(`[SaveManager] No save found in slot ${slot}`);
        return false;
      }

      // Decompress and parse
      const saveData = this.decompressSaveData(compressed);

      // Validate save data
      if (!this.validateSaveData(saveData)) {
        throw new Error('Invalid save data');
      }

      // Check version compatibility
      if (saveData.version !== this.saveVersion) {
        console.warn(`[SaveManager] Save version mismatch: ${saveData.version} vs ${this.saveVersion}`);
        // Could implement migration here
      }

      console.log(`[SaveManager] Loading save from ${new Date(saveData.timestamp).toLocaleString()}`);

      // Restore game state to all managers
      this.deserializePlayer(saveData.player);

      if (this.game.questManager && saveData.quests) {
        this.game.questManager.deserialize(saveData.quests);
      }

      if (this.game.factionManager && saveData.factions) {
        this.game.factionManager.deserialize(saveData.factions);
      }

      if (this.game.worldStateManager && saveData.worldState) {
        this.game.worldStateManager.deserialize(saveData.worldState);
      }

      if (this.game.storyFlagManager && saveData.storyFlags) {
        this.game.storyFlagManager.deserialize(saveData.storyFlags);
      }

      if (this.game.caseManager && saveData.cases) {
        this.game.caseManager.deserialize(saveData.cases);
      }

      const npcMemorySystem = this.game?.gameSystems?.npcMemory;
      if (npcMemorySystem && saveData.npcMemory && typeof npcMemorySystem.deserialize === 'function') {
        npcMemorySystem.deserialize(saveData.npcMemory);
      }

      if (this.game.investigationSystem && saveData.investigation && this.game.investigationSystem.deserialize) {
        this.game.investigationSystem.deserialize(saveData.investigation);
      }

      console.log('[SaveManager] Loaded successfully');

      // Emit load event
      if (this.game.eventBus) {
        this.game.eventBus.emit('game:loaded', { slot });
      }

      return true;
    } catch (error) {
      console.error('[SaveManager] Load failed:', error);

      if (this.game.eventBus) {
        this.game.eventBus.emit('load:error', { slot, reason: error.message });
      }

      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Serialize player state
   * @returns {Object}
  */
  serializePlayer() {
    let playerEntities = this.game.componentRegistry?.queryEntities(['Player', 'Transform']);
    if (!playerEntities || playerEntities.length === 0) {
      playerEntities = this.game.componentRegistry?.queryEntities(['PlayerController', 'Transform']);
    }
    if (!playerEntities || playerEntities.length === 0) {
      return {};
    }

    const playerEntity = playerEntities[0];
    const transform = this.game.componentRegistry.getComponent(playerEntity, 'Transform');
    const player = this.game.componentRegistry.getComponent(playerEntity, 'Player');
    const factionMember = this.game.componentRegistry.getComponent(playerEntity, 'FactionMember');

    return {
      position: { x: transform?.x || 0, y: transform?.y || 0 },
      abilities: player?.abilities || [],
      health: player?.health || 100,
      energy: player?.energy || 100,
      inventory: player?.inventory || [],
      knownBy: factionMember ? Array.from(factionMember.knownBy) : []
    };
  }

  /**
   * Deserialize player state
   * @param {Object} data
   */
  deserializePlayer(data) {
    if (!data || !this.game.componentRegistry) return;

    let playerEntities = this.game.componentRegistry.queryEntities(['Player', 'Transform']);
    if (!playerEntities || playerEntities.length === 0) {
      playerEntities = this.game.componentRegistry.queryEntities(['PlayerController', 'Transform']);
    }
    if (!playerEntities || playerEntities.length === 0) return;

    const playerEntity = playerEntities[0];

    // Restore position
    if (data.position) {
      const transform = this.game.componentRegistry.getComponent(playerEntity, 'Transform');
      if (transform) {
        transform.x = data.position.x;
        transform.y = data.position.y;
      }
    }

    // Restore player data
    const player = this.game.componentRegistry.getComponent(playerEntity, 'Player');
    if (player) {
      if (data.abilities) player.abilities = [...data.abilities];
      if (data.health !== undefined) player.health = data.health;
      if (data.energy !== undefined) player.energy = data.energy;
      if (data.inventory) player.inventory = [...data.inventory];
    }

    if (Array.isArray(data.knownBy)) {
      const factionMember = this.game.componentRegistry.getComponent(playerEntity, 'FactionMember');
      if (factionMember?.setKnownBy) {
        factionMember.setKnownBy(data.knownBy);
      } else if (factionMember) {
        factionMember.knownBy = new Set(data.knownBy);
      }
    }
  }

  /**
   * Serialize meta information
   * @returns {Object}
   */
  serializeMeta() {
    return {
      playtime: this.game.playtime || 0,
      currentAct: this.game.storyFlagManager?.getCurrentAct() || 'act1',
      progressPercentage: this.game.storyFlagManager?.getProgressionPercentage() || 0,
      lastSaveDate: new Date().toISOString()
    };
  }

  /**
   * Compress save data to JSON string
   * @param {Object} data
   * @returns {string}
   */
  compressSaveData(data) {
    // For now, just JSON stringify
    // Could implement LZ-string compression here for large saves
    return JSON.stringify(data);
  }

  /**
   * Decompress save data from JSON string
   * @param {string} compressed
   * @returns {Object}
   */
  decompressSaveData(compressed) {
    return JSON.parse(compressed);
  }

  /**
   * Validate save data structure
   * @param {Object} data
   * @returns {boolean}
   */
  validateSaveData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.version || !data.timestamp) return false;
    return true;
  }

  /**
   * Check if save exists in slot
   * @param {number} slot
   * @returns {boolean}
   */
  hasSave(slot) {
    const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;
    const storage = this.getStorage();
    return storage ? storage.getItem(slotKey) !== null : false;
  }

  /**
   * Get save metadata without loading full save
   * @param {number} slot
   * @returns {Object|null}
   */
  getSaveInfo(slot) {
    try {
      const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;
      const storage = this.getStorage();

      if (!storage) return null;

      const compressed = storage.getItem(slotKey);
      if (!compressed) return null;

      const saveData = this.decompressSaveData(compressed);

      return {
        slot,
        timestamp: saveData.timestamp,
        date: new Date(saveData.timestamp).toLocaleString(),
        version: saveData.version,
        meta: saveData.meta
      };
    } catch (error) {
      console.error(`[SaveManager] Failed to get save info for slot ${slot}:`, error);
      return null;
    }
  }

  /**
   * Get all save slots info
   * @returns {Array}
   */
  getAllSaves() {
    const saves = [];
    for (let slot = 0; slot < this.maxSlots; slot++) {
      const info = this.getSaveInfo(slot);
      if (info) {
        saves.push(info);
      } else {
        saves.push({ slot, empty: true });
      }
    }
    return saves;
  }

  /**
   * Delete save from slot
   * @param {number} slot
   * @returns {boolean}
   */
  deleteSave(slot) {
    try {
      const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;
      const storage = this.getStorage();

      if (!storage) return false;

      storage.removeItem(slotKey);
      console.log(`[SaveManager] Deleted save from slot ${slot}`);

      if (this.game.eventBus) {
        this.game.eventBus.emit('save:deleted', { slot });
      }

      return true;
    } catch (error) {
      console.error(`[SaveManager] Failed to delete save from slot ${slot}:`, error);
      return false;
    }
  }

  /**
   * Start autosave timer
   */
  startAutosave() {
    if (this.autosaveInterval <= 0) return;

    this.autosaveTimer = setInterval(() => {
      console.log('[SaveManager] Autosaving...');
      this.save(-1); // Save to autosave slot
    }, this.autosaveInterval);

    console.log(`[SaveManager] Autosave enabled (every ${this.autosaveInterval / 1000 / 60} minutes)`);
  }

  /**
   * Stop autosave timer
   */
  stopAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
      console.log('[SaveManager] Autosave disabled');
    }
  }

  /**
   * Quick save (to autosave slot)
   * @returns {Promise<boolean>}
   */
  async quickSave() {
    return this.save(-1);
  }

  /**
   * Quick load (from autosave slot)
   * @returns {Promise<boolean>}
   */
  async quickLoad() {
    return this.load(-1);
  }

  /**
   * Export save to JSON file
   * @param {number} slot
   */
  exportSave(slot) {
    const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;
    const storage = this.getStorage();

    if (!storage) {
      console.error('[SaveManager] No storage available');
      return;
    }

    const compressed = storage.getItem(slotKey);
    if (!compressed) {
      console.error(`[SaveManager] No save found in slot ${slot}`);
      return;
    }

    // Create download
    const blob = new Blob([compressed], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory_syndicate_save_${slot}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`[SaveManager] Exported save from slot ${slot}`);
  }

  /**
   * Import save from JSON file
   * @param {File} file
   * @param {number} slot
   * @returns {Promise<boolean>}
   */
  async importSave(file, slot) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const compressed = e.target.result;
          const saveData = this.decompressSaveData(compressed);

          if (!this.validateSaveData(saveData)) {
            throw new Error('Invalid save file');
          }

          const slotKey = slot === -1 ? `${this.storageKey}_autosave` : `${this.storageKey}_${slot}`;
          const storage = this.getStorage();

          if (!storage) {
            throw new Error('No storage available');
          }

          storage.setItem(slotKey, compressed);
          console.log(`[SaveManager] Imported save to slot ${slot}`);

          if (this.game.eventBus) {
            this.game.eventBus.emit('save:imported', { slot });
          }

          resolve(true);
        } catch (error) {
          console.error('[SaveManager] Import failed:', error);
          resolve(false);
        }
      };

      reader.onerror = () => {
        console.error('[SaveManager] Failed to read file');
        resolve(false);
      };

      reader.readAsText(file);
    });
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    this.stopAutosave();
  }
}
