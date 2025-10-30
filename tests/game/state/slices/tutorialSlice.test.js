import { tutorialSlice } from '../../../../src/game/state/slices/tutorialSlice.js';

describe('tutorialSlice', () => {
  function reduce(state, action) {
    return tutorialSlice.reducer(state, action);
  }

  test('tracks tutorial progression events', () => {
    let state = tutorialSlice.getInitialState();

    state = reduce(state, {
      type: 'TUTORIAL_STARTED',
      domain: 'tutorial',
      payload: { totalSteps: 4 },
      timestamp: 100,
    });
    expect(state.enabled).toBe(true);
    expect(state.startedAt).toBe(100);

    state = reduce(state, {
      type: 'TUTORIAL_STEP_STARTED',
      domain: 'tutorial',
      payload: {
        stepId: 'movement',
        stepIndex: 0,
        totalSteps: 4,
        title: 'Move',
        description: 'Use WASD',
        highlight: { type: 'entity', entityId: 'player' },
        canSkip: true,
        controlHint: {
          label: 'Movement',
          keys: ['W', 'A', 'S', 'D'],
          note: 'Reach the highlighted area.',
        },
      },
      timestamp: 150,
    });

    expect(state.currentStep).toBe('movement');
    expect(state.currentPrompt.title).toBe('Move');
    expect(state.currentPrompt.controlHint).toEqual({
      label: 'Movement',
      keys: ['W', 'A', 'S', 'D'],
      note: 'Reach the highlighted area.',
    });
    expect(state.promptHistory).toHaveLength(1);
    expect(state.promptHistory[0].controlHint.keys).toEqual(['W', 'A', 'S', 'D']);

    state = reduce(state, {
      type: 'TUTORIAL_STEP_COMPLETED',
      domain: 'tutorial',
      payload: { stepId: 'movement', stepIndex: 0 },
      timestamp: 250,
    });
    expect(state.completedSteps).toContain('movement');
    expect(state.completedTimeline.movement).toBe(250);
    expect(state.stepDurations.movement).toBe(100);
    expect(state.promptHistorySnapshots).toHaveLength(1);
    expect(state.promptHistorySnapshots[0].event).toBe('step_completed');

    state = reduce(state, {
      type: 'TUTORIAL_COMPLETED',
      domain: 'tutorial',
      payload: { totalSteps: 4 },
      timestamp: 400,
    });
    expect(state.completed).toBe(true);
    expect(state.enabled).toBe(false);
    expect(state.promptHistorySnapshots).toHaveLength(2);
    const latestSnapshot = tutorialSlice.selectors.selectLatestPromptSnapshot({ tutorial: state });
    expect(latestSnapshot.event).toBe('tutorial_completed');
  });

  test('hydrates snapshot payload', () => {
    const hydrated = reduce(tutorialSlice.getInitialState(), {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        tutorial: {
          completed: true,
          completedSteps: ['movement', 'investigate'],
          completedTimeline: { movement: 200 },
          stepDurations: { movement: 120 },
          currentPrompt: {
            title: 'Investigate',
            stepId: 'investigate',
            stepIndex: 1,
            totalSteps: 4,
            controlHint: {
              label: 'Investigate',
              keys: ['E'],
              note: 'Interact with evidence.',
            },
          },
          promptHistory: [
            {
              title: 'Movement',
              stepId: 'movement',
              stepIndex: 0,
              totalSteps: 4,
              controlHint: {
                label: 'Movement',
                keys: ['W', 'A', 'S', 'D'],
              },
            },
          ],
          promptHistorySnapshots: [
            {
              event: 'step_completed',
              timestamp: 200,
              stepId: 'movement',
              completedSteps: ['movement'],
            },
          ],
          promptHistorySnapshotLimit: 8,
        },
      },
    });

    expect(hydrated.completed).toBe(true);
    expect(hydrated.completedSteps).toContain('investigate');
    expect(hydrated.promptHistory).toHaveLength(1);
    expect(hydrated.currentPrompt.stepId).toBe('investigate');
    expect(hydrated.promptHistorySnapshots).toHaveLength(1);
    expect(hydrated.promptHistorySnapshotLimit).toBe(8);
  });

  test('enforces snapshot history limits', () => {
    const customState = tutorialSlice.getInitialState();
    customState.promptHistorySnapshotLimit = 2;

    const stepStarted = {
      type: 'TUTORIAL_STEP_STARTED',
      domain: 'tutorial',
      payload: { stepId: 'alpha', stepIndex: 0, totalSteps: 3 },
      timestamp: 10,
    };

    let state = reduce(customState, {
      type: 'TUTORIAL_STARTED',
      domain: 'tutorial',
      payload: { totalSteps: 3 },
      timestamp: 0,
    });

    state = reduce(state, stepStarted);
    state = reduce(state, {
      type: 'TUTORIAL_STEP_COMPLETED',
      domain: 'tutorial',
      payload: { stepId: 'alpha', stepIndex: 0 },
      timestamp: 50,
    });
    state = reduce(state, {
      type: 'TUTORIAL_STEP_STARTED',
      domain: 'tutorial',
      payload: { stepId: 'beta', stepIndex: 1, totalSteps: 3 },
      timestamp: 60,
    });
    state = reduce(state, {
      type: 'TUTORIAL_STEP_COMPLETED',
      domain: 'tutorial',
      payload: { stepId: 'beta', stepIndex: 1 },
      timestamp: 90,
    });
    state = reduce(state, {
      type: 'TUTORIAL_COMPLETED',
      domain: 'tutorial',
      payload: { totalSteps: 3 },
      timestamp: 120,
    });

    expect(state.promptHistorySnapshots).toHaveLength(2);
    const snapshots = tutorialSlice.selectors.selectPromptHistorySnapshots({ tutorial: state });
    expect(snapshots[0].event).toBe('step_completed');
    expect(snapshots[1].event).toBe('tutorial_completed');
  });

  test('updates control hint data when bindings change', () => {
    let state = tutorialSlice.getInitialState();

    state = reduce(state, {
      type: 'TUTORIAL_STEP_STARTED',
      domain: 'tutorial',
      payload: {
        stepId: 'movement',
        stepIndex: 0,
        totalSteps: 2,
        title: 'Move',
        description: 'Use WASD',
        controlHint: {
          label: 'Movement',
          keys: ['W', 'A', 'S', 'D'],
          note: 'Reach the highlighted area.',
        },
      },
      timestamp: 100,
    });

    state = reduce(state, {
      type: 'TUTORIAL_CONTROL_HINT_UPDATED',
      domain: 'tutorial',
      payload: {
        stepId: 'movement',
        controlHint: {
          label: 'Movement',
          keys: ['I', 'J', 'K', 'L'],
          note: 'Alternative layout.',
        },
      },
      timestamp: 120,
    });

    expect(state.currentPrompt.controlHint.keys).toEqual(['I', 'J', 'K', 'L']);
    expect(state.promptHistory[state.promptHistory.length - 1].controlHint.keys).toEqual(['I', 'J', 'K', 'L']);
    const snapshots = tutorialSlice.selectors.selectPromptHistorySnapshots({ tutorial: state });
    expect(snapshots[snapshots.length - 1].event).toBe('control_hint_updated');
  });
});
