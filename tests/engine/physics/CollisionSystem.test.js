/**
 * CollisionSystem Test Suite
 * Tests collision detection, resolution, and event emission
 */

import { CollisionSystem } from '../../../src/engine/physics/CollisionSystem.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { Collider } from '../../../src/game/components/Collider.js';

// Wrap components to add component type property for ECS
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

class ColliderComponent extends Collider {
  constructor(options) {
    super(options);
    // Store shape type separately since ECS needs 'type' for component type
    this.shapeType = this.type;
    Object.defineProperty(this, 'type', {
      value: 'Collider',
      writable: false,
      enumerable: true
    });
  }

  // Override methods that use type
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

describe('CollisionSystem', () => {
  let collisionSystem;
  let componentRegistry;
  let entityManager;
  let eventBus;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    collisionSystem = new CollisionSystem(componentRegistry, eventBus);
  });

  describe('Initialization', () => {
    it('should create collision system with default options', () => {
      expect(collisionSystem).toBeDefined();
      expect(collisionSystem.priority).toBe(20);
      expect(collisionSystem.resolveCollisions).toBe(true);
    });

    it('should accept custom cell size', () => {
      const system = new CollisionSystem(componentRegistry, eventBus, {
        cellSize: 128
      });

      expect(system.spatialHash.cellSize).toBe(128);
    });

    it('should accept collision resolution flag', () => {
      const system = new CollisionSystem(componentRegistry, eventBus, {
        resolveCollisions: false
      });

      expect(system.resolveCollisions).toBe(false);
    });

    it('should accept layer configuration', () => {
      const layers = {
        player: ['enemy', 'environment'],
        enemy: ['player']
      };

      const system = new CollisionSystem(componentRegistry, eventBus, {
        layers
      });

      expect(system.layers).toEqual(layers);
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision between two overlapping AABBs', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, new TransformComponent(10, 10));
      componentRegistry.addComponent(entity2, new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(collisionEvents.length).toBe(1);
      expect(collisionEvents[0].entityA).toBe(entity1);
      expect(collisionEvents[0].entityB).toBe(entity2);
    });

    it('should not detect collision between separated AABBs', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(100, 100));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(collisionEvents.length).toBe(0);
    });

    it('should detect collision between two overlapping circles', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'circle',
        radius: 10
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(5, 0));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'circle',
        radius: 10
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(collisionEvents.length).toBe(1);
    });

    it('should detect collision between AABB and circle', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(25, 10));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'circle',
        radius: 10
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(collisionEvents.length).toBe(1);
    });

    it('should handle collider offsets', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'circle',
        radius: 10,
        offsetX: 20,
        offsetY: 0
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(30, 0));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'circle',
        radius: 10
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(collisionEvents.length).toBe(1);
    });
  });

  describe('Collision Events', () => {
    it('should emit collision:enter on first frame of collision', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(100, 100));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const enterEvents = [];
      eventBus.on('collision:enter', (data) => enterEvents.push(data));

      const entities = [entity1, entity2];

      // No collision initially
      collisionSystem.update(0.016, entities);
      expect(enterEvents.length).toBe(0);

      // Move entity2 to collide
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');
      transform2.x = 10;
      transform2.y = 10;

      collisionSystem.update(0.016, entities);
      expect(enterEvents.length).toBe(1);

      // Should not emit again on second frame
      collisionSystem.update(0.016, entities);
      expect(enterEvents.length).toBe(1);
    });

    it('should emit collision:exit when collision ends', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 10));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const exitEvents = [];
      eventBus.on('collision:exit', (data) => exitEvents.push(data));

      const entities = [entity1, entity2];

      // Colliding initially
      collisionSystem.update(0.016, entities);
      expect(exitEvents.length).toBe(0);

      // Move entity2 away
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');
      transform2.x = 100;
      transform2.y = 100;

      collisionSystem.update(0.016, entities);
      expect(exitEvents.length).toBe(1);
    });

    it('should emit trigger events for trigger colliders', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        isTrigger: true
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 10));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const triggerEvents = [];
      const collisionEvents = [];
      eventBus.on('trigger:enter', (data) => triggerEvents.push(data));
      eventBus.on('collision:enter', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(triggerEvents.length).toBe(1);
      expect(collisionEvents.length).toBe(0);
    });
  });

  describe('Collision Resolution', () => {
    it('should separate two dynamic colliding AABBs', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 0));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      const transform1 = componentRegistry.getComponent(entity1, 'Transform');
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');

      // Entities should be separated
      expect(transform1.x).toBeLessThan(0);
      expect(transform2.x).toBeGreaterThan(10);
    });

    it('should not move static colliders', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        isStatic: true
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 0));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      const transform1 = componentRegistry.getComponent(entity1, 'Transform');
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');

      // Static entity should not move
      expect(transform1.x).toBe(0);
      expect(transform1.y).toBe(0);
      // Dynamic entity should be pushed away
      expect(transform2.x).toBeGreaterThan(10);
    });

    it('should not resolve collisions for triggers', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        isTrigger: true
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 0));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      const transform1 = componentRegistry.getComponent(entity1, 'Transform');
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');

      // No resolution for triggers
      expect(transform1.x).toBe(0);
      expect(transform2.x).toBe(10);
    });

    it('should not resolve when resolution is disabled', () => {
      const system = new CollisionSystem(componentRegistry, eventBus, {
        resolveCollisions: false
      });

      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 0));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const entities = [entity1, entity2];
      system.update(0.016, entities);

      const transform1 = componentRegistry.getComponent(entity1, 'Transform');
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');

      // No resolution
      expect(transform1.x).toBe(0);
      expect(transform2.x).toBe(10);
    });
  });

  describe('Layer-based Filtering', () => {
    it('should collide when no layers configured', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        tags: ['player']
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 10));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        tags: ['enemy']
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      expect(collisionEvents.length).toBe(1);
    });

    it('should filter collisions based on layers', () => {
      const system = new CollisionSystem(componentRegistry, eventBus, {
        layers: {
          player: ['enemy'],
          enemy: ['player']
        }
      });

      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        tags: ['player']
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 10));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        tags: ['enemy']
      }));

      componentRegistry.addComponent(entity3, 'Transform', new TransformComponent(5, 5));
      componentRegistry.addComponent(entity3, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20,
        tags: ['environment']
      }));

      const collisionEvents = [];
      eventBus.on('collision', (data) => collisionEvents.push(data));

      const entities = [entity1, entity2, entity3];
      system.update(0.016, entities);

      // Only player-enemy collision should be detected
      expect(collisionEvents.length).toBe(1);
      expect(collisionEvents[0].entityA).toBe(entity1);
      expect(collisionEvents[0].entityB).toBe(entity2);
    });
  });

  describe('Performance', () => {
    it('should handle 100 entities efficiently', () => {
      const entities = [];

      for (let i = 0; i < 100; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, 'Transform', new TransformComponent(
          Math.random() * 500,
          Math.random() * 500
        ));
        componentRegistry.addComponent(entity, 'Collider', new ColliderComponent({
          type: 'AABB',
          width: 16,
          height: 16
        }));
        entities.push(entity);
      }

      const start = performance.now();
      collisionSystem.update(0.016, entities);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(20);

      // Should use spatial hash to reduce checks
      const checkCount = collisionSystem.getCollisionCheckCount();
      expect(checkCount).toBeLessThan(5000); // Much less than 100*99/2 = 4950
    });

    it('should track collision check count', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, 'Transform', new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      componentRegistry.addComponent(entity2, 'Transform', new TransformComponent(10, 10));
      componentRegistry.addComponent(entity2, 'Collider', new ColliderComponent({
        type: 'AABB',
        width: 20,
        height: 20
      }));

      const entities = [entity1, entity2];
      collisionSystem.update(0.016, entities);

      const checkCount = collisionSystem.getCollisionCheckCount();
      expect(checkCount).toBeGreaterThan(0);
    });
  });
});
