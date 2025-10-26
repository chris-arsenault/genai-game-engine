/**
 * GameLoop Test Suite
 * Tests game loop timing, pause/resume, frame metrics, and system update orchestration.
 */

import { GameLoop } from '../../src/engine/GameLoop.js';

// Mock SystemManager
class MockSystemManager {
  constructor() {
    this.updateCallCount = 0;
    this.lastDeltaTime = 0;
    this.updateCalls = [];
  }

  update(deltaTime) {
    this.updateCallCount++;
    this.lastDeltaTime = deltaTime;
    this.updateCalls.push(deltaTime);
  }
}

// Helper to wait for frames
const waitForFrames = (count) => {
  return new Promise((resolve) => {
    let framesPassed = 0;
    const check = () => {
      framesPassed++;
      if (framesPassed >= count) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
};

// Helper to wait for time
const waitForTime = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('GameLoop', () => {
  let gameLoop;
  let systemManager;

  beforeEach(() => {
    systemManager = new MockSystemManager();
  });

  afterEach(() => {
    if (gameLoop && gameLoop.isRunning()) {
      gameLoop.stop();
    }
  });

  describe('Construction', () => {
    it('should create game loop with default options', () => {
      gameLoop = new GameLoop(systemManager);

      expect(gameLoop.systemManager).toBe(systemManager);
      expect(gameLoop.targetFPS).toBe(60);
      expect(gameLoop.targetFrameTime).toBeCloseTo(16.67, 1);
      expect(gameLoop.isRunning()).toBe(false);
      expect(gameLoop.isPaused()).toBe(false);
    });

    it('should create game loop with custom target FPS', () => {
      gameLoop = new GameLoop(systemManager, { targetFPS: 30 });

      expect(gameLoop.targetFPS).toBe(30);
      expect(gameLoop.targetFrameTime).toBeCloseTo(33.33, 1);
    });

    it('should create game loop with frame callback', () => {
      const onFrame = jest.fn();
      gameLoop = new GameLoop(systemManager, { onFrame });

      expect(gameLoop.onFrame).toBe(onFrame);
    });

    it('should initialize with zero frame count', () => {
      gameLoop = new GameLoop(systemManager);

      expect(gameLoop.getFrameCount()).toBe(0);
      expect(gameLoop.getFPS()).toBe(0);
    });
  });

  describe('Start and Stop', () => {
    it('should start the game loop', () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      expect(gameLoop.isRunning()).toBe(true);
      expect(gameLoop.isPaused()).toBe(false);
    });

    it('should not start if already running', () => {
      gameLoop = new GameLoop(systemManager);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      gameLoop.start();
      gameLoop.start();

      expect(consoleSpy).toHaveBeenCalledWith('GameLoop: Already running');
      consoleSpy.mockRestore();
    });

    it('should stop the game loop', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(5);
      gameLoop.stop();

      expect(gameLoop.isRunning()).toBe(false);
      expect(gameLoop.isPaused()).toBe(false);
    });

    it('should allow restart after stop', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();
      await waitForFrames(3);
      gameLoop.stop();

      gameLoop.start();
      expect(gameLoop.isRunning()).toBe(true);
    });

    it('should initialize last frame time on start', () => {
      gameLoop = new GameLoop(systemManager);
      const beforeStart = performance.now();
      gameLoop.start();
      const afterStart = performance.now();

      expect(gameLoop.lastFrameTime).toBeGreaterThanOrEqual(beforeStart);
      expect(gameLoop.lastFrameTime).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause the game loop', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      const updatesBefore = systemManager.updateCallCount;

      gameLoop.pause();
      expect(gameLoop.isPaused()).toBe(true);

      await waitForFrames(5);
      expect(systemManager.updateCallCount).toBe(updatesBefore);
    });

    it('should resume the game loop', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      gameLoop.pause();
      await waitForFrames(3);

      const updatesBefore = systemManager.updateCallCount;
      gameLoop.resume();
      expect(gameLoop.isPaused()).toBe(false);

      await waitForFrames(5);
      expect(systemManager.updateCallCount).toBeGreaterThan(updatesBefore);
    });

    it('should warn when pausing non-running loop', () => {
      gameLoop = new GameLoop(systemManager);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      gameLoop.pause();

      expect(consoleSpy).toHaveBeenCalledWith('GameLoop: Cannot pause - not running');
      consoleSpy.mockRestore();
    });

    it('should warn when resuming non-running loop', () => {
      gameLoop = new GameLoop(systemManager);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      gameLoop.resume();

      expect(consoleSpy).toHaveBeenCalledWith('GameLoop: Cannot resume - not running');
      consoleSpy.mockRestore();
    });

    it('should handle multiple pause calls', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(2);
      gameLoop.pause();
      gameLoop.pause();
      gameLoop.pause();

      expect(gameLoop.isPaused()).toBe(true);
    });

    it('should handle multiple resume calls', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(2);
      gameLoop.pause();
      await waitForFrames(2);

      gameLoop.resume();
      gameLoop.resume();
      gameLoop.resume();

      expect(gameLoop.isPaused()).toBe(false);
    });

    it('should reset last frame time on resume to prevent delta spike', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      gameLoop.pause();
      await waitForTime(100);

      const beforeResume = performance.now();
      gameLoop.resume();
      await waitForFrames(2);

      const afterResume = performance.now();
      expect(gameLoop.lastFrameTime).toBeGreaterThanOrEqual(beforeResume);
      expect(gameLoop.lastFrameTime).toBeLessThanOrEqual(afterResume);
    });
  });

  describe('System Updates', () => {
    it('should update systems each frame', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(10);
      gameLoop.stop();

      expect(systemManager.updateCallCount).toBeGreaterThanOrEqual(8);
    });

    it('should pass delta time to systems', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(5);
      gameLoop.stop();

      expect(systemManager.lastDeltaTime).toBeGreaterThan(0);
      expect(systemManager.lastDeltaTime).toBeLessThan(0.1);
    });

    it('should not update systems when paused', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      gameLoop.pause();

      const updatesBefore = systemManager.updateCallCount;
      await waitForFrames(5);

      expect(systemManager.updateCallCount).toBe(updatesBefore);
    });

    it('should resume updating systems after unpause', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      gameLoop.pause();
      await waitForFrames(3);

      const updatesBefore = systemManager.updateCallCount;
      gameLoop.resume();
      await waitForFrames(5);

      expect(systemManager.updateCallCount).toBeGreaterThan(updatesBefore);
    });
  });

  describe('Delta Time Calculation', () => {
    it('should calculate delta time in seconds', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(5);
      const deltaTime = gameLoop.getDeltaTime();
      gameLoop.stop();

      expect(deltaTime).toBeGreaterThan(0);
      expect(deltaTime).toBeLessThan(0.1);
    });

    it('should have consistent delta times at 60 FPS', async () => {
      gameLoop = new GameLoop(systemManager, { targetFPS: 60 });
      gameLoop.start();

      await waitForTime(200);
      gameLoop.stop();

      const deltas = systemManager.updateCalls;
      if (deltas.length > 2) {
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        expect(avgDelta).toBeGreaterThan(0.01);
        expect(avgDelta).toBeLessThan(0.03);
      }
    });

    it('should update delta time each frame', async () => {
      const deltas = [];
      const onFrame = jest.fn((metrics) => {
        deltas.push(metrics.deltaTime);
      });

      gameLoop = new GameLoop(systemManager, { onFrame });
      gameLoop.start();

      await waitForFrames(5);
      gameLoop.stop();

      expect(deltas.length).toBeGreaterThanOrEqual(4);
      for (const delta of deltas) {
        expect(delta).toBeGreaterThan(0);
      }
    });
  });

  describe('Frame Counting', () => {
    it('should count frames', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(10);
      const frameCount = gameLoop.getFrameCount();
      gameLoop.stop();

      expect(frameCount).toBeGreaterThanOrEqual(8);
    });

    it('should increment frame count each frame', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      const frame1 = gameLoop.getFrameCount();
      await waitForFrames(5);
      const frame2 = gameLoop.getFrameCount();
      await waitForFrames(5);
      const frame3 = gameLoop.getFrameCount();
      gameLoop.stop();

      expect(frame2).toBeGreaterThan(frame1);
      expect(frame3).toBeGreaterThan(frame2);
    });

    it('should continue counting frames when paused', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      const frameBefore = gameLoop.getFrameCount();

      gameLoop.pause();
      await waitForFrames(5);
      const frameAfter = gameLoop.getFrameCount();

      expect(frameAfter).toBeGreaterThan(frameBefore);
    });
  });

  describe('FPS Calculation', () => {
    it('should calculate FPS', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(1100);
      const fps = gameLoop.getFPS();
      gameLoop.stop();

      expect(fps).toBeGreaterThan(30);
      expect(fps).toBeLessThan(120);
    });

    it('should update FPS approximately every second', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(500);
      const fps1 = gameLoop.getFPS();

      await waitForTime(600);
      const fps2 = gameLoop.getFPS();

      gameLoop.stop();

      expect(fps2).toBeGreaterThan(0);
    });

    it('should reset FPS counter after each update', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(1100);
      const fps1 = gameLoop.getFPS();

      await waitForTime(1000);
      const fps2 = gameLoop.getFPS();

      gameLoop.stop();

      expect(fps1).toBeGreaterThan(0);
      expect(fps2).toBeGreaterThan(0);
    });
  });

  describe('Frame Timing Metrics', () => {
    it('should track current frame time', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(5);
      const frameTime = gameLoop.getFrameTime();
      gameLoop.stop();

      expect(frameTime).toBeGreaterThan(0);
      expect(frameTime).toBeLessThan(100);
    });

    it('should track average frame time', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(200);
      const avgFrameTime = gameLoop.getAverageFrameTime();
      gameLoop.stop();

      expect(avgFrameTime).toBeGreaterThan(0);
      expect(avgFrameTime).toBeLessThan(100);
    });

    it('should track min frame time', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(200);
      const minFrameTime = gameLoop.getMinFrameTime();
      gameLoop.stop();

      expect(minFrameTime).toBeGreaterThan(0);
      expect(minFrameTime).toBeLessThan(100);
    });

    it('should track max frame time', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(200);
      const maxFrameTime = gameLoop.getMaxFrameTime();
      gameLoop.stop();

      expect(maxFrameTime).toBeGreaterThan(0);
      expect(maxFrameTime).toBeLessThan(200);
    });

    it('should have min <= avg <= max', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(300);
      const min = gameLoop.getMinFrameTime();
      const avg = gameLoop.getAverageFrameTime();
      const max = gameLoop.getMaxFrameTime();
      gameLoop.stop();

      expect(min).toBeLessThanOrEqual(avg);
      expect(avg).toBeLessThanOrEqual(max);
    });

    it('should reset stats', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(200);
      gameLoop.resetStats();

      expect(gameLoop.getFrameCount()).toBe(0);
      expect(gameLoop.getMinFrameTime()).toBe(0);
      expect(gameLoop.getMaxFrameTime()).toBe(0);
      expect(gameLoop.getAverageFrameTime()).toBe(0);

      gameLoop.stop();
    });
  });

  describe('Frame Callback', () => {
    it('should call frame callback each frame', async () => {
      const onFrame = jest.fn();
      gameLoop = new GameLoop(systemManager, { onFrame });

      gameLoop.start();
      await waitForFrames(5);
      gameLoop.stop();

      expect(onFrame).toHaveBeenCalled();
      expect(onFrame.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('should pass frame metrics to callback', async () => {
      const onFrame = jest.fn();
      gameLoop = new GameLoop(systemManager, { onFrame });

      gameLoop.start();
      await waitForFrames(3);
      gameLoop.stop();

      const lastCall = onFrame.mock.calls[onFrame.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty('frameCount');
      expect(lastCall).toHaveProperty('fps');
      expect(lastCall).toHaveProperty('deltaTime');
      expect(lastCall).toHaveProperty('frameTime');
      expect(lastCall).toHaveProperty('paused');
    });

    it('should indicate paused state in callback', async () => {
      const metrics = [];
      const onFrame = jest.fn((m) => metrics.push({ ...m }));
      gameLoop = new GameLoop(systemManager, { onFrame });

      gameLoop.start();
      await waitForFrames(3);

      gameLoop.pause();
      await waitForFrames(3);

      gameLoop.stop();

      const pausedMetrics = metrics.filter((m) => m.paused);
      expect(pausedMetrics.length).toBeGreaterThan(0);
    });

    it('should handle missing callback gracefully', async () => {
      gameLoop = new GameLoop(systemManager);

      expect(() => {
        gameLoop.start();
      }).not.toThrow();

      await waitForFrames(3);
      gameLoop.stop();
    });
  });

  describe('Integration', () => {
    it('should integrate with SystemManager', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForTime(100);
      gameLoop.stop();

      expect(systemManager.updateCallCount).toBeGreaterThan(0);
      expect(systemManager.updateCalls.length).toBeGreaterThan(0);
    });

    it('should maintain steady frame rate', async () => {
      gameLoop = new GameLoop(systemManager, { targetFPS: 60 });
      gameLoop.start();

      await waitForTime(1100);
      const fps = gameLoop.getFPS();
      gameLoop.stop();

      expect(fps).toBeGreaterThan(45);
      expect(fps).toBeLessThan(75);
    });

    it('should handle rapid pause/resume cycles', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      for (let i = 0; i < 5; i++) {
        await waitForFrames(2);
        gameLoop.pause();
        await waitForFrames(2);
        gameLoop.resume();
      }

      gameLoop.stop();
      expect(systemManager.updateCallCount).toBeGreaterThan(0);
    });

    it('should handle start/stop cycles', async () => {
      gameLoop = new GameLoop(systemManager);

      for (let i = 0; i < 3; i++) {
        gameLoop.start();
        await waitForFrames(5);
        gameLoop.stop();
        await waitForTime(50);
      }

      expect(systemManager.updateCallCount).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should maintain 60 FPS with empty system', async () => {
      gameLoop = new GameLoop(systemManager, { targetFPS: 60 });
      gameLoop.start();

      await waitForTime(1100);
      const fps = gameLoop.getFPS();
      const avgFrameTime = gameLoop.getAverageFrameTime();
      gameLoop.stop();

      expect(fps).toBeGreaterThan(50);
      expect(avgFrameTime).toBeLessThan(20);
    });

    it('should track frame timing accurately', async () => {
      const frameTimes = [];
      const onFrame = jest.fn((metrics) => {
        frameTimes.push(metrics.frameTime);
      });

      gameLoop = new GameLoop(systemManager, { onFrame });
      gameLoop.start();

      await waitForTime(200);
      gameLoop.stop();

      if (frameTimes.length > 2) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        expect(avg).toBeGreaterThan(10);
        expect(avg).toBeLessThan(25);
      }
    });

    it('should handle high update frequency', async () => {
      gameLoop = new GameLoop(systemManager, { targetFPS: 120 });
      gameLoop.start();

      await waitForTime(500);
      const updateCount = systemManager.updateCallCount;
      gameLoop.stop();

      expect(updateCount).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Edge Cases', () => {
    it('should handle stop without start', () => {
      gameLoop = new GameLoop(systemManager);

      expect(() => {
        gameLoop.stop();
      }).not.toThrow();
    });

    it('should handle multiple stops', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      gameLoop.stop();
      gameLoop.stop();
      gameLoop.stop();

      expect(gameLoop.isRunning()).toBe(false);
    });

    it('should handle pause immediately after start', () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();
      gameLoop.pause();

      expect(gameLoop.isRunning()).toBe(true);
      expect(gameLoop.isPaused()).toBe(true);
    });

    it('should handle stop while paused', async () => {
      gameLoop = new GameLoop(systemManager);
      gameLoop.start();

      await waitForFrames(3);
      gameLoop.pause();
      gameLoop.stop();

      expect(gameLoop.isRunning()).toBe(false);
      expect(gameLoop.isPaused()).toBe(false);
    });

    it('should return 0 for avg frame time with no frames', () => {
      gameLoop = new GameLoop(systemManager);
      expect(gameLoop.getAverageFrameTime()).toBe(0);
    });

    it('should return 0 for min frame time with no frames', () => {
      gameLoop = new GameLoop(systemManager);
      expect(gameLoop.getMinFrameTime()).toBe(0);
    });
  });
});
