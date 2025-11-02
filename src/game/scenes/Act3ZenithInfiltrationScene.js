import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';
import { getZenithInfiltrationStageDefinitions } from '../data/quests/act3ZenithInfiltrationQuest.js';
import { NarrativeActs } from '../data/narrative/NarrativeBeatCatalog.js';

const SCENE_ID = 'act3_zenith_infiltration';
const DEFAULT_SPAWN_POINT = Object.freeze({ x: 192, y: 536 });

const STAGE_LAYOUTS = Object.freeze({
  shared_sector_entry: {
    x: 200,
    y: 520,
    radius: 148,
    color: '#49d4ff',
    alpha: 0.28,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Penetrate Zenith Sector security cordon.',
  },
  shared_tower_ascent: {
    x: 412,
    y: 356,
    radius: 134,
    color: '#6d7bff',
    alpha: 0.26,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Navigate the Zenith government towers.',
  },
  shared_archive_elevator: {
    x: 664,
    y: 232,
    radius: 126,
    color: '#ffb347',
    alpha: 0.28,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Secure the hidden Archive access elevator.',
  },
  opposition_disable_grid: {
    x: 268,
    y: 472,
    radius: 118,
    color: '#3cd4a7',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Deploy municipal override codes to sever Zenith grid.',
  },
  opposition_calibrate_dampeners: {
    x: 348,
    y: 332,
    radius: 118,
    color: '#3d9eff',
    alpha: 0.22,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Calibrate stealth dampeners with Dr. Chen.',
  },
  opposition_resistance_diversion: {
    x: 524,
    y: 300,
    radius: 118,
    color: '#5e60ff',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Coordinate Soren\'s diversion teams.',
  },
  support_overclock_relays: {
    x: 296,
    y: 424,
    radius: 118,
    color: '#ff6f61',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Overclock Zenith broadcast relays.',
  },
  support_stage_response: {
    x: 460,
    y: 380,
    radius: 120,
    color: '#ff9f40',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Stage trauma-response teams.',
  },
  support_calibrate_dampeners: {
    x: 620,
    y: 300,
    radius: 116,
    color: '#ffd166',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Synchronise neural dampeners.',
  },
  alternative_dossier_upload: {
    x: 324,
    y: 404,
    radius: 120,
    color: '#8e83ff',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Upload the curated Archive dossier.',
  },
  alternative_forum_security: {
    x: 488,
    y: 344,
    radius: 118,
    color: '#b483ff',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Secure coalition oversight in executive forum.',
  },
  alternative_beacons_sync: {
    x: 648,
    y: 268,
    radius: 118,
    color: '#e083ff',
    alpha: 0.26,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Synchronise disclosure beacons.',
  },
  default: {
    x: 256,
    y: 256,
    radius: 120,
    color: '#5d9bef',
    alpha: 0.22,
    layer: 'ground_fx',
    zIndex: 2,
    prompt: 'Advance Act 3 objective.',
  },
});

let cachedDefinitions = null;

function buildTriggerDefinitions() {
  const stageConfig = getZenithInfiltrationStageDefinitions();
  const definitions = [];
  const stageEvent = stageConfig.stageEvent ?? 'act3:zenith_infiltration:stage';
  const questId = stageConfig.questId;

  for (const stage of stageConfig.sharedStages ?? []) {
    const layout = STAGE_LAYOUTS[stage.stageId] || STAGE_LAYOUTS.default;
    definitions.push(createDefinitionFromStage(stage, {
      questId,
      stageEvent,
      branchId: stage.branchId || 'shared',
      stanceId: null,
      approachId: null,
      stanceFlag: null,
      layout,
    }));
  }

  for (const stanceEntry of stageConfig.stanceStages ?? []) {
    const stanceId = stanceEntry.stanceId ?? null;
    const stanceFlag = stanceEntry.stanceFlag ?? null;
    const approachId = stanceEntry.approachId ?? null;
    for (const stage of stanceEntry.stages ?? []) {
      const layout = STAGE_LAYOUTS[stage.stageId] || STAGE_LAYOUTS.default;
      definitions.push(createDefinitionFromStage(stage, {
        questId,
        stageEvent,
        branchId: stage.branchId || stanceId || 'shared',
        stanceId,
        approachId,
        stanceFlag,
        layout,
      }));
    }
  }

  return definitions;
}

function createDefinitionFromStage(stage, context) {
  const id = stage.areaId || stage.objectiveId;
  const description = stage.description || context.layout?.prompt || 'Advance objective.';
  const radius = context.layout?.radius ?? 120;
  const telemetryTag = stage.telemetryTag ?? null;
  const successFlag = stage.successFlag ?? null;

  return {
    id,
    questId: context.questId,
    objectiveId: stage.objectiveId,
    areaId: stage.areaId || id,
    radius,
    once: true,
    prompt: context.layout?.prompt || description,
    triggerType: 'quest_area',
    metadata: {
      emitEvent: context.stageEvent,
      emitEventPayload: {
        branchId: context.branchId,
        stanceId: context.stanceId,
        stanceFlag: context.stanceFlag ?? null,
        approachId: context.approachId,
        stageId: stage.stageId ?? stage.objectiveId,
        successFlag,
      },
      branchId: context.branchId,
      stanceId: context.stanceId,
      approachId: context.approachId,
      stageId: stage.stageId ?? stage.objectiveId,
      successFlag,
      telemetryTag,
      narrativeBeat: stage.narrativeBeat ?? null,
      storyFlags: Array.isArray(stage.storyFlags) ? [...stage.storyFlags] : undefined,
      worldFlags: Array.isArray(stage.worldFlags) ? [...stage.worldFlags] : undefined,
    },
  };
}

function getTriggerDefinitions() {
  if (!cachedDefinitions) {
    cachedDefinitions = buildTriggerDefinitions();
  }
  return cachedDefinitions;
}

export function ensureZenithTriggerDefinitions(registry = QuestTriggerRegistry) {
  const definitions = getTriggerDefinitions();
  if (!registry || typeof registry.registerDefinition !== 'function') {
    return definitions;
  }
  for (const definition of definitions) {
    if (!registry.getTriggerDefinition(definition.id)) {
      registry.registerDefinition(definition);
    }
  }
  return definitions;
}

function createTriggerEntity(entityManager, componentRegistry, toolkit, definition) {
  const layout = STAGE_LAYOUTS[definition.metadata?.stageId] || STAGE_LAYOUTS.default;
  const entityId = entityManager.createEntity();
  const x = layout?.x ?? 0;
  const y = layout?.y ?? 0;
  const radius = layout?.radius ?? definition.radius ?? 120;

  componentRegistry.addComponent(
    entityId,
    'Transform',
    new Transform({ x, y })
  );

  componentRegistry.addComponent(
    entityId,
    'Sprite',
    new Sprite({
      width: radius * 2,
      height: radius * 2,
      layer: layout?.layer ?? 'ground_fx',
      zIndex: layout?.zIndex ?? 1,
      alpha: layout?.alpha ?? 0.24,
      color: layout?.color ?? '#5d9bef',
    })
  );

  const registeredDefinition = {
    ...definition,
    radius,
    prompt: definition.prompt || layout?.prompt || null,
  };

  toolkit.createQuestTrigger(entityId, registeredDefinition);

  return entityId;
}

export async function loadAct3ZenithInfiltrationScene(
  entityManager,
  componentRegistry,
  eventBus,
  options = {}
) {
  const stageDefinitions = getZenithInfiltrationStageDefinitions();
  const definitions = ensureZenithTriggerDefinitions();
  const questTriggerToolkit = new TriggerMigrationToolkit(componentRegistry, eventBus);

  const sceneEntities = [];
  for (const definition of definitions) {
    sceneEntities.push(
      createTriggerEntity(entityManager, componentRegistry, questTriggerToolkit, definition)
    );
  }

  const spawnPoint = {
    x: options.spawnPoint?.x ?? DEFAULT_SPAWN_POINT.x,
    y: options.spawnPoint?.y ?? DEFAULT_SPAWN_POINT.y,
  };

  const narrativeBeats = {};
  for (const definition of definitions) {
    const stageId = definition.metadata?.stageId;
    const beatId = definition.metadata?.narrativeBeat;
    if (stageId && beatId) {
      narrativeBeats[stageId] = beatId;
    }
  }

  const cleanup = () => {
    for (const entityId of sceneEntities) {
      if (entityManager && typeof entityManager.hasEntity === 'function' && entityManager.hasEntity(entityId)) {
        entityManager.destroyEntity(entityId);
      }
    }
  };

  return {
    sceneName: SCENE_ID,
    sceneEntities,
    spawnPoint,
    cleanup,
    metadata: {
      triggerCount: definitions.length,
      stageEvent: stageDefinitions.stageEvent,
      questId: stageDefinitions.questId,
      narrative: {
        act: NarrativeActs.ACT3,
        questId: stageDefinitions.questId,
        beats: narrativeBeats,
      },
      narrativeBeats,
    },
  };
}

ensureZenithTriggerDefinitions();
export const ACT3_ZENITH_TRIGGER_DEFINITIONS = getTriggerDefinitions();
