import { GameConfig } from '../../config/GameConfig.js';

function getZenithInfiltrationConfig() {
  const config = GameConfig?.narrative?.act3?.zenithInfiltration;
  if (!config) {
    throw new Error(
      '[Act3ZenithInfiltrationQuest] Missing GameConfig.narrative.act3.zenithInfiltration configuration'
    );
  }
  if (!config.questId) {
    throw new Error('[Act3ZenithInfiltrationQuest] Configuration requires questId');
  }
  return config;
}

function normaliseRequirements(requirements) {
  if (!requirements || typeof requirements !== 'object') {
    return null;
  }

  const result = {};

  if (Array.isArray(requirements.storyFlags)) {
    const filtered = requirements.storyFlags
      .filter((flag) => typeof flag === 'string' && flag.trim().length > 0);
    if (filtered.length > 0) {
      result.storyFlags = filtered;
    }
  }

  if (Array.isArray(requirements.notStoryFlags)) {
    const filtered = requirements.notStoryFlags
      .filter((flag) => typeof flag === 'string' && flag.trim().length > 0);
    if (filtered.length > 0) {
      result.notStoryFlags = filtered;
    }
  }

  if (Array.isArray(requirements.knowledgeIds)) {
    const filtered = requirements.knowledgeIds
      .filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (filtered.length > 0) {
      result.knowledgeIds = filtered;
    }
  }

  if (Array.isArray(requirements.worldFlags)) {
    const filtered = requirements.worldFlags
      .filter((flag) => typeof flag === 'string' && flag.trim().length > 0);
    if (filtered.length > 0) {
      result.worldFlags = filtered;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function buildStageObjective(stage, questConfig, stance = null) {
  if (!stage || typeof stage !== 'object') {
    return null;
  }

  const objectiveId = stage.objectiveId;
  const description = stage.description;
  if (typeof objectiveId !== 'string' || objectiveId.trim().length === 0) {
    throw new Error('[Act3ZenithInfiltrationQuest] Stage missing objectiveId');
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new Error('[Act3ZenithInfiltrationQuest] Stage missing description');
  }

  const stageId = stage.stageId ?? objectiveId;
  const branchId = stage.branchId || stance?.id || 'shared';
  const requirements = normaliseRequirements(stage.requirements);
  const metadata = {
    areaId: stage.areaId ?? null,
    telemetryTag: stage.telemetryTag ?? null,
    successFlag: stage.successFlag ?? null,
    stageId,
    branchId,
    stanceId: stance?.id ?? null,
    approachId: stance?.approachId ?? null,
  };

  if (Array.isArray(stage.storyFlags)) {
    metadata.storyFlags = stage.storyFlags;
  }
  if (Array.isArray(stage.worldFlags)) {
    metadata.worldFlags = stage.worldFlags;
  }

  return {
    id: objectiveId,
    description,
    trigger: {
      event: questConfig.stageEvent ?? 'act3:zenith_infiltration:stage',
      questId: questConfig.questId,
      branchId,
      stageId,
      objectiveId,
    },
    optional: Boolean(stage.optional),
    hidden: stage.hidden != null ? Boolean(stage.hidden) : false,
    requirements: requirements ?? undefined,
    metadata,
  };
}

function buildSharedObjectives(config) {
  const sharedStages = Array.isArray(config.sharedStages) ? config.sharedStages : [];
  const objectives = [];
  for (const stage of sharedStages) {
    const objective = buildStageObjective(stage, config, null);
    if (objective) {
      // Shared objectives should not be hidden.
      objective.hidden = false;
      objectives.push(objective);
    }
  }
  return objectives;
}

function buildStanceObjectives(config) {
  const stances = Array.isArray(config.stances) ? config.stances : [];
  const objectives = [];
  for (const stance of stances) {
    const stages = Array.isArray(stance.stages) ? stance.stages : [];
    for (const stage of stages) {
      const objective = buildStageObjective(
        {
          ...stage,
          branchId: stage.branchId || stance.id,
        },
        config,
        stance
      );
      if (objective) {
        objectives.push(objective);
      }
    }
  }
  return objectives;
}

function buildQuestBranches(config) {
  const stances = Array.isArray(config.stances) ? config.stances : [];
  const branches = [];
  for (const stance of stances) {
    if (!stance || typeof stance !== 'object') {
      continue;
    }
    const stanceFlag = typeof stance.stanceFlag === 'string' ? stance.stanceFlag : null;
    if (!stanceFlag) {
      continue;
    }

    const nextQuestId = config.nextQuestId || 'main-act3-archive-heart';
    branches.push({
      condition: {
        storyFlags: [stanceFlag],
      },
      nextQuest: nextQuestId,
      metadata: {
        stanceId: stance.id ?? null,
        approachId: stance.approachId ?? null,
        worldFlags: Array.isArray(stance.worldFlags) ? stance.worldFlags : [],
      },
    });
  }
  return branches;
}

export function buildAct3ZenithInfiltrationQuestDefinition() {
  const config = getZenithInfiltrationConfig();
  const sharedObjectives = buildSharedObjectives(config);
  const stanceObjectives = buildStanceObjectives(config);

  const objectives = [...sharedObjectives, ...stanceObjectives];

  const quest = {
    id: config.questId,
    title: 'Zenith Sector Infiltration',
    type: 'main',
    act: 'act3',
    description:
      'Infiltrate the Zenith Sector and secure a path to the Archive using the assets gathered for your chosen stance.',
    autoStart: false,
    prerequisites: config.prerequisites || {
      storyFlags: ['act3_gathering_support_complete'],
    },
    objectives,
    rewards: config.rewards || {
      storyFlags: ['act3_zenith_infiltration_complete'],
      knowledgeIds: ['act3_zenith_sector_mapping'],
    },
    branches: buildQuestBranches(config),
    metadata: {
      stageEvent: config.stageEvent ?? 'act3:zenith_infiltration:stage',
      telemetryTag: config.telemetryTag ?? null,
    },
  };

  return quest;
}

export const QUEST_ACT3_ZENITH_INFILTRATION = buildAct3ZenithInfiltrationQuestDefinition();

export function registerAct3ZenithInfiltrationQuest(questManager) {
  if (!questManager || typeof questManager.registerQuest !== 'function') {
    throw new Error('[Act3ZenithInfiltrationQuest] QuestManager instance required');
  }

  const definition = buildAct3ZenithInfiltrationQuestDefinition();
  const nextQuestId = definition.branches?.[0]?.nextQuest || 'main-act3-archive-heart';

  if (definition.branches && definition.branches.length > 0) {
    definition.branches = definition.branches.map((branch) => {
      if (!branch) {
        return branch;
      }
      const candidateNextQuest = branch.nextQuest || nextQuestId;
      const questExists =
        typeof candidateNextQuest === 'string' && questManager?.quests?.has(candidateNextQuest) === true;
      return {
        ...branch,
        nextQuest: questExists ? candidateNextQuest : null,
      };
    });
  }

  questManager.registerQuest(definition);
  return definition;
}

export function getZenithInfiltrationStageDefinitions() {
  const config = getZenithInfiltrationConfig();
  const sharedStages = Array.isArray(config.sharedStages) ? config.sharedStages : [];
  const stances = Array.isArray(config.stances) ? config.stances : [];

  const stanceStages = [];
  for (const stance of stances) {
    const stages = Array.isArray(stance.stages) ? stance.stages : [];
    stanceStages.push({
      stanceId: stance.id,
      stanceFlag: stance.stanceFlag ?? null,
      worldFlags: Array.isArray(stance.worldFlags) ? stance.worldFlags : [],
      approachId: stance.approachId ?? null,
      stages,
    });
  }

  return {
    questId: config.questId,
    stageEvent: config.stageEvent ?? 'act3:zenith_infiltration:stage',
    sharedStages,
    stanceStages,
  };
}
