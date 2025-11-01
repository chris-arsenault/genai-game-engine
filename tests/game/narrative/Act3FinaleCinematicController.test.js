import { EventBus } from '../../../src/engine/events/EventBus.js';
import { Act3FinaleCinematicController } from '../../../src/game/narrative/Act3FinaleCinematicController.js';
import { getFinaleAdaptiveDefinition } from '../../../src/game/audio/finaleAdaptiveMix.js';

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
      shared: {
        assetId: 'shared_asset',
        status: 'ready',
        image: null,
      },
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
    musicCue: 'track-ending-support',
    epilogueBeats: [
      {
        id: 'beat1',
        title: 'Beat 1',
        description: 'First beat',
        voiceover: [
          { speaker: 'Kira', line: 'Hold steady, Zenith.', delivery: 'steady' },
          { line: 'No speaker assigned, just the city listening.' },
        ],
      },
      {
        id: 'beat2',
        title: 'Beat 2',
        description: 'Second beat',
        voiceover: [{ speaker: 'Zara', line: 'Grid diagnostics still green.' }],
      },
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
    const defines = [];

    eventBus.on('narrative:finale_cinematic_begin', (payload) => begins.push(payload));
    eventBus.on('audio:adaptive:set_mood', (payload) => moods.push(payload));
    eventBus.on('audio:adaptive:define_mood', (payload) => defines.push(payload));

    controller.init();

    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());

    expect(overlay.setCinematic).toHaveBeenCalledTimes(1);
    const cinematicPayload = overlay.setCinematic.mock.calls[0][0];
    expect(cinematicPayload.epilogueBeats[0].voiceover[0]).toEqual(
      expect.objectContaining({
        speaker: 'Kira',
        line: 'Hold steady, Zenith.',
      })
    );
    expect(assetManager.prepareAssets).toHaveBeenCalledTimes(1);
    const options = overlay.setCinematic.mock.calls[0][1];
    expect(options.visuals).toBeDefined();
    expect(options.visuals.shared.assetId).toBe('shared_asset');
    expect(options.visuals.hero.assetId).toBe('hero_asset');
    expect(controller.getState().assets.shared.assetId).toBe('shared_asset');
    expect(controller.getState().assets.hero.assetId).toBe('hero_asset');
    expect(overlay.show).toHaveBeenCalledTimes(1);
    expect(begins).toHaveLength(1);
    const statePayload = controller.getState().payload;
    expect(statePayload.epilogueBeats[0].voiceover[1]).toEqual(
      expect.objectContaining({
        speaker: 'narrator_2',
        line: 'No speaker assigned, just the city listening.',
      })
    );

    const finaleDefinition = getFinaleAdaptiveDefinition('track-ending-support');
    expect(defines).toHaveLength(1);
    expect(defines[0]).toEqual(
      expect.objectContaining({
        mood: 'track-ending-support',
        definition: finaleDefinition?.weights,
      })
    );

    expect(moods).toHaveLength(1);
    expect(moods[0]).toEqual(
      expect.objectContaining({
        mood: 'track-ending-support',
      })
    );
    expect(moods[0].options.force).toBe(true);
    expect(moods[0].options.fadeDuration).toBeCloseTo(finaleDefinition?.fadeSeconds ?? 3.5, 5);
    if (finaleDefinition?.durationSeconds) {
      expect(moods[0].options.duration).toBeCloseTo(finaleDefinition.durationSeconds, 5);
      expect(moods[0].options.revertTo).toBe(finaleDefinition.revertTo);
      expect(moods[0].options.revertFadeDuration).toBeCloseTo(
        finaleDefinition.revertFadeSeconds ?? 3.5,
        5
      );
    }
  });

  test('advances beats and completes after final confirmation', () => {
    const beatEvents = [];
    const completions = [];
    const resets = [];

    eventBus.on('narrative:finale_cinematic_beat_advanced', (payload) => beatEvents.push(payload));
    eventBus.on('narrative:finale_cinematic_completed', (payload) => completions.push(payload));
    eventBus.on('audio:adaptive:reset', (payload) => resets.push(payload));

    controller.init();
    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());

    expect(typeof overlay.callbacks.onAdvance).toBe('function');

    overlay.callbacks.onAdvance({ source: 'jest:first-advance' });
    expect(beatEvents).toHaveLength(2); // initial + first advance
    expect(beatEvents[1].beatIndex).toBe(1);

    overlay.callbacks.onAdvance({ source: 'jest:complete' });

    expect(completions).toHaveLength(1);
    expect(resets).toHaveLength(1);
    expect(completions[0].beatIndex).toBe(1);
    expect(overlay.hide).toHaveBeenLastCalledWith('finale_complete');
    expect(resets[0]).toEqual(
      expect.objectContaining({
        mood: 'ambient',
        reason: 'complete',
      })
    );
    const finaleDefinition = getFinaleAdaptiveDefinition('track-ending-support');
    expect(resets[0].fadeDuration).toBeCloseTo(finaleDefinition?.revertFadeSeconds ?? 4.5, 5);
  });

  test('skips finale when cancel input triggered', () => {
    const skips = [];
    const resets = [];
    eventBus.on('narrative:finale_cinematic_skipped', (payload) => skips.push(payload));
    eventBus.on('audio:adaptive:reset', (payload) => resets.push(payload));

    controller.init();
    eventBus.emit('narrative:finale_cinematic_ready', buildPayload());

    overlay.callbacks.onSkip({ source: 'jest:skip' });

    expect(skips).toHaveLength(1);
    expect(skips[0].reason).toBe('skipped');
    expect(overlay.hide).toHaveBeenLastCalledWith('finale_skip');
    expect(resets).toHaveLength(1);
    expect(resets[0]).toEqual(
      expect.objectContaining({
        mood: 'ambient',
        reason: 'skipped',
      })
    );
  });

  test('hydrates saved state to restore visuals and progress', () => {
    const moods = [];
    const resets = [];

    eventBus.on('audio:adaptive:set_mood', (payload) => moods.push(payload));
    eventBus.on('audio:adaptive:reset', (payload) => resets.push(payload));

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
    expect(moods).toHaveLength(2);
    expect(moods[1]).toEqual(
      expect.objectContaining({
        mood: 'track-ending-support',
      })
    );
    expect(resets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'dispose', mood: 'ambient' }),
      ])
    );

    const restoredState = restoredController.getState();
    expect(restoredState.beatIndex).toBe(snapshot.beatIndex);
    expect(restoredState.revealedBeats).toBe(snapshot.revealedBeats);
    expect(restoredState.status).toBe(snapshot.status);
    expect(restoredState.assets.shared).toEqual(
      expect.objectContaining({ assetId: 'shared_asset' })
    );
    expect(restoredState.assets.hero).toEqual(expect.objectContaining({ assetId: 'hero_asset' }));
    restoredController.dispose();
  });
});
