import { SaveManager } from '../../../src/game/managers/SaveManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

function buildProfilingWorldSnapshot() {
  const now = Date.now();

  const heavyInventory = Array.from({ length: 120 }, (_, index) => ({
    id: `item_${index}`,
    quantity: 1 + (index % 5),
    rarity: index % 2 === 0 ? 'rare' : 'common',
    metadata: {
      crafted: index % 3 === 0,
      durability: 100 - index,
      originDistrict: index % 4 === 0 ? 'crossroads' : 'industrial',
    },
  }));

  const districtIds = Array.from({ length: 14 }, (_, index) => `district_${index}`);
  const districts = Object.fromEntries(
    districtIds.map((districtId, index) => [
      districtId,
      {
        id: districtId,
        name: `District ${index}`,
        tier: index % 3 === 0 ? 'critical' : 'support',
        access: {
          defaultUnlocked: index < 3,
          fastTravelEnabled: index % 2 === 0,
          unlockedRoutes: [],
          restrictions: [],
          restrictionLog: [],
        },
        analytics: {
          lastLockdownAt: now - index * 1000,
        },
      },
    ])
  );

  const npcIds = Array.from({ length: 60 }, (_, index) => `npc_${index}`);
  const npcs = Object.fromEntries(
    npcIds.map((npcId, index) => [
      npcId,
      {
        id: npcId,
        name: `NPC ${index}`,
        factionId: index % 2 === 0 ? 'wraith_network' : 'kestrel_alliance',
        status: index % 5 === 0 ? 'alert' : 'idle',
        knowsPlayer: index % 4 === 0,
        interactions: {
          interviews: index % 3,
          recognitions: index % 2,
          witnessedCrimes: index % 5 === 0 ? 1 : 0,
        },
        suspicion: {
          active: index % 5 === 0,
          reason: index % 5 === 0 ? 'security_breach' : null,
          updatedAt: now - index * 500,
        },
        alert: {
          active: index % 5 === 0,
          reason: index % 5 === 0 ? 'security_breach' : null,
          updatedAt: now - index * 700,
        },
        lastInteractionAt: now - index * 400,
        history: [
          {
            type: index % 5 === 0 ? 'alerted' : 'conversation',
            timestamp: now - index * 1000,
          },
        ],
        tags: index % 2 === 0 ? ['resistance'] : ['syndicate'],
      },
    ])
  );

  return {
    storyFlags: {
      investigation_started: {
        value: true,
        metadata: { act: 'act1' },
        timestamp: now,
      },
      neural_sync_unlocked: {
        value: false,
        metadata: {},
        timestamp: now,
      },
    },
    quests: {
      activeIds: ['q_root', 'q_faction_intro'],
      completedIds: ['q_tutorial'],
      failedIds: [],
      byId: {
        q_root: {
          id: 'q_root',
          title: 'Neon Sparks',
          status: 'active',
        },
        q_faction_intro: {
          id: 'q_faction_intro',
          title: 'Shadow Negotiations',
          status: 'active',
        },
        q_tutorial: {
          id: 'q_tutorial',
          title: 'First Steps',
          status: 'completed',
        },
      },
      npcAvailability: {},
      npcAvailabilityHistory: [],
    },
    factions: {
      byId: {
        kestrel_alliance: {
          id: 'kestrel_alliance',
          fame: 45,
          infamy: 5,
          attitude: 'ally',
        },
        wraith_network: {
          id: 'wraith_network',
          fame: 20,
          infamy: 60,
          attitude: 'neutral',
        },
      },
      lastActionAt: now,
      lastResetAt: null,
      lastResetReason: null,
      lastResetInitiatedBy: null,
      lastCascadeEvent: null,
      recentMemberRemovals: [],
    },
    tutorialComplete: true,
    tutorial: {
      completed: true,
      completedSteps: 12,
      skipped: false,
      totalSteps: 12,
      currentStep: null,
      currentStepIndex: -1,
      lastActionAt: now - 5000,
    },
    inventory: {
      items: heavyInventory,
      equipped: {
        primaryWeapon: 'item_1',
        secondaryWeapon: 'item_5',
        armor: 'item_10',
      },
      lastUpdatedAt: now,
    },
    district: {
      byId: districts,
      changeLog: [],
      lastUpdatedAt: now,
    },
    npc: {
      byId: npcs,
      lastUpdatedAt: now,
    },
  };
}

function buildSummaryWorldSnapshot() {
  const now = Date.now();
  return {
    storyFlags: {
      investigation_started: { value: true, metadata: {}, timestamp: now },
      tutorial_completed: { value: true, metadata: {}, timestamp: now },
    },
    quests: {
      activeIds: ['q_root'],
      completedIds: ['q_tutorial'],
      failedIds: [],
      byId: {
        q_root: {
          id: 'q_root',
          title: 'Neon Sparks',
          status: 'active',
        },
        q_tutorial: {
          id: 'q_tutorial',
          title: 'First Steps',
          status: 'completed',
        },
      },
      npcAvailability: {},
      npcAvailabilityHistory: [],
    },
    factions: {
      byId: {
        kestrel_alliance: {
          id: 'kestrel_alliance',
          fame: 40,
          infamy: 5,
          attitude: 'ally',
        },
        wraith_network: {
          id: 'wraith_network',
          fame: 20,
          infamy: 55,
          attitude: 'neutral',
        },
      },
      lastActionAt: now,
      lastResetAt: null,
      lastResetReason: null,
      lastResetInitiatedBy: null,
      lastCascadeEvent: null,
      recentMemberRemovals: [],
    },
    tutorialComplete: true,
    tutorial: {
      completed: true,
      totalSteps: 12,
      completedSteps: 12,
      skipped: false,
      currentStep: null,
      currentStepIndex: -1,
      lastActionAt: now - 1000,
    },
    inventory: {
      items: [
        { id: 'item_core', quantity: 1, rarity: 'legendary' },
        { id: 'item_datapad', quantity: 1, rarity: 'story' },
      ],
      equipped: { primaryWeapon: 'item_core', tool: 'item_datapad' },
      lastUpdatedAt: now,
    },
    dialogue: null,
    district: {
      byId: {
        neon_crossroads: { id: 'neon_crossroads', tier: 'critical' },
        undercity_sewage: { id: 'undercity_sewage', tier: 'support' },
      },
    },
    npc: {
      byId: {
        npc_echo: { id: 'npc_echo', factionId: 'wraith_network' },
        npc_brackish: { id: 'npc_brackish', factionId: 'kestrel_alliance' },
      },
    },
  };
}

function buildSaveManagerFromSnapshot(snapshot, extras) {
  const eventBus = new EventBus();
  const storage = new MemoryStorage();

  const worldStateStore = {
    snapshot: () => ({ ...snapshot }),
    hydrate: () => {},
  };

  const saveManager = new SaveManager(eventBus, {
    storyFlagManager: extras.storyFlagManager,
    questManager: extras.questManager,
    factionManager: extras.factionManager,
    tutorialSystem: extras.tutorialSystem,
    worldStateStore,
    storage,
  });

  saveManager.init();
  return saveManager;
}

export function buildProfilingSaveManager() {
  const snapshot = buildProfilingWorldSnapshot();

  const storyFlagManager = {
    serialize: () => ({
      investigation_started: {
        value: true,
        timestamp: Date.now(),
        metadata: { act: 'act1' },
      },
      neural_sync_unlocked: {
        value: false,
        timestamp: Date.now(),
        metadata: {},
      },
    }),
    deserialize: () => {},
  };

  const questManager = {
    serialize: () => ({
      activeQuests: ['q_root', 'q_faction_intro'],
      completedQuests: ['q_tutorial'],
      failedQuests: [],
      objectiveProgress: [],
    }),
    deserialize: () => {},
  };

  const factionManager = {
    reputation: {
      kestrel_alliance: { fame: 45, infamy: 5 },
      wraith_network: { fame: 20, infamy: 60 },
    },
  };

  const tutorialSystem = {
    getProgress: () => ({
      totalSteps: 12,
      currentStep: 'investigate',
      completedSteps: 12,
      currentStepIndex: 11,
    }),
    isComplete: () => true,
    completeTutorial: () => {},
    skipped: false,
  };

  return buildSaveManagerFromSnapshot(snapshot, {
    storyFlagManager,
    questManager,
    factionManager,
    tutorialSystem,
  });
}

export function buildSummarySaveManager() {
  const snapshot = buildSummaryWorldSnapshot();

  const storyFlagManager = {
    serialize: () => ({
      investigation_started: {
        value: true,
        timestamp: Date.now(),
        metadata: {},
      },
      tutorial_completed: {
        value: true,
        timestamp: Date.now(),
        metadata: {},
      },
    }),
    deserialize: () => {},
  };

  const questManager = {
    serialize: () => ({
      activeQuests: ['q_root'],
      completedQuests: ['q_tutorial'],
      failedQuests: [],
      objectiveProgress: [],
    }),
    deserialize: () => {},
  };

  const factionManager = {
    reputation: {
      kestrel_alliance: { fame: 40, infamy: 5 },
      wraith_network: { fame: 20, infamy: 55 },
    },
  };

  const tutorialSystem = {
    getProgress: () => ({
      totalSteps: 12,
      currentStep: null,
      completedSteps: 12,
      currentStepIndex: 11,
    }),
    isComplete: () => true,
    completeTutorial: () => {},
    skipped: false,
  };

  return buildSaveManagerFromSnapshot(snapshot, {
    storyFlagManager,
    questManager,
    factionManager,
    tutorialSystem,
  });
}

export { MemoryStorage };
