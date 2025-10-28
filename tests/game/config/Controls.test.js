import { InputState } from '../../../src/game/config/Controls.js';

describe('InputState', () => {
  let inputState;

  beforeEach(() => {
    inputState = new InputState();
  });

  afterEach(() => {
    inputState.reset();
    inputState = null;
  });

  it('detects just-pressed actions exactly once per key press', () => {
    const keyDownEvent = { code: 'KeyG', preventDefault: jest.fn() };
    inputState.handleKeyDown(keyDownEvent);

    expect(inputState.isPressed('disguise')).toBe(true);
    expect(inputState.wasJustPressed('disguise')).toBe(true);
    // Subsequent checks without releasing should be false
    expect(inputState.wasJustPressed('disguise')).toBe(false);

    // Holding the key should keep it reported as pressed
    expect(inputState.isPressed('disguise')).toBe(true);

    // Releasing and pressing again should trigger once more
    inputState.handleKeyUp({ code: 'KeyG' });
    expect(inputState.isPressed('disguise')).toBe(false);
    expect(inputState.wasJustPressed('disguise')).toBe(false);

    inputState.handleKeyDown({ code: 'KeyG', preventDefault: jest.fn() });
    expect(inputState.wasJustPressed('disguise')).toBe(true);
  });

  it('resets state correctly', () => {
    inputState.handleKeyDown({ code: 'KeyQ', preventDefault: jest.fn() });
    expect(inputState.isPressed('quest')).toBe(true);
    expect(inputState.wasJustPressed('quest')).toBe(true);

    inputState.reset();
    expect(inputState.isPressed('quest')).toBe(false);
    expect(inputState.wasJustPressed('quest')).toBe(false);
  });
});
