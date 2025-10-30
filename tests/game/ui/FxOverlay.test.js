import { FxOverlay } from '../../../src/game/ui/FxOverlay.js';

describe('FxOverlay', () => {
  let canvas;
  let eventBus;
  let handlers;
  let unbinds;

  beforeEach(() => {
    canvas = {
      width: 1024,
      height: 768,
    };
    handlers = {};
    unbinds = {};
    eventBus = {
      on: jest.fn((eventName, handler) => {
        handlers[eventName] = handlers[eventName] || [];
        handlers[eventName].push(handler);
        const unsubscribe = jest.fn();
        unbinds[eventName] = unbinds[eventName] || [];
        unbinds[eventName].push(unsubscribe);
        return unsubscribe;
      }),
    };
  });

  function getLastHandler(eventName) {
    const list = handlers[eventName] || [];
    expect(list.length).toBeGreaterThan(0);
    return list[list.length - 1];
  }

  function createMockContext() {
    return {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      stroke: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      lineWidth: 0,
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
    };
  }

  it('spawns and expires activation effects in response to cues', () => {
    const overlay = new FxOverlay(canvas, eventBus, {
      activationDuration: 0.3,
    });
    overlay.init();

    getLastHandler('fx:overlay_cue')({
      effectId: 'detectiveVisionActivation',
      duration: 0.2,
    });

    expect(overlay.effects).toHaveLength(1);
    expect(overlay.effects[0].id).toBe('detectiveVisionActivation');

    overlay.update(0.1);
    expect(overlay.effects).toHaveLength(1);

    const ctx = createMockContext();
    overlay.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();

    overlay.update(0.25);
    expect(overlay.effects).toHaveLength(0);
  });

  it('respects cooldown clamping for deactivation cues and cleans up listeners', () => {
    const overlay = new FxOverlay(canvas, eventBus, {
      deactivateDuration: 0.5,
    });
    overlay.init();

    getLastHandler('fx:overlay_cue')({
      effectId: 'detectiveVisionDeactivate',
      cooldown: 2,
    });

    expect(overlay.effects).toHaveLength(1);
    expect(overlay.effects[0].duration).toBeCloseTo(1.0, 2);

    const ctx = createMockContext();
    overlay.render(ctx);
    expect(ctx.strokeRect).toHaveBeenCalled();

    overlay.cleanup();
    const unsubscribers = unbinds['fx:overlay_cue'] || [];
    expect(unsubscribers[0]).toHaveBeenCalled();
    expect(overlay.effects).toHaveLength(0);
  });
});
