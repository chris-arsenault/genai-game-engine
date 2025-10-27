/**
 * CollisionSystem - detects and resolves collisions using spatial hashing.
 * Implements broad-phase (spatial hash) and narrow-phase (collision detectors).
 * Emits collision events and optionally resolves collisions.
 */
import { System } from '../ecs/System.js';
import { SpatialHash } from './SpatialHash.js';
import { detectCollision } from './collisionDetectors.js';

export class CollisionSystem extends System {
  /**
   * Creates collision system
   * @param {ComponentRegistry} componentRegistry - Component registry
   * @param {EventBus} eventBus - Event bus
   * @param {Object} options - Configuration options
   * @param {number} options.cellSize - Spatial hash cell size (default: 64)
   * @param {boolean} options.resolveCollisions - Auto-resolve collisions (default: true)
   * @param {Object} options.layers - Collision layer configuration
   */
  constructor(componentRegistry, eventBus, options = {}) {
    super(componentRegistry, eventBus, ['Transform', 'Collider']);
    this.spatialHash = new SpatialHash(options.cellSize || 64);
    this.priority = 20;
    this.resolveCollisions = options.resolveCollisions !== false;
    this.layers = options.layers || {};
    this.collisionPairs = new Map(); // Track active collisions
    this.collisionCount = 0; // Performance tracking
  }

  /**
   * Update collision detection
   * @param {number} deltaTime - Delta time in seconds
   * @param {number[]} entities - Entities with Transform and Collider
   */
  update(deltaTime, entities) {
    this.collisionCount = 0;
    this.spatialHash.clear();

    // Track previous collision state
    const previousCollisions = this.collisionPairs;
    this.collisionPairs = new Map();

    // Broad phase: populate spatial hash
    for (const entityId of entities) {
      const transform = this.getComponent(entityId, 'Transform');
      const collider = this.getComponent(entityId, 'Collider');

      if (!transform || !collider) continue;

      const bounds = collider.getBounds(transform);
      this.spatialHash.insert(
        entityId,
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
    }

    const checked = new Set();

    // Narrow phase: check collision candidates
    for (const entityId of entities) {
      const transformA = this.getComponent(entityId, 'Transform');
      const colliderA = this.getComponent(entityId, 'Collider');

      if (!transformA || !colliderA) continue;

      const boundsA = colliderA.getBounds(transformA);

      const candidates = this.spatialHash.query(
        boundsA.minX,
        boundsA.minY,
        boundsA.maxX - boundsA.minX,
        boundsA.maxY - boundsA.minY
      );

      for (const otherId of candidates) {
        if (entityId >= otherId) continue;

        const pairKey = `${entityId},${otherId}`;
        if (checked.has(pairKey)) continue;

        checked.add(pairKey);

        const transformB = this.getComponent(otherId, 'Transform');
        const colliderB = this.getComponent(otherId, 'Collider');

        if (!transformB || !colliderB) continue;

        // Check collision layers
        if (!this.shouldCollide(colliderA, colliderB)) {
          continue;
        }

        this.collisionCount++;

        const collision = this.testCollision(
          transformA,
          colliderA,
          transformB,
          colliderB
        );

        if (collision) {
          this.collisionPairs.set(pairKey, true);

          // Check if this is a new collision
          const wasColliding = previousCollisions.has(pairKey);

          if (!wasColliding) {
            // Emit collision enter event
            if (colliderA.isTrigger || colliderB.isTrigger) {
              this.eventBus.emit('trigger:enter', {
                entityA: entityId,
                entityB: otherId,
                collision
              });
            } else {
              this.eventBus.emit('collision:enter', {
                entityA: entityId,
                entityB: otherId,
                collision
              });
            }
          }

          // Emit general collision event every frame
          if (colliderA.isTrigger || colliderB.isTrigger) {
            this.eventBus.emit('trigger', {
              entityA: entityId,
              entityB: otherId,
              collision
            });
          } else {
            this.eventBus.emit('collision', {
              entityA: entityId,
              entityB: otherId,
              collision
            });

            // Resolve collision if not a trigger
            if (this.resolveCollisions && !colliderA.isTrigger && !colliderB.isTrigger) {
              this.resolveCollision(
                entityId,
                transformA,
                colliderA,
                otherId,
                transformB,
                colliderB,
                collision
              );
            }
          }
        }
      }
    }

    // Check for collision exit events
    for (const [pairKey, _] of previousCollisions) {
      if (!this.collisionPairs.has(pairKey)) {
        const [entityA, entityB] = pairKey.split(',').map(Number);
        const colliderA = this.getComponent(entityA, 'Collider');
        const colliderB = this.getComponent(entityB, 'Collider');

        if (colliderA && colliderB) {
          if (colliderA.isTrigger || colliderB.isTrigger) {
            this.eventBus.emit('trigger:exit', {
              entityA,
              entityB
            });
          } else {
            this.eventBus.emit('collision:exit', {
              entityA,
              entityB
            });
          }
        }
      }
    }
  }

  /**
   * Test collision between two entities
   * @param {Transform} transformA - First transform
   * @param {Collider} colliderA - First collider
   * @param {Transform} transformB - Second transform
   * @param {Collider} colliderB - Second collider
   * @returns {Object|null} Collision info or null
   */
  testCollision(transformA, colliderA, transformB, colliderB) {
    const shapeA = this.getColliderShape(transformA, colliderA);
    const shapeB = this.getColliderShape(transformB, colliderB);

    return detectCollision(shapeA, shapeB);
  }

  /**
   * Convert collider to collision detection shape
   * @param {Transform} transform - Entity transform
   * @param {Collider} collider - Entity collider
   * @returns {Object} Shape for collision detection
   */
  getColliderShape(transform, collider) {
    // Support both 'type' (actual Collider) and 'shapeType' (wrapped test components)
    const shapeType = (collider.shapeType || collider.type).toLowerCase();
    const isTestComponent = Object.prototype.hasOwnProperty.call(collider, 'shapeType');

    if (shapeType === 'aabb') {
      if (isTestComponent) {
        const x = transform.x + (collider.offsetX || 0);
        const y = transform.y + (collider.offsetY || 0);

        return {
          type: 'AABB',
          x,
          y,
          width: collider.width,
          height: collider.height
        };
      }

      const bounds = collider.getBounds(transform);
      if (!bounds) {
        return null;
      }

      return {
        type: 'AABB',
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY
      };
    } else if (shapeType === 'circle') {
      if (isTestComponent) {
        const x = transform.x + (collider.offsetX || 0);
        const y = transform.y + (collider.offsetY || 0);

        return {
          type: 'circle',
          x,
          y,
          radius: collider.radius
        };
      }

      const bounds = collider.getBounds(transform);
      if (!bounds) {
        return null;
      }

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const radius = typeof collider.radius === 'number'
        ? collider.radius
        : (bounds.maxX - bounds.minX) / 2;

      return {
        type: 'circle',
        x: centerX,
        y: centerY,
        radius
      };
    }

    return null;
  }

  /**
   * Resolve collision by separating entities
   * @param {number} entityA - First entity ID
   * @param {Transform} transformA - First transform
   * @param {Collider} colliderA - First collider
   * @param {number} entityB - Second entity ID
   * @param {Transform} transformB - Second transform
   * @param {Collider} colliderB - Second collider
   * @param {Object} collision - Collision info
   */
  resolveCollision(entityA, transformA, colliderA, entityB, transformB, colliderB, collision) {
    // Don't resolve if both are static
    if (colliderA.isStatic && colliderB.isStatic) {
      return;
    }

    const { normalX, normalY, penetration } = collision;

    // Calculate separation based on mass (static objects have infinite mass)
    let separationA = 0;
    let separationB = 0;

    if (colliderA.isStatic) {
      separationB = penetration;
    } else if (colliderB.isStatic) {
      separationA = -penetration;
    } else {
      // Both dynamic - separate equally
      separationA = -penetration / 2;
      separationB = penetration / 2;
    }

    // Apply separation
    if (!colliderA.isStatic) {
      transformA.x += normalX * separationA;
      transformA.y += normalY * separationA;
    }

    if (!colliderB.isStatic) {
      transformB.x += normalX * separationB;
      transformB.y += normalY * separationB;
    }
  }

  /**
   * Check if two colliders should collide based on tags
   * @param {Collider} colliderA - First collider
   * @param {Collider} colliderB - Second collider
   * @returns {boolean} True if should collide
   */
  shouldCollide(colliderA, colliderB) {
    // If no layer configuration, always collide
    if (Object.keys(this.layers).length === 0) {
      return true;
    }

    // If either collider has no tags, don't collide (layers are configured but these don't have tags)
    if (colliderA.tags.length === 0 || colliderB.tags.length === 0) {
      return false;
    }

    // Check if any tag pair should collide
    for (const tagA of colliderA.tags) {
      for (const tagB of colliderB.tags) {
        const layerConfig = this.layers[tagA];
        if (layerConfig && layerConfig.includes(tagB)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get collision check count for last frame (performance metric)
   * @returns {number} Number of narrow-phase collision checks
   */
  getCollisionCheckCount() {
    return this.collisionCount;
  }
}
