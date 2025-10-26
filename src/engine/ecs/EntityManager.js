/**
 * EntityManager - manages entity lifecycle (creation, destruction, queries).
 * Entities are lightweight unique IDs. The EntityManager tracks which entities exist
 * and maintains entity metadata (tags, active status).
 *
 * @class EntityManager
 */
export class EntityManager {
  constructor() {
    this.nextEntityId = 0;
    this.entities = new Map(); // entityId -> Entity metadata
    this.entitiesByTag = new Map(); // tag -> Set<entityId>
    this.recycledIds = []; // Reuse IDs from destroyed entities
  }

  /**
   * Creates a new entity and returns its unique ID.
   * Reuses IDs from destroyed entities when possible to keep IDs compact.
   *
   * @param {string|null} tag - Optional tag for entity (e.g., 'player', 'enemy')
   * @returns {number} Unique entity ID
   */
  createEntity(tag = null) {
    let id;

    // Reuse recycled ID if available, otherwise increment
    if (this.recycledIds.length > 0) {
      id = this.recycledIds.pop();
    } else {
      id = this.nextEntityId++;
    }

    // Store entity metadata
    this.entities.set(id, {
      id,
      active: true,
      tag,
      componentTypes: new Set(), // Track which components this entity has
    });

    // Index by tag if provided
    if (tag) {
      if (!this.entitiesByTag.has(tag)) {
        this.entitiesByTag.set(tag, new Set());
      }
      this.entitiesByTag.get(tag).add(id);
    }

    return id;
  }

  /**
   * Destroys an entity and removes all its components.
   * The entity ID is recycled for future use.
   *
   * @param {number} entityId - Entity ID to destroy
   * @returns {boolean} True if entity was destroyed, false if not found
   */
  destroyEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Remove from tag index
    if (entity.tag) {
      const tagSet = this.entitiesByTag.get(entity.tag);
      if (tagSet) {
        tagSet.delete(entityId);
        if (tagSet.size === 0) {
          this.entitiesByTag.delete(entity.tag);
        }
      }
    }

    // Remove entity
    this.entities.delete(entityId);

    // Recycle ID for future use
    this.recycledIds.push(entityId);

    return true;
  }

  /**
   * Checks if an entity exists.
   * @param {number} entityId - Entity ID to check
   * @returns {boolean} True if entity exists
   */
  hasEntity(entityId) {
    return this.entities.has(entityId);
  }

  /**
   * Gets all active entity IDs.
   * @returns {number[]} Array of active entity IDs
   */
  getAllEntities() {
    const result = [];
    for (const [id, entity] of this.entities) {
      if (entity.active) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Gets entities by tag.
   * @param {string} tag - Tag to query
   * @returns {number[]} Array of entity IDs with matching tag
   */
  getEntitiesByTag(tag) {
    const tagSet = this.entitiesByTag.get(tag);
    if (!tagSet) {
      return [];
    }

    // Filter by active status
    const result = [];
    for (const id of tagSet) {
      const entity = this.entities.get(id);
      if (entity && entity.active) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Sets entity tag.
   * @param {number} entityId - Entity ID
   * @param {string} tag - Tag name
   */
  setTag(entityId, tag) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return;
    }

    // Remove from old tag index
    if (entity.tag) {
      const oldTagSet = this.entitiesByTag.get(entity.tag);
      if (oldTagSet) {
        oldTagSet.delete(entityId);
        if (oldTagSet.size === 0) {
          this.entitiesByTag.delete(entity.tag);
        }
      }
    }

    // Add to new tag index
    entity.tag = tag;
    if (!this.entitiesByTag.has(tag)) {
      this.entitiesByTag.set(tag, new Set());
    }
    this.entitiesByTag.get(tag).add(entityId);
  }

  /**
   * Gets entity tag.
   * @param {number} entityId - Entity ID
   * @returns {string|null} Tag name or null
   */
  getTag(entityId) {
    const entity = this.entities.get(entityId);
    return entity ? entity.tag : null;
  }

  /**
   * Activates an entity (enables it for system updates).
   * @param {number} entityId - Entity ID
   */
  activate(entityId) {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.active = true;
    }
  }

  /**
   * Deactivates an entity (disables system updates but doesn't destroy).
   * @param {number} entityId - Entity ID
   */
  deactivate(entityId) {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.active = false;
    }
  }

  /**
   * Checks if entity is active.
   * @param {number} entityId - Entity ID
   * @returns {boolean} True if active
   */
  isActive(entityId) {
    const entity = this.entities.get(entityId);
    return entity ? entity.active : false;
  }

  /**
   * Registers that an entity has a component (called by ComponentRegistry).
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   */
  addComponentType(entityId, componentType) {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.componentTypes.add(componentType);
    }
  }

  /**
   * Unregisters that an entity has a component (called by ComponentRegistry).
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   */
  removeComponentType(entityId, componentType) {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.componentTypes.delete(componentType);
    }
  }

  /**
   * Gets component types for an entity.
   * @param {number} entityId - Entity ID
   * @returns {Set<string>} Set of component type names
   */
  getComponentTypes(entityId) {
    const entity = this.entities.get(entityId);
    return entity ? entity.componentTypes : new Set();
  }

  /**
   * Gets total entity count (including inactive).
   * @returns {number} Total entity count
   */
  getEntityCount() {
    return this.entities.size;
  }

  /**
   * Gets active entity count.
   * @returns {number} Active entity count
   */
  getActiveEntityCount() {
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.active) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clears all entities (used for level transitions).
   */
  clear() {
    this.entities.clear();
    this.entitiesByTag.clear();
    this.recycledIds = [];
    this.nextEntityId = 0;
  }
}
