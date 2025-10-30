import { ControlBindingsOverlay } from '../../../src/game/ui/ControlBindingsOverlay.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  getBindingsSnapshot,
  getKeyToActionsSnapshot,
  setActionBindings,
  subscribe as subscribeControlBindings,
} from '../../../src/game/state/controlBindingsStore.js';

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
});
