/**
 * Vector2 Test Suite
 * Tests 2D vector math operations and static methods.
 */

import { Vector2 } from '../../src/utils/Vector2.js';

describe('Vector2', () => {
  describe('Construction', () => {
    it('should create vector with x and y', () => {
      const v = new Vector2(10, 20);

      expect(v.x).toBe(10);
      expect(v.y).toBe(20);
    });

    it('should default to (0, 0)', () => {
      const v = new Vector2();

      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create zero vector', () => {
      const v = Vector2.zero();

      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create unit vector', () => {
      const v = Vector2.one();

      expect(v.x).toBe(1);
      expect(v.y).toBe(1);
    });

    it('should create right vector', () => {
      const v = Vector2.right();

      expect(v.x).toBe(1);
      expect(v.y).toBe(0);
    });

    it('should create up vector', () => {
      const v = Vector2.up();

      expect(v.x).toBe(0);
      expect(v.y).toBe(-1);
    });
  });

  describe('Set and Copy', () => {
    it('should set components', () => {
      const v = new Vector2(1, 2);

      v.set(10, 20);

      expect(v.x).toBe(10);
      expect(v.y).toBe(20);
    });

    it('should return self for chaining', () => {
      const v = new Vector2();

      const result = v.set(5, 5);

      expect(result).toBe(v);
    });

    it('should copy from another vector', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2();

      v2.copy(v1);

      expect(v2.x).toBe(10);
      expect(v2.y).toBe(20);
    });

    it('should clone vector', () => {
      const v1 = new Vector2(10, 20);

      const v2 = v1.clone();

      expect(v2.x).toBe(10);
      expect(v2.y).toBe(20);
      expect(v2).not.toBe(v1);
    });
  });

  describe('Addition', () => {
    it('should add vector', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(5, 8);

      v1.add(v2);

      expect(v1.x).toBe(15);
      expect(v1.y).toBe(28);
    });

    it('should return self for chaining', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(5, 8);

      const result = v1.add(v2);

      expect(result).toBe(v1);
    });

    it('should add using static method', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(5, 8);
      const out = new Vector2();

      Vector2.add(v1, v2, out);

      expect(out.x).toBe(15);
      expect(out.y).toBe(28);
      expect(v1.x).toBe(10); // Original unchanged
      expect(v2.x).toBe(5);
    });
  });

  describe('Subtraction', () => {
    it('should subtract vector', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(3, 5);

      v1.sub(v2);

      expect(v1.x).toBe(7);
      expect(v1.y).toBe(15);
    });

    it('should return self for chaining', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(3, 5);

      const result = v1.sub(v2);

      expect(result).toBe(v1);
    });

    it('should subtract using static method', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(3, 5);
      const out = new Vector2();

      Vector2.sub(v1, v2, out);

      expect(out.x).toBe(7);
      expect(out.y).toBe(15);
      expect(v1.x).toBe(10);
      expect(v2.x).toBe(3);
    });
  });

  describe('Multiplication', () => {
    it('should multiply by scalar', () => {
      const v = new Vector2(10, 20);

      v.multiply(2.5);

      expect(v.x).toBe(25);
      expect(v.y).toBe(50);
    });

    it('should return self for chaining', () => {
      const v = new Vector2(10, 20);

      const result = v.multiply(2);

      expect(result).toBe(v);
    });

    it('should handle negative scalar', () => {
      const v = new Vector2(10, 20);

      v.multiply(-1);

      expect(v.x).toBe(-10);
      expect(v.y).toBe(-20);
    });

    it('should handle zero scalar', () => {
      const v = new Vector2(10, 20);

      v.multiply(0);

      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('Division', () => {
    it('should divide by scalar', () => {
      const v = new Vector2(10, 20);

      v.divide(2);

      expect(v.x).toBe(5);
      expect(v.y).toBe(10);
    });

    it('should return self for chaining', () => {
      const v = new Vector2(10, 20);

      const result = v.divide(2);

      expect(result).toBe(v);
    });

    it('should handle division by zero', () => {
      const v = new Vector2(10, 20);

      v.divide(0);

      expect(v.x).toBe(10);
      expect(v.y).toBe(20);
    });

    it('should handle fractional division', () => {
      const v = new Vector2(10, 20);

      v.divide(3);

      expect(v.x).toBeCloseTo(3.333, 2);
      expect(v.y).toBeCloseTo(6.666, 2);
    });
  });

  describe('Length', () => {
    it('should calculate length', () => {
      const v = new Vector2(3, 4);

      expect(v.length()).toBe(5);
    });

    it('should calculate length of zero vector', () => {
      const v = new Vector2(0, 0);

      expect(v.length()).toBe(0);
    });

    it('should calculate squared length', () => {
      const v = new Vector2(3, 4);

      expect(v.lengthSq()).toBe(25);
    });

    it('should avoid sqrt in lengthSq', () => {
      const v = new Vector2(10, 10);

      expect(v.lengthSq()).toBe(200);
      expect(v.length()).toBeCloseTo(14.142, 2);
    });
  });

  describe('Normalization', () => {
    it('should normalize vector', () => {
      const v = new Vector2(3, 4);

      v.normalize();

      expect(v.length()).toBeCloseTo(1, 5);
      expect(v.x).toBeCloseTo(0.6, 5);
      expect(v.y).toBeCloseTo(0.8, 5);
    });

    it('should return self for chaining', () => {
      const v = new Vector2(3, 4);

      const result = v.normalize();

      expect(result).toBe(v);
    });

    it('should handle zero vector normalization', () => {
      const v = new Vector2(0, 0);

      v.normalize();

      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should handle already normalized vector', () => {
      const v = new Vector2(1, 0);

      v.normalize();

      expect(v.x).toBe(1);
      expect(v.y).toBe(0);
      expect(v.length()).toBeCloseTo(1, 5);
    });
  });

  describe('Dot Product', () => {
    it('should calculate dot product', () => {
      const v1 = new Vector2(2, 3);
      const v2 = new Vector2(4, 5);

      const dot = v1.dot(v2);

      expect(dot).toBe(23); // 2*4 + 3*5 = 23
    });

    it('should return 0 for perpendicular vectors', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);

      const dot = v1.dot(v2);

      expect(dot).toBe(0);
    });

    it('should return negative for opposite vectors', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(-1, 0);

      const dot = v1.dot(v2);

      expect(dot).toBe(-1);
    });
  });

  describe('Distance', () => {
    it('should calculate distance between vectors', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);

      const distance = v1.distanceTo(v2);

      expect(distance).toBe(5);
    });

    it('should calculate squared distance', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);

      const distanceSq = v1.distanceToSq(v2);

      expect(distanceSq).toBe(25);
    });

    it('should calculate distance using static method', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 6);

      const distance = Vector2.distance(v1, v2);

      expect(distance).toBe(5);
    });

    it('should calculate squared distance using static method', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 6);

      const distanceSq = Vector2.distanceSq(v1, v2);

      expect(distanceSq).toBe(25);
    });

    it('should return 0 for same position', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(10, 20);

      expect(v1.distanceTo(v2)).toBe(0);
    });
  });

  describe('Rotation', () => {
    it('should rotate vector by 90 degrees', () => {
      const v = new Vector2(1, 0);

      v.rotate(Math.PI / 2);

      expect(v.x).toBeCloseTo(0, 5);
      expect(v.y).toBeCloseTo(1, 5);
    });

    it('should rotate vector by 180 degrees', () => {
      const v = new Vector2(1, 0);

      v.rotate(Math.PI);

      expect(v.x).toBeCloseTo(-1, 5);
      expect(v.y).toBeCloseTo(0, 5);
    });

    it('should rotate vector by -90 degrees', () => {
      const v = new Vector2(1, 0);

      v.rotate(-Math.PI / 2);

      expect(v.x).toBeCloseTo(0, 5);
      expect(v.y).toBeCloseTo(-1, 5);
    });

    it('should return self for chaining', () => {
      const v = new Vector2(1, 0);

      const result = v.rotate(Math.PI / 4);

      expect(result).toBe(v);
    });

    it('should handle full rotation (360 degrees)', () => {
      const v = new Vector2(1, 0);

      v.rotate(Math.PI * 2);

      expect(v.x).toBeCloseTo(1, 5);
      expect(v.y).toBeCloseTo(0, 5);
    });
  });

  describe('Linear Interpolation', () => {
    it('should interpolate to target vector', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(10, 10);

      v1.lerp(v2, 0.5);

      expect(v1.x).toBe(5);
      expect(v1.y).toBe(5);
    });

    it('should return self for chaining', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(10, 10);

      const result = v1.lerp(v2, 0.5);

      expect(result).toBe(v1);
    });

    it('should handle t=0 (no interpolation)', () => {
      const v1 = new Vector2(5, 5);
      const v2 = new Vector2(10, 10);

      v1.lerp(v2, 0);

      expect(v1.x).toBe(5);
      expect(v1.y).toBe(5);
    });

    it('should handle t=1 (full interpolation)', () => {
      const v1 = new Vector2(5, 5);
      const v2 = new Vector2(10, 10);

      v1.lerp(v2, 1);

      expect(v1.x).toBe(10);
      expect(v1.y).toBe(10);
    });

    it('should handle t > 1 (extrapolation)', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(10, 10);

      v1.lerp(v2, 1.5);

      expect(v1.x).toBe(15);
      expect(v1.y).toBe(15);
    });
  });

  describe('Equality', () => {
    it('should compare vectors for equality', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(10, 20);

      expect(v1.equals(v2)).toBe(true);
    });

    it('should detect inequality', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(10, 21);

      expect(v1.equals(v2)).toBe(false);
    });

    it('should use epsilon for floating point comparison', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(10.00001, 20.00001);

      expect(v1.equals(v2)).toBe(true);
    });

    it('should respect custom epsilon', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(10.1, 20.1);

      expect(v1.equals(v2, 0.01)).toBe(false);
      expect(v1.equals(v2, 0.2)).toBe(true);
    });
  });

  describe('Chaining', () => {
    it('should support method chaining', () => {
      const v = new Vector2(10, 20);

      v.add(new Vector2(5, 5)).multiply(2).normalize();

      expect(v.length()).toBeCloseTo(1, 5);
    });

    it('should chain multiple operations', () => {
      const v = new Vector2(1, 0);

      const result = v
        .multiply(10)
        .add(new Vector2(5, 5))
        .rotate(Math.PI / 4)
        .normalize();

      expect(result).toBe(v);
      expect(v.length()).toBeCloseTo(1, 5);
    });
  });

  describe('Performance', () => {
    it('should create 10000 vectors in under 50ms', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        new Vector2(i, i);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should perform 10000 additions in under 10ms', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        v1.add(v2);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });

    it('should perform 10000 normalizations in under 20ms', () => {
      const vectors = [];
      for (let i = 0; i < 100; i++) {
        vectors.push(new Vector2(Math.random() * 100, Math.random() * 100));
      }

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        vectors[i % 100].normalize();
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(20);
    });

    it('should use static methods for allocation-free operations', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(5, 8);
      const out = new Vector2();

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        Vector2.add(v1, v2, out);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const v = new Vector2(1e10, 1e10);

      expect(v.length()).toBeCloseTo(Math.sqrt(2) * 1e10, -5);
    });

    it('should handle very small numbers', () => {
      const v = new Vector2(1e-10, 1e-10);

      expect(v.length()).toBeCloseTo(Math.sqrt(2) * 1e-10, 15);
    });

    it('should handle negative coordinates', () => {
      const v = new Vector2(-10, -20);

      v.add(new Vector2(5, 10));

      expect(v.x).toBe(-5);
      expect(v.y).toBe(-10);
    });

    it('should handle NaN gracefully', () => {
      const v = new Vector2(NaN, NaN);

      expect(v.length()).toBeNaN();
    });

    it('should handle Infinity', () => {
      const v = new Vector2(Infinity, Infinity);

      expect(v.length()).toBe(Infinity);
    });
  });
});
