import { ControlBindingsOverlay, CONTROL_BINDINGS_NAV_EVENT } from '../../../src/game/ui/ControlBindingsOverlay.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  getBindingsSnapshot,
  getKeyToActionsSnapshot,
  setActionBindings,
  subscribe as subscribeControlBindings,
} from '../../../src/game/state/controlBindingsStore.js';
import { ControlBindingsObservationLog } from '../../../src/game/telemetry/ControlBindingsObservationLog.js';

jest.mock('../../../src/game/state/controlBindingsStore.js', () => ({
  getBindingsSnapshot: jest.fn(),
  getKeyToActionsSnapshot: jest.fn(),
  setActionBindings: jest.fn(),
  subscribe: jest.fn(),
}));

function createMockCanvas() {
  const context = {
    save: jest.fn(),
    restore: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 8 || 8 })),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
  };

  return {
    width: 1280,
    height: 720,
    getContext: () => context,
    _ctx: context,
  };
}

describe('ControlBindingsOverlay', () => {
  const initialBindings = {
    moveUp: ['KeyW', 'ArrowUp'],
    moveDown: ['KeyS', 'ArrowDown'],
    interact: ['KeyE'],
    controlsMenu: ['KeyK'],
  };

  const initialKeyMap = new Map([
    ['KeyW', new Set(['moveUp'])],
    ['ArrowUp', new Set(['moveUp'])],
    ['KeyS', new Set(['moveDown'])],
    ['KeyE', new Set(['interact'])],
    ['KeyK', new Set(['controlsMenu'])],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    getBindingsSnapshot.mockReturnValue(initialBindings);
    getKeyToActionsSnapshot.mockReturnValue(initialKeyMap);
    subscribeControlBindings.mockImplementation(() => () => {});
    setActionBindings.mockReset();
  });

  it('builds sections from control bindings and reacts to store updates', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const listeners = [];

    subscribeControlBindings.mockImplementation((listener) => {
      listeners.push(listener);
      return () => {};
    });

    const overlay = new ControlBindingsOverlay(canvas, eventBus);
    overlay.init();

    expect(overlay.sections.length).toBeGreaterThan(0);
    const flatActions = overlay.actionEntries.map((entry) => entry.action);
    expect(flatActions).toContain('controlsMenu');
    expect(flatActions).toContain('moveUp');

    const updatedBindings = {
      ...initialBindings,
      interact: ['KeyF'],
    };
    const updatedKeyMap = new Map([
      ...initialKeyMap.entries(),
      ['KeyF', new Set(['interact'])],
    ]);

    listeners[0]({ bindings: updatedBindings, keyToActions: updatedKeyMap });

    const updatedEntry = overlay.actionEntries.find((entry) => entry.action === 'interact');
    expect(updatedEntry.codes).toEqual(['KeyF']);
    expect(updatedEntry.labels).toEqual(['F']);

    overlay.cleanup();
  });

  it('captures new bindings when Enter then key is pressed', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const overlay = new ControlBindingsOverlay(canvas, eventBus);
    overlay.init();

    overlay.show('test');
    overlay.selectedIndex = overlay.actionEntries.findIndex((entry) => entry.action === 'interact');
    overlay.beginCapture();

    const event = {
      code: 'KeyZ',
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      stopImmediatePropagation: jest.fn(),
    };

    overlay.handleGlobalKeyDown(event);

    expect(setActionBindings).toHaveBeenCalledWith(
      'interact',
      ['KeyZ'],
      expect.objectContaining({
        metadata: expect.objectContaining({ source: 'control-bindings-overlay', code: 'KeyZ' }),
      })
    );
    expect(overlay.capturing).toBe(false);
    expect(overlay.captureStatus).toBe('success');
    overlay.cleanup();
  });

  it('resets action bindings when Backspace is pressed outside capture mode', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const overlay = new ControlBindingsOverlay(canvas, eventBus);
    overlay.init();

    overlay.show('test');
    overlay.selectedIndex = overlay.actionEntries.findIndex((entry) => entry.action === 'controlsMenu');

    const resetEvent = {
      code: 'Backspace',
      preventDefault: jest.fn(),
    };

    overlay.handleGlobalKeyDown(resetEvent);

    expect(resetEvent.preventDefault).toHaveBeenCalled();
    expect(setActionBindings).toHaveBeenCalledWith(
      'controlsMenu',
      [],
      expect.objectContaining({
        metadata: expect.objectContaining({ source: 'control-bindings-overlay', command: 'reset-action' }),
      })
    );
    overlay.cleanup();
  });

  it('cycles list modes and paginates control entries', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const bigBindingSet = {
      moveUp: ['KeyW'],
      moveDown: ['KeyS'],
      moveLeft: ['KeyA'],
      moveRight: ['KeyD'],
      interact: ['KeyE'],
      detectiveVision: ['KeyV'],
      forensicAnalysis: ['KeyF'],
      attack: ['Space'],
      dodge: ['ShiftLeft'],
      inventory: ['KeyI'],
      quest: ['KeyQ'],
      faction: ['KeyR'],
      disguise: ['KeyG'],
      caseFile: ['Tab'],
      deductionBoard: ['KeyB'],
      controlsMenu: ['KeyK'],
      pause: ['Escape'],
      confirm: ['Enter'],
      cancel: ['Backspace'],
      debugToggle: ['Backquote'],
      sprint: ['KeyL'],
      map: ['KeyM'],
      journal: ['KeyJ'],
      hotbar1: ['Digit1'],
      hotbar2: ['Digit2'],
      hotbar3: ['Digit3'],
      hotbar4: ['Digit4'],
    };
    const keyMap = new Map();
    for (const [action, codes] of Object.entries(bigBindingSet)) {
      for (const code of codes) {
        keyMap.set(code, new Set([action]));
      }
    }

    getBindingsSnapshot.mockReturnValue(bigBindingSet);
    getKeyToActionsSnapshot.mockReturnValue(keyMap);

    const overlay = new ControlBindingsOverlay(canvas, eventBus);
    overlay.init();
    overlay.show('test');
    overlay.update(1);
    overlay.render(canvas._ctx);

    expect(overlay.pageCount).toBeGreaterThan(1);
    const initialMode = overlay.getListMode().id;

    const pageDownEvent = { code: 'PageDown', preventDefault: jest.fn() };
    overlay.handleGlobalKeyDown(pageDownEvent);
    expect(pageDownEvent.preventDefault).toHaveBeenCalled();
    expect(overlay.captureMessage).toMatch(/Viewing page/i);

    const cycleEvent = { code: 'BracketRight', preventDefault: jest.fn() };
    overlay.handleGlobalKeyDown(cycleEvent);
    expect(cycleEvent.preventDefault).toHaveBeenCalled();
    expect(overlay.getListMode().id).not.toEqual(initialMode);

    overlay.cleanup();
  });

  it('emits navigation telemetry events and records observation summary', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();

    const richBindings = {
      moveUp: ['KeyW'],
      moveDown: ['KeyS'],
      moveLeft: ['KeyA'],
      moveRight: ['KeyD'],
      interact: ['KeyE'],
      inventory: ['KeyI'],
      quest: ['KeyQ'],
      faction: ['KeyR'],
      controlsMenu: ['KeyK'],
      pause: ['Escape'],
      confirm: ['Enter'],
    };

    const keyMap = new Map();
    for (const [action, codes] of Object.entries(richBindings)) {
      for (const code of codes) {
        keyMap.set(code, new Set([action]));
      }
    }

    getBindingsSnapshot.mockReturnValue(richBindings);
    getKeyToActionsSnapshot.mockReturnValue(keyMap);

    const overlay = new ControlBindingsOverlay(canvas, eventBus);
    overlay.init();
    overlay.show('test');

    const log = new ControlBindingsObservationLog();
    const telemetryEvents = [];

    eventBus.on(CONTROL_BINDINGS_NAV_EVENT, (payload) => {
      telemetryEvents.push(payload);
      log.record(payload);
    });

    eventBus.emit('input:moveDown:pressed');
    const cycleEvent = { code: 'BracketRight', preventDefault: jest.fn() };
    overlay.handleGlobalKeyDown(cycleEvent);
    const pageDownEvent = { code: 'PageDown', preventDefault: jest.fn() };
    overlay.handleGlobalKeyDown(pageDownEvent);

    expect(telemetryEvents.length).toBeGreaterThanOrEqual(2);
    const moveEvent = telemetryEvents.find((evt) => evt.event === 'selection_move');
    expect(moveEvent).toBeDefined();
    expect(moveEvent.changed).toBe(true);
    expect(moveEvent.nextAction).toBeDefined();

    const summary = log.getSummary();
    expect(summary.metrics.selectionMoves).toBeGreaterThanOrEqual(1);
    expect(summary.listModesVisited.length).toBeGreaterThanOrEqual(1);
    expect(summary.totalEvents).toBe(telemetryEvents.length);
    expect(summary.actionsVisited.length).toBeGreaterThan(0);

    overlay.cleanup();
  });
});
