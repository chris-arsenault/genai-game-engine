/**
 * Entity class - lightweight wrapper around an ID
 * Part of the Entity-Component-System architecture
 */
export class Entity {
  constructor(id) {
    this.id = id;
    this.alive = true;
    this._components = new Map(); // ComponentType -> Component instance
  }

  /**
   * Add a component to this entity
   * @param {Component} component - Component instance
   * @returns {Entity} this entity for chaining
   */
  addComponent(component) {
    const type = component.constructor.name;
    this._components.set(type, component);
    return this;
  }

  /**
   * Remove a component by type
   * @param {string} componentType - Component class name
   */
  removeComponent(componentType) {
    this._components.delete(componentType);
  }

  /**
   * Get a component by type
   * @param {string} componentType - Component class name
   * @returns {Component|undefined}
   */
  getComponent(componentType) {
    return this._components.get(componentType);
  }

  /**
   * Check if entity has a component
   * @param {string} componentType - Component class name
   * @returns {boolean}
   */
  hasComponent(componentType) {
    return this._components.has(componentType);
  }

  /**
   * Get all component types
   * @returns {string[]}
   */
  getComponentTypes() {
    return Array.from(this._components.keys());
  }

  /**
   * Destroy this entity
   */
  destroy() {
    this.alive = false;
    this._components.clear();
  }
}
