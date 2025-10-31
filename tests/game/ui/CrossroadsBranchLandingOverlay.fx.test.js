import { CrossroadsBranchLandingOverlay } from '../../../src/game/ui/CrossroadsBranchLandingOverlay.js';

describe('CrossroadsBranchLandingOverlay FX cues', () => {
  let eventBus;
  let handlers;
  let overlay;

  beforeEach(() => {
    handlers = {};
    eventBus = {
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
        return jest.fn();
      }),
    };

    overlay = new CrossroadsBranchLandingOverlay(
      { width: 1280, height: 720 },
      eventBus,
      { displayTime: 1.5 }
    );
    overlay.init();
  });

  function emit(eventName, payload) {
    const handler = handlers[eventName];
    if (typeof handler === 'function') {
      handler(payload);
    } else {
      throw new Error(`handler for ${eventName} not registered`);
    }
  }

  function getFxPayloads() {
    return eventBus.emit.mock.calls
      .filter(([event]) => event === 'fx:overlay_cue')
      .map(([, payload]) => payload);
  }

  it('emits reveal cue when branch landing is shown', () => {
    emit('crossroads:branch_landing_ready', {
      branchId: 'act2-spires',
      branchTitle: 'Corporate Spires',
      summary: 'Corporate intrigue and rooftop extractions await.',
      instructions: 'Reach the checkpoint to launch the operation.',
    });

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'crossroadsBranchLandingReveal',
      branchId: 'act2-spires',
      context: expect.objectContaining({
        branchTitle: 'Corporate Spires',
        summaryLength: expect.any(Number),
        instructionsLength: expect.any(Number),
        reason: 'ready',
      }),
    });
  });

  it('emits update cue when a new payload arrives while active', () => {
    emit('crossroads:branch_landing_ready', { branchId: 'act2-spires' });
    eventBus.emit.mockClear();

    emit('crossroads:branch_landing_ready', {
      branchId: 'act2-archives',
      branchTitle: 'Archive Undercity',
      summary: 'Vault dives and echo readers.',
    });

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'crossroadsBranchLandingUpdate',
      branchId: 'act2-archives',
      context: expect.objectContaining({
        branchTitle: 'Archive Undercity',
        reason: 'update',
      }),
    });
  });

  it('emits dismiss cue when cleared explicitly', () => {
    emit('crossroads:branch_landing_ready', {
      branchId: 'act2-spires',
      branchTitle: 'Corporate Spires',
    });
    eventBus.emit.mockClear();

    emit('crossroads:branch_landing_clear', { reason: 'playerCancelled' });

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'crossroadsBranchLandingDismiss',
      context: expect.objectContaining({
        reason: 'manual',
        clearReason: 'playerCancelled',
        branchTitle: 'Corporate Spires',
      }),
    });
  });

  it('emits dismiss cue when overlay expires naturally', () => {
    emit('crossroads:branch_landing_ready', { branchId: 'act2-spires' });
    eventBus.emit.mockClear();

    // expire via update
    overlay.update(2);

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'crossroadsBranchLandingDismiss',
      context: expect.objectContaining({
        reason: 'expired',
        branchId: 'act2-spires',
      }),
    });
  });
});
