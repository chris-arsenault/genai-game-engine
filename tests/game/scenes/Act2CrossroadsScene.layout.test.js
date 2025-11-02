import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import {
  ACT2_CROSSROADS_TRIGGER_DEFINITIONS,
  seedAct2CrossroadsTriggers,
} from '../../../src/game/data/quests/act2TriggerDefinitions.js';
import { Act2CrossroadsScene } from '../../../src/game/scenes/Act2CrossroadsScene.js';

describe('Act2CrossroadsScene layout scaffolding', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let scene;

  beforeEach(() => {
    QuestTriggerRegistry.reset(ACT2_CROSSROADS_TRIGGER_DEFINITIONS.map((def) => ({ ...def })));
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    scene = new Act2CrossroadsScene({
      entityManager,
      componentRegistry,
      eventBus,
    });
    scene._loadAct2CrossroadsArtConfig = jest.fn().mockResolvedValue({
      input: null,
      manifestUrl: null,
      config: null,
    });
  });

  afterEach(() => {
    if (scene) {
      scene.unload();
    }
    QuestTriggerRegistry.reset([]);
  });

  it('exposes navigation mesh and geometry metadata after load', async () => {
    let sceneLoadedPayload = null;
    eventBus.on('scene:loaded', (payload) => {
      if (payload?.sceneId === 'act2_crossroads') {
        sceneLoadedPayload = payload;
      }
    });

    await scene.load();

    expect(scene.metadata.navigationMesh?.nodes?.length).toBeGreaterThanOrEqual(4);
    expect(
      scene.metadata.navigationMesh.nodes.find((node) => node.id === 'checkpoint_gate')
    ).toBeDefined();
    expect(scene.metadata.geometry?.floors).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'crossroads_floor_safehouse' })])
    );
    expect(scene.metadata.geometry?.boundaries).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'crossroads_boundary_west' })])
    );
    expect(sceneLoadedPayload?.navigationMesh?.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'selection_console' })])
    );
  });

  it('registers static boundary colliders for hub walls', async () => {
    await scene.load();

    const colliderMap = componentRegistry.getComponentsOfType('Collider');
    const navBlockerCount = Array.from(colliderMap.values()).filter(
      (collider) => Array.isArray(collider.tags) && collider.tags.includes('nav_blocker')
    ).length;

    expect(navBlockerCount).toBeGreaterThanOrEqual(4);
  });
});
