/**
 * Camera - viewport management and coordinate transforms.
 * Supports smooth following, screen shake, and world/screen coordinate conversion.
 */
export class Camera {
  constructor(x = 0, y = 0, width = 1280, height = 720) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.zoom = 1.0;
    this.followTarget = null;
    this.followSpeed = 0.1;
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  follow(entity, speed = 0.1) {
    this.followTarget = entity;
    this.followSpeed = speed;
  }

  update(deltaTime, getPosition) {
    if (this.followTarget && getPosition) {
      const pos = getPosition(this.followTarget);
      if (pos) {
        this.x += (pos.x - this.width / 2 - this.x) * this.followSpeed;
        this.y += (pos.y - this.height / 2 - this.y) * this.followSpeed;
      }
    }

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

  shake(intensity = 10) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom + this.shakeOffsetX,
      y: (worldY - this.y) * this.zoom + this.shakeOffsetY
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.shakeOffsetX) / this.zoom + this.x,
      y: (screenY - this.shakeOffsetY) / this.zoom + this.y
    };
  }

  contains(x, y, margin = 0) {
    return x >= this.x - margin && x <= this.x + this.width + margin &&
           y >= this.y - margin && y <= this.y + this.height + margin;
  }
}
