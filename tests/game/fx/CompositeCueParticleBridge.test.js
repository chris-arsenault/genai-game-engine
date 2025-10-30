import { CompositeCueParticleBridge } from '../../../src/game/fx/CompositeCueParticleBridge.js';

describe('CompositeCueParticleBridge', () => {
  let eventBus;
  let listeners;
  let now;
  let unsubscribeMock;

  beforeEach(() => {
    now = 1000;
    listeners = {};
    unsubscribeMock = jest.fn();
    eventBus = {
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
        return unsubscribeMock;
      }),
    };
  });

  function createBridge(options = {}) {
    return new CompositeCueParticleBridge(eventBus, {
      getNow: () => now,
      ...options,
    });
  }

  it('maps composite cues to particle descriptors with metadata', () => {
    const bridge = createBridge();
    bridge.attach();

    const handler = listeners['fx:composite_cue'];
    expect(typeof handler).toBe('function');

    handler({
      effectId: 'dialogueStartPulse',
      origin: 'dialogue_system',
      coordinator: { durationMs: 640, wasDeferred: false },
      concurrency: { effect: 1, global: 1, queued: 0 },
      context: { dialogueId: 'intro' },
    });

    expect(eventBus.emit).toHaveBeenCalledTimes(1);
    const [, descriptor] = eventBus.emit.mock.calls[0];
    expect(descriptor).toMatchObject({
      effectId: 'dialogueStartPulse',
      preset: 'dialogue-ripple',
      spawnCount: 12,
      durationMs: 640,
      metadata: {
        source: 'dialogue_system',
        concurrency: { effect: 1, global: 1, queued: 0 },
        context: { dialogueId: 'intro' },
      },
    });
    expect(descriptor.intensity).toBeCloseTo(0.55, 5);
  });

  it('applies cooldown per effect to avoid emitter spam', () => {
    const bridge = createBridge();
    bridge.attach();

    const handler = listeners['fx:composite_cue'];

    handler({ effectId: 'questMilestonePulse', coordinator: { durationMs: 800 } });
    expect(eventBus.emit).toHaveBeenCalledTimes(1);

    handler({ effectId: 'questMilestonePulse', coordinator: { durationMs: 800 } });
    expect(eventBus.emit).toHaveBeenCalledTimes(1);

    now += 200; // exceed cooldown of 160 ms
    handler({ effectId: 'questMilestonePulse', coordinator: { durationMs: 800 } });
    expect(eventBus.emit).toHaveBeenCalledTimes(2);
  });

  it('skips crowd-sensitive cues when global concurrency is high', () => {
    const bridge = createBridge();
    bridge.attach();

    const handler = listeners['fx:composite_cue'];

    handler({
      effectId: 'caseSolvedBurst',
      concurrency: { global: 3 },
      coordinator: { durationMs: 1000 },
    });

    expect(eventBus.emit).not.toHaveBeenCalled();

    handler({
      effectId: 'caseSolvedBurst',
      concurrency: { global: 1 },
      coordinator: { durationMs: 1000 },
    });

    expect(eventBus.emit).toHaveBeenCalledWith(
      'fx:particle_emit',
      expect.objectContaining({ preset: 'case-solved-radiance' })
    );
  });

  it('detaches cleanly and clears internal emission cache', () => {
    const bridge = createBridge();
    bridge.attach();

    let handler = listeners['fx:composite_cue'];
    handler({ effectId: 'forensicPulse' });
    expect(eventBus.emit).toHaveBeenCalledTimes(1);

    bridge.detach();
    expect(unsubscribeMock).toHaveBeenCalled();

    // simulate reattach without advancing time to ensure cooldown cache cleared
    unsubscribeMock = jest.fn();
    eventBus.emit.mockClear();
    bridge.attach();
    handler = listeners['fx:composite_cue'];
    handler({ effectId: 'forensicPulse' });

    expect(eventBus.emit).toHaveBeenCalledTimes(1);
  });
});
