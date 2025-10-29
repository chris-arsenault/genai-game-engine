import { Game } from '../../../src/game/Game.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

function createMockCanvas() {
  return {
    width: 1280,
    height: 720,
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      lineWidth: 0,
      strokeStyle: '',
      fillStyle: '',
    })),
  };
}

function createEngineStub(eventBus) {
  const canvas = createMockCanvas();
  const rendererStub = {
    getCamera: jest.fn(() => ({
      worldToScreen: jest.fn(() => ({ x: 0, y: 0 })),
      screenToWorld: jest.fn(() => ({ x: 0, y: 0 })),
    })),
    ctx: canvas.getContext(),
  };

  return {
    canvas,
    eventBus,
    entityManager: {},
    componentRegistry: {},
    systemManager: {
      registerSystem: jest.fn(),
      init: jest.fn(),
      update: jest.fn(),
      cleanup: jest.fn(),
    },
    renderer: rendererStub,
    getAudioManager: jest.fn(() => null),
  };
}

describe('Game audio telemetry integration', () => {
  let eventBus;
  let engine;
  let game;

  beforeEach(() => {
    eventBus = new EventBus();
    jest.spyOn(eventBus, 'on');
    engine = createEngineStub(eventBus);
    game = new Game(engine);
    game.audioManager = {
      playSFX: jest.fn(),
      init: jest.fn(() => Promise.resolve(true)),
    };
    game.sfxCatalogLoader = {
      load: jest.fn(() => Promise.resolve({ loaded: 0, failed: 0, results: [] })),
      getCatalog: jest.fn(() => ({ items: [] })),
      getEntry: jest.fn(() => null),
    };
  });

  afterEach(() => {
    if (game) {
      game.cleanup();
      game = null;
    }
  });

  it('records adaptive music state transitions emitted on the event bus', async () => {
    await game.initializeAudioIntegrations();

    expect(eventBus.on).toHaveBeenCalledWith(
      'audio:adaptive:state_changed',
      expect.any(Function)
    );

    eventBus.emit('audio:adaptive:state_changed', {
      from: 'ambient',
      to: 'alert',
      timestamp: 12345,
    });

    const telemetry = game.getAdaptiveAudioTelemetry();
    expect(telemetry.currentState).toBe('alert');
    expect(telemetry.history).toHaveLength(1);
    expect(telemetry.history[0]).toEqual(
      expect.objectContaining({ from: 'ambient', to: 'alert', timestamp: 12345 })
    );

    // Emits another event to ensure history trims appropriately
    eventBus.emit('audio:adaptive:state_changed', {
      from: 'alert',
      to: 'combat',
      timestamp: 22345,
    });

    const updated = game.getAdaptiveAudioTelemetry();
    expect(updated.currentState).toBe('combat');
    expect(updated.history).toHaveLength(2);
    expect(updated.history[1].to).toBe('combat');
  });

  it('keeps telemetry history bounded under rapid state churn', async () => {
    await game.initializeAudioIntegrations();

    const baseTimestamp = Date.now();
    const states = ['ambient', 'alert', 'stealth', 'combat'];
    for (let i = 0; i < 24; i++) {
      const from = states[i % states.length];
      const to = states[(i + 1) % states.length];
      eventBus.emit('audio:adaptive:state_changed', {
        from,
        to,
        timestamp: baseTimestamp + i * 10,
      });
    }

    const telemetry = game.getAdaptiveAudioTelemetry();
    expect(telemetry.history.length).toBeLessThanOrEqual(8);
    expect(telemetry.currentState).toBe('ambient'); // wraps every 4 iterations

    const historyTimestamps = telemetry.history.map((entry) => entry.timestamp);
    for (let i = 1; i < historyTimestamps.length; i++) {
      expect(historyTimestamps[i]).toBeGreaterThanOrEqual(historyTimestamps[i - 1]);
    }
  });

  it('routes adaptive mood requests through the orchestrator and event bus', () => {
    const adaptiveStub = {
      init: jest.fn(() => Promise.resolve(true)),
      setMood: jest.fn((mood) => {
        adaptiveStub.currentMood = mood;
        return true;
      }),
      defineMood: jest.fn(),
      update: jest.fn(),
      dispose: jest.fn(),
      currentMood: 'ambient',
      defaultMood: 'ambient'
    };

    game._registerAdaptiveMusic(adaptiveStub, { skipInit: true });
    game._ensureAdaptiveMoodHandlers();

    expect(game.setAdaptiveMood('stealth')).toBe(true);
    expect(adaptiveStub.setMood).toHaveBeenCalledWith('stealth', {});

    eventBus.emit('audio:adaptive:set_mood', {
      mood: 'alert',
      options: { duration: 2, revertTo: 'ambient' }
    });

    expect(adaptiveStub.setMood).toHaveBeenCalledWith('alert', { duration: 2, revertTo: 'ambient' });

    eventBus.emit('audio:adaptive:define_mood', {
      mood: 'tension',
      definition: { ambient_base: 0.5, tension_layer: 0.8 }
    });
    expect(adaptiveStub.defineMood).toHaveBeenCalledWith('tension', { ambient_base: 0.5, tension_layer: 0.8 });

    game.loaded = true;
    game.update(0.5);
    expect(adaptiveStub.update).toHaveBeenCalledWith(0.5);

    eventBus.emit('audio:adaptive:reset', { mood: 'ambient', fadeDuration: 1.2 });
    expect(adaptiveStub.setMood).toHaveBeenCalledWith(
      'ambient',
      expect.objectContaining({ fadeDuration: 1.2 })
    );
  });
});
