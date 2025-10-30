import { Game } from '../../src/game/Game.js';
import { EntityManager } from '../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../src/engine/ecs/ComponentRegistry.js';
import { SystemManager } from '../../src/engine/ecs/SystemManager.js';
import { EventBus } from '../../src/engine/events/EventBus.js';

function createCanvasStub() {
  return {
    width: 800,
    height: 600,
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
    })),
  };
}

function createRendererStub() {
  const camera = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    contains: () => true,
    containsRect: () => true,
    shake: jest.fn(),
  };

  return {
    layeredRenderer: {
      composite: jest.fn(),
      getLayer: jest.fn(() => ({
        markDirty: jest.fn(),
      })),
      markLayerDirty: jest.fn(),
    },
    beginFrame: jest.fn(),
    clear: jest.fn(),
    endFrame: jest.fn(),
    getCamera: () => camera,
    worldToScreen: jest.fn(),
    screenToWorld: jest.fn(),
  };
}

describe('Game TutorialTranscriptRecorder integration', () => {
  let engineStub;
  let game;
  let localStorageMock;

  beforeEach(() => {
    const eventBus = new EventBus();
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    const systemManager = new SystemManager(entityManager, componentRegistry, eventBus);

    engineStub = {
      entityManager,
      componentRegistry,
      systemManager,
      eventBus,
      renderer: createRendererStub(),
      canvas: createCanvasStub(),
      getAudioManager: () => ({
        init: () => Promise.resolve(),
      }),
      audioManager: {
        init: () => Promise.resolve(),
      },
      assetManager: {},
    };

    localStorageMock = {
      store: {},
      getItem: jest.fn((key) => (key in localStorageMock.store ? localStorageMock.store[key] : null)),
      setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
      }),
      clear: jest.fn(() => {
        localStorageMock.store = {};
      }),
    };
    global.localStorage = localStorageMock;

    game = new Game(engineStub);
  });

  afterEach(() => {
    if (game) {
      try {
        game.cleanup();
      } catch (error) {
        // swallow cleanup errors to avoid masking assertions
      }
    }
    game = null;
    delete global.localStorage;
  });

  it('wires and manages the tutorial transcript recorder lifecycle', () => {
    game.initializeGameSystems();
    game.saveManager.config.verifyWorldStateParity = false;

    const recorder = game.tutorialTranscriptRecorder;
    expect(recorder).toBeDefined();
    expect(game.saveManager.tutorialTranscriptRecorder).toBe(recorder);

    engineStub.eventBus.emit('tutorial:started', {
      totalSteps: 3,
      startedAt: 123,
    });

    const transcript = recorder.getTranscript();
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript[0].event).toBe('tutorial_started');

    const initialCount = transcript.length;

    game.cleanup();

    const countAfterCleanup = recorder.getTranscript().length;
    expect(countAfterCleanup).toBe(initialCount);

    engineStub.eventBus.emit('tutorial:step_started', {
      stepId: 'intro',
      title: 'Introduction',
      timestamp: Date.now(),
    });

    expect(recorder.getTranscript().length).toBe(countAfterCleanup);
    game = null;
  });
});
