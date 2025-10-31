/**
 * Collider Component
 *
 * Physics collision component for spatial queries and collision detection.
 * Used by physics system for collision resolution.
 *
 * @property {string} type - Component type identifier (always 'Collider')
 * @property {string} shapeType - Collision shape type ('AABB', 'circle')
 * @property {number} width - Width for AABB colliders
 * @property {number} height - Height for AABB colliders
 * @property {number} radius - Radius for circle colliders
 * @property {number} offsetX - X offset from transform position
 * @property {number} offsetY - Y offset from transform position
 * @property {boolean} isTrigger - If true, no physics response (events only)
 * @property {boolean} isStatic - If true, collider doesn't move
 * @property {Array<string>} tags - Collision tags for filtering
 */
export class Collider {
  constructor({
    type = 'AABB',
    width = 32,
    height = 32,
    radius = 16,
    offsetX = 0,
    offsetY = 0,
    isTrigger = false,
    isStatic = false,
    tags = []
  } = {}) {
    const normalizedType = typeof type === 'string' ? type : 'AABB';
    this.type = 'Collider';
    this.shapeType = normalizedType;
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.isTrigger = isTrigger;
    this.isStatic = isStatic;
    this.tags = tags;
  }

  /**
   * Get AABB bounds
   * @param {Transform} transform - Entity transform
   * @returns {Object} Bounds {minX, minY, maxX, maxY}
   */
  getBounds(transform) {
    const shapeType = (this.shapeType || 'AABB').toUpperCase();

    if (shapeType === 'AABB') {
      const x = transform.x + this.offsetX;
      const y = transform.y + this.offsetY;
      return {
        minX: x - this.width / 2,
        minY: y - this.height / 2,
        maxX: x + this.width / 2,
        maxY: y + this.height / 2
      };
    } else if (shapeType === 'CIRCLE') {
      const x = transform.x + this.offsetX;
      const y = transform.y + this.offsetY;
      return {
        minX: x - this.radius,
        minY: y - this.radius,
        maxX: x + this.radius,
        maxY: y + this.radius
      };
    }
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  /**
   * Check if collider has tag
   * @param {string} tag - Tag to check
   * @returns {boolean}
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }
}
