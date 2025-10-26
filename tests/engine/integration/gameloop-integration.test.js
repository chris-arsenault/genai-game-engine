/**
 * GameLoop Integration Test Suite
 * Tests full integration between GameLoop, SystemManager, and real systems.
 */

import { GameLoop } from '../../../src/engine/GameLoop.js';
import { SystemManager } from '../../../src/engine/ecs/SystemManager.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

// Test system that simulates work
class TestSystem {
  constructor(priority = 50) {
    this.priority = priority;
    this.enabled = true;
    this.updateCount = 0;
    this.totalDelta = 0;
    this.componentRegistry = null;
    this.eventBus = null;
    this.requiredComponents = ['TestComponent'];
  }

  init() {
    this.updateCount = 0;
    this.totalDelta = 0;
  }

  update(deltaTime, entities) {
    this.updateCount++;
    this.totalDelta += deltaTime;

    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += Math.random();
    }
  }

  cleanup() {}
  enable() { this.enabled = true; }
  disable() { this.enabled = false; }
}

// Test component
class TestComponent {
  constructor() {
    this.type = 'TestComponent';
    this.value = 0;
  }
}

const waitForTime = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('GameLoop Integration', () => {
  let gameLoop;
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

  afterEach(() => {
    if (gameLoop && gameLoop.isRunning()) {
      gameLoop.stop();
    }
  });

  describe('Full Engine Loop', () => {
    it('should run complete game loop with systems', async () => {
      const system1 = new TestSystem(10);
      const system2 = new TestSystem(20);
      const system3 = new TestSystem(30);

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');
      systemManager.registerSystem(system3, 'System3');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(200);
      gameLoop.stop();

      expect(system1.updateCount).toBeGreaterThan(0);
      expect(system2.updateCount).toBeGreaterThan(0);
      expect(system3.updateCount).toBeGreaterThan(0);
    });

    it('should maintain frame timing with multiple systems', async () => {
      for (let i = 0; i < 5; i++) {
        systemManager.registerSystem(new TestSystem(i * 10), `System${i}`);
      }

      gameLoop = new GameLoop(systemManager, { targetFPS: 60 });
      gameLoop.start();

      await waitForTime(500);
      const avgFrameTime = gameLoop.getAverageFrameTime();
      gameLoop.stop();

      expect(avgFrameTime).toBeLessThan(20);
    });

    it('should respect system priority order', async () => {
      const updateOrder = [];

      class OrderTrackingSystem extends TestSystem {
        constructor(priority, name) {
          super(priority);
          this.name = name;
        }

        update(deltaTime, entities) {
          super.update(deltaTime, entities);
          updateOrder.push(this.name);
        }
      }

      systemManager.registerSystem(new OrderTrackingSystem(30, 'Low'), 'Low');
      systemManager.registerSystem(new OrderTrackingSystem(10, 'High'), 'High');
      systemManager.registerSystem(new OrderTrackingSystem(20, 'Medium'), 'Medium');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(50);
      gameLoop.stop();

      expect(updateOrder.length).toBeGreaterThan(0);

      // Check first frame order
      expect(updateOrder[0]).toBe('High');
      expect(updateOrder[1]).toBe('Medium');
      expect(updateOrder[2]).toBe('Low');
    });

    it('should handle entities with systems', async () => {
      const system = new TestSystem();
      systemManager.registerSystem(system, 'TestSystem');

      // Create entities
      for (let i = 0; i < 10; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, new TestComponent());
      }

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(100);
      gameLoop.stop();

      expect(system.updateCount).toBeGreaterThan(0);
    });

    it('should pause all systems', async () => {
      const system = new TestSystem();
      systemManager.registerSystem(system, 'TestSystem');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(100);
      const updatesBefore = system.updateCount;

      gameLoop.pause();
      await waitForTime(100);

      expect(system.updateCount).toBe(updatesBefore);
    });

    it('should resume all systems', async () => {
      const system = new TestSystem();
      systemManager.registerSystem(system, 'TestSystem');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(50);
      gameLoop.pause();
      await waitForTime(50);

      const updatesBefore = system.updateCount;
      gameLoop.resume();
      await waitForTime(100);

      expect(system.updateCount).toBeGreaterThan(updatesBefore);
    });
  });

  describe('Performance with Load', () => {
    it('should maintain 60 FPS with 5 systems', async () => {
      for (let i = 0; i < 5; i++) {
        systemManager.registerSystem(new TestSystem(), `System${i}`);
      }

      gameLoop = new GameLoop(systemManager, { targetFPS: 60 });
      gameLoop.start();

      await waitForTime(1100);
      const fps = gameLoop.getFPS();
      gameLoop.stop();

      expect(fps).toBeGreaterThan(45);
    });

    it('should accumulate delta time correctly', async () => {
      const system = new TestSystem();
      systemManager.registerSystem(system, 'TestSystem');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(1000);
      gameLoop.stop();

      expect(system.totalDelta).toBeGreaterThan(0.9);
      expect(system.totalDelta).toBeLessThan(1.2);
    });

    it('should track frame consistency', async () => {
      systemManager.registerSystem(new TestSystem(), 'System1');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(500);
      const min = gameLoop.getMinFrameTime();
      const max = gameLoop.getMaxFrameTime();
      const avg = gameLoop.getAverageFrameTime();
      gameLoop.stop();

      const variance = max - min;
      expect(variance).toBeLessThan(50);
      expect(avg).toBeGreaterThan(10);
      expect(avg).toBeLessThan(25);
    });
  });

  describe('Frame Metrics Collection', () => {
    it('should collect frame metrics via callback', async () => {
      systemManager.registerSystem(new TestSystem(), 'System1');

      const metrics = [];
      gameLoop = new GameLoop(systemManager, {
        onFrame: (m) => metrics.push({ ...m }),
      });

      gameLoop.start();
      await waitForTime(200);
      gameLoop.stop();

      expect(metrics.length).toBeGreaterThan(5);

      for (const metric of metrics) {
        expect(metric.frameCount).toBeGreaterThanOrEqual(0);
        expect(metric.deltaTime).toBeGreaterThanOrEqual(0);
        expect(metric.frameTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide accurate FPS in metrics', async () => {
      gameLoop = new GameLoop(systemManager, {
        targetFPS: 60,
      });

      gameLoop.start();
      await waitForTime(1100);

      const fps = gameLoop.getFPS();
      gameLoop.stop();

      expect(fps).toBeGreaterThan(30);
      expect(fps).toBeLessThan(120);
    });
  });

  describe('System Enable/Disable During Loop', () => {
    it('should skip disabled system', async () => {
      const system1 = new TestSystem();
      const system2 = new TestSystem();

      systemManager.registerSystem(system1, 'System1');
      systemManager.registerSystem(system2, 'System2');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(50);
      systemManager.disableSystem('System2');
      await waitForTime(100);

      gameLoop.stop();

      expect(system1.updateCount).toBeGreaterThan(system2.updateCount);
    });

    it('should resume disabled system when enabled', async () => {
      const system = new TestSystem();
      systemManager.registerSystem(system, 'TestSystem');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(50);
      systemManager.disableSystem('TestSystem');
      await waitForTime(50);

      const updatesBefore = system.updateCount;

      systemManager.enableSystem('TestSystem');
      await waitForTime(100);
      gameLoop.stop();

      expect(system.updateCount).toBeGreaterThan(updatesBefore);
    });
  });

  describe('Edge Cases', () => {
    it('should handle system registration during loop', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(50);

      const system = new TestSystem();
      systemManager.registerSystem(system, 'NewSystem');

      await waitForTime(100);
      gameLoop.stop();

      expect(system.updateCount).toBeGreaterThan(0);
    });

    it('should handle empty system manager', async () => {
      gameLoop = new GameLoop(systemManager);

      expect(() => {
        gameLoop.start();
      }).not.toThrow();

      await waitForTime(50);
      gameLoop.stop();

      expect(gameLoop.getFrameCount()).toBeGreaterThan(0);
    });

    it('should handle system with no entities', async () => {
      const system = new TestSystem();
      systemManager.registerSystem(system, 'TestSystem');

      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(100);
      gameLoop.stop();

      expect(system.updateCount).toBeGreaterThan(0);
    });
  });
});
