import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { loadAct1Scene } from '../../../src/game/scenes/Act1Scene.js';

describe('Act1Scene boundary colliders', () => {
  it('aligns boundary collider bounds with transform centers', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    const eventBus = new EventBus();

    await loadAct1Scene(entityManager, componentRegistry, eventBus);

    const colliderEntries = Array.from(
      componentRegistry.getComponentsOfType('Collider').entries()
    ).filter(([, collider]) => Array.isArray(collider.tags) && collider.tags.includes('boundary'));

    expect(colliderEntries.length).toBeGreaterThan(0);

    for (const [entityId, collider] of colliderEntries) {
      const transform = componentRegistry.getComponent(entityId, 'Transform');
      expect(transform).toBeDefined();

      const bounds = collider.getBounds(transform);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      expect(centerX).toBeCloseTo(transform.x, 6);
      expect(centerY).toBeCloseTo(transform.y, 6);
      expect(bounds.minX).toBeGreaterThanOrEqual(0);
      expect(bounds.maxX).toBeLessThanOrEqual(800);
      expect(bounds.minY).toBeGreaterThanOrEqual(0);
      expect(bounds.maxY).toBeLessThanOrEqual(600);
    }
  });
});
