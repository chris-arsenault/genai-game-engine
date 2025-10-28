/**
 * TutorialSystem
 *
 * Orchestrates the tutorial sequence, managing step progression,
 * completion tracking, and integration with game systems.
 *
 * Priority: 5 (early in update loop, before most game systems)
 */

import { System } from '../../engine/ecs/System.js';
import { tutorialSteps, getTutorialStep, getNextTutorialStep } from '../data/tutorialSteps.js';

const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
let injectedLocalStorage = null;

if (isTestEnvironment && typeof global !== 'undefined') {
  const descriptor = Object.getOwnPropertyDescriptor(global, 'localStorage');

  if (!descriptor || descriptor.configurable) {
    const originalGetter = descriptor?.get;
    const originalSetter = descriptor?.set;
    const originalValue = descriptor?.value;

    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      get() {
        if (injectedLocalStorage !== null) {
          return injectedLocalStorage;
        }
        if (originalGetter) {
          return originalGetter.call(this);
        }
        return originalValue;
      },
      set(value) {
        injectedLocalStorage = value;
        if (originalSetter) {
          originalSetter.call(this, value);
        }
      }
    });
  }
}

export class TutorialSystem extends System {
  constructor(componentRegistry, eventBus, storage = undefined) {
    super(componentRegistry, eventBus, []);
    this.priority = 5;

    const resolvedStorage =
      storage ??
      (typeof global !== 'undefined' && typeof global.localStorage !== 'undefined'
        ? global.localStorage
        : undefined) ??
      (typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
        ? globalThis.localStorage
        : null);

    this.storage = resolvedStorage;

    // Tutorial state
    // Note: this.enabled is inherited from System base class
    // We override it here to control tutorial activation
    this.currentStep = null;
    this.currentStepIndex = -1;
    this.completedSteps = new Set();
    this.skipped = false;

    // Context tracking for completion conditions
    this.context = {
      playerMoved: false,
      movementTime: 0,
      evidenceDetected: 0,
      evidenceCollected: 0,
      cluesDerived: 0,
      detectiveVisionUsed: false,
      caseFileOpened: false,
      forensicAnalysisComplete: 0,
      deductionBoardOpened: false,
      deductionConnectionsCreated: 0,
      theoryValidated: false,
      caseSolved: false,
    };

    // Step timers
    this.stepStartTime = 0;
    this.stepDuration = 0;
  }

  /**
   * Initialize system
   */
  init() {
    // Check if tutorial should be shown
    this.enabled = this.shouldShowTutorial();

    if (this.enabled) {
      console.log('[TutorialSystem] Tutorial enabled');
      this.startTutorial();
    } else {
      console.log('[TutorialSystem] Tutorial disabled (already completed)');
    }

    // Subscribe to game events for context tracking
    this.subscribeToEvents();
  }

  /**
   * Check if tutorial should be shown
   * @returns {boolean}
   */
  shouldShowTutorial() {
    const [storage] = this._getStorageCandidates();
    // Check localStorage for tutorial completion
    const completed = storage?.getItem('tutorial_completed');
    const skipped = storage?.getItem('tutorial_skipped');

    return !completed && !skipped;
  }

  /**
   * Start the tutorial sequence
   */
  startTutorial() {
    this.enabled = true;
    this.currentStepIndex = 0;
    this.currentStep = tutorialSteps[0];
    this.stepStartTime = Date.now();

    this.eventBus.emit('tutorial:started', {
      totalSteps: tutorialSteps.length,
      startedAt: this.stepStartTime,
    });

    this.startStep(this.currentStep);
  }

  /**
   * Start a specific tutorial step
   * @param {Object} step
   */
  startStep(step) {
    if (!step) return;

    this.currentStep = step;
    this.stepStartTime = Date.now();
    this.stepDuration = step.duration || 0;
    const startedAt = this.stepStartTime;

    this.eventBus.emit('tutorial:step_started', {
      stepId: step.id,
      stepIndex: this.currentStepIndex,
      totalSteps: tutorialSteps.length,
      title: step.title,
      description: step.description,
      highlight: step.highlight,
      position: step.position,
      canSkip: step.canSkip,
      startedAt,
    });

    console.log(`[TutorialSystem] Started step: ${step.id} (${this.currentStepIndex + 1}/${tutorialSteps.length})`);
  }

  /**
   * Complete the current step and advance
   */
  completeStep() {
    if (!this.currentStep) return;

    const stepId = this.currentStep.id;
    this.completedSteps.add(stepId);

    const completedAt = Date.now();
    this.eventBus.emit('tutorial:step_completed', {
      stepId,
      stepIndex: this.currentStepIndex,
      totalSteps: tutorialSteps.length,
      completedAt,
      durationMs: completedAt - this.stepStartTime,
    });

    console.log(`[TutorialSystem] Completed step: ${stepId}`);

    // Check if tutorial is complete
    if (this.currentStepIndex >= tutorialSteps.length - 1) {
      this.completeTutorial();
      return;
    }

    // Advance to next step
    this.currentStepIndex++;
    this.currentStep = tutorialSteps[this.currentStepIndex];
    this.startStep(this.currentStep);
  }

  /**
   * Skip the entire tutorial
   */
  skipTutorial() {
    if (!this.enabled) return;

    this.skipped = true;
    this.enabled = false;

    // Save skip preference
    const storages = this._getStorageCandidates();
    for (const storage of storages) {
      storage.setItem?.('tutorial_skipped', 'true');
    }

    this.eventBus.emit('tutorial:skipped', {
      stepId: this.currentStep?.id,
      stepIndex: this.currentStepIndex,
      skippedAt: Date.now(),
    });

    console.log('[TutorialSystem] Tutorial skipped');
  }

  /**
   * Complete the tutorial
   */
  completeTutorial() {
    this.enabled = false;

    // Save completion
    const storages = this._getStorageCandidates();
    for (const storage of storages) {
      storage.setItem?.('tutorial_completed', 'true');
    }

    this.eventBus.emit('tutorial:completed', {
      totalSteps: tutorialSteps.length,
      completedSteps: this.completedSteps.size,
      completedAt: Date.now(),
    });

    console.log('[TutorialSystem] Tutorial completed!');
  }

  /**
   * Subscribe to game events for context tracking
   */
  subscribeToEvents() {
    // Movement tracking
    this.eventBus.subscribe('player:moved', () => {
      this.context.playerMoved = true;
    });

    // Evidence events
    this.eventBus.subscribe('evidence:detected', () => {
      this.context.evidenceDetected++;
    });

    this.eventBus.subscribe('evidence:collected', () => {
      this.context.evidenceCollected++;
    });

    // Clue events
    this.eventBus.subscribe('clue:derived', () => {
      this.context.cluesDerived++;
    });

    // Ability events
    this.eventBus.subscribe('ability:activated', (data) => {
      if (data.abilityId === 'detective_vision') {
        this.context.detectiveVisionUsed = true;
      }
    });

    // UI events
    this.eventBus.subscribe('case_file:opened', () => {
      this.context.caseFileOpened = true;
    });

    this.eventBus.subscribe('deduction_board:opened', () => {
      this.context.deductionBoardOpened = true;
    });

    this.eventBus.subscribe('deduction_board:connection_created', () => {
      this.context.deductionConnectionsCreated++;
    });

    // Forensic events
    this.eventBus.subscribe('forensic:complete', () => {
      this.context.forensicAnalysisComplete++;
    });

    // Case events
    this.eventBus.subscribe('case:theory_validated', () => {
      this.context.theoryValidated = true;
    });

    this.eventBus.subscribe('case:completed', () => {
      this.context.caseSolved = true;
    });

    // Quest integration events - sync tutorial with Case 001 quest
    this.eventBus.subscribe('quest:started', (data) => {
      if (data.questId === 'case_001_hollow_case') {
        console.log('[TutorialSystem] Case 001 quest started - tutorial active');
      }
    });

    this.eventBus.subscribe('quest:objective_completed', (data) => {
      if (data.questId === 'case_001_hollow_case') {
        console.log(`[TutorialSystem] Quest objective completed: ${data.objectiveId}`);
        // Tutorial steps will progress naturally via game events
      }
    });

    this.eventBus.subscribe('quest:completed', (data) => {
      if (data.questId === 'case_001_hollow_case' && this.enabled) {
        console.log('[TutorialSystem] Case 001 completed - completing tutorial');
        this.completeTutorial();
      }
    });

    // Skip input (Esc key)
    this.eventBus.subscribe('input:escape', () => {
      if (this.enabled && this.currentStep?.canSkip) {
        this.skipTutorial();
      }
    });
  }

  /**
   * Update tutorial system
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    if (!this.enabled || !this.currentStep) return;

    // Track movement time for movement tutorial
    if (this.currentStep.id === 'movement' && this.context.playerMoved) {
      this.context.movementTime += deltaTime * 1000; // Convert to ms
    }

    // Check step completion condition
    if (this.currentStep.completionCondition) {
      const isComplete = this.currentStep.completionCondition(this.context);

      if (isComplete) {
        // Auto-complete after duration if specified
        if (this.stepDuration > 0) {
          const elapsed = Date.now() - this.stepStartTime;
          if (elapsed >= this.stepDuration) {
            this.completeStep();
          }
        } else {
          this.completeStep();
        }
      }
    }
  }

  /**
   * Get current tutorial progress
   * @returns {Object}
   */
  getProgress() {
    return {
      enabled: this.enabled,
      currentStep: this.currentStep?.id,
      currentStepIndex: this.currentStepIndex,
      totalSteps: tutorialSteps.length,
      completedSteps: this.completedSteps.size,
      progress: this.currentStepIndex / tutorialSteps.length,
    };
  }

  /**
   * Reset tutorial (for testing)
   */
  reset() {
    const storages = this._getStorageCandidates();
    for (const storage of storages) {
      storage.removeItem?.('tutorial_completed');
      storage.removeItem?.('tutorial_skipped');
    }
    this.enabled = false;
    this.currentStep = null;
    this.currentStepIndex = -1;
    this.completedSteps.clear();
    this.skipped = false;

    // Reset context
    this.context = {
      playerMoved: false,
      movementTime: 0,
      evidenceDetected: 0,
      evidenceCollected: 0,
      cluesDerived: 0,
      detectiveVisionUsed: false,
      caseFileOpened: false,
      forensicAnalysisComplete: 0,
      deductionBoardOpened: false,
      deductionConnectionsCreated: 0,
      theoryValidated: false,
      caseSolved: false,
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Unsubscribe from events if needed
    this.enabled = false;
  }

  _getStorageCandidates() {
    const set = new Set();

    if (this.storage) {
      set.add(this.storage);
    }

    if (typeof global !== 'undefined' && typeof global.localStorage !== 'undefined') {
      set.add(global.localStorage);
    }

    if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined') {
      set.add(globalThis.localStorage);
    }

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      set.add(window.localStorage);
    }

    return Array.from(set).filter((candidate) =>
      candidate && typeof candidate.removeItem === 'function'
    );
  }
}
