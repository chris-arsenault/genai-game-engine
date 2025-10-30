/**
 * Collision Detectors Test Suite
 * Tests narrow-phase collision detection algorithms
 */

import {
  aabbVsAabb,
  circleVsCircle,
  aabbVsCircle,
  detectCollision,
  testCollision
} from '../../../src/engine/physics/collisionDetectors.js';

describe('Collision Detectors', () => {
  describe('aabbVsAabb', () => {
    it('should detect collision between overlapping AABBs', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 10, y: 10, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
      expect(result.penetration).toBeGreaterThan(0);
    });

    it('should return null for non-overlapping AABBs', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 50, y: 50, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).toBeNull();
    });

    it('should detect edge-to-edge touching AABBs', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 20, y: 0, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).toBeNull(); // Touching but not overlapping
    });

    it('should calculate correct normal for horizontal collision', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 15, y: 5, width: 20, height: 10 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(Math.abs(result.normalX)).toBe(1);
      expect(result.normalY).toBe(0);
    });

    it('should calculate correct normal for vertical collision', () => {
      const aabbA = { x: 0, y: 0, width: 10, height: 20 };
      const aabbB = { x: 5, y: 15, width: 10, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.normalX).toBe(0);
      expect(Math.abs(result.normalY)).toBe(1);
    });

    it('should calculate penetration depth correctly', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 15, y: 0, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.penetration).toBeCloseTo(5, 1);
    });

    it('should handle completely contained AABB', () => {
      const aabbA = { x: 0, y: 0, width: 100, height: 100 };
      const aabbB = { x: 40, y: 40, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const aabbA = { x: -20, y: -20, width: 20, height: 20 };
      const aabbB = { x: -10, y: -10, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should handle AABBs with different sizes', () => {
      const aabbA = { x: 0, y: 0, width: 10, height: 10 };
      const aabbB = { x: 5, y: 5, width: 50, height: 50 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should return correct normal direction from B to A', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 15, y: 0, width: 20, height: 20 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.normalX).toBe(1); // B is to the right of A
    });

    it('should expose contact point and separation vector for overlaps', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 15, y: 5, width: 10, height: 10 };

      const result = aabbVsAabb(aabbA, aabbB);

      expect(result).not.toBeNull();
      expect(result.contactX).toBeCloseTo(20, 3);
      expect(result.contactY).toBeCloseTo(10, 3);
      expect(result.separationX).toBeCloseTo(result.normalX * result.penetration, 5);
      expect(result.separationY).toBeCloseTo(result.normalY * result.penetration, 5);
    });

    it('should return null when provided with invalid AABB data', () => {
      const aabbA = { x: 0, y: 0, width: 0, height: 10 };
      const aabbB = { x: 10, y: 10, width: 10, height: 10 };

      expect(aabbVsAabb(aabbA, aabbB)).toBeNull();
    });
  });

  describe('circleVsCircle', () => {
    it('should detect collision between overlapping circles', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 15, y: 0, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
      expect(result.penetration).toBeCloseTo(5, 1);
    });

    it('should return null for non-overlapping circles', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 50, y: 50, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).toBeNull();
    });

    it('should detect edge-to-edge touching circles', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 20, y: 0, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).toBeNull(); // Touching but not overlapping
    });

    it('should calculate correct collision normal', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 10, y: 0, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      expect(result.normalX).toBeCloseTo(1, 1);
      expect(result.normalY).toBeCloseTo(0, 1);
    });

    it('should calculate correct normal for diagonal collision', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 10, y: 10, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      const expectedNormal = Math.sqrt(2) / 2;
      expect(result.normalX).toBeCloseTo(expectedNormal, 1);
      expect(result.normalY).toBeCloseTo(expectedNormal, 1);
    });

    it('should handle completely overlapping circles', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 0, y: 0, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
      expect(result.penetration).toBeCloseTo(20, 1);
    });

    it('should handle circles with different radii', () => {
      const circleA = { x: 0, y: 0, radius: 5 };
      const circleB = { x: 10, y: 0, radius: 15 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
      expect(result.penetration).toBeCloseTo(10, 1);
    });

    it('should handle negative coordinates', () => {
      const circleA = { x: -10, y: -10, radius: 10 };
      const circleB = { x: -5, y: -5, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should surface contact point information', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 15, y: 0, radius: 10 };

      const result = circleVsCircle(circleA, circleB);

      expect(result).not.toBeNull();
      expect(result.contactX).toBeCloseTo(10, 3);
      expect(result.contactY).toBeCloseTo(0, 3);
      expect(result.separationX).toBeCloseTo(result.normalX * result.penetration, 5);
    });

    it('should return null for invalid circle data', () => {
      const circleA = { x: 0, y: 0, radius: 0 };
      const circleB = { x: 1, y: 1, radius: 1 };

      expect(circleVsCircle(circleA, circleB)).toBeNull();
    });
  });

  describe('aabbVsCircle', () => {
    it('should detect collision between overlapping AABB and circle', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 25, y: 10, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should return null for non-overlapping AABB and circle', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 50, y: 50, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).toBeNull();
    });

    it('should detect circle centered on AABB edge', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 20, y: 10, radius: 5 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should detect circle overlapping AABB corner', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 25, y: 25, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should calculate correct normal for side collision', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 28, y: 10, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.normalX).toBeCloseTo(1, 1);
      expect(Math.abs(result.normalY)).toBeLessThan(0.1);
    });

    it('should handle circle completely inside AABB', () => {
      const aabb = { x: 0, y: 0, width: 100, height: 100 };
      const circle = { x: 50, y: 50, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should handle circle with center inside AABB', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 10, y: 10, radius: 20 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should return correct penetration depth', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 25, y: 10, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.penetration).toBeCloseTo(5, 1);
    });

    it('should handle negative coordinates', () => {
      const aabb = { x: -20, y: -20, width: 20, height: 20 };
      const circle = { x: -15, y: -15, radius: 10 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should not detect collision when circle is just outside corner', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 30, y: 30, radius: 5 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).toBeNull();
    });

    it('should provide contact data for interior overlap cases', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 15, y: 10, radius: 8 };

      const result = aabbVsCircle(aabb, circle);

      expect(result).not.toBeNull();
      expect(result.contactX).toBeCloseTo(20, 3);
      expect(result.normalX).toBeCloseTo(1, 3);
    });

    it('should return null when provided invalid circle parameters', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 10, y: 10, radius: -1 };

      expect(aabbVsCircle(aabb, circle)).toBeNull();
    });
  });

  describe('detectCollision', () => {
    it('should route AABB vs AABB collision', () => {
      const shapeA = { type: 'AABB', x: 0, y: 0, width: 20, height: 20 };
      const shapeB = { type: 'AABB', x: 10, y: 10, width: 20, height: 20 };

      const result = detectCollision(shapeA, shapeB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should route Circle vs Circle collision', () => {
      const shapeA = { type: 'circle', x: 0, y: 0, radius: 10 };
      const shapeB = { type: 'circle', x: 15, y: 0, radius: 10 };

      const result = detectCollision(shapeA, shapeB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should route AABB vs Circle collision', () => {
      const shapeA = { type: 'AABB', x: 0, y: 0, width: 20, height: 20 };
      const shapeB = { type: 'circle', x: 25, y: 10, radius: 10 };

      const result = detectCollision(shapeA, shapeB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should route Circle vs AABB collision', () => {
      const shapeA = { type: 'circle', x: 25, y: 10, radius: 10 };
      const shapeB = { type: 'AABB', x: 0, y: 0, width: 20, height: 20 };

      const result = detectCollision(shapeA, shapeB);

      expect(result).not.toBeNull();
      expect(result.colliding).toBe(true);
    });

    it('should handle case-insensitive type matching', () => {
      const shapeA = { type: 'aabb', x: 0, y: 0, width: 20, height: 20 };
      const shapeB = { type: 'Circle', x: 25, y: 10, radius: 10 };

      const result = detectCollision(shapeA, shapeB);

      expect(result).not.toBeNull();
    });

    it('should return null for unsupported shape types', () => {
      const shapeA = { type: 'polygon', x: 0, y: 0 };
      const shapeB = { type: 'AABB', x: 10, y: 10, width: 20, height: 20 };

      const result = detectCollision(shapeA, shapeB);

      expect(result).toBeNull();
    });

    it('should return null when shape type metadata is missing', () => {
      const shapeA = { x: 0, y: 0, width: 20, height: 20 };
      const shapeB = { type: 'AABB', x: 10, y: 10, width: 20, height: 20 };

      expect(detectCollision(shapeA, shapeB)).toBeNull();
    });

    it('should flip normal when swapping Circle vs AABB', () => {
      const shapeA = { type: 'circle', x: 25, y: 10, radius: 10 };
      const shapeB = { type: 'AABB', x: 0, y: 0, width: 20, height: 20 };

      const result1 = detectCollision(shapeA, shapeB);
      const result2 = detectCollision(shapeB, shapeA);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      // Normals should be flipped
      expect(result1.normalX).toBeCloseTo(-result2.normalX, 1);
      expect(result1.normalY).toBeCloseTo(-result2.normalY, 1);
    });
  });

  describe('testCollision', () => {
    it('should return true for colliding shapes', () => {
      const shapeA = { type: 'AABB', x: 0, y: 0, width: 20, height: 20 };
      const shapeB = { type: 'AABB', x: 10, y: 10, width: 20, height: 20 };

      const result = testCollision(shapeA, shapeB);

      expect(result).toBe(true);
    });

    it('should return false for non-colliding shapes', () => {
      const shapeA = { type: 'AABB', x: 0, y: 0, width: 20, height: 20 };
      const shapeB = { type: 'AABB', x: 50, y: 50, width: 20, height: 20 };

      const result = testCollision(shapeA, shapeB);

      expect(result).toBe(false);
    });

    it('should work with different shape types', () => {
      const shapeA = { type: 'circle', x: 0, y: 0, radius: 10 };
      const shapeB = { type: 'AABB', x: 5, y: 5, width: 20, height: 20 };

      const result = testCollision(shapeA, shapeB);

      expect(result).toBe(true);
    });
  });

  describe('Accuracy Tests', () => {
    it('should have no false positives for AABB separation', () => {
      const aabbA = { x: 0, y: 0, width: 10, height: 10 };
      const separations = [
        { x: 15, y: 0 },
        { x: 0, y: 15 },
        { x: 15, y: 15 },
        { x: -15, y: 0 },
        { x: 0, y: -15 }
      ];

      for (const sep of separations) {
        const aabbB = { x: sep.x, y: sep.y, width: 10, height: 10 };
        const result = aabbVsAabb(aabbA, aabbB);
        expect(result).toBeNull();
      }
    });

    it('should have no false positives for circle separation', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const separations = [
        { x: 25, y: 0 },
        { x: 0, y: 25 },
        { x: 18, y: 18 },
        { x: -25, y: 0 },
        { x: 0, y: -25 }
      ];

      for (const sep of separations) {
        const circleB = { x: sep.x, y: sep.y, radius: 10 };
        const result = circleVsCircle(circleA, circleB);
        expect(result).toBeNull();
      }
    });

    it('should detect all actual AABB collisions', () => {
      const aabbA = { x: 0, y: 0, width: 10, height: 10 };
      const overlaps = [
        { x: 5, y: 5 },
        { x: 9, y: 0 },
        { x: 0, y: 9 },
        { x: -5, y: -5 },
        { x: 2, y: 2 }
      ];

      for (const overlap of overlaps) {
        const aabbB = { x: overlap.x, y: overlap.y, width: 10, height: 10 };
        const result = aabbVsAabb(aabbA, aabbB);
        expect(result).not.toBeNull();
      }
    });

    it('should detect all actual circle collisions', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const overlaps = [
        { x: 15, y: 0 },
        { x: 0, y: 15 },
        { x: 10, y: 10 },
        { x: -10, y: -10 },
        { x: 5, y: 5 }
      ];

      for (const overlap of overlaps) {
        const circleB = { x: overlap.x, y: overlap.y, radius: 10 };
        const result = circleVsCircle(circleA, circleB);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('Performance', () => {
    it('should handle 10000 AABB collision tests in under 50ms', () => {
      const aabbA = { x: 0, y: 0, width: 20, height: 20 };
      const aabbB = { x: 10, y: 10, width: 20, height: 20 };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        aabbVsAabb(aabbA, aabbB);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle 10000 circle collision tests in under 50ms', () => {
      const circleA = { x: 0, y: 0, radius: 10 };
      const circleB = { x: 15, y: 0, radius: 10 };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        circleVsCircle(circleA, circleB);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle 10000 AABB vs Circle tests in under 50ms', () => {
      const aabb = { x: 0, y: 0, width: 20, height: 20 };
      const circle = { x: 25, y: 10, radius: 10 };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        aabbVsCircle(aabb, circle);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
