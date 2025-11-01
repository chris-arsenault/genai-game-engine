import { EventBus } from '../../../src/engine/events/EventBus.js';
import { Act3FinaleCinematicController } from '../../../src/game/narrative/Act3FinaleCinematicController.js';

function createOverlayStub() {
  const overlay = {
    setCallbacks: jest.fn((callbacks) => {
      overlay.callbacks = {
        onAdvance: typeof callbacks?.onAdvance === 'function' ? callbacks.onAdvance : null,
        onSkip: typeof callbacks?.onSkip === 'function' ? callbacks.onSkip : null,
      };
    }),
    setCinematic: jest.fn(),
    setProgress: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    cleanup: jest.fn(),
    callbacks: {
      onAdvance: null,
      onSkip: null,
    },
  };

  return overlay;
}

function buildPayload(overrides = {}) {
  return {
    cinematicId: 'cinematic_test',
    stanceId: 'support',
    stanceTitle: 'Support Ending',
    summary: 'Test summary for finale playback.',
    musicCue: 'ending_theme',
    epilogueBeats: [
      { id: 'beat1', title: 'Beat 1', description: 'First beat' },
      { id: 'beat2', title: 'Beat 2', description: 'Second beat' },
    ],
    ...overrides,
  };
}

describe('Act3FinaleCinematicController', () => {
  let eventBus;
  let overlay;
  let controller;

  beforeEach(() => {
    eventBus = new EventBus();
    overlay = createOverlayStub();
    controller = new Act3FinaleCinematicController({ eventBus, overlay });
  });

  afterEach(() => {
    controller.dispose();
    eventBus = null;
    overlay = null;
    controller = null;
  });

  test('surfaces finale payload and emits adaptive mood requests', () => {
    const begins = [];
    const moods = [];

    eventBus.on('narrative:finale_cinematic_begin', (payload) => begins.push(payload));
    eventBus.on('audio:adaptive:set_mood', (payload) => moods.push(payload));

    controller.init();

    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());

    expect(overlay.setCinematic).toHaveBeenCalledTimes(1);
    expect(overlay.show).toHaveBeenCalledTimes(1);
    expect(begins).toHaveLength(1);
    expect(moods).toHaveLength(1);
    expect(moods[0]).toEqual(
      expect.objectContaining({
        mood: 'ending_theme',
      })
    );
  });

  test('advances beats and completes after final confirmation', () => {
    const beatEvents = [];
    const completions = [];

    eventBus.on('narrative:finale_cinematic_beat_advanced', (payload) => beatEvents.push(payload));
    eventBus.on('narrative:finale_cinematic_completed', (payload) => completions.push(payload));

    controller.init();
    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());

    expect(typeof overlay.callbacks.onAdvance).toBe('function');

    overlay.callbacks.onAdvance({ source: 'jest:first-advance' });
    expect(beatEvents).toHaveLength(2); // initial + first advance
    expect(beatEvents[1].beatIndex).toBe(1);

    overlay.callbacks.onAdvance({ source: 'jest:complete' });

    expect(completions).toHaveLength(1);
    expect(completions[0].beatIndex).toBe(1);
    expect(overlay.hide).toHaveBeenLastCalledWith('finale_complete');
  });

  test('skips finale when cancel input triggered', () => {
    const skips = [];
    eventBus.on('narrative:finale_cinematic_skipped', (payload) => skips.push(payload));

    controller.init();
    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());

    overlay.callbacks.onSkip({ source: 'jest:skip' });

    expect(skips).toHaveLength(1);
    expect(skips[0].reason).toBe('skipped');
    expect(overlay.hide).toHaveBeenLastCalledWith('finale_skip');
  });
});
