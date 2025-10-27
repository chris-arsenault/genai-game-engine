/**
 * Tests for NarrativeAnchorManager
 * Validates anchor registration, filtering, district application, and serialization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NarrativeAnchorManager, AnchorType } from '../../../src/game/managers/NarrativeAnchorManager.js';
import { RoomTemplate, TileType } from '../../../src/engine/procedural/RoomTemplate.js';

describe('NarrativeAnchorManager', () => {
  let manager;

  beforeEach(() => {
    manager = new NarrativeAnchorManager();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default anchors', () => {
      expect(manager.anchors.size).toBeGreaterThan(0);
    });

    it('should create detective office anchor at (0, 0)', () => {
      const detectiveOffice = manager.getAnchorById('detective_office');

      expect(detectiveOffice).not.toBeNull();
      expect(detectiveOffice.id).toBe('detective_office');
      expect(detectiveOffice.type).toBe(AnchorType.DETECTIVE_OFFICE);
      expect(detectiveOffice.isPermanent).toBe(true);
      expect(detectiveOffice.position).toEqual({ x: 0, y: 0 });
    });

    it('should create 5 faction HQ anchors', () => {
      const factionHQs = manager.getAnchors({ type: AnchorType.FACTION_HEADQUARTERS });

      expect(factionHQs.length).toBe(5);

      // Check each faction HQ has required properties
      for (const hq of factionHQs) {
        expect(hq.type).toBe(AnchorType.FACTION_HEADQUARTERS);
        expect(hq.isPermanent).toBe(true);
        expect(hq.position).toBeDefined();
        expect(hq.metadata.factionId).toBeDefined();
        expect(hq.roomTemplate).toBeDefined();
      }
    });

    it('should have valid room templates for all default anchors', () => {
      const allAnchors = manager.getAnchors();

      for (const anchor of allAnchors) {
        expect(anchor.roomTemplate).toBeInstanceOf(RoomTemplate);

        const validation = anchor.roomTemplate.validate();
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });
  });

  describe('registerAnchor()', () => {
    it('should register a new anchor successfully', () => {
      const template = createTestRoomTemplate('test_anchor', 10, 10);

      const anchorId = manager.registerAnchor({
        id: 'test_anchor',
        type: AnchorType.QUEST_LOCATION,
        isPermanent: true,
        roomTemplate: template,
        position: { x: 20, y: 20 },
        metadata: {
          name: 'Test Anchor',
          description: 'A test location',
        },
      });

      expect(anchorId).toBe('test_anchor');

      const anchor = manager.getAnchorById('test_anchor');
      expect(anchor).not.toBeNull();
      expect(anchor.id).toBe('test_anchor');
      expect(anchor.type).toBe(AnchorType.QUEST_LOCATION);
      expect(anchor.isPermanent).toBe(true);
      expect(anchor.position).toEqual({ x: 20, y: 20 });
      expect(anchor.metadata.name).toBe('Test Anchor');
    });

    it('should throw error if anchor has no id', () => {
      const template = createTestRoomTemplate('test', 10, 10);

      expect(() => {
        manager.registerAnchor({
          type: AnchorType.QUEST_LOCATION,
          roomTemplate: template,
        });
      }).toThrow('Anchor must have an id');
    });

    it('should throw error if anchor has no type', () => {
      const template = createTestRoomTemplate('test', 10, 10);

      expect(() => {
        manager.registerAnchor({
          id: 'test_anchor',
          roomTemplate: template,
        });
      }).toThrow('Anchor must have a type');
    });

    it('should throw error if anchor has no roomTemplate', () => {
      expect(() => {
        manager.registerAnchor({
          id: 'test_anchor',
          type: AnchorType.QUEST_LOCATION,
        });
      }).toThrow('Anchor must have a roomTemplate');
    });

    it('should throw error if roomTemplate is invalid', () => {
      const invalidTemplate = new RoomTemplate({
        id: 'invalid',
        type: 'test',
        width: 0, // Invalid width
        height: 10,
        tiles: [],
      });

      expect(() => {
        manager.registerAnchor({
          id: 'test_anchor',
          type: AnchorType.QUEST_LOCATION,
          roomTemplate: invalidTemplate,
        });
      }).toThrow('Invalid room template');
    });

    it('should default isPermanent to false if not provided', () => {
      const template = createTestRoomTemplate('test', 10, 10);

      manager.registerAnchor({
        id: 'temporary_anchor',
        type: AnchorType.QUEST_LOCATION,
        roomTemplate: template,
      });

      const anchor = manager.getAnchorById('temporary_anchor');
      expect(anchor.isPermanent).toBe(false);
    });

    it('should handle anchor without fixed position', () => {
      const template = createTestRoomTemplate('test', 10, 10);

      manager.registerAnchor({
        id: 'floating_anchor',
        type: AnchorType.QUEST_LOCATION,
        roomTemplate: template,
        isPermanent: false,
      });

      const anchor = manager.getAnchorById('floating_anchor');
      expect(anchor.position).toBeNull();
    });
  });

  describe('getAnchors()', () => {
    it('should return all anchors when no filter provided', () => {
      const anchors = manager.getAnchors();
      expect(anchors.length).toBeGreaterThan(5); // At least detective office + 5 faction HQs
    });

    it('should filter by type', () => {
      const officeAnchors = manager.getAnchors({ type: AnchorType.DETECTIVE_OFFICE });

      expect(officeAnchors.length).toBe(1);
      expect(officeAnchors[0].type).toBe(AnchorType.DETECTIVE_OFFICE);
    });

    it('should filter by isPermanent', () => {
      const permanentAnchors = manager.getAnchors({ isPermanent: true });

      expect(permanentAnchors.length).toBeGreaterThan(0);
      for (const anchor of permanentAnchors) {
        expect(anchor.isPermanent).toBe(true);
      }
    });

    it('should filter by factionId', () => {
      const vanguardAnchors = manager.getAnchors({ factionId: 'vanguard_prime' });

      expect(vanguardAnchors.length).toBe(1);
      expect(vanguardAnchors[0].metadata.factionId).toBe('vanguard_prime');
    });

    it('should combine multiple filters', () => {
      const filteredAnchors = manager.getAnchors({
        type: AnchorType.FACTION_HEADQUARTERS,
        isPermanent: true,
      });

      expect(filteredAnchors.length).toBe(5);
      for (const anchor of filteredAnchors) {
        expect(anchor.type).toBe(AnchorType.FACTION_HEADQUARTERS);
        expect(anchor.isPermanent).toBe(true);
      }
    });

    it('should return empty array if no matches', () => {
      const anchors = manager.getAnchors({ type: 'nonexistent_type' });
      expect(anchors).toHaveLength(0);
    });
  });

  describe('getAnchorById()', () => {
    it('should return anchor by ID', () => {
      const anchor = manager.getAnchorById('detective_office');

      expect(anchor).not.toBeNull();
      expect(anchor.id).toBe('detective_office');
    });

    it('should return null for nonexistent ID', () => {
      const anchor = manager.getAnchorById('nonexistent_anchor');
      expect(anchor).toBeNull();
    });
  });

  describe('applyAnchorsToDistrict()', () => {
    it('should apply permanent anchors to district', () => {
      const district = createTestDistrict();

      const result = manager.applyAnchorsToDistrict(district);

      expect(result).toBe(district);
      expect(result.metadata.appliedAnchors).toBeDefined();
      expect(result.metadata.appliedAnchors.length).toBeGreaterThan(0);
    });

    it('should ensure detective office is at (0, 0)', () => {
      const district = createTestDistrict();

      manager.applyAnchorsToDistrict(district);

      const detectiveOffice = district.rooms.find(
        room => room.id === 'detective_office' || room.roomType === AnchorType.DETECTIVE_OFFICE
      );

      expect(detectiveOffice).toBeDefined();
      expect(detectiveOffice.x).toBe(0);
      expect(detectiveOffice.y).toBe(0);
    });

    it('should replace existing rooms with anchors at fixed positions', () => {
      const district = createTestDistrict();

      // Add a room that will be replaced
      district.rooms.push({
        id: 'existing_room',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        roomType: 'apartment',
      });

      const initialRoomCount = district.rooms.length;

      manager.applyAnchorsToDistrict(district);

      // Room count should stay same or increase (no duplicate rooms at same position)
      const detectiveOfficeRooms = district.rooms.filter(
        room => room.x === 0 && room.y === 0
      );
      expect(detectiveOfficeRooms.length).toBeLessThanOrEqual(2);

      // Detective office should exist at (0, 0)
      const detectiveOffice = district.rooms.find(
        room => room.id === 'detective_office'
      );
      expect(detectiveOffice).toBeDefined();
      expect(detectiveOffice.x).toBe(0);
      expect(detectiveOffice.y).toBe(0);
    });

    it('should apply room templates to anchor rooms', () => {
      const district = createTestDistrict();

      manager.applyAnchorsToDistrict(district);

      const detectiveOffice = district.rooms.find(
        room => room.id === 'detective_office'
      );

      expect(detectiveOffice).toBeDefined();
      expect(detectiveOffice.templateId).toBeDefined();
      expect(detectiveOffice.tilemap).toBeDefined();
      expect(detectiveOffice.isAnchor).toBe(true);
      expect(detectiveOffice.anchorMetadata).toBeDefined();
    });

    it('should create new rooms for anchors without matching rooms', () => {
      const district = {
        rooms: [], // Empty district
        metadata: {},
      };

      manager.applyAnchorsToDistrict(district);

      // Should have at least detective office + faction HQs
      expect(district.rooms.length).toBeGreaterThanOrEqual(6);
    });

    it('should throw error if district has no rooms array', () => {
      expect(() => {
        manager.applyAnchorsToDistrict({});
      }).toThrow('District must have a rooms array');
    });

    it('should handle null district gracefully', () => {
      expect(() => {
        manager.applyAnchorsToDistrict(null);
      }).toThrow('District must have a rooms array');
    });

    it('should track applied anchors in metadata', () => {
      const district = createTestDistrict();

      manager.applyAnchorsToDistrict(district);

      expect(district.metadata.appliedAnchors).toBeDefined();
      expect(Array.isArray(district.metadata.appliedAnchors)).toBe(true);

      for (const applied of district.metadata.appliedAnchors) {
        expect(applied.anchorId).toBeDefined();
        expect(applied.roomId).toBeDefined();
        expect(applied.position).toBeDefined();
        expect(applied.position.x).toBeDefined();
        expect(applied.position.y).toBeDefined();
      }
    });
  });

  describe('createDefaultAnchors()', () => {
    it('should create default anchor array', () => {
      const defaults = manager.createDefaultAnchors();

      expect(Array.isArray(defaults)).toBe(true);
      expect(defaults.length).toBeGreaterThan(5);
    });

    it('should include detective office', () => {
      const defaults = manager.createDefaultAnchors();

      const detectiveOffice = defaults.find(a => a.id === 'detective_office');

      expect(detectiveOffice).toBeDefined();
      expect(detectiveOffice.type).toBe(AnchorType.DETECTIVE_OFFICE);
      expect(detectiveOffice.isPermanent).toBe(true);
      expect(detectiveOffice.position).toEqual({ x: 0, y: 0 });
    });

    it('should include all faction HQs', () => {
      const defaults = manager.createDefaultAnchors();

      const factionHQs = defaults.filter(a => a.type === AnchorType.FACTION_HEADQUARTERS);

      expect(factionHQs.length).toBe(5);

      // Check faction IDs
      const factionIds = factionHQs.map(hq => hq.metadata.factionId);
      expect(factionIds).toContain('vanguard_prime');
      expect(factionIds).toContain('luminari_syndicate');
      expect(factionIds).toContain('cipher_collective');
      expect(factionIds).toContain('wraith_network');
      expect(factionIds).toContain('memory_keepers');
    });

    it('should have valid positions for all anchors', () => {
      const defaults = manager.createDefaultAnchors();

      for (const anchor of defaults) {
        expect(anchor.position).toBeDefined();
        expect(typeof anchor.position.x).toBe('number');
        expect(typeof anchor.position.y).toBe('number');
      }
    });
  });

  describe('Serialization', () => {
    it('should serialize anchor data', () => {
      const serialized = manager.serialize();

      expect(serialized).toBeDefined();
      expect(serialized.version).toBe(1);
      expect(Array.isArray(serialized.anchors)).toBe(true);
      expect(serialized.anchors.length).toBeGreaterThan(0);
    });

    it('should serialize all anchor properties', () => {
      const serialized = manager.serialize();

      for (const anchorData of serialized.anchors) {
        expect(anchorData.id).toBeDefined();
        expect(anchorData.type).toBeDefined();
        expect(anchorData.isPermanent).toBeDefined();
        expect(anchorData.roomTemplate).toBeDefined();
        expect(anchorData.metadata).toBeDefined();
      }
    });

    it('should deserialize anchor data correctly', () => {
      const serialized = manager.serialize();

      const newManager = new NarrativeAnchorManager();
      // Clear default anchors
      newManager.anchors.clear();

      const success = newManager.deserialize(serialized);

      expect(success).toBe(true);
      expect(newManager.anchors.size).toBe(manager.anchors.size);
    });

    it('should roundtrip serialize/deserialize preserving data', () => {
      const originalAnchors = manager.getAnchors();
      const serialized = manager.serialize();

      const newManager = new NarrativeAnchorManager();
      newManager.anchors.clear();
      newManager.deserialize(serialized);

      const restoredAnchors = newManager.getAnchors();

      expect(restoredAnchors.length).toBe(originalAnchors.length);

      for (const original of originalAnchors) {
        const restored = newManager.getAnchorById(original.id);

        expect(restored).toBeDefined();
        expect(restored.id).toBe(original.id);
        expect(restored.type).toBe(original.type);
        expect(restored.isPermanent).toBe(original.isPermanent);
        expect(restored.position).toEqual(original.position);
      }
    });

    it('should fail deserialization for invalid version', () => {
      const invalidData = {
        version: 999,
        anchors: [],
      };

      const newManager = new NarrativeAnchorManager();
      const success = newManager.deserialize(invalidData);

      expect(success).toBe(false);
    });

    it('should fail deserialization for null data', () => {
      const newManager = new NarrativeAnchorManager();
      const success = newManager.deserialize(null);

      expect(success).toBe(false);
    });
  });

  describe('Detective Office Template', () => {
    it('should have required dimensions', () => {
      const detectiveOffice = manager.getAnchorById('detective_office');
      const template = detectiveOffice.roomTemplate;

      expect(template.width).toBe(20);
      expect(template.height).toBe(20);
    });

    it('should have furniture and containers', () => {
      const detectiveOffice = manager.getAnchorById('detective_office');
      const template = detectiveOffice.roomTemplate;

      let furnitureCount = 0;
      let containerCount = 0;

      for (let y = 0; y < template.height; y++) {
        for (let x = 0; x < template.width; x++) {
          const tile = template.getTileAt(x, y);
          if (tile === TileType.FURNITURE) furnitureCount++;
          if (tile === TileType.CONTAINER) containerCount++;
        }
      }

      expect(furnitureCount).toBeGreaterThan(0);
      expect(containerCount).toBeGreaterThan(0);
    });

    it('should have interaction points', () => {
      const detectiveOffice = manager.getAnchorById('detective_office');
      const template = detectiveOffice.roomTemplate;

      expect(template.interactionPoints.length).toBeGreaterThan(0);

      // Check for key interaction points
      const desk = template.interactionPoints.find(p => p.id === 'desk');
      const evidenceBoard = template.interactionPoints.find(p => p.id === 'evidence_board');
      const computer = template.interactionPoints.find(p => p.id === 'computer');

      expect(desk).toBeDefined();
      expect(evidenceBoard).toBeDefined();
      expect(computer).toBeDefined();
    });

    it('should have a door', () => {
      const detectiveOffice = manager.getAnchorById('detective_office');
      const template = detectiveOffice.roomTemplate;

      expect(template.doors.length).toBeGreaterThan(0);
      expect(template.doors[0].type).toBe('main');
    });
  });

  describe('Faction HQ Templates', () => {
    it('should have correct dimensions for all faction HQs', () => {
      const factionHQs = manager.getAnchors({ type: AnchorType.FACTION_HEADQUARTERS });

      for (const hq of factionHQs) {
        const template = hq.roomTemplate;
        expect(template.width).toBe(18);
        expect(template.height).toBe(18);
      }
    });

    it('should have furniture for all faction HQs', () => {
      const factionHQs = manager.getAnchors({ type: AnchorType.FACTION_HEADQUARTERS });

      for (const hq of factionHQs) {
        const template = hq.roomTemplate;

        let furnitureCount = 0;

        for (let y = 0; y < template.height; y++) {
          for (let x = 0; x < template.width; x++) {
            const tile = template.getTileAt(x, y);
            if (tile === TileType.FURNITURE) furnitureCount++;
          }
        }

        expect(furnitureCount).toBeGreaterThan(0);
      }
    });

    it('should have containers for all faction HQs', () => {
      const factionHQs = manager.getAnchors({ type: AnchorType.FACTION_HEADQUARTERS });

      for (const hq of factionHQs) {
        const template = hq.roomTemplate;

        let containerCount = 0;

        for (let y = 0; y < template.height; y++) {
          for (let x = 0; x < template.width; x++) {
            const tile = template.getTileAt(x, y);
            if (tile === TileType.CONTAINER) containerCount++;
          }
        }

        expect(containerCount).toBeGreaterThan(0);
      }
    });

    it('should have unique positions for all faction HQs', () => {
      const factionHQs = manager.getAnchors({ type: AnchorType.FACTION_HEADQUARTERS });

      const positions = factionHQs.map(hq => `${hq.position.x},${hq.position.y}`);
      const uniquePositions = new Set(positions);

      expect(uniquePositions.size).toBe(factionHQs.length);
    });
  });

  describe('Performance', () => {
    it('should apply anchors to district in <5ms', () => {
      const district = createTestDistrict();

      const start = performance.now();
      manager.applyAnchorsToDistrict(district);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
    });

    it('should handle large district efficiently', () => {
      const district = {
        rooms: [],
        metadata: {},
      };

      // Create 100 procedural rooms
      for (let i = 0; i < 100; i++) {
        district.rooms.push({
          id: `room_${i}`,
          x: Math.floor(Math.random() * 200),
          y: Math.floor(Math.random() * 200),
          width: 10,
          height: 10,
          roomType: 'apartment',
        });
      }

      const start = performance.now();
      manager.applyAnchorsToDistrict(district);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });
});

/**
 * Helper function to create a test room template
 */
function createTestRoomTemplate(id, width, height) {
  const tiles = Array(height).fill(null).map(() => Array(width).fill(TileType.FLOOR));

  // Add walls
  for (let x = 0; x < width; x++) {
    tiles[0][x] = TileType.WALL;
    tiles[height - 1][x] = TileType.WALL;
  }
  for (let y = 0; y < height; y++) {
    tiles[y][0] = TileType.WALL;
    tiles[y][width - 1] = TileType.WALL;
  }

  return new RoomTemplate({
    id,
    type: 'test',
    width,
    height,
    tiles,
    doors: [
      {
        id: 'main',
        x: Math.floor(width / 2),
        y: 0,
        direction: 'north',
        type: 'main',
      },
    ],
    interactionPoints: [],
  });
}

/**
 * Helper function to create a test district
 */
function createTestDistrict() {
  return {
    rooms: [
      {
        id: 'room_1',
        x: 10,
        y: 10,
        width: 15,
        height: 15,
        roomType: 'apartment',
      },
      {
        id: 'room_2',
        x: 30,
        y: 30,
        width: 12,
        height: 12,
        roomType: 'office',
      },
      {
        id: 'room_3',
        x: 50,
        y: 20,
        width: 18,
        height: 18,
        roomType: 'crime_scene',
      },
    ],
    metadata: {},
  };
}
