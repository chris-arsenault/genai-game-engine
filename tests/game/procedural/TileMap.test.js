/**
 * @fileoverview Tests for TileMap - Efficient 2D tile grid
 */

import TileMap, { TileType } from '../../../src/game/procedural/TileMap.js';

describe('TileMap', () => {
  describe('constructor', () => {
    it('should create a TileMap with specified dimensions', () => {
      const map = new TileMap(10, 20, 32);
      expect(map.width).toBe(10);
      expect(map.height).toBe(20);
      expect(map.tileSize).toBe(32);
      expect(map.tiles).toBeInstanceOf(Uint8Array);
      expect(map.tiles.length).toBe(200);
    });

    it('should use default tile size of 32', () => {
      const map = new TileMap(10, 10);
      expect(map.tileSize).toBe(32);
    });

    it('should initialize all tiles to EMPTY (0)', () => {
      const map = new TileMap(5, 5);
      for (let i = 0; i < map.tiles.length; i++) {
        expect(map.tiles[i]).toBe(TileType.EMPTY);
      }
    });

    it('should throw error for invalid width', () => {
      expect(() => new TileMap(0, 10)).toThrow('Width must be a positive integer');
      expect(() => new TileMap(-5, 10)).toThrow('Width must be a positive integer');
      expect(() => new TileMap(1.5, 10)).toThrow('Width must be a positive integer');
    });

    it('should throw error for invalid height', () => {
      expect(() => new TileMap(10, 0)).toThrow('Height must be a positive integer');
      expect(() => new TileMap(10, -5)).toThrow('Height must be a positive integer');
      expect(() => new TileMap(10, 1.5)).toThrow('Height must be a positive integer');
    });

    it('should throw error for invalid tileSize', () => {
      expect(() => new TileMap(10, 10, 0)).toThrow('TileSize must be a positive integer');
      expect(() => new TileMap(10, 10, -5)).toThrow('TileSize must be a positive integer');
      expect(() => new TileMap(10, 10, 1.5)).toThrow('TileSize must be a positive integer');
    });
  });

  describe('getTile and setTile', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
    });

    it('should get and set tiles correctly', () => {
      expect(map.getTile(5, 5)).toBe(TileType.EMPTY);
      map.setTile(5, 5, TileType.WALL);
      expect(map.getTile(5, 5)).toBe(TileType.WALL);
    });

    it('should return EMPTY for out-of-bounds getTile', () => {
      expect(map.getTile(-1, 5)).toBe(TileType.EMPTY);
      expect(map.getTile(10, 5)).toBe(TileType.EMPTY);
      expect(map.getTile(5, -1)).toBe(TileType.EMPTY);
      expect(map.getTile(5, 10)).toBe(TileType.EMPTY);
      expect(map.getTile(100, 100)).toBe(TileType.EMPTY);
    });

    it('should return false for out-of-bounds setTile', () => {
      expect(map.setTile(-1, 5, TileType.WALL)).toBe(false);
      expect(map.setTile(10, 5, TileType.WALL)).toBe(false);
      expect(map.setTile(5, -1, TileType.WALL)).toBe(false);
      expect(map.setTile(5, 10, TileType.WALL)).toBe(false);
      expect(map.setTile(100, 100, TileType.WALL)).toBe(false);
    });

    it('should set tiles at boundaries correctly', () => {
      expect(map.setTile(0, 0, TileType.FLOOR)).toBe(true);
      expect(map.getTile(0, 0)).toBe(TileType.FLOOR);

      expect(map.setTile(9, 9, TileType.FLOOR)).toBe(true);
      expect(map.getTile(9, 9)).toBe(TileType.FLOOR);
    });

    it('should handle all tile types', () => {
      const types = [
        TileType.EMPTY,
        TileType.FLOOR,
        TileType.WALL,
        TileType.DOOR,
        TileType.WINDOW,
        TileType.STAIRS_UP,
        TileType.STAIRS_DOWN,
        TileType.DEBRIS,
        TileType.BLOOD,
        TileType.EVIDENCE,
      ];

      types.forEach((type, index) => {
        map.setTile(index, 0, type);
        expect(map.getTile(index, 0)).toBe(type);
      });
    });

    it('should be fast (< 20ms for 10000 operations)', () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        map.setTile(x, y, TileType.FLOOR);
        map.getTile(x, y);
      }

      const elapsed = performance.now() - start;
      // Target: < 0.2ms per operation pair on modern hardware; allow 20ms headroom for CI variance
      expect(elapsed).toBeLessThan(20);
    });
  });

  describe('isWalkable', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
    });

    it('should return true for walkable tiles', () => {
      map.setTile(0, 0, TileType.FLOOR);
      expect(map.isWalkable(0, 0)).toBe(true);

      map.setTile(1, 0, TileType.DOOR);
      expect(map.isWalkable(1, 0)).toBe(true);

      map.setTile(2, 0, TileType.STAIRS_UP);
      expect(map.isWalkable(2, 0)).toBe(true);

      map.setTile(3, 0, TileType.STAIRS_DOWN);
      expect(map.isWalkable(3, 0)).toBe(true);
    });

    it('should return false for non-walkable tiles', () => {
      map.setTile(0, 0, TileType.WALL);
      expect(map.isWalkable(0, 0)).toBe(false);

      map.setTile(1, 0, TileType.WINDOW);
      expect(map.isWalkable(1, 0)).toBe(false);

      map.setTile(2, 0, TileType.DEBRIS);
      expect(map.isWalkable(2, 0)).toBe(false);

      map.setTile(3, 0, TileType.BLOOD);
      expect(map.isWalkable(3, 0)).toBe(false);

      map.setTile(4, 0, TileType.EVIDENCE);
      expect(map.isWalkable(4, 0)).toBe(false);

      map.setTile(5, 0, TileType.EMPTY);
      expect(map.isWalkable(5, 0)).toBe(false);
    });

    it('should return false for out-of-bounds coordinates', () => {
      expect(map.isWalkable(-1, 0)).toBe(false);
      expect(map.isWalkable(10, 0)).toBe(false);
      expect(map.isWalkable(0, -1)).toBe(false);
      expect(map.isWalkable(0, 10)).toBe(false);
    });
  });

  describe('isSolid', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
    });

    it('should return true for walls', () => {
      map.setTile(0, 0, TileType.WALL);
      expect(map.isSolid(0, 0)).toBe(true);
    });

    it('should return false for non-wall tiles', () => {
      map.setTile(0, 0, TileType.FLOOR);
      expect(map.isSolid(0, 0)).toBe(false);

      map.setTile(1, 0, TileType.DOOR);
      expect(map.isSolid(1, 0)).toBe(false);

      map.setTile(2, 0, TileType.EMPTY);
      expect(map.isSolid(2, 0)).toBe(false);
    });

    it('should return false for out-of-bounds coordinates', () => {
      expect(map.isSolid(-1, 0)).toBe(false);
      expect(map.isSolid(10, 0)).toBe(false);
    });
  });

  describe('worldToTile and tileToWorld', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10, 32);
    });

    it('should convert world to tile coordinates', () => {
      expect(map.worldToTile(0, 0)).toEqual({ x: 0, y: 0 });
      expect(map.worldToTile(32, 32)).toEqual({ x: 1, y: 1 });
      expect(map.worldToTile(64, 96)).toEqual({ x: 2, y: 3 });
      expect(map.worldToTile(320, 320)).toEqual({ x: 10, y: 10 });
    });

    it('should handle fractional world coordinates', () => {
      expect(map.worldToTile(15, 15)).toEqual({ x: 0, y: 0 });
      expect(map.worldToTile(31, 31)).toEqual({ x: 0, y: 0 });
      expect(map.worldToTile(33, 33)).toEqual({ x: 1, y: 1 });
    });

    it('should convert tile to world coordinates', () => {
      expect(map.tileToWorld(0, 0)).toEqual({ x: 0, y: 0 });
      expect(map.tileToWorld(1, 1)).toEqual({ x: 32, y: 32 });
      expect(map.tileToWorld(2, 3)).toEqual({ x: 64, y: 96 });
      expect(map.tileToWorld(10, 10)).toEqual({ x: 320, y: 320 });
    });

    it('should roundtrip correctly for tile centers', () => {
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const world = map.tileToWorld(x, y);
          // Add half tile size to get center
          const centerX = world.x + 16;
          const centerY = world.y + 16;
          const tile = map.worldToTile(centerX, centerY);
          expect(tile).toEqual({ x, y });
        }
      }
    });

    it('should work with different tile sizes', () => {
      const map16 = new TileMap(10, 10, 16);
      expect(map16.worldToTile(48, 48)).toEqual({ x: 3, y: 3 });
      expect(map16.tileToWorld(3, 3)).toEqual({ x: 48, y: 48 });

      const map64 = new TileMap(10, 10, 64);
      expect(map64.worldToTile(128, 128)).toEqual({ x: 2, y: 2 });
      expect(map64.tileToWorld(2, 2)).toEqual({ x: 128, y: 128 });
    });
  });

  describe('fill', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
    });

    it('should fill entire map with specified tile type', () => {
      map.fill(TileType.FLOOR);
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(map.getTile(x, y)).toBe(TileType.FLOOR);
        }
      }
    });

    it('should overwrite existing tiles', () => {
      map.fill(TileType.FLOOR);
      map.setTile(5, 5, TileType.WALL);
      map.fill(TileType.EMPTY);
      expect(map.getTile(5, 5)).toBe(TileType.EMPTY);
    });
  });

  describe('fillRect', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
    });

    it('should fill rectangle with specified tile type', () => {
      map.fillRect(2, 2, 3, 3, TileType.FLOOR);

      // Check filled area
      for (let y = 2; y < 5; y++) {
        for (let x = 2; x < 5; x++) {
          expect(map.getTile(x, y)).toBe(TileType.FLOOR);
        }
      }

      // Check surrounding area is still empty
      expect(map.getTile(1, 1)).toBe(TileType.EMPTY);
      expect(map.getTile(5, 5)).toBe(TileType.EMPTY);
    });

    it('should handle partial out-of-bounds fill', () => {
      map.fillRect(8, 8, 5, 5, TileType.FLOOR);

      // Check in-bounds part is filled
      expect(map.getTile(8, 8)).toBe(TileType.FLOOR);
      expect(map.getTile(9, 9)).toBe(TileType.FLOOR);

      // Out of bounds should not crash
      expect(map.getTile(10, 10)).toBe(TileType.EMPTY);
    });

    it('should handle single tile rectangle', () => {
      map.fillRect(5, 5, 1, 1, TileType.WALL);
      expect(map.getTile(5, 5)).toBe(TileType.WALL);
      expect(map.getTile(4, 5)).toBe(TileType.EMPTY);
      expect(map.getTile(6, 5)).toBe(TileType.EMPTY);
    });

    it('should handle zero-size rectangle', () => {
      map.fillRect(5, 5, 0, 0, TileType.WALL);
      expect(map.getTile(5, 5)).toBe(TileType.EMPTY);
    });
  });

  describe('floodFill', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
      map.fill(TileType.FLOOR);
    });

    it('should flood fill connected region', () => {
      const filled = map.floodFill(5, 5, TileType.WALL);
      expect(filled).toBe(100); // All tiles

      // Check all tiles are now walls
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(map.getTile(x, y)).toBe(TileType.WALL);
        }
      }
    });

    it('should flood fill bounded region', () => {
      // Create a 3x3 room surrounded by walls
      map.fill(TileType.WALL);
      map.fillRect(2, 2, 3, 3, TileType.FLOOR);

      const filled = map.floodFill(3, 3, TileType.EMPTY);
      expect(filled).toBe(9); // 3x3 = 9 tiles

      // Check filled region
      for (let y = 2; y < 5; y++) {
        for (let x = 2; x < 5; x++) {
          expect(map.getTile(x, y)).toBe(TileType.EMPTY);
        }
      }

      // Check walls still intact
      expect(map.getTile(1, 1)).toBe(TileType.WALL);
      expect(map.getTile(5, 5)).toBe(TileType.WALL);
    });

    it('should return 0 if starting on same type', () => {
      map.fill(TileType.FLOOR);
      const filled = map.floodFill(5, 5, TileType.FLOOR);
      expect(filled).toBe(0);
    });

    it('should return 0 if out of bounds', () => {
      const filled = map.floodFill(-1, -1, TileType.WALL);
      expect(filled).toBe(0);
    });

    it('should handle single tile flood fill', () => {
      map.fill(TileType.WALL);
      map.setTile(5, 5, TileType.FLOOR);

      const filled = map.floodFill(5, 5, TileType.EMPTY);
      expect(filled).toBe(1);
      expect(map.getTile(5, 5)).toBe(TileType.EMPTY);
    });

    it('should complete in reasonable time for large map', () => {
      const largeMap = new TileMap(100, 100);
      largeMap.fill(TileType.FLOOR);

      const start = performance.now();
      const filled = largeMap.floodFill(50, 50, TileType.WALL);
      const elapsed = performance.now() - start;

      expect(filled).toBe(10000); // 100x100 = 10000 tiles
      expect(elapsed).toBeLessThan(20); // < 20ms target (relaxed for CI environments)
    });
  });

  describe('findConnectedRegions', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10);
    });

    it('should find single connected region', () => {
      map.fill(TileType.FLOOR);
      const regions = map.findConnectedRegions();

      expect(regions.length).toBe(1);
      expect(regions[0].length).toBe(100); // All 100 tiles
    });

    it('should find multiple disconnected regions', () => {
      // Create two separate rooms
      map.fillRect(0, 0, 3, 3, TileType.FLOOR); // 9 tiles
      map.fillRect(7, 7, 3, 3, TileType.FLOOR); // 9 tiles

      const regions = map.findConnectedRegions();

      expect(regions.length).toBe(2);
      expect(regions[0].length).toBe(9);
      expect(regions[1].length).toBe(9);
    });

    it('should return empty array for map with no walkable tiles', () => {
      map.fill(TileType.WALL);
      const regions = map.findConnectedRegions();
      expect(regions.length).toBe(0);
    });

    it('should handle corridors connecting rooms', () => {
      // Two rooms connected by corridor
      map.fillRect(0, 0, 3, 3, TileType.FLOOR); // Room 1
      map.fillRect(3, 1, 4, 1, TileType.FLOOR); // Corridor
      map.fillRect(7, 0, 3, 3, TileType.FLOOR); // Room 2

      const regions = map.findConnectedRegions();

      expect(regions.length).toBe(1); // All connected
      expect(regions[0].length).toBe(9 + 4 + 9); // Total walkable tiles
    });

    it('should handle all walkable tile types', () => {
      map.setTile(0, 0, TileType.FLOOR);
      map.setTile(1, 0, TileType.DOOR);
      map.setTile(2, 0, TileType.STAIRS_UP);
      map.setTile(3, 0, TileType.STAIRS_DOWN);

      const regions = map.findConnectedRegions();

      expect(regions.length).toBe(1);
      expect(regions[0].length).toBe(4);
    });

    it('should not cross walls', () => {
      // Create a vertical wall dividing the map
      map.fill(TileType.FLOOR);
      for (let y = 0; y < 10; y++) {
        map.setTile(5, y, TileType.WALL);
      }

      const regions = map.findConnectedRegions();

      expect(regions.length).toBe(2);
      expect(regions[0].length).toBe(50); // Left side
      expect(regions[1].length).toBe(40); // Right side (5 tiles x 10 rows - wall)
    });
  });

  describe('serialize and deserialize', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10, 32);
      // Create interesting pattern
      map.fillRect(0, 0, 10, 1, TileType.WALL);
      map.fillRect(0, 9, 10, 1, TileType.WALL);
      map.fillRect(0, 0, 1, 10, TileType.WALL);
      map.fillRect(9, 0, 1, 10, TileType.WALL);
      map.fillRect(1, 1, 8, 8, TileType.FLOOR);
      map.setTile(5, 5, TileType.DOOR);
      map.setTile(3, 3, TileType.STAIRS_UP);
      map.setTile(7, 7, TileType.EVIDENCE);
    });

    it('should serialize to JSON with base64 tiles', () => {
      const data = map.serialize();

      expect(data.width).toBe(10);
      expect(data.height).toBe(10);
      expect(data.tileSize).toBe(32);
      expect(typeof data.tiles).toBe('string');
      expect(data.tiles.length).toBeGreaterThan(0);
    });

    it('should deserialize correctly', () => {
      const data = map.serialize();
      const restored = TileMap.deserialize(data);

      expect(restored.width).toBe(map.width);
      expect(restored.height).toBe(map.height);
      expect(restored.tileSize).toBe(map.tileSize);

      // Check all tiles match
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(restored.getTile(x, y)).toBe(map.getTile(x, y));
        }
      }
    });

    it('should preserve all tile types', () => {
      const testMap = new TileMap(10, 1);
      const types = [
        TileType.EMPTY,
        TileType.FLOOR,
        TileType.WALL,
        TileType.DOOR,
        TileType.WINDOW,
        TileType.STAIRS_UP,
        TileType.STAIRS_DOWN,
        TileType.DEBRIS,
        TileType.BLOOD,
        TileType.EVIDENCE,
      ];

      types.forEach((type, index) => {
        testMap.setTile(index, 0, type);
      });

      const data = testMap.serialize();
      const restored = TileMap.deserialize(data);

      types.forEach((type, index) => {
        expect(restored.getTile(index, 0)).toBe(type);
      });
    });

    it('should throw error for invalid serialized data', () => {
      expect(() => TileMap.deserialize(null)).toThrow('Invalid serialized data');
      expect(() => TileMap.deserialize({})).toThrow('Invalid serialized data');
      expect(() => TileMap.deserialize({ width: 10 })).toThrow('Invalid serialized data');
    });

    it('should throw error for mismatched tiles length', () => {
      const data = map.serialize();
      data.width = 5; // Mismatch
      expect(() => TileMap.deserialize(data)).toThrow('Serialized tiles length mismatch');
    });

    it('should complete serialization quickly', () => {
      const largeMap = new TileMap(100, 100);
      largeMap.fill(TileType.FLOOR);

      const start = performance.now();
      const data = largeMap.serialize();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(12); // <12ms target (CI jitter buffer)
      expect(data.tiles.length).toBeGreaterThan(0);
    });

    it('should have reasonable serialized size', () => {
      const largeMap = new TileMap(100, 100);
      largeMap.fill(TileType.FLOOR);

      const data = largeMap.serialize();
      const jsonString = JSON.stringify(data);

      // Base64 encoding is ~4/3 original size, 10KB tiles -> ~13KB base64 + JSON overhead
      expect(jsonString.length).toBeLessThan(20000); // < 20KB
    });
  });

  describe('clone', () => {
    let map;

    beforeEach(() => {
      map = new TileMap(10, 10, 32);
      map.fillRect(2, 2, 5, 5, TileType.FLOOR);
      map.setTile(5, 5, TileType.DOOR);
    });

    it('should create a deep copy', () => {
      const cloned = map.clone();

      expect(cloned.width).toBe(map.width);
      expect(cloned.height).toBe(map.height);
      expect(cloned.tileSize).toBe(map.tileSize);

      // Check all tiles match
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(cloned.getTile(x, y)).toBe(map.getTile(x, y));
        }
      }
    });

    it('should be independent of original', () => {
      const cloned = map.clone();

      // Modify original
      map.setTile(5, 5, TileType.WALL);

      // Clone should be unchanged
      expect(cloned.getTile(5, 5)).toBe(TileType.DOOR);
      expect(map.getTile(5, 5)).toBe(TileType.WALL);
    });

    it('should not share underlying array', () => {
      const cloned = map.clone();
      expect(cloned.tiles).not.toBe(map.tiles);
    });
  });

  describe('memory efficiency', () => {
    it('should use 1 byte per tile (Uint8Array)', () => {
      const map = new TileMap(100, 100);
      expect(map.tiles.byteLength).toBe(10000); // 100x100 = 10KB

      // Compare to object array (theoretical)
      // Object array would be ~80KB (8 bytes per pointer + object overhead)
      const objectArraySize = 100 * 100 * 8; // At least 80KB
      expect(map.tiles.byteLength).toBeLessThan(objectArraySize / 7);
    });

    it('should handle large maps efficiently', () => {
      const largeMap = new TileMap(1000, 1000);
      expect(largeMap.tiles.byteLength).toBe(1000000); // 1MB for 1M tiles
    });
  });

  describe('TileType enum', () => {
    it('should have all required tile types', () => {
      expect(TileType.EMPTY).toBe(0);
      expect(TileType.FLOOR).toBe(1);
      expect(TileType.WALL).toBe(2);
      expect(TileType.DOOR).toBe(3);
      expect(TileType.WINDOW).toBe(4);
      expect(TileType.STAIRS_UP).toBe(5);
      expect(TileType.STAIRS_DOWN).toBe(6);
      expect(TileType.DEBRIS).toBe(7);
      expect(TileType.BLOOD).toBe(8);
      expect(TileType.EVIDENCE).toBe(9);
    });

    it('should have sequential values starting at 0', () => {
      const types = Object.values(TileType);
      expect(types).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('performance benchmarks', () => {
    it('should handle rapid read/write operations', () => {
      const map = new TileMap(100, 100);
      const iterations = 100000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const x = Math.floor(Math.random() * 100);
        const y = Math.floor(Math.random() * 100);
        map.setTile(x, y, TileType.FLOOR);
        map.getTile(x, y);
      }
      const elapsed = performance.now() - start;

      // Should complete 100k operations in reasonable time
      expect(elapsed).toBeLessThan(70); // < 70ms for 100k ops (jsdom variance)
    });

    it('should find connected regions quickly', () => {
      const map = new TileMap(100, 100);
      map.fill(TileType.FLOOR);

      // Create some walls to make it more interesting
      for (let i = 0; i < 20; i++) {
        map.fillRect(
          Math.floor(Math.random() * 90),
          Math.floor(Math.random() * 90),
          5,
          5,
          TileType.WALL
        );
      }

      const start = performance.now();
      const regions = map.findConnectedRegions();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(40); // < 40ms for complex 100x100 map (jsdom variance)
      expect(regions.length).toBeGreaterThan(0);
    });
  });
});
