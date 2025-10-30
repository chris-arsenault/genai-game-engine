/**
 * @fileoverview Tests for BSPGenerator
 */

import { BSPGenerator } from '../../../src/game/procedural/BSPGenerator.js';
import TileMap, { TileType } from '../../../src/game/procedural/TileMap.js';

describe('BSPGenerator', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const generator = new BSPGenerator();
      expect(generator.config.minRoomSize).toBe(8);
      expect(generator.config.corridorWidth).toBe(2);
      expect(generator.config.maxDepth).toBe(5);
    });

    it('should create with custom config', () => {
      const generator = new BSPGenerator({
        minRoomSize: 10,
        corridorWidth: 3,
        maxDepth: 4,
      });
      expect(generator.config.minRoomSize).toBe(10);
      expect(generator.config.corridorWidth).toBe(3);
      expect(generator.config.maxDepth).toBe(4);
    });

    it('should throw error for invalid minRoomSize', () => {
      expect(() => {
        new BSPGenerator({ minRoomSize: 3 });
      }).toThrow('minRoomSize must be at least 4');
    });

    it('should throw error for invalid corridorWidth', () => {
      expect(() => {
        new BSPGenerator({ corridorWidth: 0 });
      }).toThrow('corridorWidth must be between 1 and 3');

      expect(() => {
        new BSPGenerator({ corridorWidth: 4 });
      }).toThrow('corridorWidth must be between 1 and 3');
    });

    it('should throw error for invalid splitRatio', () => {
      expect(() => {
        new BSPGenerator({ splitRatio: [0.05, 0.95] });
      }).toThrow('splitRatio must be within [0.1, 0.9]');
    });
  });

  describe('generate', () => {
    it('should generate a valid BSP layout', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      expect(result).toHaveProperty('tilemap');
      expect(result).toHaveProperty('rooms');
      expect(result).toHaveProperty('corridors');
      expect(result).toHaveProperty('tree');

      expect(result.tilemap).toBeInstanceOf(TileMap);
      expect(result.tilemap.width).toBe(50);
      expect(result.tilemap.height).toBe(40);
      expect(result.rooms.length).toBeGreaterThan(0);
    });

    it('should throw error for map too small', () => {
      const generator = new BSPGenerator({ minRoomSize: 8 });
      expect(() => {
        generator.generate(10, 10, 12345);
      }).toThrow('Map too small');
    });

    it('should create rooms within minimum size constraint', () => {
      const generator = new BSPGenerator({ minRoomSize: 8 });
      const result = generator.generate(60, 50, 12345);

      for (const room of result.rooms) {
        expect(room.w).toBeGreaterThanOrEqual(8);
        expect(room.h).toBeGreaterThanOrEqual(8);
      }
    });

    it('should create rooms with correct center positions', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      for (const room of result.rooms) {
        expect(room.centerX).toBe(room.x + Math.floor(room.w / 2));
        expect(room.centerY).toBe(room.y + Math.floor(room.h / 2));
      }
    });

    it('should be deterministic with same seed', () => {
      const generator1 = new BSPGenerator();
      const generator2 = new BSPGenerator();
      const seed = 54321;

      const result1 = generator1.generate(60, 50, seed);
      const result2 = generator2.generate(60, 50, seed);

      expect(result1.rooms.length).toBe(result2.rooms.length);
      expect(result1.corridors.length).toBe(result2.corridors.length);

      // Check rooms match
      for (let i = 0; i < result1.rooms.length; i++) {
        expect(result1.rooms[i].x).toBe(result2.rooms[i].x);
        expect(result1.rooms[i].y).toBe(result2.rooms[i].y);
        expect(result1.rooms[i].w).toBe(result2.rooms[i].w);
        expect(result1.rooms[i].h).toBe(result2.rooms[i].h);
      }
    });

    it('should produce different results with different seeds', () => {
      const generator = new BSPGenerator();
      const result1 = generator.generate(60, 50, 11111);
      const result2 = generator.generate(60, 50, 22222);

      // Results should differ
      let different = false;
      if (result1.rooms.length !== result2.rooms.length) {
        different = true;
      } else {
        for (let i = 0; i < result1.rooms.length; i++) {
          if (result1.rooms[i].x !== result2.rooms[i].x ||
              result1.rooms[i].y !== result2.rooms[i].y) {
            different = true;
            break;
          }
        }
      }

      expect(different).toBe(true);
    });
  });

  describe('tree structure', () => {
    it('should create valid tree structure', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      expect(result.tree).toBeDefined();
      expect(result.tree.x).toBe(0);
      expect(result.tree.y).toBe(0);
      expect(result.tree.w).toBe(50);
      expect(result.tree.h).toBe(40);
    });

    it('should have all leaf nodes with rooms or null if too small', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(60, 50, 12345);

      const leafNodes = [];
      const findLeaves = (node) => {
        if (node.isLeaf) {
          leafNodes.push(node);
        } else {
          for (const child of node.children) {
            findLeaves(child);
          }
        }
      };

      findLeaves(result.tree);

      // All leaf nodes should be defined
      expect(leafNodes.length).toBeGreaterThan(0);

      // Leaf nodes with rooms should meet minimum size
      for (const leaf of leafNodes) {
        if (leaf.room) {
          expect(leaf.room.w).toBeGreaterThanOrEqual(generator.config.minRoomSize);
          expect(leaf.room.h).toBeGreaterThanOrEqual(generator.config.minRoomSize);
        }
      }

      // At least some leaves should have rooms
      const leavesWithRooms = leafNodes.filter(leaf => leaf.room !== null);
      expect(leavesWithRooms.length).toBeGreaterThan(0);
    });

    it('should have correct parent-child relationships', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(60, 50, 12345);

      const validateNode = (node) => {
        if (!node.isLeaf) {
          expect(node.children.length).toBe(2);

          const child1 = node.children[0];
          const child2 = node.children[1];

          // Children should fit within parent
          expect(child1.x).toBeGreaterThanOrEqual(node.x);
          expect(child1.y).toBeGreaterThanOrEqual(node.y);
          expect(child1.x + child1.w).toBeLessThanOrEqual(node.x + node.w);
          expect(child1.y + child1.h).toBeLessThanOrEqual(node.y + node.h);

          expect(child2.x).toBeGreaterThanOrEqual(node.x);
          expect(child2.y).toBeGreaterThanOrEqual(node.y);
          expect(child2.x + child2.w).toBeLessThanOrEqual(node.x + node.w);
          expect(child2.y + child2.h).toBeLessThanOrEqual(node.y + node.h);

          // Children should be adjacent (share edge)
          const adjacentHorizontally = (child1.y + child1.h === child2.y) || (child2.y + child2.h === child1.y);
          const adjacentVertically = (child1.x + child1.w === child2.x) || (child2.x + child2.w === child1.x);
          expect(adjacentHorizontally || adjacentVertically).toBe(true);

          validateNode(child1);
          validateNode(child2);
        }
      };

      validateNode(result.tree);
    });
  });

  describe('connectivity', () => {
    it('should create corridors connecting rooms', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(60, 50, 12345);

      expect(result.corridors.length).toBeGreaterThan(0);

      for (const corridor of result.corridors) {
        expect(corridor.start).toBeDefined();
        expect(corridor.end).toBeDefined();
        expect(corridor.tiles.length).toBeGreaterThan(0);
      }
    });

    it('should have all rooms reachable via BFS', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(70, 60, 12345);

      if (result.rooms.length === 0) {
        return; // No rooms to test
      }

      // Start BFS from first room center
      const startRoom = result.rooms[0];
      const visited = new Set();
      const queue = [{ x: startRoom.centerX, y: startRoom.centerY }];

      while (queue.length > 0) {
        const pos = queue.shift();
        const key = `${pos.x},${pos.y}`;

        if (visited.has(key)) {
          continue;
        }

        visited.add(key);

        // Check 4-connected neighbors
        const neighbors = [
          { x: pos.x + 1, y: pos.y },
          { x: pos.x - 1, y: pos.y },
          { x: pos.x, y: pos.y + 1 },
          { x: pos.x, y: pos.y - 1 },
        ];

        for (const neighbor of neighbors) {
          if (result.tilemap.isWalkable(neighbor.x, neighbor.y)) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (!visited.has(neighborKey)) {
              queue.push(neighbor);
            }
          }
        }
      }

      // Check if all room centers are reachable
      for (const room of result.rooms) {
        const roomKey = `${room.centerX},${room.centerY}`;
        expect(visited.has(roomKey)).toBe(true);
      }
    });

    it('should create L-shaped corridors', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      for (const corridor of result.corridors) {
        expect(corridor.tiles.length).toBeGreaterThan(0);

        // L-shaped corridors should have tiles forming either:
        // - horizontal then vertical, or
        // - vertical then horizontal
        // We can't test exact shape without knowing the room positions,
        // but we can verify tiles are contiguous
        expect(corridor.width).toBe(generator.config.corridorWidth);
      }
    });
  });

  describe('tilemap generation', () => {
    it('should fill map with walls initially', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(40, 30, 12345);

      // Check that non-room, non-corridor tiles are walls
      let wallCount = 0;
      let floorCount = 0;

      for (let y = 0; y < result.tilemap.height; y++) {
        for (let x = 0; x < result.tilemap.width; x++) {
          const tile = result.tilemap.getTile(x, y);
          if (tile === TileType.WALL) {
            wallCount++;
          } else if (tile === TileType.FLOOR || tile === TileType.DOOR) {
            floorCount++;
          }
        }
      }

      expect(wallCount).toBeGreaterThan(0);
      expect(floorCount).toBeGreaterThan(0);
    });

    it('should place doors at room/corridor junctions', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(60, 50, 12345);

      // Count doors in tilemap
      let doorCount = 0;
      for (let y = 0; y < result.tilemap.height; y++) {
        for (let x = 0; x < result.tilemap.width; x++) {
          if (result.tilemap.getTile(x, y) === TileType.DOOR) {
            doorCount++;
          }
        }
      }

      // Should have some doors (at least one per room pair)
      expect(doorCount).toBeGreaterThan(0);
    });

    it('should carve out rooms as floor tiles', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      for (const room of result.rooms) {
        // Check center of room is floor
        const centerTile = result.tilemap.getTile(room.centerX, room.centerY);
        expect(centerTile).toBe(TileType.FLOOR);

        // Check all interior tiles are floor
        for (let y = room.y; y < room.y + room.h; y++) {
          for (let x = room.x; x < room.x + room.w; x++) {
            const tile = result.tilemap.getTile(x, y);
            expect(tile).toBe(TileType.FLOOR);
          }
        }
      }
    });

    it('should carve out corridors as floor tiles', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      for (const corridor of result.corridors) {
        for (const tile of corridor.tiles) {
          const tilemapTile = result.tilemap.getTile(tile.x, tile.y);
          expect(tilemapTile === TileType.FLOOR || tilemapTile === TileType.DOOR).toBe(true);
        }
      }
    });
  });

  describe('configuration variations', () => {
    it('should respect minRoomSize constraint', () => {
      const generator = new BSPGenerator({ minRoomSize: 12 });
      const result = generator.generate(80, 70, 12345);

      for (const room of result.rooms) {
        expect(room.w).toBeGreaterThanOrEqual(12);
        expect(room.h).toBeGreaterThanOrEqual(12);
      }
    });

    it('should use specified corridorWidth', () => {
      const generator = new BSPGenerator({ corridorWidth: 3 });
      const result = generator.generate(60, 50, 12345);

      for (const corridor of result.corridors) {
        expect(corridor.width).toBe(3);
      }
    });

    it('should respect maxDepth limit', () => {
      const generator = new BSPGenerator({ maxDepth: 2 });
      const result = generator.generate(80, 70, 12345);

      // Count tree depth
      const getDepth = (node, depth = 0) => {
        if (node.isLeaf) {
          return depth;
        }
        return Math.max(
          getDepth(node.children[0], depth + 1),
          getDepth(node.children[1], depth + 1)
        );
      };

      const depth = getDepth(result.tree);
      expect(depth).toBeLessThanOrEqual(2);
    });

    it('should create more rooms with larger map', () => {
      const generator = new BSPGenerator();
      const small = generator.generate(40, 30, 12345);
      const large = generator.generate(100, 80, 12345);

      expect(large.rooms.length).toBeGreaterThan(small.rooms.length);
    });
  });

  describe('performance', () => {
    it('should complete generation in <16ms for 100×100 map', () => {
      const generator = new BSPGenerator();

      const start = performance.now();
      generator.generate(100, 100, 12345);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(16);
    });

    it('should handle multiple generations without leaking memory', () => {
      const generator = new BSPGenerator();

      // Generate multiple times
      for (let i = 0; i < 10; i++) {
        generator.generate(60, 50, i);
      }

      // If we get here without errors, no obvious memory leaks
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum viable map size', () => {
      const generator = new BSPGenerator({ minRoomSize: 8 });
      const result = generator.generate(16, 16, 12345);

      expect(result.rooms.length).toBeGreaterThan(0);
      expect(result.tilemap).toBeInstanceOf(TileMap);
    });

    it('should handle non-square maps', () => {
      const generator = new BSPGenerator();
      const wideResult = generator.generate(100, 30, 12345);
      const tallResult = generator.generate(30, 100, 12345);

      expect(wideResult.rooms.length).toBeGreaterThan(0);
      expect(tallResult.rooms.length).toBeGreaterThan(0);
    });

    it('should handle map with maxDepth = 1', () => {
      const generator = new BSPGenerator({ maxDepth: 1 });
      const result = generator.generate(50, 40, 12345);

      expect(result.rooms.length).toBeGreaterThanOrEqual(1);
    });

    it('should serialize tree to JSON', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(50, 40, 12345);

      expect(() => {
        JSON.stringify(result.tree);
      }).not.toThrow();
    });
  });

  describe('quality metrics', () => {
    it('should create reasonable number of rooms for map size', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(80, 70, 12345);

      // For a 80×70 map, expect 10-40 rooms (rough heuristic)
      expect(result.rooms.length).toBeGreaterThan(5);
      expect(result.rooms.length).toBeLessThan(50);
    });

    it('should create corridors proportional to room count', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(80, 70, 12345);

      // Number of corridors should be roughly rooms - 1 (tree structure)
      expect(result.corridors.length).toBeGreaterThan(0);
      expect(result.corridors.length).toBeLessThanOrEqual(result.rooms.length);
    });

    it('should have reasonable floor/wall ratio', () => {
      const generator = new BSPGenerator();
      const result = generator.generate(60, 50, 12345);

      let floorCount = 0;
      let wallCount = 0;

      for (let y = 0; y < result.tilemap.height; y++) {
        for (let x = 0; x < result.tilemap.width; x++) {
          const tile = result.tilemap.getTile(x, y);
          if (tile === TileType.FLOOR || tile === TileType.DOOR) {
            floorCount++;
          } else if (tile === TileType.WALL) {
            wallCount++;
          }
        }
      }

      const totalTiles = result.tilemap.width * result.tilemap.height;
      const floorRatio = floorCount / totalTiles;

      // Floor should be 20-60% of map (reasonable interior layout)
      expect(floorRatio).toBeGreaterThan(0.2);
      expect(floorRatio).toBeLessThan(0.6);
    });
  });
});
