/**
 * EntityManager - manages entity lifecycle (creation, destruction, queries).
 * Entities are lightweight numeric IDs with pooled metadata to minimize GC churn.
 * Tracks tags, activation state, and component signatures for query acceleration.
 *
 * @class EntityManager
 */
export class EntityManager {
  /**
   * @param {object} [options]
   * @param {import('./ComponentRegistry.js').ComponentRegistry} [options.componentRegistry]
   * @param {Function|Function[]} [options.onEntityDestroyed] Listener(s) invoked on destroy
   */
  constructor({ componentRegistry = null, onEntityDestroyed = [] } = {}) {
    this.nextEntityId = 0;
    this.entities = new Map(); // entityId -> metadata
    this.entitiesByTag = new Map(); // tag -> Set<entityId>
    this.recycledIds = []; // ID reuse pool
    this.entityPool = []; // Metadata reuse pool
    this.componentRegistry = componentRegistry;
    this.entityDestroyedListeners = new Set();
    this.activeEntityCount = 0;
    this.entityStats = {
      created: 0,
      recycled: 0,
      pooledReused: 0,
    };

    const listeners = Array.isArray(onEntityDestroyed)
      ? onEntityDestroyed
      : [onEntityDestroyed];
    listeners
      .filter(Boolean)
      .forEach((listener) => this.entityDestroyedListeners.add(listener));
  }

  /**
   * Creates a new entity and returns its unique ID.
   * Reuses IDs and metadata records to keep allocations predictable.
   *
   * @param {string|null} [tag=null] Optional tag (player, enemy, etc.)
   * @param {object} [options]
   * @param {boolean} [options.active=true] Whether entity starts active
   * @returns {number} Unique entity ID
   */
  createEntity(tag = null, { active = true } = {}) {
    let id;

    if (this.recycledIds.length > 0) {
      id = this.recycledIds.pop();
    } else {
      id = this.nextEntityId++;
    }

    const metadata = this.#acquireMetadata();
    metadata.id = id;
    metadata.active = active;
    metadata.tag = tag;
    metadata.componentTypes.clear();
    metadata.version += 1;

    this.entities.set(id, metadata);

    if (tag) {
      if (!this.entitiesByTag.has(tag)) {
        this.entitiesByTag.set(tag, new Set());
      }
      this.entitiesByTag.get(tag).add(id);
    }

    if (active) {
      this.activeEntityCount += 1;
    }

    this.entityStats.created += 1;
    return id;
  }

  /**
   * Destroys an entity and removes all its components.
   * ID and metadata are recycled for future use.
   *
   * @param {number} entityId
   * @param {object} [options]
   * @param {boolean} [options.removeComponents=true] Toggle component cleanup
   * @returns {boolean} True if entity was destroyed
   */
  destroyEntity(entityId, { removeComponents = true } = {}) {
    const metadata = this.entities.get(entityId);
    if (!metadata) {
      return false;
    }

    if (metadata.tag) {
      const tagSet = this.entitiesByTag.get(metadata.tag);
      if (tagSet) {
        tagSet.delete(entityId);
        if (tagSet.size === 0) {
          this.entitiesByTag.delete(metadata.tag);
        }
      }
    }

    if (metadata.active) {
      this.activeEntityCount -= 1;
    }

    if (removeComponents && this.componentRegistry) {
      this.componentRegistry.removeAllComponents(entityId);
    } else {
      metadata.componentTypes.clear();
    }

    this.entities.delete(entityId);
    this.recycledIds.push(entityId);
    this.entityStats.recycled += 1;

    this.#emitEntityDestroyed(entityId, metadata);
    this.#releaseMetadata(metadata);

    return true;
  }

  /**
   * Checks if an entity exists.
   * @param {number} entityId
   * @returns {boolean}
   */
  hasEntity(entityId) {
    return this.entities.has(entityId);
  }

  /**
   * Returns metadata for an entity (internal use).
   * @param {number} entityId
   * @returns {object|undefined}
   */
  getEntity(entityId) {
    return this.entities.get(entityId);
  }

  /**
   * Returns an array of active entity IDs.
   * @returns {number[]}
   */
  getAllEntities() {
    const result = [];
    for (const [id, metadata] of this.entities) {
      if (metadata.active) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Returns entity IDs for a given tag.
   * @param {string} tag
   * @returns {number[]}
   */
  getEntitiesByTag(tag) {
    const tagSet = this.entitiesByTag.get(tag);
    if (!tagSet) {
      return [];
    }

    const result = [];
    for (const id of tagSet) {
      const metadata = this.entities.get(id);
      if (metadata && metadata.active) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Sets entity tag and updates indices.
   * @param {number} entityId
   * @param {string|null} tag
   */
  setTag(entityId, tag) {
    const metadata = this.entities.get(entityId);
    if (!metadata) {
      return;
    }

    if (metadata.tag) {
      const oldTagSet = this.entitiesByTag.get(metadata.tag);
      if (oldTagSet) {
        oldTagSet.delete(entityId);
        if (oldTagSet.size === 0) {
          this.entitiesByTag.delete(metadata.tag);
        }
      }
    }

    metadata.tag = tag;

    if (tag) {
      if (!this.entitiesByTag.has(tag)) {
        this.entitiesByTag.set(tag, new Set());
      }
      this.entitiesByTag.get(tag).add(entityId);
    }
  }

  /**
   * Alias retained for backwards compatibility.
   * @param {number} entityId
   * @param {string|null} tag
   */
  tagEntity(entityId, tag) {
    this.setTag(entityId, tag);
  }

  /**
   * Returns entity tag.
   * @param {number} entityId
   * @returns {string|null}
   */
  getTag(entityId) {
    const metadata = this.entities.get(entityId);
    return metadata ? metadata.tag : null;
  }

  /**
   * Activates an entity.
   * @param {number} entityId
   */
  activate(entityId) {
    const metadata = this.entities.get(entityId);
    if (metadata && !metadata.active) {
      metadata.active = true;
      this.activeEntityCount += 1;
    }
  }

  /**
   * Deactivates an entity.
   * @param {number} entityId
   */
  deactivate(entityId) {
    const metadata = this.entities.get(entityId);
    if (metadata && metadata.active) {
      metadata.active = false;
      this.activeEntityCount -= 1;
    }
  }

  /**
   * Returns whether an entity is active.
   * @param {number} entityId
   * @returns {boolean}
   */
  isActive(entityId) {
    const metadata = this.entities.get(entityId);
    return metadata ? metadata.active : false;
  }

  /**
   * Called by ComponentRegistry when a component is attached.
   * @param {number} entityId
   * @param {string} componentType
   */
  addComponentType(entityId, componentType) {
    const metadata = this.entities.get(entityId);
    if (metadata) {
      metadata.componentTypes.add(componentType);
    }
  }

  /**
   * Called by ComponentRegistry when a component is removed.
   * @param {number} entityId
   * @param {string} componentType
   */
  removeComponentType(entityId, componentType) {
    const metadata = this.entities.get(entityId);
    if (metadata) {
      metadata.componentTypes.delete(componentType);
    }
  }

  /**
   * Returns component types for an entity.
   * @param {number} entityId
   * @returns {Set<string>}
   */
  getComponentTypes(entityId) {
    const metadata = this.entities.get(entityId);
    return metadata ? metadata.componentTypes : EntityManager.EMPTY_COMPONENT_SET;
  }

  /**
   * Returns total entity count.
   * @returns {number}
   */
  getEntityCount() {
    return this.entities.size;
  }

  /**
   * Returns the number of active entities.
   * @returns {number}
   */
  getActiveEntityCount() {
    return this.activeEntityCount;
  }

  /**
   * Queries active entities that contain all component types.
   * @param {...string} componentTypes
   * @returns {number[]}
   */
  queryByComponents(...componentTypes) {
    if (componentTypes.length === 0) {
      return this.getAllEntities();
    }

    if (this.componentRegistry?.queryEntities) {
      return this.componentRegistry.queryEntities(...componentTypes);
    }

    const result = [];
    for (const [entityId, metadata] of this.entities) {
      if (!metadata.active) {
        continue;
      }

      let matches = true;
      for (const type of componentTypes) {
        if (!metadata.componentTypes.has(type)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        result.push(entityId);
      }
    }
    return result;
  }

  /**
   * Iterates through entities.
   * @param {(entityId:number, metadata:object)=>void} callback
   * @param {object} [options]
   * @param {boolean} [options.includeInactive=false]
   */
  forEachEntity(callback, { includeInactive = false } = {}) {
    for (const [entityId, metadata] of this.entities) {
      if (!includeInactive && !metadata.active) {
        continue;
      }
      callback(entityId, metadata);
    }
  }

  /**
   * Clears all entities, optionally retaining ID progression.
   * @param {object} [options]
   * @param {boolean} [options.resetIds=true]
   */
  clear({ resetIds = true } = {}) {
    if (this.componentRegistry?.clear) {
      this.componentRegistry.clear();
    }

    for (const [entityId, metadata] of this.entities) {
      this.#emitEntityDestroyed(entityId, metadata);
      this.#releaseMetadata(metadata);
    }

    this.entities.clear();
    this.entitiesByTag.clear();
    this.recycledIds = [];
    this.activeEntityCount = 0;

    if (resetIds) {
      this.nextEntityId = 0;
    }
  }

  /**
   * Returns instrumentation stats for profiling.
   * @returns {{created:number,recycled:number,pooledReused:number,active:number,poolSize:number}}
   */
  getStats() {
    return {
      created: this.entityStats.created,
      recycled: this.entityStats.recycled,
      pooledReused: this.entityStats.pooledReused,
      active: this.activeEntityCount,
      poolSize: this.entityPool.length,
    };
  }

  /**
   * Registers a destroy listener.
   * @param {(entityId:number, metadata:object)=>void} listener
   */
  onEntityDestroyed(listener) {
    if (listener) {
      this.entityDestroyedListeners.add(listener);
    }
  }

  /**
   * Unregisters a destroy listener.
   * @param {(entityId:number, metadata:object)=>void} listener
   */
  offEntityDestroyed(listener) {
    if (listener) {
      this.entityDestroyedListeners.delete(listener);
    }
  }

  /**
   * Allows late binding of a component registry.
   * @param {import('./ComponentRegistry.js').ComponentRegistry} registry
   */
  setComponentRegistry(registry) {
    this.componentRegistry = registry;
  }

  #acquireMetadata() {
    if (this.entityPool.length > 0) {
      this.entityStats.pooledReused += 1;
      return this.entityPool.pop();
    }

    return {
      id: -1,
      active: false,
      tag: null,
      componentTypes: new Set(),
      version: 0,
    };
  }

  #releaseMetadata(metadata) {
    metadata.active = false;
    metadata.tag = null;
    metadata.componentTypes.clear();
    this.entityPool.push(metadata);
  }

  #emitEntityDestroyed(entityId, metadata) {
    if (this.entityDestroyedListeners.size === 0) {
      return;
    }

    for (const listener of this.entityDestroyedListeners) {
      listener(entityId, metadata);
    }
  }
}

EntityManager.EMPTY_COMPONENT_SET = Object.freeze(new Set());
