import { RoomInstance } from '../../../src/engine/procedural/RoomInstance.js';

describe('RoomInstance', () => {
  let validConfig;

  beforeEach(() => {
    validConfig = {
      id: 'room_001',
      templateId: 'apartment_1br',
      x: 100,
      y: 200,
      rotation: 0
    };
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const instance = new RoomInstance(validConfig);

      expect(instance.id).toBe('room_001');
      expect(instance.templateId).toBe('apartment_1br');
      expect(instance.x).toBe(100);
      expect(instance.y).toBe(200);
      expect(instance.rotation).toBe(0);
    });

    it('should initialize empty collections', () => {
      const instance = new RoomInstance(validConfig);

      expect(instance.doors.size).toBe(0);
      expect(instance.connections.size).toBe(0);
      expect(instance.entities).toEqual([]);
      expect(instance.state).toEqual({});
    });

    it('should use default rotation of 0', () => {
      const config = { ...validConfig };
      delete config.rotation;
      const instance = new RoomInstance(config);

      expect(instance.rotation).toBe(0);
    });
  });

  describe('getWorldPosition', () => {
    it('should return world position', () => {
      const instance = new RoomInstance(validConfig);
      const pos = instance.getWorldPosition();

      expect(pos).toEqual({ x: 100, y: 200 });
    });
  });

  describe('localToWorld', () => {
    it('should convert local to world coordinates', () => {
      const instance = new RoomInstance(validConfig);
      const worldPos = instance.localToWorld(5, 10);

      expect(worldPos).toEqual({ x: 105, y: 210 });
    });

    it('should handle origin', () => {
      const instance = new RoomInstance(validConfig);
      const worldPos = instance.localToWorld(0, 0);

      expect(worldPos).toEqual({ x: 100, y: 200 });
    });
  });

  describe('worldToLocal', () => {
    it('should convert world to local coordinates', () => {
      const instance = new RoomInstance(validConfig);
      const localPos = instance.worldToLocal(105, 210);

      expect(localPos).toEqual({ x: 5, y: 10 });
    });

    it('should handle room origin', () => {
      const instance = new RoomInstance(validConfig);
      const localPos = instance.worldToLocal(100, 200);

      expect(localPos).toEqual({ x: 0, y: 0 });
    });
  });

  describe('getBounds', () => {
    it('should return bounding box', () => {
      const instance = new RoomInstance(validConfig);
      const bounds = instance.getBounds(10, 8);

      expect(bounds).toEqual({
        x: 100,
        y: 200,
        width: 10,
        height: 8
      });
    });
  });

  describe('containsPoint', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
    });

    it('should return true for points inside room', () => {
      expect(instance.containsPoint(105, 205, 10, 8)).toBe(true);
      expect(instance.containsPoint(100, 200, 10, 8)).toBe(true);
    });

    it('should return false for points outside room', () => {
      expect(instance.containsPoint(50, 50, 10, 8)).toBe(false);
      expect(instance.containsPoint(200, 300, 10, 8)).toBe(false);
    });

    it('should return false for points on far edge', () => {
      expect(instance.containsPoint(110, 208, 10, 8)).toBe(false);
    });
  });

  describe('connectTo', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
    });

    it('should connect door to another room', () => {
      instance.connectTo('door1', 'room_002', 'door2');

      expect(instance.doors.get('door1')).toBe('room_002');
      expect(instance.connections.get('door1')).toEqual({
        roomId: 'room_002',
        doorId: 'door2'
      });
    });

    it('should allow multiple connections', () => {
      instance.connectTo('door1', 'room_002', 'door2');
      instance.connectTo('door2', 'room_003', 'door1');

      expect(instance.doors.size).toBe(2);
      expect(instance.connections.size).toBe(2);
    });
  });

  describe('getConnection', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
      instance.connectTo('door1', 'room_002', 'door2');
    });

    it('should return connection info', () => {
      const connection = instance.getConnection('door1');

      expect(connection).toEqual({
        roomId: 'room_002',
        doorId: 'door2'
      });
    });

    it('should return undefined for non-existent door', () => {
      expect(instance.getConnection('nonexistent')).toBeUndefined();
    });
  });

  describe('isConnected', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
      instance.connectTo('door1', 'room_002', 'door2');
    });

    it('should return true for connected door', () => {
      expect(instance.isConnected('door1')).toBe(true);
    });

    it('should return false for unconnected door', () => {
      expect(instance.isConnected('door2')).toBe(false);
    });
  });

  describe('getConnectedRoomIds', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
    });

    it('should return all connected room IDs', () => {
      instance.connectTo('door1', 'room_002', 'door2');
      instance.connectTo('door2', 'room_003', 'door1');

      const roomIds = instance.getConnectedRoomIds();
      expect(roomIds).toContain('room_002');
      expect(roomIds).toContain('room_003');
      expect(roomIds.length).toBe(2);
    });

    it('should return empty array if no connections', () => {
      expect(instance.getConnectedRoomIds()).toEqual([]);
    });
  });

  describe('entity management', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
    });

    describe('addEntity', () => {
      it('should add entity to room', () => {
        const entity = { id: 'entity_001', type: 'npc' };
        instance.addEntity(entity);

        expect(instance.entities.length).toBe(1);
        expect(instance.entities[0]).toBe(entity);
      });

      it('should add multiple entities', () => {
        instance.addEntity({ id: 'entity_001', type: 'npc' });
        instance.addEntity({ id: 'entity_002', type: 'evidence' });

        expect(instance.entities.length).toBe(2);
      });
    });

    describe('removeEntity', () => {
      beforeEach(() => {
        instance.addEntity({ id: 'entity_001', type: 'npc' });
        instance.addEntity({ id: 'entity_002', type: 'evidence' });
      });

      it('should remove entity by id', () => {
        const result = instance.removeEntity('entity_001');

        expect(result).toBe(true);
        expect(instance.entities.length).toBe(1);
        expect(instance.entities[0].id).toBe('entity_002');
      });

      it('should return false if entity not found', () => {
        const result = instance.removeEntity('nonexistent');

        expect(result).toBe(false);
        expect(instance.entities.length).toBe(2);
      });
    });

    describe('getEntities', () => {
      it('should return all entities', () => {
        instance.addEntity({ id: 'entity_001', type: 'npc' });
        instance.addEntity({ id: 'entity_002', type: 'evidence' });

        const entities = instance.getEntities();
        expect(entities.length).toBe(2);
      });

      it('should return empty array if no entities', () => {
        expect(instance.getEntities()).toEqual([]);
      });
    });
  });

  describe('state management', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance(validConfig);
    });

    describe('setState', () => {
      it('should set state value', () => {
        instance.setState('visited', true);
        expect(instance.state.visited).toBe(true);
      });

      it('should allow multiple state values', () => {
        instance.setState('visited', true);
        instance.setState('clearedEnemies', true);
        instance.setState('collectibles', 5);

        expect(instance.state.visited).toBe(true);
        expect(instance.state.clearedEnemies).toBe(true);
        expect(instance.state.collectibles).toBe(5);
      });

      it('should overwrite existing value', () => {
        instance.setState('count', 1);
        instance.setState('count', 2);

        expect(instance.state.count).toBe(2);
      });
    });

    describe('getState', () => {
      it('should get state value', () => {
        instance.setState('visited', true);
        expect(instance.getState('visited')).toBe(true);
      });

      it('should return undefined for non-existent key', () => {
        expect(instance.getState('nonexistent')).toBeUndefined();
      });
    });
  });

  describe('serialize and deserialize', () => {
    let instance;

    beforeEach(() => {
      instance = new RoomInstance({ ...validConfig, width: 10, height: 8 });
      instance.connectTo('door1', 'room_002', 'door2');
      instance.addEntity({ id: 'entity_001', type: 'npc' });
      instance.setState('visited', true);
    });

    it('should serialize instance', () => {
      const data = instance.serialize();

      expect(data.id).toBe('room_001');
      expect(data.templateId).toBe('apartment_1br');
      expect(data.x).toBe(100);
      expect(data.y).toBe(200);
      expect(data.rotation).toBe(0);
      expect(data.width).toBe(10);
      expect(data.height).toBe(8);
      expect(data.doors).toBeDefined();
      expect(data.connections).toBeDefined();
      expect(data.entities).toBeDefined();
      expect(data.state).toBeDefined();
    });

    it('should deserialize instance', () => {
      const data = instance.serialize();
      const newInstance = RoomInstance.deserialize(data);

      expect(newInstance.id).toBe(instance.id);
      expect(newInstance.templateId).toBe(instance.templateId);
      expect(newInstance.x).toBe(instance.x);
      expect(newInstance.y).toBe(instance.y);
      expect(newInstance.rotation).toBe(instance.rotation);
      expect(newInstance.width).toBe(instance.width);
      expect(newInstance.height).toBe(instance.height);
    });

    it('should preserve doors and connections', () => {
      const data = instance.serialize();
      const newInstance = RoomInstance.deserialize(data);

      expect(newInstance.doors.size).toBe(1);
      expect(newInstance.doors.get('door1')).toBe('room_002');
      expect(newInstance.connections.get('door1')).toEqual({
        roomId: 'room_002',
        doorId: 'door2'
      });
    });

    it('should preserve entities', () => {
      const data = instance.serialize();
      const newInstance = RoomInstance.deserialize(data);

      expect(newInstance.entities.length).toBe(1);
      expect(newInstance.entities[0].id).toBe('entity_001');
    });

    it('should preserve state', () => {
      const data = instance.serialize();
      const newInstance = RoomInstance.deserialize(data);

      expect(newInstance.state.visited).toBe(true);
    });

    it('should handle roundtrip serialization', () => {
      const data = instance.serialize();
      const newInstance = RoomInstance.deserialize(data);
      const data2 = newInstance.serialize();

      expect(data2).toEqual(data);
    });
  });

  describe('rotation handling', () => {
    it('handles 90-degree rotation for coordinate conversions', () => {
      const rotatedConfig = { ...validConfig, rotation: 90, width: 10, height: 6 };
      const instance = new RoomInstance(rotatedConfig);
      const worldPos = instance.localToWorld(0, 0);
      expect(worldPos).toEqual({ x: rotatedConfig.x, y: rotatedConfig.y + 10 });

      const back = instance.worldToLocal(worldPos.x, worldPos.y);
      expect(back.x).toBeCloseTo(0);
      expect(back.y).toBeCloseTo(0);
    });

    it('swaps bounds dimensions when rotated', () => {
      const rotatedConfig = { ...validConfig, rotation: 90, width: 12, height: 4 };
      const instance = new RoomInstance(rotatedConfig);
      const bounds = instance.getBounds(12, 4);

      expect(bounds).toEqual({
        x: rotatedConfig.x,
        y: rotatedConfig.y,
        width: 4,
        height: 12
      });
    });

    it('checks containment after rotation', () => {
      const rotatedConfig = { ...validConfig, rotation: 180, width: 8, height: 6 };
      const instance = new RoomInstance(rotatedConfig);

      const insideWorld = instance.localToWorld(4, 3);
      expect(instance.containsPoint(insideWorld.x, insideWorld.y, 8, 6)).toBe(true);

      const outsideWorld = instance.localToWorld(9, 3);
      expect(instance.containsPoint(outsideWorld.x, outsideWorld.y, 8, 6)).toBe(false);
    });
  });
});
