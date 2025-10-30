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
import { EventBus } from '../src/engine/events/EventBus.js';
import { WorldStateStore } from '../src/game/state/WorldStateStore.js';
import { questSlice } from '../src/game/state/slices/questSlice.js';
import { storySlice } from '../src/game/state/slices/storySlice.js';
import { factionSlice } from '../src/game/state/slices/factionSlice.js';
import { tutorialSlice } from '../src/game/state/slices/tutorialSlice.js';
import { dialogueSlice } from '../src/game/state/slices/dialogueSlice.js';

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
 * Create snapshot payload compatible with WorldStateStore.hydrate().
 */
function createWorldStateSeed() {
  const questsRaw = createQuestData();
  const storyFlagsRaw = createStoryFlags();
  const factionsRaw = createFactionData();
  const now = Date.now();

  const questSnapshot = {
    byId: {},
    activeIds: [],
    completedIds: [],
    failedIds: [],
  };

  let questIndex = 0;
  for (const [questId, questData] of Object.entries(questsRaw)) {
    const statusCycle = questIndex % 3;
    const status = statusCycle === 0 ? 'active' : statusCycle === 1 ? 'completed' : 'not_started';

    questSnapshot.byId[questId] = {
      id: questId,
      title: `Quest ${questId}`,
      type: ['main', 'side', 'faction'][questIndex % 3],
      status,
      objectives: questData.objectives.reduce((acc, objective, idx) => {
        acc[objective.id] = {
          id: objective.id,
          status:
            status === 'completed'
              ? 'completed'
              : idx === 0
              ? 'in_progress'
              : 'pending',
          progress: status === 'completed' ? 1 : idx === 0 ? 0 : 0,
          target: 1,
        };
        return acc;
      }, {}),
    };

    if (status === 'active') questSnapshot.activeIds.push(questId);
    if (status === 'completed') questSnapshot.completedIds.push(questId);

    questIndex++;
  }

  const storyFlags = {
    flags: Object.fromEntries(
      Object.entries(storyFlagsRaw).map(([flagId, data]) => [
        flagId,
        {
          value: data.value,
          metadata: data.metadata,
          updatedAt: data.timestamp,
        },
      ])
    ),
  };

  const factions = {
    byId: Object.fromEntries(
      Object.entries(factionsRaw).map(([factionId, data], index) => {
        const fame = Math.max(0, 100 + data.reputation);
        const infamy = Math.max(0, 100 - data.reputation);
        const changeTimestamp = now - index * 2500;
        const lastAttitudeChange = {
          factionId,
          factionName: `Faction ${factionId}`,
          newAttitude: data.attitude,
          oldAttitude: data.attitude === 'hostile' ? 'neutral' : 'friendly',
          cascade: false,
          sourceFactionId: null,
          sourceFactionName: null,
          occurredAt: changeTimestamp,
        };
        return [
          factionId,
          {
            id: factionId,
            fame,
            infamy,
            attitude: data.attitude,
            lastReason: 'benchmark_seed',
            updatedAt: changeTimestamp,
            lastDelta: { fame: 0, infamy: 0 },
            lastAttitudeChange,
            attitudeHistory: [lastAttitudeChange],
            lastCascade: null,
            cascadeCount: 0,
            cascadeSources: [],
          },
        ];
      })
    ),
    lastCascadeEvent: null,
  };

  const dialogue = {
    active: null,
    historyByNpc: {
      npc_alpha: [
        {
          type: 'node',
          dialogueId: 'dlg_intro',
          nodeId: 'intro_0',
          speaker: 'Alpha',
          text: 'Benchmark welcome.',
          timestamp: Date.now(),
        },
      ],
    },
    completedByNpc: {},
    transcriptEnabled: true,
    historyLimit: 10,
  };

  return {
    storyFlags,
    quests: questSnapshot,
    factions,
    tutorial: {
      completed: false,
      completedSteps: [],
      skipped: false,
      totalSteps: 5,
      promptHistory: [],
      promptHistoryLimit: 5,
      promptHistorySnapshots: [],
      promptHistorySnapshotLimit: 10,
      currentPrompt: null,
      currentStep: null,
      currentStepIndex: -1,
    },
    tutorialComplete: false,
    dialogue,
  };
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

/**
 * Prototype 3: Actual WorldStateStore implementation (hybrid event-sourced).
 */
function runWorldStateStoreBenchmark() {
  const eventBus = new EventBus();
  const store = new WorldStateStore(eventBus, {
    enableDebug: false,
    tutorialPromptSnapshotLimit: 12,
  });
  store.init();

  const seed = createWorldStateSeed();
  store.hydrate(seed);

  const updateIterations = 500;
  const updateTiming = timeIterations((i) => {
    const step = i % 6;

    if (step === 0) {
      const questId = `quest_${(i % 120).toString().padStart(3, '0')}`;
      store.dispatch({
        type: 'OBJECTIVE_PROGRESS',
        domain: 'quest',
        payload: {
          questId,
          objectiveId: `${questId}_obj_0`,
          progress: 1,
          target: 1,
        },
      });
    } else if (step === 1) {
      const flagId = `flag_${(i % 240).toString().padStart(3, '0')}`;
      store.dispatch({
        type: 'STORY_FLAG_SET',
        domain: 'story',
        payload: {
          flagId,
          value: i % 2 === 0,
        },
      });
    } else if (step === 2) {
      const factionId = `faction_${(i % 12).toString().padStart(2, '0')}`;
      store.dispatch({
        type: 'FACTION_REPUTATION_CHANGED',
        domain: 'faction',
        payload: {
          factionId,
          newFame: 40 + (i % 20),
          newInfamy: 20 + (i % 10),
          deltaFame: 1,
          deltaInfamy: -1,
        },
      });
    } else if (step === 3) {
      const factionId = `faction_${(i % 12).toString().padStart(2, '0')}`;
      const sourceFactionId = `faction_${((i + 5) % 12).toString().padStart(2, '0')}`;
      const cascade = i % 2 === 0;
      store.dispatch({
        type: 'FACTION_ATTITUDE_CHANGED',
        domain: 'faction',
        payload: {
          factionId,
          factionName: `Faction ${factionId}`,
          newAttitude: ['hostile', 'unfriendly', 'neutral', 'friendly', 'allied'][i % 5],
          oldAttitude: ['neutral', 'hostile', 'friendly', 'neutral', 'unfriendly'][i % 5],
          cascade,
          source: cascade ? sourceFactionId : null,
          sourceFactionName: cascade ? `Faction ${sourceFactionId}` : null,
        },
      });

      if (i % 60 === 0) {
        store.dispatch({
          type: 'FACTION_REPUTATION_RESET',
          domain: 'faction',
          payload: {
            reason: 'benchmark_reset',
            initiatedBy: 'benchmark_harness',
          },
        });
      }
    } else if (step === 4) {
      const stepId = `step_${i % 5}`;
      const stepIndex = i % 5;
      store.dispatch({
        type: 'TUTORIAL_STEP_STARTED',
        domain: 'tutorial',
        payload: {
          stepId,
          stepIndex,
          totalSteps: 5,
          title: `Benchmark Step ${stepIndex + 1}`,
          description: 'Synthetic tutorial prompt for benchmark',
          highlight: { type: 'entity', entityId: `entity_${stepIndex}` },
          canSkip: stepIndex % 2 === 0,
        },
      });
      store.dispatch({
        type: 'TUTORIAL_STEP_COMPLETED',
        domain: 'tutorial',
        payload: {
          stepId,
          stepIndex,
        },
      });
    } else {
      const npcId = `npc_${i % 7}`;
      const dialogueId = `dlg_${i % 10}`;
      const nodeId = `node_${i % 4}`;

      store.dispatch({
        type: 'DIALOGUE_STARTED',
        domain: 'dialogue',
        payload: {
          npcId,
          dialogueId,
          nodeId,
          speaker: `NPC ${npcId}`,
          text: `Benchmark line ${i}`,
          choices: [{ id: 'choice_a', text: 'Affirmative', nextNode: `node_${(i + 1) % 4}` }],
          canAdvance: true,
          hasChoices: true,
        },
      });

      if (i % 2 === 0) {
        store.dispatch({
          type: 'DIALOGUE_NODE_CHANGED',
          domain: 'dialogue',
          payload: {
            npcId,
            dialogueId,
            nodeId: `node_${(i + 1) % 4}`,
            speaker: `NPC ${npcId}`,
            text: `Follow-up line ${i}`,
            choices: [],
            canAdvance: i % 3 === 0,
            hasChoices: false,
          },
        });
      }

      store.dispatch({
        type: 'DIALOGUE_CHOICE_MADE',
        domain: 'dialogue',
        payload: {
          npcId,
          dialogueId,
          nodeId,
          choiceId: 'choice_a',
          choiceText: 'Affirmative',
        },
      });

      if (i % 3 === 0) {
        store.dispatch({
          type: 'DIALOGUE_COMPLETED',
          domain: 'dialogue',
          payload: {
            npcId,
            dialogueId,
            nodeId: `node_${(i + 1) % 4}`,
            choiceId: 'choice_a',
          },
        });
      }
    }
  }, updateIterations);

  const queryIterations = 200;
  const queryTiming = timeIterations(() => {
    const activeQuests = store.select(questSlice.selectors.selectActiveQuests);
    const currentAct = store.select(storySlice.selectors.selectCurrentAct);
    const factionOverview = store.select(factionSlice.selectors.selectFactionOverview);
    const factionCascadeSummary = store.select(factionSlice.selectors.selectFactionCascadeSummary);
    const tutorialProgress = store.select(tutorialSlice.selectors.selectTutorialProgress);
    const tutorialSnapshots = store.select(tutorialSlice.selectors.selectPromptHistorySnapshots);
    const latestPromptSnapshot = store.select(tutorialSlice.selectors.selectLatestPromptSnapshot);
    const dialogueActive = store.select(dialogueSlice.selectors.selectActiveDialogue);
    const dialogueTranscript = store.select(
      dialogueSlice.selectors.selectDialogueTranscript,
      dialogueActive?.npcId ?? 'npc_0'
    );

    return {
      activeQuests,
      currentAct,
      factionOverview,
      factionCascadeSummary,
      tutorialProgress,
      tutorialSnapshots,
      latestPromptSnapshot,
      dialogueActive,
      dialogueTranscript,
    };
  }, queryIterations);

  const snapshotTiming = timeIterations(() => {
    JSON.stringify(store.snapshot());
  }, 50);

  const serialized = JSON.stringify(store.snapshot());

  store.destroy();

  const dispatchThreshold = 0.25;
  const dispatchThresholdMet = updateTiming.mean <= dispatchThreshold;

  return {
    approach: 'WorldStateStore (hybrid event-sourced)',
    updateTiming,
    queryTiming,
    snapshotTiming,
    stateBytes: Buffer.byteLength(serialized),
    dispatchThreshold,
    dispatchThresholdMet,
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
  const worldStateResult = runWorldStateStoreBenchmark();

  const results = [reduxResult, ecsResult, worldStateResult];

  for (const result of results) {
    console.log(`\n=== ${result.approach} ===`);
    console.log(formatTiming('Update ×500', result.updateTiming));
    console.log(formatTiming('Query ×200', result.queryTiming));
    console.log(formatTiming('Snapshot ×50', result.snapshotTiming));
    console.log(`Serialized size: ${(result.stateBytes / 1024).toFixed(2)} KB`);
    if (typeof result.dispatchThreshold === 'number') {
      const status = result.dispatchThresholdMet ? 'PASS' : 'FAIL';
      console.log(
        `Dispatch latency ${result.updateTiming.mean.toFixed(4)}ms (threshold ${result.dispatchThreshold.toFixed(
          2
        )}ms): ${status}`
      );
    }
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
