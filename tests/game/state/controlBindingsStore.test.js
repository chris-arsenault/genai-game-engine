import {
  getBindingsSnapshot,
  getActionBindings,
  setActionBindings,
  setBindings,
  resetBindings,
  subscribe,
  getKeyToActionsSnapshot,
  getActionsForKey,
} from '../../../src/game/state/controlBindingsStore.js';
import { Controls } from '../../../src/game/config/Controls.js';

describe('controlBindingsStore', () => {
  afterEach(() => {
    resetBindings();
  });

  test('returns default bindings for unknown state', () => {
    const snapshot = getBindingsSnapshot();
    expect(snapshot.interact).toEqual(Controls.interact);
    expect(getActionBindings('interact')).toEqual(Controls.interact);
  });

  test('updates single action bindings and notifies subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    const updated = setActionBindings('interact', ['KeyF']);
    expect(updated).toEqual(['KeyF']);

    const snapshot = getBindingsSnapshot();
    expect(snapshot.interact).toEqual(['KeyF']);
    expect(getActionBindings('interact')).toEqual(['KeyF']);
    expect(listener).toHaveBeenCalledTimes(1);
    const callArgs = listener.mock.calls[0][0];
    expect(callArgs.change.action).toBe('interact');
    expect(callArgs.bindings.interact).toEqual(['KeyF']);

    unsubscribe();
  });

  test('bulk set merges defaults and rebuilds key lookup', () => {
    setBindings({
      interact: ['KeyQ'],
      detectiveVision: ['KeyZ'],
    });
    const snapshot = getBindingsSnapshot();
    expect(snapshot.interact).toEqual(['KeyQ']);
    expect(snapshot.detectiveVision).toEqual(['KeyZ']);

    const keyLookup = getKeyToActionsSnapshot();
    expect(Array.from(keyLookup.get('KeyQ') ?? [])).toContain('interact');
    expect(Array.from(keyLookup.get('KeyZ') ?? [])).toContain('detectiveVision');
  });

  test('reset returns defaults and notifies listener once', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    setActionBindings('interact', ['KeyF']);
    listener.mockClear();

    resetBindings();

    expect(getActionBindings('interact')).toEqual(Controls.interact);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].change.type).toBe('reset');

    unsubscribe();
  });

  test('getActionsForKey lists mapped actions', () => {
    setActionBindings('interact', ['KeyY']);
    const actions = getActionsForKey('KeyY');
    expect(actions).toContain('interact');
  });
});
