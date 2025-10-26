/**
 * Entity class - represents a unique game object as an ID.
 * Entities are lightweight containers that hold references to components.
 * In ECS architecture, entities don't contain logic or data directly.
 *
 * @class Entity
 */
export class Entity {
  /**
   * Creates a new entity.
   * @param {number} id - Unique entity identifier
   */
  constructor(id) {
    this.id = id;
    this.active = true;
    this.tag = null;
  }

  /**
   * Sets a human-readable tag for this entity.
   * Useful for debugging and entity queries by tag.
   *
   * @param {string} tag - Tag name (e.g., 'player', 'enemy', 'collectible')
   */
  setTag(tag) {
    this.tag = tag;
  }

  /**
   * Gets the entity's tag.
   * @returns {string|null} Tag name or null if not tagged
   */
  getTag() {
    return this.tag;
  }

  /**
   * Activates the entity (enables it for system updates).
   */
  activate() {
    this.active = true;
  }

  /**
   * Deactivates the entity (skips system updates but doesn't destroy).
   */
  deactivate() {
    this.active = false;
  }

  /**
   * Checks if entity is active.
   * @returns {boolean} True if active, false otherwise
   */
  isActive() {
    return this.active;
  }
}
