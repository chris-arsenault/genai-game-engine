/**
 * Game system registration tests.
 *
 * Verifies that initializeGameSystems wires systems into SystemManager
 * using the new registration API and that single-init semantics are preserved.
 */

import { Game } from '../../src/game/Game.js';
import { EntityManager } from '../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../src/engine/ecs/ComponentRegistry.js';
import { SystemManager } from '../../src/engine/ecs/SystemManager.js';
import { EventBus } from '../../src/engine/events/EventBus.js';

function createCanvasStub() {
  return {
    width: 800,
    height: 600,
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
  const layeredRenderer = {
    composite: jest.fn(),
    getLayer: () => ({
      markDirty: jest.fn(),
    }),
    markLayerDirty: jest.fn(),
  };

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
    layeredRenderer,
    beginFrame: jest.fn(),
    clear: jest.fn(),
    endFrame: jest.fn(),
    getCamera: () => camera,
    worldToScreen: jest.fn(),
    screenToWorld: jest.fn(),
  };
}

describe('Game.initializeGameSystems', () => {
  let engineStub;
  let game;

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

    game = new Game(engineStub);
  });

  afterEach(() => {
    if (game) {
      game.cleanup();
    }
  });

  it('registers each gameplay system with named handles and single init pass', () => {
    game.initializeGameSystems();

    const expectedSystemKeys = [
      'tutorial',
      'playerMovement',
      'navigationConstraint',
      'npcMemory',
      'firewallScrambler',
      'disguise',
      'factionReputation',
      'quest',
      'deduction',
      'investigation',
      'forensic',
      'knowledgeProgression',
      'dialogue',
      'cameraFollow',
      'trigger',
      'render',
    ];

    const registeredNames = engineStub.systemManager.getSystemNames();
    expect(registeredNames.sort()).toEqual(expectedSystemKeys.slice().sort());
    expect(engineStub.systemManager.getSystemCount()).toBe(expectedSystemKeys.length);

    for (const key of expectedSystemKeys) {
      const system = engineStub.systemManager.getSystem(key);
      expect(system).toBe(game.gameSystems[key]);
      expect(system.eventBus).toBe(engineStub.eventBus);
      expect(system.events).toBe(engineStub.eventBus);
    }

    const tutorialSystem = engineStub.systemManager.getSystem('tutorial');
    expect(Array.isArray(tutorialSystem._offEventHandlers)).toBe(true);
    expect(tutorialSystem._offEventHandlers.length).toBeGreaterThan(0);

    const scramblerSystem = engineStub.systemManager.getSystem('firewallScrambler');
    expect(scramblerSystem.priority).toBe(21);
  });
});
