import { Game } from '../../../src/game/Game.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { SystemManager } from '../../../src/engine/ecs/SystemManager.js';
import { createPlayerEntity } from '../../../src/game/entities/PlayerEntity.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';

function createCanvasStub() {
  return {
    width: 1280,
    height: 720,
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
  const layeredRenderer = {
    composite: jest.fn(),
    getLayer: jest.fn(() => ({ markDirty: jest.fn() })),
    markLayerDirty: jest.fn(),
  };

  const camera = {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    snapTo: jest.fn(),
    worldToScreen: jest.fn(() => ({ x: 0, y: 0 })),
    screenToWorld: jest.fn(() => ({ x: 0, y: 0 })),
  };

  return {
    layeredRenderer,
    beginFrame: jest.fn(),
    clear: jest.fn(),
    endFrame: jest.fn(),
    getCamera: jest.fn(() => camera),
    worldToScreen: jest.fn(() => ({ x: 0, y: 0 })),
    screenToWorld: jest.fn(() => ({ x: 0, y: 0 })),
  };
}

describe('Gameplay adaptive audio bridge integration', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let systemManager;
  let engine;
  let game;
  let originalBridgeConfig;
  let originalEnableEmitters;

  beforeEach(() => {
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    systemManager = new SystemManager(entityManager, componentRegistry, eventBus);

    const renderer = createRendererStub();
    const canvas = createCanvasStub();

    engine = {
      eventBus,
      entityManager,
      componentRegistry,
      systemManager,
      renderer,
      canvas,
      getAudioManager: () => ({
        playSFX: jest.fn(),
        init: jest.fn(() => Promise.resolve(true)),
      }),
      audioManager: {
        playSFX: jest.fn(),
        init: jest.fn(() => Promise.resolve(true)),
      },
    };

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

    originalBridgeConfig = { ...GameConfig.audio.gameplayMoodBridge };
    originalEnableEmitters = GameConfig.audio.enableGameplayEmitters;
    GameConfig.audio.enableGameplayEmitters = true;
    GameConfig.audio.gameplayMoodBridge.updateIntervalMs = 0;
  });

  afterEach(() => {
    GameConfig.audio.gameplayMoodBridge.updateIntervalMs = originalBridgeConfig.updateIntervalMs;
    GameConfig.audio.gameplayMoodBridge.moodHintDurationMs = originalBridgeConfig.moodHintDurationMs;
    GameConfig.audio.enableGameplayEmitters = originalEnableEmitters;

    if (game) {
      game.cleanup();
    }
  });

  it('emits adaptive mood transitions when gameplay systems fire events', async () => {
    game.initializeGameSystems();
    await game.initializeAudioIntegrations();

    game.loaded = true;

    const adaptiveStub = {
      init: jest.fn(() => Promise.resolve(true)),
      setMood: jest.fn(() => true),
      defineMood: jest.fn(),
      update: jest.fn(),
      dispose: jest.fn(),
      currentMood: 'ambient',
      defaultMood: 'ambient',
    };
    game._registerAdaptiveMusic(adaptiveStub, { skipInit: true });
    game._ensureAdaptiveMoodHandlers();

    const playerId = createPlayerEntity(entityManager, componentRegistry, 0, 0);
    const disguise = componentRegistry.getComponent(playerId, 'Disguise');
    const factionMember = componentRegistry.getComponent(playerId, 'FactionMember');
    disguise.factionId = 'vanguard_prime';
    disguise.equip();
    factionMember.equipDisguise('vanguard_prime');
    game.playerEntityId = playerId;

    game.gameplayAdaptiveAudioBridge.setMoodEmitter(game.adaptiveMoodEmitter);
    game.adaptiveMoodEmitter.debounceMs = 0;

    const moodHistory = [];
    const telemetryHistory = [];

    const offMood = eventBus.on('audio:adaptive:set_mood', (payload) => {
      moodHistory.push(payload);
    });
    const offTelemetry = eventBus.on('audio:adaptive:emitter_event', (payload) => {
      telemetryHistory.push(payload);
    });

    game.update(0.016);
    moodHistory.length = 0;
    telemetryHistory.length = 0;

    const scramblerSystem = game.gameSystems.firewallScrambler;
    scramblerSystem.state.hasAccess = true;
    scramblerSystem.state.charges = 1;

    eventBus.emit('firewall:scrambler:activate', {
      source: 'integration-test',
      areaId: 'memory_parlor_interior',
      force: true,
    });

    game.update(0.016);

    eventBus.emit('player:combat');
    game.gameSystems.disguise.update(0.016);
    game.update(0.016);

    disguise.addSuspicion(80);
    game.gameSystems.disguise.blowDisguise(playerId, factionMember, disguise);
    game.update(0.016);

    offMood();
    offTelemetry();

    expect(moodHistory.map((entry) => entry.mood)).toEqual([
      'stealth',
      'alert',
      'combat',
    ]);

    expect(telemetryHistory).toHaveLength(3);
    expect(telemetryHistory[0]).toEqual(
      expect.objectContaining({
        mood: 'stealth',
        options: expect.objectContaining({
          metadata: expect.objectContaining({
            scramblerActive: true,
          }),
        }),
      })
    );
    expect(telemetryHistory[1]).toEqual(
      expect.objectContaining({
        mood: 'alert',
        options: expect.objectContaining({
          metadata: expect.objectContaining({
            suspicion: expect.any(Number),
          }),
        }),
      })
    );
    expect(telemetryHistory[1].options.metadata.suspicion).toBeGreaterThanOrEqual(25);
    expect(telemetryHistory[2]).toEqual(
      expect.objectContaining({
        mood: 'combat',
        options: expect.objectContaining({
          metadata: expect.objectContaining({
            combatEngaged: true,
          }),
        }),
      })
    );
  });
});
