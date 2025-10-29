/**
 * MemoryParlorScene
 *
 * Hand-authored infiltration layout for Act 1's Memory Parlor quest.
 * Creates the entrance trigger, firewall barrier with scrambler hooks,
 * and interior trigger that advances the infiltration objective.
 *
 * This scene does not create the player entity; the caller should reuse the
 * existing player and reposition them to the returned spawn point.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { createNPCEntity } from '../entities/NPCEntity.js';
import { createEvidenceEntity } from '../entities/EvidenceEntity.js';
import { GameConfig } from '../config/GameConfig.js';

const ROOM_WIDTH = 960;
const ROOM_HEIGHT = 600;
const WALL_THICKNESS = 24;

const ENTRANCE_POSITION = { x: 160, y: 320 };
const FIREWALL_POSITION = { x: 480, y: 320 };
const INTERIOR_CENTER = { x: 720, y: 320 };
const EXIT_POSITION = { x: 120, y: 260 };
const EXIT_RADIUS = 96;

const FIREWALL_ID = 'memory_parlor_firewall';
const CLIENT_REGISTRY_EVIDENCE_ID = 'evidence_memory_parlor_client_registry';
const DETECTION_ZONE_HIGHLIGHT_MS = 1600;
const DETECTION_CONFIG =
  GameConfig?.stealth?.visuals?.memoryParlor ?? {
    dangerColor: '#ff3f7c',
    safeColor: '#31f5c9',
    baseAlpha: 0.22,
    highlightAlpha: 0.45,
    safeBaseAlpha: 0.28,
    safeHighlightAlpha: 0.5,
  };

const INTEL_EVIDENCE_DATA = [
  {
    x: 690,
    y: 250,
    id: 'evidence_memory_parlor_access_card',
    type: 'physical',
    category: 'security',
    title: 'Access Card Fragment',
    description: 'Broken security card with encrypted routing data.',
    caseId: 'case_003_memory_parlor',
    hidden: false,
    derivedClues: ['clue_parlor_security_patterns'],
  },
  {
    x: 770,
    y: 330,
    id: 'evidence_memory_parlor_modulator',
    type: 'digital',
    category: 'device',
    title: 'Signal Modulator',
    description: 'Handheld resonance modulator used to dampen firewall signatures.',
    caseId: 'case_003_memory_parlor',
    hidden: false,
    derivedClues: ['clue_scrambler_frequency_map'],
  },
  {
    x: 820,
    y: 270,
    id: 'evidence_memory_parlor_ledger',
    type: 'physical',
    category: 'document',
    title: 'Ledger Shards',
    description: 'Fragments of a ledger enumerating extraction orders.',
    caseId: 'case_003_memory_parlor',
    hidden: true,
    requires: 'detective_vision',
    derivedClues: ['clue_curator_payment_cycle'],
  },
  {
    x: 840,
    y: 340,
    id: CLIENT_REGISTRY_EVIDENCE_ID,
    type: 'digital',
    category: 'database',
    title: 'Client Registry Core Dump',
    description: 'Encrypted drive containing the Memory Parlor client roster.',
    caseId: 'case_003_memory_parlor',
    hidden: false,
    derivedClues: ['clue_client_billing_routes'],
  },
];

/**
 * Helper to safely add drawable rectangle.
 * @param {Object} entityManager
 * @param {Object} componentRegistry
 * @param {Object} params
 * @returns {number} Entity ID
 */
function createRectEntity(entityManager, componentRegistry, {
  x,
  y,
  width,
  height,
  color = '#1c1228',
  alpha = 1,
  layer = 'environment',
  zIndex = 2,
  tag = null,
} = {}) {
  const entityId = entityManager.createEntity(tag);
  const transform = new Transform(x + width / 2, y + height / 2, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  const sprite = new Sprite({
    image: null,
    width,
    height,
    color,
    alpha,
    layer,
    zIndex,
    visible: true,
  });
  componentRegistry.addComponent(entityId, 'Sprite', sprite);

  return entityId;
}

function createWall(entityManager, componentRegistry, x, y, width, height, color = '#0d0815') {
  const entityId = entityManager.createEntity('boundary');
  componentRegistry.addComponent(entityId, 'Transform', new Transform(x + width / 2, y + height / 2, 0, 1, 1));
  componentRegistry.addComponent(entityId, 'Collider', new Collider({
    type: 'AABB',
    width,
    height,
    offsetX: -width / 2,
    offsetY: -height / 2,
    isStatic: true,
    isTrigger: false,
    tags: ['boundary', 'solid'],
  }));
  componentRegistry.addComponent(entityId, 'Sprite', new Sprite({
    image: null,
    width,
    height,
    color,
    alpha: 0.92,
    layer: 'environment',
    zIndex: 3,
    visible: true,
  }));
  return entityId;
}

function createCoverBlock(entityManager, componentRegistry, {
  x,
  y,
  width,
  height,
  color = '#2d1b42',
  alpha = 0.95,
  tag = 'stealth_cover',
  zIndex = 5,
} = {}) {
  const entityId = entityManager.createEntity(tag);
  componentRegistry.addComponent(entityId, 'Transform', new Transform(x + width / 2, y + height / 2, 0, 1, 1));
  componentRegistry.addComponent(entityId, 'Collider', new Collider({
    type: 'AABB',
    width,
    height,
    offsetX: -width / 2,
    offsetY: -height / 2,
    isStatic: true,
    isTrigger: false,
    tags: ['cover', 'solid'],
  }));
  componentRegistry.addComponent(entityId, 'Sprite', new Sprite({
    image: null,
    width,
    height,
    color,
    alpha,
    layer: 'environment',
    zIndex,
    visible: true,
  }));
  return entityId;
}

function createTriggerZone(entityManager, componentRegistry, {
  id,
  x,
  y,
  radius,
  requiresInput = false,
  oneShot = false,
  prompt = '',
  layer = 'ground_fx',
  color = '#5f3b8b',
  alpha = 0.25,
} = {}) {
  const entityId = entityManager.createEntity('area_trigger');
  componentRegistry.addComponent(entityId, 'Transform', new Transform(x, y, 0, 1, 1));
  componentRegistry.addComponent(entityId, 'InteractionZone', new InteractionZone({
    id,
    type: 'trigger',
    radius,
    requiresInput,
    prompt,
    oneShot,
    active: true,
  }));
  componentRegistry.addComponent(entityId, 'Sprite', new Sprite({
    image: null,
    width: radius * 2,
    height: radius * 2,
    color,
    alpha,
    layer,
    zIndex: 1,
    visible: true,
  }));
  return entityId;
}

function setFirewallState({ collider, sprite, zone }, isOpen) {
  if (collider) {
    collider.isTrigger = isOpen;
  }
  if (sprite) {
    sprite.color = isOpen ? '#46f1b8' : '#ff2d75';
    sprite.alpha = isOpen ? 0.35 : 0.85;
  }
  if (zone) {
    zone.prompt = isOpen
      ? 'Firewall destabilized. Move quickly!'
      : 'Firewall active. Activate a Cipher scrambler.';
    if (!zone.oneShot) {
      zone.triggered = false;
    }
  }
}

/**
 * Loads the Memory Parlor infiltration scene.
 * @returns {Promise<Object>} Scene data
 */
export async function loadMemoryParlorScene(entityManager, componentRegistry, eventBus, options = {}) {
  console.log('[MemoryParlorScene] Loading Memory Parlor infiltration scene...');

  const sceneEntities = [];
  const cleanupHandlers = [];

  const padFloorId = createRectEntity(entityManager, componentRegistry, {
    x: 0,
    y: 0,
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    color: '#140c1f',
    alpha: 0.98,
    layer: 'ground',
    zIndex: 0,
  });
  sceneEntities.push(padFloorId);

  const entryRunnerId = createRectEntity(entityManager, componentRegistry, {
    x: 120,
    y: 240,
    width: 320,
    height: 160,
    color: '#1f1430',
    alpha: 0.9,
    layer: 'ground',
    zIndex: 1,
  });
  sceneEntities.push(entryRunnerId);

  const interiorFloorId = createRectEntity(entityManager, componentRegistry, {
    x: 440,
    y: 160,
    width: 440,
    height: 320,
    color: '#26163a',
    alpha: 0.94,
    layer: 'ground',
    zIndex: 1,
  });
  sceneEntities.push(interiorFloorId);

  const ambientCenterStripId = createRectEntity(entityManager, componentRegistry, {
    x: 420,
    y: 210,
    width: 320,
    height: 220,
    color: '#2f1240',
    alpha: 0.7,
    layer: 'ground_fx',
    zIndex: 1,
  });
  sceneEntities.push(ambientCenterStripId);

  const walls = [
    createWall(entityManager, componentRegistry, 0, 0, ROOM_WIDTH, WALL_THICKNESS),
    createWall(entityManager, componentRegistry, 0, ROOM_HEIGHT - WALL_THICKNESS, ROOM_WIDTH, WALL_THICKNESS),
    createWall(entityManager, componentRegistry, 0, 0, WALL_THICKNESS, ROOM_HEIGHT),
    createWall(entityManager, componentRegistry, ROOM_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, ROOM_HEIGHT),
  ];
  sceneEntities.push(...walls);

  const entranceZoneId = createTriggerZone(entityManager, componentRegistry, {
    id: 'memory_parlor_entrance',
    x: ENTRANCE_POSITION.x,
    y: ENTRANCE_POSITION.y,
    radius: 96,
    prompt: 'Hidden stairwell to the Memory Parlor.',
    oneShot: true,
  });
  sceneEntities.push(entranceZoneId);

  const firewallEntityId = entityManager.createEntity('firewall_gate');
  componentRegistry.addComponent(firewallEntityId, 'Transform', new Transform(
    FIREWALL_POSITION.x,
    FIREWALL_POSITION.y,
    0,
    1,
    1,
  ));
  componentRegistry.addComponent(firewallEntityId, 'Collider', new Collider({
    type: 'AABB',
    width: 96,
    height: 32,
    offsetX: -48,
    offsetY: -16,
    isStatic: true,
    isTrigger: false,
    tags: ['barrier', 'firewall'],
  }));
  componentRegistry.addComponent(firewallEntityId, 'Sprite', new Sprite({
    image: null,
    width: 96,
    height: 32,
    color: '#ff2d75',
    alpha: 0.85,
    layer: 'environment_fx',
    zIndex: 6,
    visible: true,
  }));
  componentRegistry.addComponent(firewallEntityId, 'InteractionZone', new InteractionZone({
    id: FIREWALL_ID,
    type: 'trigger',
    radius: 96,
    requiresInput: false,
    oneShot: false,
    active: true,
    prompt: 'Cipher firewall hums here. Scrambler required.',
  }));
  sceneEntities.push(firewallEntityId);

  const interiorZoneId = createTriggerZone(entityManager, componentRegistry, {
    id: 'memory_parlor_interior',
    x: INTERIOR_CENTER.x,
    y: INTERIOR_CENTER.y,
    radius: 140,
    prompt: 'Memory Parlor interior reached.',
    oneShot: false,
    color: '#3a1f57',
    alpha: 0.18,
  });
  sceneEntities.push(interiorZoneId);

  const tables = [
    createRectEntity(entityManager, componentRegistry, {
      x: 540,
      y: 230,
      width: 120,
      height: 48,
      color: '#3d2b5b',
      alpha: 0.95,
      layer: 'environment',
      zIndex: 4,
    }),
    createRectEntity(entityManager, componentRegistry, {
      x: 540,
      y: 360,
      width: 120,
      height: 48,
      color: '#3d2b5b',
      alpha: 0.95,
      layer: 'environment',
      zIndex: 4,
    }),
    createRectEntity(entityManager, componentRegistry, {
      x: 680,
      y: 260,
      width: 140,
      height: 36,
      color: '#352147',
      alpha: 0.92,
      layer: 'environment',
      zIndex: 4,
    }),
  ];
  sceneEntities.push(...tables);

  const coverBlocks = [
    createCoverBlock(entityManager, componentRegistry, {
      x: 612,
      y: 205,
      width: 60,
      height: 110,
      color: '#251632',
    }),
    createCoverBlock(entityManager, componentRegistry, {
      x: 660,
      y: 360,
      width: 48,
      height: 96,
      color: '#2f1d44',
    }),
    createCoverBlock(entityManager, componentRegistry, {
      x: 740,
      y: 210,
      width: 52,
      height: 120,
      color: '#281838',
    }),
    createCoverBlock(entityManager, componentRegistry, {
      x: FIREWALL_POSITION.x - 100,
      y: FIREWALL_POSITION.y - 140,
      width: 200,
      height: 48,
      color: '#180f28',
    }),
    createCoverBlock(entityManager, componentRegistry, {
      x: FIREWALL_POSITION.x - 100,
      y: FIREWALL_POSITION.y + 72,
      width: 200,
      height: 48,
      color: '#180f28',
    }),
  ];
  sceneEntities.push(...coverBlocks);

  const exitRunnerId = createRectEntity(entityManager, componentRegistry, {
    x: EXIT_POSITION.x - 60,
    y: EXIT_POSITION.y - 60,
    width: 140,
    height: 160,
    color: '#1b102a',
    alpha: 0.9,
    layer: 'ground',
    zIndex: 1,
  });
  sceneEntities.push(exitRunnerId);

  const exitZoneId = createTriggerZone(entityManager, componentRegistry, {
    id: 'neon_districts_street',
    x: EXIT_POSITION.x,
    y: EXIT_POSITION.y,
    radius: EXIT_RADIUS,
    prompt: 'Return to the Neon District streets.',
    oneShot: true,
    color: '#2d8aff',
    alpha: 0.22,
  });
  sceneEntities.push(exitZoneId);

  for (const evidenceData of INTEL_EVIDENCE_DATA) {
    const evidenceId = createEvidenceEntity(entityManager, componentRegistry, evidenceData);
    sceneEntities.push(evidenceId);
  }

  const guardA = createNPCEntity(entityManager, componentRegistry, {
    x: 700,
    y: 280,
    id: 'neurosynch_guard_a',
    name: 'NeuroSync Guard',
    faction: 'neurosynch',
    hasDialogue: false,
  });
  const guardB = createNPCEntity(entityManager, componentRegistry, {
    x: 760,
    y: 360,
    id: 'parlor_attendant_a',
    name: 'Parlor Attendant',
    faction: 'curators',
    hasDialogue: false,
  });
  sceneEntities.push(guardA, guardB);

  const detectionZoneDefinitions = [
    {
      id: 'memory_parlor_detection_guard_a',
      x: 700,
      y: 280,
      radius: 140,
      prompt: 'NeuroSync guard sweep — stay behind cover or trigger a scrambler.',
      layer: 'ground_fx',
    },
    {
      id: 'memory_parlor_detection_guard_b',
      x: 760,
      y: 360,
      radius: 144,
      prompt: 'Attendant scans the floor — disruption gear reduces detection chance.',
      layer: 'ground_fx',
    },
  ];

  const detectionZoneRecords = [];
  for (const definition of detectionZoneDefinitions) {
    const entityId = createTriggerZone(entityManager, componentRegistry, {
      id: definition.id,
      x: definition.x,
      y: definition.y,
      radius: definition.radius,
      requiresInput: false,
      oneShot: false,
      prompt: definition.prompt,
      layer: definition.layer,
      color: DETECTION_CONFIG.dangerColor,
      alpha: DETECTION_CONFIG.baseAlpha,
    });
    const sprite = componentRegistry.getComponent(entityId, 'Sprite');
    if (sprite) {
      sprite.layer = definition.layer;
      sprite.zIndex = 0;
      sprite.alpha = DETECTION_CONFIG.baseAlpha;
      sprite.color = DETECTION_CONFIG.dangerColor;
    }
    detectionZoneRecords.push({
      ...definition,
      entityId,
      sprite,
      scramblerActive: false,
      resetTimer: null,
    });
    sceneEntities.push(entityId);
  }

  const detectionZoneMap = new Map(detectionZoneRecords.map((record) => [record.id, record]));

  function cancelDetectionHighlight(record) {
    if (record.resetTimer) {
      clearTimeout(record.resetTimer);
      record.resetTimer = null;
    }
  }

  function applyDetectionBaseState(record) {
    if (!record.sprite) {
      return;
    }
    const isSafe = Boolean(record.scramblerActive);
    record.sprite.color = isSafe ? DETECTION_CONFIG.safeColor : DETECTION_CONFIG.dangerColor;
    record.sprite.alpha = isSafe
      ? DETECTION_CONFIG.safeBaseAlpha ?? DETECTION_CONFIG.baseAlpha
      : DETECTION_CONFIG.baseAlpha;
  }

  function highlightDetectionZone(record) {
    if (!record.sprite) {
      return;
    }
    cancelDetectionHighlight(record);
    const isSafe = Boolean(record.scramblerActive);
    record.sprite.color = isSafe ? DETECTION_CONFIG.safeColor : DETECTION_CONFIG.dangerColor;
    record.sprite.alpha = isSafe
      ? DETECTION_CONFIG.safeHighlightAlpha ?? DETECTION_CONFIG.highlightAlpha
      : DETECTION_CONFIG.highlightAlpha;
    record.resetTimer = setTimeout(() => {
      applyDetectionBaseState(record);
    }, DETECTION_ZONE_HIGHLIGHT_MS);
  }

  for (const record of detectionZoneRecords) {
    applyDetectionBaseState(record);
  }

  const firewallCollider = componentRegistry.getComponent(firewallEntityId, 'Collider');
  const firewallSprite = componentRegistry.getComponent(firewallEntityId, 'Sprite');
  const firewallZone = componentRegistry.getComponent(firewallEntityId, 'InteractionZone');

  setFirewallState({ collider: firewallCollider, sprite: firewallSprite, zone: firewallZone }, false);

  cleanupHandlers.push(
    eventBus.on('firewall:scrambler_activated', (payload = {}) => {
      if (payload.areaId && payload.areaId !== FIREWALL_ID && payload.areaId !== 'memory_parlor_interior') {
        return;
      }
      setFirewallState({ collider: firewallCollider, sprite: firewallSprite, zone: firewallZone }, true);
      for (const record of detectionZoneRecords) {
        record.scramblerActive = true;
        cancelDetectionHighlight(record);
        applyDetectionBaseState(record);
      }
    })
  );

  cleanupHandlers.push(
    eventBus.on('firewall:scrambler_expired', () => {
      setFirewallState({ collider: firewallCollider, sprite: firewallSprite, zone: firewallZone }, false);
      for (const record of detectionZoneRecords) {
        record.scramblerActive = false;
        cancelDetectionHighlight(record);
        applyDetectionBaseState(record);
      }
    })
  );

  cleanupHandlers.push(
    eventBus.on('firewall:scrambler_on_cooldown', () => {
      setFirewallState({ collider: firewallCollider, sprite: firewallSprite, zone: firewallZone }, false);
      for (const record of detectionZoneRecords) {
        record.scramblerActive = false;
        cancelDetectionHighlight(record);
        applyDetectionBaseState(record);
      }
    })
  );

  cleanupHandlers.push(
    eventBus.on('area:entered', (payload = {}) => {
      const record = detectionZoneMap.get(payload.areaId);
      if (!record) {
        return;
      }
      highlightDetectionZone(record);
      const promptPayload = {
        text: record.prompt,
        source: 'memory_parlor_detection',
      };
      if (payload.position && typeof payload.position.x === 'number' && typeof payload.position.y === 'number') {
        promptPayload.position = payload.position;
      } else {
        promptPayload.position = { x: record.x, y: record.y };
      }
      eventBus.emit('ui:show_prompt', promptPayload);
    })
  );

  cleanupHandlers.push(
    eventBus.on('evidence:collected', (payload = {}) => {
      if (payload.evidenceId !== CLIENT_REGISTRY_EVIDENCE_ID) {
        return;
      }

      eventBus.emit('knowledge:learned', {
        knowledgeId: 'memory_parlor_clients',
        source: 'memory_parlor_terminal',
      });
    })
  );

  cleanupHandlers.push(() => {
    for (const record of detectionZoneRecords) {
      cancelDetectionHighlight(record);
    }
  });

  return {
    sceneName: 'memory_parlor_infiltration',
    sceneEntities,
    spawnPoint: {
      x: options.spawnPoint?.x ?? ENTRANCE_POSITION.x - 40,
      y: options.spawnPoint?.y ?? ENTRANCE_POSITION.y,
    },
    cleanup: () => {
      for (const off of cleanupHandlers) {
        if (typeof off === 'function') {
          off();
        }
      }
    },
    metadata: {
      entranceZoneId,
      interiorZoneId,
      firewallEntityId,
      exitZoneId,
    },
  };
}

/**
 * Unloads Memory Parlor scene entities.
 * @param {EntityManager} entityManager
 * @param {ComponentRegistry} componentRegistry
 * @param {number[]} sceneEntities
 */
export function unloadMemoryParlorScene(entityManager, componentRegistry, sceneEntities = []) {
  if (!entityManager || !componentRegistry) {
    return;
  }

  for (const entityId of sceneEntities) {
    if (entityId == null) {
      continue;
    }
    if (!entityManager.hasEntity(entityId)) {
      continue;
    }
    componentRegistry.removeAllComponents(entityId);
    entityManager.destroyEntity(entityId);
  }
}
