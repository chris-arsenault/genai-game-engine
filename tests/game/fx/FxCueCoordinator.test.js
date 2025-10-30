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
});
