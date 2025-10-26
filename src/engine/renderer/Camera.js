/**
 * Camera - viewport management and coordinate transformation.
 *
 * Handles:
 * - World-to-screen and screen-to-world coordinate conversion
 * - Smooth camera following (lerp-based)
 * - Camera shake effects
 * - Zoom support
 * - Viewport culling tests
 *
 * @class Camera
 */
export class Camera {
  /**
   * Creates a new camera.
   * @param {number} x - Initial world X position (top-left of viewport)
   * @param {number} y - Initial world Y position (top-left of viewport)
   * @param {number} width - Viewport width in pixels
   * @param {number} height - Viewport height in pixels
   */
  constructor(x = 0, y = 0, width = 1280, height = 720) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.zoom = 1.0;

    // Following behavior
    this.followTarget = null;
    this.followSpeed = 0.1; // 0.0 = instant, 1.0 = no follow
    this.followOffsetX = 0;
    this.followOffsetY = 0;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  /**
   * Sets the camera to follow an entity.
   * @param {number|null} entityId - Entity ID to follow, or null to stop following
   * @param {number} speed - Follow speed (0.0 to 1.0, lower = smoother)
   * @param {number} offsetX - X offset from entity center
   * @param {number} offsetY - Y offset from entity center
   */
  follow(entityId, speed = 0.1, offsetX = 0, offsetY = 0) {
    this.followTarget = entityId;
    this.followSpeed = Math.max(0, Math.min(1, speed));
    this.followOffsetX = offsetX;
    this.followOffsetY = offsetY;
  }

  /**
   * Stops following the current target.
   */
  stopFollowing() {
    this.followTarget = null;
  }

  /**
   * Updates camera position (following and shake).
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {Function} getPosition - Function(entityId) => {x, y} to get entity position
   */
  update(deltaTime, getPosition) {
    // Update following
    if (this.followTarget && getPosition) {
      const pos = getPosition(this.followTarget);
      if (pos) {
        // Target the center of viewport
        const targetX = pos.x - this.width / (2 * this.zoom) + this.followOffsetX;
        const targetY = pos.y - this.height / (2 * this.zoom) + this.followOffsetY;

        // Smooth lerp
        const lerpAmount = 1 - Math.pow(1 - this.followSpeed, deltaTime * 60);
        this.x += (targetX - this.x) * lerpAmount;
        this.y += (targetY - this.y) * lerpAmount;
      }
    }

    // Update shake
    if (this.shakeIntensity > 0.1) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /**
   * Triggers camera shake.
   * @param {number} intensity - Shake intensity in pixels
   * @param {number} decay - Decay rate per frame (0.0 to 1.0, default 0.9)
   */
  shake(intensity = 10, decay = 0.9) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = decay;
  }

  /**
   * Converts world coordinates to screen coordinates.
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {{x: number, y: number}} Screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom + this.shakeOffsetX,
      y: (worldY - this.y) * this.zoom + this.shakeOffsetY,
    };
  }

  /**
   * Converts screen coordinates to world coordinates.
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{x: number, y: number}} World coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.shakeOffsetX) / this.zoom + this.x,
      y: (screenY - this.shakeOffsetY) / this.zoom + this.y,
    };
  }

  /**
   * Checks if a point is visible in the viewport.
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   * @param {number} margin - Extra margin in pixels (default 0)
   * @returns {boolean} True if point is visible
   */
  contains(x, y, margin = 0) {
    return (
      x >= this.x - margin &&
      x <= this.x + this.width / this.zoom + margin &&
      y >= this.y - margin &&
      y <= this.y + this.height / this.zoom + margin
    );
  }

  /**
   * Checks if a rectangle is visible in the viewport.
   * @param {number} x - World X coordinate (top-left)
   * @param {number} y - World Y coordinate (top-left)
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @returns {boolean} True if rectangle is visible (or partially visible)
   */
  containsRect(x, y, width, height) {
    const camRight = this.x + this.width / this.zoom;
    const camBottom = this.y + this.height / this.zoom;
    const rectRight = x + width;
    const rectBottom = y + height;

    return !(
      rectRight < this.x ||
      x > camRight ||
      rectBottom < this.y ||
      y > camBottom
    );
  }

  /**
   * Sets camera position directly.
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Moves camera by offset.
   * @param {number} dx - X offset
   * @param {number} dy - Y offset
   */
  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  /**
   * Sets camera zoom.
   * @param {number} zoom - Zoom level (1.0 = normal, >1.0 = zoomed in, <1.0 = zoomed out)
   */
  setZoom(zoom) {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
  }

  /**
   * Gets the camera bounds in world coordinates.
   * @returns {{x: number, y: number, width: number, height: number}} Camera bounds
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width / this.zoom,
      height: this.height / this.zoom,
    };
  }

  /**
   * Gets the camera center in world coordinates.
   * @returns {{x: number, y: number}} Camera center
   */
  getCenter() {
    return {
      x: this.x + this.width / (2 * this.zoom),
      y: this.y + this.height / (2 * this.zoom),
    };
  }
}
