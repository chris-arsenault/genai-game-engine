/**
 * Prototype benchmarks comparing centralized state store approaches.
 *
 * Scenario modeled after The Memory Syndicate requirements:
 * - 120 quests with nested objectives
 * - 240 story flags with metadata
 * - 12 factions with reputation bands
 * - Snapshot + query executed once per frame
 *
 * Usage: node benchmarks/state-store-prototype.js
 */

import { performance } from 'node:perf_hooks';

/**
 * Utility: run a function N times and return aggregate timing.
 * @param {Function} fn
 * @param {number} iterations
 * @returns {{total:number, mean:number, min:number, max:number}}
 */
function timeIterations(fn, iterations) {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn(i);
    const elapsed = performance.now() - start;
    total += elapsed;
    if (elapsed < min) min = elapsed;
    if (elapsed > max) max = elapsed;
  }

  return {
    total,
    mean: total / iterations,
    min,
    max,
  };
}

/**
 * Create synthetic quest data.
 */
function createQuestData(count = 120) {
  const quests = {};
  for (let i = 0; i < count; i++) {
    quests[`quest_${i.toString().padStart(3, '0')}`] = {
      status: 'pending',
      objectives: Array.from({ length: 3 }, (_, idx) => ({
        id: `quest_${i}_obj_${idx}`,
        status: idx === 0 ? 'active' : 'locked',
      })),
      metadata: {
        priority: (i % 3) + 1,
        faction: ['faction_resistance', 'faction_syndicate', 'faction_police'][i % 3],
      },
    };
  }
  return quests;
}

/**
 * Create synthetic story flag data.
 */
function createStoryFlags(count = 240) {
  const flags = {};
  for (let i = 0; i < count; i++) {
    flags[`flag_${i.toString().padStart(3, '0')}`] = {
      value: i % 2 === 0,
      timestamp: Date.now() - i * 1000,
      metadata: { act: i % 3, chapter: i % 5 },
    };
  }
  return flags;
}

/**
 * Create synthetic faction data.
 */
function createFactionData(count = 12) {
  const factions = {};
  for (let i = 0; i < count; i++) {
    factions[`faction_${i.toString().padStart(2, '0')}`] = {
      reputation: Math.floor(Math.random() * 200) - 100,
      attitude: ['hostile', 'neutral', 'ally'][i % 3],
      lastChange: Date.now() - i * 5000,
    };
  }
  return factions;
}

/**
 * Prototype 1: Redux-style immutable store.
 */
function runReduxStyleBenchmark() {
  let state = {
    quests: createQuestData(),
    storyFlags: createStoryFlags(),
    factions: createFactionData(),
  };

  function dispatch(action) {
    switch (action.type) {
      case 'QUEST_UPDATE': {
        const { questId, status } = action.payload;
        const quest = state.quests[questId];
        if (!quest) return;

        state = {
          ...state,
          quests: {
            ...state.quests,
            [questId]: {
              ...quest,
              status,
              updatedAt: performance.now(),
            },
          },
        };
        break;
      }
      case 'FLAG_SET': {
        const { flagId, value } = action.payload;
        const flag = state.storyFlags[flagId];

        state = {
          ...state,
          storyFlags: {
            ...state.storyFlags,
            [flagId]: {
              value,
              timestamp: Date.now(),
              metadata: flag ? flag.metadata : {},
            },
          },
        };
        break;
      }
      case 'FACTION_REPUTATION': {
        const { factionId, delta } = action.payload;
        const faction = state.factions[factionId];
        if (!faction) return;

        const newRep = Math.max(-100, Math.min(100, faction.reputation + delta));

        state = {
          ...state,
          factions: {
            ...state.factions,
            [factionId]: {
              ...faction,
              reputation: newRep,
              attitude: newRep > 25 ? 'ally' : newRep < -25 ? 'hostile' : 'neutral',
              lastChange: Date.now(),
            },
          },
        };
        break;
      }
      default:
        break;
    }
  }

  const updateIterations = 500;
  const updateTiming = timeIterations((i) => {
    dispatch({
      type: i % 3 === 0 ? 'QUEST_UPDATE' : i % 3 === 1 ? 'FLAG_SET' : 'FACTION_REPUTATION',
      payload:
        i % 3 === 0
          ? {
              questId: `quest_${(i % 120).toString().padStart(3, '0')}`,
              status: i % 2 === 0 ? 'completed' : 'active',
            }
          : i % 3 === 1
          ? {
              flagId: `flag_${(i % 240).toString().padStart(3, '0')}`,
              value: i % 2 === 0,
            }
          : {
              factionId: `faction_${(i % 12).toString().padStart(2, '0')}`,
              delta: (i % 5) - 2,
            },
    });
  }, updateIterations);

  const queryIterations = 200;
  const queryTiming = timeIterations(() => {
    // Simulate selector building derived view
    const activeQuests = Object.values(state.quests).filter((q) => q.status === 'active');
    const criticalFlags = Object.entries(state.storyFlags)
      .filter(([key]) => key.includes('flag_00'))
      .map(([key, data]) => ({ id: key, value: data.value }));
    const factionOverview = Object.entries(state.factions).map(([id, data]) => ({
      id,
      reputation: data.reputation,
      attitude: data.attitude,
    }));

    return {
      activeQuests,
      criticalFlags,
      factionOverview,
    };
  }, queryIterations);

  const snapshotTiming = timeIterations(() => {
    JSON.stringify(state);
  }, 50);

  const serialized = JSON.stringify(state);

  return {
    approach: 'Redux-style immutable store',
    updateTiming,
    queryTiming,
    snapshotTiming,
    stateBytes: Buffer.byteLength(serialized),
  };
}

/**
 * Prototype 2: ECS-integrated world state.
 * Stores data inside component registries and reconstructs view on demand.
 */
function runEcsIntegratedBenchmark() {
  const questComponent = new Map(); // entityId -> quest data
  const questStateIndex = new Map(); // questId -> entityId
  const flagComponent = new Map(); // entityId -> flag data
  const flagIndex = new Map();
  const factionComponent = new Map();
  const factionIndex = new Map();

  // Seed components
  let nextEntityId = 1;
  const addQuest = (questId, questData) => {
    const entityId = nextEntityId++;
    questComponent.set(entityId, { questId, ...questData });
    questStateIndex.set(questId, entityId);
  };

  const addFlag = (flagId, flagData) => {
    const entityId = nextEntityId++;
    flagComponent.set(entityId, { flagId, ...flagData });
    flagIndex.set(flagId, entityId);
  };

  const addFaction = (factionId, factionData) => {
    const entityId = nextEntityId++;
    factionComponent.set(entityId, { factionId, ...factionData });
    factionIndex.set(factionId, entityId);
  };

  const quests = createQuestData();
  Object.entries(quests).forEach(([questId, data]) => addQuest(questId, data));

  const flags = createStoryFlags();
  Object.entries(flags).forEach(([flagId, data]) => addFlag(flagId, data));

  const factions = createFactionData();
  Object.entries(factions).forEach(([factionId, data]) => addFaction(factionId, data));

  const updateIterations = 500;
  const updateTiming = timeIterations((i) => {
    if (i % 3 === 0) {
      const questId = `quest_${(i % 120).toString().padStart(3, '0')}`;
      const entityId = questStateIndex.get(questId);
      if (entityId) {
        const quest = questComponent.get(entityId);
        quest.status = i % 2 === 0 ? 'completed' : 'active';
        quest.updatedAt = performance.now();
      }
    } else if (i % 3 === 1) {
      const flagId = `flag_${(i % 240).toString().padStart(3, '0')}`;
      const entityId = flagIndex.get(flagId);
      if (entityId) {
        const flag = flagComponent.get(entityId);
        flag.value = i % 2 === 0;
        flag.timestamp = Date.now();
      }
    } else {
      const factionId = `faction_${(i % 12).toString().padStart(2, '0')}`;
      const entityId = factionIndex.get(factionId);
      if (entityId) {
        const faction = factionComponent.get(entityId);
        const newRep = Math.max(-100, Math.min(100, faction.reputation + ((i % 5) - 2)));
        faction.reputation = newRep;
        faction.attitude = newRep > 25 ? 'ally' : newRep < -25 ? 'hostile' : 'neutral';
        faction.lastChange = Date.now();
      }
    }
  }, updateIterations);

  const queryIterations = 200;
  const queryTiming = timeIterations(() => {
    const activeQuests = [];
    for (const data of questComponent.values()) {
      if (data.status === 'active') {
        activeQuests.push({
          questId: data.questId,
          status: data.status,
          nextObjective: data.objectives?.find((obj) => obj.status === 'active')?.id ?? null,
        });
      }
    }

    const criticalFlags = [];
    for (const data of flagComponent.values()) {
      if (data.flagId.includes('flag_00')) {
        criticalFlags.push({ id: data.flagId, value: data.value });
      }
    }

    const factionOverview = [];
    for (const data of factionComponent.values()) {
      factionOverview.push({
        id: data.factionId,
        reputation: data.reputation,
        attitude: data.attitude,
      });
    }

    return {
      activeQuests,
      criticalFlags,
      factionOverview,
    };
  }, queryIterations);

  const snapshotTiming = timeIterations(() => {
    const state = {
      quests: Array.from(questComponent.values()),
      flags: Array.from(flagComponent.values()),
      factions: Array.from(factionComponent.values()),
    };
    JSON.stringify(state);
  }, 50);

  const serialized = JSON.stringify({
    quests: Array.from(questComponent.values()),
    flags: Array.from(flagComponent.values()),
    factions: Array.from(factionComponent.values()),
  });

  return {
    approach: 'ECS-integrated world state',
    updateTiming,
    queryTiming,
    snapshotTiming,
    stateBytes: Buffer.byteLength(serialized),
  };
}

function formatTiming(label, timing) {
  return `${label}: mean=${timing.mean.toFixed(4)}ms (min=${timing.min.toFixed(
    4
  )}ms, max=${timing.max.toFixed(4)}ms, total=${timing.total.toFixed(2)}ms)`;
}

function runBenchmarks() {
  const reduxResult = runReduxStyleBenchmark();
  const ecsResult = runEcsIntegratedBenchmark();

  const results = [reduxResult, ecsResult];

  for (const result of results) {
    console.log(`\n=== ${result.approach} ===`);
    console.log(formatTiming('Update ×500', result.updateTiming));
    console.log(formatTiming('Query ×200', result.queryTiming));
    console.log(formatTiming('Snapshot ×50', result.snapshotTiming));
    console.log(`Serialized size: ${(result.stateBytes / 1024).toFixed(2)} KB`);
  }

  const summary = {
    timestamp: new Date().toISOString(),
    iterations: {
      updates: 500,
      queries: 200,
      snapshots: 50,
    },
    results,
  };

  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = runBenchmarks();
  console.log('\nBenchmark summary JSON:\n', JSON.stringify(summary, null, 2));
}

export { runBenchmarks };
