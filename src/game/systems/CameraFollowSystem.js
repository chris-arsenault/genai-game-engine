/**
 * CameraFollowSystem
 *
 * Smooth camera following for player with look-ahead and deadzone.
 * Integrates with engine's camera/renderer.
 *
 * Priority: 90 (late, after movement)
 * Queries: [Transform, PlayerController]
 */

import { GameConfig } from '../config/GameConfig.js';

export class CameraFollowSystem {
  constructor(componentRegistry, eventBus, camera) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.camera = camera; // Engine camera instance
    this.requiredComponents = ['Transform', 'PlayerController'];

    // Camera state
    this.targetX = 0;
    this.targetY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /**
   * Initialize system
   */
  init() {
    console.log('[CameraFollowSystem] Initialized');
  }

  /**
   * Update camera to follow player
   * @param {number} deltaTime
   * @param {Array} entities
   */
  update(deltaTime, entities) {
    // Find player
    const player = entities.find(e => e.hasTag && e.hasTag('player'));
    if (!player) return;

    const transform = this.components.getComponent(player.id, 'Transform');
    const controller = this.components.getComponent(player.id, 'PlayerController');

    if (!transform || !controller) return;

    // Calculate target position with look-ahead
    const lookAhead = GameConfig.camera.lookAheadDistance;
    const velocityMagnitude = Math.sqrt(
      controller.velocityX ** 2 + controller.velocityY ** 2
    );

    let lookAheadX = 0;
    let lookAheadY = 0;

    if (velocityMagnitude > 0.1) {
      lookAheadX = (controller.velocityX / velocityMagnitude) * lookAhead;
      lookAheadY = (controller.velocityY / velocityMagnitude) * lookAhead;
    }

    this.targetX = transform.x + lookAheadX;
    this.targetY = transform.y + lookAheadY;

    // Apply deadzone
    const deadzone = GameConfig.camera.deadzone;
    const dx = this.targetX - this.camera.x;
    const dy = this.targetY - this.camera.y;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    if (distanceFromCenter < deadzone) {
      // Within deadzone, don't move camera
      return;
    }

    // Smooth follow with lerp
    const followSpeed = GameConfig.camera.followSpeed;
    this.camera.x += (this.targetX - this.camera.x) * followSpeed;
    this.camera.y += (this.targetY - this.camera.y) * followSpeed;

    // Round to prevent subpixel jitter
    this.camera.x = Math.round(this.camera.x);
    this.camera.y = Math.round(this.camera.y);
  }

  /**
   * Trigger camera shake
   * @param {number} intensity - Shake strength
   * @param {number} duration - Shake duration (seconds)
   */
  shake(intensity, duration) {
    if (this.camera && this.camera.shake) {
      this.camera.shake(intensity, duration);
    }

    this.events.emit('camera:shake', {
      intensity,
      duration
    });
  }

  /**
   * Instantly snap camera to position
   * @param {number} x
   * @param {number} y
   */
  snapTo(x, y) {
    if (this.camera) {
      this.camera.x = x;
      this.camera.y = y;
    }

    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Cleanup system
   */
  cleanup() {
    // No cleanup needed
  }
}
