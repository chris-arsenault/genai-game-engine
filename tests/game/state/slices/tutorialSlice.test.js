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
    });
    expect(state.enabled).toBe(true);
    expect(state.totalSteps).toBe(4);

    state = reduce(state, {
      type: 'TUTORIAL_STEP_STARTED',
      domain: 'tutorial',
      payload: { stepId: 'movement', stepIndex: 0 },
    });
    expect(state.currentStep).toBe('movement');

    state = reduce(state, {
      type: 'TUTORIAL_STEP_COMPLETED',
      domain: 'tutorial',
      payload: { stepId: 'movement' },
    });
    expect(state.completedSteps).toContain('movement');

    state = reduce(state, {
      type: 'TUTORIAL_COMPLETED',
      domain: 'tutorial',
      payload: {},
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
        },
      },
    });

    expect(hydrated.completed).toBe(true);
    expect(hydrated.completedSteps).toContain('investigate');
  });
});
