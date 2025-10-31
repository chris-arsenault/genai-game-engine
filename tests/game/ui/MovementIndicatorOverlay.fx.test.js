import { MovementIndicatorOverlay } from '../../../src/game/ui/MovementIndicatorOverlay.js';

describe('MovementIndicatorOverlay FX cues', () => {
  let eventBus;
  let overlay;
  let listeners;
  let now;
  let nowSpy;

  beforeEach(() => {
    listeners = {};
    eventBus = {
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
        return jest.fn();
      }),
    };

    now = 10_000;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    overlay = new MovementIndicatorOverlay(
      { width: 1280, height: 720 },
      eventBus,
      {
        worldToScreen: () => ({ x: 640, y: 360 }),
      },
      { fxThrottleMs: 100 },
    );
    overlay.init();
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('emits movement pulse for player:moving events', () => {
    listeners['player:moving']({
      position: { x: 12, y: 18 },
      direction: { x: 1, y: 0 },
      speed: 2.5,
    });

    const fxCalls = eventBus.emit.mock.calls.filter(([event]) => event === 'fx:overlay_cue');
    expect(fxCalls).toHaveLength(1);
    expect(fxCalls[0][1]).toMatchObject({
      effectId: 'movementIndicatorPulse',
      context: expect.objectContaining({
        source: 'player:moving',
        hasDirection: true,
        speed: 2.5,
      }),
    });
  });

  it('throttles repeated emissions within the configured window', () => {
    listeners['player:moving']({
      position: { x: 12, y: 18 },
      direction: { x: 1, y: 0 },
    });
    expect(eventBus.emit).toHaveBeenCalledTimes(1);

    now += 50;
    listeners['player:moving']({
      position: { x: 14, y: 20 },
      direction: { x: 1, y: 0 },
    });
    expect(eventBus.emit).toHaveBeenCalledTimes(1);

    now += 120;
    listeners['player:moving']({
      position: { x: 18, y: 24 },
      direction: { x: 0, y: 1 },
    });
    expect(eventBus.emit).toHaveBeenCalledTimes(2);
    const [, payload] = eventBus.emit.mock.calls[eventBus.emit.mock.calls.length - 1];
    expect(payload.context.hasDirection).toBe(true);
  });
});
