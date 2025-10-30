/**
 * SpatialHash Test Suite
 * Tests spatial partitioning for broad-phase collision detection.
 */

import { SpatialHash } from '../../../src/engine/physics/SpatialHash.js';

describe('SpatialHash', () => {
  let spatialHash;

  beforeEach(() => {
    spatialHash = new SpatialHash(64);
  });

  describe('Initialization', () => {
    it('should create spatial hash with cell size', () => {
      const hash = new SpatialHash(32);

      expect(hash.cellSize).toBe(32);
    });

    it('should use default cell size of 64', () => {
      const hash = new SpatialHash();

      expect(hash.cellSize).toBe(64);
    });
  });

  describe('Hash Calculation', () => {
    it('should calculate cell hash for position', () => {
      const hash1 = spatialHash.hash(0, 0);
      const hash2 = spatialHash.hash(32, 32);
      const hash3 = spatialHash.hash(64, 64);

      expect(hash1).toBe('0,0');
      expect(hash2).toBe('0,0'); // Still in cell (0,0)
      expect(hash3).toBe('1,1'); // New cell
    });

    it('should handle negative coordinates', () => {
      const hash1 = spatialHash.hash(-10, -10);
      const hash2 = spatialHash.hash(-65, -65);

      expect(hash1).toBe('-1,-1');
      expect(hash2).toBe('-2,-2');
    });

    it('should place adjacent positions in same cell', () => {
      const hash1 = spatialHash.hash(10, 10);
      const hash2 = spatialHash.hash(20, 20);
      const hash3 = spatialHash.hash(63, 63);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should place distant positions in different cells', () => {
      const hash1 = spatialHash.hash(0, 0);
      const hash2 = spatialHash.hash(100, 100);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Entity Insertion', () => {
    it('should insert entity at position', () => {
      spatialHash.insert(1, 10, 10, 16, 16);

      const results = spatialHash.query(10, 10, 16, 16);

      expect(results).toContain(1);
    });

    it('should insert entity spanning multiple cells', () => {
      // Entity from (0,0) to (100,100) spans 4 cells with cellSize 64
      spatialHash.insert(1, 0, 0, 100, 100);

      // Query each corner
      const results1 = spatialHash.query(0, 0, 1, 1);
      const results2 = spatialHash.query(99, 0, 1, 1);
      const results3 = spatialHash.query(0, 99, 1, 1);
      const results4 = spatialHash.query(99, 99, 1, 1);

      expect(results1).toContain(1);
      expect(results2).toContain(1);
      expect(results3).toContain(1);
      expect(results4).toContain(1);
    });

    it('should insert multiple entities', () => {
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.insert(2, 20, 20, 16, 16);
      spatialHash.insert(3, 40, 40, 16, 16);

      const results = spatialHash.query(0, 0, 50, 50);

      expect(results).toContain(1);
      expect(results).toContain(2);
      expect(results).toContain(3);
    });

    it('should handle entities with zero size', () => {
      spatialHash.insert(1, 50, 50, 0, 0);

      const results = spatialHash.query(50, 50, 1, 1);

      expect(results).toContain(1);
    });

    it('should insert at exact cell boundaries', () => {
      // At cell boundary (64, 64)
      spatialHash.insert(1, 64, 64, 16, 16);

      const results = spatialHash.query(64, 64, 16, 16);

      expect(results).toContain(1);
    });
  });

  describe('Spatial Queries', () => {
    beforeEach(() => {
      // Create a grid of entities
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.insert(2, 100, 100, 16, 16);
      spatialHash.insert(3, 200, 200, 16, 16);
      spatialHash.insert(4, 50, 50, 16, 16);
    });

    it('should query entities in region', () => {
      const results = spatialHash.query(0, 0, 64, 64);

      expect(results).toContain(1);
      expect(results).toContain(4);
      expect(results).not.toContain(3);
      // Entity 2 at (100, 100) may be in adjacent cells depending on query region
    });

    it('should query small region', () => {
      const results = spatialHash.query(0, 0, 20, 20);

      expect(results).toContain(1);
      expect(results).not.toContain(2);
      expect(results).not.toContain(3);
      // Entity 4 at (50, 50) is in the same cell as entity 1 with cellSize 64
    });

    it('should query large region spanning multiple cells', () => {
      const results = spatialHash.query(0, 0, 300, 300);

      expect(results).toContain(1);
      expect(results).toContain(2);
      expect(results).toContain(3);
      expect(results).toContain(4);
    });

    it('should return empty array for empty region', () => {
      const results = spatialHash.query(1000, 1000, 64, 64);

      expect(results).toEqual([]);
    });

    it('should not duplicate entities in results', () => {
      // Insert entity spanning multiple cells
      spatialHash.insert(5, 0, 0, 128, 128);

      // Query region that includes all cells containing entity
      const results = spatialHash.query(0, 0, 128, 128);

      const count5 = results.filter((id) => id === 5).length;
      expect(count5).toBe(1);
    });

    it('should handle query at cell boundaries', () => {
      spatialHash.insert(10, 63, 63, 2, 2); // Spans cell boundary

      const results = spatialHash.query(63, 63, 2, 2);

      expect(results).toContain(10);
    });

    it('should handle negative coordinate queries', () => {
      spatialHash.insert(10, -50, -50, 16, 16);

      const results = spatialHash.query(-60, -60, 30, 30);

      expect(results).toContain(10);
    });
  });

  describe('Update and Removal', () => {
    it('should update entity position and move buckets', () => {
      spatialHash.insert(1, 0, 0, 16, 16);

      spatialHash.update(1, 128, 128, 16, 16);

      const oldCell = spatialHash.query(0, 0, 32, 32);
      const newCell = spatialHash.query(128, 128, 32, 32);

      expect(oldCell).not.toContain(1);
      expect(newCell).toContain(1);
    });

    it('should no-op update when bounds remain in same cells', () => {
      spatialHash.insert(1, 0, 0, 16, 16);

      spatialHash.update(1, 10, 10, 16, 16);

      const results = spatialHash.query(0, 0, 32, 32);
      expect(results).toContain(1);
    });

    it('should remove entity from hash', () => {
      spatialHash.insert(1, 0, 0, 16, 16);

      const removed = spatialHash.remove(1);
      const results = spatialHash.query(0, 0, 32, 32);

      expect(removed).toBe(true);
      expect(results).not.toContain(1);
    });

    it('should return false when removing unknown entity', () => {
      expect(spatialHash.remove(999)).toBe(false);
    });

    it('should rebuild from source data', () => {
      const entityIds = [1, 2, 3];
      const boundsMap = {
        1: { x: 0, y: 0, width: 10, height: 10 },
        2: { x: 100, y: 0, width: 10, height: 10 },
        3: { x: 0, y: 100, width: 10, height: 10 },
      };

      spatialHash.rebuild(entityIds, (id) => boundsMap[id]);

      expect(spatialHash.query(0, 0, 20, 20)).toContain(1);
      expect(spatialHash.query(100, 0, 20, 20)).toContain(2);
      expect(spatialHash.query(0, 100, 20, 20)).toContain(3);
    });

    it('should report metrics', () => {
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.insert(2, 0, 0, 16, 16);
      spatialHash.insert(3, 64, 64, 16, 16);
      spatialHash.update(3, 128, 128, 16, 16);
      spatialHash.remove(2);

      const metrics = spatialHash.getMetrics();

      expect(metrics.cellCount).toBeGreaterThan(0);
      expect(metrics.maxBucketSize).toBeGreaterThan(0);
      expect(metrics.trackedEntities).toBe(2);
      expect(metrics.stats.insertions).toBeGreaterThan(0);
      expect(metrics.stats.updates).toBeGreaterThanOrEqual(1);
      expect(metrics.stats.removals).toBeGreaterThan(0);
    });
  });

  describe('Clear', () => {
    it('should clear all entities', () => {
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.insert(2, 50, 50, 16, 16);
      spatialHash.insert(3, 100, 100, 16, 16);

      spatialHash.clear();

      const results = spatialHash.query(0, 0, 200, 200);

      expect(results).toEqual([]);
    });

    it('should allow reuse after clear', () => {
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.clear();
      spatialHash.insert(2, 0, 0, 16, 16);

      const results = spatialHash.query(0, 0, 20, 20);

      expect(results).toContain(2);
      expect(results).not.toContain(1);
    });
  });

  describe('Performance', () => {
    it('should insert 1000 entities in under 50ms', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 1000;
        spatialHash.insert(i, x, y, 16, 16);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should query 1000 entities efficiently', () => {
      // Insert 1000 entities
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 1000;
        spatialHash.insert(i, x, y, 16, 16);
      }

      const start = performance.now();
      const results = spatialHash.query(400, 400, 200, 200);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('should clear 1000 entities quickly', () => {
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 1000;
        spatialHash.insert(i, x, y, 16, 16);
      }

      const start = performance.now();
      spatialHash.clear();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
    });

    it('should be more efficient than O(n²) for collision checks', () => {
      const entityCount = 100;
      const entities = [];

      // Create entities in clusters
      for (let i = 0; i < entityCount; i++) {
        const cluster = Math.floor(i / 10);
        const x = cluster * 200 + Math.random() * 100;
        const y = cluster * 200 + Math.random() * 100;
        entities.push({ id: i, x, y, width: 16, height: 16 });
        spatialHash.insert(i, x, y, 16, 16);
      }

      // Query each entity's region
      const start = performance.now();
      let totalChecks = 0;

      for (const entity of entities) {
        const nearby = spatialHash.query(
          entity.x - 50,
          entity.y - 50,
          100,
          100
        );
        totalChecks += nearby.length;
      }

      const elapsed = performance.now() - start;

      // Should check far fewer than n² entities (10000)
      expect(totalChecks).toBeLessThan(entityCount * entityCount);
      expect(elapsed).toBeLessThan(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large coordinates', () => {
      spatialHash.insert(1, 10000, 10000, 16, 16);

      const results = spatialHash.query(10000, 10000, 20, 20);

      expect(results).toContain(1);
    });

    it('should handle very small cell size', () => {
      const smallHash = new SpatialHash(1);
      smallHash.insert(1, 0.5, 0.5, 0.5, 0.5);

      const results = smallHash.query(0, 0, 1, 1);

      expect(results).toContain(1);
    });

    it('should handle very large entities', () => {
      spatialHash.insert(1, 0, 0, 1000, 1000);

      const results = spatialHash.query(500, 500, 10, 10);

      expect(results).toContain(1);
    });

    it('should handle entities at origin', () => {
      spatialHash.insert(1, 0, 0, 16, 16);

      const results = spatialHash.query(0, 0, 16, 16);

      expect(results).toContain(1);
    });

    it('should replace previous location when reinserting same entity', () => {
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.insert(1, 100, 100, 16, 16);

      const results1 = spatialHash.query(0, 0, 20, 20);
      const results2 = spatialHash.query(100, 100, 20, 20);

      expect(results1).not.toContain(1);
      expect(results2).toContain(1);
    });
  });

  describe('Cell Size Impact', () => {
    it('should affect query performance with different cell sizes', () => {
      const smallCellHash = new SpatialHash(16);
      const largeCellHash = new SpatialHash(256);

      // Insert same entities in both
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 1000;
        smallCellHash.insert(i, x, y, 16, 16);
        largeCellHash.insert(i, x, y, 16, 16);
      }

      // Query small region
      const start1 = performance.now();
      smallCellHash.query(500, 500, 50, 50);
      const elapsed1 = performance.now() - start1;

      const start2 = performance.now();
      largeCellHash.query(500, 500, 50, 50);
      const elapsed2 = performance.now() - start2;

      // Both should be fast
      expect(elapsed1).toBeLessThan(10);
      expect(elapsed2).toBeLessThan(10);
    });

    it('should distribute entities across cells appropriately', () => {
      // With cellSize 64, entities at (0,0) and (128,128) are in different cells
      spatialHash.insert(1, 0, 0, 16, 16);
      spatialHash.insert(2, 128, 128, 16, 16);

      const results1 = spatialHash.query(0, 0, 20, 20);
      const results2 = spatialHash.query(128, 128, 20, 20);

      expect(results1).toContain(1);
      expect(results1).not.toContain(2);
      expect(results2).toContain(2);
      expect(results2).not.toContain(1);
    });
  });
});
