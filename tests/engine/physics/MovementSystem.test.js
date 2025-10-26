/**
 * MovementSystem Test Suite
 * Tests physics-based movement with velocity
 */

import { MovementSystem } from '../../../src/engine/physics/MovementSystem.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { Velocity } from '../../../src/game/components/Velocity.js';

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

describe('MovementSystem', () => {
  let movementSystem;
  let componentRegistry;
  let entityManager;
  let eventBus;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    movementSystem = new MovementSystem(componentRegistry, eventBus);
  });

  describe('Initialization', () => {
    it('should create movement system', () => {
      expect(movementSystem).toBeDefined();
      expect(movementSystem.priority).toBe(10);
    });

    it('should require Transform and Velocity components', () => {
      const required = movementSystem.getRequiredComponents();
      expect(required).toContain('Transform');
      expect(required).toContain('Velocity');
    });
  });

  describe('Position Updates', () => {
    it('should update position based on velocity', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(100, 50));

      movementSystem.update(1.0, [entity]);

      const transform = componentRegistry.getComponent(entity, 'Transform');
      expect(transform.x).toBeCloseTo(100, 1);
      expect(transform.y).toBeCloseTo(50, 1);
    });

    it('should handle multiple entities', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      componentRegistry.addComponent(entity1, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity1, new VelocityComponent(50, 0));

      componentRegistry.addComponent(entity2, new TransformComponent(100, 100));
      componentRegistry.addComponent(entity2, new VelocityComponent(-25, -25));

      movementSystem.update(1.0, [entity1, entity2]);

      const transform1 = componentRegistry.getComponent(entity1, 'Transform');
      const transform2 = componentRegistry.getComponent(entity2, 'Transform');

      expect(transform1.x).toBeCloseTo(50, 1);
      expect(transform2.x).toBeCloseTo(75, 1);
      expect(transform2.y).toBeCloseTo(75, 1);
    });

    it('should be frame-rate independent', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(100, 0, 0, 0));

      // Two 0.5s updates should equal one 1.0s update
      movementSystem.update(0.5, [entity]);
      movementSystem.update(0.5, [entity]);

      const transform = componentRegistry.getComponent(entity, 'Transform');
      expect(transform.x).toBeCloseTo(100, 1);
    });

    it('should handle negative velocities', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(100, 100));
      componentRegistry.addComponent(entity, new VelocityComponent(-50, -50));

      movementSystem.update(1.0, [entity]);

      const transform = componentRegistry.getComponent(entity, 'Transform');
      expect(transform.x).toBeCloseTo(50, 1);
      expect(transform.y).toBeCloseTo(50, 1);
    });

    it('should handle zero velocity', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(50, 50));
      componentRegistry.addComponent(entity, new VelocityComponent(0, 0));

      movementSystem.update(1.0, [entity]);

      const transform = componentRegistry.getComponent(entity, 'Transform');
      expect(transform.x).toBe(50);
      expect(transform.y).toBe(50);
    });
  });

  describe('Max Speed', () => {
    it('should clamp velocity to max speed', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(150, 150, 100));

      movementSystem.update(1.0, [entity]);

      const velocity = componentRegistry.getComponent(entity, 'Velocity');
      const speed = velocity.getSpeed();
      expect(speed).toBeLessThanOrEqual(100.1); // Allow small floating point error
    });

    it('should not clamp if under max speed', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      const vel = new VelocityComponent(50, 0, 100);
      componentRegistry.addComponent(entity, vel);

      movementSystem.update(1.0, [entity]);

      const velocity = componentRegistry.getComponent(entity, 'Velocity');
      expect(velocity.vx).toBeCloseTo(50, 1);
    });

    it('should not clamp when maxSpeed is 0', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(500, 500, 0));

      movementSystem.update(1.0, [entity]);

      const velocity = componentRegistry.getComponent(entity, 'Velocity');
      expect(velocity.vx).toBeCloseTo(500, 1);
      expect(velocity.vy).toBeCloseTo(500, 1);
    });
  });

  describe('Friction', () => {
    it('should apply friction to velocity', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(100, 0, 0, 0.5));

      movementSystem.update(1.0, [entity]);

      const velocity = componentRegistry.getComponent(entity, 'Velocity');
      expect(velocity.vx).toBeLessThan(100);
      expect(velocity.vx).toBeGreaterThan(0);
    });

    it('should eventually stop with friction', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(100, 0, 0, 0.95));

      // Simulate many frames (higher friction needs more frames)
      for (let i = 0; i < 200; i++) {
        movementSystem.update(0.016, [entity]);
      }

      const velocity = componentRegistry.getComponent(entity, 'Velocity');
      expect(velocity.vx).toBeCloseTo(0, 1);
    });

    it('should not apply friction when friction is 0', () => {
      const entity = entityManager.createEntity();
      componentRegistry.addComponent(entity, new TransformComponent(0, 0));
      componentRegistry.addComponent(entity, new VelocityComponent(100, 0, 0, 0));

      movementSystem.update(1.0, [entity]);

      const velocity = componentRegistry.getComponent(entity, 'Velocity');
      expect(velocity.vx).toBeCloseTo(100, 1);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 entities efficiently', () => {
      const entities = [];

      for (let i = 0; i < 1000; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, new TransformComponent(
          Math.random() * 1000,
          Math.random() * 1000
        ));
        componentRegistry.addComponent(entity, new VelocityComponent(
          Math.random() * 100 - 50,
          Math.random() * 100 - 50
        ));
        entities.push(entity);
      }

      const start = performance.now();
      movementSystem.update(0.016, entities);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });
});

describe('Velocity Component', () => {
  describe('Initialization', () => {
    it('should create with default values', () => {
      const vel = new Velocity();
      expect(vel.vx).toBe(0);
      expect(vel.vy).toBe(0);
      expect(vel.maxSpeed).toBe(0);
      expect(vel.friction).toBe(0);
    });

    it('should create with custom values', () => {
      const vel = new Velocity(10, 20, 100, 0.5);
      expect(vel.vx).toBe(10);
      expect(vel.vy).toBe(20);
      expect(vel.maxSpeed).toBe(100);
      expect(vel.friction).toBe(0.5);
    });
  });

  describe('Velocity Operations', () => {
    it('should set velocity', () => {
      const vel = new Velocity();
      vel.set(50, 75);
      expect(vel.vx).toBe(50);
      expect(vel.vy).toBe(75);
    });

    it('should add to velocity', () => {
      const vel = new Velocity(10, 20);
      vel.add(5, -10);
      expect(vel.vx).toBe(15);
      expect(vel.vy).toBe(10);
    });

    it('should calculate speed', () => {
      const vel = new Velocity(3, 4);
      expect(vel.getSpeed()).toBeCloseTo(5, 1);
    });

    it('should clone velocity', () => {
      const vel = new Velocity(10, 20, 100, 0.5);
      const clone = vel.clone();
      expect(clone.vx).toBe(vel.vx);
      expect(clone.vy).toBe(vel.vy);
      expect(clone.maxSpeed).toBe(vel.maxSpeed);
      expect(clone.friction).toBe(vel.friction);
      expect(clone).not.toBe(vel);
    });
  });
});
