import { Game } from '../../src/game/Game.js';
import { EntityManager } from '../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../src/engine/ecs/ComponentRegistry.js';
import { SystemManager } from '../../src/engine/ecs/SystemManager.js';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { Transform } from '../../src/game/components/Transform.js';
import { PlayerController } from '../../src/game/components/PlayerController.js';
import { QuestTriggerRegistry } from '../../src/game/quests/QuestTriggerRegistry.js';
import { seedAct2CrossroadsTriggers } from '../../src/game/data/quests/act2TriggerDefinitions.js';

function createCanvasStub() {
  return {
    width: 1280,
    height: 720,
    getContext: () => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      measureText: () => ({ width: 0 }),
    }),
  };
}

function createRendererStub() {
  const camera = {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    contains: () => true,
    containsRect: () => true,
    shake: jest.fn(),
  };

  return {
    beginFrame: jest.fn(),
    clear: jest.fn(),
    endFrame: jest.fn(),
    getCamera: () => camera,
    worldToScreen: jest.fn(),
    screenToWorld: jest.fn(),
    layeredRenderer: {
      composite: jest.fn(),
      getLayer: () => ({ markDirty: jest.fn() }),
      markLayerDirty: jest.fn(),
    },
  };
}

describe('Game.loadAct2ThreadScene', () => {
  let engineStub;
  let game;
  let eventBus;
  let entityManager;
  let componentRegistry;
  let systemManager;
  let offStart;
  let offReady;
  let offLoaded;

  const transitionStarts = [];
  const transitionReady = [];
  const sceneLoadedEvents = [];

  beforeEach(() => {
    QuestTriggerRegistry.reset();
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    transitionStarts.length = 0;
    transitionReady.length = 0;
    sceneLoadedEvents.length = 0;

    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    systemManager = new SystemManager(entityManager, componentRegistry, eventBus);

    engineStub = {
      entityManager,
      componentRegistry,
      systemManager,
      eventBus,
      renderer: createRendererStub(),
      canvas: createCanvasStub(),
      getAudioManager: () => null,
      audioManager: null,
      assetManager: {},
    };

    game = new Game(engineStub);
    game.initializeGameSystems();
    game.initializeNavigationServices();
    game.initializeNarrativeControllers();

    const playerId = entityManager.createEntity();
    componentRegistry.addComponent(playerId, 'Transform', new Transform(0, 0));
    componentRegistry.addComponent(playerId, 'PlayerController', new PlayerController());
    game.playerEntityId = playerId;

    offStart = eventBus.on('scene:transition:act2_thread:start', (payload) => {
      transitionStarts.push(payload);
    });
    offReady = eventBus.on('scene:transition:act2_thread:ready', (payload) => {
      transitionReady.push(payload);
    });
    offLoaded = eventBus.on('scene:loaded', (payload) => {
      if (payload.reason === 'act2_thread_transition') {
        sceneLoadedEvents.push(payload);
      }
    });
  });

  afterEach(() => {
    offStart?.();
    offReady?.();
    offLoaded?.();
    if (game) {
      game.cleanup();
    }
    QuestTriggerRegistry.reset();
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
  });

  it('loads the NeuroSync thread interior and updates scene metadata', async () => {
    const cameraFollowSpy = jest.spyOn(game.gameSystems.cameraFollow, 'snapTo');

    const sceneId = await game.loadAct2ThreadScene({
      branchId: 'act2_thread_corporate_infiltration',
      originQuestId: 'main-act2-crossroads',
    });

    expect(sceneId).toBe('act2_corporate_interior');
    expect(transitionStarts).toHaveLength(1);
    expect(transitionStarts[0]).toMatchObject({
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-neurosync-infiltration',
      originQuestId: 'main-act2-crossroads',
    });

    expect(transitionReady).toHaveLength(1);
    expect(transitionReady[0]).toMatchObject({
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-neurosync-infiltration',
      originQuestId: 'main-act2-crossroads',
      sceneId: 'act2_corporate_interior',
    });
    expect(transitionReady[0].spawnPoint).toEqual({ x: 220, y: 520 });

    expect(sceneLoadedEvents).toHaveLength(1);
    expect(sceneLoadedEvents[0]).toMatchObject({
      sceneId: 'act2_corporate_interior',
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-neurosync-infiltration',
      originQuestId: 'main-act2-crossroads',
    });
    expect(sceneLoadedEvents[0].navigationMesh).toBeTruthy();

    expect(game.activeScene.id).toBe('act2_corporate_interior');
    expect(game.activeScene.metadata).toMatchObject({
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-neurosync-infiltration',
      originQuestId: 'main-act2-crossroads',
      transitionSource: 'act2_thread',
    });
    expect(game.activeScene.metadata.navigationMesh?.nodes?.length).toBeGreaterThan(0);
    expect(cameraFollowSpy).toHaveBeenCalledWith(220, 520);

    const playerTransform = componentRegistry.getComponent(game.playerEntityId, 'Transform');
    expect(playerTransform.x).toBe(220);
    expect(playerTransform.y).toBe(520);

    const playerController = componentRegistry.getComponent(game.playerEntityId, 'PlayerController');
    expect(playerController.velocityX).toBe(0);
    expect(playerController.velocityY).toBe(0);
  });

  it('falls back to placeholder metadata when no loader is registered', async () => {
    const cameraFollowSpy = jest.spyOn(game.gameSystems.cameraFollow, 'snapTo');

    const sceneId = await game.loadAct2ThreadScene({
      branchId: 'act2_thread_unimplemented',
      originQuestId: 'main-act2-crossroads',
    });

    expect(sceneId).toBe('act2_thread_unimplemented_scene_stub');
    expect(game.activeScene.id).toBe('act2_thread_unimplemented_scene_stub');
    expect(game.activeScene.metadata).toMatchObject({
      branchId: 'act2_thread_unimplemented',
      originQuestId: 'main-act2-crossroads',
      transitionSource: 'act2_thread',
      placeholder: true,
    });
    expect(cameraFollowSpy).not.toHaveBeenCalled();
  });
});
