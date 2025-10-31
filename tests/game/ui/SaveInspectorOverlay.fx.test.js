import { SaveInspectorOverlay } from '../../../src/game/ui/SaveInspectorOverlay.js';

function createStubCanvas(width = 1280, height = 720) {
  const ctx = {
    save: jest.fn(),
    restore: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 12 })),
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  };
  return {
    width,
    height,
    getContext: jest.fn(() => ctx),
    _ctx: ctx,
  };
}

describe('SaveInspectorOverlay FX cues', () => {
  it('emits cues on reveal, refresh, and dismissal', () => {
    const canvas = createStubCanvas();
    const emitted = [];
    const eventBus = {
      emit: jest.fn((eventType, payload) => {
        emitted.push({ eventType, payload });
      }),
      on: jest.fn(),
      off: jest.fn(),
    };

    const baseSummary = {
      generatedAt: 1010,
      source: 'unit-test',
      factions: { cascadeTargets: [] },
      tutorial: { snapshots: [] },
      controlBindings: {
        totalEvents: 0,
        durationMs: 0,
        actionsVisited: [],
        actionsRemapped: [],
        listModesVisited: [],
        pageRange: { min: 0, max: 0 },
        lastSelectedAction: null,
        metrics: {},
        captureCancelReasons: {},
        dwell: {},
        ratios: {},
      },
    };

    const updatedSummary = {
      ...baseSummary,
      generatedAt: 2020,
      source: 'unit-test-refresh',
    };

    const saveManager = {
      getInspectorSummary: jest
        .fn()
        .mockReturnValueOnce(baseSummary)
        .mockReturnValueOnce(updatedSummary),
    };

    const overlay = new SaveInspectorOverlay(canvas, eventBus, { saveManager });
    overlay.init();

    overlay.show('fx-test');
    const revealEvent = emitted.find(
      (evt) => evt.eventType === 'fx:overlay_cue' && evt.payload?.effectId === 'saveInspectorOverlayReveal'
    );
    expect(revealEvent).toBeDefined();
    expect(revealEvent.payload.context.source).toBe('fx-test');

    emitted.length = 0;
    overlay.refreshSummary(true);
    const refreshEvent = emitted.find(
      (evt) => evt.eventType === 'fx:overlay_cue' && evt.payload?.effectId === 'saveInspectorOverlayRefresh'
    );
    expect(refreshEvent).toBeDefined();
    expect(refreshEvent.payload.context.generatedAt).toBe(2020);

    emitted.length = 0;
    overlay.hide('fx-hide');
    const dismissEvent = emitted.find(
      (evt) => evt.eventType === 'fx:overlay_cue' && evt.payload?.effectId === 'saveInspectorOverlayDismiss'
    );
    expect(dismissEvent).toBeDefined();
    expect(dismissEvent.payload.context.source).toBe('fx-hide');

    overlay.cleanup();
  });
});
