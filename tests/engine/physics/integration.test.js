/**
 * Physics Integration Tests
 * Tests interaction between movement, collision detection, and spatial partitioning
 */

import { MovementSystem } from '../../../src/engine/physics/MovementSystem.js';
import { CollisionSystem } from '../../../src/engine/physics/CollisionSystem.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { Velocity } from '../../../src/game/components/Velocity.js';
import { Collider } from '../../../src/game/components/Collider.js';

// Wrap components for ECS
class TransformComponent extends Transform {
  constructor(...args) {
    super(...args);
    Object.defineProperty(this, 'type', {
      value: 'Transform',
      writable: false,
      enumerable: true
    });
  }
}

class VelocityComponent extends Velocity {
  constructor(...args) {
    super(...args);
    Object.defineProperty(this, 'type', {
      value: 'Velocity',
      writable: false,
      enumerable: true
    });
  }
}

class ColliderComponent extends Collider {
  constructor(options) {
    super(options);
    this.shapeType = this.type;
    Object.defineProperty(this, 'type', {
      value: 'Collider',
      writable: false,
      enumerable: true
    });
  }

  getBounds(transform) {
    if (this.shapeType === 'AABB') {
      const x = transform.x + this.offsetX;
      const y = transform.y + this.offsetY;
      return {
        minX: x - this.width / 2,
        minY: y - this.height / 2,
        maxX: x + this.width / 2,
        maxY: y + this.height / 2
      };
    } else if (this.shapeType === 'circle') {
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
}

describe('Physics Integration', () => {
  let movementSystem;
  let collisionSystem;
  let componentRegistry;
  let entityManager;
  let eventBus;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    movementSystem = new MovementSystem(componentRegistry, eventBus);
    collisionSystem = new CollisionSystem(componentRegistry, eventBus);
  });

  describe('Movement and Collision', () => {
    it('should detect collision between moving entities', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      // Entity 1: stationary
      componentRegistry.addComponent(entity1, new TransformComponent(50, 50));
      componentRegistry.addComponent(entity1, new VelocityComponent(0, 0));
      componentRegistry.addComponent(entity1, new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      // Entity 2: moving toward entity 1
      componentRegistry.addComponent(entity2, new TransformComponent(0, 50));
      componentRegistry.addComponent(entity2, new VelocityComponent(100, 0));
      componentRegistry.addComponent(entity2, new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const collisionEvents = [];
      eventBus.on('collision:enter', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];

      // Simulate frames until collision
      let collided = false;
      for (let i = 0; i < 10 && !collided; i++) {
        movementSystem.update(0.1, entities);
        collisionSystem.update(0.1, entities);
        if (collisionEvents.length > 0) collided = true;
      }

      expect(collisionEvents.length).toBeGreaterThan(0);
    });

    it('should resolve collision and prevent overlap', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, new TransformComponent(50, 50));
      componentRegistry.addComponent(entity1, new VelocityComponent(0, 0));
      componentRegistry.addComponent(entity1, new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        isStatic: true
      }));

      componentRegistry.addComponent(entity2, new TransformComponent(45, 50));
      componentRegistry.addComponent(entity2, new VelocityComponent(0, 0));
      componentRegistry.addComponent(entity2, new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      const transform2 = componentRegistry.getComponent(entity2, 'Transform');

      // Entity 2 should be pushed away from entity 1
      expect(transform2.x).toBeLessThan(45);
    });

    it('should handle continuous collisions during movement', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      // Entities moving directly toward each other on same Y
      componentRegistry.addComponent(entity1, new TransformComponent(10, 50));
      componentRegistry.addComponent(entity1, new VelocityComponent(30, 0));
      componentRegistry.addComponent(entity1, new ColliderComponent({
        type: 'circle',
        radius: 10
      }));

      componentRegistry.addComponent(entity2, new TransformComponent(90, 50));
      componentRegistry.addComponent(entity2, new VelocityComponent(-30, 0));
      componentRegistry.addComponent(entity2, new ColliderComponent({
        type: 'circle',
        radius: 10
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];

      // Simulate until they should meet (distance 80, closing speed 60, ~1.3s)
      for (let i = 0; i < 100; i++) {
        movementSystem.update(0.016, entities);
        collisionSystem.update(0.016, entities);
      }

      // Should have detected collision
      expect(collisionEvents.length).toBeGreaterThan(0);
    });

    it('should not tunnel through objects at reasonable velocities', () => {
      const wall = entityManager.createEntity();
      const projectile = entityManager.createEntity();

      componentRegistry.addComponent(wall, new TransformComponent(50, 50));
      componentRegistry.addComponent(wall, new ColliderComponent({
        type: 'AABB',
        width: 10,
        height: 100,
        isStatic: true
      }));

      componentRegistry.addComponent(projectile, new TransformComponent(0, 50));
      componentRegistry.addComponent(projectile, new VelocityComponent(500, 0));
      componentRegistry.addComponent(projectile, new ColliderComponent({
        type: 'circle',
        radius: 5
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [wall, projectile];

      // Simulate frames with reasonable time step
      for (let i = 0; i < 20; i++) {
        movementSystem.update(0.016, entities);
        collisionSystem.update(0.016, entities);
      }

      // Should have hit the wall
      expect(collisionEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Spatial Hash Performance', () => {
    it('should efficiently handle many moving entities', () => {
      const entities = [];

      // Create grid of entities
      for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
          const entity = entityManager.createEntity();
          componentRegistry.addComponent(entity, new TransformComponent(x * 30, y * 30));
          componentRegistry.addComponent(entity, new VelocityComponent(
            Math.random() * 20 - 10,
            Math.random() * 20 - 10
          ));
          componentRegistry.addComponent(entity, new ColliderComponent({
            type: 'circle',
            radius: 8
          }));
          entities.push(entity);
        }
      }

      // 400 entities
      expect(entities.length).toBe(400);

      const start = performance.now();

      // Simulate multiple frames
      for (let i = 0; i < 10; i++) {
        movementSystem.update(0.016, entities);
        collisionSystem.update(0.016, entities);
      }

      const elapsed = performance.now() - start;

      // Should complete in reasonable time (< 1s for 10 frames of 400 entities)
      expect(elapsed).toBeLessThan(1000);

      // Check collision detection efficiency
      const checkCount = collisionSystem.getCollisionCheckCount();
      const naiveCount = (entities.length * (entities.length - 1)) / 2;
      const reduction = 1 - checkCount / naiveCount;

      // Should have at least 90% reduction
      expect(reduction).toBeGreaterThan(0.9);
    });

    it('should maintain performance with sparse entity distribution', () => {
      const entities = [];

      // Create widely spaced entities
      for (let i = 0; i < 500; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, new TransformComponent(
          Math.random() * 5000,
          Math.random() * 5000
        ));
        componentRegistry.addComponent(entity, new VelocityComponent(
          Math.random() * 50 - 25,
          Math.random() * 50 - 25
        ));
        componentRegistry.addComponent(entity, new ColliderComponent({
          type: 'AABB',
          width: 16,
          height: 16
        }));
        entities.push(entity);
      }

      const start = performance.now();

      movementSystem.update(0.016, entities);
      collisionSystem.update(0.016, entities);

      const elapsed = performance.now() - start;

      // Single frame should be fast
      expect(elapsed).toBeLessThan(20);

      // Very few collision checks needed for sparse distribution
      const checkCount = collisionSystem.getCollisionCheckCount();
      expect(checkCount).toBeLessThan(5000);
    });

    it('should handle clustered entities efficiently', () => {
      const entities = [];

      // Create clustered entities
      for (let i = 0; i < 100; i++) {
        const entity = entityManager.createEntity();
        const clusterX = (i % 5) * 200;
        const clusterY = Math.floor(i / 5) * 200;
        componentRegistry.addComponent(entity, new TransformComponent(
          clusterX + Math.random() * 50,
          clusterY + Math.random() * 50
        ));
        componentRegistry.addComponent(entity, new VelocityComponent(
          Math.random() * 10 - 5,
          Math.random() * 10 - 5
        ));
        componentRegistry.addComponent(entity, new ColliderComponent({
          type: 'circle',
          radius: 10
        }));
        entities.push(entity);
      }

      const start = performance.now();

      movementSystem.update(0.016, entities);
      collisionSystem.update(0.016, entities);

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('Frame Time Budget', () => {
    it('should complete physics update within 4ms for 500 entities', () => {
      const entities = [];

      for (let i = 0; i < 500; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, new TransformComponent(
          Math.random() * 1000,
          Math.random() * 1000
        ));
        componentRegistry.addComponent(entity, new VelocityComponent(
          Math.random() * 100 - 50,
          Math.random() * 100 - 50
        ));
        componentRegistry.addComponent(entity, new ColliderComponent({
          type: 'AABB',
          width: 16,
          height: 16
        }));
        entities.push(entity);
      }

      const start = performance.now();

      movementSystem.update(0.016, entities);
      collisionSystem.update(0.016, entities);

      const elapsed = performance.now() - start;

      // Physics should take < 4ms of 16ms frame budget
      expect(elapsed).toBeLessThan(4);
    });
  });

  describe('Collision Accuracy', () => {
    it('should have no false positives', () => {
      const entities = [];

      // Create non-overlapping grid
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const entity = entityManager.createEntity();
          componentRegistry.addComponent(entity, new TransformComponent(x * 50, y * 50));
          componentRegistry.addComponent(entity, new ColliderComponent({
            type: 'AABB',
            width: 20,
            height: 20
          }));
          entities.push(entity);
        }
      }

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      collisionSystem.update(0.016, entities);

      // No collisions should be detected
      expect(collisionEvents.length).toBe(0);
    });

    it('should detect all actual collisions', () => {
      const entities = [];

      // Create overlapping pairs
      for (let i = 0; i < 10; i++) {
        const entity1 = entityManager.createEntity();
        const entity2 = entityManager.createEntity();

        componentRegistry.addComponent(entity1, new TransformComponent(i * 100, 0));
        componentRegistry.addComponent(entity1, new ColliderComponent({
          type: 'circle',
          radius: 15
        }));

        componentRegistry.addComponent(entity2, new TransformComponent(i * 100 + 20, 0));
        componentRegistry.addComponent(entity2, new ColliderComponent({
          type: 'circle',
          radius: 15
        }));

        entities.push(entity1, entity2);
      }

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      collisionSystem.update(0.016, entities);

      // Should detect all 10 pairs
      expect(collisionEvents.length).toBe(10);
    });
  });
});
