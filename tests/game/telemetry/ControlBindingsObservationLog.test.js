import { ControlBindingsObservationLog } from '../../../src/game/telemetry/ControlBindingsObservationLog.js';

function baseEvent(overrides = {}) {
  return {
    event: 'selection_move',
    timestamp: Date.now(),
    overlayId: 'controlBindings',
    visible: true,
    capturing: false,
    manualOverride: false,
    listMode: 'sections',
    listModeLabel: 'By Category',
    pageIndex: 0,
    pageCount: 2,
    selectedIndex: 0,
    selectedAction: 'moveUp',
    ...overrides,
  };
}

describe('ControlBindingsObservationLog', () => {
  it('aggregates metrics and qualitative signals', () => {
    const log = new ControlBindingsObservationLog();

    log.record(baseEvent({
      event: 'selection_move',
      changed: true,
      previousIndex: 0,
      nextIndex: 1,
      previousAction: 'moveUp',
      nextAction: 'moveDown',
    }));

    log.record(baseEvent({
      event: 'selection_move',
      changed: false,
    }));

    log.record(baseEvent({
      event: 'list_mode_change',
      changed: true,
      listMode: 'alphabetical',
      listModeLabel: 'Alphabetical',
    }));

    log.record(baseEvent({
      event: 'page_navigate',
      changed: false,
      direction: 1,
      manualOverride: true,
    }));

    log.record(baseEvent({
      event: 'binding_applied',
      action: 'interact',
      codes: ['KeyE'],
      metadata: { code: 'KeyE' },
    }));

    log.record(baseEvent({
      event: 'capture_cancelled',
      source: 'input:cancel',
    }));

    const summary = log.getSummary();
    expect(summary.metrics.selectionMoves).toBe(1);
    expect(summary.metrics.selectionBlocked).toBe(1);
    expect(summary.metrics.listModeChanges).toBe(1);
    expect(summary.metrics.pageNavigationBlocked).toBe(1);
    expect(summary.metrics.manualOverrideEvents).toBe(1);
    expect(summary.metrics.bindingsApplied).toBe(1);
    expect(summary.metrics.captureCancelled).toBe(1);
    expect(summary.metrics.captureCancelReasons['input:cancel']).toBe(1);
    expect(summary.actionsVisited).toContain('moveUp');
    expect(summary.actionsRemapped).toContain('interact');
    expect(summary.listModesVisited).toContain('alphabetical');
    expect(summary.totalEvents).toBe(6);
  });

  it('resets collected events and metrics', () => {
    const log = new ControlBindingsObservationLog();
    log.record(baseEvent({ event: 'selection_move', changed: true }));
    expect(log.getSummary().totalEvents).toBe(1);

    log.reset();
    const summary = log.getSummary();
    expect(summary.totalEvents).toBe(0);
    expect(summary.metrics.selectionMoves).toBe(0);
    expect(summary.actionsVisited.length).toBe(0);
  });
});
