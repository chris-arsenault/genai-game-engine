import { System } from '../../engine/ecs/System.js';

function animationExists(animatedSprite, name) {
  return Boolean(animatedSprite?.animations && animatedSprite.animations[name]);
}

/**
 * PlayerAnimationSystem
 *
 * Coordinates the player's AnimatedSprite state based on control input
 * and movement events. Dash/slide animations are triggered from the
 * dodge action (Shift by default) and fall back to idle/run loops.
 */
export class PlayerAnimationSystem extends System {
  constructor(componentRegistry, eventBus, inputState, options = {}) {
    super(componentRegistry, eventBus, ['PlayerController', 'AnimatedSprite', 'Sprite']);
    this.inputState = inputState || null;
    this.priority = options.priority ?? 35;
    this._state = new Map(); // entityId -> { activeOneShot: string|null }
  }

  cleanup() {
    this._state.clear();
  }

  update(deltaTime, entities) {
    if (!Array.isArray(entities) || entities.length === 0) {
      return;
    }

    let dodgePressed = false;
    if (this.inputState && typeof this.inputState.wasJustPressed === 'function') {
      dodgePressed = this.inputState.wasJustPressed('dodge');
    }

    for (const entityId of entities) {
      const controller = this.getComponent(entityId, 'PlayerController');
      const animatedSprite = this.getComponent(entityId, 'AnimatedSprite');

      if (!controller || !animatedSprite) {
        continue;
      }

      const state = this._state.get(entityId) ?? { activeOneShot: null };

      // Resolve the active one-shot animation; if finished, release.
      if (state.activeOneShot) {
        if (
          animatedSprite.currentAnimation !== state.activeOneShot ||
          animatedSprite.playing === false
        ) {
          state.activeOneShot = null;
        }
      }

      const isSliding =
        this.inputState?.isPressed?.('moveDown') === true ||
        (typeof controller.velocityY === 'number' && controller.velocityY > 0.1);

      if (!state.activeOneShot && dodgePressed) {
        const targetAnimation = isSliding && animationExists(animatedSprite, 'slide') ? 'slide' : 'dash';
        if (animationExists(animatedSprite, targetAnimation)) {
          animatedSprite.play(targetAnimation, { force: true, keepFrame: false, play: true });
          state.activeOneShot = targetAnimation;
        }
      }

      if (!state.activeOneShot) {
        // Determine baseline animation based on movement.
        const isMoving =
          typeof controller.isMoving === 'function'
            ? controller.isMoving()
            : Boolean(controller?.input?.moveLeft ||
                controller?.input?.moveRight ||
                controller?.input?.moveUp ||
                controller?.input?.moveDown);

        if (isMoving && animationExists(animatedSprite, 'dashLoop')) {
          if (animatedSprite.currentAnimation !== 'dashLoop') {
            animatedSprite.play('dashLoop', { force: true, keepFrame: false, play: true });
          }
        } else if (animationExists(animatedSprite, 'idle')) {
          if (animatedSprite.currentAnimation !== 'idle') {
            animatedSprite.play('idle', { force: true, keepFrame: true, play: false });
          }
        }
      }

      this._state.set(entityId, state);
    }
  }
}
