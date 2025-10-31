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
import {
  buildSurfaceCache,
  findSurfaceForPoint,
  isSurfaceLockedForAgent,
} from '../navigation/navigationUtils.js';

export class PlayerMovementSystem extends System {
  constructor(componentRegistry, eventBus, inputState) {
    super(componentRegistry, eventBus, ['PlayerController', 'Transform']);
    this.input = inputState;
    this.priority = 10;
    this._offPause = null;
    this._offResume = null;
    this.navigationMesh = null;
    // Cached walkable surface data for quick containment lookups
    this._surfaceCache = [];
    this._activeSceneId = null;
    this.globalUnlockedTags = new Set();
    this.globalLockedTags = new Set();
    this._unsubscribes = [];
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to relevant events
    this._offPause = this.eventBus.on('game:pause', () => {
      this.paused = true;
    });

    this._offResume = this.eventBus.on('game:resume', () => {
      this.paused = false;
    });

    this._unsubscribes.push(
      this.eventBus.on(
        'navigation:unlockSurfaceTag',
        (payload) => this.handleUnlockTag(payload),
        this,
        22
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'navigation:lockSurfaceTag',
        (payload) => this.handleLockTag(payload),
        this,
        22
      )
    );

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

    const constraintsResult = this.applyNavigationConstraints(
      entityId,
      transform,
      { x: oldX, y: oldY }
    );

    if (constraintsResult.blocked) {
      controller.velocityX = 0;
      controller.velocityY = 0;
    }

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
    controller.input.dodge = this.input.isPressed('dodge');
  }

  /**
   * Cleanup system
   */
  cleanup() {
    if (this._offPause) {
      this._offPause();
      this._offPause = null;
    }
    if (this._offResume) {
      this._offResume();
      this._offResume = null;
    }
    for (const off of this._unsubscribes) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._unsubscribes.length = 0;
  }

  /**
   * Receive navigation mesh updates from NavigationMeshService.
   * @param {Object|null} mesh
   * @param {Object} [info]
   */
  setNavigationMesh(mesh, info = {}) {
    this.navigationMesh = mesh ? JSON.parse(JSON.stringify(mesh)) : null;
    this._activeSceneId = info.sceneId || null;
    this._surfaceCache = buildSurfaceCache(this.navigationMesh);
  }

  handleUnlockTag(payload = {}) {
    const tag = payload?.tag;
    if (!tag) {
      return;
    }

    this.globalLockedTags.delete(tag);
    this.globalUnlockedTags.add(tag);
  }

  handleLockTag(payload = {}) {
    const tag = payload?.tag;
    if (!tag) {
      return;
    }

    this.globalUnlockedTags.delete(tag);
    this.globalLockedTags.add(tag);
  }

  applyNavigationConstraints(entityId, transform, previousPosition) {
    if (!this.navigationMesh || !this._surfaceCache.length) {
      return { blocked: false };
    }

    const agent = this.getComponent(entityId, 'NavigationAgent');
    if (!agent) {
      return { blocked: false };
    }

    if (agent.sceneId && this._activeSceneId && agent.sceneId !== this._activeSceneId) {
      return { blocked: false };
    }

    const currentPosition = { x: transform.x, y: transform.y };
    const match = findSurfaceForPoint(currentPosition, this._surfaceCache, agent);

    if (!match) {
      if (agent.lastValidPosition) {
        transform.x = agent.lastValidPosition.x;
        transform.y = agent.lastValidPosition.y;
      } else {
        transform.x = previousPosition.x;
        transform.y = previousPosition.y;
      }
      this.eventBus.emit('navigation:movement_blocked', {
        entityId,
        reason: 'outside_nav_mesh',
        sceneId: this._activeSceneId,
      });
      return { blocked: true };
    }

    if (isSurfaceLockedForAgent(agent, match.surface, this.globalUnlockedTags, this.globalLockedTags)) {
      transform.x = previousPosition.x;
      transform.y = previousPosition.y;
      this.eventBus.emit('navigation:movement_blocked', {
        entityId,
        reason: 'locked_surface',
        surfaceId: match.surface.id || null,
        surfaceTags: Array.isArray(match.surface.tags) ? match.surface.tags.slice() : [],
        sceneId: this._activeSceneId,
      });
      return { blocked: true };
    }

    agent.currentSurfaceId = match.surface.id || null;
    agent.lastValidPosition = { x: transform.x, y: transform.y };
    return { blocked: false };
  }
}
