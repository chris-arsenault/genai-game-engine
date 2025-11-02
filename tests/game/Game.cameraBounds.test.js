jest.mock('../../src/game/scenes/Act1Scene.js', () => ({
  loadAct1Scene: jest.fn(),
}));

import { Game } from '../../src/game/Game.js';
import { loadAct1Scene } from '../../src/game/scenes/Act1Scene.js';
import { EventBus } from '../../src/engine/events/EventBus.js';

describe('Game camera bounds integration', () => {
  function createEngineStub() {
    const camera = {
      width: 800,
      height: 600,
      setBounds: jest.fn(),
      clearBounds: jest.fn(),
    };

    return {
      entityManager: {},
      componentRegistry: {
        getComponent: jest.fn(),
      },
      systemManager: {},
      renderer: {
        getCamera: jest.fn(() => camera),
      },
      eventBus: new EventBus(),
      setFrameHooks: undefined,
    };
  }

  function createGame() {
    const engineStub = createEngineStub();
    const game = new Game(engineStub);

    game.gameSystems.cameraFollow = {
      snapTo: jest.fn(),
    };
    game.subscribeToGameEvents = jest.fn();
    game.startGame = jest.fn();
    game.componentRegistry.getComponent = jest.fn();

    return { game, engineStub };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies camera bounds from scene metadata during load', async () => {
    const { game } = createGame();
    const playerId = 42;
    const transform = { x: 0, y: 0 };
    const controller = { velocityX: 0, velocityY: 0 };

    game.componentRegistry.getComponent.mockImplementation((entityId, component) => {
      if (entityId === playerId && component === 'Transform') {
        return transform;
      }
      if (entityId === playerId && component === 'PlayerController') {
        return controller;
      }
      return null;
    });

    loadAct1Scene.mockResolvedValueOnce({
      playerId,
      sceneEntities: [],
      sceneName: 'act1_hollow_case',
      spawnPoint: { x: 150, y: 300 },
      metadata: {
        cameraBounds: {
          x: 10,
          y: 20,
          width: 900,
          height: 700,
        },
      },
    });

    await game.loadAct1Scene();

    expect(game.camera.setBounds).toHaveBeenCalledWith(10, 20, 900, 700);
    expect(game.camera.clearBounds).not.toHaveBeenCalled();
  });

  it('clears camera bounds when metadata omits cameraBounds', async () => {
    const { game } = createGame();
    const playerId = 99;
    const transform = { x: 0, y: 0 };
    const controller = { velocityX: 0, velocityY: 0 };

    game.componentRegistry.getComponent.mockImplementation((entityId, component) => {
      if (entityId === playerId && component === 'Transform') {
        return transform;
      }
      if (entityId === playerId && component === 'PlayerController') {
        return controller;
      }
      return null;
    });

    loadAct1Scene.mockResolvedValueOnce({
      playerId,
      sceneEntities: [],
      sceneName: 'act1_hollow_case',
      spawnPoint: { x: 200, y: 400 },
      metadata: {},
    });

    await game.loadAct1Scene();

    expect(game.camera.clearBounds).toHaveBeenCalled();
    expect(game.camera.setBounds).not.toHaveBeenCalled();
  });
});
