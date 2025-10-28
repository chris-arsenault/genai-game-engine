import { Game } from '../../src/game/Game.js';
import { EventBus } from '../../src/engine/events/EventBus.js';

describe('Game frame hook integration', () => {
  let registeredUpdate;
  let registeredOverlay;
  let detachMock;

  beforeEach(() => {
    registeredUpdate = null;
    registeredOverlay = null;
    detachMock = jest.fn(() => {
      registeredUpdate = null;
      registeredOverlay = null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createEngineStub() {
    const ctx = {};
    const canvas = {
      width: 800,
      height: 600,
      getContext: jest.fn(() => ctx),
    };
    const renderer = {
      getCamera: jest.fn(() => ({})),
      layeredRenderer: {},
      ctx,
    };

    const eventBus = new EventBus();

    const setFrameHooks = jest.fn(({ onUpdate, onRenderOverlay }) => {
      registeredUpdate = onUpdate;
      registeredOverlay = onRenderOverlay;
      return detachMock;
    });

    return {
      canvas,
      eventBus,
      entityManager: {},
      componentRegistry: {},
      systemManager: {},
      renderer,
      getAudioManager: jest.fn(() => null),
      setFrameHooks,
    };
  }

  it('registers engine frame hooks during init and removes them on cleanup', async () => {
    const engineStub = createEngineStub();
    const game = new Game(engineStub);

    jest.spyOn(game, 'initializeGameSystems').mockImplementation(() => {});
    jest.spyOn(game, 'initializeUIOverlays').mockImplementation(() => {});
    jest.spyOn(game, 'initializeAudioIntegrations').mockImplementation(() => {});
    jest.spyOn(game, 'loadAct1Scene').mockResolvedValue();

    const updateSpy = jest.spyOn(game, 'update').mockImplementation(() => {});
    const overlaySpy = jest.spyOn(game, 'renderOverlays').mockImplementation(() => {});

    await game.init();

    expect(engineStub.setFrameHooks).toHaveBeenCalledWith({
      onUpdate: expect.any(Function),
      onRenderOverlay: expect.any(Function),
    });

    expect(typeof registeredUpdate).toBe('function');
    expect(typeof registeredOverlay).toBe('function');

    const metrics = { deltaTime: 0.016 };
    registeredUpdate(0.016, metrics);
    expect(updateSpy).toHaveBeenCalledWith(0.016);

    const overlayCtx = {};
    registeredOverlay(overlayCtx, metrics);
    expect(overlaySpy).toHaveBeenCalledWith(overlayCtx);

    game.cleanup();
    expect(detachMock).toHaveBeenCalled();
    expect(registeredUpdate).toBeNull();
    expect(registeredOverlay).toBeNull();
  });
});
