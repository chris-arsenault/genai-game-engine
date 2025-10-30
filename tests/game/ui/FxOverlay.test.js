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
      fill: jest.fn(),
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
      moveTo: jest.fn(),
      lineTo: jest.fn(),
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

  it('handles quest milestone and completion cues with distinct renderers', () => {
    const overlay = new FxOverlay(canvas, eventBus, {
      questPulseDuration: 0.3,
      questCompleteDuration: 0.4,
    });
    overlay.init();

    const handler = getLastHandler('fx:overlay_cue');

    handler({ effectId: 'questMilestonePulse', duration: 0.35 });
    expect(overlay.effects).toHaveLength(1);
    expect(overlay.effects[0].id).toBe('questMilestonePulse');

    const ctxPulse = createMockContext();
    overlay.render(ctxPulse);
    expect(ctxPulse.moveTo).toHaveBeenCalled();

    overlay.update(0.4);
    expect(overlay.effects).toHaveLength(0);

    handler({ effectId: 'questCompleteBurst', duration: 0.5 });
    expect(overlay.effects).toHaveLength(1);
    expect(overlay.effects[0].id).toBe('questCompleteBurst');

    const ctxBurst = createMockContext();
    overlay.render(ctxBurst);
    expect(ctxBurst.stroke).toHaveBeenCalled();
  });

  it('renders forensic pulse and reveal cues', () => {
    const overlay = new FxOverlay(canvas, eventBus, {
      forensicPulseDuration: 0.3,
      forensicRevealDuration: 0.4,
    });
    overlay.init();

    const handler = getLastHandler('fx:overlay_cue');

    handler({ effectId: 'forensicPulse', duration: 0.32 });
    expect(overlay.effects[0].id).toBe('forensicPulse');

    const ctxPulse = createMockContext();
    overlay.render(ctxPulse);
    expect(ctxPulse.fill).toHaveBeenCalled();

    overlay.update(0.5);

    handler({ effectId: 'forensicRevealFlash', duration: 0.45 });
    expect(overlay.effects[0].id).toBe('forensicRevealFlash');

    const ctxReveal = createMockContext();
    overlay.render(ctxReveal);
    expect(ctxReveal.fillRect).toHaveBeenCalled();
  });

  it('handles dialogue and case cue renders without throwing', () => {
    const overlay = new FxOverlay(canvas, eventBus, {});
    overlay.init();

    const handler = getLastHandler('fx:overlay_cue');

    handler({ effectId: 'dialogueStartPulse', duration: 0.4 });
    const startCtx = createMockContext();
    overlay.render(startCtx);
    expect(startCtx.fillRect).toHaveBeenCalled();
    overlay.update(0.5);

    handler({ effectId: 'dialogueChoicePulse', duration: 0.35 });
    const choiceCtx = createMockContext();
    overlay.render(choiceCtx);
    expect(choiceCtx.arc).toHaveBeenCalled();
    overlay.update(0.4);

    handler({ effectId: 'dialogueCompleteBurst', duration: 0.6 });
    const completeCtx = createMockContext();
    overlay.render(completeCtx);
    expect(completeCtx.fillRect).toHaveBeenCalled();
    overlay.update(0.7);

    handler({ effectId: 'caseEvidencePulse', duration: 0.45 });
    const evidenceCtx = createMockContext();
    overlay.render(evidenceCtx);
    expect(evidenceCtx.arc).toHaveBeenCalled();
    overlay.update(0.5);

    handler({ effectId: 'caseSolvedBurst', duration: 0.8 });
    const solvedCtx = createMockContext();
    overlay.render(solvedCtx);
    expect(solvedCtx.fillRect).toHaveBeenCalled();
  });
});
