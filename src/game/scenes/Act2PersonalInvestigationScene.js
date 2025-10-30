/**
 * Act2PersonalInvestigationScene
 *
 * Establishes the personal investigation branch interior for Act 2. Mirrors the
 * other branch scenes by wiring TriggerMigrationToolkit quest rings, navigation
 * mesh metadata, and authored geometry so player analytics and narrative systems
 * receive consistent payloads when the player pursues Kira's backstory thread.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';

const SCENE_ID = 'act2_personal_archive';
const DEFAULT_QUEST_ID = 'main-act2-personal-investigation';
const DEFAULT_SPAWN_POINT = Object.freeze({ x: 240, y: 540 });

export const ACT2_PERSONAL_TRIGGER_IDS = Object.freeze({
  ENTRY: 'act2_personal_archive_entry',
  CASEFILES: 'act2_personal_casefile_review',
  MEMORY_VAULT: 'act2_personal_memory_vault',
  PROJECTION_LAB: 'act2_personal_projection_lab',
  BROADCAST_TERMINAL: 'act2_personal_broadcast_terminal',
});

const TRIGGER_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: ACT2_PERSONAL_TRIGGER_IDS.ENTRY,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_access_personal_archive',
    areaId: 'personal_archive_entry',
    radius: 132,
    once: true,
    prompt: 'Unlock the sealed precinct archive.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_personal_archive_entry',
      moodHint: 'haunted',
      telemetryTag: 'act2_personal_archive_entry',
    },
  }),
  Object.freeze({
    id: ACT2_PERSONAL_TRIGGER_IDS.CASEFILES,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_reconstruct_cold_cases',
    areaId: 'personal_casefile_review',
    radius: 118,
    once: false,
    prompt: 'Review the disputed case files.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_personal_casefile_reckoning',
      unlocksMechanic: 'memory_threads',
      telemetryTag: 'act2_personal_casefile_review',
    },
  }),
  Object.freeze({
    id: ACT2_PERSONAL_TRIGGER_IDS.MEMORY_VAULT,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_unlock_memory_vault',
    areaId: 'personal_memory_vault',
    radius: 122,
    once: true,
    prompt: 'Access the sealed memory vault for hidden testimony.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_personal_memory_vault_unlocked',
      unlocksMechanic: 'testimony_projection',
      telemetryTag: 'act2_personal_memory_vault',
    },
  }),
  Object.freeze({
    id: ACT2_PERSONAL_TRIGGER_IDS.PROJECTION_LAB,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_decode_projection_logs',
    areaId: 'personal_projection_lab',
    radius: 114,
    once: true,
    prompt: 'Decode the vault projections to expose the conspiracy timeline.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_personal_projection_analysis',
      unlocksMechanic: 'knowledge_ledger',
      telemetryTag: 'act2_personal_projection_lab',
    },
  }),
  Object.freeze({
    id: ACT2_PERSONAL_TRIGGER_IDS.BROADCAST_TERMINAL,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_schedule_public_exposure',
    areaId: 'personal_broadcast_terminal',
    radius: 110,
    once: true,
    prompt: 'Schedule the shadow broadcast to leak testimony.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_personal_broadcast_commitment',
      unlocksMechanic: 'network_signal',
      telemetryTag: 'act2_personal_broadcast_terminal',
    },
  }),
]);

const FLOOR_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'personal_archive_entry_hall',
    x: 60,
    y: 360,
    width: 560,
    height: 320,
    color: '#1b1f2c',
    alpha: 0.95,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'personal_casefile_dais',
    x: 440,
    y: 240,
    width: 320,
    height: 210,
    color: '#232c3d',
    alpha: 0.9,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'personal_memory_vault_platform',
    x: 660,
    y: 160,
    width: 220,
    height: 200,
    color: '#2b3f52',
    alpha: 0.88,
    layer: 'ground_fx',
    zIndex: 1,
  }),
  Object.freeze({
    id: 'personal_projection_lab_platform',
    x: 560,
    y: 200,
    width: 260,
    height: 150,
    color: '#314a63',
    alpha: 0.88,
    layer: 'ground_fx',
    zIndex: 1,
  }),
  Object.freeze({
    id: 'personal_broadcast_platform',
    x: 320,
    y: 200,
    width: 200,
    height: 140,
    color: '#354860',
    alpha: 0.9,
    layer: 'ground_fx',
    zIndex: 1,
  }),
]);

const BOUNDARY_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'personal_wall_west',
    x: 40,
    y: 140,
    width: 24,
    height: 460,
    color: '#10131c',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'personal_wall_north',
    x: 40,
    y: 140,
    width: 820,
    height: 24,
    color: '#10131c',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'personal_wall_south',
    x: 40,
    y: 580,
    width: 780,
    height: 24,
    color: '#10131c',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'personal_wall_east',
    x: 820,
    y: 140,
    width: 24,
    height: 440,
    color: '#10131c',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'personal_glass_partition',
    x: 420,
    y: 240,
    width: 18,
    height: 240,
    color: '#2a3c52',
    alpha: 0.58,
    layer: 'environment_fx',
    zIndex: 5,
  }),
]);

const NAVIGATION_TEMPLATE = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({
      id: 'archive_entry',
      position: Object.freeze({ x: 260, y: 540 }),
      radius: 60,
      tags: Object.freeze(['spawn', 'memory_archive']),
    }),
    Object.freeze({
      id: 'casefile_desk',
      position: Object.freeze({ x: 500, y: 340 }),
      radius: 52,
      tags: Object.freeze(['evidence', 'narrative']),
    }),
    Object.freeze({
      id: 'memory_vault',
      position: Object.freeze({ x: 740, y: 240 }),
      radius: 54,
      tags: Object.freeze(['objective', 'memory_projection']),
    }),
    Object.freeze({
      id: 'projection_lab',
      position: Object.freeze({ x: 690, y: 250 }),
      radius: 48,
      tags: Object.freeze(['analysis', 'knowledge_ledger']),
    }),
    Object.freeze({
      id: 'broadcast_terminal',
      position: Object.freeze({ x: 420, y: 240 }),
      radius: 46,
      tags: Object.freeze(['broadcast', 'network_signal']),
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({ from: 'archive_entry', to: 'casefile_desk', cost: 1 }),
    Object.freeze({ from: 'casefile_desk', to: 'memory_vault', cost: 1 }),
    Object.freeze({ from: 'casefile_desk', to: 'projection_lab', cost: 1 }),
    Object.freeze({ from: 'projection_lab', to: 'broadcast_terminal', cost: 1 }),
    Object.freeze({ from: 'broadcast_terminal', to: 'memory_vault', cost: 1 }),
  ]),
  walkableSurfaces: Object.freeze([
    Object.freeze({
      id: 'archive_floor',
      polygon: Object.freeze([
        Object.freeze({ x: 80, y: 340 }),
        Object.freeze({ x: 600, y: 340 }),
        Object.freeze({ x: 600, y: 640 }),
        Object.freeze({ x: 80, y: 640 }),
      ]),
      tags: Object.freeze(['indoor', 'archive']),
    }),
    Object.freeze({
      id: 'casefile_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 420, y: 240 }),
        Object.freeze({ x: 760, y: 240 }),
        Object.freeze({ x: 760, y: 420 }),
        Object.freeze({ x: 420, y: 420 }),
      ]),
      tags: Object.freeze(['investigation', 'restricted']),
    }),
    Object.freeze({
      id: 'vault_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 640, y: 160 }),
        Object.freeze({ x: 860, y: 160 }),
        Object.freeze({ x: 860, y: 340 }),
        Object.freeze({ x: 640, y: 340 }),
      ]),
      tags: Object.freeze(['objective', 'memory_projection']),
    }),
    Object.freeze({
      id: 'projection_lab_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 560, y: 200 }),
        Object.freeze({ x: 820, y: 200 }),
        Object.freeze({ x: 820, y: 350 }),
        Object.freeze({ x: 560, y: 350 }),
      ]),
      tags: Object.freeze(['analysis', 'knowledge_ledger']),
    }),
    Object.freeze({
      id: 'broadcast_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 320, y: 200 }),
        Object.freeze({ x: 520, y: 200 }),
        Object.freeze({ x: 520, y: 340 }),
        Object.freeze({ x: 320, y: 340 }),
      ]),
      tags: Object.freeze(['broadcast', 'network_signal']),
    }),
  ]),
});

function ensureTriggerDefinitions() {
  for (const definition of TRIGGER_DEFINITIONS) {
    if (!QuestTriggerRegistry.getTriggerDefinition(definition.id)) {
      QuestTriggerRegistry.registerDefinition({ ...definition });
    }
  }
}

function cloneNavigationMesh(template = NAVIGATION_TEMPLATE) {
  return {
    nodes: template.nodes.map((node) => ({
      id: node.id,
      position: { ...node.position },
      radius: node.radius,
      tags: Array.isArray(node.tags) ? [...node.tags] : [],
    })),
    edges: template.edges.map((edge) => ({ ...edge })),
    walkableSurfaces: template.walkableSurfaces.map((surface) => ({
      id: surface.id,
      polygon: surface.polygon.map((point) => ({ ...point })),
      tags: Array.isArray(surface.tags) ? [...surface.tags] : [],
    })),
  };
}

function createRectEntity(entityManager, componentRegistry, segment) {
  const entityId = entityManager.createEntity(segment.id);
  componentRegistry.addComponent(
    entityId,
    'Transform',
    new Transform(
      segment.x + segment.width / 2,
      segment.y + segment.height / 2,
      segment.rotation ?? 0,
      1,
      1
    )
  );
  componentRegistry.addComponent(
    entityId,
    'Sprite',
    new Sprite({
      image: null,
      width: segment.width,
      height: segment.height,
      color: segment.color,
      alpha: segment.alpha ?? 1,
      layer: segment.layer ?? 'ground',
      zIndex: segment.zIndex ?? 0,
      visible: true,
    })
  );
  return entityId;
}

function createBoundaryEntity(entityManager, componentRegistry, segment) {
  const entityId = createRectEntity(entityManager, componentRegistry, segment);
  componentRegistry.addComponent(
    entityId,
    'Collider',
    new Collider({
      type: 'AABB',
      width: segment.width,
      height: segment.height,
      offsetX: 0,
      offsetY: 0,
      isStatic: true,
      isTrigger: false,
      tags: ['wall', 'solid'],
    })
  );
  return entityId;
}

function createQuestTriggerRing(entityManager, componentRegistry, toolkit, definition, layout) {
  const entityId = entityManager.createEntity(`${definition.id}_trigger`);
  componentRegistry.addComponent(
    entityId,
    'Transform',
    new Transform(layout.x, layout.y, 0, 1, 1)
  );
  componentRegistry.addComponent(
    entityId,
    'Sprite',
    new Sprite({
      image: null,
      width: layout.radius * 2,
      height: layout.radius * 2,
      color: layout.color ?? '#4a9ed2',
      alpha: layout.alpha ?? 0.2,
      layer: layout.layer ?? 'ground_fx',
      zIndex: layout.zIndex ?? 1,
      visible: true,
    })
  );
  toolkit.createQuestTrigger(entityId, definition);
  return entityId;
}

function cloneSegments(segments) {
  return segments.map((segment) => ({ ...segment }));
}

/**
 * Load the personal investigation interior for Act 2 branching.
 * @returns {Promise<object>} Scene data consumed by Game.loadAct2ThreadScene
 */
export async function loadAct2PersonalInvestigationScene(
  entityManager,
  componentRegistry,
  eventBus,
  options = {}
) {
  ensureTriggerDefinitions();

  const sceneEntities = [];
  const cleanupHandlers = [];
  const questTriggerToolkit = new TriggerMigrationToolkit(componentRegistry, eventBus);

  for (const segment of FLOOR_SEGMENTS) {
    sceneEntities.push(createRectEntity(entityManager, componentRegistry, segment));
  }

  for (const segment of BOUNDARY_SEGMENTS) {
    sceneEntities.push(createBoundaryEntity(entityManager, componentRegistry, segment));
  }

  const triggerLayouts = [
    {
      id: ACT2_PERSONAL_TRIGGER_IDS.ENTRY,
      x: 240,
      y: 540,
      radius: 132,
      color: '#6aa4ff',
      alpha: 0.18,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_PERSONAL_TRIGGER_IDS.CASEFILES,
      x: 520,
      y: 340,
      radius: 118,
      color: '#f4a460',
      alpha: 0.24,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_PERSONAL_TRIGGER_IDS.MEMORY_VAULT,
      x: 760,
      y: 240,
      radius: 122,
      color: '#9c7cf0',
      alpha: 0.26,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_PERSONAL_TRIGGER_IDS.PROJECTION_LAB,
      x: 700,
      y: 250,
      radius: 114,
      color: '#8bc7ff',
      alpha: 0.22,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_PERSONAL_TRIGGER_IDS.BROADCAST_TERMINAL,
      x: 420,
      y: 240,
      radius: 110,
      color: '#f0b4ff',
      alpha: 0.24,
      layer: 'ground_fx',
      zIndex: 2,
    },
  ];

  for (const layout of triggerLayouts) {
    const definition = QuestTriggerRegistry.getTriggerDefinition(layout.id);
    if (!definition) {
      continue;
    }
    const entityId = createQuestTriggerRing(
      entityManager,
      componentRegistry,
      questTriggerToolkit,
      definition,
      layout
    );
    sceneEntities.push(entityId);
  }

  cleanupHandlers.push(() => {
    if (typeof questTriggerToolkit.listOutstandingMigrations === 'function') {
      // Hook retained for symmetry; toolkit cleans itself up with component teardown.
    }
  });

  const spawnPoint = {
    x: options.spawnPoint?.x ?? DEFAULT_SPAWN_POINT.x,
    y: options.spawnPoint?.y ?? DEFAULT_SPAWN_POINT.y,
  };

  const navigationMesh = cloneNavigationMesh();

  return {
    sceneName: SCENE_ID,
    sceneEntities,
    spawnPoint,
    cleanup: () => {
      for (const off of cleanupHandlers) {
        if (typeof off === 'function') {
          off();
        }
      }
    },
    metadata: {
      branchId: options.branchId || null,
      questId: options.questId || DEFAULT_QUEST_ID,
      navigationMesh,
      geometry: {
        floors: cloneSegments(FLOOR_SEGMENTS),
        boundaries: cloneSegments(BOUNDARY_SEGMENTS),
      },
      triggerLayout: triggerLayouts.map((layout) => ({
        triggerId: layout.id,
        radius: layout.radius,
        x: layout.x,
        y: layout.y,
        color: layout.color,
      })),
      narrativeBeats: {
        entry: 'act2_personal_archive_entry',
        progression: 'act2_personal_casefile_reckoning',
        projection: 'act2_personal_projection_analysis',
        broadcast: 'act2_personal_broadcast_commitment',
        objective: 'act2_personal_memory_vault_unlocked',
      },
    },
  };
}
