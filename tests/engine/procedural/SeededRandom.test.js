import { SeededRandom } from '../../../src/engine/procedural/SeededRandom.js';

describe('SeededRandom', () => {
  describe('constructor', () => {
    it('should create RNG with given seed', () => {
      const rng = new SeededRandom(12345);
      expect(rng).toBeDefined();
      expect(rng.state).toBeGreaterThan(0);
    });

    it('should handle seed of 0', () => {
      const rng = new SeededRandom(0);
      expect(rng.state).toBe(1);
    });

    it('should convert negative seeds to positive', () => {
      const rng = new SeededRandom(-12345);
      expect(rng.state).toBeGreaterThan(0);
    });

    it('should handle very large seeds', () => {
      const rng = new SeededRandom(Number.MAX_SAFE_INTEGER);
      expect(rng.state).toBeGreaterThan(0);
    });
  });

  describe('next', () => {
    it('should generate numbers in range [0, 1)', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 1000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should be deterministic - same seed produces same sequence', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const sequence1 = [];
      const sequence2 = [];

      for (let i = 0; i < 1000; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(43);

      const sequence1 = [];
      const sequence2 = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should pass basic uniformity test', () => {
      const rng = new SeededRandom(12345);
      const bucketCount = 10;
      const buckets = new Array(bucketCount).fill(0);
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const value = rng.next();
        const bucket = Math.floor(value * bucketCount);
        buckets[bucket]++;
      }

      // Each bucket should have roughly iterations/bucketCount values
      // Allow 20% deviation
      const expected = iterations / bucketCount;
      const tolerance = expected * 0.2;

      for (let i = 0; i < bucketCount; i++) {
        expect(buckets[i]).toBeGreaterThan(expected - tolerance);
        expect(buckets[i]).toBeLessThan(expected + tolerance);
      }
    });
  });

  describe('nextInt', () => {
    it('should generate integers in range [min, max]', () => {
      const rng = new SeededRandom(42);
      const min = 1;
      const max = 6;

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextInt(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should generate all values in range', () => {
      const rng = new SeededRandom(42);
      const min = 1;
      const max = 6;
      const seen = new Set();

      // Run enough times to likely see all values
      for (let i = 0; i < 1000; i++) {
        seen.add(rng.nextInt(min, max));
      }

      expect(seen.size).toBe(max - min + 1);
      for (let i = min; i <= max; i++) {
        expect(seen.has(i)).toBe(true);
      }
    });

    it('should handle single value range', () => {
      const rng = new SeededRandom(42);
      expect(rng.nextInt(5, 5)).toBe(5);
    });

    it('should handle negative ranges', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(-5);
      }
    });

    it('should throw error if min > max', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.nextInt(10, 5)).toThrow('Invalid range');
    });
  });

  describe('nextFloat', () => {
    it('should generate floats in range [min, max)', () => {
      const rng = new SeededRandom(42);
      const min = 10.0;
      const max = 20.0;

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should handle negative ranges', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat(-10.0, -5.0);
        expect(value).toBeGreaterThanOrEqual(-10.0);
        expect(value).toBeLessThan(-5.0);
      }
    });

    it('should throw error if min > max', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.nextFloat(10.0, 5.0)).toThrow('Invalid range');
    });
  });

  describe('nextBool', () => {
    it('should generate booleans with default 50% chance', () => {
      const rng = new SeededRandom(42);
      let trueCount = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (rng.nextBool()) {
          trueCount++;
        }
      }

      // Should be roughly 50% true, allow 5% deviation
      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });

    it('should respect custom probability', () => {
      const rng = new SeededRandom(42);
      let trueCount = 0;
      const iterations = 10000;
      const chance = 0.75;

      for (let i = 0; i < iterations; i++) {
        if (rng.nextBool(chance)) {
          trueCount++;
        }
      }

      // Should be roughly 75% true, allow 5% deviation
      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.70);
      expect(ratio).toBeLessThan(0.80);
    });

    it('should return false for chance of 0', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.nextBool(0)).toBe(false);
      }
    });

    it('should return true for chance of 1', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.nextBool(1)).toBe(true);
      }
    });

    it('should throw error for invalid chance', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.nextBool(-0.1)).toThrow('Invalid chance');
      expect(() => rng.nextBool(1.1)).toThrow('Invalid chance');
    });
  });

  describe('choice', () => {
    it('should select elements from array', () => {
      const rng = new SeededRandom(42);
      const array = ['a', 'b', 'c', 'd', 'e'];

      for (let i = 0; i < 100; i++) {
        const element = rng.choice(array);
        expect(array).toContain(element);
      }
    });

    it('should select all elements eventually', () => {
      const rng = new SeededRandom(42);
      const array = ['a', 'b', 'c'];
      const seen = new Set();

      for (let i = 0; i < 100; i++) {
        seen.add(rng.choice(array));
      }

      expect(seen.size).toBe(array.length);
    });

    it('should handle single element array', () => {
      const rng = new SeededRandom(42);
      const array = ['only'];
      expect(rng.choice(array)).toBe('only');
    });

    it('should throw error for empty array', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.choice([])).toThrow('Cannot choose from empty array');
    });

    it('should throw error for null/undefined', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.choice(null)).toThrow();
      expect(() => rng.choice(undefined)).toThrow();
    });
  });

  describe('shuffle', () => {
    it('should shuffle array in place', () => {
      const rng = new SeededRandom(42);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array = [...original];

      const result = rng.shuffle(array);

      // Should return same reference
      expect(result).toBe(array);

      // Should contain all original elements
      expect(array.length).toBe(original.length);
      for (const element of original) {
        expect(array).toContain(element);
      }

      // Should likely be in different order (not guaranteed but very likely)
      // We'll run this test a few times
      let differentOrder = false;
      for (let i = 0; i < array.length; i++) {
        if (array[i] !== original[i]) {
          differentOrder = true;
          break;
        }
      }
      expect(differentOrder).toBe(true);
    });

    it('should be deterministic', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const array1 = [1, 2, 3, 4, 5];
      const array2 = [1, 2, 3, 4, 5];

      rng1.shuffle(array1);
      rng2.shuffle(array2);

      expect(array1).toEqual(array2);
    });

    it('should handle empty array', () => {
      const rng = new SeededRandom(42);
      const array = [];
      expect(rng.shuffle(array)).toEqual([]);
    });

    it('should handle single element array', () => {
      const rng = new SeededRandom(42);
      const array = [1];
      expect(rng.shuffle(array)).toEqual([1]);
    });
  });

  describe('getState and setState', () => {
    it('should get and set state', () => {
      const rng = new SeededRandom(42);

      // Generate some numbers
      rng.next();
      rng.next();
      rng.next();

      const state = rng.getState();
      expect(state).toBeGreaterThan(0);

      // Generate more numbers
      const nextValue = rng.next();

      // Restore state
      rng.setState(state);

      // Should generate the same next value
      expect(rng.next()).toBe(nextValue);
    });

    it('should handle state of 0', () => {
      const rng = new SeededRandom(42);
      rng.setState(0);
      expect(rng.state).toBe(1);
    });
  });

  describe('clone', () => {
    it('should create independent clone with same state', () => {
      const rng1 = new SeededRandom(42);

      // Generate some numbers
      rng1.next();
      rng1.next();

      const rng2 = rng1.clone();

      // Both should generate same next value
      const value1 = rng1.next();
      const value2 = rng2.next();
      expect(value1).toBe(value2);

      // But they should be independent - diverge after calling next() again
      // Since they've both advanced by the same amount, calling next() once more
      // on each should still produce the same value
      const value3 = rng1.next();
      const value4 = rng2.next();
      expect(value3).toBe(value4);

      // To test independence, we advance rng1 one extra time
      rng1.next();
      // Now they should be out of sync
      expect(rng1.next()).not.toBe(rng2.next());
    });
  });

  describe('serialize and deserialize', () => {
    it('should serialize state', () => {
      const rng = new SeededRandom(42);
      rng.next();
      rng.next();

      const data = rng.serialize();
      expect(data).toHaveProperty('seed');
      expect(data).toHaveProperty('state');
      expect(typeof data.state).toBe('number');
    });

    it('should deserialize state', () => {
      const rng1 = new SeededRandom(42);
      rng1.next();
      rng1.next();

      const data = rng1.serialize();
      const rng2 = SeededRandom.deserialize(data);

      // Both should generate same next value
      expect(rng2.next()).toBe(rng1.next());
    });

    it('should handle roundtrip serialization', () => {
      const rng1 = new SeededRandom(42);

      // Advance the RNG to some state
      for (let i = 0; i < 5; i++) {
        rng1.next();
      }

      // Serialize at this point
      const data = rng1.serialize();
      const rng2 = SeededRandom.deserialize(data);

      // Both should generate the same next sequence
      const sequence1 = [];
      const sequence2 = [];
      for (let i = 0; i < 10; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence2).toEqual(sequence1);
    });
  });

  describe('performance', () => {
    it('should generate at least 5M random numbers per second', () => {
      const rng = new SeededRandom(42);
      const iterations = 5000000; // 5M for quick test

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        rng.next();
      }
      const elapsed = performance.now() - start;

      const opsPerSecond = (iterations / elapsed) * 1000;

      // Should exceed 5M ops/sec to stay resilient on lower-power CI nodes
      // Production profiles still land significantly higher (>90M ops/sec)
      expect(opsPerSecond).toBeGreaterThan(5000000);
    });
  });
});
