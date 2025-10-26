/**
 * ComponentRegistry Test Suite
 * Tests component storage, retrieval, and query optimization.
 */

import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';

// Mock component class
class MockComponent {
  constructor(type, data = {}) {
    this.type = type;
    this.data = data;
  }
}

describe('ComponentRegistry', () => {
  let registry;
  let entityManager;

  beforeEach(() => {
    entityManager = new EntityManager();
    registry = new ComponentRegistry(entityManager);
  });

  describe('Component Addition', () => {
    it('should add component to entity', () => {
      const entityId = entityManager.createEntity();
      const component = new MockComponent('Transform', { x: 0, y: 0 });

      registry.addComponent(entityId, component);

      expect(registry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(registry.getComponent(entityId, 'Transform')).toBe(component);
    });

    it('should throw when adding component to non-existent entity', () => {
      const component = new MockComponent('Transform');

      expect(() => {
        registry.addComponent(999, component);
      }).toThrow('Cannot add component to non-existent entity 999');
    });

    it('should track component types on entity', () => {
      const entityId = entityManager.createEntity();
      const component = new MockComponent('Transform');

      registry.addComponent(entityId, component);

      const types = entityManager.getComponentTypes(entityId);
      expect(types.has('Transform')).toBe(true);
    });

    it('should invalidate query cache on component addition', () => {
      const entityId = entityManager.createEntity();
      registry.addComponent(entityId, new MockComponent('Transform'));

      // First query populates cache
      const result1 = registry.queryEntities('Transform');
      expect(result1).toHaveLength(1);

      // Add another entity with Transform
      const entityId2 = entityManager.createEntity();
      registry.addComponent(entityId2, new MockComponent('Transform'));

      // Query should reflect new entity (cache was invalidated)
      const result2 = registry.queryEntities('Transform');
      expect(result2).toHaveLength(2);
    });

    it('should allow multiple components of different types on one entity', () => {
      const entityId = entityManager.createEntity();

      registry.addComponent(entityId, new MockComponent('Transform'));
      registry.addComponent(entityId, new MockComponent('Velocity'));
      registry.addComponent(entityId, new MockComponent('Sprite'));

      expect(registry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(registry.hasComponent(entityId, 'Velocity')).toBe(true);
      expect(registry.hasComponent(entityId, 'Sprite')).toBe(true);
    });
  });

  describe('Component Removal', () => {
    it('should remove component from entity', () => {
      const entityId = entityManager.createEntity();
      registry.addComponent(entityId, new MockComponent('Transform'));

      const removed = registry.removeComponent(entityId, 'Transform');

      expect(removed).toBe(true);
      expect(registry.hasComponent(entityId, 'Transform')).toBe(false);
    });

    it('should return false when removing non-existent component', () => {
      const entityId = entityManager.createEntity();

      const removed = registry.removeComponent(entityId, 'NonExistent');

      expect(removed).toBe(false);
    });

    it('should update entity component types on removal', () => {
      const entityId = entityManager.createEntity();
      registry.addComponent(entityId, new MockComponent('Transform'));

      registry.removeComponent(entityId, 'Transform');

      const types = entityManager.getComponentTypes(entityId);
      expect(types.has('Transform')).toBe(false);
    });

    it('should invalidate query cache on component removal', () => {
      const entityId1 = entityManager.createEntity();
      const entityId2 = entityManager.createEntity();
      registry.addComponent(entityId1, new MockComponent('Transform'));
      registry.addComponent(entityId2, new MockComponent('Transform'));

      // Populate cache
      registry.queryEntities('Transform');

      registry.removeComponent(entityId1, 'Transform');

      const result = registry.queryEntities('Transform');
      expect(result).toHaveLength(1);
      expect(result).toContain(entityId2);
      expect(result).not.toContain(entityId1);
    });
  });

  describe('Component Retrieval', () => {
    it('should get component from entity', () => {
      const entityId = entityManager.createEntity();
      const component = new MockComponent('Transform', { x: 10, y: 20 });
      registry.addComponent(entityId, component);

      const retrieved = registry.getComponent(entityId, 'Transform');

      expect(retrieved).toBe(component);
      expect(retrieved.data.x).toBe(10);
      expect(retrieved.data.y).toBe(20);
    });

    it('should return undefined for non-existent component', () => {
      const entityId = entityManager.createEntity();

      const component = registry.getComponent(entityId, 'NonExistent');

      expect(component).toBeUndefined();
    });

    it('should check if entity has component', () => {
      const entityId = entityManager.createEntity();
      registry.addComponent(entityId, new MockComponent('Transform'));

      expect(registry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(registry.hasComponent(entityId, 'Velocity')).toBe(false);
    });
  });

  describe('Component Type Queries', () => {
    it('should get all components of a specific type', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Transform'));
      registry.addComponent(entity3, new MockComponent('Velocity'));

      const transforms = registry.getComponentsOfType('Transform');

      expect(transforms.size).toBe(2);
      expect(transforms.has(entity1)).toBe(true);
      expect(transforms.has(entity2)).toBe(true);
      expect(transforms.has(entity3)).toBe(false);
    });

    it('should return empty map for non-existent component type', () => {
      const components = registry.getComponentsOfType('NonExistent');

      expect(components.size).toBe(0);
    });

    it('should get all registered component types', () => {
      const entity = entityManager.createEntity();
      registry.addComponent(entity, new MockComponent('Transform'));
      registry.addComponent(entity, new MockComponent('Velocity'));
      registry.addComponent(entity, new MockComponent('Sprite'));

      const types = registry.getComponentTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('Transform');
      expect(types).toContain('Velocity');
      expect(types).toContain('Sprite');
    });
  });

  describe('Entity Queries (ALL)', () => {
    it('should query entities with single component', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Transform'));

      const result = registry.queryEntities('Transform');

      expect(result).toHaveLength(2);
      expect(result).toContain(entity1);
      expect(result).toContain(entity2);
      expect(result).not.toContain(entity3);
    });

    it('should query entities with multiple components (AND logic)', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity1, new MockComponent('Velocity'));

      registry.addComponent(entity2, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Velocity'));

      registry.addComponent(entity3, new MockComponent('Transform'));

      const result = registry.queryEntities('Transform', 'Velocity');

      expect(result).toHaveLength(2);
      expect(result).toContain(entity1);
      expect(result).toContain(entity2);
      expect(result).not.toContain(entity3);
    });

    it('should return all entities when no component types specified', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();

      const result = registry.queryEntities();

      expect(result).toHaveLength(3);
      expect(result).toContain(entity1);
      expect(result).toContain(entity2);
      expect(result).toContain(entity3);
    });

    it('should return empty array when no entities match', () => {
      const result = registry.queryEntities('NonExistent');

      expect(result).toEqual([]);
    });

    it('should filter inactive entities from queries', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Transform'));

      entityManager.deactivate(entity1);

      const result = registry.queryEntities('Transform');

      expect(result).toHaveLength(1);
      expect(result).toContain(entity2);
      expect(result).not.toContain(entity1);
    });

    it('should use query cache for repeated queries', () => {
      const entity1 = entityManager.createEntity();
      registry.addComponent(entity1, new MockComponent('Transform'));

      const result1 = registry.queryEntities('Transform');
      const result2 = registry.queryEntities('Transform');

      // Should return same cached result
      expect(result1).toBe(result2);
    });

    it('should optimize query by using smallest component set', () => {
      // Create many entities with Transform, few with Velocity
      for (let i = 0; i < 100; i++) {
        const entity = entityManager.createEntity();
        registry.addComponent(entity, new MockComponent('Transform'));
      }

      for (let i = 0; i < 5; i++) {
        const entity = entityManager.createEntity();
        registry.addComponent(entity, new MockComponent('Transform'));
        registry.addComponent(entity, new MockComponent('Velocity'));
      }

      const start = performance.now();
      const result = registry.queryEntities('Transform', 'Velocity');
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(5);
      // Should iterate over 5 Velocity entities, not 105 Transform entities
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('Entity Queries (ANY)', () => {
    it('should query entities with any of specified components', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();
      const entity4 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Velocity'));
      registry.addComponent(entity3, new MockComponent('Sprite'));

      const result = registry.queryEntitiesAny('Transform', 'Velocity');

      expect(result).toHaveLength(2);
      expect(result).toContain(entity1);
      expect(result).toContain(entity2);
      expect(result).not.toContain(entity3);
      expect(result).not.toContain(entity4);
    });

    it('should return empty array when no component types specified', () => {
      const result = registry.queryEntitiesAny();

      expect(result).toEqual([]);
    });

    it('should not duplicate entities with multiple matching components', () => {
      const entity = entityManager.createEntity();
      registry.addComponent(entity, new MockComponent('Transform'));
      registry.addComponent(entity, new MockComponent('Velocity'));

      const result = registry.queryEntitiesAny('Transform', 'Velocity');

      expect(result).toHaveLength(1);
      expect(result).toContain(entity);
    });

    it('should filter inactive entities from ANY queries', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Velocity'));

      entityManager.deactivate(entity1);

      const result = registry.queryEntitiesAny('Transform', 'Velocity');

      expect(result).toHaveLength(1);
      expect(result).toContain(entity2);
    });
  });

  describe('Bulk Operations', () => {
    it('should remove all components from an entity', () => {
      const entity = entityManager.createEntity();
      registry.addComponent(entity, new MockComponent('Transform'));
      registry.addComponent(entity, new MockComponent('Velocity'));
      registry.addComponent(entity, new MockComponent('Sprite'));

      registry.removeAllComponents(entity);

      expect(registry.hasComponent(entity, 'Transform')).toBe(false);
      expect(registry.hasComponent(entity, 'Velocity')).toBe(false);
      expect(registry.hasComponent(entity, 'Sprite')).toBe(false);
    });

    it('should clear all components', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Velocity'));

      registry.clear();

      expect(registry.getComponentCount()).toBe(0);
      expect(registry.getComponentTypes()).toHaveLength(0);
    });
  });

  describe('Component Counting', () => {
    it('should count total components', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity1, new MockComponent('Velocity'));
      registry.addComponent(entity2, new MockComponent('Sprite'));

      expect(registry.getComponentCount()).toBe(3);
    });

    it('should count components of specific type', () => {
      const entity1 = entityManager.createEntity();
      const entity2 = entityManager.createEntity();
      const entity3 = entityManager.createEntity();

      registry.addComponent(entity1, new MockComponent('Transform'));
      registry.addComponent(entity2, new MockComponent('Transform'));
      registry.addComponent(entity3, new MockComponent('Velocity'));

      expect(registry.getComponentCountOfType('Transform')).toBe(2);
      expect(registry.getComponentCountOfType('Velocity')).toBe(1);
      expect(registry.getComponentCountOfType('NonExistent')).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should add 1000 components in under 50ms', () => {
      const entities = [];
      for (let i = 0; i < 1000; i++) {
        entities.push(entityManager.createEntity());
      }

      const start = performance.now();
      for (const entity of entities) {
        registry.addComponent(entity, new MockComponent('Transform'));
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('should query 1000 entities in under 10ms', () => {
      for (let i = 0; i < 1000; i++) {
        const entity = entityManager.createEntity();
        registry.addComponent(entity, new MockComponent('Transform'));
      }

      const start = performance.now();
      const result = registry.queryEntities('Transform');
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(elapsed).toBeLessThan(10);
    });

    it('should handle complex multi-component queries efficiently', () => {
      // Create diverse entity distribution
      for (let i = 0; i < 500; i++) {
        const entity = entityManager.createEntity();
        registry.addComponent(entity, new MockComponent('Transform'));
      }
      for (let i = 0; i < 100; i++) {
        const entity = entityManager.createEntity();
        registry.addComponent(entity, new MockComponent('Transform'));
        registry.addComponent(entity, new MockComponent('Velocity'));
      }
      for (let i = 0; i < 10; i++) {
        const entity = entityManager.createEntity();
        registry.addComponent(entity, new MockComponent('Transform'));
        registry.addComponent(entity, new MockComponent('Velocity'));
        registry.addComponent(entity, new MockComponent('Sprite'));
      }

      const start = performance.now();
      const result = registry.queryEntities('Transform', 'Velocity', 'Sprite');
      const elapsed = performance.now() - start;

      expect(result).toHaveLength(10);
      // Should iterate smallest set (Sprite: 10) not Transform (610)
      expect(elapsed).toBeLessThan(5);
    });
  });
});
