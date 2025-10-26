/**
 * EntityManager Test Suite
 * Tests entity lifecycle, ID management, tagging, and activation states.
 */

import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';

describe('EntityManager', () => {
  let manager;

  beforeEach(() => {
    manager = new EntityManager();
  });

  describe('Entity Creation', () => {
    it('should create entity with unique ID', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();

      expect(id1).toBe(0);
      expect(id2).toBe(1);
      expect(manager.hasEntity(id1)).toBe(true);
      expect(manager.hasEntity(id2)).toBe(true);
    });

    it('should create entity with tag', () => {
      const id = manager.createEntity('player');

      expect(manager.getTag(id)).toBe('player');
      expect(manager.getEntitiesByTag('player')).toContain(id);
    });

    it('should create entity without tag', () => {
      const id = manager.createEntity();

      expect(manager.getTag(id)).toBeNull();
    });

    it('should initialize entities as active', () => {
      const id = manager.createEntity();

      expect(manager.isActive(id)).toBe(true);
    });

    it('should track entity count', () => {
      expect(manager.getEntityCount()).toBe(0);

      manager.createEntity();
      manager.createEntity();

      expect(manager.getEntityCount()).toBe(2);
    });
  });

  describe('Entity Destruction', () => {
    it('should destroy entity successfully', () => {
      const id = manager.createEntity();

      const destroyed = manager.destroyEntity(id);

      expect(destroyed).toBe(true);
      expect(manager.hasEntity(id)).toBe(false);
    });

    it('should return false when destroying non-existent entity', () => {
      const destroyed = manager.destroyEntity(999);

      expect(destroyed).toBe(false);
    });

    it('should remove entity from tag index on destruction', () => {
      const id = manager.createEntity('enemy');

      manager.destroyEntity(id);

      expect(manager.getEntitiesByTag('enemy')).not.toContain(id);
      expect(manager.getEntitiesByTag('enemy')).toHaveLength(0);
    });

    it('should decrease entity count on destruction', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();

      expect(manager.getEntityCount()).toBe(2);

      manager.destroyEntity(id1);

      expect(manager.getEntityCount()).toBe(1);
    });
  });

  describe('ID Recycling', () => {
    it('should recycle entity IDs', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();

      manager.destroyEntity(id1);

      const id3 = manager.createEntity();

      // Should reuse id1
      expect(id3).toBe(id1);
      expect(manager.hasEntity(id3)).toBe(true);
    });

    it('should recycle multiple IDs in LIFO order', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();
      const id3 = manager.createEntity();

      manager.destroyEntity(id1);
      manager.destroyEntity(id2);

      const id4 = manager.createEntity();
      const id5 = manager.createEntity();

      // LIFO: id2 recycled first, then id1
      expect(id4).toBe(id2);
      expect(id5).toBe(id1);
    });
  });

  describe('Tag Management', () => {
    it('should get entities by tag', () => {
      const player = manager.createEntity('player');
      const enemy1 = manager.createEntity('enemy');
      const enemy2 = manager.createEntity('enemy');

      const enemies = manager.getEntitiesByTag('enemy');

      expect(enemies).toHaveLength(2);
      expect(enemies).toContain(enemy1);
      expect(enemies).toContain(enemy2);
      expect(enemies).not.toContain(player);
    });

    it('should return empty array for non-existent tag', () => {
      const entities = manager.getEntitiesByTag('nonexistent');

      expect(entities).toEqual([]);
    });

    it('should set entity tag', () => {
      const id = manager.createEntity();

      manager.setTag(id, 'projectile');

      expect(manager.getTag(id)).toBe('projectile');
      expect(manager.getEntitiesByTag('projectile')).toContain(id);
    });

    it('should change entity tag', () => {
      const id = manager.createEntity('enemy');

      manager.setTag(id, 'ally');

      expect(manager.getTag(id)).toBe('ally');
      expect(manager.getEntitiesByTag('enemy')).not.toContain(id);
      expect(manager.getEntitiesByTag('ally')).toContain(id);
    });

    it('should handle setting tag on non-existent entity', () => {
      manager.setTag(999, 'test');

      // Should not throw, just no-op
      expect(manager.getEntitiesByTag('test')).toHaveLength(0);
    });

    it('should filter inactive entities from tag queries', () => {
      const id1 = manager.createEntity('enemy');
      const id2 = manager.createEntity('enemy');

      manager.deactivate(id1);

      const activeEnemies = manager.getEntitiesByTag('enemy');

      expect(activeEnemies).toHaveLength(1);
      expect(activeEnemies).toContain(id2);
      expect(activeEnemies).not.toContain(id1);
    });
  });

  describe('Activation State', () => {
    it('should activate entity', () => {
      const id = manager.createEntity();
      manager.deactivate(id);

      manager.activate(id);

      expect(manager.isActive(id)).toBe(true);
    });

    it('should deactivate entity', () => {
      const id = manager.createEntity();

      manager.deactivate(id);

      expect(manager.isActive(id)).toBe(false);
    });

    it('should handle activation of non-existent entity', () => {
      manager.activate(999);

      // Should not throw
      expect(manager.isActive(999)).toBe(false);
    });

    it('should track active entity count', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();
      const id3 = manager.createEntity();

      expect(manager.getActiveEntityCount()).toBe(3);

      manager.deactivate(id1);
      manager.deactivate(id2);

      expect(manager.getActiveEntityCount()).toBe(1);
    });

    it('should filter inactive entities from getAllEntities', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();
      const id3 = manager.createEntity();

      manager.deactivate(id2);

      const allEntities = manager.getAllEntities();

      expect(allEntities).toHaveLength(2);
      expect(allEntities).toContain(id1);
      expect(allEntities).toContain(id3);
      expect(allEntities).not.toContain(id2);
    });
  });

  describe('Component Type Tracking', () => {
    it('should add component type to entity', () => {
      const id = manager.createEntity();

      manager.addComponentType(id, 'Transform');

      const types = manager.getComponentTypes(id);
      expect(types.has('Transform')).toBe(true);
    });

    it('should remove component type from entity', () => {
      const id = manager.createEntity();
      manager.addComponentType(id, 'Transform');

      manager.removeComponentType(id, 'Transform');

      const types = manager.getComponentTypes(id);
      expect(types.has('Transform')).toBe(false);
    });

    it('should track multiple component types', () => {
      const id = manager.createEntity();

      manager.addComponentType(id, 'Transform');
      manager.addComponentType(id, 'Velocity');
      manager.addComponentType(id, 'Sprite');

      const types = manager.getComponentTypes(id);
      expect(types.size).toBe(3);
      expect(types.has('Transform')).toBe(true);
      expect(types.has('Velocity')).toBe(true);
      expect(types.has('Sprite')).toBe(true);
    });

    it('should return empty set for non-existent entity', () => {
      const types = manager.getComponentTypes(999);

      expect(types.size).toBe(0);
    });
  });

  describe('Clear', () => {
    it('should clear all entities', () => {
      manager.createEntity('player');
      manager.createEntity('enemy');
      manager.createEntity('enemy');

      manager.clear();

      expect(manager.getEntityCount()).toBe(0);
      expect(manager.getAllEntities()).toHaveLength(0);
      expect(manager.getEntitiesByTag('player')).toHaveLength(0);
      expect(manager.getEntitiesByTag('enemy')).toHaveLength(0);
    });

    it('should reset ID counter after clear', () => {
      manager.createEntity();
      manager.createEntity();
      manager.createEntity();

      manager.clear();

      const newId = manager.createEntity();
      expect(newId).toBe(0);
    });

    it('should clear recycled IDs', () => {
      const id1 = manager.createEntity();
      manager.destroyEntity(id1);

      manager.clear();

      const newId = manager.createEntity();
      // Should start fresh, not recycle
      expect(newId).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should create 1000 entities in under 50ms', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        manager.createEntity();
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle tag queries with 1000 entities efficiently', () => {
      // Create 1000 entities with 100 tagged as 'enemy'
      for (let i = 0; i < 1000; i++) {
        manager.createEntity(i % 10 === 0 ? 'enemy' : null);
      }

      const start = performance.now();
      const enemies = manager.getEntitiesByTag('enemy');
      const elapsed = performance.now() - start;

      expect(enemies).toHaveLength(100);
      expect(elapsed).toBeLessThan(5);
    });

    it('should destroy entities quickly', () => {
      const ids = [];
      for (let i = 0; i < 1000; i++) {
        ids.push(manager.createEntity());
      }

      const start = performance.now();
      for (const id of ids) {
        manager.destroyEntity(id);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });
});
