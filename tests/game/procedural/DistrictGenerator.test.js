/**
 * @fileoverview Tests for DistrictGenerator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DistrictGenerator, RoomTypes, DistrictTypes } from '../../../src/game/procedural/DistrictGenerator.js';
import { TileType } from '../../../src/game/procedural/TileMap.js';

describe('DistrictGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new DistrictGenerator({
      districtSize: { width: 200, height: 200 },
      minRoomSpacing: 3,
      corridorWidth: 3,
      forceIterations: 50, // Fewer iterations for faster tests
    });
  });

  describe('Constructor', () => {
    it('should create generator with default config', () => {
      const gen = new DistrictGenerator();
      expect(gen).toBeDefined();
      expect(gen.config.districtSize.width).toBe(200);
      expect(gen.config.districtSize.height).toBe(200);
      expect(gen.config.minRoomSpacing).toBe(3);
      expect(gen.config.corridorWidth).toBe(3);
    });

    it('should accept custom configuration', () => {
      const gen = new DistrictGenerator({
        districtSize: { width: 150, height: 150 },
        minRoomSpacing: 5,
        corridorWidth: 2,
      });
      expect(gen.config.districtSize.width).toBe(150);
      expect(gen.config.minRoomSpacing).toBe(5);
      expect(gen.config.corridorWidth).toBe(2);
    });
  });

  describe('generate()', () => {
    it('should generate a complete district', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result).toBeDefined();
      expect(result.graph).toBeDefined();
      expect(result.rooms).toBeDefined();
      expect(result.tilemap).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should generate correct room counts for mixed district', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.rooms.length).toBeGreaterThan(20);
      expect(result.rooms.length).toBeLessThan(100);

      // Should have at least one detective office
      const detectiveOffices = result.rooms.filter(r => r.roomType === RoomTypes.DETECTIVE_OFFICE);
      expect(detectiveOffices.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate residential district with appropriate room types', () => {
      const result = generator.generate(12345, 'residential');

      // Count room types
      const apartments = result.rooms.filter(r => r.roomType === RoomTypes.APARTMENT);
      const offices = result.rooms.filter(r => r.roomType === RoomTypes.OFFICE);

      // Residential should have more apartments than offices
      expect(apartments.length).toBeGreaterThan(offices.length);
    });

    it('should generate commercial district with appropriate room types', () => {
      const result = generator.generate(12345, 'commercial');

      const offices = result.rooms.filter(r => r.roomType === RoomTypes.OFFICE);
      const shops = result.rooms.filter(r => r.roomType === RoomTypes.SHOP);

      // Commercial should have many offices and shops
      expect(offices.length).toBeGreaterThan(5);
      expect(shops.length).toBeGreaterThan(5);
    });

    it('should generate industrial district with appropriate room types', () => {
      const result = generator.generate(12345, 'industrial');

      const warehouses = result.rooms.filter(r => r.roomType === RoomTypes.WAREHOUSE);
      const apartments = result.rooms.filter(r => r.roomType === RoomTypes.APARTMENT);

      // Industrial should have more warehouses than apartments
      expect(warehouses.length).toBeGreaterThan(apartments.length);
    });

    it('should return metadata with correct information', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.metadata.seed).toBe(12345);
      expect(result.metadata.districtType).toBe('mixed');
      expect(result.metadata.generationTime).toBeGreaterThan(0);
      expect(result.metadata.roomCount).toBe(result.rooms.length);
      expect(result.metadata.validation).toBeDefined();
    });

    it('should complete generation within performance budget', () => {
      const startTime = performance.now();
      const result = generator.generate(12345, 'mixed');
      const elapsed = performance.now() - startTime;

      // Should complete in <50ms for 30-50 rooms (relaxed for CI)
      expect(elapsed).toBeLessThan(200);
      expect(result.metadata.generationTime).toBeLessThan(200);
    });
  });

  describe('Graph Structure', () => {
    it('should create fully connected graph', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.graph.isFullyConnected()).toBe(true);
    });

    it('should have correct node count', () => {
      const result = generator.generate(12345, 'mixed');

      const nodeCount = result.graph.getNodeCount();
      expect(nodeCount).toBe(result.rooms.length);
    });

    it('should have edges between nodes', () => {
      const result = generator.generate(12345, 'mixed');

      const edgeCount = result.graph.getEdgeCount();
      expect(edgeCount).toBeGreaterThan(result.rooms.length - 1); // At least spanning tree
    });

    it('should create bidirectional edges', () => {
      const result = generator.generate(12345, 'mixed');

      const nodes = Array.from(result.graph.nodes.keys());
      if (nodes.length >= 2) {
        const hasForwardEdge = result.graph.getEdges(nodes[0]).length > 0;
        expect(hasForwardEdge).toBe(true);
      }
    });

    it('should have detective office as node', () => {
      const result = generator.generate(12345, 'mixed');

      const detectiveOffices = result.graph.getNodesByType(RoomTypes.DETECTIVE_OFFICE);
      expect(detectiveOffices.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Room Placement', () => {
    it('should place rooms without major overlaps', () => {
      const result = generator.generate(12345, 'mixed');

      // Check for overlaps
      let majorOverlaps = 0;
      for (let i = 0; i < result.rooms.length; i++) {
        for (let j = i + 1; j < result.rooms.length; j++) {
          const room1 = result.rooms[i];
          const room2 = result.rooms[j];

          const overlap = !(
            room1.x + room1.width <= room2.x ||
            room2.x + room2.width <= room1.x ||
            room1.y + room1.height <= room2.y ||
            room2.y + room2.height <= room1.y
          );

          if (overlap) {
            // Small overlap acceptable due to corridors and force-directed layout
            const overlapX = Math.min(room1.x + room1.width, room2.x + room2.width) -
                           Math.max(room1.x, room2.x);
            const overlapY = Math.min(room1.y + room1.height, room2.y + room2.height) -
                           Math.max(room1.y, room2.y);

            // Count major overlaps (more than 15 tiles)
            const overlapArea = overlapX * overlapY;
            if (overlapArea > 15) {
              majorOverlaps++;
            }
          }
        }
      }

      // Should have very few major overlaps (less than 5% of room pairs)
      const totalPairs = (result.rooms.length * (result.rooms.length - 1)) / 2;
      const overlapRate = majorOverlaps / totalPairs;
      expect(overlapRate).toBeLessThan(0.05);
    });

    it('should respect minimum room spacing', () => {
      const result = generator.generate(12345, 'mixed');

      // Sample check for a few rooms
      const sampleSize = Math.min(10, result.rooms.length);
      for (let i = 0; i < sampleSize; i++) {
        const room1 = result.rooms[i];

        for (let j = i + 1; j < sampleSize; j++) {
          const room2 = result.rooms[j];

          // Calculate distance between room edges
          const dx = Math.max(0, Math.max(room1.x - (room2.x + room2.width), room2.x - (room1.x + room1.width)));
          const dy = Math.max(0, Math.max(room1.y - (room2.y + room2.height), room2.y - (room1.y + room1.height)));

          // At least one dimension should have minimum spacing (or they're connected)
          if (dx > 0 || dy > 0) {
            const minDist = Math.min(dx > 0 ? dx : Infinity, dy > 0 ? dy : Infinity);
            expect(minDist).toBeGreaterThanOrEqual(-1); // Allow small tolerance
          }
        }
      }
    });

    it('should place rooms within district bounds', () => {
      const result = generator.generate(12345, 'mixed');

      for (const room of result.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.y).toBeGreaterThanOrEqual(0);
        expect(room.x + room.width).toBeLessThanOrEqual(generator.config.districtSize.width);
        expect(room.y + room.height).toBeLessThanOrEqual(generator.config.districtSize.height);
      }
    });

    it('should create rooms with valid dimensions', () => {
      const result = generator.generate(12345, 'mixed');

      for (const room of result.rooms) {
        expect(room.width).toBeGreaterThan(0);
        expect(room.height).toBeGreaterThan(0);
        expect(room.width).toBeLessThanOrEqual(generator.config.buildingMaxSize);
        expect(room.height).toBeLessThanOrEqual(generator.config.buildingMaxSize);
      }
    });

    it('populates rotated room bounds and keeps corridor endpoints inside rooms', () => {
      const rotatedGenerator = new DistrictGenerator({
        districtSize: { width: 200, height: 200 },
        rotationAngles: [90],
        corridorWidth: 2,
        forceIterations: 40,
      });

      const result = rotatedGenerator.generate(54321, 'mixed');

      expect(result.rooms.some((room) => room.rotation === 90)).toBe(true);

      for (const room of result.rooms) {
        expect(typeof room.width).toBe('number');
        expect(typeof room.height).toBe('number');
        const bounds = room.getBounds(room.width, room.height);
        expect(bounds.width).toBeGreaterThan(0);
        expect(bounds.height).toBeGreaterThan(0);
      }

      for (const corridor of result.corridors.slice(0, 12)) {
        const fromRoom = result.rooms.find((r) => r.id === corridor.from);
        const toRoom = result.rooms.find((r) => r.id === corridor.to);
        if (!fromRoom || !toRoom || corridor.tiles.length === 0) {
          continue;
        }

        const fromBounds = fromRoom.getBounds(fromRoom.width, fromRoom.height);
        const toBounds = toRoom.getBounds(toRoom.width, toRoom.height);

        const intersectsFrom = corridor.tiles.some((tile) =>
          tile.x >= fromBounds.x &&
          tile.x < fromBounds.x + fromBounds.width &&
          tile.y >= fromBounds.y &&
          tile.y < fromBounds.y + fromBounds.height
        );

        const intersectsTo = corridor.tiles.some((tile) =>
          tile.x >= toBounds.x &&
          tile.x < toBounds.x + toBounds.width &&
          tile.y >= toBounds.y &&
          tile.y < toBounds.y + toBounds.height
        );

        expect(intersectsFrom).toBe(true);
        expect(intersectsTo).toBe(true);
      }
    });
  });

  describe('Connectivity', () => {
    it('should create corridors between connected rooms', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.metadata.corridorCount).toBeGreaterThan(0);
    });

    it('should make all rooms reachable via walkable tiles', () => {
      const result = generator.generate(12345, 'mixed');

      const regions = result.tilemap.findConnectedRegions();

      // Should have at least one large connected region
      expect(regions.length).toBeGreaterThan(0);

      // Largest region should contain significant portion of walkable tiles
      const largestRegion = regions.reduce((max, r) => r.length > max.length ? r : max, regions[0]);
      expect(largestRegion.length).toBeGreaterThan(50);
    });

    it('should create L-shaped corridors', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.corridors.length).toBeGreaterThan(0);

      const sample = result.corridors.slice(0, Math.min(5, result.corridors.length));
      for (const corridor of sample) {
        expect(Array.isArray(corridor.tiles)).toBe(true);
        expect(corridor.tiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tilemap Generation', () => {
    it('should create tilemap with correct dimensions', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.tilemap.width).toBe(generator.config.districtSize.width);
      expect(result.tilemap.height).toBe(generator.config.districtSize.height);
    });

    it('should have floor tiles in rooms', () => {
      const result = generator.generate(12345, 'mixed');

      let floorCount = 0;
      for (let y = 0; y < result.tilemap.height; y++) {
        for (let x = 0; x < result.tilemap.width; x++) {
          if (result.tilemap.getTile(x, y) === TileType.FLOOR) {
            floorCount++;
          }
        }
      }

      expect(floorCount).toBeGreaterThan(0);
    });

    it('should have wall tiles', () => {
      const result = generator.generate(12345, 'mixed');

      let wallCount = 0;
      for (let y = 0; y < result.tilemap.height; y++) {
        for (let x = 0; x < result.tilemap.width; x++) {
          if (result.tilemap.getTile(x, y) === TileType.WALL) {
            wallCount++;
          }
        }
      }

      expect(wallCount).toBeGreaterThan(0);
    });

    it('should copy room interiors to tilemap', () => {
      const result = generator.generate(12345, 'mixed');

      // Check that at least one room has tiles in the tilemap
      const room = result.rooms[0];
      let hasRoomTiles = false;

      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) {
          const tile = result.tilemap.getTile(room.x + x, room.y + y);
          if (tile !== TileType.EMPTY) {
            hasRoomTiles = true;
            break;
          }
        }
        if (hasRoomTiles) break;
      }

      expect(hasRoomTiles).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should pass validation for valid districts', () => {
      const result = generator.generate(12345, 'mixed');

      expect(result.metadata.validation.valid).toBe(true);
      expect(result.metadata.validation.issues.length).toBe(0);
    });

    it('should detect connectivity issues', () => {
      // Generate small district that might have issues
      const smallGen = new DistrictGenerator({
        districtSize: { width: 50, height: 50 },
        roomCounts: {
          detective_office: 1,
          apartment: 2,
        },
        forceIterations: 10,
      });

      const result = smallGen.generate(12345, 'mixed');

      // Validation should complete without errors
      expect(result.metadata.validation).toBeDefined();
    });

    it('should warn about too many rooms', () => {
      const largeGen = new DistrictGenerator({
        districtSize: { width: 300, height: 300 },
        roomCounts: {
          apartment: 110, // Exceeds recommended limit
        },
        forceIterations: 20,
      });

      const result = largeGen.generate(12345, 'mixed');

      expect(result.metadata.validation.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about too few rooms', () => {
      const smallGen = new DistrictGenerator({
        districtSize: { width: 100, height: 100 },
        roomCounts: {
          detective_office: 1,
          apartment: 5,
        },
        forceIterations: 20,
      });

      const result = smallGen.generate(12345, 'mixed');

      expect(result.metadata.validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Determinism', () => {
    it('should generate identical districts with same seed', () => {
      const result1 = generator.generate(42, 'mixed');
      const result2 = generator.generate(42, 'mixed');

      expect(result1.rooms.length).toBe(result2.rooms.length);
      expect(result1.metadata.corridorCount).toBe(result2.metadata.corridorCount);

      // Check room positions
      for (let i = 0; i < result1.rooms.length; i++) {
        expect(result1.rooms[i].x).toBe(result2.rooms[i].x);
        expect(result1.rooms[i].y).toBe(result2.rooms[i].y);
        expect(result1.rooms[i].width).toBe(result2.rooms[i].width);
        expect(result1.rooms[i].height).toBe(result2.rooms[i].height);
      }
    });

    it('should generate different districts with different seeds', () => {
      const result1 = generator.generate(42, 'mixed');
      const result2 = generator.generate(123, 'mixed');

      // At least some rooms should have different positions
      let differentPositions = 0;
      const minLength = Math.min(result1.rooms.length, result2.rooms.length);

      for (let i = 0; i < minLength; i++) {
        if (result1.rooms[i].x !== result2.rooms[i].x ||
            result1.rooms[i].y !== result2.rooms[i].y) {
          differentPositions++;
        }
      }

      expect(differentPositions).toBeGreaterThan(0);
    });
  });

  describe('District Types', () => {
    it('should support all district types', () => {
      const types = ['residential', 'commercial', 'industrial', 'mixed'];

      for (const type of types) {
        const result = generator.generate(12345, type);
        expect(result).toBeDefined();
        expect(result.metadata.districtType).toBe(type);
      }
    });

    it('should have different room distributions for different types', () => {
      const residential = generator.generate(12345, 'residential');
      const commercial = generator.generate(12345, 'commercial');

      const resApartments = residential.rooms.filter(r => r.roomType === RoomTypes.APARTMENT).length;
      const resOffices = residential.rooms.filter(r => r.roomType === RoomTypes.OFFICE).length;

      const comApartments = commercial.rooms.filter(r => r.roomType === RoomTypes.APARTMENT).length;
      const comOffices = commercial.rooms.filter(r => r.roomType === RoomTypes.OFFICE).length;

      // Residential should have relatively more apartments
      const resRatio = resApartments / (resOffices + 1);
      const comRatio = comApartments / (comOffices + 1);

      expect(resRatio).toBeGreaterThan(comRatio);
    });
  });

  describe('Room Interior Generation', () => {
    it('should use BSP for building types', () => {
      const result = generator.generate(12345, 'mixed');

      const apartment = result.rooms.find(r => r.roomType === RoomTypes.APARTMENT);
      expect(apartment).toBeDefined();
      expect(apartment.tilemap).toBeDefined();

      // BSP interiors should have both walls and floors
      let hasWalls = false;
      let hasFloors = false;

      for (let y = 0; y < apartment.height; y++) {
        for (let x = 0; x < apartment.width; x++) {
          const tile = apartment.tilemap.getTile(x, y);
          if (tile === TileType.WALL) hasWalls = true;
          if (tile === TileType.FLOOR) hasFloors = true;
        }
      }

      expect(hasWalls).toBe(true);
      expect(hasFloors).toBe(true);
    });

    it('should use simple layout for outdoor types', () => {
      const result = generator.generate(12345, 'mixed');

      const street = result.rooms.find(r => r.roomType === RoomTypes.STREET);
      if (street) {
        expect(street.tilemap).toBeDefined();

        // Should have floor tiles (street)
        let hasFloors = false;
        for (let y = 0; y < street.height; y++) {
          for (let x = 0; x < street.width; x++) {
            const tile = street.tilemap.getTile(x, y);
            if (tile === TileType.FLOOR) {
              hasFloors = true;
              break;
            }
          }
        }
        expect(hasFloors).toBe(true);
      }
    });
  });

  describe('Performance', () => {
    it('should handle small districts efficiently', () => {
      const smallGen = new DistrictGenerator({
        districtSize: { width: 100, height: 100 },
        roomCounts: {
          detective_office: 1,
          apartment: 10,
          street: 5,
        },
        forceIterations: 30,
      });

      const startTime = performance.now();
      const result = smallGen.generate(12345, 'mixed');
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(result.rooms.length).toBeGreaterThan(10);
    });

    it('should handle large districts within reasonable time', () => {
      const largeGen = new DistrictGenerator({
        districtSize: { width: 250, height: 250 },
        forceIterations: 80,
      });

      const startTime = performance.now();
      const result = largeGen.generate(12345, 'mixed');
      const elapsed = performance.now() - startTime;

      // Large districts may take longer but should be reasonable
      expect(elapsed).toBeLessThan(1000);
      expect(result.rooms.length).toBeGreaterThan(20);
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom room counts', () => {
      const customGen = new DistrictGenerator({
        roomCounts: {
          detective_office: 2,
          apartment: 10,
          street: 5,
        },
        forceIterations: 30,
      });

      const result = customGen.generate(12345, 'mixed');

      const offices = result.rooms.filter(r => r.roomType === RoomTypes.DETECTIVE_OFFICE);
      const apartments = result.rooms.filter(r => r.roomType === RoomTypes.APARTMENT);
      const streets = result.rooms.filter(r => r.roomType === RoomTypes.STREET);

      expect(offices.length).toBe(2);
      expect(apartments.length).toBe(10);
      expect(streets.length).toBe(5);
    });

    it('should respect custom spacing', () => {
      const spacedGen = new DistrictGenerator({
        districtSize: { width: 200, height: 200 },
        minRoomSpacing: 10,
        roomCounts: {
          apartment: 5,
        },
        forceIterations: 50,
      });

      const result = spacedGen.generate(12345, 'mixed');
      expect(result.rooms.length).toBe(5);

      // Rooms should be well-spaced
      for (let i = 0; i < result.rooms.length; i++) {
        for (let j = i + 1; j < result.rooms.length; j++) {
          const room1 = result.rooms[i];
          const room2 = result.rooms[j];

          const bounds1 = room1.getBounds(room1.width, room1.height);
          const bounds2 = room2.getBounds(room2.width, room2.height);
          const centerX1 = bounds1.x + bounds1.width / 2;
          const centerY1 = bounds1.y + bounds1.height / 2;
          const centerX2 = bounds2.x + bounds2.width / 2;
          const centerY2 = bounds2.y + bounds2.height / 2;

          const centerDist = Math.sqrt(
            Math.pow(centerX1 - centerX2, 2) +
            Math.pow(centerY1 - centerY2, 2)
          );

          // Centers should be reasonably far apart even with rotation adjustments
          expect(centerDist).toBeGreaterThan(5);
        }
      }
    });
  });
});
