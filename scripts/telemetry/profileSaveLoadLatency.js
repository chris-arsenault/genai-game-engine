#!/usr/bin/env node

/**
 * Profiles SaveManager save/load latency using representative world state
 * snapshots. Outputs JSON with summary metrics plus raw samples so QA and
 * telemetry teams can confirm the <2s load-time acceptance criterion.
 */

import { SaveManager } from '../../src/game/managers/SaveManager.js';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { profileSaveLoadLatency, summarizeProfile } from '../../src/game/managers/saveLoadProfiling.js';

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

function buildRepresentativeWorldSnapshot() {
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
          lastLockdownAt: Date.now() - index * 1000,
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
          updatedAt: Date.now() - index * 500,
        },
        alert: {
          active: index % 5 === 0,
          reason: index % 5 === 0 ? 'security_breach' : null,
          updatedAt: Date.now() - index * 700,
        },
        lastInteractionAt: Date.now() - index * 400,
        history: [
          {
            type: index % 5 === 0 ? 'alerted' : 'conversation',
            timestamp: Date.now() - index * 1000,
          },
        ],
        tags: index % 2 === 0 ? ['resistance'] : ['syndicate'],
      },
    ])
  );

  return {
    storyFlags: {
      investigation_started: true,
      faction_contacted: ['kestrel_alliance', 'wraith_network'],
      lastDecisionBranch: 'district-crossroads',
    },
    quests: {
      active: [
        { id: 'q_root', title: 'Neon Sparks', stage: 'investigate' },
        { id: 'q_faction_intro', title: 'Shadow Negotiations', stage: 'parley' },
      ],
      completed: [{ id: 'q_tutorial', title: 'First Steps', stage: 'complete' }],
    },
    factions: {
      reputation: {
        kestrel_alliance: { fame: 45, infamy: 5 },
        wraith_network: { fame: 20, infamy: 60 },
      },
      timestamp: Date.now(),
    },
    tutorialComplete: true,
    tutorial: {
      completed: true,
      completedSteps: ['move', 'interact', 'save'],
      skipped: false,
      totalSteps: 12,
      currentStep: null,
      currentStepIndex: -1,
      lastActionAt: Date.now() - 5000,
    },
    inventory: {
      items: heavyInventory,
      equipped: {
        primaryWeapon: 'item_1',
        secondaryWeapon: 'item_5',
        armor: 'item_10',
      },
      lastUpdatedAt: Date.now(),
    },
    district: {
      byId: districts,
      changeLog: [],
      lastUpdatedAt: Date.now(),
    },
    npc: {
      byId: npcs,
      lastUpdatedAt: Date.now(),
    },
  };
}

function buildSaveManager() {
  const eventBus = new EventBus();
  const storage = new MemoryStorage();

  const worldStateSnapshot = buildRepresentativeWorldSnapshot();
  const worldStateStore = {
    snapshot: () => ({ ...worldStateSnapshot }),
    hydrate: () => {},
  };

  const storyFlagManager = {
    serialize: () => ({ flags: { investigation_started: true } }),
    deserialize: () => {},
  };

  const questManager = {
    serialize: () => ({
      quests: { active: ['q_root'], completed: ['q_tutorial'] },
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
    getProgress: () => ({ totalSteps: 12, currentStep: 'investigate' }),
    isComplete: () => true,
    completeTutorial: () => {},
  };

  const saveManager = new SaveManager(eventBus, {
    storyFlagManager,
    questManager,
    factionManager,
    tutorialSystem,
    worldStateStore,
    storage,
  });

  saveManager.init();
  return saveManager;
}

function main() {
  const iterations = Number.parseInt(process.argv[2] ?? '5', 10);
  const saveManager = buildSaveManager();
  const profile = profileSaveLoadLatency(saveManager, {
    iterations: Number.isFinite(iterations) && iterations > 0 ? iterations : 5,
    slotName: 'profiling-latency',
  });

  const output = {
    summary: summarizeProfile(profile),
    samples: profile.samples,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main();
