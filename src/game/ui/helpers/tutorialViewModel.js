import { createSelector } from '../../state/utils/memoize.js';
import { tutorialSlice } from '../../state/slices/tutorialSlice.js';

const selectProgress = (state) => tutorialSlice.selectors.selectTutorialProgress(state);
const selectCurrentPrompt = (state) => tutorialSlice.selectors.selectCurrentPrompt(state);
const selectAnalytics = (state) => tutorialSlice.selectors.selectTutorialAnalytics(state);
const selectPromptHistory = (state) => tutorialSlice.selectors.selectPromptHistory(state);
const selectSnapshotHistory = (state) =>
  tutorialSlice.selectors.selectPromptHistorySnapshots(state);
const selectLatestSnapshot = (state) =>
  tutorialSlice.selectors.selectLatestPromptSnapshot(state);

const tutorialOverlaySelector = createSelector(
  selectProgress,
  selectCurrentPrompt,
  selectAnalytics,
  selectPromptHistory,
  selectSnapshotHistory,
  selectLatestSnapshot,
  (progress, prompt, analytics, history, snapshots, latestSnapshot) => {
    const totalSteps = progress.totalSteps ?? 0;
    const completedStepsCount = Array.isArray(progress.completedSteps) ? progress.completedSteps.length : 0;
    const visible = Boolean(progress.enabled && prompt);
    const stepIndex = prompt?.stepIndex ?? progress.currentStepIndex ?? -1;

    return {
      visible,
      prompt: prompt
        ? {
            title: prompt.title ?? 'Tutorial',
            description: prompt.description ?? '',
            stepId: prompt.stepId ?? null,
            stepIndex,
            totalSteps: prompt.totalSteps ?? totalSteps,
            canSkip: Boolean(prompt.canSkip),
            highlight: prompt.highlight ?? null,
            position: prompt.position ?? null,
          }
        : null,
      progress: {
        completed: completedStepsCount,
        total: totalSteps,
        percent: totalSteps > 0 ? completedStepsCount / totalSteps : 0,
        completedSteps: Array.isArray(progress.completedSteps) ? progress.completedSteps : [],
      },
      analytics,
      history,
      telemetry: {
        latestSnapshot: latestSnapshot ?? null,
        snapshots: Array.isArray(snapshots) ? snapshots : [],
      },
    };
  }
);

/**
 * Build a view model for the tutorial overlay from the world state.
 * @param {Object} state
 * @returns {Object}
 */
export function buildTutorialOverlayView(state) {
  return tutorialOverlaySelector(state);
}
