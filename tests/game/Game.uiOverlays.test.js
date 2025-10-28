import { Game } from '../../src/game/Game.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { EventBus } from '../../src/engine/events/EventBus.js';

function createMockCanvas() {
  const ctx = {
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 8 || 8 })),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    clearRect: jest.fn(),
    globalAlpha: 1,
    font: '',
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
  };

  return {
    width: 1024,
    height: 768,
    getContext: jest.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('Game UI overlays', () => {
  let game;
  let engineStub;
  let eventBus;
  let canvas;
  let worldStateStore;

  beforeEach(() => {
    canvas = createMockCanvas();
    eventBus = new EventBus();
    jest.spyOn(eventBus, 'emit');

    const rendererStub = {
      getCamera: jest.fn(() => ({
        worldToScreen: jest.fn(() => ({ x: 0, y: 0 })),
        containsRect: jest.fn(() => true),
      })),
      layeredRenderer: {
        composite: jest.fn(),
      },
      ctx: canvas.getContext(),
    };

    engineStub = {
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
    };

    game = new Game(engineStub);
  });

  afterEach(() => {
    if (game) {
      game.cleanup();
    }
    game = null;
  });

  it('hooks DialogueBox to world state store updates and forwards input events', () => {
    worldStateStore = new WorldStateStore(eventBus);
    worldStateStore.init();

    game.worldStateStore = worldStateStore;
    game.initializeUIOverlays();

    expect(game.dialogueBox).toBeDefined();
    expect(game.dialogueBox.visible).toBe(false);

    worldStateStore.dispatch({
      type: 'DIALOGUE_STARTED',
      domain: 'dialogue',
      payload: {
        npcId: 'npc_1',
        dialogueId: 'dlg_intro',
        nodeId: 'node_start',
        speaker: 'Guide',
        text: 'Welcome to the Memory Syndicate.',
        choices: [],
        canAdvance: true,
        hasChoices: false,
        startedAt: 100,
        updatedAt: 100,
      },
    });

    expect(game.dialogueBox.visible).toBe(true);

    // Finish typewriter effect to allow advance input
    game.dialogueBox.skipTypewriter();
    game.dialogueBox.canAdvance = true;

    const advanceEvent = new KeyboardEvent('keydown', { code: 'Enter' });
    window.dispatchEvent(advanceEvent);

    expect(eventBus.emit).toHaveBeenCalledWith('dialogue:advance_requested', {});

    game.cleanup();
    game = null;
  });

  it('toggles overlays once per key press', () => {
    game.worldStateStore = new WorldStateStore(eventBus);
    game.worldStateStore.init();
    game.initializeUIOverlays();
    game.loaded = true;

    expect(game.disguiseUI.visible).toBe(false);
    expect(game.questLogUI.visible).toBe(false);

    const disguiseKeyDown = { code: 'KeyG', preventDefault: jest.fn() };
    game.inputState.handleKeyDown(disguiseKeyDown);
    game.update(0.016);
    expect(game.disguiseUI.visible).toBe(true);

    // Still held - should remain visible (no retrigger)
    game.update(0.016);
    expect(game.disguiseUI.visible).toBe(true);

    game.inputState.handleKeyUp({ code: 'KeyG' });

    // Toggle off on second press
    game.inputState.handleKeyDown({ code: 'KeyG', preventDefault: jest.fn() });
    game.update(0.016);
    expect(game.disguiseUI.visible).toBe(false);

    // Quest log toggles similarly
    const questKeyDown = { code: 'KeyQ', preventDefault: jest.fn() };
    game.inputState.handleKeyDown(questKeyDown);
    game.update(0.016);
    expect(game.questLogUI.visible).toBe(true);

    // Subsequent updates without release do not toggle off
    game.update(0.016);
    expect(game.questLogUI.visible).toBe(true);
  });
});
