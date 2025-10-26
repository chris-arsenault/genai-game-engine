/**
 * CollisionSystem - detects and resolves collisions using spatial hashing.
 * Supports AABB and Circle collision detection.
 * TODO: Add collision response and impulse resolution.
 */
import { System } from '../ecs/System.js';
import { SpatialHash } from './SpatialHash.js';

export class CollisionSystem extends System {
  constructor(componentRegistry, eventBus) {
    super(componentRegistry, eventBus, ['Position', 'Collider']);
    this.spatialHash = new SpatialHash(64);
    this.priority = 20;
  }

  update(deltaTime, entities) {
    this.spatialHash.clear();

    for (const entityId of entities) {
      const pos = this.getComponent(entityId, 'Position');
      const col = this.getComponent(entityId, 'Collider');

      if (col.type === 'aabb') {
        this.spatialHash.insert(entityId, pos.x, pos.y, col.width, col.height);
      } else if (col.type === 'circle') {
        this.spatialHash.insert(entityId, pos.x - col.radius, pos.y - col.radius,
                                col.radius * 2, col.radius * 2);
      }
    }

    const checked = new Set();

    for (const entityId of entities) {
      const posA = this.getComponent(entityId, 'Position');
      const colA = this.getComponent(entityId, 'Collider');

      const candidates = this.spatialHash.query(
        posA.x, posA.y,
        colA.type === 'aabb' ? colA.width : colA.radius * 2,
        colA.type === 'aabb' ? colA.height : colA.radius * 2
      );

      for (const otherId of candidates) {
        if (entityId >= otherId || checked.has(`${entityId},${otherId}`)) {
          continue;
        }

        const posB = this.getComponent(otherId, 'Position');
        const colB = this.getComponent(otherId, 'Collider');

        if (this.checkCollision(posA, colA, posB, colB)) {
          this.eventBus.emit('collision', { entityA: entityId, entityB: otherId });
          checked.add(`${entityId},${otherId}`);
        }
      }
    }
  }

  checkCollision(posA, colA, posB, colB) {
    if (colA.type === 'aabb' && colB.type === 'aabb') {
      return this.aabbVsAabb(posA, colA, posB, colB);
    } else if (colA.type === 'circle' && colB.type === 'circle') {
      return this.circleVsCircle(posA, colA, posB, colB);
    }
    return false;
  }

  aabbVsAabb(posA, colA, posB, colB) {
    return posA.x < posB.x + colB.width &&
           posA.x + colA.width > posB.x &&
           posA.y < posB.y + colB.height &&
           posA.y + colA.height > posB.y;
  }

  circleVsCircle(posA, colA, posB, colB) {
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const distSq = dx * dx + dy * dy;
    const radiusSum = colA.radius + colB.radius;
    return distSq < radiusSum * radiusSum;
  }
}
