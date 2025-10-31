import { InteractionPromptOverlay } from '../../../src/game/ui/InteractionPromptOverlay.js';

describe('InteractionPromptOverlay FX cues', () => {
  let eventBus;
  let overlay;

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(() => jest.fn()),
    };

    overlay = new InteractionPromptOverlay(
      { width: 1280, height: 720 },
      eventBus,
      { worldToScreen: (x, y) => ({ x, y }) },
    );
  });

  function getFxCalls() {
    return eventBus.emit.mock.calls
      .filter(([event]) => event === 'fx:overlay_cue')
      .map(([, payload]) => payload);
  }

  it('emits reveal cue when prompt first appears', () => {
    overlay.showPrompt({ text: 'Press E to investigate', source: 'unit-test' });

    const fxCalls = getFxCalls();
    expect(fxCalls).toHaveLength(1);
    expect(fxCalls[0]).toMatchObject({
      effectId: 'interactionPromptReveal',
      context: expect.objectContaining({
        anchored: false,
        source: 'unit-test',
      }),
    });
  });

  it('emits update cue when prompt text changes while visible', () => {
    overlay.showPrompt({ text: 'Press E to investigate', source: 'unit-test' });
    eventBus.emit.mockClear();

    overlay.showPrompt({ text: 'Hold E to scan', source: 'unit-test-update' });

    const fxCalls = getFxCalls();
    expect(fxCalls).toHaveLength(1);
    expect(fxCalls[0]).toMatchObject({
      effectId: 'interactionPromptUpdate',
      context: expect.objectContaining({
        source: 'unit-test-update',
        textLength: 'Hold E to scan'.length,
      }),
    });
  });

  it('emits dismiss cue when prompt hides', () => {
    overlay.showPrompt({ text: 'Press E to investigate', source: 'unit-test' });
    eventBus.emit.mockClear();

    overlay.hidePrompt();

    const fxCalls = getFxCalls();
    expect(fxCalls).toHaveLength(1);
    expect(fxCalls[0]).toMatchObject({
      effectId: 'interactionPromptDismiss',
      context: expect.objectContaining({
        source: 'hidePrompt',
      }),
    });
  });
});
