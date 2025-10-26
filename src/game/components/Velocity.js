/**
 * Velocity Component
 *
 * Defines linear velocity for physics-based movement.
 * Used by MovementSystem to update entity positions.
 *
 * @property {number} vx - Velocity in X direction (pixels/second)
 * @property {number} vy - Velocity in Y direction (pixels/second)
 * @property {number} maxSpeed - Maximum speed magnitude (0 = unlimited)
 * @property {number} friction - Friction coefficient (0-1, 0=no friction, 1=instant stop)
 */
export class Velocity {
  constructor(vx = 0, vy = 0, maxSpeed = 0, friction = 0) {
    this.vx = vx;
    this.vy = vy;
    this.maxSpeed = maxSpeed;
    this.friction = friction;
  }

  /**
   * Set velocity
   * @param {number} vx - X velocity
   * @param {number} vy - Y velocity
   */
  set(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * Add to velocity (acceleration)
   * @param {number} ax - X acceleration
   * @param {number} ay - Y acceleration
   */
  add(ax, ay) {
    this.vx += ax;
    this.vy += ay;
  }

  /**
   * Get speed magnitude
   * @returns {number} Speed
   */
  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  /**
   * Clamp to max speed
   */
  clampToMaxSpeed() {
    if (this.maxSpeed <= 0) return;

    const speed = this.getSpeed();
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  /**
   * Apply friction
   * @param {number} deltaTime - Time step
   */
  applyFriction(deltaTime) {
    if (this.friction <= 0) return;

    const frictionFactor = Math.pow(1 - this.friction, deltaTime);
    this.vx *= frictionFactor;
    this.vy *= frictionFactor;

    // Stop completely if very slow
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;
  }

  /**
   * Clone velocity
   * @returns {Velocity} New velocity with same values
   */
  clone() {
    return new Velocity(this.vx, this.vy, this.maxSpeed, this.friction);
  }
}
