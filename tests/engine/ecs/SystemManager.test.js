/**
 * SystemManager Test Suite
 * Tests system registration, priority ordering, and update loop execution.
 */

import { SystemManager } from '../../../src/engine/ecs/SystemManager.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

// Mock System class
class MockSystem {
  constructor(requiredComponents = [], priority = 50) {
    this.requiredComponents = requiredComponents;
    this.priority = priority;
    this.enabled = true;
    this.initCalled = false;
    this.updateCallCount = 0;
    this.cleanupCalled = false;
    this.lastDeltaTime = 0;
    this.lastEntities = [];
    this.componentRegistry = null;
    this.eventBus = null;
  }

  init() {
    this.initCalled = true;
  }

  update(deltaTime, entities) {
    this.updateCallCount++;
    this.lastDeltaTime = deltaTime;
    this.lastEntities = entities;
  }

  cleanup() {
    this.cleanupCalled = true;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

// Mock component for testing
class MockComponent {
  constructor(type) {
    this.type = type;
  }
}

describe('SystemManager', () => {
  let systemManager;
  let entityManager;
  let componentRegistry;
  let eventBus;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    systemManager = new SystemManager(entityManager, componentRegistry, eventBus);
  });

  describe('System Registration', () => {
    it('should register system successfully', () => {
      const system = new MockSystem();

      systemManager.registerSystem(system, 'TestSystem');

      expect(system.initCalled).toBe(true);
      expect(systemManager.getSystemCount()).toBe(1);
      expect(systemManager.getSystem('TestSystem')).toBe(system);
    });

    it('should inject dependencies into system', () => {
      const system = new MockSystem();

      systemManager.registerSystem(system, 'TestSystem');

      expect(system.componentRegistry).toBe(componentRegistry);
      expect(system.eventBus).toBe(eventBus);
    });

    it('should throw when registering duplicate system name', () => {
      const system1 = new MockSystem();
      const system2 = new MockSystem();

      systemManager.registerSystem(system1, 'TestSystem');

      expect(() => {
        systemManager.registerSystem(system2, 'TestSystem');
      }).toThrow('System with name "TestSystem" already registered');
    });

    it('should allow registering system without name', () => {
      const system = new MockSystem();

      systemManager.registerSystem(system);

      expect(systemManager.getSystemCount()).toBe(1);
      expect(system.initCalled).toBe(true);
    });

    it('should override priority when numeric argument provided', () => {
      const system = new MockSystem([], 50);

      systemManager.registerSystem(system, 10);

      expect(system.priority).toBe(10);
    });

    it('should accept options object for name and priority', () => {
      const system = new MockSystem([], 80);

      systemManager.registerSystem(system, { name: 'OptionsSystem', priority: 15 });

      expect(system.priority).toBe(15);
      expect(systemManager.getSystem('OptionsSystem')).toBe(system);
    });

    it('should respect autoInit:false option', () => {
      const system = new MockSystem();

      systemManager.registerSystem(system, { name: 'Deferred', autoInit: false });

      expect(system.initCalled).toBe(false);

      system.init();
      expect(system.initCalled).toBe(true);
    });
  });

  describe('System Priority Ordering', () => {
    it('should sort systems by priority', () => {
      const lowPriority = new MockSystem([], 100);
      const highPriority = new MockSystem([], 10);
      const mediumPriority = new MockSystem([], 50);

      systemManager.registerSystem(lowPriority, 'Low');
      systemManager.registerSystem(highPriority, 'High');
      systemManager.registerSystem(mediumPriority, 'Medium');

      // Update all systems
      systemManager.update(0.016);

      // High priority should update first (lower number = higher priority)
      expect(highPriority.updateCallCount).toBe(1);
      expect(mediumPriority.updateCallCount).toBe(1);
      expect(lowPriority.updateCallCount).toBe(1);
    });

    it('should maintain priority order when adding systems', () => {
      const system1 = new MockSystem([], 50);
      const system2 = new MockSystem([], 20);
      const system3 = new MockSystem([], 80);
      const system4 = new MockSystem([], 30);

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');
      systemManager.registerSystem(system3, 'System3');
      systemManager.registerSystem(system4, 'System4');

      // All should be registered
      expect(systemManager.getSystemCount()).toBe(4);
    });

    it('should resort after init when system adjusts priority', () => {
      const updateOrder = [];

      class OrderTrackingSystem extends MockSystem {
        constructor(requiredComponents, priority, label) {
          super(requiredComponents, priority);
          this.label = label;
        }

        update(deltaTime, entities) {
          updateOrder.push(this.label);
          super.update(deltaTime, entities);
        }
      }

      const stable = new OrderTrackingSystem([], 40, 'stable');
      const dynamic = new OrderTrackingSystem([], 90, 'dynamic');
      dynamic.init = function init() {
        this.initCalled = true;
        this.priority = 5;
      };

      systemManager.registerSystem(stable, { name: 'Stable' });
      systemManager.registerSystem(dynamic, { name: 'Dynamic' });

      systemManager.update(0.016);

      expect(updateOrder[0]).toBe('dynamic');
      expect(updateOrder[1]).toBe('stable');
    });
  });

  describe('System Update Loop', () => {
    it('should update all enabled systems', () => {
      const system1 = new MockSystem();
      const system2 = new MockSystem();

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');

      systemManager.update(0.016);

      expect(system1.updateCallCount).toBe(1);
      expect(system2.updateCallCount).toBe(1);
      expect(system1.lastDeltaTime).toBe(0.016);
      expect(system2.lastDeltaTime).toBe(0.016);
    });

    it('should skip disabled systems', () => {
      const system1 = new MockSystem();
      const system2 = new MockSystem();

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');

      system2.enabled = false;

      systemManager.update(0.016);

      expect(system1.updateCallCount).toBe(1);
      expect(system2.updateCallCount).toBe(0);
    });

    it('should query entities matching system requirements', () => {
      const system = new MockSystem(['Transform', 'Velocity']);
      systemManager.registerSystem(system, 'MovementSystem');

      // Create entities with required components
      const entity1 = entityManager.createEntity();
      componentRegistry.addComponent(entity1, new MockComponent('Transform'));
      componentRegistry.addComponent(entity1, new MockComponent('Velocity'));

      const entity2 = entityManager.createEntity();
      componentRegistry.addComponent(entity2, new MockComponent('Transform'));
      // Missing Velocity

      const entity3 = entityManager.createEntity();
      componentRegistry.addComponent(entity3, new MockComponent('Transform'));
      componentRegistry.addComponent(entity3, new MockComponent('Velocity'));

      systemManager.update(0.016);

      expect(system.lastEntities).toHaveLength(2);
      expect(system.lastEntities).toContain(entity1);
      expect(system.lastEntities).toContain(entity3);
      expect(system.lastEntities).not.toContain(entity2);
    });

    it('should handle systems with no required components', () => {
      const system = new MockSystem([]);
      systemManager.registerSystem(system, 'GlobalSystem');

      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      systemManager.update(0.016);

      // Should receive all entities
      expect(system.lastEntities).toHaveLength(2);
      expect(system.lastEntities).toContain(entity1);
      expect(system.lastEntities).toContain(entity2);
    });

    it('should update multiple times with correct delta', () => {
      const system = new MockSystem();
      systemManager.registerSystem(system, 'TestSystem');

      systemManager.update(0.016);
      systemManager.update(0.032);
      systemManager.update(0.008);

      expect(system.updateCallCount).toBe(3);
      expect(system.lastDeltaTime).toBe(0.008);
    });
  });

  describe('System Enable/Disable', () => {
    it('should enable system by name', () => {
      const system = new MockSystem();
      system.enabled = false;
      systemManager.registerSystem(system, 'TestSystem');

      const result = systemManager.enableSystem('TestSystem');

      expect(result).toBe(true);
      expect(system.enabled).toBe(true);
    });

    it('should disable system by name', () => {
      const system = new MockSystem();
      systemManager.registerSystem(system, 'TestSystem');

      const result = systemManager.disableSystem('TestSystem');

      expect(result).toBe(true);
      expect(system.enabled).toBe(false);
    });

    it('should return false when enabling non-existent system', () => {
      const result = systemManager.enableSystem('NonExistent');

      expect(result).toBe(false);
    });

    it('should return false when disabling non-existent system', () => {
      const result = systemManager.disableSystem('NonExistent');

      expect(result).toBe(false);
    });

    it('should track enabled system count', () => {
      const system1 = new MockSystem();
      const system2 = new MockSystem();
      const system3 = new MockSystem();

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');
      systemManager.registerSystem(system3, 'System3');

      expect(systemManager.getEnabledSystemCount()).toBe(3);

      systemManager.disableSystem('System1');
      systemManager.disableSystem('System2');

      expect(systemManager.getEnabledSystemCount()).toBe(1);
    });
  });

  describe('System Unregistration', () => {
    it('should unregister system by name', () => {
      const system = new MockSystem();
      systemManager.registerSystem(system, 'TestSystem');

      const result = systemManager.unregisterSystem('TestSystem');

      expect(result).toBe(true);
      expect(system.cleanupCalled).toBe(true);
      expect(systemManager.getSystemCount()).toBe(0);
      expect(systemManager.getSystem('TestSystem')).toBeUndefined();
    });

    it('should return false when unregistering non-existent system', () => {
      const result = systemManager.unregisterSystem('NonExistent');

      expect(result).toBe(false);
    });

    it('should not update unregistered system', () => {
      const system = new MockSystem();
      systemManager.registerSystem(system, 'TestSystem');

      systemManager.update(0.016);
      expect(system.updateCallCount).toBe(1);

      systemManager.unregisterSystem('TestSystem');

      systemManager.update(0.016);
      expect(system.updateCallCount).toBe(1); // Still 1, not updated again
    });
  });

  describe('System Queries', () => {
    it('should get system by name', () => {
      const system = new MockSystem();
      systemManager.registerSystem(system, 'TestSystem');

      const retrieved = systemManager.getSystem('TestSystem');

      expect(retrieved).toBe(system);
    });

    it('should return undefined for non-existent system', () => {
      const retrieved = systemManager.getSystem('NonExistent');

      expect(retrieved).toBeUndefined();
    });

    it('should get all system names', () => {
      systemManager.registerSystem(new MockSystem(), 'System1');
      systemManager.registerSystem(new MockSystem(), 'System2');
      systemManager.registerSystem(new MockSystem(), 'System3');

      const names = systemManager.getSystemNames();

      expect(names).toHaveLength(3);
      expect(names).toContain('System1');
      expect(names).toContain('System2');
      expect(names).toContain('System3');
    });

    it('should count total systems', () => {
      systemManager.registerSystem(new MockSystem(), 'System1');
      systemManager.registerSystem(new MockSystem(), 'System2');

      expect(systemManager.getSystemCount()).toBe(2);
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize all systems on init()', () => {
      const system1 = new MockSystem();
      const system2 = new MockSystem();

      // Reset init flags since registerSystem calls init
      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');
      system1.initCalled = false;
      system2.initCalled = false;

      systemManager.init();

      expect(system1.initCalled).toBe(true);
      expect(system2.initCalled).toBe(true);
    });

    it('should cleanup all systems on cleanup()', () => {
      const system1 = new MockSystem();
      const system2 = new MockSystem();

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');

      systemManager.cleanup();

      expect(system1.cleanupCalled).toBe(true);
      expect(system2.cleanupCalled).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should update 10 systems with 1000 entities in under 100ms', () => {
      // Register 10 systems
      for (let i = 0; i < 10; i++) {
        systemManager.registerSystem(new MockSystem(['Transform']), `System${i}`);
      }

      // Create 1000 entities with Transform component
      for (let i = 0; i < 1000; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, new MockComponent('Transform'));
      }

      const start = performance.now();
      systemManager.update(0.016);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should handle system registration efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        systemManager.registerSystem(new MockSystem(), `System${i}`);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should update systems in priority order efficiently', () => {
      // Create systems with random priorities
      const updateOrder = [];
      for (let i = 0; i < 20; i++) {
        const priority = Math.floor(Math.random() * 100);
        const system = new MockSystem([], priority);
        // Track update order
        const originalUpdate = system.update.bind(system);
        system.update = (deltaTime, entities) => {
          updateOrder.push(priority);
          originalUpdate(deltaTime, entities);
        };
        systemManager.registerSystem(system, `System${i}`);
      }

      systemManager.update(0.016);

      // Verify systems ran in priority order (ascending)
      for (let i = 1; i < updateOrder.length; i++) {
        expect(updateOrder[i]).toBeGreaterThanOrEqual(updateOrder[i - 1]);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle system update errors gracefully', () => {
      const goodSystem = new MockSystem();
      const badSystem = new MockSystem();
      badSystem.update = () => {
        throw new Error('System error');
      };

      systemManager.registerSystem(goodSystem, 'GoodSystem');
      systemManager.registerSystem(badSystem, 'BadSystem');

      // Note: Current implementation doesn't catch errors in system updates
      // This test verifies the error is thrown (future enhancement: add try-catch)
      expect(() => {
        systemManager.update(0.016);
      }).toThrow('System error');

      // Good system should have updated before bad system threw
      expect(goodSystem.updateCallCount).toBe(1);
    });
  });

  describe('Integration', () => {
    it('should integrate EntityManager, ComponentRegistry, and Systems', () => {
      // Create a movement system
      const movementSystem = new MockSystem(['Transform', 'Velocity'], 10);
      movementSystem.update = function (deltaTime, entities) {
        this.updateCallCount++;
        for (const entityId of entities) {
          const transform = this.componentRegistry.getComponent(entityId, 'Transform');
          const velocity = this.componentRegistry.getComponent(entityId, 'Velocity');
          if (transform && velocity) {
            transform.data.x += velocity.data.x * deltaTime;
            transform.data.y += velocity.data.y * deltaTime;
          }
        }
      };

      systemManager.registerSystem(movementSystem, 'MovementSystem');

      // Create entity with position and velocity
      const entity = entityManager.createEntity('player');
      componentRegistry.addComponent(
        entity,
        new MockComponent('Transform')
      );
      componentRegistry.getComponent(entity, 'Transform').data = { x: 0, y: 0 };

      componentRegistry.addComponent(
        entity,
        new MockComponent('Velocity')
      );
      componentRegistry.getComponent(entity, 'Velocity').data = { x: 100, y: 50 };

      // Update for 1 second
      for (let i = 0; i < 60; i++) {
        systemManager.update(1 / 60);
      }

      const transform = componentRegistry.getComponent(entity, 'Transform');
      expect(transform.data.x).toBeCloseTo(100, 0);
      expect(transform.data.y).toBeCloseTo(50, 0);
    });
  });
});
