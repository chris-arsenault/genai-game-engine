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
      },
      timestamp: 150,
    });

    expect(state.currentStep).toBe('movement');
    expect(state.currentPrompt.title).toBe('Move');
    expect(state.promptHistory).toHaveLength(1);

    state = reduce(state, {
      type: 'TUTORIAL_STEP_COMPLETED',
      domain: 'tutorial',
      payload: { stepId: 'movement', stepIndex: 0 },
      timestamp: 250,
    });
    expect(state.completedSteps).toContain('movement');
    expect(state.completedTimeline.movement).toBe(250);
    expect(state.stepDurations.movement).toBe(100);

    state = reduce(state, {
      type: 'TUTORIAL_COMPLETED',
      domain: 'tutorial',
      payload: { totalSteps: 4 },
      timestamp: 400,
    });
    expect(state.completed).toBe(true);
    expect(state.enabled).toBe(false);
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
          },
          promptHistory: [
            {
              title: 'Movement',
              stepId: 'movement',
              stepIndex: 0,
              totalSteps: 4,
            },
          ],
        },
      },
    });

    expect(hydrated.completed).toBe(true);
    expect(hydrated.completedSteps).toContain('investigate');
    expect(hydrated.promptHistory).toHaveLength(1);
    expect(hydrated.currentPrompt.stepId).toBe('investigate');
  });
});
