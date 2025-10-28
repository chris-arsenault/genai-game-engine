import { createSelector } from '../utils/memoize.js';

const initialTutorialState = {
  enabled: false,
  totalSteps: 0,
  currentStep: null,
  currentStepIndex: -1,
  completedSteps: [],
  skipped: false,
  completed: false,
  lastActionAt: null,
};

function cloneState(state) {
  return {
    enabled: state.enabled,
    totalSteps: state.totalSteps,
    currentStep: state.currentStep,
    currentStepIndex: state.currentStepIndex,
    completedSteps: [...state.completedSteps],
    skipped: state.skipped,
    completed: state.completed,
    lastActionAt: state.lastActionAt,
  };
}

export const tutorialSlice = {
  key: 'tutorial',

  getInitialState() {
    return cloneState(initialTutorialState);
  },

  reducer(state = initialTutorialState, action) {
    if (!action) {
      return state;
    }

    if (action.domain !== 'tutorial' && action.type !== 'WORLDSTATE_HYDRATE') {
      return state;
    }

    const next = cloneState(state);
    const payload = action.payload || {};
    let hasChange = false;

    switch (action.type) {
      case 'TUTORIAL_STARTED': {
        next.enabled = true;
        next.totalSteps = payload.totalSteps ?? next.totalSteps;
        next.skipped = false;
        next.completed = false;
        hasChange = true;
        break;
      }

      case 'TUTORIAL_STEP_STARTED': {
        next.enabled = true;
        next.currentStep = payload.stepId ?? null;
        next.currentStepIndex = payload.stepIndex ?? next.currentStepIndex;
        if (payload.totalSteps != null) {
          next.totalSteps = payload.totalSteps;
        }
        hasChange = true;
        break;
      }

      case 'TUTORIAL_STEP_COMPLETED': {
        if (payload.stepId && !next.completedSteps.includes(payload.stepId)) {
          next.completedSteps.push(payload.stepId);
          hasChange = true;
        }
        break;
      }

      case 'TUTORIAL_COMPLETED': {
        next.enabled = false;
        next.completed = true;
        next.currentStep = null;
        next.currentStepIndex = -1;
        hasChange = true;
        break;
      }

      case 'TUTORIAL_SKIPPED': {
        next.enabled = false;
        next.skipped = true;
        next.currentStep = null;
        next.currentStepIndex = -1;
        hasChange = true;
        break;
      }

      case 'WORLDSTATE_HYDRATE':  {
        if (!payload?.tutorial) break;
        return cloneState({
          ...initialTutorialState,
          ...payload.tutorial,
        });
      }

      default:
        break;
    }

    if (hasChange) {
      next.lastActionAt = action.timestamp ?? Date.now();
      return next;
    }

    return state;
  },

  serialize(state) {
    return {
      enabled: state.enabled,
      totalSteps: state.totalSteps,
      completedSteps: state.completedSteps,
      skipped: state.skipped,
      completed: state.completed,
    };
  },

  selectors: {
    selectSlice(state) {
      return state.tutorial;
    },
    selectTutorialProgress: createSelector(
      (state) => state.tutorial,
      (tutorial) => ({
        enabled: tutorial.enabled,
        currentStep: tutorial.currentStep,
        currentStepIndex: tutorial.currentStepIndex,
        totalSteps: tutorial.totalSteps,
        completedSteps: tutorial.completedSteps,
        completed: tutorial.completed,
        skipped: tutorial.skipped,
      })
    ),
    isTutorialCompleted: createSelector(
      (state) => state.tutorial,
      (tutorial) => tutorial.completed
    ),
  },
};

export default tutorialSlice;
