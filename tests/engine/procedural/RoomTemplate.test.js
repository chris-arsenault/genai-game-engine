import { RoomTemplate, TileType } from '../../../src/engine/procedural/RoomTemplate.js';
import { SeededRandom } from '../../../src/engine/procedural/SeededRandom.js';

describe('RoomTemplate', () => {
  let validConfig;

  beforeEach(() => {
    validConfig = {
      id: 'test_room',
      type: 'apartment',
      width: 5,
      height: 5,
      tiles: [
        [2, 2, 2, 2, 2],
        [2, 1, 1, 1, 2],
        [2, 1, 1, 1, 2],
        [2, 1, 1, 1, 2],
        [2, 2, 3, 2, 2]
      ],
      doors: [
        { id: 'main', x: 2, y: 4, direction: 'south', type: 'main' }
      ],
      interactionPoints: [
        { id: 'spawn1', x: 2, y: 2, type: 'npc_spawn' },
        { id: 'evidence1', x: 3, y: 2, type: 'evidence_spawn' }
      ]
    };
  });

  describe('constructor', () => {
    it('should create template with valid config', () => {
      const template = new RoomTemplate(validConfig);

      expect(template.id).toBe('test_room');
      expect(template.type).toBe('apartment');
      expect(template.width).toBe(5);
      expect(template.height).toBe(5);
      expect(template.tiles.length).toBe(5);
      expect(template.doors.length).toBe(1);
      expect(template.interactionPoints.length).toBe(2);
    });

    it('should set default values for optional fields', () => {
      const minimalConfig = {
        id: 'minimal',
        type: 'room',
        width: 3,
        height: 3,
        tiles: [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
      };

      const template = new RoomTemplate(minimalConfig);

      expect(template.doors).toEqual([]);
      expect(template.interactionPoints).toEqual([]);
      expect(template.requiredTags).toEqual([]);
      expect(template.excludedTags).toEqual([]);
    });

    it('should store metadata', () => {
      const config = {
        ...validConfig,
        metadata: { difficulty: 'hard', theme: 'noir' }
      };

      const template = new RoomTemplate(config);
      expect(template.metadata.difficulty).toBe('hard');
      expect(template.metadata.theme).toBe('noir');
    });
  });

  describe('validate', () => {
    it('should validate correct template', () => {
      const template = new RoomTemplate(validConfig);
      const result = template.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing id', () => {
      const config = { ...validConfig };
      delete config.id;
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template must have an id');
    });

    it('should detect missing type', () => {
      const config = { ...validConfig };
      delete config.type;
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template must have a type');
    });

    it('should detect invalid width', () => {
      const config = { ...validConfig, width: 0 };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Width must be positive');
    });

    it('should detect invalid height', () => {
      const config = { ...validConfig, height: -1 };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Height must be positive');
    });

    it('should detect tiles array height mismatch', () => {
      const config = {
        ...validConfig,
        height: 10,
        tiles: [[1, 1], [1, 1]]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('height'))).toBe(true);
    });

    it('should detect tiles array width mismatch', () => {
      const config = {
        ...validConfig,
        tiles: [
          [1, 1, 1, 1, 1],
          [1, 1, 1],  // Wrong width
          [1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1]
        ]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('row 1 width'))).toBe(true);
    });

    it('should detect door without id', () => {
      const config = {
        ...validConfig,
        doors: [{ x: 2, y: 4, direction: 'south' }]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All doors must have an id');
    });

    it('should detect door out of bounds', () => {
      const config = {
        ...validConfig,
        doors: [
          { id: 'main', x: 10, y: 4, direction: 'south' }
        ]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('out of bounds'))).toBe(true);
    });

    it('should detect invalid door direction', () => {
      const config = {
        ...validConfig,
        doors: [
          { id: 'main', x: 2, y: 4, direction: 'invalid' }
        ]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid direction'))).toBe(true);
    });

    it('should detect interaction point without id', () => {
      const config = {
        ...validConfig,
        interactionPoints: [{ x: 2, y: 2, type: 'npc_spawn' }]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('All interaction points must have an id');
    });

    it('should detect interaction point out of bounds', () => {
      const config = {
        ...validConfig,
        interactionPoints: [
          { id: 'spawn1', x: 10, y: 2, type: 'npc_spawn' }
        ]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('out of bounds'))).toBe(true);
    });

    it('should detect interaction point without type', () => {
      const config = {
        ...validConfig,
        interactionPoints: [
          { id: 'spawn1', x: 2, y: 2 }
        ]
      };
      const template = new RoomTemplate(config);
      const result = template.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must have a type'))).toBe(true);
    });
  });

  describe('getDoorPositions', () => {
    it('should return all door positions', () => {
      const template = new RoomTemplate(validConfig);
      const positions = template.getDoorPositions();

      expect(positions.length).toBe(1);
      expect(positions[0]).toEqual({
        x: 2,
        y: 4,
        id: 'main',
        direction: 'south',
        type: 'main'
      });
    });

    it('should use default door type', () => {
      const config = {
        ...validConfig,
        doors: [{ id: 'door1', x: 2, y: 4, direction: 'south' }]
      };
      const template = new RoomTemplate(config);
      const positions = template.getDoorPositions();

      expect(positions[0].type).toBe('main');
    });
  });

  describe('getRandomSpawnPoint', () => {
    let template;
    let rng;

    beforeEach(() => {
      template = new RoomTemplate(validConfig);
      rng = new SeededRandom(42);
    });

    it('should return random spawn point', () => {
      const point = template.getRandomSpawnPoint(rng);

      expect(point).toBeDefined();
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.id).toBeDefined();
    });

    it('should filter by type', () => {
      const point = template.getRandomSpawnPoint(rng, 'npc_spawn');

      expect(point).toBeDefined();
      expect(point.id).toBe('spawn1');
    });

    it('should return null if no matching points', () => {
      const point = template.getRandomSpawnPoint(rng, 'nonexistent_type');
      expect(point).toBeNull();
    });

    it('should return null if no interaction points', () => {
      const config = { ...validConfig, interactionPoints: [] };
      const emptyTemplate = new RoomTemplate(config);
      const point = emptyTemplate.getRandomSpawnPoint(rng);

      expect(point).toBeNull();
    });
  });

  describe('getTileAt', () => {
    let template;

    beforeEach(() => {
      template = new RoomTemplate(validConfig);
    });

    it('should return tile type at position', () => {
      expect(template.getTileAt(0, 0)).toBe(TileType.WALL);
      expect(template.getTileAt(1, 1)).toBe(TileType.FLOOR);
      expect(template.getTileAt(2, 4)).toBe(TileType.DOOR);
    });

    it('should return EMPTY for out of bounds', () => {
      expect(template.getTileAt(-1, 0)).toBe(TileType.EMPTY);
      expect(template.getTileAt(0, -1)).toBe(TileType.EMPTY);
      expect(template.getTileAt(10, 10)).toBe(TileType.EMPTY);
    });
  });

  describe('isWalkable', () => {
    let template;

    beforeEach(() => {
      template = new RoomTemplate(validConfig);
    });

    it('should return true for floor tiles', () => {
      expect(template.isWalkable(1, 1)).toBe(true);
      expect(template.isWalkable(2, 2)).toBe(true);
    });

    it('should return true for door tiles', () => {
      expect(template.isWalkable(2, 4)).toBe(true);
    });

    it('should return false for wall tiles', () => {
      expect(template.isWalkable(0, 0)).toBe(false);
      expect(template.isWalkable(0, 1)).toBe(false);
    });

    it('should return false for out of bounds', () => {
      expect(template.isWalkable(-1, 0)).toBe(false);
      expect(template.isWalkable(10, 10)).toBe(false);
    });
  });

  describe('serialize and deserialize', () => {
    it('should serialize template', () => {
      const template = new RoomTemplate(validConfig);
      const data = template.serialize();

      expect(data.id).toBe('test_room');
      expect(data.type).toBe('apartment');
      expect(data.width).toBe(5);
      expect(data.height).toBe(5);
      expect(data.tiles).toBeDefined();
      expect(data.doors).toBeDefined();
      expect(data.interactionPoints).toBeDefined();
    });

    it('should deserialize template', () => {
      const template = new RoomTemplate(validConfig);
      const data = template.serialize();
      const newTemplate = RoomTemplate.deserialize(data);

      expect(newTemplate.id).toBe(template.id);
      expect(newTemplate.type).toBe(template.type);
      expect(newTemplate.width).toBe(template.width);
      expect(newTemplate.height).toBe(template.height);
      expect(newTemplate.doors.length).toBe(template.doors.length);
    });

    it('should preserve data in roundtrip', () => {
      const template = new RoomTemplate(validConfig);
      const data = template.serialize();
      const newTemplate = RoomTemplate.deserialize(data);

      expect(newTemplate.getTileAt(1, 1)).toBe(template.getTileAt(1, 1));
      expect(newTemplate.getDoorPositions()).toEqual(template.getDoorPositions());
    });
  });

  describe('fromJSON', () => {
    it('should create template from JSON', () => {
      const template = RoomTemplate.fromJSON(validConfig);

      expect(template.id).toBe('test_room');
      expect(template.type).toBe('apartment');
      expect(template.width).toBe(5);
      expect(template.height).toBe(5);
    });
  });

  describe('TileType enum', () => {
    it('should have all required tile types', () => {
      expect(TileType.EMPTY).toBe(0);
      expect(TileType.FLOOR).toBe(1);
      expect(TileType.WALL).toBe(2);
      expect(TileType.DOOR).toBe(3);
      expect(TileType.WINDOW).toBe(4);
      expect(TileType.FURNITURE).toBe(5);
      expect(TileType.CONTAINER).toBe(6);
    });
  });
});
