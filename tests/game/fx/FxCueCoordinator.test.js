import { FxCueCoordinator } from '../../../src/game/fx/FxCueCoordinator.js';

describe('FxCueCoordinator', () => {
  let eventBus;
  let listeners;

  beforeEach(() => {
    listeners = {};
    eventBus = {
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
        return jest.fn();
      }),
    };
  });

  it('re-emits composite cues with concurrency metadata when attached', () => {
    const coordinator = new FxCueCoordinator(eventBus);
    coordinator.attach();

    const handler = listeners['fx:overlay_cue'];
    expect(typeof handler).toBe('function');

    handler({
      effectId: 'dialogueStartPulse',
      origin: 'dialogue',
      duration: 0.42,
    });

    expect(eventBus.emit).toHaveBeenCalledWith(
      'fx:composite_cue',
      expect.objectContaining({
        effectId: 'dialogueStartPulse',
        concurrency: expect.objectContaining({
          effect: 1,
          global: 1,
        }),
        coordinator: expect.objectContaining({
          wasDeferred: false,
        }),
      })
    );

    coordinator.detach();
  });

  it('queues cues when capacity exceeded and replays them after update', () => {
    jest.useFakeTimers();

    const coordinator = new FxCueCoordinator(eventBus, {
      maxConcurrentGlobal: 1,
      perEffectLimit: { default: 1 },
      defaultDurations: { dialogueStartPulse: 500, default: 500 },
      queueHoldMs: 1500,
      maxQueueSize: 3,
    });
    coordinator.attach();

    try {
      const handler = listeners['fx:overlay_cue'];
      handler({ effectId: 'dialogueStartPulse', duration: 0.5 });
      expect(eventBus.emit).toHaveBeenCalledTimes(1);

      handler({ effectId: 'dialogueStartPulse', duration: 0.5 });
      expect(eventBus.emit).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(600);
      coordinator.update(0.6);

      expect(eventBus.emit).toHaveBeenCalledTimes(2);
      const replayCall = eventBus.emit.mock.calls[1];
      expect(replayCall[0]).toBe('fx:composite_cue');
      expect(replayCall[1].coordinator.wasDeferred).toBe(true);
    } finally {
      coordinator.detach();
      jest.useRealTimers();
    }
  });

  it('raises a warning when throughput threshold is exceeded', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const coordinator = new FxCueCoordinator(eventBus, {
      throughputWarningThreshold: 2,
      metricsWindowSeconds: 0.05,
      warningCooldownSeconds: 0,
    });
    coordinator.attach();

    try {
      const handler = listeners['fx:overlay_cue'];
      handler({ effectId: 'questMilestonePulse', duration: 0.3 });
      handler({ effectId: 'questMilestonePulse', duration: 0.3 });
      handler({ effectId: 'questMilestonePulse', duration: 0.3 });

      coordinator.update(0.06);

      expect(warnSpy).toHaveBeenCalledWith(
        '[FxCueCoordinator] High FX cue throughput detected:',
        expect.objectContaining({
          perSecond: expect.any(Number),
          queued: expect.any(Number),
          active: expect.any(Number),
        }),
      );
    } finally {
      coordinator.detach();
      warnSpy.mockRestore();
    }
  });

  it('includes tutorial overlay cues in default configuration', () => {
    const coordinator = new FxCueCoordinator(eventBus);

    expect(coordinator.options.defaultDurations.tutorialOverlayReveal).toBeGreaterThan(0);
    expect(coordinator.options.defaultDurations.tutorialOverlayDismiss).toBeGreaterThan(0);
    expect(coordinator.options.defaultDurations.tutorialStepStarted).toBeGreaterThan(0);
    expect(coordinator.options.defaultDurations.tutorialStepCompleted).toBeGreaterThan(0);

    expect(coordinator.options.perEffectLimit.tutorialOverlayReveal).toBe(1);
    expect(coordinator.options.perEffectLimit.tutorialOverlayDismiss).toBe(1);
    expect(coordinator.options.perEffectLimit.tutorialStepCompleted).toBe(1);
  });

  it('includes disguise, prompt, and movement cues in default configuration', () => {
    const coordinator = new FxCueCoordinator(eventBus);
    const { defaultDurations, perEffectLimit } = coordinator.options;

    expect(defaultDurations.disguiseOverlayReveal).toBeGreaterThan(0);
    expect(defaultDurations.disguiseOverlayDismiss).toBeGreaterThan(0);
    expect(defaultDurations.disguiseSelectionFocus).toBeGreaterThan(0);
    expect(defaultDurations.interactionPromptReveal).toBeGreaterThan(0);
    expect(defaultDurations.interactionPromptUpdate).toBeGreaterThan(0);
    expect(defaultDurations.interactionPromptDismiss).toBeGreaterThan(0);
    expect(defaultDurations.movementIndicatorPulse).toBeGreaterThan(0);

    expect(perEffectLimit.disguiseOverlayReveal).toBe(1);
    expect(perEffectLimit.disguiseOverlayDismiss).toBe(1);
    expect(perEffectLimit.disguiseEquipIntent).toBe(1);
    expect(perEffectLimit.disguiseUnequipIntent).toBe(1);
    expect(perEffectLimit.interactionPromptReveal).toBe(1);
    expect(perEffectLimit.interactionPromptDismiss).toBe(1);
  });

  it('includes branch landing, objective list, and quest notification cues in default configuration', () => {
    const coordinator = new FxCueCoordinator(eventBus);
    const { defaultDurations, perEffectLimit } = coordinator.options;

    expect(defaultDurations.crossroadsBranchLandingReveal).toBeGreaterThan(0);
    expect(defaultDurations.crossroadsBranchLandingUpdate).toBeGreaterThan(0);
    expect(defaultDurations.crossroadsBranchLandingDismiss).toBeGreaterThan(0);
    expect(defaultDurations.objectiveListRefresh).toBeGreaterThan(0);
    expect(defaultDurations.objectiveListCompletion).toBeGreaterThan(0);
    expect(defaultDurations.objectiveListScroll).toBeGreaterThan(0);
    expect(defaultDurations.questNotificationDisplay).toBeGreaterThan(0);
    expect(defaultDurations.questNotificationDismiss).toBeGreaterThan(0);
    expect(defaultDurations.questNotificationClear).toBeGreaterThan(0);
    expect(defaultDurations.questNotificationQueued).toBeGreaterThan(0);

    expect(perEffectLimit.crossroadsBranchLandingReveal).toBe(1);
    expect(perEffectLimit.crossroadsBranchLandingDismiss).toBe(1);
    expect(perEffectLimit.questNotificationDisplay).toBe(1);
    expect(perEffectLimit.questNotificationDismiss).toBe(1);
    expect(perEffectLimit.questNotificationClear).toBe(1);
  });
});
