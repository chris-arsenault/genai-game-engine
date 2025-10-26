/**
 * MovementSystem - applies velocity to transform positions.
 * Handles frame-rate independent movement with optional friction and max speed clamping.
 */
import { System } from '../ecs/System.js';

export class MovementSystem extends System {
  /**
   * Creates movement system
   * @param {ComponentRegistry} componentRegistry - Component registry
   * @param {EventBus} eventBus - Event bus
   */
  constructor(componentRegistry, eventBus) {
    super(componentRegistry, eventBus, ['Transform', 'Velocity']);
    this.priority = 10; // Run before collision detection
  }

  /**
   * Update entity positions based on velocity
   * @param {number} deltaTime - Delta time in seconds
   * @param {number[]} entities - Entities with Transform and Velocity
   */
  update(deltaTime, entities) {
    for (const entityId of entities) {
      const transform = this.getComponent(entityId, 'Transform');
      const velocity = this.getComponent(entityId, 'Velocity');

      if (!transform || !velocity) continue;

      // Apply friction before movement
      velocity.applyFriction(deltaTime);

      // Clamp to max speed
      velocity.clampToMaxSpeed();

      // Update position
      transform.x += velocity.vx * deltaTime;
      transform.y += velocity.vy * deltaTime;
    }
  }
}
