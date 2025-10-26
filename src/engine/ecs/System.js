/**
 * Base System class
 * Systems contain logic that operates on entities with specific components
 */
export class System {
  constructor() {
    this.enabled = true;
    this.priority = 0; // Lower runs first
  }

  /**
   * Called once when system is added
   */
  init() {
    // Override in subclasses
  }

  /**
   * Called every frame
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {Entity[]} entities - All entities in the world
   */
  update(deltaTime, entities) {
    if (!this.enabled) {
      return;
    }

    const relevantEntities = this.filterEntities(entities);
    this.process(deltaTime, relevantEntities);
  }

  /**
   * Filter entities that have required components
   * Override to specify component requirements
   * @param {Entity[]} entities
   * @returns {Entity[]}
   */
  filterEntities(entities) {
    return entities.filter(e => e.alive);
  }

  /**
   * Process relevant entities
   * @param {number} deltaTime
   * @param {Entity[]} entities
   */
  process(deltaTime, entities) {
    // Override in subclasses
  }

  /**
   * Called when system is removed
   */
  cleanup() {
    // Override in subclasses
  }
}
