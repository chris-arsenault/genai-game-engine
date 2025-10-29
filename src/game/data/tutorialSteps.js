/**
 * Tutorial Steps for The Memory Syndicate
 *
 * Defines the step-by-step tutorial sequence that teaches players
 * all investigation mechanics through the tutorial case.
 */

export const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Welcome, Detective',
    description:
      'Welcome to Mnemosynē City, Detective Voss. Your former partner Marcus has been found hollow. ' +
      'Use WASD to move and investigate the crime scene.',
    trigger: 'auto',
    completionCondition: (context) => {
      // Complete when player has moved (any input detected)
      return context.playerMoved || false;
    },
    highlight: { type: 'none' },
    canSkip: true,
    position: { x: 400, y: 100 },
    duration: null, // Stay until completed
  },

  {
    id: 'movement',
    title: 'Movement Controls',
    description: 'Use WASD keys to move Kira around the crime scene. Try moving to the evidence markers.',
    trigger: 'auto',
    completionCondition: (context) => {
      // Complete after 3 seconds of movement
      return context.movementTime >= 3000;
    },
    highlight: { type: 'none' },
    canSkip: true,
    position: { x: 400, y: 100 },
  },

  {
    id: 'evidence_detection',
    title: 'Evidence Detection',
    description:
      'Evidence items glow when you\'re nearby. Move close to the glowing markers to detect evidence.',
    trigger: 'event:evidence:detected',
    completionCondition: (context) => {
      return context.evidenceDetected > 0;
    },
    highlight: {
      type: 'entity',
      entityTag: 'evidence',
    },
    canSkip: false, // Core mechanic
    position: { x: 400, y: 100 },
  },

  {
    id: 'evidence_collection',
    title: 'Collect Evidence',
    description: 'Press E when near evidence to collect it. Collect the Neural Extractor Device.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.evidenceCollected > 0;
    },
    highlight: {
      type: 'entity',
      entityTag: 'evidence',
    },
    canSkip: false,
    position: { x: 400, y: 100 },
  },

  {
    id: 'clue_derivation',
    title: 'Clues Revealed',
    description:
      'Evidence reveals clues automatically. You\'ve discovered your first clue! ' +
      'Clues help you understand what happened.',
    trigger: 'event:clue:derived',
    completionCondition: (context) => {
      return context.cluesDerived > 0;
    },
    highlight: { type: 'none' },
    canSkip: false,
    position: { x: 400, y: 150 },
  },

  {
    id: 'detective_vision',
    title: 'Detective Vision',
    description:
      'Press V to activate Detective Vision. This reveals hidden evidence for 5 seconds. ' +
      'Use it wisely - it has a cooldown.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.detectiveVisionUsed || false;
    },
    highlight: { type: 'none' },
    canSkip: true,
    position: { x: 400, y: 100 },
  },

  {
    id: 'case_file',
    title: 'Case File',
    description:
      'Press Tab to open your Case File. This shows objectives, collected evidence, and discovered clues. ' +
      'Review your progress.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.caseFileOpened || false;
    },
    highlight: {
      type: 'ui',
      uiElement: 'case_file_button',
    },
    canSkip: true,
    position: { x: 400, y: 100 },
  },

  {
    id: 'collect_more_evidence',
    title: 'Collect All Evidence',
    description:
      'Continue investigating the scene. Collect at least 3 pieces of evidence to proceed.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.evidenceCollected >= 3;
    },
    highlight: {
      type: 'entity',
      entityTag: 'evidence',
    },
    canSkip: false,
    position: { x: 400, y: 100 },
  },

  {
    id: 'forensic_analysis',
    title: 'Forensic Analysis',
    description:
      'Some evidence requires forensic analysis to reveal hidden clues. ' +
      'Press F when prompted to analyze evidence.',
    trigger: 'event:forensic:available',
    completionCondition: (context) => {
      return context.forensicAnalysisComplete > 0;
    },
    highlight: { type: 'none' },
    canSkip: true,
    position: { x: 400, y: 100 },
  },

  {
    id: 'deduction_board_intro',
    title: 'Deduction Board',
    description:
      'Press B to open the Deduction Board. This is where you connect clues to solve the case. ' +
      'Drag clues to create connections.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.deductionBoardOpened || false;
    },
    highlight: {
      type: 'ui',
      uiElement: 'deduction_board_button',
    },
    canSkip: false,
    position: { x: 400, y: 100 },
  },

  {
    id: 'deduction_connections',
    title: 'Connect the Clues',
    description:
      'Click and drag from one clue to another to create a connection. ' +
      'Connect clues that support each other to build your theory.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.deductionConnectionsCreated > 0;
    },
    highlight: { type: 'none' },
    canSkip: false,
    position: { x: 400, y: 500 },
  },

  {
    id: 'deduction_validation',
    title: 'Validate Your Theory',
    description:
      'Once you\'ve connected the clues, click "Validate Theory" to test your deduction. ' +
      'You need 70% accuracy to solve the case.',
    trigger: 'auto',
    completionCondition: (context) => {
      return context.theoryValidated || false;
    },
    highlight: {
      type: 'ui',
      uiElement: 'validate_button',
    },
    canSkip: false,
    position: { x: 400, y: 500 },
  },

  {
    id: 'case_solved',
    title: 'Case Solved!',
    description:
      'Excellent work, Detective. You\'ve solved your first case. ' +
      'The evidence points to a professional operation targeting investigators. ' +
      'This is just the beginning...',
    trigger: 'event:case:completed',
    completionCondition: (context) => {
      return context.caseSolved || false;
    },
    highlight: { type: 'none' },
    canSkip: false,
    position: { x: 400, y: 200 },
    duration: 5000, // Show for 5 seconds then auto-complete
  },
];

/**
 * Tutorial completion rewards
 */
export const tutorialRewards = {
  experience: 100,
  credits: 250,
  abilitiesUnlocked: ['detective_vision', 'forensic_analysis'],
  achievementUnlocked: 'first_case_solved',
};

/**
 * Get tutorial step by ID
 * @param {string} stepId
 * @returns {Object|null}
 */
export function getTutorialStep(stepId) {
  return tutorialSteps.find(step => step.id === stepId) || null;
}

/**
 * Get next tutorial step
 * @param {string} currentStepId
 * @returns {Object|null}
 */
export function getNextTutorialStep(currentStepId) {
  const currentIndex = tutorialSteps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1 || currentIndex === tutorialSteps.length - 1) {
    return null;
  }
  return tutorialSteps[currentIndex + 1];
}

/**
 * Get tutorial progress percentage
 * @param {string} currentStepId
 * @returns {number} Percentage (0-100)
 */
export function getTutorialProgress(currentStepId) {
  const currentIndex = tutorialSteps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / tutorialSteps.length) * 100);
}
