/**
 * Act2ResistanceHideoutScene
 *
 * Establishes the Archivist resistance contact interior for the Act 2 branch.
 * Mirrors the corporate thread structure by wiring TriggerMigrationToolkit
 * quest rings, authored navigation mesh metadata, and geometry surfaces so
 * branching transitions inherit consistent narrative analytics.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';

const SCENE_ID = 'act2_resistance_hideout';
const DEFAULT_QUEST_ID = 'main-act2-archivist-alliance';
const DEFAULT_SPAWN_POINT = Object.freeze({ x: 200, y: 560 });

export const ACT2_RESISTANCE_TRIGGER_IDS = Object.freeze({
  ENTRY: 'act2_resistance_contact_entry',
  STRATEGY_TABLE: 'act2_resistance_strategy_table',
  ESCAPE_TUNNEL: 'act2_resistance_escape_tunnel',
  COORDINATION_CHAMBER: 'act2_resistance_coordination_chamber',
  SIGNAL_ARRAY: 'act2_resistance_signal_array',
});

const TRIGGER_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: ACT2_RESISTANCE_TRIGGER_IDS.ENTRY,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_locate_resistance_contact',
    areaId: 'resistance_contact_entry',
    radius: 120,
    once: true,
    prompt: 'Descend into the Archivist hideout.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_resistance_hideout_entry',
      moodHint: 'clandestine',
      telemetryTag: 'act2_resistance_contact_entry',
    },
  }),
  Object.freeze({
    id: ACT2_RESISTANCE_TRIGGER_IDS.STRATEGY_TABLE,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_negotiate_alliance_terms',
    areaId: 'resistance_strategy_table',
    radius: 110,
    once: false,
    prompt: 'Gather intel at the strategy table.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_resistance_strategy_session',
      unlocksMechanic: 'faction_alignment',
      telemetryTag: 'act2_resistance_strategy_table',
    },
  }),
  Object.freeze({
    id: ACT2_RESISTANCE_TRIGGER_IDS.ESCAPE_TUNNEL,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_secure_escape_routes',
    areaId: 'resistance_escape_tunnel',
    radius: 118,
    once: true,
    prompt: 'Secure the tunnel network for future operations.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_resistance_escape_network',
      unlocksMechanic: 'fast_travel',
      telemetryTag: 'act2_resistance_escape_tunnel',
    },
  }),
  Object.freeze({
    id: ACT2_RESISTANCE_TRIGGER_IDS.COORDINATION_CHAMBER,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_coordinate_joint_ops',
    areaId: 'resistance_coordination_chamber',
    radius: 108,
    once: true,
    prompt: 'Coordinate joint strikes with Archivist leadership.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_resistance_coordination_council',
      unlocksMechanic: 'faction_alignment',
      telemetryTag: 'act2_resistance_coordination_chamber',
    },
  }),
  Object.freeze({
    id: ACT2_RESISTANCE_TRIGGER_IDS.SIGNAL_ARRAY,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_prime_signal_array',
    areaId: 'resistance_signal_array',
    radius: 112,
    once: true,
    prompt: 'Prime the encrypted signal array to protect operations.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_resistance_signal_array_primed',
      unlocksMechanic: 'network_signal',
      telemetryTag: 'act2_resistance_signal_array',
    },
  }),
]);

const FLOOR_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'resistance_lower_platform',
    x: 60,
    y: 380,
    width: 560,
    height: 300,
    color: '#1a1f28',
    alpha: 0.95,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'resistance_strategy_dais',
    x: 440,
    y: 260,
    width: 320,
    height: 200,
    color: '#1f2b36',
    alpha: 0.92,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'resistance_tunnel_platform',
    x: 640,
    y: 160,
    width: 220,
    height: 200,
    color: '#243744',
    alpha: 0.9,
    layer: 'ground_fx',
    zIndex: 1,
  }),
  Object.freeze({
    id: 'resistance_coordination_platform',
    x: 360,
    y: 200,
    width: 220,
    height: 160,
    color: '#2a3d4f',
    alpha: 0.9,
    layer: 'ground_fx',
    zIndex: 1,
  }),
  Object.freeze({
    id: 'resistance_signal_platform',
    x: 620,
    y: 150,
    width: 220,
    height: 160,
    color: '#314c5f',
    alpha: 0.9,
    layer: 'ground_fx',
    zIndex: 1,
  }),
]);

const BOUNDARY_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'resistance_wall_west',
    x: 30,
    y: 140,
    width: 24,
    height: 460,
    color: '#10141b',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'resistance_wall_north',
    x: 30,
    y: 140,
    width: 820,
    height: 24,
    color: '#10141b',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'resistance_wall_south',
    x: 30,
    y: 580,
    width: 780,
    height: 24,
    color: '#10141b',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'resistance_wall_east',
    x: 830,
    y: 140,
    width: 24,
    height: 440,
    color: '#10141b',
    alpha: 0.96,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'resistance_shielding',
    x: 420,
    y: 260,
    width: 18,
    height: 220,
    color: '#27394a',
    alpha: 0.6,
    layer: 'environment_fx',
    zIndex: 5,
  }),
]);

const NAVIGATION_TEMPLATE = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({
      id: 'hideout_entry',
      position: Object.freeze({ x: 220, y: 560 }),
      radius: 64,
      tags: Object.freeze(['spawn', 'safezone']),
    }),
    Object.freeze({
      id: 'strategy_table',
      position: Object.freeze({ x: 480, y: 340 }),
      radius: 52,
      tags: Object.freeze(['meeting', 'faction']),
    }),
    Object.freeze({
      id: 'escape_tunnel',
      position: Object.freeze({ x: 720, y: 240 }),
      radius: 56,
      tags: Object.freeze(['objective', 'escape_route']),
    }),
    Object.freeze({
      id: 'coordination_chamber',
      position: Object.freeze({ x: 440, y: 240 }),
      radius: 50,
      tags: Object.freeze(['strategy', 'faction']),
    }),
    Object.freeze({
      id: 'signal_array',
      position: Object.freeze({ x: 720, y: 190 }),
      radius: 50,
      tags: Object.freeze(['network_signal', 'defense']),
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({ from: 'hideout_entry', to: 'strategy_table', cost: 1 }),
    Object.freeze({ from: 'strategy_table', to: 'escape_tunnel', cost: 1 }),
    Object.freeze({ from: 'strategy_table', to: 'coordination_chamber', cost: 1 }),
    Object.freeze({ from: 'coordination_chamber', to: 'signal_array', cost: 1 }),
    Object.freeze({ from: 'signal_array', to: 'escape_tunnel', cost: 1 }),
  ]),
  walkableSurfaces: Object.freeze([
    Object.freeze({
      id: 'lower_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 80, y: 360 }),
        Object.freeze({ x: 600, y: 360 }),
        Object.freeze({ x: 600, y: 640 }),
        Object.freeze({ x: 80, y: 640 }),
      ]),
      tags: Object.freeze(['indoor', 'safezone']),
    }),
    Object.freeze({
      id: 'strategy_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 420, y: 260 }),
        Object.freeze({ x: 760, y: 260 }),
        Object.freeze({ x: 760, y: 420 }),
        Object.freeze({ x: 420, y: 420 }),
      ]),
      tags: Object.freeze(['restricted', 'meeting']),
    }),
    Object.freeze({
      id: 'tunnel_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 620, y: 160 }),
        Object.freeze({ x: 860, y: 160 }),
        Object.freeze({ x: 860, y: 340 }),
        Object.freeze({ x: 620, y: 340 }),
      ]),
      tags: Object.freeze(['objective', 'escape']),
    }),
    Object.freeze({
      id: 'coordination_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 360, y: 200 }),
        Object.freeze({ x: 580, y: 200 }),
        Object.freeze({ x: 580, y: 360 }),
        Object.freeze({ x: 360, y: 360 }),
      ]),
      tags: Object.freeze(['strategy', 'faction']),
    }),
    Object.freeze({
      id: 'signal_platform',
      polygon: Object.freeze([
        Object.freeze({ x: 620, y: 150 }),
        Object.freeze({ x: 840, y: 150 }),
        Object.freeze({ x: 840, y: 310 }),
        Object.freeze({ x: 620, y: 310 }),
      ]),
      tags: Object.freeze(['network_signal', 'defense']),
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
      color: layout.color ?? '#2f86e0',
      alpha: layout.alpha ?? 0.24,
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
 * Load the Archivist resistance hideout interior scene for Act 2 branching.
 * @returns {Promise<object>} Scene data consumed by Game.loadAct2ThreadScene
 */
export async function loadAct2ResistanceHideoutScene(
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
      id: ACT2_RESISTANCE_TRIGGER_IDS.ENTRY,
      x: 200,
      y: 560,
      radius: 120,
      color: '#3aa0c7',
      alpha: 0.18,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_RESISTANCE_TRIGGER_IDS.STRATEGY_TABLE,
      x: 520,
      y: 340,
      radius: 110,
      color: '#f2b56b',
      alpha: 0.22,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_RESISTANCE_TRIGGER_IDS.ESCAPE_TUNNEL,
      x: 740,
      y: 240,
      radius: 118,
      color: '#8c6fe3',
      alpha: 0.24,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_RESISTANCE_TRIGGER_IDS.COORDINATION_CHAMBER,
      x: 440,
      y: 240,
      radius: 108,
      color: '#6db4ff',
      alpha: 0.22,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_RESISTANCE_TRIGGER_IDS.SIGNAL_ARRAY,
      x: 740,
      y: 190,
      radius: 112,
      color: '#f09cff',
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
      // No explicit disposal required; hook retained for symmetry.
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
        entry: 'act2_resistance_hideout_entry',
        progression: 'act2_resistance_strategy_session',
        objective: 'act2_resistance_escape_network',
        coordination: 'act2_resistance_coordination_council',
        signal: 'act2_resistance_signal_array_primed',
      },
    },
  };
}
