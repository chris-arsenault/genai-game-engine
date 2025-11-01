import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { loadMemoryParlorScene } from '../../../src/game/scenes/MemoryParlorScene.js';

const TARGET_TAGS = new Set(['boundary', 'cover']);

describe('MemoryParlorScene solid colliders', () => {
  it('keeps collider bounds centered on transform for solid geometry', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    const eventBus = new EventBus();

    await loadMemoryParlorScene(entityManager, componentRegistry, eventBus);

    const colliderEntries = Array.from(
      componentRegistry.getComponentsOfType('Collider').entries()
    ).filter(([, collider]) =>
      Array.isArray(collider.tags) && collider.tags.some((tag) => TARGET_TAGS.has(tag))
    );

    expect(colliderEntries.length).toBeGreaterThan(0);

    for (const [entityId, collider] of colliderEntries) {
      const transform = componentRegistry.getComponent(entityId, 'Transform');
      expect(transform).toBeDefined();

      const bounds = collider.getBounds(transform);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      expect(centerX).toBeCloseTo(transform.x, 6);
      expect(centerY).toBeCloseTo(transform.y, 6);
      expect(bounds.maxX).toBeGreaterThan(bounds.minX);
      expect(bounds.maxY).toBeGreaterThan(bounds.minY);
    }
  });
});
