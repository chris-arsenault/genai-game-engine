/**
 * EntityManager Test Suite
 * Validates lifecycle, pooling, tagging, component queries, and performance.
 */

import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';

describe('EntityManager', () => {
  let manager;

  beforeEach(() => {
    manager = new EntityManager();
  });

  describe('Entity Creation', () => {
    it('creates entity with unique ID', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();

      expect(id1).toBe(0);
      expect(id2).toBe(1);
      expect(manager.hasEntity(id1)).toBe(true);
      expect(manager.hasEntity(id2)).toBe(true);
    });

    it('creates entity with tag', () => {
      const id = manager.createEntity('player');

      expect(manager.getTag(id)).toBe('player');
      expect(manager.getEntitiesByTag('player')).toContain(id);
    });

    it('respects active flag', () => {
      const id = manager.createEntity(null, { active: false });

      expect(manager.isActive(id)).toBe(false);
      expect(manager.getActiveEntityCount()).toBe(0);
    });

    it('tracks entity count', () => {
      expect(manager.getEntityCount()).toBe(0);

      manager.createEntity();
      manager.createEntity();

      expect(manager.getEntityCount()).toBe(2);
    });
  });

  describe('Entity Destruction', () => {
    it('destroys entity successfully', () => {
      const id = manager.createEntity();

      const destroyed = manager.destroyEntity(id);

      expect(destroyed).toBe(true);
      expect(manager.hasEntity(id)).toBe(false);
    });

    it('returns false when destroying non-existent entity', () => {
      const destroyed = manager.destroyEntity(9999);

      expect(destroyed).toBe(false);
    });

    it('removes entity from tag index on destruction', () => {
      const id = manager.createEntity('enemy');

      manager.destroyEntity(id);

      expect(manager.getEntitiesByTag('enemy')).toHaveLength(0);
    });

    it('integrates with component registry when attached', () => {
      const registry = {
        removeAllComponents: jest.fn(),
        queryEntities: jest.fn(() => []),
        clear: jest.fn(),
      };
      manager.setComponentRegistry(registry);

      const id = manager.createEntity();
      manager.addComponentType(id, 'Position');

      manager.destroyEntity(id);

      expect(registry.removeAllComponents).toHaveBeenCalledWith(id);
    });

    it('emits destroy listeners', () => {
      const listener = jest.fn();
      manager.onEntityDestroyed(listener);

      const id = manager.createEntity('enemy');
      manager.destroyEntity(id);

      expect(listener).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ id, active: false })
      );
    });
  });

  describe('ID Recycling', () => {
    it('recycles entity IDs', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();

      manager.destroyEntity(id1);
      const id3 = manager.createEntity();

      expect(id3).toBe(id1);
      expect(manager.hasEntity(id3)).toBe(true);
    });

    it('recycles IDs in LIFO order', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();
      const id3 = manager.createEntity();

      manager.destroyEntity(id1);
      manager.destroyEntity(id2);

      const id4 = manager.createEntity();
      const id5 = manager.createEntity();

      expect(id4).toBe(id2);
      expect(id5).toBe(id1);
      expect(id3).toBe(2);
    });
  });

  describe('Tag Management', () => {
    it('returns entities by tag', () => {
      const player = manager.createEntity('player');
      const enemy1 = manager.createEntity('enemy');
      const enemy2 = manager.createEntity('enemy');

      const enemies = manager.getEntitiesByTag('enemy');

      expect(enemies).toHaveLength(2);
      expect(enemies).toContain(enemy1);
      expect(enemies).toContain(enemy2);
      expect(enemies).not.toContain(player);
    });

    it('changes entity tag', () => {
      const id = manager.createEntity('enemy');

      manager.setTag(id, 'ally');

      expect(manager.getTag(id)).toBe('ally');
      expect(manager.getEntitiesByTag('enemy')).toHaveLength(0);
      expect(manager.getEntitiesByTag('ally')).toContain(id);
    });

    it('handles setting tag on non-existent entity', () => {
      manager.setTag(12345, 'projectile');

      expect(manager.getEntitiesByTag('projectile')).toHaveLength(0);
    });
  });

  describe('Activation State', () => {
    it('activates entity', () => {
      const id = manager.createEntity(null, { active: false });

      manager.activate(id);

      expect(manager.isActive(id)).toBe(true);
    });

    it('deactivates entity', () => {
      const id = manager.createEntity();

      manager.deactivate(id);

      expect(manager.isActive(id)).toBe(false);
    });

    it('tracks active entity count', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();
      const id3 = manager.createEntity();

      expect(manager.getActiveEntityCount()).toBe(3);

      manager.deactivate(id1);
      manager.deactivate(id2);

      expect(manager.getActiveEntityCount()).toBe(1);
    });
  });

  describe('Component Queries', () => {
    it('queries entities by component types without registry', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity();

      manager.addComponentType(id1, 'Position');
      manager.addComponentType(id1, 'Velocity');
      manager.addComponentType(id2, 'Position');

      const movers = manager.queryByComponents('Position', 'Velocity');
      const positioned = manager.queryByComponents('Position');

      expect(movers).toEqual([id1]);
      expect(positioned.sort()).toEqual([id1, id2]);
    });

    it('delegates queries to registry when available', () => {
      const registry = {
        removeAllComponents: jest.fn(),
        queryEntities: jest.fn(() => [7, 8]),
        clear: jest.fn(),
      };
      manager.setComponentRegistry(registry);

      const result = manager.queryByComponents('Position');

      expect(registry.queryEntities).toHaveBeenCalledWith('Position');
      expect(result).toEqual([7, 8]);
    });
  });

  describe('Component Type Tracking', () => {
    it('adds component type to entity', () => {
      const id = manager.createEntity();

      manager.addComponentType(id, 'Transform');

      const types = manager.getComponentTypes(id);
      expect(types.has('Transform')).toBe(true);
    });

    it('removes component type from entity', () => {
      const id = manager.createEntity();

      manager.addComponentType(id, 'Transform');
      manager.removeComponentType(id, 'Transform');

      const types = manager.getComponentTypes(id);
      expect(types.has('Transform')).toBe(false);
    });

    it('returns empty set for non-existent entity', () => {
      const types = manager.getComponentTypes(9999);

      expect(types.size).toBe(0);
    });
  });

  describe('Clear', () => {
    it('clears all entities and resets IDs', () => {
      manager.createEntity('player');
      manager.createEntity('enemy');

      manager.clear();

      expect(manager.getEntityCount()).toBe(0);
      expect(manager.getAllEntities()).toHaveLength(0);
      const newId = manager.createEntity();
      expect(newId).toBe(0);
    });

    it('notifies component registry on clear', () => {
      const registry = {
        removeAllComponents: jest.fn(),
        queryEntities: jest.fn(() => []),
        clear: jest.fn(),
      };
      manager.setComponentRegistry(registry);

      manager.createEntity();
      manager.clear();

      expect(registry.clear).toHaveBeenCalled();
    });
  });

  describe('Utility', () => {
    it('iterates entities with forEachEntity', () => {
      const id1 = manager.createEntity();
      const id2 = manager.createEntity(null, { active: false });
      const seen = [];

      manager.forEachEntity((id) => {
        seen.push(id);
      });

      expect(seen).toEqual([id1]);

      const seenInactive = [];
      manager.forEachEntity((id) => seenInactive.push(id), {
        includeInactive: true,
      });
      expect(seenInactive).toEqual([id1, id2]);
    });

    it('returns stats after churn', () => {
      const ids = [];
      for (let i = 0; i < 50; i++) {
        ids.push(manager.createEntity());
      }
      ids.forEach((id) => manager.destroyEntity(id));

      const stats = manager.getStats();
      expect(stats.created).toBe(50);
      expect(stats.recycled).toBe(50);
      expect(stats.poolSize).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('creates 10000 entities in under 200ms', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        manager.createEntity();
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });

    it('destroys 10000 entities quickly and reuses pool', () => {
      const ids = [];
      for (let i = 0; i < 10000; i++) {
        ids.push(manager.createEntity());
      }

      const start = performance.now();
      for (const id of ids) {
        manager.destroyEntity(id);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
      const statsAfterDestroy = manager.getStats();
      expect(statsAfterDestroy.poolSize).toBeGreaterThan(0);

      // Creating another entity should reuse pooled metadata
      manager.createEntity();
      const statsAfterReuse = manager.getStats();
      expect(statsAfterReuse.pooledReused).toBeGreaterThan(0);
    });
  });
});
