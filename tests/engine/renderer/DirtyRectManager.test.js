/**
 * Tests for DirtyRectManager class
 */
import { DirtyRectManager } from '../../../src/engine/renderer/DirtyRectManager.js';

describe('DirtyRectManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DirtyRectManager(800, 600, 50);
  });

  describe('constructor', () => {
    it('should initialize with canvas dimensions', () => {
      expect(manager.canvasWidth).toBe(800);
      expect(manager.canvasHeight).toBe(600);
      expect(manager.mergeThreshold).toBe(50);
    });

    it('should start with no dirty rects', () => {
      expect(manager.dirtyRects).toEqual([]);
      expect(manager.fullRedraw).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear dirty rectangles', () => {
      manager.addDirtyRect(0, 0, 100, 100);
      manager.reset();

      expect(manager.dirtyRects).toEqual([]);
      expect(manager.fullRedraw).toBe(false);
    });
  });

  describe('addDirtyRect', () => {
    it('should add dirty rectangle', () => {
      manager.addDirtyRect(10, 20, 100, 150);

      expect(manager.dirtyRects.length).toBe(1);
      expect(manager.dirtyRects[0]).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 150,
      });
    });

    it('should clamp rectangle to canvas bounds', () => {
      manager.addDirtyRect(-50, -50, 200, 200);

      expect(manager.dirtyRects[0].x).toBe(0);
      expect(manager.dirtyRects[0].y).toBe(0);
      expect(manager.dirtyRects[0].width).toBeLessThanOrEqual(200);
      expect(manager.dirtyRects[0].height).toBeLessThanOrEqual(200);
    });

    it('should skip zero-area rectangles', () => {
      manager.addDirtyRect(10, 10, 0, 0);
      expect(manager.dirtyRects.length).toBe(0);
    });

    it('should mark full redraw if too many rects', () => {
      for (let i = 0; i < 101; i++) {
        manager.addDirtyRect(i, i, 10, 10);
      }

      expect(manager.fullRedraw).toBe(true);
    });
  });

  describe('markFullRedraw', () => {
    it('should set full redraw flag', () => {
      manager.markFullRedraw();

      expect(manager.fullRedraw).toBe(true);
      expect(manager.dirtyRects.length).toBe(1);
      expect(manager.dirtyRects[0]).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });
  });

  describe('isFullRedraw', () => {
    it('should return false initially', () => {
      expect(manager.isFullRedraw()).toBe(false);
    });

    it('should return true after marking full redraw', () => {
      manager.markFullRedraw();
      expect(manager.isFullRedraw()).toBe(true);
    });
  });

  describe('getOptimizedRects', () => {
    it('should return empty array if no dirty rects', () => {
      expect(manager.getOptimizedRects()).toEqual([]);
    });

    it('should return single rect unchanged', () => {
      manager.addDirtyRect(10, 10, 100, 100);
      const optimized = manager.getOptimizedRects();

      expect(optimized.length).toBe(1);
      expect(optimized[0]).toEqual({ x: 10, y: 10, width: 100, height: 100 });
    });

    it('should merge overlapping rectangles', () => {
      manager.addDirtyRect(10, 10, 50, 50);
      manager.addDirtyRect(30, 30, 50, 50);

      const optimized = manager.getOptimizedRects();

      expect(optimized.length).toBe(1);
      expect(optimized[0].x).toBe(10);
      expect(optimized[0].y).toBe(10);
      expect(optimized[0].width).toBe(70);
      expect(optimized[0].height).toBe(70);
    });

    it('should merge nearby rectangles within threshold', () => {
      manager.addDirtyRect(10, 10, 50, 50);
      manager.addDirtyRect(70, 10, 50, 50); // 10px gap

      const optimized = manager.getOptimizedRects();

      expect(optimized.length).toBe(1);
    });

    it('should not merge distant rectangles', () => {
      manager.addDirtyRect(10, 10, 50, 50);
      manager.addDirtyRect(200, 200, 50, 50);

      const optimized = manager.getOptimizedRects();

      expect(optimized.length).toBe(2);
    });

    it('should return full canvas rect if full redraw', () => {
      manager.markFullRedraw();
      const optimized = manager.getOptimizedRects();

      expect(optimized.length).toBe(1);
      expect(optimized[0]).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });
  });

  describe('getDirtyRectCount', () => {
    it('should return count of dirty rectangles', () => {
      expect(manager.getDirtyRectCount()).toBe(0);

      manager.addDirtyRect(10, 10, 50, 50);
      expect(manager.getDirtyRectCount()).toBe(1);

      manager.addDirtyRect(100, 100, 50, 50);
      expect(manager.getDirtyRectCount()).toBe(2);
    });
  });

  describe('getOptimizedRectCount', () => {
    it('should return count of optimized rectangles', () => {
      expect(manager.getOptimizedRectCount()).toBe(0);

      manager.addDirtyRect(10, 10, 50, 50);
      manager.addDirtyRect(30, 30, 50, 50);

      // Two rects should merge into one
      expect(manager.getOptimizedRectCount()).toBe(1);
    });
  });

  describe('getReductionPercentage', () => {
    it('should return 0 if no dirty rects', () => {
      expect(manager.getReductionPercentage()).toBe(0);
    });

    it('should calculate reduction percentage', () => {
      // Add 4 rects that merge into 2
      manager.addDirtyRect(10, 10, 50, 50);
      manager.addDirtyRect(30, 30, 50, 50); // Merges with first

      manager.addDirtyRect(200, 200, 50, 50);
      manager.addDirtyRect(220, 220, 50, 50); // Merges with third

      const reduction = manager.getReductionPercentage();

      expect(reduction).toBe(50); // 4 rects -> 2 rects = 50% reduction
    });
  });

  describe('resize', () => {
    it('should update canvas dimensions', () => {
      manager.resize(1024, 768);

      expect(manager.canvasWidth).toBe(1024);
      expect(manager.canvasHeight).toBe(768);
    });

    it('should mark full redraw', () => {
      manager.resize(1024, 768);
      expect(manager.fullRedraw).toBe(true);
    });
  });

  describe('merge optimization', () => {
    it('should merge multiple overlapping rects efficiently', () => {
      // Add many overlapping rects
      for (let i = 0; i < 10; i++) {
        manager.addDirtyRect(i * 5, i * 5, 50, 50);
      }

      const optimized = manager.getOptimizedRects();

      // Should merge into much fewer rects
      expect(optimized.length).toBeLessThan(5);
    });

    it('should handle complex merge scenarios', () => {
      manager.addDirtyRect(0, 0, 100, 100);
      manager.addDirtyRect(90, 0, 100, 100);
      manager.addDirtyRect(0, 90, 100, 100);
      manager.addDirtyRect(90, 90, 100, 100);

      const optimized = manager.getOptimizedRects();

      // All 4 rects overlap and should merge into 1
      expect(optimized.length).toBe(1);
      expect(optimized[0].width).toBeGreaterThanOrEqual(190);
      expect(optimized[0].height).toBeGreaterThanOrEqual(190);
    });
  });
});
