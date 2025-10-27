/**
 * TutorialSystem Tests
 *
 * Comprehensive test coverage for tutorial step progression, completion conditions,
 * context tracking, persistence, and event emissions.
 */

import { TutorialSystem } from '../../../src/game/systems/TutorialSystem.js';
import { tutorialSteps } from '../../../src/game/data/tutorialSteps.js';

describe('TutorialSystem', () => {
  let tutorialSystem;
  let mockEventBus;
  let mockComponentRegistry;
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage with proper initialization
    const store = {};
    localStorageMock = {
      store,
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    };
    global.localStorage = localStorageMock;

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock ComponentRegistry
    mockComponentRegistry = {};

    tutorialSystem = new TutorialSystem(mockComponentRegistry, mockEventBus);
  });

  afterEach(() => {
    tutorialSystem.cleanup();
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with tutorial not started', () => {
      expect(tutorialSystem.enabled).toBe(false);
      expect(tutorialSystem.currentStep).toBeNull();
      expect(tutorialSystem.currentStepIndex).toBe(-1);
      expect(tutorialSystem.completedSteps.size).toBe(0);
      expect(tutorialSystem.skipped).toBe(false);
    });

    it('should start tutorial if not previously completed', () => {
      tutorialSystem.init();

      expect(tutorialSystem.enabled).toBe(true);
      expect(tutorialSystem.currentStep).toBe(tutorialSteps[0]);
      expect(tutorialSystem.currentStepIndex).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:started',
        expect.objectContaining({
          totalSteps: tutorialSteps.length,
        })
      );
    });

    it('should not start if tutorial was previously completed', () => {
      localStorage.setItem('tutorial_completed', 'true');

      tutorialSystem.init();

      expect(tutorialSystem.enabled).toBe(false);
      expect(tutorialSystem.currentStep).toBeNull();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('tutorial:started', expect.anything());
    });

    it('should not start if tutorial was previously skipped', () => {
      localStorage.setItem('tutorial_skipped', 'true');

      tutorialSystem.init();

      expect(tutorialSystem.enabled).toBe(false);
      expect(tutorialSystem.currentStep).toBeNull();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('tutorial:started', expect.anything());
    });

    it('should load saved tutorial state from localStorage', () => {
      localStorage.setItem('tutorial_completed', 'true');

      const shouldShow = tutorialSystem.shouldShowTutorial();

      expect(shouldShow).toBe(false);
    });

    it('should subscribe to all necessary events on init', () => {
      tutorialSystem.init();

      // Verify key event subscriptions
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('player:moved', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('evidence:detected', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('evidence:collected', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('clue:derived', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('ability:activated', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('case_file:opened', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('deduction_board:opened', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('input:escape', expect.any(Function));
    });
  });

  describe('Step Progression', () => {
    beforeEach(() => {
      tutorialSystem.init();
      mockEventBus.emit.mockClear();
    });

    it('should start tutorial with first step', () => {
      expect(tutorialSystem.currentStepIndex).toBe(0);
      expect(tutorialSystem.currentStep.id).toBe('welcome');
    });

    it('should emit step_started event when starting new step', () => {
      tutorialSystem.startStep(tutorialSteps[1]);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:step_started',
        expect.objectContaining({
          stepId: tutorialSteps[1].id,
          title: tutorialSteps[1].title,
          description: tutorialSteps[1].description,
          highlight: tutorialSteps[1].highlight,
          position: tutorialSteps[1].position,
          canSkip: tutorialSteps[1].canSkip,
        })
      );
    });

    it('should progress to next step when current step completes', () => {
      const firstStepId = tutorialSystem.currentStep.id;

      tutorialSystem.completeStep();

      expect(tutorialSystem.completedSteps.has(firstStepId)).toBe(true);
      expect(tutorialSystem.currentStepIndex).toBe(1);
      expect(tutorialSystem.currentStep.id).toBe('movement');
    });

    it('should not progress if step not completed', () => {
      const initialStep = tutorialSystem.currentStep;
      const initialIndex = tutorialSystem.currentStepIndex;

      // Don't call completeStep, just update
      tutorialSystem.update(0.016);

      expect(tutorialSystem.currentStep).toBe(initialStep);
      expect(tutorialSystem.currentStepIndex).toBe(initialIndex);
    });

    it('should emit step_completed event when completing step', () => {
      const stepId = tutorialSystem.currentStep.id;

      tutorialSystem.completeStep();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:step_completed',
        expect.objectContaining({
          stepId,
          stepIndex: 0,
          totalSteps: tutorialSteps.length,
        })
      );
    });

    it('should complete tutorial when reaching last step', () => {
      // Advance to last step
      tutorialSystem.currentStepIndex = tutorialSteps.length - 1;
      tutorialSystem.currentStep = tutorialSteps[tutorialSteps.length - 1];

      tutorialSystem.completeStep();

      expect(tutorialSystem.enabled).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:completed',
        expect.objectContaining({
          totalSteps: tutorialSteps.length,
          completedSteps: 1,
        })
      );
    });

    it('should handle null step gracefully', () => {
      tutorialSystem.currentStep = null;

      expect(() => {
        tutorialSystem.completeStep();
      }).not.toThrow();
    });
  });

  describe('Completion Conditions', () => {
    beforeEach(() => {
      tutorialSystem.init();
      mockEventBus.emit.mockClear();
    });

    it('should complete welcome step when player moves', () => {
      tutorialSystem.context.playerMoved = true;

      tutorialSystem.update(0.016);

      // Welcome step should auto-complete when condition is met
      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete movement step after 3 seconds of movement', () => {
      // Progress to movement step
      tutorialSystem.completeStep();
      mockEventBus.emit.mockClear();

      tutorialSystem.context.playerMoved = true;
      tutorialSystem.context.movementTime = 3000;

      tutorialSystem.update(0.016);

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete evidence detection step when evidence detected', () => {
      // Find the evidence detection step
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'evidence_detection');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.evidenceDetected = 1;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete evidence collection step when evidence collected', () => {
      // Find the evidence collection step
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'evidence_collection');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.evidenceCollected = 1;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete clue derivation step when clues derived', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'clue_derivation');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.cluesDerived = 1;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete detective vision step when ability activated', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'detective_vision');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.detectiveVisionUsed = true;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete case file step when case file opened', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'case_file');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.caseFileOpened = true;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete collect more evidence step when 3+ evidence collected', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'collect_more_evidence');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.evidenceCollected = 3;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete forensic analysis step when analysis complete', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'forensic_analysis');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.forensicAnalysisComplete = 1;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete deduction board intro step when board opened', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'deduction_board_intro');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.deductionBoardOpened = true;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete deduction connections step when connections created', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'deduction_connections');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.deductionConnectionsCreated = 1;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete deduction validation step when theory validated', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'deduction_validation');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.theoryValidated = true;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });

    it('should complete case solved step when case solved', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'case_solved');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      tutorialSystem.context.caseSolved = true;

      expect(tutorialSystem.currentStep.completionCondition(tutorialSystem.context)).toBe(true);
    });
  });

  describe('Context Tracking', () => {
    beforeEach(() => {
      tutorialSystem.init();
      // Get event subscription callbacks
      tutorialSystem.subscribeToEvents();
    });

    it('should track player movement', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'player:moved'
      )[1];

      callback();

      expect(tutorialSystem.context.playerMoved).toBe(true);
    });

    it('should track evidence detected count', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'evidence:detected'
      )[1];

      callback();
      callback();

      expect(tutorialSystem.context.evidenceDetected).toBe(2);
    });

    it('should track evidence collected count', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'evidence:collected'
      )[1];

      callback();
      callback();
      callback();

      expect(tutorialSystem.context.evidenceCollected).toBe(3);
    });

    it('should track clues derived count', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'clue:derived'
      )[1];

      callback();

      expect(tutorialSystem.context.cluesDerived).toBe(1);
    });

    it('should track detective vision activation', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'ability:activated'
      )[1];

      callback({ abilityId: 'detective_vision' });

      expect(tutorialSystem.context.detectiveVisionUsed).toBe(true);
    });

    it('should not track other ability activations', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'ability:activated'
      )[1];

      callback({ abilityId: 'other_ability' });

      expect(tutorialSystem.context.detectiveVisionUsed).toBe(false);
    });

    it('should track case file opened', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'case_file:opened'
      )[1];

      callback();

      expect(tutorialSystem.context.caseFileOpened).toBe(true);
    });

    it('should track deduction board opened', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'deduction_board:opened'
      )[1];

      callback();

      expect(tutorialSystem.context.deductionBoardOpened).toBe(true);
    });

    it('should track deduction connections created count', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'deduction_board:connection_created'
      )[1];

      callback();
      callback();

      expect(tutorialSystem.context.deductionConnectionsCreated).toBe(2);
    });

    it('should track forensic analysis complete count', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'forensic:complete'
      )[1];

      callback();

      expect(tutorialSystem.context.forensicAnalysisComplete).toBe(1);
    });

    it('should track theory validation', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'case:theory_validated'
      )[1];

      callback();

      expect(tutorialSystem.context.theoryValidated).toBe(true);
    });

    it('should track case solved', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'case:completed'
      )[1];

      callback();

      expect(tutorialSystem.context.caseSolved).toBe(true);
    });
  });

  describe('Skip Functionality', () => {
    beforeEach(() => {
      tutorialSystem.init();
      mockEventBus.emit.mockClear();
    });

    it('should skip tutorial when ESC pressed on skippable step', () => {
      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'input:escape'
      )[1];

      callback();

      expect(tutorialSystem.skipped).toBe(true);
      expect(tutorialSystem.enabled).toBe(false);
    });

    it('should emit tutorial:skipped event', () => {
      tutorialSystem.skipTutorial();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:skipped',
        expect.objectContaining({
          stepId: tutorialSystem.currentStep?.id,
          stepIndex: tutorialSystem.currentStepIndex,
        })
      );
    });

    it('should save skip status to localStorage', () => {
      tutorialSystem.skipTutorial();

      expect(localStorage.setItem).toHaveBeenCalledWith('tutorial_skipped', 'true');
      expect(localStorage.getItem('tutorial_skipped')).toBe('true');
    });

    it('should not skip if tutorial not enabled', () => {
      tutorialSystem.enabled = false;

      tutorialSystem.skipTutorial();

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('tutorial:skipped', expect.anything());
    });

    it('should not skip on ESC if current step is not skippable', () => {
      // Find non-skippable step
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => !s.canSkip);
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];

      const callback = mockEventBus.subscribe.mock.calls.find(
        call => call[0] === 'input:escape'
      )[1];

      callback();

      expect(tutorialSystem.skipped).toBe(false);
      expect(tutorialSystem.enabled).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should save completion to localStorage', () => {
      tutorialSystem.init();
      tutorialSystem.currentStepIndex = tutorialSteps.length - 1;
      tutorialSystem.currentStep = tutorialSteps[tutorialSteps.length - 1];

      tutorialSystem.completeTutorial();

      expect(localStorage.setItem).toHaveBeenCalledWith('tutorial_completed', 'true');
    });

    it('should load completion status on init', () => {
      localStorage.setItem('tutorial_completed', 'true');

      tutorialSystem.init();

      expect(tutorialSystem.enabled).toBe(false);
    });

    it('should load skip status on init', () => {
      localStorage.setItem('tutorial_skipped', 'true');

      tutorialSystem.init();

      expect(tutorialSystem.enabled).toBe(false);
    });
  });

  describe('Event Emissions', () => {
    beforeEach(() => {
      tutorialSystem.init();
      mockEventBus.emit.mockClear();
    });

    it('should emit tutorial:started event with correct data', () => {
      tutorialSystem.startTutorial();

      expect(mockEventBus.emit).toHaveBeenCalledWith('tutorial:started', {
        totalSteps: tutorialSteps.length,
      });
    });

    it('should emit tutorial:step_started event with complete step data', () => {
      const step = tutorialSteps[1];
      tutorialSystem.startStep(step);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:step_started',
        expect.objectContaining({
          stepId: step.id,
          title: step.title,
          description: step.description,
          highlight: step.highlight,
          position: step.position,
          canSkip: step.canSkip,
        })
      );
    });

    it('should emit tutorial:step_completed event with progress info', () => {
      tutorialSystem.completeStep();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:step_completed',
        expect.objectContaining({
          stepIndex: 0,
          totalSteps: tutorialSteps.length,
        })
      );
    });

    it('should emit tutorial:completed event with stats', () => {
      tutorialSystem.currentStepIndex = tutorialSteps.length - 1;
      tutorialSystem.currentStep = tutorialSteps[tutorialSteps.length - 1];

      tutorialSystem.completeTutorial();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:completed',
        expect.objectContaining({
          totalSteps: tutorialSteps.length,
          completedSteps: expect.any(Number),
        })
      );
    });

    it('should emit tutorial:skipped event with current step info', () => {
      tutorialSystem.skipTutorial();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:skipped',
        expect.objectContaining({
          stepId: expect.any(String),
          stepIndex: expect.any(Number),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle skipping mid-tutorial', () => {
      tutorialSystem.init();
      tutorialSystem.completeStep();
      tutorialSystem.completeStep();

      expect(tutorialSystem.currentStepIndex).toBe(2);

      tutorialSystem.skipTutorial();

      expect(tutorialSystem.enabled).toBe(false);
      expect(tutorialSystem.skipped).toBe(true);
    });

    it('should handle update when not enabled', () => {
      expect(() => {
        tutorialSystem.update(0.016);
      }).not.toThrow();
    });

    it('should handle update with no current step', () => {
      tutorialSystem.enabled = true;
      tutorialSystem.currentStep = null;
      tutorialSystem.currentStepIndex = -1;

      expect(() => {
        tutorialSystem.update(0.016);
      }).not.toThrow();
    });

    it('should track movement time for movement step', () => {
      tutorialSystem.init();
      tutorialSystem.completeStep(); // Move to movement step

      tutorialSystem.context.playerMoved = true;
      tutorialSystem.update(0.016);

      expect(tutorialSystem.context.movementTime).toBeGreaterThan(0);
    });

    it('should not track movement time for non-movement steps', () => {
      tutorialSystem.init();

      tutorialSystem.context.playerMoved = true;
      const initialTime = tutorialSystem.context.movementTime;

      tutorialSystem.update(0.016);

      expect(tutorialSystem.context.movementTime).toBe(initialTime);
    });

    it('should handle step with duration delay', () => {
      // Use case_solved step which has a 5000ms duration
      tutorialSystem.init();
      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'case_solved');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];
      tutorialSystem.context.caseSolved = true;

      // Set step start time to simulate duration not yet passed
      tutorialSystem.stepStartTime = Date.now();
      tutorialSystem.stepDuration = 5000;

      tutorialSystem.update(0.016);

      // Should not complete yet
      expect(tutorialSystem.currentStep.id).toBe('case_solved');
    });

    it('should auto-complete step after duration passes', () => {
      tutorialSystem.init();
      mockEventBus.emit.mockClear();

      tutorialSystem.currentStepIndex = tutorialSteps.findIndex(s => s.id === 'case_solved');
      tutorialSystem.currentStep = tutorialSteps[tutorialSystem.currentStepIndex];
      tutorialSystem.context.caseSolved = true;

      // Set step start time to simulate duration passed
      tutorialSystem.stepStartTime = Date.now() - 6000; // 6 seconds ago
      tutorialSystem.stepDuration = 5000;

      tutorialSystem.update(0.016);

      // Since case_solved is the last step, it should complete tutorial
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'tutorial:completed',
        expect.any(Object)
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should return accurate progress information', () => {
      tutorialSystem.init();

      const progress = tutorialSystem.getProgress();

      expect(progress).toEqual({
        enabled: true,
        currentStep: 'welcome',
        currentStepIndex: 0,
        totalSteps: tutorialSteps.length,
        completedSteps: 0,
        progress: 0,
      });
    });

    it('should update progress as steps complete', () => {
      tutorialSystem.init();

      tutorialSystem.completeStep();
      tutorialSystem.completeStep();

      const progress = tutorialSystem.getProgress();

      expect(progress.currentStepIndex).toBe(2);
      expect(progress.completedSteps).toBe(2);
      expect(progress.progress).toBeCloseTo(2 / tutorialSteps.length);
    });

    it('should show correct progress when disabled', () => {
      tutorialSystem.init();
      tutorialSystem.enabled = false;

      const progress = tutorialSystem.getProgress();

      expect(progress.enabled).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all tutorial state', () => {
      tutorialSystem.init();
      tutorialSystem.context.playerMoved = true;
      tutorialSystem.context.evidenceCollected = 5;
      tutorialSystem.completeStep();

      tutorialSystem.reset();

      expect(tutorialSystem.enabled).toBe(false);
      expect(tutorialSystem.currentStep).toBeNull();
      expect(tutorialSystem.currentStepIndex).toBe(-1);
      expect(tutorialSystem.completedSteps.size).toBe(0);
      expect(tutorialSystem.skipped).toBe(false);
      expect(tutorialSystem.context.playerMoved).toBe(false);
      expect(tutorialSystem.context.evidenceCollected).toBe(0);
    });

    it('should clear localStorage on reset', () => {
      // Set values directly in the store
      localStorageMock.store['tutorial_completed'] = 'true';
      localStorageMock.store['tutorial_skipped'] = 'true';

      tutorialSystem.reset();

      // Verify removeItem was called
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tutorial_completed');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tutorial_skipped');
    });
  });

  describe('Cleanup', () => {
    it('should disable tutorial on cleanup', () => {
      tutorialSystem.init();

      tutorialSystem.cleanup();

      expect(tutorialSystem.enabled).toBe(false);
    });

    it('should not throw on cleanup when not initialized', () => {
      expect(() => {
        tutorialSystem.cleanup();
      }).not.toThrow();
    });
  });
});
