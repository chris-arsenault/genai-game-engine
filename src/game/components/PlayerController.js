/**
 * PlayerController Component
 *
 * Stores player input state and movement parameters.
 * Read by PlayerMovementSystem to control player entity.
 *
 * @property {Object} input - Current input state
 * @property {boolean} input.moveLeft - W key pressed
 * @property {boolean} input.moveRight - S key pressed
 * @property {boolean} input.moveUp - A key pressed
 * @property {boolean} input.moveDown - D key pressed
 * @property {boolean} input.interact - E key pressed (evidence collection)
 * @property {boolean} input.deductionBoard - Tab key pressed
 * @property {boolean} input.inventory - I key pressed
 * @property {boolean} input.pause - ESC key pressed
 * @property {boolean} input.dodge - Shift key pressed (dash / slide trigger)
 * @property {number} moveSpeed - Base movement speed (pixels/second)
 * @property {number} acceleration - How fast speed changes (pixels/second²)
 * @property {number} friction - Deceleration multiplier (0.0 to 1.0)
 */
export class PlayerController {
  constructor({
    moveSpeed = 200,
    acceleration = 1200,
    friction = 0.85
  } = {}) {
    this.input = {
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
      interact: false,
      deductionBoard: false,
      inventory: false,
      pause: false,
      dodge: false
    };

    this.moveSpeed = moveSpeed;
    this.acceleration = acceleration;
    this.friction = friction;

    // Internal velocity tracking (managed by PlayerMovementSystem)
    this.velocityX = 0;
    this.velocityY = 0;

    /**
     * Tracks the facing direction for animation resolution.
     * Allowed values: 'down', 'up', 'left', 'right'
     */
    this.facingDirection = 'down';
  }

  /**
   * Reset all input states
   */
  resetInput() {
    Object.keys(this.input).forEach(key => {
      this.input[key] = false;
    });
  }

  /**
   * Check if any movement input is active
   * @returns {boolean}
   */
  isMoving() {
    return this.input.moveLeft || this.input.moveRight ||
           this.input.moveUp || this.input.moveDown;
  }
}
