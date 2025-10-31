import { SaveManager } from '../../../src/game/managers/SaveManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';
import { tutorialSlice } from '../../../src/game/state/slices/tutorialSlice.js';
import { districtSlice } from '../../../src/game/state/slices/districtSlice.js';
import { npcSlice } from '../../../src/game/state/slices/npcSlice.js';

describe('SaveManager', () => {
  let saveManager;
  let eventBus;
  let mockManagers;
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage with accessible store
    const backingStore = {};
    localStorageMock = {
      store: backingStore,
      getItem: jest.fn((key) => (Object.prototype.hasOwnProperty.call(backingStore, key) ? backingStore[key] : null)),
      setItem: jest.fn((key, value) => {
        backingStore[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete backingStore[key];
      }),
      clear: jest.fn(() => {
        Object.keys(backingStore).forEach((key) => delete backingStore[key]);
      }),
    };

    global.localStorage = localStorageMock;

    // Create mock managers with serialize/deserialize methods
    mockManagers = {
      storyFlagManager: {
        serialize: jest.fn(() => ({ flags: { test_flag: true } })),
        deserialize: jest.fn(),
      },
      questManager: {
        serialize: jest.fn(() => ({ quests: { test_quest: 'active' } })),
        deserialize: jest.fn(),
      },
      factionManager: {
        reputation: { test_faction: 50 },
      },
      tutorialSystem: {
        getProgress: jest.fn(() => ({ totalSteps: 3 })),
        isComplete: jest.fn(() => false),
        completeTutorial: jest.fn(),
      },
      worldStateStore: null,
      storage: localStorageMock,
      spatialMetricsProvider: null,
    };

    eventBus = new EventBus();
    saveManager = new SaveManager(eventBus, mockManagers);
  });

  afterEach(() => {
    if (saveManager) {
      try {
        saveManager.cleanup();
      } catch (error) {
        // ignore cleanup errors in tests
      }
    }
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  // ==================== INITIALIZATION TESTS ====================

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(saveManager.config.storageKeyPrefix).toBe('save_');
      expect(saveManager.config.metadataKey).toBe('save_metadata');
      expect(saveManager.config.version).toBe(1);
      expect(saveManager.config.maxSaveSlots).toBe(10);
    });

    test('should initialize with eventBus', () => {
      expect(saveManager.eventBus).toBe(eventBus);
      expect(saveManager.events).toBe(eventBus);
    });

    test('should set autosave enabled by default', () => {
      expect(saveManager.autosaveEnabled).toBe(true);
    });

    test('should set correct default autosave interval', () => {
      expect(saveManager.autosaveInterval).toBe(5 * 60 * 1000); // 5 minutes
    });

    test('should initialize with manager references', () => {
      expect(saveManager.storyFlagManager).toBe(mockManagers.storyFlagManager);
      expect(saveManager.questManager).toBe(mockManagers.questManager);
      expect(saveManager.factionManager).toBe(mockManagers.factionManager);
      expect(saveManager.tutorialSystem).toBe(mockManagers.tutorialSystem);
    });

    test('should handle missing managers gracefully', () => {
      const minimalSaveManager = new SaveManager(eventBus);
      expect(minimalSaveManager.storyFlagManager).toBeUndefined();
      expect(minimalSaveManager.questManager).toBeUndefined();
      expect(minimalSaveManager.factionManager).toBeUndefined();
      expect(minimalSaveManager.tutorialSystem).toBeUndefined();
    });

    test('should initialize gameStartTime on construction', () => {
      const beforeTime = Date.now();
      const newSaveManager = new SaveManager(eventBus, mockManagers);
      const afterTime = Date.now();
      expect(newSaveManager.gameStartTime).toBeGreaterThanOrEqual(beforeTime);
      expect(newSaveManager.gameStartTime).toBeLessThanOrEqual(afterTime);
    });

    test('should subscribe to autosave events on init', () => {
      const onSpy = jest.spyOn(eventBus, 'on');
      saveManager.init();

      const subscribedEvents = onSpy.mock.calls.map(([eventType]) => eventType);
      expect(subscribedEvents).toEqual(
        expect.arrayContaining([
          'quest:completed',
          'objective:completed',
          'area:entered',
          'case:completed',
          'inventory:item_added',
          'inventory:item_updated',
          'inventory:item_removed',
        ])
      );
    });

    test('should set lastAutosaveTime on init', () => {
      const beforeTime = Date.now();
      saveManager.init();
      const afterTime = Date.now();
      expect(saveManager.lastAutosaveTime).toBeGreaterThanOrEqual(beforeTime);
      expect(saveManager.lastAutosaveTime).toBeLessThanOrEqual(afterTime);
    });

    test('should log initialization message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      new SaveManager(eventBus, mockManagers);
      expect(consoleSpy).toHaveBeenCalledWith('[SaveManager] Initialized');
      consoleSpy.mockRestore();
    });
  });

  // ==================== SAVE OPERATIONS TESTS ====================

  describe('Save Operations', () => {
    beforeEach(() => {
      saveManager.init();
    });

    test('should save game to default autosave slot', () => {
      const result = saveManager.saveGame();
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'autosave';
      expect(localStorageMock.store[saveKey]).toBeDefined();

      const saveData = JSON.parse(localStorageMock.store[saveKey]);
      expect(saveData.slot).toBe('autosave');
    });

    test('should save game to custom slot name', () => {
      const result = saveManager.saveGame('custom_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'custom_slot';
      expect(localStorageMock.store[saveKey]).toBeDefined();

      const saveData = JSON.parse(localStorageMock.store[saveKey]);
      expect(saveData.slot).toBe('custom_slot');
    });

    test('should collect state from all managers', () => {
      saveManager.saveGame();

      expect(mockManagers.storyFlagManager.serialize).toHaveBeenCalled();
      expect(mockManagers.questManager.serialize).toHaveBeenCalled();
    });

    test('should include version in save data', () => {
      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      const saveData = JSON.parse(localStorageMock.store[saveKey]);

      expect(saveData.version).toBe(1);
    });

    test('should include timestamp in save data', () => {
      const beforeTime = Date.now();
      const result = saveManager.saveGame('test_slot');
      const afterTime = Date.now();

      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      const saveData = JSON.parse(localStorageMock.store[saveKey]);

      expect(saveData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(saveData.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should calculate playtime correctly', () => {
      // Set gameStartTime to 10 seconds ago
      saveManager.gameStartTime = Date.now() - 10000;

      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      const saveData = JSON.parse(localStorageMock.store[saveKey]);

      expect(saveData.playtime).toBeGreaterThanOrEqual(9000); // ~10 seconds
      expect(saveData.playtime).toBeLessThanOrEqual(11000);
    });

    test('autosaves when inventory changes with throttling', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
      const saveSpy = jest.spyOn(saveManager, 'saveGame').mockReturnValue(true);

      eventBus.emit('inventory:item_added', { id: 'intel_fragment', quantity: 1 });
      expect(saveSpy).toHaveBeenCalledWith('autosave');

      saveSpy.mockClear();
      // Without advancing time, should be throttled
      eventBus.emit('inventory:item_updated', { id: 'intel_fragment', quantityDelta: 1 });
      expect(saveSpy).not.toHaveBeenCalled();

      nowSpy.mockReturnValue(2105);
      eventBus.emit('inventory:item_removed', { id: 'intel_fragment' });
      expect(saveSpy).toHaveBeenCalledWith('autosave');

      saveSpy.mockRestore();
      nowSpy.mockRestore();
    });

    test('should serialize save data to localStorage', () => {
      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      const savedData = localStorageMock.store[saveKey];

      expect(savedData).toBeDefined();
      expect(() => JSON.parse(savedData)).not.toThrow();

      const parsed = JSON.parse(savedData);
      expect(parsed.gameData.dialogue).toBeDefined();
    });

    test('uses world state store snapshot when available', () => {
      const snapshot = {
        storyFlags: { flags: { test_flag: { value: true } } },
        quests: { byId: {} },
        factions: { byId: {} },
        tutorial: { completed: true, completedSteps: [] },
        tutorialComplete: true,
        dialogue: {
          active: null,
          historyByNpc: {},
          completedByNpc: {},
          transcriptEnabled: true,
        },
        inventory: {
          items: [],
          equipped: {},
          lastUpdatedAt: 100,
        },
      };

      const storeMock = { snapshot: jest.fn(() => snapshot) };
      const managerWithStore = new SaveManager(eventBus, {
        ...mockManagers,
        worldStateStore: storeMock,
      });
      managerWithStore.init();

      const result = managerWithStore.saveGame('store_slot');
      expect(result).toBe(true);
      expect(storeMock.snapshot).toHaveBeenCalled();

      const saveKey = managerWithStore.config.storageKeyPrefix + 'store_slot';
      const saveData = JSON.parse(localStorageMock.store[saveKey]);

      expect(saveData.meta.snapshotSource).toBe('worldStateStore');
      expect(saveData.gameData.tutorialComplete).toBe(true);
    });

    test('persists and hydrates inventory via world state store', () => {
      const inventorySnapshot = {
        items: [
          { id: 'intel_case_file', quantity: 1, tags: ['intel'] },
          { id: 'gadget_siphon_glove', quantity: 1, tags: ['gadget'] },
        ],
        equipped: { focus: 'intel_case_file' },
        lastUpdatedAt: 777,
      };

      const snapshot = {
        storyFlags: {},
        quests: {},
        factions: {},
        tutorial: {},
        tutorialComplete: false,
        dialogue: {},
        inventory: inventorySnapshot,
      };

      const worldStateStore = {
        snapshot: jest.fn(() => snapshot),
        hydrate: jest.fn(),
      };

      const dedicatedBus = new EventBus();
      const managerWithStore = new SaveManager(dedicatedBus, {
        ...mockManagers,
        worldStateStore,
      });
      managerWithStore.init();

      managerWithStore.saveGame('inventory_slot');

      const saveKey = managerWithStore.config.storageKeyPrefix + 'inventory_slot';
      const saveData = JSON.parse(localStorageMock.store[saveKey]);

      expect(saveData.gameData.inventory.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'intel_case_file', quantity: 1 }),
          expect.objectContaining({ id: 'gadget_siphon_glove' }),
        ])
      );
      expect(saveData.gameData.inventory.equipped.focus).toBe('intel_case_file');

      worldStateStore.snapshot.mockClear();
      managerWithStore.loadGame('inventory_slot');

      expect(worldStateStore.hydrate).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory: expect.objectContaining({
            items: expect.arrayContaining([expect.objectContaining({ id: 'intel_case_file' })]),
            equipped: expect.objectContaining({ focus: 'intel_case_file' }),
          }),
        })
      );

      managerWithStore.cleanup();
    });

    test('persists and hydrates district and npc slices via world state store', () => {
      const districtSnapshot = {
        byId: {
          neon_districts: {
            id: 'neon_districts',
            name: 'Neon Districts',
            tier: 'foundation',
            access: {
              defaultUnlocked: true,
              fastTravelEnabled: true,
              requirements: {},
              restrictions: [],
              unlockedRoutes: [],
              restrictionLog: [],
            },
            analytics: {
              lastLockdownAt: 123456,
            },
          },
        },
        changeLog: [
          {
            type: 'registered',
            districtId: 'neon_districts',
            timestamp: 42,
          },
        ],
        lastUpdatedAt: 123456,
      };

      const npcSnapshot = {
        byId: {
          npc_echo: {
            id: 'npc_echo',
            name: 'Echo Operative',
            factionId: 'wraith_network',
            status: 'alert',
            knowsPlayer: true,
            interactions: {
              interviews: 1,
              recognitions: 0,
              witnessedCrimes: 0,
            },
            suspicion: {
              active: false,
              reason: null,
              updatedAt: null,
            },
            alert: {
              active: true,
              reason: 'security_breach',
              updatedAt: 987654,
            },
            lastInteractionAt: 987654,
            history: [
              {
                type: 'alerted',
                reason: 'security_breach',
                timestamp: 987654,
              },
            ],
            tags: ['resistance'],
          },
        },
        changeLog: [
          {
            type: 'alerted',
            npcId: 'npc_echo',
            reason: 'security_breach',
            timestamp: 987654,
          },
        ],
        lastUpdatedAt: 987654,
      };

      const snapshot = {
        storyFlags: {},
        quests: {},
        factions: {},
        tutorial: {},
        tutorialComplete: false,
        dialogue: {},
        inventory: { items: [], equipped: {} },
        districts: districtSnapshot,
        npcs: npcSnapshot,
      };

      const worldStateStore = {
        snapshot: jest.fn(() => snapshot),
        hydrate: jest.fn(),
      };

      const managerWithStore = new SaveManager(eventBus, {
        ...mockManagers,
        worldStateStore,
      });
      managerWithStore.init();

      const result = managerWithStore.saveGame('district_npc_slot');
      expect(result).toBe(true);

      const saveKey = managerWithStore.config.storageKeyPrefix + 'district_npc_slot';
      const saveData = JSON.parse(localStorageMock.store[saveKey]);

      expect(saveData.gameData.districts).toEqual(districtSnapshot);
      expect(saveData.gameData.npcs).toEqual(npcSnapshot);

      worldStateStore.snapshot.mockClear();
      managerWithStore.loadGame('district_npc_slot');

      expect(worldStateStore.hydrate).toHaveBeenCalledWith(
        expect.objectContaining({
          districts: districtSnapshot,
          npcs: npcSnapshot,
        })
      );

      managerWithStore.cleanup();
    });

    test('logs parity warning when snapshot differs from legacy data', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const divergentSnapshot = {
        storyFlags: { flags: { test_flag: { value: false } } },
        quests: { byId: {} },
        factions: { byId: {} },
        tutorial: { completed: false, completedSteps: [] },
        tutorialComplete: false,
        dialogue: {
          active: null,
          historyByNpc: {},
          completedByNpc: {},
          transcriptEnabled: true,
        },
      };

      const storeMock = { snapshot: jest.fn(() => divergentSnapshot) };
      const managerWithStore = new SaveManager(eventBus, {
        ...mockManagers,
        worldStateStore: storeMock,
      });
      managerWithStore.init();

      managerWithStore.saveGame('parity_slot');

      expect(warnSpy).toHaveBeenCalledWith(
        '[SaveManager] WorldStateStore snapshot differs from legacy collectors',
        expect.objectContaining({
          snapshot: expect.any(Object),
          legacy: expect.any(Object),
        })
      );

      warnSpy.mockRestore();
    });

    test('does not log parity warning when tutorial skip matches legacy state', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      localStorageMock.setItem('tutorial_completed', 'true');
      localStorageMock.setItem('tutorial_skipped', 'true');

      const managerWithStore = new SaveManager(eventBus, {
        ...mockManagers,
        worldStateStore: {
          snapshot: jest.fn(),
        },
      });
      managerWithStore.init();

      const baselineLegacy = managerWithStore.collectLegacyGameData();
      managerWithStore.worldStateStore.snapshot.mockReturnValue({
        ...baselineLegacy,
        tutorial: baselineLegacy.tutorial ? { ...baselineLegacy.tutorial } : baselineLegacy.tutorial,
        dialogue: baselineLegacy.dialogue ?? null,
        inventory: baselineLegacy.inventory ? { ...baselineLegacy.inventory } : baselineLegacy.inventory,
        factions: baselineLegacy.factions ? { ...baselineLegacy.factions } : baselineLegacy.factions,
        quests: baselineLegacy.quests ? { ...baselineLegacy.quests } : baselineLegacy.quests,
        storyFlags: baselineLegacy.storyFlags ? { ...baselineLegacy.storyFlags } : baselineLegacy.storyFlags,
        tutorialComplete: baselineLegacy.tutorialComplete,
      });

      managerWithStore.saveGame('parity_aligned_slot');

      expect(warnSpy).not.toHaveBeenCalled();

      managerWithStore.cleanup();
      warnSpy.mockRestore();
    });

    test('should emit game:saved event on success', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      saveManager.saveGame('test_slot');

      expect(emitSpy).toHaveBeenCalledWith('game:saved', expect.objectContaining({
        slot: 'test_slot',
        timestamp: expect.any(Number),
        playtime: expect.any(Number),
      }));
    });

    test('should emit game:save_failed event on error', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      // Force localStorage to throw error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      const result = saveManager.saveGame('test_slot');

      expect(result).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('game:save_failed', expect.objectContaining({
        slot: 'test_slot',
        error: expect.any(String),
      }));
    });

    test('should handle missing storyFlagManager gracefully', () => {
      saveManager.storyFlagManager = null;

      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      expect(localStorageMock.store[saveKey]).toBeDefined();

      const saveData = JSON.parse(localStorageMock.store[saveKey]);
      expect(saveData.gameData.storyFlags).toEqual({});
    });

    test('should handle missing questManager gracefully', () => {
      saveManager.questManager = null;

      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      expect(localStorageMock.store[saveKey]).toBeDefined();

      const saveData = JSON.parse(localStorageMock.store[saveKey]);
      expect(saveData.gameData.quests).toEqual({});
    });

    test('should handle missing factionManager gracefully', () => {
      saveManager.factionManager = null;

      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      expect(localStorageMock.store[saveKey]).toBeDefined();

      const saveData = JSON.parse(localStorageMock.store[saveKey]);
      expect(saveData.gameData.factions).toEqual({});
    });

    test('should handle missing tutorialSystem gracefully', () => {
      saveManager.tutorialSystem = null;

      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      expect(localStorageMock.store[saveKey]).toBeDefined();

      const saveData = JSON.parse(localStorageMock.store[saveKey]);
      expect(saveData.gameData.tutorialComplete).toBe(false);
    });

    test('should update save metadata', () => {
      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const metadataKey = saveManager.config.metadataKey;
      expect(localStorageMock.store[metadataKey]).toBeDefined();

      const metadata = JSON.parse(localStorageMock.store[metadataKey]);
      expect(metadata.test_slot).toBeDefined();
      expect(metadata.test_slot.timestamp).toBeDefined();
      expect(metadata.test_slot.playtime).toBeDefined();
      expect(metadata.test_slot.version).toBe(1);
    });
  });

  // ==================== LOAD OPERATIONS TESTS ====================

  describe('Load Operations', () => {
    beforeEach(() => {
      saveManager.init();
    });

    test('should load game from autosave slot', () => {
      // Create a save first
      saveManager.saveGame('autosave');

      // Create new save manager to test loading
      const newSaveManager = new SaveManager(eventBus, mockManagers);
      newSaveManager.init();

      const result = newSaveManager.loadGame('autosave');
      expect(result).toBe(true);
    });

    test('should load game from custom slot', () => {
      saveManager.saveGame('custom_slot');

      const newSaveManager = new SaveManager(eventBus, mockManagers);
      newSaveManager.init();

      const result = newSaveManager.loadGame('custom_slot');
      expect(result).toBe(true);
    });

    test('should restore state to all managers', () => {
      saveManager.saveGame('test_slot');

      const newManagers = {
        storyFlagManager: {
          serialize: jest.fn(),
          deserialize: jest.fn(),
        },
        questManager: {
          serialize: jest.fn(),
          deserialize: jest.fn(),
        },
        factionManager: {
          reputation: {},
        },
        tutorialSystem: {},
      };

      const newSaveManager = new SaveManager(eventBus, {
        ...newManagers,
        storage: localStorageMock,
      });
      newSaveManager.init();
      newSaveManager.loadGame('test_slot');

      expect(newManagers.storyFlagManager.deserialize).toHaveBeenCalled();
      expect(newManagers.questManager.deserialize).toHaveBeenCalled();
    });

    test('should verify save version before loading', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create save with different version
      const saveData = {
        version: 999,
        timestamp: Date.now(),
        playtime: 0,
        slot: 'test_slot',
        gameData: {
          storyFlags: {},
          quests: {},
          factions: {},
          tutorialComplete: false,
        },
      };

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      localStorageMock.store[saveKey] = JSON.stringify(saveData);

      saveManager.loadGame('test_slot');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Save version mismatch')
      );

      consoleSpy.mockRestore();
    });

    test('should emit game:loaded event on success', () => {
      saveManager.saveGame('test_slot');

      const emitSpy = jest.spyOn(eventBus, 'emit');

      saveManager.loadGame('test_slot');

      expect(emitSpy).toHaveBeenCalledWith('game:loaded', expect.objectContaining({
        slot: 'test_slot',
        timestamp: expect.any(Number),
        playtime: expect.any(Number),
      }));
    });

    test('should emit game:load_failed event on error', () => {
      // Try to load non-existent save
      const emitSpy = jest.spyOn(eventBus, 'emit');

      const result = saveManager.loadGame('nonexistent_slot');

      expect(result).toBe(false);
      // Should not emit load_failed for missing save, just return false
    });

    test('should handle corrupted save data gracefully', () => {
      // Save corrupted JSON
      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      localStorageMock.store[saveKey] = 'corrupted{json';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const emitSpy = jest.spyOn(eventBus, 'emit');
      const result = saveManager.loadGame('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith('game:load_failed', expect.objectContaining({
        slot: 'test_slot',
        error: expect.any(String),
      }));

      consoleSpy.mockRestore();
    });

    test('should handle missing save slot', () => {
      const result = saveManager.loadGame('nonexistent_slot');
      expect(result).toBe(false);
    });

    test('should restore storyFlags correctly', () => {
      const newManagers = {
        storyFlagManager: {
          serialize: jest.fn(() => ({ test: 'data' })),
          deserialize: jest.fn(),
        },
        questManager: mockManagers.questManager,
        factionManager: mockManagers.factionManager,
        tutorialSystem: mockManagers.tutorialSystem,
      };

      const newSaveManager = new SaveManager(eventBus, newManagers);
      newSaveManager.init();
      newSaveManager.saveGame('test_slot');

      const loadSaveManager = new SaveManager(eventBus, {
        storyFlagManager: {
          deserialize: jest.fn(),
        },
        questManager: { deserialize: jest.fn() },
        factionManager: { reputation: {} },
      });
      loadSaveManager.init();
      loadSaveManager.loadGame('test_slot');

      expect(loadSaveManager.storyFlagManager.deserialize).toHaveBeenCalledWith(
        expect.objectContaining({ test: 'data' })
      );
    });

    test('should restore quest state correctly', () => {
      saveManager.saveGame('test_slot');

      const loadManagers = {
        questManager: {
          deserialize: jest.fn(),
        },
        storyFlagManager: { deserialize: jest.fn() },
        factionManager: { reputation: {} },
      };

      const loadSaveManager = new SaveManager(eventBus, loadManagers);
      loadSaveManager.init();
      loadSaveManager.loadGame('test_slot');

      expect(loadManagers.questManager.deserialize).toHaveBeenCalled();
    });

    test('should restore faction data correctly', () => {
      saveManager.saveGame('test_slot');

      const loadManagers = {
        factionManager: {
          reputation: {},
        },
        storyFlagManager: { deserialize: jest.fn() },
        questManager: { deserialize: jest.fn() },
      };

      const loadSaveManager = new SaveManager(eventBus, loadManagers);
      loadSaveManager.init();
      loadSaveManager.loadGame('test_slot');

      expect(loadManagers.factionManager.reputation).toEqual(
        mockManagers.factionManager.reputation
      );
    });

    test('should restore tutorial status correctly', () => {
      // Set tutorial complete before saving
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = jest.fn((key) => {
        if (key === 'tutorial_completed') return 'true';
        return originalGetItem.call(localStorageMock, key);
      });

      saveManager.saveGame('test_slot');

      // Reset getItem mock
      localStorageMock.getItem = originalGetItem;

      // Clear tutorial status
      delete localStorageMock.store['tutorial_completed'];

      // Load save
      saveManager.loadGame('test_slot');

      expect(localStorageMock.store['tutorial_completed']).toBe('true');
    });

    test('should adjust gameStartTime for loaded playtime', () => {
      // Save with 10 seconds playtime
      saveManager.gameStartTime = Date.now() - 10000;
      saveManager.saveGame('test_slot');

      const newSaveManager = new SaveManager(eventBus, mockManagers);
      newSaveManager.init();

      const beforeLoadTime = Date.now();
      newSaveManager.loadGame('test_slot');

      // gameStartTime should be adjusted backwards by saved playtime
      expect(newSaveManager.gameStartTime).toBeLessThan(beforeLoadTime);
    });
  });

  // ==================== AUTOSAVE TESTS ====================

  describe('Autosave', () => {
    beforeEach(() => {
      saveManager.init();
    });

    test('should autosave on quest:completed event', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      eventBus.emit('quest:completed', { questId: 'test_quest' });

      expect(saveSpy).toHaveBeenCalledWith('autosave');
    });

    test('should autosave on major objective:completed', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      // Major objective (contains "solve")
      eventBus.emit('objective:completed', { objectiveId: 'solve_mystery' });

      expect(saveSpy).toHaveBeenCalledWith('autosave');
    });

    test('should NOT autosave on minor objectives', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      // Minor objective (doesn't match keywords)
      eventBus.emit('objective:completed', { objectiveId: 'collect_item' });

      expect(saveSpy).not.toHaveBeenCalled();
    });

    test('should autosave on area:entered event', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      eventBus.emit('area:entered', { areaId: 'downtown' });

      expect(saveSpy).toHaveBeenCalledWith('autosave');
    });

    test('should autosave on case:completed event', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      eventBus.emit('case:completed', { caseId: 'case_001' });

      expect(saveSpy).toHaveBeenCalledWith('autosave');
    });

    test('should identify major objectives correctly', () => {
      expect(saveManager.isMajorObjective('solve_mystery')).toBe(true);
      expect(saveManager.isMajorObjective('complete_investigation')).toBe(true);
      expect(saveManager.isMajorObjective('discover_truth')).toBe(true);
      expect(saveManager.isMajorObjective('confront_suspect')).toBe(true);
      expect(saveManager.isMajorObjective('unlock_area')).toBe(true);

      expect(saveManager.isMajorObjective('collect_item')).toBe(false);
      expect(saveManager.isMajorObjective('talk_to_npc')).toBe(false);
    });

    test('should respect autosave interval for time-based autosave', () => {
      saveManager.lastAutosaveTime = Date.now() - 1000; // 1 second ago

      const shouldAutosave = saveManager.shouldAutosave(Date.now());

      expect(shouldAutosave).toBe(false); // Interval not met
    });

    test('should trigger autosave when interval elapsed', () => {
      // Set last autosave to 6 minutes ago
      saveManager.lastAutosaveTime = Date.now() - (6 * 60 * 1000);

      const shouldAutosave = saveManager.shouldAutosave(Date.now());

      expect(shouldAutosave).toBe(true);
    });

    test('should call updateAutosave every frame', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      // Set last autosave to 6 minutes ago
      saveManager.lastAutosaveTime = Date.now() - (6 * 60 * 1000);

      saveManager.updateAutosave();

      expect(saveSpy).toHaveBeenCalledWith('autosave');
    });

    test('should only autosave after interval elapsed', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      // Last autosave was recent
      saveManager.lastAutosaveTime = Date.now() - 1000;

      saveManager.updateAutosave();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    test('should reset lastAutosaveTime after autosave', () => {
      saveManager.lastAutosaveTime = Date.now() - (6 * 60 * 1000);

      const beforeTime = Date.now();
      saveManager.updateAutosave();
      const afterTime = Date.now();

      expect(saveManager.lastAutosaveTime).toBeGreaterThanOrEqual(beforeTime);
      expect(saveManager.lastAutosaveTime).toBeLessThanOrEqual(afterTime);
    });

    test('should allow manual disable of autosave', () => {
      saveManager.disableAutosave();

      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      // Try to trigger autosave
      eventBus.emit('quest:completed', { questId: 'test_quest' });

      // Should still save (event handler doesn't check enabled flag)
      // But updateAutosave respects the flag
      saveSpy.mockClear();

      saveManager.lastAutosaveTime = Date.now() - (6 * 60 * 1000);
      saveManager.updateAutosave();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    test('handles sustained autosave bursts without failures', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      const iterations = 40;

      for (let i = 0; i < iterations; i += 1) {
        eventBus.emit('quest:completed', { questId: `stress_quest_${i}` });
      }

      const savedEvents = emitSpy.mock.calls.filter(([event]) => event === 'game:saved');
      const failedEvents = emitSpy.mock.calls.filter(([event]) => event === 'game:save_failed');

      expect(savedEvents).toHaveLength(iterations);
      expect(failedEvents).toHaveLength(0);

      const timestamps = savedEvents.map(([, payload]) => payload.timestamp);
      for (let i = 1; i < timestamps.length; i += 1) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }

      const storageKey = `${saveManager.config.storageKeyPrefix}autosave`;
      expect(localStorageMock.store[storageKey]).toBeDefined();
    });

    test('should cleanup on game exit', () => {
      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      saveManager.cleanup();

      expect(saveSpy).toHaveBeenCalledWith('autosave');
    });

    test('should not autosave on cleanup if autosave disabled', () => {
      saveManager.disableAutosave();

      const saveSpy = jest.spyOn(saveManager, 'saveGame');

      saveManager.cleanup();

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('Autosave burst helper', () => {
    beforeEach(() => {
      saveManager.init();
    });

    test('runs multiple autosaves and emits telemetry summary', async () => {
      const summaries = [];
      eventBus.on('telemetry:autosave_burst_completed', (payload) => {
        summaries.push(payload);
      });

      const summary = await saveManager.runAutosaveBurst({ iterations: 3, collectResults: true });

      expect(summary).toMatchObject({ iterations: 3, failures: 0, slot: 'autosave' });
      expect(summary.results).toHaveLength(3);
      expect(summary.results.every((entry) => entry.success)).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].iterations).toBe(3);
    });

    test('counts failures when storage throws during burst', async () => {
      const originalSetItem = localStorageMock.setItem;
      let writes = 0;
      localStorageMock.setItem = jest.fn((key, value) => {
        writes += 1;
        if (writes === 1) {
          throw new Error('storage-fail');
        }
        return originalSetItem.call(localStorageMock, key, value);
      });

      const summary = await saveManager.runAutosaveBurst({
        iterations: 3,
        collectResults: true,
      });

      expect(summary.failures).toBe(1);
      expect(summary.results.filter((entry) => entry.success === false)).toHaveLength(1);

      localStorageMock.setItem = originalSetItem;
    });

    test('invokes iteration hook without breaking execution when it throws', async () => {
      const hook = jest.fn(() => {
        throw new Error('iteration failure');
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await saveManager.runAutosaveBurst({ iterations: 2, onIteration: hook });

      expect(hook).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });

    test('optionally exports inspector telemetry after burst completes', async () => {
      const exportStub = {
        summary: { source: 'worldStateStore' },
        artifacts: [{ filename: 'stress.json', type: 'json', content: '{}' }],
      };
      const exportSpy = jest
        .spyOn(saveManager, 'exportInspectorSummary')
        .mockResolvedValue(exportStub);

      const eventPayloads = [];
      eventBus.on('telemetry:autosave_burst_completed', (payload) => {
        eventPayloads.push(payload);
      });

      const summary = await saveManager.runAutosaveBurst({
        iterations: 2,
        exportInspector: true,
        exportOptions: { prefix: 'stress-test' },
      });

      expect(exportSpy).toHaveBeenCalledWith({ prefix: 'stress-test' });
      expect(summary.exportResult).toBe(exportStub);
      expect(eventPayloads).toHaveLength(1);
      expect(eventPayloads[0].exportResult).toBe(exportStub);

      exportSpy.mockRestore();
    });

    test('routes autosave burst exports through telemetry writers', async () => {
      const writer = {
        id: 'burst-writer',
        write: jest.fn().mockResolvedValue(undefined),
      };
      const instrumented = new SaveManager(eventBus, {
        ...mockManagers,
        telemetryWriters: [writer],
      });

      instrumented.init();

      const summary = await instrumented.runAutosaveBurst({
        iterations: 2,
        exportInspector: true,
        exportOptions: { prefix: 'burst-harness' },
      });

      expect(writer.write).toHaveBeenCalled();
      expect(summary.exportResult).toBeTruthy();
      expect(summary.exportResult.metrics.writerSummaries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'burst-writer', successes: expect.any(Number) }),
        ])
      );

      instrumented.cleanup();
    });
  });

  // ==================== SLOT MANAGEMENT TESTS ====================

  describe('Slot Management', () => {
    beforeEach(() => {
      saveManager.init();
    });

    test('should list all save slots', () => {
      const result1 = saveManager.saveGame('slot1');
      const result2 = saveManager.saveGame('slot2');
      const result3 = saveManager.saveGame('slot3');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);

      const slots = saveManager.getSaveSlots();

      expect(slots.length).toBe(3);
      expect(slots.map(s => s.slot)).toContain('slot1');
      expect(slots.map(s => s.slot)).toContain('slot2');
      expect(slots.map(s => s.slot)).toContain('slot3');
    });

    test('should return metadata for each slot', () => {
      const result = saveManager.saveGame('test_slot');
      expect(result).toBe(true);

      const slots = saveManager.getSaveSlots();

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toEqual(expect.objectContaining({
        slot: 'test_slot',
        timestamp: expect.any(Number),
        playtime: expect.any(Number),
        version: 1,
      }));
    });

    test('should delete save slot', () => {
      saveManager.saveGame('test_slot');

      const result = saveManager.deleteSave('test_slot');

      expect(result).toBe(true);

      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      expect(localStorageMock.store[saveKey]).toBeUndefined();
    });

    test('should handle deleting non-existent slot', () => {
      const result = saveManager.deleteSave('nonexistent_slot');

      expect(result).toBe(true); // Still returns true
    });

    test('should remove deleted slot from metadata', () => {
      saveManager.saveGame('test_slot');
      saveManager.deleteSave('test_slot');

      const slots = saveManager.getSaveSlots();

      expect(slots.find(s => s.slot === 'test_slot')).toBeUndefined();
    });

    test('should return empty array when no saves exist', () => {
      // Clear any existing metadata
      delete localStorageMock.store[saveManager.config.metadataKey];

      const slots = saveManager.getSaveSlots();

      expect(slots).toEqual([]);
    });

    test('should return empty array on metadata error', () => {
      // Corrupt metadata
      localStorageMock.store[saveManager.config.metadataKey] = 'corrupted{json';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const slots = saveManager.getSaveSlots();

      expect(slots).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SaveManager] Failed to get save slots:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should enforce manual slot capacity by evicting oldest slot', () => {
      saveManager.config.maxSaveSlots = 2;

      const dateSpy = jest.spyOn(Date, 'now');
      dateSpy
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(3000)
        .mockReturnValueOnce(3000);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      try {
        expect(saveManager.saveGame('slot1')).toBe(true);
        expect(saveManager.saveGame('slot2')).toBe(true);

        localStorageMock.removeItem.mockClear();

        expect(saveManager.saveGame('slot3')).toBe(true);

        const slots = saveManager.getSaveSlots();
        expect(slots.length).toBe(2);
        expect(slots.some((entry) => entry.slot === 'slot1')).toBe(false);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          `${saveManager.config.storageKeyPrefix}slot1`
        );
      } finally {
        dateSpy.mockRestore();
        logSpy.mockRestore();
      }
    });

    test('should normalize slot names and preserve labels', () => {
      const result = saveManager.saveGame('  My Custom Slot  ');
      expect(result).toBe(true);

      const slots = saveManager.getSaveSlots();
      expect(slots[0]).toMatchObject({
        slot: 'my-custom-slot',
        label: 'My Custom Slot',
        slotType: 'manual',
      });
    });

    test('should expose slot metadata lookup helpers', () => {
      saveManager.saveGame('story_progress');

      const metadata = saveManager.getSaveSlotMetadata('story_progress');
      expect(metadata).toMatchObject({
        slot: 'story_progress',
        label: 'story_progress',
        slotType: 'manual',
        snapshotSource: 'legacy-managers',
      });

      expect(saveManager.slotExists('story_progress')).toBe(true);
      expect(saveManager.slotExists('missing_slot')).toBe(false);
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    beforeEach(() => {
      saveManager.init();
    });

    test('should surface descriptive error when storage unavailable during save', () => {
      const originalGlobalStorage = global.localStorage;
      // Simulate environment without localStorage
      delete global.localStorage;
      const managerWithoutStorage = new SaveManager(eventBus, {
        storage: null,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = managerWithoutStorage.saveGame('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SaveManager] Failed to save game:',
        expect.objectContaining({ message: 'Storage unavailable' })
      );

      consoleSpy.mockRestore();
      global.localStorage = originalGlobalStorage ?? localStorageMock;
    });

    test('should emit load_failed when storage unavailable during load', () => {
      const originalGlobalStorage = global.localStorage;
      delete global.localStorage;
      const managerWithoutStorage = new SaveManager(eventBus, {
        storage: null,
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const emitSpy = jest.spyOn(eventBus, 'emit');

      const result = managerWithoutStorage.loadGame('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SaveManager] Failed to load game:',
        expect.objectContaining({ message: 'Storage unavailable' })
      );
      expect(emitSpy).toHaveBeenCalledWith('game:load_failed', expect.objectContaining({
        slot: 'test_slot',
        error: 'Storage unavailable',
      }));

      consoleSpy.mockRestore();
      emitSpy.mockRestore();
      global.localStorage = originalGlobalStorage ?? localStorageMock;
    });

    test('should handle localStorage quota exceeded', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const result = saveManager.saveGame('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SaveManager] Failed to save game:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should not crash on save failure', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => saveManager.saveGame('test_slot')).not.toThrow();
    });

    test('should not crash on load failure', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => saveManager.loadGame('test_slot')).not.toThrow();
    });

    test('should log errors to console on save failure', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      saveManager.saveGame('test_slot');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SaveManager] Failed to save game:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should log errors to console on load failure', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Corrupt save data
      const saveKey = saveManager.config.storageKeyPrefix + 'test_slot';
      localStorageMock.store[saveKey] = 'corrupted{json';

      saveManager.loadGame('test_slot');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SaveManager] Failed to load game:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle manager serialize throwing error', () => {
      mockManagers.storyFlagManager.serialize.mockImplementation(() => {
        throw new Error('Serialize error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = saveManager.saveGame('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle manager deserialize throwing error', () => {
      saveManager.saveGame('test_slot');

      const loadManagers = {
        storyFlagManager: {
          deserialize: jest.fn(() => {
            throw new Error('Deserialize error');
          }),
        },
        questManager: { deserialize: jest.fn() },
        factionManager: { reputation: {} },
      };

      const loadSaveManager = new SaveManager(eventBus, loadManagers);
      loadSaveManager.init();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = loadSaveManager.loadGame('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle updateSaveMetadata error gracefully', () => {
      // Mock JSON.parse to throw
      const originalParse = JSON.parse;
      JSON.parse = jest.fn((text) => {
        if (text.includes('save_metadata')) {
          throw new Error('Parse error');
        }
        return originalParse(text);
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should still save successfully even if metadata update fails
      const result = saveManager.saveGame('test_slot');

      expect(result).toBe(true);

      JSON.parse = originalParse;
      consoleSpy.mockRestore();
    });

    test('should handle deleteSave error gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Override removeItem to throw an error
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = () => {
        throw new Error('Delete error');
      };

      const result = saveManager.deleteSave('test_slot');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SaveManager] Failed to delete save:'),
        expect.any(Error)
      );

      // Restore
      localStorageMock.removeItem = originalRemoveItem;
      consoleSpy.mockRestore();
    });
  });

  // ==================== UTILITY METHOD TESTS ====================

  describe('Utility Methods', () => {
    test('should calculate current playtime', () => {
      saveManager.gameStartTime = Date.now() - 5000; // 5 seconds ago

      const playtime = saveManager.getPlaytime();

      expect(playtime).toBeGreaterThanOrEqual(4900);
      expect(playtime).toBeLessThanOrEqual(5100);
    });

    test('should enable autosave', () => {
      saveManager.autosaveEnabled = false;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      saveManager.enableAutosave();

      expect(saveManager.autosaveEnabled).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('[SaveManager] Autosave enabled');

      consoleSpy.mockRestore();
    });

    test('should disable autosave', () => {
      saveManager.autosaveEnabled = true;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      saveManager.disableAutosave();

      expect(saveManager.autosaveEnabled).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[SaveManager] Autosave disabled');

      consoleSpy.mockRestore();
    });
  });

  // ==================== INSPECTOR SUMMARY TESTS ====================

  describe('Inspector Summary', () => {
    test('should return unavailable summary when worldStateStore missing', () => {
      saveManager.worldStateStore = null;

      const summary = saveManager.getInspectorSummary();

      expect(summary.source).toBe('unavailable');
      expect(summary.factions).toEqual({
        lastCascadeEvent: null,
        cascadeTargets: [],
        recentMemberRemovals: [],
      });
      expect(summary.tutorial).toEqual({
        latestSnapshot: null,
        snapshots: [],
        transcript: [],
      });
      expect(summary.engine).toEqual({
        spatialHash: null,
      });
      expect(summary.controlBindings).toEqual({
        source: 'unavailable',
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
          selectionBlocked: { numerator: 0, denominator: 0, value: 0, percentage: '0%' },
          pageNavigationBlocked: { numerator: 0, denominator: 0, value: 0, percentage: '0%' },
        },
      });
      expect(summary.districts).toEqual({
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
      });
      expect(summary.npcs).toEqual({
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
      });
      expect(summary.generatedAt).toEqual(expect.any(Number));
    });

    test('should surface selectors when worldStateStore available', () => {
      const cascadeSummary = {
        lastCascadeEvent: {
          sourceFactionId: 'cipher_collective',
          targetFactionId: 'wraith_network',
          occurredAt: 123456,
          newAttitude: 'neutral',
        },
        cascadeTargets: [
          {
            factionId: 'wraith_network',
            cascadeCount: 3,
            lastCascade: {
              sourceFactionId: 'cipher_collective',
              occurredAt: 123456,
              newAttitude: 'neutral',
            },
            sources: ['cipher_collective'],
          },
        ],
      };

      const tutorialSnapshots = [
        {
          event: 'step_completed',
          timestamp: 111,
          stepId: 'open_case_file',
          stepIndex: 1,
          totalSteps: 5,
          completedSteps: ['intro'],
          promptHistory: [],
        },
      ];

      const latestSnapshot = {
        event: 'tutorial_completed',
        timestamp: 222,
        stepId: 'finish',
        stepIndex: 4,
        totalSteps: 5,
        completedSteps: ['intro', 'open_case_file'],
        promptHistory: [],
      };

      const recentRemovals = [
        {
          factionId: 'cipher_collective',
          factionName: 'Cipher Collective',
          npcId: 'cipher_agent_alpha',
          entityId: 404,
          tag: 'npc',
          removedAt: 111,
        },
      ];
      const spatialSnapshot = {
        cellSize: 128,
        window: 120,
        sampleCount: 80,
        lastSample: {
          cellCount: 40,
          maxBucketSize: 3,
          trackedEntities: 42,
          timestamp: 111111,
        },
        aggregates: {
          cellCount: { average: 40.5, min: 35, max: 45 },
          maxBucketSize: { average: 2.5, min: 2, max: 4 },
          trackedEntities: { average: 41.5, min: 30, max: 52 },
        },
        stats: { insertions: 120, updates: 60, removals: 20 },
        history: [
          { cellCount: 38, maxBucketSize: 3, trackedEntities: 40, timestamp: 111100 },
          { cellCount: 39, maxBucketSize: 3, trackedEntities: 41, timestamp: 111105 },
          { cellCount: 40, maxBucketSize: 3, trackedEntities: 42, timestamp: 111111 },
        ],
        payloadBytes: 1024,
      };
      const controlBindingsSummary = {
        source: 'observation-log',
        totalEvents: 6,
        durationMs: 4200,
        durationLabel: '4.2s',
        firstEventAt: 1010,
        lastEventAt: 5210,
        actionsVisited: ['interact', 'quest', 'inventory'],
        actionsRemapped: ['inventory', 'quest'],
        listModesVisited: ['sections', 'conflicts'],
        pageRange: { min: 0, max: 3 },
        lastSelectedAction: 'inventory',
        metrics: {
          selectionMoves: 5,
          selectionBlocked: 1,
          listModeChanges: 2,
          listModeUnchanged: 0,
          pageNavigations: 2,
          pageNavigationBlocked: 1,
          pageSetChanges: 0,
          pageSetBlocked: 0,
          captureStarted: 1,
          captureCancelled: 1,
          bindingsApplied: 2,
          bindingsReset: 0,
          manualOverrideEvents: 0,
          captureCancelReasons: {
            cancelled_with_escape: 1,
            changed_mind: 1,
          },
        },
        dwell: {
          count: 2,
          totalMs: 2500,
          maxMs: 1800,
          minMs: 1200,
          lastMs: 1800,
          lastAction: 'inventory',
          longestAction: 'inventory',
        },
        ratios: {
          selectionBlocked: { numerator: 1, denominator: 6 },
          pageNavigationBlocked: { numerator: 1, denominator: 2 },
        },
      };
      const districtRoot = {
        byId: {},
        changeLog: [],
        lastUpdatedAt: 555,
      };
      const districtRecords = [
        {
          id: 'neon_districts',
          name: 'Neon Districts',
          tier: 'foundation',
          controllingFaction: { current: 'wraith_network' },
          stability: { rating: 'volatile', current: 32, lastChangedAt: 410 },
          access: {
            fastTravelEnabled: false,
            restrictions: [
              {
                id: 'lockdown_gate',
                type: 'lockdown',
                description: 'Security lockdown active',
                active: true,
                lastChangedAt: 333,
              },
            ],
            restrictionLog: [
              { restrictionId: 'lockdown_gate', active: true, timestamp: 333 },
            ],
          },
          infiltrationRoutes: [
            { id: 'route_north', unlocked: false },
            { id: 'route_south', unlocked: true },
          ],
          analytics: { lockdownsTriggered: 2, lastLockdownAt: 444 },
        },
      ];
      const npcRoot = {
        lastUpdatedAt: 777,
      };
      const npcSummaries = [
        {
          id: 'npc_echo',
          name: 'Echo Operative',
          factionId: 'wraith_network',
          status: 'alert',
          knowsPlayer: true,
          lastInteractionAt: 552,
          witnessedCrimes: 1,
          alert: { active: true, reason: 'security_breach', updatedAt: 557 },
          suspicion: { active: true, reason: 'trespassing', updatedAt: 556 },
        },
        {
          id: 'npc_scout',
          name: 'Perimeter Scout',
          factionId: 'cipher_collective',
          status: 'patrol',
          knowsPlayer: false,
          witnessedCrimes: 0,
          alert: { active: false },
          suspicion: { active: false },
        },
      ];

      const store = {
        select: jest.fn((selector) => {
          if (selector === factionSlice.selectors.selectFactionCascadeSummary) {
            return cascadeSummary;
          }
          if (selector === factionSlice.selectors.selectRecentMemberRemovals) {
            return recentRemovals;
          }
          if (selector === tutorialSlice.selectors.selectPromptHistorySnapshots) {
            return tutorialSnapshots;
          }
          if (selector === tutorialSlice.selectors.selectLatestPromptSnapshot) {
            return latestSnapshot;
          }
          if (selector === districtSlice.selectors.selectRoot) {
            return districtRoot;
          }
          if (selector === districtSlice.selectors.selectAllDistricts) {
            return districtRecords;
          }
          if (selector === npcSlice.selectors.selectRoot) {
            return npcRoot;
          }
          if (selector === npcSlice.selectors.selectNpcSummaries) {
            return npcSummaries;
          }
          return null;
        }),
      };

      mockManagers.worldStateStore = store;
      mockManagers.spatialMetricsProvider = jest.fn(() => spatialSnapshot);
      mockManagers.controlBindingsObservationProvider = jest.fn(() => controlBindingsSummary);
      saveManager = new SaveManager(eventBus, mockManagers);

      const summary = saveManager.getInspectorSummary();

      expect(summary.source).toBe('worldStateStore');
      expect(summary.factions).toEqual({
        ...cascadeSummary,
        recentMemberRemovals: recentRemovals,
      });
      expect(summary.tutorial.snapshots).toEqual(tutorialSnapshots);
      expect(summary.tutorial.latestSnapshot).toEqual(latestSnapshot);
      expect(summary.tutorial.transcript).toEqual([]);
      expect(summary.engine.spatialHash).toBe(spatialSnapshot);
      expect(summary.controlBindings).toEqual({
        source: 'observation-log',
        totalEvents: 6,
        durationMs: 4200,
        durationLabel: '4.2s',
        firstEventAt: 1010,
        lastEventAt: 5210,
        lastSelectedAction: 'inventory',
        actionsVisited: ['interact', 'quest', 'inventory'],
        actionsVisitedCount: 3,
        actionsRemapped: ['inventory', 'quest'],
        actionsRemappedCount: 2,
        listModesVisited: ['sections', 'conflicts'],
        pageRange: { min: 0, max: 3 },
        metrics: {
          selectionMoves: 5,
          selectionBlocked: 1,
          listModeChanges: 2,
          listModeUnchanged: 0,
          pageNavigations: 2,
          pageNavigationBlocked: 1,
          pageSetChanges: 0,
          pageSetBlocked: 0,
          captureStarted: 1,
          captureCancelled: 1,
          bindingsApplied: 2,
          bindingsReset: 0,
          manualOverrideEvents: 0,
        },
        captureCancelReasons: {
          cancelled_with_escape: 1,
          changed_mind: 1,
        },
        dwell: {
          count: 2,
          totalMs: 2500,
          averageMs: 1250,
          averageLabel: '1.3s',
          maxMs: 1800,
          maxLabel: '1.8s',
          minMs: 1200,
          minLabel: '1.2s',
          lastMs: 1800,
          lastLabel: '1.8s',
          lastAction: 'inventory',
          longestAction: 'inventory',
        },
        ratios: {
          selectionBlocked: { numerator: 1, denominator: 6, value: 0.167, percentage: '17%' },
          pageNavigationBlocked: { numerator: 1, denominator: 2, value: 0.5, percentage: '50%' },
        },
      });
      expect(summary.districts.metrics).toEqual(
        expect.objectContaining({
          total: 1,
          restricted: 1,
          fastTravelDisabled: 1,
          infiltrationLocked: 1,
          infiltrationUnlocked: 1,
          lockdownEvents: 2,
        })
      );
      expect(summary.districts.restrictedDistricts[0]).toEqual(
        expect.objectContaining({
          id: 'neon_districts',
          activeRestrictionCount: 1,
          fastTravelEnabled: false,
        })
      );
      expect(summary.districts.lastLockdownAt).toBe(444);
      expect(summary.npcs.metrics).toEqual(
        expect.objectContaining({
          total: 2,
          alerts: 1,
          suspicious: 1,
          knowsPlayer: 1,
          witnessedCrimes: 1,
        })
      );
      expect(summary.npcs.alerts[0]).toEqual(
        expect.objectContaining({ id: 'npc_echo', reason: 'security_breach' })
      );
      expect(summary.npcs.suspicious[0]).toEqual(
        expect.objectContaining({ id: 'npc_echo', reason: 'trespassing' })
      );
      expect(store.select).toHaveBeenCalledTimes(8);
      expect(mockManagers.spatialMetricsProvider).toHaveBeenCalledTimes(1);
      expect(mockManagers.controlBindingsObservationProvider).toHaveBeenCalledTimes(1);

      mockManagers.controlBindingsObservationProvider = null;
    });

    test('should include tutorial transcript when recorder provided', () => {
      const store = {
        select: jest.fn(() => []),
      };

      const transcriptRecorder = {
        getTranscript: jest.fn(() => [
          {
            event: 'tutorial_step_started',
            promptId: 'intro',
            promptText: 'Introduction',
            actionTaken: 'step_started',
            timestamp: 1000,
            metadata: { stepIndex: 0 },
          },
        ]),
      };

      mockManagers.worldStateStore = store;
      mockManagers.tutorialTranscriptRecorder = transcriptRecorder;
      saveManager = new SaveManager(eventBus, mockManagers);

      const summary = saveManager.getInspectorSummary();

      expect(transcriptRecorder.getTranscript).toHaveBeenCalled();
      expect(summary.tutorial.transcript).toHaveLength(1);
      expect(summary.tutorial.transcript[0]).toEqual(
        expect.objectContaining({ promptId: 'intro', sequence: 0 })
      );

      mockManagers.worldStateStore = null;
      mockManagers.tutorialTranscriptRecorder = null;
    });
  });

  // ==================== INSPECTOR EXPORT TESTS ====================

  describe('Inspector Export', () => {
    test('should build export artifacts and invoke writer callback', async () => {
      const cascadeSummary = {
        lastCascadeEvent: {
          targetFactionId: 'luminari_syndicate',
          targetFactionName: 'The Luminari Syndicate',
          sourceFactionId: 'vanguard_prime',
          sourceFactionName: 'Vanguard Prime',
          newAttitude: 'friendly',
          occurredAt: Date.UTC(2025, 9, 30, 17, 0, 0),
        },
        cascadeTargets: [
          {
            factionId: 'luminari_syndicate',
            cascadeCount: 3,
            lastCascade: {
              sourceFactionId: 'vanguard_prime',
              sourceFactionName: 'Vanguard Prime',
              newAttitude: 'friendly',
              occurredAt: Date.UTC(2025, 9, 30, 17, 0, 0),
            },
            sources: ['vanguard_prime'],
          },
        ],
      };

      const tutorialSnapshots = [
        {
          event: 'tutorial_completed',
          timestamp: Date.UTC(2025, 9, 30, 17, 5, 0),
          stepId: 'tutorial_complete',
          totalSteps: 4,
          completedSteps: ['intro'],
        },
      ];

      const store = {
        select: jest.fn((selector) => {
          if (selector === factionSlice.selectors.selectFactionCascadeSummary) {
            return cascadeSummary;
          }
          if (selector === tutorialSlice.selectors.selectPromptHistorySnapshots) {
            return tutorialSnapshots;
          }
          if (selector === tutorialSlice.selectors.selectLatestPromptSnapshot) {
            return tutorialSnapshots[0];
          }
          return null;
        }),
      };

      mockManagers.worldStateStore = store;
      mockManagers.spatialMetricsProvider = jest.fn(() => ({
        cellSize: '128',
        window: 120.6,
        sampleCount: '3',
        lastSample: {
          cellCount: '42',
          maxBucketSize: '4',
          trackedEntities: '40',
          timestamp: '1700000000000',
        },
        aggregates: {
          cellCount: { average: '41.2', min: '36', max: '45' },
          maxBucketSize: { average: '3.2', min: '2', max: '5' },
          trackedEntities: { average: '39.4', min: '30', max: '48' },
        },
        stats: { insertions: '120', updates: '60', removals: undefined },
        history: [
          { cellCount: '40', maxBucketSize: '3', trackedEntities: '38', timestamp: '1700000000000' },
          { cellCount: '41', maxBucketSize: '4', trackedEntities: '39', timestamp: '1700000001000' },
          { cellCount: '42', maxBucketSize: '4', trackedEntities: '40', timestamp: '1700000002000' },
        ],
        payloadBytes: null,
      }));
      saveManager = new SaveManager(eventBus, mockManagers);

      const writer = jest.fn().mockResolvedValue();
      const result = await saveManager.exportInspectorSummary({ writer, prefix: 'ci-artifact' });

      expect(result.summary.source).toBe('worldStateStore');
      expect(result.artifacts.length).toBe(3);
      expect(writer).toHaveBeenCalledTimes(3);
      expect(writer).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringContaining('ci-artifact'),
        }),
        expect.objectContaining({
          prefix: 'ci-artifact',
        })
      );
      expect(result.summary.engine.spatialHash).toEqual(
        expect.objectContaining({
          cellSize: 128,
          window: 120,
          sampleCount: 3,
          lastSample: expect.objectContaining({
            cellCount: 42,
            maxBucketSize: 4,
            trackedEntities: 40,
            timestamp: 1700000000000,
          }),
          aggregates: expect.objectContaining({
            cellCount: expect.objectContaining({ average: 41.2 }),
            maxBucketSize: expect.objectContaining({ average: 3.2 }),
            trackedEntities: expect.objectContaining({ average: 39.4 }),
          }),
          stats: expect.objectContaining({ insertions: 120, updates: 60 }),
          history: expect.arrayContaining([
            expect.objectContaining({ cellCount: 40 }),
            expect.objectContaining({ cellCount: 42 }),
          ]),
          payloadBytes: expect.any(Number),
          payloadBudgetBytes: expect.any(Number),
          payloadBudgetStatus: 'within_budget',
          payloadBudgetExceededBy: 0,
        })
      );

      const jsonArtifactCall = writer.mock.calls.find(
        ([artifact]) => artifact && artifact.type === 'json'
      );
      expect(jsonArtifactCall).toBeDefined();
      const jsonContent = jsonArtifactCall[0].content;
      const parsed = JSON.parse(jsonContent);
      expect(parsed.engine.spatialHash.window).toBe(120);
      expect(parsed.engine.spatialHash.history.length).toBe(3);
      expect(parsed.engine.spatialHash.history[0]).toEqual(
        expect.objectContaining({ cellCount: 40, maxBucketSize: 3 })
      );
      expect(parsed.engine.spatialHash.payloadBudgetStatus).toBe('within_budget');
    });

    test('emits budget status event when spatial telemetry exceeds budget', async () => {
      mockManagers.worldStateStore = {
        select: jest.fn(() => null),
      };

      const history = Array.from({ length: 256 }, (_, index) => ({
        cellCount: String(50 + (index % 7)),
        maxBucketSize: '6',
        trackedEntities: String(70 + (index % 5)),
        timestamp: String(1700002000000 + index * 12),
      }));

      mockManagers.spatialMetricsProvider = jest.fn(() => ({
        cellSize: '128',
        window: 256,
        sampleCount: String(history.length),
        lastSample: history[history.length - 1],
        aggregates: {},
        stats: {},
        history,
        payloadBytes: null,
      }));

      saveManager = new SaveManager(eventBus, mockManagers);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const eventSpy = jest.spyOn(eventBus, 'emit');

      const writer = jest.fn().mockResolvedValue();
      await saveManager.exportInspectorSummary({ writer });

      const budgetEvent = eventSpy.mock.calls.find(
        ([eventName]) => eventName === 'telemetry:export_budget_status'
      );

      expect(budgetEvent).toBeDefined();
      expect(budgetEvent[1]).toMatchObject({
        type: 'spatialHash',
        status: 'exceeds_budget',
        budgetBytes: expect.any(Number),
        exceededBy: expect.any(Number),
      });

      expect(warnSpy).toHaveBeenCalledWith(
        '[SaveManager] Inspector spatial telemetry payload exceeds budget',
        expect.objectContaining({
          payloadBytes: expect.any(Number),
          budgetBytes: expect.any(Number),
        })
      );

      warnSpy.mockRestore();
      eventSpy.mockRestore();
    });

    test('should continue when writer throws', async () => {
      mockManagers.worldStateStore = {
        select: jest.fn((selector) => {
          if (selector === factionSlice.selectors.selectFactionCascadeSummary) {
            return { lastCascadeEvent: null, cascadeTargets: [] };
          }
          if (selector === tutorialSlice.selectors.selectPromptHistorySnapshots) {
            return [];
          }
          if (selector === tutorialSlice.selectors.selectLatestPromptSnapshot) {
            return null;
          }
          return null;
        }),
      };

      saveManager = new SaveManager(eventBus, mockManagers);

      const writer = jest.fn().mockImplementation(() => {
        throw new Error('filesystem unavailable');
      });

      const eventSpy = jest.spyOn(eventBus, 'emit');

      const result = await saveManager.exportInspectorSummary({ writer });

      expect(result.artifacts.length).toBe(3);
      expect(writer).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        'telemetry:artifact_failed',
        expect.objectContaining({
          writerId: 'legacy-writer',
          filename: expect.any(String),
        })
      );
    });

    test('should delegate to telemetry adapter when writer not provided', async () => {
      const adapter = {
        writeArtifacts: jest.fn().mockResolvedValue({
          artifactsAttempted: 3,
          artifactsWritten: 3,
          failures: [],
          writerSummaries: [],
          durationMs: 1,
        }),
      };

      mockManagers.telemetryAdapter = adapter;
      saveManager = new SaveManager(eventBus, mockManagers);

      const eventSpy = jest.spyOn(eventBus, 'emit');
      const result = await saveManager.exportInspectorSummary({ prefix: 'adapter-test' });

      expect(adapter.writeArtifacts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ filename: expect.stringContaining('adapter-test') }),
        ]),
        expect.objectContaining({
          prefix: 'adapter-test',
        })
      );
      expect(result.metrics).toEqual(
        expect.objectContaining({
          artifactsAttempted: 3,
          artifactsWritten: 3,
        })
      );
      expect(eventSpy).toHaveBeenCalledWith(
        'telemetry:export_completed',
        expect.objectContaining({
          metrics: expect.objectContaining({ artifactsWritten: 3 }),
        })
      );
    });
  });

  // ==================== DATA COLLECTION TESTS ====================

  describe('Data Collection', () => {
    test('should collect story flags', () => {
      const flags = saveManager.collectStoryFlags();

      expect(flags).toEqual({ flags: { test_flag: true } });
      expect(mockManagers.storyFlagManager.serialize).toHaveBeenCalled();
    });

    test('should return empty object if no storyFlagManager', () => {
      saveManager.storyFlagManager = null;

      const flags = saveManager.collectStoryFlags();

      expect(flags).toEqual({});
    });

    test('should collect quest data', () => {
      const quests = saveManager.collectQuestData();

      expect(quests).toEqual({ quests: { test_quest: 'active' } });
      expect(mockManagers.questManager.serialize).toHaveBeenCalled();
    });

    test('should return empty object if no questManager', () => {
      saveManager.questManager = null;

      const quests = saveManager.collectQuestData();

      expect(quests).toEqual({});
    });

    test('should collect faction data', () => {
      const factions = saveManager.collectFactionData();

      expect(factions).toEqual({
        version: 1,
        reputation: { test_faction: 50 },
        timestamp: expect.any(Number),
      });
    });

    test('should return empty object if no factionManager', () => {
      saveManager.factionManager = null;

      const factions = saveManager.collectFactionData();

      expect(factions).toEqual({});
    });

    test('should collect tutorial data from localStorage', () => {
      // Set tutorial_completed using setItem (which stores as string)
      localStorageMock.setItem('tutorial_completed', 'true');

      const tutorialComplete = saveManager.collectTutorialData();

      expect(tutorialComplete).toBe(true);
    });

    test('should return false if tutorial not completed', () => {
      const tutorialComplete = saveManager.collectTutorialData();

      expect(tutorialComplete).toBe(false);
    });

    test('collectTutorialState should include skipped flag from storage', () => {
      localStorageMock.setItem('tutorial_completed', 'true');
      localStorageMock.setItem('tutorial_skipped', 'true');

      const tutorialState = saveManager.collectTutorialState();

      expect(tutorialState).toEqual({ completed: true, skipped: true });
    });

    test('collectTutorialState should default to false flags when storage missing', () => {
      const tutorialState = saveManager.collectTutorialState();

      expect(tutorialState).toEqual({ completed: false, skipped: false });
    });
  });

  // ==================== DATA RESTORATION TESTS ====================

  describe('Data Restoration', () => {
    test('should restore story flags', () => {
      const testData = { flags: { test: true } };

      saveManager.restoreStoryFlags(testData);

      expect(mockManagers.storyFlagManager.deserialize).toHaveBeenCalledWith(testData);
    });

    test('should handle null story flag data', () => {
      expect(() => saveManager.restoreStoryFlags(null)).not.toThrow();
    });

    test('should handle missing storyFlagManager', () => {
      saveManager.storyFlagManager = null;

      expect(() => saveManager.restoreStoryFlags({})).not.toThrow();
    });

    test('should restore quest data', () => {
      const testData = { quests: { test: 'active' } };

      saveManager.restoreQuestData(testData);

      expect(mockManagers.questManager.deserialize).toHaveBeenCalledWith(testData);
    });

    test('should handle null quest data', () => {
      expect(() => saveManager.restoreQuestData(null)).not.toThrow();
    });

    test('should restore faction data', () => {
      const testData = {
        reputation: { faction1: 100, faction2: -50 },
      };

      saveManager.restoreFactionData(testData);

      expect(mockManagers.factionManager.reputation).toEqual(testData.reputation);
    });

    test('should handle null faction data', () => {
      expect(() => saveManager.restoreFactionData(null)).not.toThrow();
    });

    test('should restore tutorial completion status', () => {
      saveManager.restoreTutorialData({ completed: true, skipped: false });

      const tutorialComplete = localStorageMock.getItem('tutorial_completed');
      expect(tutorialComplete).toBe('true');
      expect(localStorageMock.getItem('tutorial_skipped')).toBeNull();
    });

    test('should honor skipped flag and clear completion when false', () => {
      saveManager.restoreTutorialData({ completed: false, skipped: true });

      expect(localStorageMock.store['tutorial_completed']).toBeUndefined();
      expect(localStorageMock.getItem('tutorial_skipped')).toBe('true');

      saveManager.restoreTutorialData(false);
      expect(localStorageMock.store['tutorial_skipped']).toBeUndefined();
    });
  });
});
