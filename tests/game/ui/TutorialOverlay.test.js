import { TutorialOverlay } from '../../../src/game/ui/TutorialOverlay.js';
import { tutorialSlice } from '../../../src/game/state/slices/tutorialSlice.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

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
  };

  return {
    width: 800,
    height: 600,
    getContext: () => context,
    _ctx: context,
  };
}

function createMockStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    onUpdate(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;
      for (const callback of listeners) {
        callback(state);
      }
    },
    getListenerCount() {
      return listeners.size;
    },
  };
}

describe('TutorialOverlay (store integration)', () => {
  it('reacts to world state store updates', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const initialTutorialState = tutorialSlice.getInitialState();
    const store = createMockStore({
      tutorial: initialTutorialState,
    });

    const overlay = new TutorialOverlay(canvas, eventBus, { store });
    overlay.init();

    expect(overlay.visible).toBe(false);

    const promptState = {
      ...initialTutorialState,
      enabled: true,
      totalSteps: 3,
      currentStep: 'movement',
      currentStepIndex: 0,
      completedSteps: [],
      completedTimeline: {},
      stepDurations: {},
      currentPrompt: {
        title: 'First Steps',
        description: 'Use WASD to move.',
        stepId: 'movement',
        stepIndex: 0,
        totalSteps: 3,
        canSkip: true,
        highlight: { type: 'entity', entityTag: 'player' },
      },
      promptHistorySnapshots: [
        {
          event: 'step_started',
          timestamp: Date.now() - 500,
          stepId: 'movement',
          stepIndex: 0,
          totalSteps: 3,
          completedSteps: [],
          promptHistory: [],
        },
      ],
    };

    store.setState({
      tutorial: promptState,
    });

    expect(overlay.visible).toBe(true);
    expect(overlay.currentPrompt.title).toBe('First Steps');
    expect(overlay.currentPrompt.stepIndex).toBe(0);
    expect(overlay.highlightEntities).toContain('player');
    expect(overlay.telemetry.latestSnapshot).not.toBeNull();
    expect(Array.isArray(overlay.telemetry.timeline)).toBe(true);
    expect(overlay.telemetry.timeline.length).toBeGreaterThan(0);

    store.setState({
      tutorial: {
        ...promptState,
        enabled: false,
        currentPrompt: null,
      },
    });

    expect(overlay.visible).toBe(false);
    overlay.cleanup();
    expect(store.getListenerCount()).toBe(0);
  });
});

describe('TutorialOverlay event bus wiring', () => {
  it('exposes eventBus property and maintains legacy events alias', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const onSpy = jest.spyOn(eventBus, 'on');

    const overlay = new TutorialOverlay(canvas, eventBus, {});
    overlay.init();

    expect(overlay.eventBus).toBe(eventBus);
    expect(overlay.events).toBe(eventBus);
    expect(onSpy).toHaveBeenCalledWith('tutorial:started', expect.any(Function));

    overlay.cleanup();
    onSpy.mockRestore();
  });
});
