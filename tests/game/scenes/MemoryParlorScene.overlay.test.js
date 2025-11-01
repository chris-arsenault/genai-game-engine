import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadMemoryParlorScene,
  unloadMemoryParlorScene,
} from '../../../src/game/scenes/MemoryParlorScene.js';

describe('MemoryParlorScene neon overlay integration', () => {
  it('loads the neon overlay when an asset loader is provided', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    const eventBus = new EventBus();
    const fakeImage = { width: 1920, height: 1080 };
    const assetLoader = {
      loadImage: jest.fn().mockResolvedValue(fakeImage),
    };

    const sceneData = await loadMemoryParlorScene(
      entityManager,
      componentRegistry,
      eventBus,
      {
        assetLoader,
      }
    );

    try {
      expect(assetLoader.loadImage).toHaveBeenCalledWith(
        'assets/overlays/act2-crossroads/memory_parlor_neon_001.png'
      );

      const [overlayEntityId] = entityManager.getEntitiesByTag('memory_parlor_neon_overlay');
      expect(overlayEntityId).toBeDefined();

      const transform = componentRegistry.getComponent(overlayEntityId, 'Transform');
      expect(transform).toBeDefined();
      expect(transform.x).toBeCloseTo(480);
      expect(transform.y).toBeCloseTo(300);

      const sprite = componentRegistry.getComponent(overlayEntityId, 'Sprite');
      expect(sprite).toBeDefined();
      expect(sprite.image).toBe(fakeImage);
      expect(sprite.layer).toBe('ground_fx');
      expect(sprite.alpha).toBeCloseTo(0.88);

      expect(sceneData.metadata?.overlay?.status).toBe('loaded');
      expect(sceneData.metadata?.overlay?.entityId).toBe(overlayEntityId);
    } finally {
      unloadMemoryParlorScene(entityManager, componentRegistry, sceneData.sceneEntities);
      if (typeof sceneData.cleanup === 'function') {
        sceneData.cleanup();
      }
    }
  });

  it('falls back to a tinted plate when no asset loader is available', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    const eventBus = new EventBus();

    const sceneData = await loadMemoryParlorScene(
      entityManager,
      componentRegistry,
      eventBus
    );

    try {
      const [overlayEntityId] = entityManager.getEntitiesByTag('memory_parlor_neon_overlay');
      expect(overlayEntityId).toBeDefined();

      const sprite = componentRegistry.getComponent(overlayEntityId, 'Sprite');
      expect(sprite).toBeDefined();
      expect(sprite.image).toBeNull();
      expect(sprite.color).toBe('#2a1742');
      expect(sceneData.metadata?.overlay?.status).toBe('skipped');
    } finally {
      unloadMemoryParlorScene(entityManager, componentRegistry, sceneData.sceneEntities);
      if (typeof sceneData.cleanup === 'function') {
        sceneData.cleanup();
      }
    }
  });
});
