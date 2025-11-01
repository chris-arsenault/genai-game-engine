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

function createAssetManagerStub() {
  return {
    prepareAssets: jest.fn(() => ({
      hero: {
        assetId: 'hero_asset',
        status: 'ready',
        image: null,
      },
      beats: {
        beat1: {
          assetId: 'beat1_asset',
          status: 'loading',
          image: null,
        },
      },
    })),
  };
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
  let assetManager;
  let controller;

  beforeEach(() => {
    eventBus = new EventBus();
    overlay = createOverlayStub();
    assetManager = createAssetManagerStub();
    controller = new Act3FinaleCinematicController({ eventBus, overlay, assetManager });
  });

  afterEach(() => {
    controller.dispose();
    eventBus = null;
    overlay = null;
    assetManager = null;
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
    expect(assetManager.prepareAssets).toHaveBeenCalledTimes(1);
    const options = overlay.setCinematic.mock.calls[0][1];
    expect(options.visuals).toBeDefined();
    expect(options.visuals.hero.assetId).toBe('hero_asset');
    expect(controller.getState().assets.hero.assetId).toBe('hero_asset');
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

  test('hydrates saved state to restore visuals and progress', () => {
    controller.init();
    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());
    overlay.callbacks.onAdvance({ source: 'jest:advance' });

    const snapshot = controller.getState();
    controller.dispose();

    const restoredOverlay = createOverlayStub();
    const restoredAssetManager = createAssetManagerStub();
    const restoredEvents = [];
    eventBus.on('narrative:finale_cinematic_restored', (payload) => restoredEvents.push(payload));

    const restoredController = new Act3FinaleCinematicController({
      eventBus,
      overlay: restoredOverlay,
      assetManager: restoredAssetManager,
    });
    restoredController.init();

    const hydrateResult = restoredController.hydrate(snapshot);

    expect(hydrateResult).toBe(true);
    expect(restoredAssetManager.prepareAssets).toHaveBeenCalledTimes(1);
    expect(restoredOverlay.setCinematic).toHaveBeenCalledTimes(1);
    expect(restoredOverlay.show).toHaveBeenCalledWith('finale_cinematic_restore');
    expect(restoredEvents).toHaveLength(1);

    const restoredState = restoredController.getState();
    expect(restoredState.beatIndex).toBe(snapshot.beatIndex);
    expect(restoredState.revealedBeats).toBe(snapshot.revealedBeats);
    expect(restoredState.status).toBe(snapshot.status);
    expect(restoredState.assets.hero).toEqual(expect.objectContaining({ assetId: 'hero_asset' }));
    restoredController.dispose();
  });
});
