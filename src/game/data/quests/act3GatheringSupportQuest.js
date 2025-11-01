import { GameConfig } from '../../config/GameConfig.js';

function getGatheringSupportConfig() {
  const config = GameConfig?.narrative?.act3?.gatheringSupport;
  if (!config) {
    throw new Error('[Act3GatheringSupportQuest] Missing GameConfig.narrative.act3.gatheringSupport configuration');
  }
  return config;
}

function buildStanceObjectives(config) {
  const objectives = [];
  for (const stance of config.stances ?? []) {
    const milestones = Array.isArray(stance.milestones) ? stance.milestones : [];
    for (const milestone of milestones) {
      objectives.push({
        id: milestone.objectiveId,
        description: milestone.description,
        trigger: {
          event: config.milestoneEvent,
          branchId: stance.id,
          milestoneId: milestone.milestoneId,
          objectiveId: milestone.objectiveId,
        },
        optional: false,
        metadata: {
          stanceId: stance.id,
          npcId: milestone.npcId ?? null,
          telemetryTag: milestone.telemetryTag ?? null,
          milestoneId: milestone.milestoneId,
        },
      });
    }
  }
  return objectives;
}

function buildSharedObjectives(config) {
  const objectives = [];
  const visit = config.shared?.visitDmitri;
  if (visit && visit.objectiveId && visit.areaId) {
    objectives.push({
      id: visit.objectiveId,
      description: visit.description ?? 'Pay respects to Dmitri in the hospice wing.',
      trigger: {
        event: 'area:entered',
        areaId: visit.areaId,
      },
      optional: false,
      metadata: {
        telemetryTag: visit.telemetryTag ?? null,
      },
    });
  }

  const prepare = config.shared?.prepareLoadout;
  if (prepare && prepare.objectiveId && prepare.milestoneId) {
    objectives.push({
      id: prepare.objectiveId,
      description: prepare.description ?? 'Coordinate with Zara to lock gear for the Archive breach.',
      trigger: {
        event: config.milestoneEvent,
        branchId: prepare.branchId ?? 'shared',
        milestoneId: prepare.milestoneId,
        objectiveId: prepare.objectiveId,
      },
      optional: false,
      metadata: {
        telemetryTag: prepare.telemetryTag ?? null,
        milestoneId: prepare.milestoneId,
      },
    });
  }
  return objectives;
}

export function buildAct3GatheringSupportQuestDefinition() {
  const config = getGatheringSupportConfig();

  const baseObjectives = [
    {
      id: 'obj_commit_act3_stance',
      description: 'Commit to a stance for confronting Dr. Morrow’s Archive broadcast.',
      trigger: {
        event: config.stanceEvent,
        questId: config.questId,
      },
      optional: false,
      metadata: {
        telemetryTag: config.telemetryTag ?? 'act3_stance_commit',
      },
    },
  ];

  const objectives = [
    ...baseObjectives,
    ...buildStanceObjectives(config),
    ...buildSharedObjectives(config),
  ];

  const branches = (config.stances ?? []).map((stance) => ({
    condition: {
      storyFlags: Array.isArray(stance.worldFlags) && stance.worldFlags.length > 0
        ? [stance.worldFlags[0]]
        : [stance.stanceFlag],
    },
    nextQuest: null,
    metadata: {
      stanceId: stance.id,
    },
  }));

  return {
    id: config.questId,
    title: 'Gathering Support',
    type: 'main',
    act: 'act3',
    description:
      'Secure allies, resources, and failsafes aligned with your chosen stance before infiltrating the Archive.',
    autoStart: false,
    prerequisites: {
      storyFlags: [config.stanceFlag],
    },
    objectives,
    rewards: {
      storyFlags: ['act3_gathering_support_complete'],
      knowledgeIds: ['act3_support_network_locked_in'],
    },
    branches,
    metadata: {
      stanceEvent: config.stanceEvent,
      milestoneEvent: config.milestoneEvent,
    },
  };
}

export const QUEST_ACT3_GATHERING_SUPPORT = buildAct3GatheringSupportQuestDefinition();

/**
 * Register the Act 3 Gathering Support quest with the QuestManager.
 * @param {import('../../managers/QuestManager.js').QuestManager} questManager
 */
export function registerAct3GatheringSupportQuest(questManager) {
  if (!questManager || typeof questManager.registerQuest !== 'function') {
    throw new Error('[Act3GatheringSupportQuest] QuestManager instance required');
  }

  const definition = buildAct3GatheringSupportQuestDefinition();
  const nextQuestId = 'main-act3-zenith-infiltration';
  definition.branches = (definition.branches ?? []).map((branch) => {
    const questExists =
      typeof nextQuestId === 'string' &&
      questManager?.quests?.has(nextQuestId) === true;
    return {
      ...branch,
      nextQuest: questExists ? nextQuestId : null,
    };
  });

  questManager.registerQuest(definition);
  return definition;
}
