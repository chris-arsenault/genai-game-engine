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

/**
 * Load Act 1 scene
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {Object} eventBus - Event bus instance
 * @returns {Object} Scene data with playerId and entity IDs
 */
export async function loadAct1Scene(entityManager, componentRegistry, eventBus) {
  console.log('[Act1Scene] Loading Act 1 scene...');

  const sceneEntities = [];

  // 1. Create player at spawn point
  const playerId = createPlayerEntity(entityManager, componentRegistry, 150, 300);
  console.log(`[Act1Scene] Player created: ${playerId}`);

  // 2. Create crime scene area trigger
  // This trigger completes objective 1: "Arrive at the crime scene"
  const areaTriggerId = createCrimeSceneArea(entityManager, componentRegistry, eventBus);
  sceneEntities.push(areaTriggerId);
  console.log(`[Act1Scene] Crime scene area created: ${areaTriggerId}`);

  // 3. Create evidence items
  // 3 visible evidence (objectives 2, 3) + 2 hidden evidence (objective 6)
  const evidenceItems = [
    {
      x: 300,
      y: 250,
      id: 'evidence_fingerprint',
      type: 'forensic',
      category: 'fingerprint',
      title: 'Fingerprint',
      description: 'A partial fingerprint found on the neural extractor device.',
      caseId: 'case_001_hollow_case',
      hidden: false,
      derivedClues: ['clue_fingerprint_match']
    },
    {
      x: 400,
      y: 200,
      id: 'evidence_bloodstain',
      type: 'forensic',
      category: 'biological',
      title: 'Bloodstain',
      description: "A small bloodstain pattern near Alex's body.",
      caseId: 'case_001_hollow_case',
      hidden: false,
      derivedClues: ['clue_struggle']
    },
    {
      x: 500,
      y: 280,
      id: 'evidence_memory_chip',
      type: 'digital',
      category: 'memory_chip',
      title: 'Memory Chip',
      description: 'A NeuroSync memory chip found at the scene.',
      caseId: 'case_001_hollow_case',
      hidden: false,
      derivedClues: ['clue_neurosynch_connection']
    },
    {
      x: 320,
      y: 350,
      id: 'evidence_hidden_note',
      type: 'physical',
      category: 'document',
      title: 'Hidden Note',
      description: 'A cryptic note hidden under debris. Requires Detective Vision.',
      caseId: 'case_001_hollow_case',
      hidden: true,
      derivedClues: ['clue_eraser_signature']
    },
    {
      x: 450,
      y: 320,
      id: 'evidence_neural_extractor',
      type: 'physical',
      category: 'device',
      title: 'Neural Extractor',
      description: 'The device used to extract consciousness. Hidden in shadows.',
      caseId: 'case_001_hollow_case',
      hidden: true,
      requires: 'detective_vision',
      derivedClues: ['clue_extraction_tech', 'clue_serial_number']
    }
  ];

  for (const evidenceData of evidenceItems) {
    const evidenceId = createEvidenceEntity(entityManager, componentRegistry, evidenceData);
    sceneEntities.push(evidenceId);
  }
  console.log(`[Act1Scene] Created ${evidenceItems.length} evidence items`);

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

  // 5. Create Captain Reese NPC (for objective 9)
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

  // 6. Create boundary walls
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

  // 7. Set up Detective Vision tutorial trigger
  // After collecting 3 evidence, unlock Detective Vision (objective 5)
  let evidenceCollectedCount = 0;
  const requiredEvidenceForVision = 3;

  eventBus.on('evidence:collected', (data) => {
    if (data.caseId === 'case_001_hollow_case') {
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

  console.log('[Act1Scene] Act 1 scene loaded successfully');

  return {
    playerId,
    sceneEntities,
    sceneName: 'act1_hollow_case',
    spawnPoint: { x: 150, y: 300 }
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
  const transform = new Transform(350, 250, 0, 1, 1);
  transform.type = 'Transform';
  componentRegistry.addComponent(entityId, transform);

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

  // Add trigger collider
  const collider = new Collider({
    type: 'circle',
    radius: 150,
    isTrigger: true,
    isStatic: true,
    tags: ['area_trigger']
  });
  collider.type = 'Collider';
  componentRegistry.addComponent(entityId, collider);

  // Add visual indicator (semi-transparent area)
  const sprite = new Sprite({
    image: null,
    width: 300,
    height: 300,
    layer: 'ground',
    zIndex: 1,
    color: '#FF0000',
    visible: true,
    alpha: 0.1 // Very faint red tint
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
  transform.type = 'Transform';
  componentRegistry.addComponent(entityId, transform);

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
    color: '#333333',
    visible: true
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
