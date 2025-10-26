/**
 * Vector2 - 2D vector math utilities.
 * Provides static methods for common vector operations without allocations.
 * For performance, reuse vector objects instead of creating new ones in hot paths.
 *
 * @class Vector2
 */
export class Vector2 {
  /**
   * Creates a new 2D vector.
   * @param {number} x - X component
   * @param {number} y - Y component
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Sets vector components.
   * @param {number} x - X component
   * @param {number} y - Y component
   * @returns {Vector2} This vector for chaining
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Copies components from another vector.
   * @param {Vector2} v - Vector to copy from
   * @returns {Vector2} This vector for chaining
   */
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /**
   * Creates a clone of this vector.
   * @returns {Vector2} New vector with same components
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * Adds another vector to this vector.
   * @param {Vector2} v - Vector to add
   * @returns {Vector2} This vector for chaining
   */
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Subtracts another vector from this vector.
   * @param {Vector2} v - Vector to subtract
   * @returns {Vector2} This vector for chaining
   */
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Multiplies this vector by a scalar.
   * @param {number} scalar - Scalar value
   * @returns {Vector2} This vector for chaining
   */
  multiply(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Divides this vector by a scalar.
   * @param {number} scalar - Scalar value
   * @returns {Vector2} This vector for chaining
   */
  divide(scalar) {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  /**
   * Gets the length (magnitude) of this vector.
   * @returns {number} Vector length
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Gets the squared length (avoids sqrt for performance).
   * @returns {number} Squared vector length
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalizes this vector (makes length = 1).
   * @returns {Vector2} This vector for chaining
   */
  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /**
   * Calculates dot product with another vector.
   * @param {Vector2} v - Other vector
   * @returns {number} Dot product
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Calculates distance to another vector.
   * @param {Vector2} v - Other vector
   * @returns {number} Distance
   */
  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculates squared distance to another vector (avoids sqrt).
   * @param {Vector2} v - Other vector
   * @returns {number} Squared distance
   */
  distanceToSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Rotates this vector by an angle (radians).
   * @param {number} angle - Angle in radians
   * @returns {Vector2} This vector for chaining
   */
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  /**
   * Linearly interpolates between this vector and another.
   * @param {Vector2} v - Target vector
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Vector2} This vector for chaining
   */
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /**
   * Checks if this vector equals another (with tolerance).
   * @param {Vector2} v - Other vector
   * @param {number} epsilon - Tolerance (default 0.0001)
   * @returns {boolean} True if vectors are equal
   */
  equals(v, epsilon = 0.0001) {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  // Static utility methods

  /**
   * Adds two vectors and returns result in output vector.
   * @param {Vector2} a - First vector
   * @param {Vector2} b - Second vector
   * @param {Vector2} out - Output vector
   * @returns {Vector2} Output vector
   */
  static add(a, b, out) {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    return out;
  }

  /**
   * Subtracts two vectors and returns result in output vector.
   * @param {Vector2} a - First vector
   * @param {Vector2} b - Second vector
   * @param {Vector2} out - Output vector
   * @returns {Vector2} Output vector
   */
  static sub(a, b, out) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    return out;
  }

  /**
   * Calculates distance between two vectors.
   * @param {Vector2} a - First vector
   * @param {Vector2} b - Second vector
   * @returns {number} Distance
   */
  static distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculates squared distance between two vectors.
   * @param {Vector2} a - First vector
   * @param {Vector2} b - Second vector
   * @returns {number} Squared distance
   */
  static distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  /**
   * Creates a zero vector.
   * @returns {Vector2} Zero vector
   */
  static zero() {
    return new Vector2(0, 0);
  }

  /**
   * Creates a unit vector (1, 1).
   * @returns {Vector2} Unit vector
   */
  static one() {
    return new Vector2(1, 1);
  }

  /**
   * Creates a right vector (1, 0).
   * @returns {Vector2} Right vector
   */
  static right() {
    return new Vector2(1, 0);
  }

  /**
   * Creates an up vector (0, -1) (canvas Y is inverted).
   * @returns {Vector2} Up vector
   */
  static up() {
    return new Vector2(0, -1);
  }
}
