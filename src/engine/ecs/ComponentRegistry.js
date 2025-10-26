/**
 * ComponentRegistry - stores component data and provides efficient queries.
 * Components are stored in a Map<ComponentType, Map<EntityID, ComponentData>> structure
 * for cache-friendly data layout and O(1) component access.
 *
 * Query optimization: Uses smallest-set optimization for O(n) queries where n = smallest
 * component set size.
 *
 * @class ComponentRegistry
 */
export class ComponentRegistry {
  /**
   * Creates a new component registry.
   * @param {EntityManager} entityManager - Entity manager for lifecycle coordination
   */
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.components = new Map(); // componentType -> Map<entityId, componentData>
    this.queryCache = new Map(); // Cache for query results (cleared on component changes)
  }

  /**
   * Adds a component to an entity.
   * @param {number} entityId - Entity ID
   * @param {Component} component - Component instance
   * @throws {Error} If entity doesn't exist
   */
  addComponent(entityId, component) {
    if (!this.entityManager.hasEntity(entityId)) {
      throw new Error(`Cannot add component to non-existent entity ${entityId}`);
    }

    const componentType = component.type;

    // Create component type storage if needed
    if (!this.components.has(componentType)) {
      this.components.set(componentType, new Map());
    }

    // Store component data
    this.components.get(componentType).set(entityId, component);

    // Update entity's component type list
    this.entityManager.addComponentType(entityId, componentType);

    // Invalidate query cache
    this.queryCache.clear();
  }

  /**
   * Removes a component from an entity.
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type to remove
   * @returns {boolean} True if component was removed, false if not found
   */
  removeComponent(entityId, componentType) {
    const typeMap = this.components.get(componentType);
    if (!typeMap) {
      return false;
    }

    const removed = typeMap.delete(entityId);
    if (removed) {
      // Update entity's component type list
      this.entityManager.removeComponentType(entityId, componentType);

      // Invalidate query cache
      this.queryCache.clear();
    }

    return removed;
  }

  /**
   * Gets a component from an entity.
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   * @returns {Component|undefined} Component data or undefined if not found
   */
  getComponent(entityId, componentType) {
    const typeMap = this.components.get(componentType);
    return typeMap ? typeMap.get(entityId) : undefined;
  }

  /**
   * Checks if entity has a component.
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   * @returns {boolean} True if entity has component
   */
  hasComponent(entityId, componentType) {
    const typeMap = this.components.get(componentType);
    return typeMap ? typeMap.has(entityId) : false;
  }

  /**
   * Gets all components of a specific type.
   * @param {string} componentType - Component type
   * @returns {Map<number, Component>} Map of entityId -> component
   */
  getComponentsOfType(componentType) {
    return this.components.get(componentType) || new Map();
  }

  /**
   * Queries entities that have ALL specified components.
   * Uses smallest-set optimization for performance: O(n) where n = smallest component set.
   *
   * @param {...string} componentTypes - Component types to query
   * @returns {number[]} Array of entity IDs matching query
   *
   * @example
   * // Get all entities with Position and Velocity
   * const movingEntities = registry.queryEntities('Position', 'Velocity');
   */
  queryEntities(...componentTypes) {
    if (componentTypes.length === 0) {
      return this.entityManager.getAllEntities();
    }

    // Check cache
    const cacheKey = componentTypes.sort().join(',');
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey);
    }

    // Find smallest component set for optimization
    let smallestType = componentTypes[0];
    let smallestSize = this.components.get(componentTypes[0])?.size || 0;

    for (let i = 1; i < componentTypes.length; i++) {
      const currentSize = this.components.get(componentTypes[i])?.size || 0;
      if (currentSize < smallestSize) {
        smallestType = componentTypes[i];
        smallestSize = currentSize;
      }
    }

    // If smallest set is empty, no entities match
    if (smallestSize === 0) {
      this.queryCache.set(cacheKey, []);
      return [];
    }

    // Iterate through smallest set and check if entity has all other components
    const smallestSet = this.components.get(smallestType);
    const result = [];

    for (const entityId of smallestSet.keys()) {
      // Check if entity is active
      if (!this.entityManager.isActive(entityId)) {
        continue;
      }

      // Check if entity has all required components
      let hasAll = true;
      for (const type of componentTypes) {
        if (type === smallestType) {
          continue;
        }
        if (!this.hasComponent(entityId, type)) {
          hasAll = false;
          break;
        }
      }

      if (hasAll) {
        result.push(entityId);
      }
    }

    // Cache result
    this.queryCache.set(cacheKey, result);
    return result;
  }

  /**
   * Queries entities that have ANY of the specified components.
   * @param {...string} componentTypes - Component types to query
   * @returns {number[]} Array of entity IDs matching query
   */
  queryEntitiesAny(...componentTypes) {
    if (componentTypes.length === 0) {
      return [];
    }

    const resultSet = new Set();

    for (const type of componentTypes) {
      const typeMap = this.components.get(type);
      if (typeMap) {
        for (const entityId of typeMap.keys()) {
          if (this.entityManager.isActive(entityId)) {
            resultSet.add(entityId);
          }
        }
      }
    }

    return Array.from(resultSet);
  }

  /**
   * Removes all components from an entity.
   * Called by EntityManager.destroyEntity.
   *
   * @param {number} entityId - Entity ID
   */
  removeAllComponents(entityId) {
    const componentTypes = this.entityManager.getComponentTypes(entityId);

    for (const type of componentTypes) {
      this.removeComponent(entityId, type);
    }
  }

  /**
   * Gets total component count across all entities.
   * @returns {number} Total component count
   */
  getComponentCount() {
    let count = 0;
    for (const typeMap of this.components.values()) {
      count += typeMap.size;
    }
    return count;
  }

  /**
   * Gets component count for a specific type.
   * @param {string} componentType - Component type
   * @returns {number} Component count
   */
  getComponentCountOfType(componentType) {
    const typeMap = this.components.get(componentType);
    return typeMap ? typeMap.size : 0;
  }

  /**
   * Clears all components (used for level transitions).
   */
  clear() {
    this.components.clear();
    this.queryCache.clear();
  }

  /**
   * Gets all registered component types.
   * @returns {string[]} Array of component type names
   */
  getComponentTypes() {
    return Array.from(this.components.keys());
  }
}
