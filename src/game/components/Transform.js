/**
 * Transform Component
 *
 * Core spatial component defining position, rotation, and scale.
 * Required by virtually all visible entities.
 *
 * @property {number} x - World X coordinate (pixels)
 * @property {number} y - World Y coordinate (pixels)
 * @property {number} rotation - Rotation in radians (0 to 2π)
 * @property {number} scaleX - Horizontal scale multiplier (1.0 = normal)
 * @property {number} scaleY - Vertical scale multiplier (1.0 = normal)
 */
export class Transform {
  constructor(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  /**
   * Set position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Translate by offset
   * @param {number} dx - X offset
   * @param {number} dy - Y offset
   */
  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  /**
   * Calculate distance to another transform
   * @param {Transform} other - Target transform
   * @returns {number} Distance in pixels
   */
  distanceTo(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Clone this transform
   * @returns {Transform} New transform with same values
   */
  clone() {
    return new Transform(this.x, this.y, this.rotation, this.scaleX, this.scaleY);
  }
}
