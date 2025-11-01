/**
 * @fileoverview LevelSpawnSystem - Spawns entities from procedural generation data
 * Converts spawn data arrays into ECS entities with proper components.
 * Integrates with spatial hash for collision detection and queries.
 */

import { System } from '../../engine/ecs/System.js';
import { createNPCEntity } from '../entities/NPCEntity.js';
import { createEvidenceEntity } from '../entities/EvidenceEntity.js';
import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { formatActionPrompt } from '../utils/controlBindingPrompts.js';

function shouldLog() {
  if (typeof __DEV__ !== 'undefined') {
    return Boolean(__DEV__);
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'test';
  }

  return true;
}

/**
 * ECS System that spawns entities from generation result data.
 * Listens for 'level:load' event and creates all NPCs, evidence, and objects.
 *
 * @class
 * @extends System
 * @example
 * const spawnSystem = new LevelSpawnSystem(ecs, eventBus, entityManager, spatialHash);
 * eventBus.emit('level:load', { spawnData });
 */
export class LevelSpawnSystem extends System {
  /**
   * Creates a new level spawn system
   * @param {ComponentRegistry} componentRegistry - Component registry
   * @param {EventBus} eventBus - Event bus
   * @param {EntityManager} entityManager - Entity manager
   * @param {SpatialHash} [spatialHash=null] - Optional spatial hash for indexing
   */
  constructor(componentRegistry, eventBus, entityManager, spatialHash = null) {
    super(componentRegistry, eventBus, []);

    this.entityManager = entityManager;
    this.spatialHash = spatialHash;

    // Track spawned level entities for cleanup
    this.levelEntities = new Set();

    // Set system priority (early, after engine systems)
    this.priority = 10;

    // Register event listeners
    this._registerEventListeners();
  }

  /**
   * Initialize system - register event listeners
   */
  init() {
    if (shouldLog()) {
      console.log('[LevelSpawnSystem] Initialized');
    }
  }

  /**
   * Update - no per-frame logic needed (spawning is event-driven)
   */
  update(deltaTime, entities) {
    // No per-frame update needed
  }

  /**
   * Cleanup - remove event listeners
   */
  cleanup() {
    this.eventBus.off('level:load', this._onLevelLoad);
    this.eventBus.off('level:clear', this._onLevelClear);
  }

  /**
   * Main entry point - spawns all entities from generation result
   * @param {object} spawnData - Spawn data with npcs, evidence, objects arrays
   * @returns {number} Total entities spawned
   */
  spawnFromGeneration(spawnData) {
    if (shouldLog()) {
      console.log('[LevelSpawnSystem] Spawning entities from generation data...');
    }

    const startTime = performance.now();

    // Clear existing level entities (keep player)
    this.clearLevel();

    let spawnedCount = 0;

    // Spawn NPCs
    if (spawnData.npcs && Array.isArray(spawnData.npcs)) {
      for (const npcData of spawnData.npcs) {
        const entityId = this.spawnNPC(npcData);
        if (entityId !== null) {
          this.levelEntities.add(entityId);
          spawnedCount++;
        }
      }
    }

    // Spawn evidence
    if (spawnData.evidence && Array.isArray(spawnData.evidence)) {
      for (const evidenceData of spawnData.evidence) {
        const entityId = this.spawnEvidence(evidenceData);
        if (entityId !== null) {
          this.levelEntities.add(entityId);
          spawnedCount++;
        }
      }
    }

    // Spawn objects
    if (spawnData.objects && Array.isArray(spawnData.objects)) {
      for (const objectData of spawnData.objects) {
        const entityId = this.spawnObject(objectData);
        if (entityId !== null) {
          this.levelEntities.add(entityId);
          spawnedCount++;
        }
      }
    }

    const elapsed = performance.now() - startTime;

    if (shouldLog()) {
      console.log(`[LevelSpawnSystem] Spawned ${spawnedCount} entities in ${elapsed.toFixed(2)}ms`);
    }

    // Emit level loaded event
    this.eventBus.emit('level:loaded', {
      entityCount: spawnedCount,
      spawnTime: elapsed,
    });

    return spawnedCount;
  }

  /**
   * Spawns an NPC entity from spawn data
   * @param {object} npcData - NPC spawn data
   * @returns {number|null} Entity ID or null if failed
   */
  spawnNPC(npcData) {
    try {
      // Use existing NPC entity factory
      const entityId = createNPCEntity(this.entityManager, this.componentRegistry, {
        x: npcData.position.x,
        y: npcData.position.y,
        id: npcData.npcId,
        name: npcData.name,
        faction: npcData.faction,
        hasDialogue: npcData.hasDialogue,
        dialogueId: npcData.dialogueId,
      });

      // Update spatial hash if available
      if (this.spatialHash && entityId !== null) {
        const transform = this.componentRegistry.getComponent(entityId, 'Transform');
        if (transform) {
          this.spatialHash.insert(entityId, transform.x, transform.y);
        }
      }

      return entityId;
    } catch (error) {
      if (shouldLog()) {
        console.error(`[LevelSpawnSystem] Failed to spawn NPC:`, npcData, error);
      }
      return null;
    }
  }

  /**
   * Spawns an evidence entity from spawn data
   * @param {object} evidenceData - Evidence spawn data
   * @returns {number|null} Entity ID or null if failed
   */
  spawnEvidence(evidenceData) {
    try {
      // Use existing evidence entity factory
      const entityId = createEvidenceEntity(this.entityManager, this.componentRegistry, {
        x: evidenceData.position.x,
        y: evidenceData.position.y,
        id: evidenceData.evidenceId,
        type: evidenceData.evidenceType || 'physical',
        category: 'case_evidence',
        title: evidenceData.title || 'Evidence',
        description: evidenceData.description || 'A piece of evidence',
        caseId: evidenceData.caseId,
        hidden: evidenceData.hidden || false,
        requires: evidenceData.requires || null,
        derivedClues: evidenceData.derivedClues || [],
      });

      // Update spatial hash if available
      if (this.spatialHash && entityId !== null) {
        const transform = this.componentRegistry.getComponent(entityId, 'Transform');
        if (transform) {
          this.spatialHash.insert(entityId, transform.x, transform.y);
        }
      }

      return entityId;
    } catch (error) {
      if (shouldLog()) {
        console.error(`[LevelSpawnSystem] Failed to spawn evidence:`, evidenceData, error);
      }
      return null;
    }
  }

  /**
   * Spawns an interactive object entity from spawn data
   * @param {object} objectData - Object spawn data
   * @returns {number|null} Entity ID or null if failed
   */
  spawnObject(objectData) {
    try {
      const entityId = this.entityManager.createEntity(objectData.type);

      // Add Transform component
      const transform = new Transform(
        objectData.position.x,
        objectData.position.y,
        0, 1, 1
      );
      transform.type = 'Transform';
      this.componentRegistry.addComponent(entityId, transform);

      // Add Sprite component
      const sprite = new Sprite({
        image: null,
        width: 32,
        height: 32,
        layer: 'entities',
        zIndex: 3,
        color: this._getObjectColor(objectData.type),
        visible: true,
      });
      sprite.type = 'Sprite';
      this.componentRegistry.addComponent(entityId, sprite);

      // Add Collider if object is solid
      if (objectData.type === 'furniture' || objectData.type === 'container') {
        const collider = new Collider({
          type: 'AABB',
          width: 30,
          height: 30,
          isTrigger: false,
          isStatic: true,
          tags: [objectData.type],
        });
        this.componentRegistry.addComponent(entityId, collider);
      }

      // Add InteractionZone if object is interactable
      if (objectData.interactable) {
        const interactionZone = new InteractionZone({
          id: `interaction_${objectData.objectId}`,
          type: objectData.type,
          radius: 48,
          requiresInput: true,
          prompt: this._getInteractionPrompt(objectData),
          promptAction: 'interact',
          active: true,
          oneShot: false,
          data: {
            objectId: objectData.objectId,
            locked: objectData.locked || false,
            contents: objectData.contents || [],
          },
        });
        this.componentRegistry.addComponent(entityId, 'InteractionZone', interactionZone);
      }

      // Update spatial hash if available
      if (this.spatialHash) {
        this.spatialHash.insert(entityId, objectData.position.x, objectData.position.y);
      }

      return entityId;
    } catch (error) {
      if (shouldLog()) {
        console.error(`[LevelSpawnSystem] Failed to spawn object:`, objectData, error);
      }
      return null;
    }
  }

  /**
   * Clears all level entities (keeps player and persistent entities)
   */
  clearLevel() {
    if (shouldLog()) {
      console.log(`[LevelSpawnSystem] Clearing ${this.levelEntities.size} level entities...`);
    }

    for (const entityId of this.levelEntities) {
      // Remove from spatial hash if available
      if (this.spatialHash) {
        this.spatialHash.remove(entityId);
      }

      // Destroy entity
      this.entityManager.destroyEntity(entityId);
    }

    this.levelEntities.clear();
  }

  // Private helper methods

  /**
   * Registers event listeners
   * @private
   */
  _registerEventListeners() {
    this._onLevelLoad = this._onLevelLoad.bind(this);
    this._onLevelClear = this._onLevelClear.bind(this);

    this.eventBus.on('level:load', this._onLevelLoad);
    this.eventBus.on('level:clear', this._onLevelClear);
  }

  /**
   * Event handler for level:load event
   * @private
   * @param {object} data - Event data with spawnData
   */
  _onLevelLoad(data) {
    if (data && data.spawnData) {
      this.spawnFromGeneration(data.spawnData);
    } else {
      console.warn('[LevelSpawnSystem] level:load event missing spawnData');
    }
  }

  /**
   * Event handler for level:clear event
   * @private
   */
  _onLevelClear() {
    this.clearLevel();
  }

  /**
   * Gets color for object type
   * @private
   * @param {string} type - Object type
   * @returns {string} Color hex code
   */
  _getObjectColor(type) {
    const colors = {
      'container': '#8B4513', // Brown
      'furniture': '#A0522D', // Sienna
      'door': '#696969', // Dim gray
      'terminal': '#00FFFF', // Cyan
    };
    return colors[type] || '#CCCCCC';
  }

  /**
   * Gets interaction prompt for object
   * @private
   * @param {object} objectData - Object data
   * @returns {string} Interaction prompt
   */
  _getInteractionPrompt(objectData) {
    if (!objectData || typeof objectData !== 'object') {
      return formatActionPrompt('interact', 'interact');
    }

    if (objectData.type === 'container') {
      const action = objectData.locked ? 'unlock container' : 'open container';
      return formatActionPrompt('interact', action);
    }

    if (objectData.type === 'terminal') {
      return formatActionPrompt('interact', 'access terminal');
    }

    if (objectData.type === 'door') {
      const action = objectData.locked ? 'unlock door' : 'open door';
      return formatActionPrompt('interact', action);
    }

    const label = typeof objectData.type === 'string' ? objectData.type : 'object';
    return formatActionPrompt('interact', `interact with ${label}`);
  }
}
