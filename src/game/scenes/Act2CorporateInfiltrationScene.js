/**
 * Act2CorporateInfiltrationScene
 *
 * Establishes the first Act 2 branch interior for the NeuroSync corporate
 * infiltration thread. Provides a lobby-to-security-floor layout with
 * registry-backed triggers so quest objectives and analytics can attach to the
 * new space without bespoke wiring.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';

const SCENE_ID = 'act2_corporate_interior';
const DEFAULT_QUEST_ID = 'main-act2-neurosync-infiltration';
const DEFAULT_SPAWN_POINT = Object.freeze({ x: 220, y: 520 });

export const ACT2_CORPORATE_TRIGGER_IDS = Object.freeze({
  LOBBY_ENTRY: 'act2_corporate_lobby_entry',
  SECURITY_FLOOR: 'act2_corporate_security_floor',
  SERVER_ACCESS: 'act2_corporate_server_access',
});

const TRIGGER_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: ACT2_CORPORATE_TRIGGER_IDS.LOBBY_ENTRY,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_infiltrate_lobby',
    areaId: 'corporate_lobby',
    radius: 140,
    once: true,
    prompt: 'Blend into the NeuroSync lobby.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_corporate_lobby_entry',
      moodHint: 'social_stealth',
      telemetryTag: 'act2_corporate_lobby_entry',
    },
  }),
  Object.freeze({
    id: ACT2_CORPORATE_TRIGGER_IDS.SECURITY_FLOOR,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_bypass_security_floor',
    areaId: 'corporate_security_floor',
    radius: 130,
    once: false,
    prompt: 'Slip past security and reach internal elevators.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_corporate_security',
      unlocksMechanic: 'social_stealth',
      telemetryTag: 'act2_corporate_security_floor',
    },
  }),
  Object.freeze({
    id: ACT2_CORPORATE_TRIGGER_IDS.SERVER_ACCESS,
    questId: DEFAULT_QUEST_ID,
    objectiveId: 'obj_locate_server_room',
    areaId: 'corporate_server_access',
    radius: 120,
    once: true,
    prompt: 'Secure a route to the server access hall.',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_corporate_server_access',
      unlocksMechanic: 'data_extraction',
      telemetryTag: 'act2_corporate_server_access',
    },
  }),
]);

const FLOOR_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'corporate_lobby_floor',
    x: 80,
    y: 380,
    width: 520,
    height: 280,
    color: '#16202d',
    alpha: 0.96,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'corporate_security_walkway',
    x: 420,
    y: 260,
    width: 360,
    height: 200,
    color: '#1d2f3f',
    alpha: 0.92,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'corporate_server_prepcell',
    x: 620,
    y: 180,
    width: 220,
    height: 180,
    color: '#233a4d',
    alpha: 0.9,
    layer: 'ground_fx',
    zIndex: 1,
  }),
]);

const BOUNDARY_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'corporate_wall_west',
    x: 40,
    y: 160,
    width: 24,
    height: 440,
    color: '#0e141d',
    alpha: 0.95,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'corporate_wall_north',
    x: 40,
    y: 160,
    width: 820,
    height: 24,
    color: '#0e141d',
    alpha: 0.95,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'corporate_wall_south',
    x: 40,
    y: 560,
    width: 760,
    height: 24,
    color: '#0e141d',
    alpha: 0.95,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'corporate_wall_east',
    x: 820,
    y: 160,
    width: 24,
    height: 424,
    color: '#0e141d',
    alpha: 0.95,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'corporate_security_glass',
    x: 420,
    y: 260,
    width: 18,
    height: 220,
    color: '#1b3952',
    alpha: 0.6,
    layer: 'environment_fx',
    zIndex: 5,
  }),
]);

const NAVIGATION_TEMPLATE = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({
      id: 'lobby_spawn',
      position: Object.freeze({ x: 240, y: 520 }),
      radius: 64,
      tags: Object.freeze(['spawn', 'safezone']),
    }),
    Object.freeze({
      id: 'security_checkpoint',
      position: Object.freeze({ x: 420, y: 360 }),
      radius: 54,
      tags: Object.freeze(['security', 'stealth']),
    }),
    Object.freeze({
      id: 'server_hall_entry',
      position: Object.freeze({ x: 660, y: 260 }),
      radius: 56,
      tags: Object.freeze(['server_access']),
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({ from: 'lobby_spawn', to: 'security_checkpoint', cost: 1 }),
    Object.freeze({ from: 'security_checkpoint', to: 'server_hall_entry', cost: 1 }),
  ]),
  walkableSurfaces: Object.freeze([
    Object.freeze({
      id: 'lobby_floor',
      polygon: Object.freeze([
        Object.freeze({ x: 100, y: 360 }),
        Object.freeze({ x: 580, y: 360 }),
        Object.freeze({ x: 580, y: 620 }),
        Object.freeze({ x: 100, y: 620 }),
      ]),
      tags: Object.freeze(['indoor', 'social_stealth']),
    }),
    Object.freeze({
      id: 'security_walkway',
      polygon: Object.freeze([
        Object.freeze({ x: 380, y: 240 }),
        Object.freeze({ x: 720, y: 240 }),
        Object.freeze({ x: 720, y: 420 }),
        Object.freeze({ x: 380, y: 420 }),
      ]),
      tags: Object.freeze(['restricted', 'transition']),
    }),
    Object.freeze({
      id: 'server_access',
      polygon: Object.freeze([
        Object.freeze({ x: 600, y: 180 }),
        Object.freeze({ x: 840, y: 180 }),
        Object.freeze({ x: 840, y: 360 }),
        Object.freeze({ x: 600, y: 360 }),
      ]),
      tags: Object.freeze(['objective', 'data']),
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
 * Load the NeuroSync corporate interior scene supporting the first Act 2 branch.
 * @returns {Promise<object>} Scene data consumed by Game.loadAct2ThreadScene
 */
export async function loadAct2CorporateInfiltrationScene(
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
      id: ACT2_CORPORATE_TRIGGER_IDS.LOBBY_ENTRY,
      x: 240,
      y: 520,
      radius: 140,
      color: '#2f86e0',
      alpha: 0.18,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_CORPORATE_TRIGGER_IDS.SECURITY_FLOOR,
      x: 440,
      y: 340,
      radius: 120,
      color: '#f7a35b',
      alpha: 0.22,
      layer: 'ground_fx',
      zIndex: 2,
    },
    {
      id: ACT2_CORPORATE_TRIGGER_IDS.SERVER_ACCESS,
      x: 700,
      y: 260,
      radius: 120,
      color: '#8b5be6',
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
        entry: 'act2_corporate_lobby_entry',
        progression: 'act2_corporate_security',
        objective: 'act2_corporate_server_access',
      },
    },
  };
}
