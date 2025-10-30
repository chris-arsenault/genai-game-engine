import { createSelector } from '../utils/memoize.js';

const DEFAULT_PROMPT_HISTORY_LIMIT = 5;
const DEFAULT_PROMPT_SNAPSHOT_LIMIT = 10;

const sliceRuntimeConfig = {
  promptHistoryLimit: DEFAULT_PROMPT_HISTORY_LIMIT,
  promptHistorySnapshotLimit: DEFAULT_PROMPT_SNAPSHOT_LIMIT,
};

function cloneControlHint(hint) {
  if (!hint || typeof hint !== 'object') {
    return null;
  }
  return {
    label: hint.label ?? null,
    keys: Array.isArray(hint.keys) ? [...hint.keys] : [],
    note: hint.note ?? null,
  };
}

function clonePrompt(prompt) {
  if (!prompt) return null;
  return {
    title: prompt.title ?? null,
    description: prompt.description ?? null,
    stepId: prompt.stepId ?? null,
    stepIndex: prompt.stepIndex ?? null,
    totalSteps: prompt.totalSteps ?? null,
    highlight: prompt.highlight ? { ...prompt.highlight } : null,
    position: prompt.position ? { ...prompt.position } : null,
    canSkip: Boolean(prompt.canSkip),
    startedAt: prompt.startedAt ?? null,
    controlHint: cloneControlHint(prompt.controlHint),
  };
}

function clonePromptSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    event: snapshot.event ?? null,
    timestamp: snapshot.timestamp ?? null,
    stepId: snapshot.stepId ?? null,
    stepIndex: snapshot.stepIndex ?? null,
    totalSteps: snapshot.totalSteps ?? null,
    completedSteps: Array.isArray(snapshot.completedSteps) ? [...snapshot.completedSteps] : [],
    currentPrompt: snapshot.currentPrompt ? clonePrompt(snapshot.currentPrompt) : null,
    promptHistory: Array.isArray(snapshot.promptHistory) ? snapshot.promptHistory.map(clonePrompt) : [],
    analytics: snapshot.analytics
      ? {
          completedTimeline: snapshot.analytics.completedTimeline
            ? { ...snapshot.analytics.completedTimeline }
            : {},
          stepDurations: snapshot.analytics.stepDurations ? { ...snapshot.analytics.stepDurations } : {},
        }
      : {
          completedTimeline: {},
          stepDurations: {},
        },
    metadata: snapshot.metadata ? { ...snapshot.metadata } : {},
  };
}

function cloneState(state) {
  return {
    enabled: state.enabled,
    totalSteps: state.totalSteps,
    currentStep: state.currentStep,
    currentStepIndex: state.currentStepIndex,
    completedSteps: Array.isArray(state.completedSteps) ? [...state.completedSteps] : [],
    completedTimeline: state.completedTimeline ? { ...state.completedTimeline } : {},
    stepDurations: state.stepDurations ? { ...state.stepDurations } : {},
    skipped: state.skipped,
    completed: state.completed,
    lastActionAt: state.lastActionAt,
    startedAt: state.startedAt,
    stepStartedAt: state.stepStartedAt,
    currentPrompt: clonePrompt(state.currentPrompt),
    promptHistory: Array.isArray(state.promptHistory) ? state.promptHistory.map(clonePrompt) : [],
    promptHistoryLimit: state.promptHistoryLimit,
    promptHistorySnapshots: Array.isArray(state.promptHistorySnapshots)
      ? state.promptHistorySnapshots.map(clonePromptSnapshot)
      : [],
    promptHistorySnapshotLimit: state.promptHistorySnapshotLimit,
  };
}

function createInitialState() {
  return {
    enabled: false,
    totalSteps: 0,
    currentStep: null,
    currentStepIndex: -1,
    completedSteps: [],
    completedTimeline: {},
    stepDurations: {},
    skipped: false,
    completed: false,
    lastActionAt: null,
    startedAt: null,
    stepStartedAt: null,
    currentPrompt: null,
    promptHistory: [],
    promptHistoryLimit: sliceRuntimeConfig.promptHistoryLimit,
    promptHistorySnapshots: [],
    promptHistorySnapshotLimit: sliceRuntimeConfig.promptHistorySnapshotLimit,
  };
}

function recordPromptHistory(state, prompt) {
  const baseHistory = Array.isArray(state.promptHistory) ? state.promptHistory : [];
  const history = [...baseHistory, prompt];
  const overflow = history.length - state.promptHistoryLimit;
  if (overflow > 0) {
    history.splice(0, overflow);
  }
  state.promptHistory = history;
}

function recordPromptSnapshot(state, event, timestamp, metadata = {}) {
  const history = Array.isArray(state.promptHistorySnapshots) ? [...state.promptHistorySnapshots] : [];
  const snapshot = {
    event,
    timestamp,
    stepId: state.currentStep ?? null,
    stepIndex: state.currentStepIndex ?? null,
    totalSteps: state.totalSteps ?? null,
    completedSteps: Array.isArray(state.completedSteps) ? [...state.completedSteps] : [],
    currentPrompt: state.currentPrompt ? clonePrompt(state.currentPrompt) : null,
    promptHistory: Array.isArray(state.promptHistory) ? state.promptHistory.map(clonePrompt) : [],
    analytics: {
      completedTimeline: state.completedTimeline ? { ...state.completedTimeline } : {},
      stepDurations: state.stepDurations ? { ...state.stepDurations } : {},
    },
    metadata: { ...metadata },
  };

  history.push(snapshot);
  const limit = state.promptHistorySnapshotLimit;
  const overflow = history.length - limit;
  if (overflow > 0) {
    history.splice(0, overflow);
  }

  state.promptHistorySnapshots = history;
}

export const tutorialSlice = {
  key: 'tutorial',

  configure({ promptHistoryLimit, promptHistorySnapshotLimit } = {}) {
    if (typeof promptHistoryLimit === 'number' && Number.isFinite(promptHistoryLimit) && promptHistoryLimit > 0) {
      sliceRuntimeConfig.promptHistoryLimit = Math.floor(promptHistoryLimit);
    }
    if (
      typeof promptHistorySnapshotLimit === 'number' &&
      Number.isFinite(promptHistorySnapshotLimit) &&
      promptHistorySnapshotLimit > 0
    ) {
      sliceRuntimeConfig.promptHistorySnapshotLimit = Math.floor(promptHistorySnapshotLimit);
    }
  },

  getInitialState() {
    return createInitialState();
  },

  reducer(state = createInitialState(), action) {
    if (!action) {
      return state;
    }

    if (action.domain !== 'tutorial' && action.type !== 'WORLDSTATE_HYDRATE') {
      return state;
    }

    if (action.type === 'WORLDSTATE_HYDRATE') {
      if (!action.payload?.tutorial) {
        return state;
      }
      const snapshot = action.payload.tutorial;
      const hydrated = createInitialState();

      hydrated.enabled = snapshot.enabled ?? hydrated.enabled;
      hydrated.totalSteps = snapshot.totalSteps ?? hydrated.totalSteps;
      hydrated.currentStep = snapshot.currentStep ?? hydrated.currentStep;
      hydrated.currentStepIndex = snapshot.currentStepIndex ?? hydrated.currentStepIndex;
      hydrated.completedSteps = Array.isArray(snapshot.completedSteps) ? [...snapshot.completedSteps] : [];
      hydrated.completedTimeline = snapshot.completedTimeline ? { ...snapshot.completedTimeline } : {};
      hydrated.stepDurations = snapshot.stepDurations ? { ...snapshot.stepDurations } : {};
      hydrated.skipped = snapshot.skipped ?? hydrated.skipped;
      hydrated.completed = snapshot.completed ?? hydrated.completed;
      hydrated.lastActionAt = snapshot.lastActionAt ?? hydrated.lastActionAt;
      hydrated.startedAt = snapshot.startedAt ?? hydrated.startedAt;
      hydrated.stepStartedAt = snapshot.stepStartedAt ?? hydrated.stepStartedAt;
      hydrated.currentPrompt = snapshot.currentPrompt ? clonePrompt(snapshot.currentPrompt) : null;
      hydrated.promptHistory = Array.isArray(snapshot.promptHistory)
        ? snapshot.promptHistory.map(clonePrompt)
        : [];
      hydrated.promptHistoryLimit =
        typeof snapshot.promptHistoryLimit === 'number' ? snapshot.promptHistoryLimit : hydrated.promptHistoryLimit;
      hydrated.promptHistorySnapshots = Array.isArray(snapshot.promptHistorySnapshots)
        ? snapshot.promptHistorySnapshots.map(clonePromptSnapshot)
        : [];
      hydrated.promptHistorySnapshotLimit =
        typeof snapshot.promptHistorySnapshotLimit === 'number'
          ? snapshot.promptHistorySnapshotLimit
          : hydrated.promptHistorySnapshotLimit;
      return hydrated;
    }

    const next = cloneState(state);
    const payload = action.payload || {};
    let hasChange = false;
    const timestamp = action.timestamp ?? Date.now();

    switch (action.type) {
      case 'TUTORIAL_STARTED': {
        next.enabled = true;
        next.totalSteps = payload.totalSteps ?? next.totalSteps;
        next.skipped = false;
        next.completed = false;
        next.startedAt = timestamp;
        next.stepStartedAt = null;
        next.currentPrompt = null;
        next.promptHistory = [];
        next.promptHistorySnapshots = [];
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
        next.stepStartedAt = timestamp;
        const controlHint = cloneControlHint(payload.controlHint);
        const prompt = {
          title: payload.title ?? null,
          description: payload.description ?? null,
          stepId: payload.stepId ?? null,
          stepIndex: payload.stepIndex ?? null,
          totalSteps: payload.totalSteps ?? next.totalSteps,
          highlight: payload.highlight ? { ...payload.highlight } : null,
          position: payload.position ? { ...payload.position } : null,
          canSkip: Boolean(payload.canSkip),
          startedAt: timestamp,
           controlHint,
        };
        next.currentPrompt = prompt;
        recordPromptHistory(next, prompt);
        hasChange = true;
        break;
      }

      case 'TUTORIAL_STEP_COMPLETED': {
        if (payload.stepId && !next.completedSteps.includes(payload.stepId)) {
          next.completedSteps.push(payload.stepId);
          next.completedTimeline = {
            ...next.completedTimeline,
            [payload.stepId]: timestamp,
          };
          if (next.stepStartedAt) {
            next.stepDurations = {
              ...next.stepDurations,
              [payload.stepId]: timestamp - next.stepStartedAt,
            };
          }
          hasChange = true;
        }
        recordPromptSnapshot(next, 'step_completed', timestamp, {
          stepId: payload.stepId ?? next.currentStep,
          completedAt: timestamp,
        });
        break;
      }

      case 'TUTORIAL_COMPLETED': {
        next.enabled = false;
        next.completed = true;
        next.currentStep = null;
        next.currentStepIndex = -1;
        next.currentPrompt = null;
        next.stepStartedAt = null;
        recordPromptSnapshot(next, 'tutorial_completed', timestamp, {
          completedSteps: Array.isArray(payload.completedSteps)
            ? [...payload.completedSteps]
            : [...next.completedSteps],
        });
        hasChange = true;
        break;
      }

      case 'TUTORIAL_SKIPPED': {
        next.enabled = false;
        next.skipped = true;
        next.currentStep = null;
        next.currentStepIndex = -1;
        next.currentPrompt = null;
        next.stepStartedAt = null;
        recordPromptSnapshot(next, 'tutorial_skipped', timestamp, {
          reason: payload.reason ?? 'skipped',
        });
        hasChange = true;
        break;
      }

      default:
        break;
    }

    if (hasChange) {
      next.lastActionAt = timestamp;
      return next;
    }

    return state;
  },

  serialize(state) {
    return {
      enabled: state.enabled,
      totalSteps: state.totalSteps,
      currentStep: state.currentStep,
      currentStepIndex: state.currentStepIndex,
      completedSteps: Array.isArray(state.completedSteps) ? [...state.completedSteps] : [],
      completedTimeline: state.completedTimeline ? { ...state.completedTimeline } : {},
      stepDurations: state.stepDurations ? { ...state.stepDurations } : {},
      skipped: state.skipped,
      completed: state.completed,
      lastActionAt: state.lastActionAt,
      startedAt: state.startedAt,
      stepStartedAt: state.stepStartedAt,
      currentPrompt: state.currentPrompt ? clonePrompt(state.currentPrompt) : null,
      promptHistory: Array.isArray(state.promptHistory) ? state.promptHistory.map(clonePrompt) : [],
      promptHistoryLimit: state.promptHistoryLimit,
      promptHistorySnapshots: Array.isArray(state.promptHistorySnapshots)
        ? state.promptHistorySnapshots.map(clonePromptSnapshot)
        : [],
      promptHistorySnapshotLimit: state.promptHistorySnapshotLimit,
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
        lastActionAt: tutorial.lastActionAt,
        startedAt: tutorial.startedAt,
        stepStartedAt: tutorial.stepStartedAt,
      })
    ),
    selectCurrentPrompt: createSelector(
      (state) => state.tutorial.currentPrompt,
      (prompt) => (prompt ? clonePrompt(prompt) : null)
    ),
    selectPromptHistory: createSelector(
      (state) => state.tutorial.promptHistory,
      (history) => history.map(clonePrompt)
    ),
    selectPromptHistorySnapshots: createSelector(
      (state) => state.tutorial.promptHistorySnapshots,
      (snapshots) => snapshots.map(clonePromptSnapshot)
    ),
    selectLatestPromptSnapshot: createSelector(
      (state) => state.tutorial.promptHistorySnapshots,
      (snapshots) => {
        if (!snapshots.length) {
          return null;
        }
        return clonePromptSnapshot(snapshots[snapshots.length - 1]);
      }
    ),
    selectTutorialAnalytics: createSelector(
      (state) => state.tutorial,
      (tutorial) => ({
        completedTimeline: { ...tutorial.completedTimeline },
        stepDurations: { ...tutorial.stepDurations },
      })
    ),
    isTutorialCompleted: createSelector(
      (state) => state.tutorial,
      (tutorial) => tutorial.completed
    ),
  },
};

export default tutorialSlice;
