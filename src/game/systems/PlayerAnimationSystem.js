import { System } from '../../engine/ecs/System.js';

function animationExists(animatedSprite, name) {
  return Boolean(animatedSprite?.animations && animatedSprite.animations[name]);
}

function capitalize(word = '') {
  if (!word || typeof word !== 'string') {
    return '';
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function resolveDirectionalAnimation(base, facing) {
  if (!facing) {
    return base;
  }
  return `${base}${capitalize(facing)}`;
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
        const velocityX = typeof controller.velocityX === 'number' ? controller.velocityX : 0;
        const velocityY = typeof controller.velocityY === 'number' ? controller.velocityY : 0;
        const speed = Math.hypot(velocityX, velocityY);
        const moveSpeed = typeof controller.moveSpeed === 'number' ? controller.moveSpeed : 0;

        let movementState = 'idle';
        if (speed > moveSpeed * 0.75) {
          movementState = 'run';
        } else if (speed > moveSpeed * 0.1) {
          movementState = 'walk';
        }

        let facingDirection = controller.facingDirection;
        if (!facingDirection || typeof facingDirection !== 'string') {
          if (Math.abs(velocityX) >= Math.abs(velocityY) && Math.abs(velocityX) > 0.01) {
            facingDirection = velocityX >= 0 ? 'right' : 'left';
          } else if (Math.abs(velocityY) > 0.01) {
            facingDirection = velocityY >= 0 ? 'down' : 'up';
          } else {
            facingDirection = 'down';
          }
        }

        const candidateName = resolveDirectionalAnimation(movementState, facingDirection);
        const fallbackName =
          movementState === 'idle' ? 'idle' : resolveDirectionalAnimation('idle', facingDirection);

        if (animationExists(animatedSprite, candidateName)) {
          if (animatedSprite.currentAnimation !== candidateName) {
            animatedSprite.play(candidateName, {
              force: true,
              keepFrame: movementState === 'idle',
              play: movementState !== 'idle',
            });
          }
        } else if (
          animationExists(animatedSprite, fallbackName) &&
          animatedSprite.currentAnimation !== fallbackName
        ) {
          animatedSprite.play(fallbackName, { force: true, keepFrame: true, play: false });
        }

        if (movementState === 'idle' && animatedSprite.currentAnimation === candidateName) {
          animatedSprite.playing = false;
        }
      }

      this._state.set(entityId, state);
    }
  }
}
