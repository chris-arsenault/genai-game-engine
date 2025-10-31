import { SaveManager } from '../../../src/game/managers/SaveManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { buildSavePayloadSummary } from '../../../src/game/managers/savePayloadSummary.js';

function createMemoryStorage() {
  const backingStore = {};
  return {
    getItem: jest.fn((key) => (Object.prototype.hasOwnProperty.call(backingStore, key) ? backingStore[key] : null)),
    setItem: jest.fn((key, value) => {
      backingStore[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete backingStore[key];
    }),
    hasKey(key) {
      return Object.prototype.hasOwnProperty.call(backingStore, key);
    },
  };
}

describe('buildSavePayloadSummary', () => {
  test('summarizes key save payload sections and cleans up slot', () => {
    const storage = createMemoryStorage();
    const worldStateSnapshot = {
      storyFlags: { intro_complete: true },
      quests: { active: [{ id: 'q1' }], completed: [{ id: 'q0' }] },
      factions: { reputation: { kestrel: { fame: 10, infamy: 0 } }, timestamp: 42 },
      tutorialComplete: true,
      tutorial: { completed: true, totalSteps: 8, currentStep: null },
      inventory: {
        items: [
          { id: 'item_a', quantity: 1, rarity: 'common' },
          { id: 'item_b', quantity: 2, rarity: 'rare' },
        ],
        equipped: { primary: 'item_a' },
        lastUpdatedAt: 99,
      },
      dialogue: {
        transcriptEnabled: true,
        historyByNpc: { npc_a: [{ line: 'hello' }] },
        completedByNpc: {},
      },
      district: {
        byId: {
          district_a: { id: 'district_a' },
          district_b: { id: 'district_b' },
        },
      },
      npc: {
        byId: {
          npc_a: { id: 'npc_a' },
          npc_b: { id: 'npc_b' },
          npc_c: { id: 'npc_c' },
        },
      },
    };

    const saveManager = new SaveManager(new EventBus(), {
      storyFlagManager: {
        serialize: () => ({ flags: { intro_complete: true } }),
        deserialize: () => {},
      },
      questManager: {
        serialize: () => ({ quests: { active: ['q1'] } }),
        deserialize: () => {},
      },
      factionManager: { reputation: { kestrel: { fame: 10, infamy: 0 } } },
      tutorialSystem: {
        getProgress: () => ({ totalSteps: 8 }),
        isComplete: () => true,
        completeTutorial: () => {},
      },
      worldStateStore: {
        snapshot: () => ({ ...worldStateSnapshot }),
        hydrate: () => {},
      },
      storage,
    });

    saveManager.init();

    const summary = buildSavePayloadSummary(saveManager, { slotName: 'summary-test' });

    expect(summary.slot).toBe('summary-test');
    expect(summary.sections.inventory.itemCount).toBe(2);
    expect(summary.sections.district.count).toBe(2);
    expect(summary.sections.npc.count).toBe(3);
    expect(summary.sections.factions.factionIds).toContain('kestrel');
    expect(summary.sections.tutorial.completed).toBe(true);

    const storageKey = `${saveManager.config.storageKeyPrefix}summary-test`;
    expect(storage.hasKey(storageKey)).toBe(false);
  });
});
