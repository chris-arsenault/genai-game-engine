import { buildTutorialOverlayView } from '../../../../src/game/ui/helpers/tutorialViewModel.js';
import { tutorialSlice } from '../../../../src/game/state/slices/tutorialSlice.js';

describe('buildTutorialOverlayView', () => {
  it('includes telemetry snapshots and latest snapshot', () => {
    const baseState = tutorialSlice.getInitialState();
    const now = Date.now();
    const state = {
      tutorial: {
        ...baseState,
        enabled: true,
        totalSteps: 2,
        currentStep: 'movement',
        currentStepIndex: 0,
        completedSteps: [],
        currentPrompt: {
          title: 'Move',
          description: 'Use WASD',
          stepId: 'movement',
          stepIndex: 0,
          totalSteps: 2,
          canSkip: true,
          controlHint: {
            label: 'Move',
            keys: ['W', 'A', 'S', 'D'],
            note: 'Reach the glowing marker.',
          },
        },
        promptHistorySnapshots: [
          {
            event: 'step_started',
            timestamp: now - 1000,
            stepId: 'movement',
            stepIndex: 0,
            totalSteps: 2,
            completedSteps: [],
            promptHistory: [],
          },
        ],
      },
    };

    const view = buildTutorialOverlayView(state);

    expect(view.visible).toBe(true);
    expect(view.prompt.controlHint.keys).toEqual(['W', 'A', 'S', 'D']);
    expect(view.telemetry.latestSnapshot).toBeDefined();
    expect(Array.isArray(view.telemetry.snapshots)).toBe(true);
    expect(view.telemetry.snapshots).toHaveLength(1);
  });
});
