/**
 * Act1Scene - The Hollow Case Investigation Scene
 *
 * Provides the minimum entities needed to make Quest 001 "The Hollow Case" completable:
 * - Crime scene area trigger for objective 1
 * - 5 evidence items (3 visible, 2 hidden) for objectives 2, 3, 6
 * - Witness NPC for objective 4
 * - Detective Vision tutorial trigger for objective 5
 * - Captain Reese NPC for objective 9 (if time permits)
 *
 * @class Act1Scene
 */

import { createPlayerEntity } from '../entities/PlayerEntity.js';
import { createEvidenceEntity } from '../entities/EvidenceEntity.js';
import { createNPCEntity } from '../entities/NPCEntity.js';
import { Transform } from '../components/Transform.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { Collider } from '../components/Collider.js';
import { Sprite } from '../components/Sprite.js';
import { tutorialCase, tutorialEvidence } from '../data/cases/tutorialCase.js';
import { Trigger } from '../../engine/physics/Trigger.js';

const SCENE_CENTER_X = 400;
const SCENE_CENTER_Y = 300;
const CRIME_SCENE_WIDTH = 560;
const CRIME_SCENE_HEIGHT = 360;

/**
 * Load Act 1 scene
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {Object} eventBus - Event bus instance
 * @returns {Object} Scene data with playerId and entity IDs
 */
export async function loadAct1Scene(entityManager, componentRegistry, eventBus, options = {}) {
  console.log('[Act1Scene] Loading Act 1 scene...');

  const sceneEntities = [];
  const cleanupHandlers = [];

  // 1. Create player at spawn point
  const reusePlayerId = options.reusePlayerId ?? null;
  const canReusePlayer = reusePlayerId != null
    && typeof entityManager.hasEntity === 'function'
    && entityManager.hasEntity(reusePlayerId);

  let playerId;
  if (canReusePlayer) {
    playerId = reusePlayerId;
    console.log(`[Act1Scene] Reusing existing player entity: ${playerId}`);
  } else {
    playerId = createPlayerEntity(entityManager, componentRegistry, 150, 300);
    console.log(`[Act1Scene] Player created: ${playerId}`);
  }

  // 1b. Dress the crime scene ground decal, caution markers, and ambient props
  const visualSetPieces = createCrimeSceneVisuals(entityManager, componentRegistry);
  sceneEntities.push(...visualSetPieces);
  console.log(`[Act1Scene] Visual set dressing entities created: ${visualSetPieces.length}`);

  // 2. Create crime scene area trigger
  // This trigger completes objective 1: "Arrive at the crime scene"
  const areaTriggerId = createCrimeSceneArea(entityManager, componentRegistry, eventBus);
  sceneEntities.push(areaTriggerId);
  console.log(`[Act1Scene] Crime scene area created: ${areaTriggerId}`);

  // 3. Create evidence items based on tutorial case definitions
  for (const evidenceDefinition of tutorialEvidence) {
    const { position = { x: 0, y: 0 } } = evidenceDefinition;
    const requiresAbility = Array.isArray(evidenceDefinition.requires)
      ? evidenceDefinition.requires[0] ?? null
      : evidenceDefinition.requires ?? null;

    const evidenceId = createEvidenceEntity(entityManager, componentRegistry, {
      x: position.x,
      y: position.y,
      id: evidenceDefinition.id,
      type: evidenceDefinition.type,
      category: evidenceDefinition.category,
      title: evidenceDefinition.title,
      description: evidenceDefinition.description,
      caseId: tutorialCase.id,
      hidden: Boolean(evidenceDefinition.hidden),
      requires: requiresAbility,
      derivedClues: evidenceDefinition.derivedClues || [],
      prompt: evidenceDefinition.interactionPrompt || null,
      forensic: evidenceDefinition.forensic || null,
    });
    sceneEntities.push(evidenceId);
  }
  console.log(`[Act1Scene] Created ${tutorialEvidence.length} evidence items`);

  // 4. Create witness NPC (Street Vendor)
  // This NPC completes objective 4: "Interview the witness"
  const witnessId = createNPCEntity(entityManager, componentRegistry, {
    x: 600,
    y: 300,
    id: 'witness_street_vendor',
    name: 'Street Vendor',
    faction: 'civilian',
    hasDialogue: true,
    dialogueId: 'witness_street_vendor'
  });
  sceneEntities.push(witnessId);
  console.log(`[Act1Scene] Witness NPC created: ${witnessId}`);

  // 5. Create black market broker NPC (optional memory parlor lead)
  const brokerId = createNPCEntity(entityManager, componentRegistry, {
    x: 720,
    y: 360,
    id: 'black_market_broker',
    name: 'Black Market Broker',
    faction: 'criminals',
    hasDialogue: true,
    dialogueId: 'black_market_broker'
  });
  sceneEntities.push(brokerId);
  console.log(`[Act1Scene] Black market broker NPC created: ${brokerId}`);

  // 6. Create Cipher Collective quartermaster (sells infiltration gadget)
  const quartermasterId = createNPCEntity(entityManager, componentRegistry, {
    x: 660,
    y: 420,
    id: 'cipher_quartermaster',
    name: 'Cipher Quartermaster',
    faction: 'cipher_collective',
    hasDialogue: true,
    dialogueId: 'cipher_quartermaster'
  });
  sceneEntities.push(quartermasterId);
  console.log(`[Act1Scene] Cipher quartermaster NPC created: ${quartermasterId}`);

  // 7. Create Captain Reese NPC (for objective 9)
  // Position at precinct entrance
  const captainId = createNPCEntity(entityManager, componentRegistry, {
    x: 200,
    y: 500,
    id: 'captain_reese',
    name: 'Captain Reese',
    faction: 'police',
    hasDialogue: true,
    dialogueId: 'captain_reese'
  });
  sceneEntities.push(captainId);
  console.log(`[Act1Scene] Captain Reese NPC created: ${captainId}`);

  // 8. Create boundary walls
  const boundaries = [
    { x: 0, y: 0, width: 800, height: 20 }, // Top
    { x: 0, y: 580, width: 800, height: 20 }, // Bottom
    { x: 0, y: 0, width: 20, height: 600 }, // Left
    { x: 780, y: 0, width: 20, height: 600 } // Right
  ];

  for (const boundary of boundaries) {
    const boundaryId = createBoundary(
      entityManager,
      componentRegistry,
      boundary.x,
      boundary.y,
      boundary.width,
      boundary.height
    );
    sceneEntities.push(boundaryId);
  }
  console.log('[Act1Scene] Boundary walls created');

  // 9. Set up Detective Vision tutorial trigger
  // After collecting 3 evidence, unlock Detective Vision (objective 5)
  let evidenceCollectedCount = 0;
  const requiredEvidenceForVision = 3;

  const offEvidenceCollected = eventBus.on('evidence:collected', (data) => {
    if (data.caseId === tutorialCase.id) {
      evidenceCollectedCount++;
      console.log(
        `[Act1Scene] Evidence collected: ${evidenceCollectedCount}/${requiredEvidenceForVision}`
      );

      // Unlock Detective Vision after collecting 3 visible evidence
      if (evidenceCollectedCount === requiredEvidenceForVision) {
        console.log('[Act1Scene] Detective Vision unlocked!');
        eventBus.emit('ability:unlocked', {
          abilityId: 'detective_vision'
        });
      }
    }
  });
  cleanupHandlers.push(offEvidenceCollected);

  console.log('[Act1Scene] Act 1 scene loaded successfully');

  return {
    playerId,
    sceneEntities,
    sceneName: 'act1_hollow_case',
    spawnPoint: { x: 150, y: 300 },
    cleanup: () => {
      for (const off of cleanupHandlers) {
        if (typeof off === 'function') {
          off();
        }
      }
    }
  };
}

/**
 * Create crime scene area trigger
 * @param {Object} entityManager
 * @param {Object} componentRegistry
 * @param {Object} eventBus
 * @returns {string} Entity ID
 */
function createCrimeSceneArea(entityManager, componentRegistry, eventBus) {
  // Create trigger entity
  const entityId = entityManager.createEntity('area_trigger');

  // Add Transform component - center of crime scene
  const transform = new Transform(SCENE_CENTER_X, SCENE_CENTER_Y - 40, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  // Add InteractionZone component (automatic trigger, no input required)
  const interactionZone = new InteractionZone({
    id: 'crime_scene_alley',
    type: 'trigger',
    radius: 150, // 300x300 area (radius = 150)
    requiresInput: false, // Automatic trigger
    prompt: 'Crime Scene',
    active: true,
    oneShot: true, // Only trigger once
    data: {
      areaId: 'crime_scene_alley'
    }
  });
  interactionZone.type = 'InteractionZone';
  componentRegistry.addComponent(entityId, interactionZone);

  const triggerComponent = new Trigger({
    id: 'crime_scene_alley',
    radius: interactionZone.radius,
    once: interactionZone.oneShot,
    eventOnEnter: 'area:entered',
    eventOnExit: 'area:exited',
    targetTags: ['player'],
    requiredComponents: ['Transform'],
    data: {
      areaId: 'crime_scene_alley',
      triggerType: 'crime_scene',
      questTrigger: true,
    },
  });
  componentRegistry.addComponent(entityId, 'Trigger', triggerComponent);

  // Add trigger collider
  const collider = new Collider({
    type: 'circle',
    radius: CRIME_SCENE_WIDTH / 4,
    isTrigger: true,
    isStatic: true,
    tags: ['area_trigger']
  });
  collider.type = 'Collider';
  componentRegistry.addComponent(entityId, collider);

  // Add visual indicator (semi-transparent area)
  const sprite = new Sprite({
    image: null,
    width: CRIME_SCENE_WIDTH * 0.75,
    height: CRIME_SCENE_HEIGHT * 0.75,
    layer: 'ground',
    zIndex: 1,
    color: '#ff6f61',
    visible: true,
    alpha: 0.18 // Subtle neon wash
  });
  sprite.type = 'Sprite';
  componentRegistry.addComponent(entityId, sprite);

  // Set up trigger event listener
  // Note: The InteractionSystem will handle emitting 'area:entered' event
  // when player enters this zone

  return entityId;
}

/**
 * Create boundary wall entity
 * @param {Object} entityManager
 * @param {Object} componentRegistry
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {string} Entity ID
 */
function createBoundary(entityManager, componentRegistry, x, y, width, height) {
  const entityId = entityManager.createEntity('boundary');

  // Add Transform component
  const transform = new Transform(x + width / 2, y + height / 2, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  // Add Collider component (solid wall)
  const collider = new Collider({
    type: 'AABB',
    width,
    height,
    offsetX: -width / 2,
    offsetY: -height / 2,
    isTrigger: false,
    isStatic: true,
    tags: ['boundary', 'solid']
  });
  collider.type = 'Collider';
  componentRegistry.addComponent(entityId, collider);

  // Add Sprite component (visible wall)
  const sprite = new Sprite({
    image: null,
    width,
    height,
    layer: 'environment',
    zIndex: 2,
    color: '#2f3d5c',
    visible: true,
    alpha: 0.9
  });
  sprite.type = 'Sprite';
  componentRegistry.addComponent(entityId, sprite);

  return entityId;
}

/**
 * Unload Act 1 scene (cleanup)
 * @param {Object} entityManager
 * @param {Array<string>} sceneEntities - Entity IDs to remove
 */
export function unloadAct1Scene(entityManager, sceneEntities) {
  console.log('[Act1Scene] Unloading Act 1 scene...');

  for (const entityId of sceneEntities) {
    entityManager.removeEntity(entityId);
  }

  console.log('[Act1Scene] Act 1 scene unloaded');
}

/**
 * Create collection of crime scene visual set dressing entities
 * @param {Object} entityManager
 * @param {Object} componentRegistry
 * @returns {Array<string>} Entity IDs
 */
function createCrimeSceneVisuals(entityManager, componentRegistry) {
  const entities = [];

  entities.push(createGroundDecal(entityManager, componentRegistry));
  entities.push(...createCautionTape(entityManager, componentRegistry));
  entities.push(...createEvidenceMarkers(entityManager, componentRegistry));
  entities.push(...createAmbientProps(entityManager, componentRegistry));

  return entities;
}

function createGroundDecal(entityManager, componentRegistry) {
  const entityId = entityManager.createEntity('crime_scene_ground');
  const transform = new Transform(SCENE_CENTER_X, SCENE_CENTER_Y, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  const sprite = new Sprite({
    width: CRIME_SCENE_WIDTH,
    height: CRIME_SCENE_HEIGHT,
    layer: 'ground',
    zIndex: 0,
    color: '#141d2c',
    alpha: 0.82,
    visible: true
  });
  componentRegistry.addComponent(entityId, 'Sprite', sprite);

  return entityId;
}

function createCautionTape(entityManager, componentRegistry) {
  const stripeConfigs = [
    { rotation: 0.12, offsetX: 0, offsetY: -30 },
    { rotation: -0.18, offsetX: 30, offsetY: 40 }
  ];

  return stripeConfigs.map((config, index) => {
    const entityId = entityManager.createEntity(`crime_scene_tape_${index}`);
    const transform = new Transform(
      SCENE_CENTER_X + config.offsetX,
      SCENE_CENTER_Y + config.offsetY,
      config.rotation,
      1,
      1
    );
    componentRegistry.addComponent(entityId, 'Transform', transform);

    const sprite = new Sprite({
      width: CRIME_SCENE_WIDTH * 0.8,
      height: 18,
      layer: 'ground',
      zIndex: 2,
      color: '#f9c74f',
      alpha: 0.7,
      visible: true
    });
    componentRegistry.addComponent(entityId, 'Sprite', sprite);

    return entityId;
  });
}

function createEvidenceMarkers(entityManager, componentRegistry) {
  const markerConfigs = [
    { x: SCENE_CENTER_X - 120, y: SCENE_CENTER_Y - 20 },
    { x: SCENE_CENTER_X + 40, y: SCENE_CENTER_Y - 80 },
    { x: SCENE_CENTER_X + 110, y: SCENE_CENTER_Y + 20 },
    { x: SCENE_CENTER_X - 40, y: SCENE_CENTER_Y + 60 }
  ];

  return markerConfigs.map((marker, index) => {
    const entityId = entityManager.createEntity(`crime_scene_marker_${index}`);
    const transform = new Transform(marker.x, marker.y, 0, 1, 1);
    componentRegistry.addComponent(entityId, 'Transform', transform);

    const sprite = new Sprite({
      width: 18,
      height: 24,
      layer: 'environment',
      zIndex: 5,
      color: '#ffd166',
      alpha: 0.85,
      visible: true
    });
    componentRegistry.addComponent(entityId, 'Sprite', sprite);

    return entityId;
  });
}

function createAmbientProps(entityManager, componentRegistry) {
  const propConfigs = [
    {
      id: 'ambient_floodlight_left',
      x: SCENE_CENTER_X - 220,
      y: SCENE_CENTER_Y - 120,
      width: 36,
      height: 140,
      color: '#118ab2',
      alpha: 0.85
    },
    {
      id: 'ambient_floodlight_right',
      x: SCENE_CENTER_X + 240,
      y: SCENE_CENTER_Y - 90,
      width: 36,
      height: 120,
      color: '#073b4c',
      alpha: 0.8
    },
    {
      id: 'ambient_evidence_table',
      x: SCENE_CENTER_X - 180,
      y: SCENE_CENTER_Y + 150,
      width: 140,
      height: 40,
      color: '#ef476f',
      alpha: 0.9
    },
    {
      id: 'ambient_holo_screen',
      x: SCENE_CENTER_X + 220,
      y: SCENE_CENTER_Y + 140,
      width: 160,
      height: 48,
      color: '#06d6a0',
      alpha: 0.78
    }
  ];

  return propConfigs.map((config) => {
    const entityId = entityManager.createEntity(config.id);
    const transform = new Transform(config.x, config.y, 0, 1, 1);
    componentRegistry.addComponent(entityId, 'Transform', transform);

    const sprite = new Sprite({
      width: config.width,
      height: config.height,
      layer: 'environment',
      zIndex: 4,
      color: config.color,
      alpha: config.alpha,
      visible: true
    });
    componentRegistry.addComponent(entityId, 'Sprite', sprite);

    return entityId;
  });
}
