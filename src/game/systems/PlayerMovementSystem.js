/**
 * PlayerMovementSystem
 *
 * Handles player WASD input and smooth movement.
 * Applies acceleration, friction, and velocity clamping.
 *
 * Priority: 10 (early in update loop)
 * Queries: [PlayerController, Transform]
 */

import { System } from '../../engine/ecs/System.js';
import { GameConfig } from '../config/GameConfig.js';

export class PlayerMovementSystem extends System {
  constructor(componentRegistry, eventBus, inputState) {
    super(componentRegistry, eventBus, ['PlayerController', 'Transform']);
    this.input = inputState;
    this.priority = 10;
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to relevant events
    this.eventBus.subscribe('game:pause', () => {
      this.paused = true;
    });

    this.eventBus.subscribe('game:resume', () => {
      this.paused = false;
    });

    this.paused = false;
  }

  /**
   * Update player movement each frame
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {Array<number>} entities - Entity IDs with required components
   */
  update(deltaTime, entities) {
    if (this.paused) return;

    // Find player entity (should only be one with PlayerController component)
    if (entities.length === 0) return;

    const entityId = entities[0];
    const controller = this.getComponent(entityId, 'PlayerController');
    const transform = this.getComponent(entityId, 'Transform');

    if (!controller || !transform) return;

    // Get movement input
    const moveVector = this.input.getMovementVector();

    // Apply acceleration based on input
    if (moveVector.x !== 0 || moveVector.y !== 0) {
      const accel = controller.acceleration * deltaTime;
      controller.velocityX += moveVector.x * accel;
      controller.velocityY += moveVector.y * accel;

      // Emit movement event
      this.eventBus.emit('player:moving', {
        direction: { x: moveVector.x, y: moveVector.y },
        position: { x: transform.x, y: transform.y }
      });
    }

    // Apply friction
    controller.velocityX *= controller.friction;
    controller.velocityY *= controller.friction;

    // Clamp to max speed
    const currentSpeed = Math.sqrt(
      controller.velocityX * controller.velocityX +
      controller.velocityY * controller.velocityY
    );

    if (currentSpeed > controller.moveSpeed) {
      const scale = controller.moveSpeed / currentSpeed;
      controller.velocityX *= scale;
      controller.velocityY *= scale;
    }

    // Stop if velocity very low (prevents jittering)
    if (Math.abs(controller.velocityX) < 0.1) controller.velocityX = 0;
    if (Math.abs(controller.velocityY) < 0.1) controller.velocityY = 0;

    // Update position
    const oldX = transform.x;
    const oldY = transform.y;

    transform.x += controller.velocityX * deltaTime;
    transform.y += controller.velocityY * deltaTime;

    // Emit position change event if moved significantly
    const distMoved = Math.sqrt(
      (transform.x - oldX) ** 2 + (transform.y - oldY) ** 2
    );

    if (distMoved > 1) {
      this.eventBus.emit('player:moved', {
        from: { x: oldX, y: oldY },
        to: { x: transform.x, y: transform.y },
        velocity: { x: controller.velocityX, y: controller.velocityY }
      });
    }

    // Update controller input state (sync with InputState)
    this.updateControllerInput(controller);
  }

  /**
   * Update controller input state from InputState
   * @param {PlayerController} controller
   */
  updateControllerInput(controller) {
    controller.input.moveLeft = this.input.isPressed('moveLeft');
    controller.input.moveRight = this.input.isPressed('moveRight');
    controller.input.moveUp = this.input.isPressed('moveUp');
    controller.input.moveDown = this.input.isPressed('moveDown');
    controller.input.interact = this.input.isPressed('interact');
    controller.input.deductionBoard = this.input.isPressed('deductionBoard');
    controller.input.inventory = this.input.isPressed('inventory');
    controller.input.pause = this.input.isPressed('pause');
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.eventBus.unsubscribe('game:pause');
    this.eventBus.unsubscribe('game:resume');
  }
}
