/**
 * System base class - contains logic that operates on entities with specific components.
 * Systems should be stateless where possible and operate on component data.
 * Each system declares required components and processes matching entities each frame.
 *
 * @class System
 * @example
 * class MovementSystem extends System {
 *   constructor(componentRegistry, eventBus) {
 *     super(componentRegistry, eventBus, ['Position', 'Velocity']);
 *   }
 *
 *   update(deltaTime, entities) {
 *     for (const entityId of entities) {
 *       const pos = this.getComponent(entityId, 'Position');
 *       const vel = this.getComponent(entityId, 'Velocity');
 *       pos.x += vel.vx * deltaTime;
 *       pos.y += vel.vy * deltaTime;
 *     }
 *   }
 * }
 */
export class System {
  /**
   * Creates a new system.
   * @param {ComponentRegistry} componentRegistry - Component storage and query interface
   * @param {EventBus} eventBus - Event pub/sub system
   * @param {string[]} requiredComponents - Component types this system operates on
   */
  constructor(componentRegistry, eventBus, requiredComponents = []) {
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.requiredComponents = requiredComponents;
    this.priority = 50; // Default priority (0 = highest, 100 = lowest)
    this.enabled = true;
  }

  /**
   * Initialize system (called once on startup).
   * Override this to set up event listeners, allocate resources, etc.
   */
  init() {
    // Override in subclasses
  }

  /**
   * Update system (called every frame).
   * Override this to implement system logic.
   *
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {number[]} entities - Entity IDs that match required components
   */
  update(deltaTime, entities) {
    // Override in subclasses
  }

  /**
   * Cleanup system (called on shutdown).
   * Override this to remove event listeners, deallocate resources, etc.
   */
  cleanup() {
    // Override in subclasses
  }

  /**
   * Helper to get component from entity.
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   * @returns {Component|undefined} Component data or undefined
   */
  getComponent(entityId, componentType) {
    return this.componentRegistry.getComponent(entityId, componentType);
  }

  /**
   * Helper to check if entity has component.
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   * @returns {boolean} True if entity has component
   */
  hasComponent(entityId, componentType) {
    return this.componentRegistry.hasComponent(entityId, componentType);
  }

  /**
   * Enable this system (allows update to run).
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable this system (prevents update from running).
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check if system is enabled.
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Set system priority (lower = runs earlier).
   * @param {number} priority - Priority value (0-100)
   */
  setPriority(priority) {
    this.priority = priority;
  }

  /**
   * Get system priority.
   * @returns {number} Priority value
   */
  getPriority() {
    return this.priority;
  }

  /**
   * Get required component types for this system.
   * @returns {string[]} Required component types
   */
  getRequiredComponents() {
    return this.requiredComponents;
  }
}
