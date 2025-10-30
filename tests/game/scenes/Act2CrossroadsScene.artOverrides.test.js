import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import {
  ACT2_CROSSROADS_TRIGGER_DEFINITIONS,
  seedAct2CrossroadsTriggers,
} from '../../../src/game/data/quests/act2TriggerDefinitions.js';
import { Act2CrossroadsScene } from '../../../src/game/scenes/Act2CrossroadsScene.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';
import { Act2CrossroadsArtConfig } from '../../../src/game/data/sceneArt/Act2CrossroadsArtConfig.js';

describe('Act2CrossroadsScene art overrides', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let scene;
  const originalSceneArt = GameConfig.sceneArt.act2Crossroads;
  const originalFetch = global.fetch;

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
    GameConfig.sceneArt.act2Crossroads = Act2CrossroadsArtConfig;
  });

  afterEach(() => {
    if (scene) {
      scene.unload();
    }
    QuestTriggerRegistry.reset([]);
    GameConfig.sceneArt.act2Crossroads = originalSceneArt;
    global.fetch = originalFetch;
  });

  it('applies placeholder palette overrides from GameConfig', async () => {
    await scene.load();

    const geometryFloors = scene.metadata.geometry?.floors ?? [];
    const selectionPad = geometryFloors.find(
      (segment) => segment.id === 'crossroads_selection_pad'
    );

    expect(selectionPad).toBeDefined();
    expect(selectionPad.color).toBe('#102d44');
    expect(scene.metadata.artSource?.resolved?.floors).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'crossroads_selection_pad' })])
    );
    expect(scene.metadata.artSource?.input).toBe(Act2CrossroadsArtConfig);
  });

  it('loads art manifest when GameConfig references a manifest URL', async () => {
    const manifestUrl = 'https://example.test/assets/act2/crossroads-art.json';
    GameConfig.sceneArt.act2Crossroads = {
      manifestUrl,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        floors: [
          { id: 'crossroads_floor_safehouse', color: '#111111', alpha: 0.7 },
          { id: 'crossroads_selection_pad', color: '#222222', alpha: 0.85 },
        ],
        accents: [
          { id: 'crossroads_selection_conduit', color: '#ffcc33', alpha: 0.5 },
        ],
      }),
    });

    await scene.load();

    expect(global.fetch).toHaveBeenCalledWith(
      manifestUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    const selectionPad = scene.metadata.geometry.floors.find(
      (segment) => segment.id === 'crossroads_selection_pad'
    );
    expect(selectionPad.color).toBe('#222222');

    expect(scene.metadata.artSource).toEqual(
      expect.objectContaining({
        manifestUrl,
      })
    );
    expect(scene.metadata.artSource?.resolved?.floors).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'crossroads_floor_safehouse' })])
    );
  });
});

