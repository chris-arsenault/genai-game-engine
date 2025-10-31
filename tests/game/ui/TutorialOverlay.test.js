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
        controlHint: {
          label: 'Movement',
          keys: ['W', 'A', 'S', 'D'],
          note: 'Reach highlighted markers.',
        },
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
    expect(overlay.currentPrompt.controlHint.keys).toEqual(['W', 'A', 'S', 'D']);
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

describe('TutorialOverlay FX cue emissions', () => {
  it('emits overlay and step cues without duplicating step starts', () => {
    const canvas = createMockCanvas();
    const emitted = [];
    const handlers = {};
    const eventBus = {
      emit: jest.fn((eventName, payload) => {
        emitted.push({ eventName, payload });
      }),
      on: jest.fn((eventName, handler) => {
        handlers[eventName] = handler;
        return jest.fn();
      }),
    };

    const overlay = new TutorialOverlay(canvas, eventBus, {});
    overlay.init();

    handlers['tutorial:started']?.({
      totalSteps: 3,
      startedAt: 1000,
    });
    const revealCue = emitted.find(
      (evt) =>
        evt.eventName === 'fx:overlay_cue' &&
        evt.payload?.effectId === 'tutorialOverlayReveal'
    );
    expect(revealCue).toBeDefined();
    expect(revealCue.payload.context.source).toBe('tutorial:started');
    expect(revealCue.payload.context.totalSteps).toBe(3);

    emitted.length = 0;
    handlers['tutorial:step_started']?.({
      stepId: 'movement',
      stepIndex: 0,
      totalSteps: 3,
      title: 'Movement',
      canSkip: true,
    });
    const firstStepCue = emitted.find(
      (evt) =>
        evt.eventName === 'fx:overlay_cue' &&
        evt.payload?.effectId === 'tutorialStepStarted'
    );
    expect(firstStepCue).toBeDefined();
    expect(firstStepCue.payload.context.stepId).toBe('movement');

    emitted.length = 0;
    handlers['tutorial:step_started']?.({
      stepId: 'movement',
      stepIndex: 0,
      totalSteps: 3,
      title: 'Movement',
      canSkip: true,
    });
    expect(
      emitted.some(
        (evt) => evt.eventName === 'fx:overlay_cue' && evt.payload?.effectId === 'tutorialStepStarted'
      )
    ).toBe(false);

    handlers['tutorial:step_completed']?.({
      stepId: 'movement',
      stepIndex: 0,
      totalSteps: 3,
      completedAt: 1500,
      durationMs: 500,
    });
    const completedCue = emitted.find(
      (evt) =>
        evt.eventName === 'fx:overlay_cue' &&
        evt.payload?.effectId === 'tutorialStepCompleted'
    );
    expect(completedCue).toBeDefined();

    emitted.length = 0;
    handlers['tutorial:step_started']?.({
      stepId: 'investigate',
      stepIndex: 1,
      totalSteps: 3,
      title: 'Investigate',
      canSkip: false,
    });
    const nextStepCue = emitted.find(
      (evt) =>
        evt.eventName === 'fx:overlay_cue' &&
        evt.payload?.effectId === 'tutorialStepStarted'
    );
    expect(nextStepCue).toBeDefined();
    expect(nextStepCue.payload.context.stepId).toBe('investigate');
    expect(nextStepCue.payload.context.canSkip).toBe(false);

    emitted.length = 0;
    handlers['tutorial:completed']?.({
      totalSteps: 3,
      completedSteps: 3,
      completedAt: 2500,
    });
    const dismissCue = emitted.find(
      (evt) =>
        evt.eventName === 'fx:overlay_cue' &&
        evt.payload?.effectId === 'tutorialOverlayDismiss'
    );
    expect(dismissCue).toBeDefined();
    expect(dismissCue.payload.context.source).toBe('tutorial:completed');
    expect(dismissCue.payload.context.completedAt).toBe(2500);

    overlay.cleanup();
  });
});
