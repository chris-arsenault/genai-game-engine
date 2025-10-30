/**
 * CaseManager
 *
 * Manages investigation cases, evidence collection, clue derivation, and case completion.
 * Coordinates with InvestigationSystem for core detective gameplay loop.
 *
 * @class CaseManager
 */
export class CaseManager {
  /**
   * Create a CaseManager
   * @param {EventBus} eventBus - Event system for communication
   */
  constructor(eventBus) {
    this.eventBus = eventBus;

    // Case storage
    this.cases = new Map(); // caseId -> CaseFile
    this.activeCase = null; // Currently active case ID

    // Evidence and clue databases
    this.evidenceDatabase = new Map(); // evidenceId -> Evidence definition
    this.clueDatabase = new Map(); // clueId -> Clue definition

    // Theory validation
    this.theoryGraphs = new Map(); // caseId -> correct theory graph

    // Listen for investigation events
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.eventBus.on('evidence:collected', (data) => {
      this.onEvidenceCollected(data);
    });

    this.eventBus.on('clue:derived', (data) => {
      this.onClueDerived(data);
    });
  }

  /**
   * Register full case data (definitions + case file) and optionally activate it.
   * @param {Object} caseData - Case configuration including evidence/clue definitions
   * @param {Object} [options]
   * @param {boolean} [options.activate=false] - Whether to set the case active after registration
   * @param {boolean} [options.overwrite=false] - Overwrite existing definitions if they exist
   * @returns {string} Case ID
   */
  registerCase(caseData = {}, options = {}) {
    const { activate = false, overwrite = false } = options;

    if (!caseData || typeof caseData.id !== 'string' || caseData.id.length === 0) {
      throw new Error('CaseManager.registerCase requires case data with a valid id');
    }

    const {
      evidence: evidenceDefinitions = [],
      clues: clueDefinitions = [],
      solution = null,
      ...caseDefinition
    } = caseData;

    if (Array.isArray(evidenceDefinitions)) {
      for (const evidence of evidenceDefinitions) {
        if (!evidence || typeof evidence.id !== 'string' || evidence.id.length === 0) {
          continue;
        }
        if (!overwrite && this.evidenceDatabase.has(evidence.id)) {
          continue;
        }
        this.evidenceDatabase.set(evidence.id, evidence);
      }
    }

    if (Array.isArray(clueDefinitions)) {
      for (const clue of clueDefinitions) {
        if (!clue || typeof clue.id !== 'string' || clue.id.length === 0) {
          continue;
        }
        if (!overwrite && this.clueDatabase.has(clue.id)) {
          continue;
        }
        this.clueDatabase.set(clue.id, clue);
      }
    }

    if (solution && typeof solution === 'object') {
      if (solution.rewards && !caseDefinition.rewards) {
        caseDefinition.rewards = solution.rewards;
      }
      if (
        typeof solution.minAccuracy === 'number' &&
        Number.isFinite(solution.minAccuracy) &&
        solution.minAccuracy > 0
      ) {
        caseDefinition.accuracyThreshold = caseDefinition.accuracyThreshold ?? solution.minAccuracy;
      }
    }

    const caseId = this.createCase(caseDefinition);

    if (caseDefinition.theoryGraph) {
      this.theoryGraphs.set(caseId, caseDefinition.theoryGraph);
    }

    if ((activate || options.setActive) && caseId) {
      this.setActiveCase(caseId);
    }

    return caseId;
  }

  /**
   * Create a new case
   * @param {Object} caseData - Case configuration
   * @returns {string} Case ID
   */
  createCase(caseData) {
    const {
      id,
      title = 'Untitled Case',
      description = '',
      objectives = [],
      evidenceIds = [],
      requiredClues = [],
      theoryGraph = null,
      accuracyThreshold = 0.7,
      rewards = {}
    } = caseData;

    if (this.cases.has(id)) {
      console.warn(`[CaseManager] Case ${id} already exists`);
      return id;
    }

    const caseFile = {
      id,
      title,
      description,
      objectives: objectives.map(obj => ({
        ...obj,
        completed: false
      })),
      status: 'active', // active, solved, failed

      // Evidence tracking
      evidenceIds: new Set(evidenceIds), // All evidence for this case
      collectedEvidence: new Set(), // Collected evidence

      // Clue tracking
      requiredClues: new Set(requiredClues), // Clues needed for completion
      discoveredClues: new Set(), // Clues player has found

      // Theory validation
      theoryGraph, // Correct theory structure
      playerTheory: { nodes: [], connections: [] }, // Player's current theory
      accuracyThreshold, // Minimum accuracy to solve (0.0-1.0)

      // Metadata
      startTime: Date.now(),
      solveTime: null,
      accuracy: 0,

      // Rewards
      rewards
    };

    this.cases.set(id, caseFile);

    this.eventBus.emit('case:created', {
      caseId: id,
      title,
      objectives: caseFile.objectives
    });

    console.log(`[CaseManager] Created case: ${title}`);
    return id;
  }

  /**
   * Set active case
   * @param {string} caseId - Case ID to activate
   * @returns {boolean} Success
   */
  setActiveCase(caseId) {
    const caseFile = this.cases.get(caseId);
    if (!caseFile) {
      console.error(`[CaseManager] Case not found: ${caseId}`);
      return false;
    }

    this.activeCase = caseId;

    this.eventBus.emit('case:activated', {
      caseId,
      title: caseFile.title,
      objectives: caseFile.objectives
    });

    console.log(`[CaseManager] Activated case: ${caseFile.title}`);
    return true;
  }

  /**
   * Retrieve evidence definition by id.
   * @param {string} evidenceId
   * @returns {Object|null}
   */
  getEvidenceDefinition(evidenceId) {
    if (typeof evidenceId !== 'string' || evidenceId.length === 0) {
      return null;
    }
    return this.evidenceDatabase.get(evidenceId) || null;
  }

  /**
   * Add evidence to case when collected
   * @param {Object} data - Evidence collection event data
   */
  onEvidenceCollected(data) {
    const { caseId, evidenceId } = data;
    const caseFile = this.cases.get(caseId);

    if (!caseFile) {
      console.warn(`[CaseManager] Evidence collected for unknown case: ${caseId}`);
      return;
    }

    // Add to collected evidence
    caseFile.collectedEvidence.add(evidenceId);

    // Check if objective completed
    this.checkObjectiveCompletion(caseId);

    console.log(`[CaseManager] Evidence added to case ${caseFile.title}: ${evidenceId}`);
  }

  /**
   * Handle clue derivation
   * @param {Object} data - Clue derivation event data
   */
  onClueDerived(data) {
    const { caseId, clueId } = data;
    const caseFile = this.cases.get(caseId);

    if (!caseFile) {
      console.warn(`[CaseManager] Clue derived for unknown case: ${caseId}`);
      return;
    }

    // Add to discovered clues
    caseFile.discoveredClues.add(clueId);

    // Check if objective completed
    this.checkObjectiveCompletion(caseId);

    console.log(`[CaseManager] Clue added to case ${caseFile.title}: ${clueId}`);
  }

  /**
   * Check if any objectives are completed
   * @param {string} caseId - Case ID
   */
  checkObjectiveCompletion(caseId) {
    const caseFile = this.cases.get(caseId);
    if (!caseFile) return;

    for (const objective of caseFile.objectives) {
      if (objective.completed) continue;

      // Check objective completion criteria
      let completed = false;

      switch (objective.type) {
        case 'collect_evidence':
          completed = this.checkEvidenceObjective(caseFile, objective);
          break;
        case 'discover_clue':
          completed = this.checkClueObjective(caseFile, objective);
          break;
        case 'collect_all_evidence':
          completed = caseFile.collectedEvidence.size === caseFile.evidenceIds.size;
          break;
        case 'discover_required_clues':
          completed = this.checkAllRequiredClues(caseFile);
          break;
        default:
          console.warn(`[CaseManager] Unknown objective type: ${objective.type}`);
      }

      if (completed) {
        objective.completed = true;

        this.eventBus.emit('case:objective_completed', {
          caseId,
          objective: objective.description
        });

        console.log(`[CaseManager] Objective completed: ${objective.description}`);
      }
    }

    // Check if all objectives completed
    if (caseFile.objectives.every(obj => obj.completed)) {
      this.eventBus.emit('case:objectives_complete', {
        caseId,
        title: caseFile.title
      });
    }
  }

  /**
   * Check evidence collection objective
   * @param {Object} caseFile
   * @param {Object} objective
   * @returns {boolean}
   */
  checkEvidenceObjective(caseFile, objective) {
    const required = objective.evidenceIds || [];
    return required.every(id => caseFile.collectedEvidence.has(id));
  }

  /**
   * Check clue discovery objective
   * @param {Object} caseFile
   * @param {Object} objective
   * @returns {boolean}
   */
  checkClueObjective(caseFile, objective) {
    const required = objective.clueIds || [];
    return required.every(id => caseFile.discoveredClues.has(id));
  }

  /**
   * Check if all required clues discovered
   * @param {Object} caseFile
   * @returns {boolean}
   */
  checkAllRequiredClues(caseFile) {
    if (caseFile.requiredClues.size === 0) return true;

    for (const clueId of caseFile.requiredClues) {
      if (!caseFile.discoveredClues.has(clueId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate player's theory against correct solution
   * @param {string} caseId - Case ID
   * @param {Object} playerTheory - Player's theory {nodes: [], connections: []}
   * @returns {Object} {valid: boolean, accuracy: number, feedback: string}
   */
  validateTheory(caseId, playerTheory) {
    const caseFile = this.cases.get(caseId);
    if (!caseFile) {
      return { valid: false, accuracy: 0, feedback: 'Case not found' };
    }

    if (!caseFile.theoryGraph) {
      console.warn(`[CaseManager] No theory graph defined for case: ${caseId}`);
      return { valid: true, accuracy: 1.0, feedback: 'No validation required' };
    }

    // Calculate accuracy
    const accuracy = this.calculateTheoryAccuracy(playerTheory, caseFile.theoryGraph);

    // Update case file
    caseFile.playerTheory = playerTheory;
    caseFile.accuracy = accuracy;

    // Check if accuracy meets threshold
    const valid = accuracy >= caseFile.accuracyThreshold;

    if (valid) {
      this.solveCase(caseId, accuracy);
    }

    this.eventBus.emit('theory:validated', {
      caseId,
      accuracy,
      valid,
      threshold: caseFile.accuracyThreshold
    });

    return {
      valid,
      accuracy,
      feedback: this.generateTheoryFeedback(accuracy, caseFile.accuracyThreshold)
    };
  }

  /**
   * Calculate theory accuracy
   * @param {Object} playerTheory
   * @param {Object} correctTheory
   * @returns {number} Accuracy (0.0 to 1.0)
   */
  calculateTheoryAccuracy(playerTheory, correctTheory) {
    // Simple graph matching algorithm
    // In a full implementation, this would be more sophisticated

    const correctConnections = new Set(
      correctTheory.connections.map(c => `${c.from}:${c.to}:${c.type}`)
    );

    const playerConnections = new Set(
      playerTheory.connections.map(c => `${c.from}:${c.to}:${c.type}`)
    );

    if (correctConnections.size === 0) {
      return 1.0;
    }

    // Count matches
    let matches = 0;
    for (const conn of playerConnections) {
      if (correctConnections.has(conn)) {
        matches++;
      }
    }

    // Calculate accuracy
    // Penalize for missing connections and incorrect connections
    const precision = playerConnections.size > 0 ? matches / playerConnections.size : 0;
    const recall = matches / correctConnections.size;

    // F1 score
    if (precision + recall === 0) return 0;
    const accuracy = (2 * precision * recall) / (precision + recall);

    return Math.max(0, Math.min(1, accuracy));
  }

  /**
   * Generate feedback based on accuracy
   * @param {number} accuracy
   * @param {number} threshold
   * @returns {string}
   */
  generateTheoryFeedback(accuracy, threshold) {
    if (accuracy >= threshold) {
      return 'Your theory is sound. The pieces fit together.';
    } else if (accuracy >= threshold * 0.8) {
      return 'You are close, but some connections do not hold up.';
    } else if (accuracy >= threshold * 0.5) {
      return 'Your theory has some merit, but critical evidence is missing or misinterpreted.';
    } else {
      return 'This theory does not fit the evidence. Reexamine the clues.';
    }
  }

  /**
   * Solve a case
   * @param {string} caseId - Case ID
   * @param {number} accuracy - Solution accuracy (0.0 to 1.0)
   */
  solveCase(caseId, accuracy) {
    const caseFile = this.cases.get(caseId);
    if (!caseFile) return;

    if (caseFile.status === 'solved') {
      console.warn(`[CaseManager] Case already solved: ${caseId}`);
      return;
    }

    caseFile.status = 'solved';
    caseFile.solveTime = Date.now() - caseFile.startTime;
    caseFile.accuracy = accuracy;

    this.eventBus.emit('case:solved', {
      caseId,
      title: caseFile.title,
      accuracy,
      timeTaken: caseFile.solveTime,
      evidenceCollected: caseFile.collectedEvidence.size,
      rewards: caseFile.rewards
    });

    this.eventBus.emit('case:completed', {
      caseId,
      title: caseFile.title,
      accuracy,
      rewards: caseFile.rewards
    });

    console.log(`[CaseManager] Case solved: ${caseFile.title} (${(accuracy * 100).toFixed(0)}% accuracy)`);
  }

  /**
   * Get case file
   * @param {string} caseId - Case ID
   * @returns {Object|null} Case file
   */
  getCase(caseId) {
    return this.cases.get(caseId) || null;
  }

  /**
   * Get active case
   * @returns {Object|null} Active case file
   */
  getActiveCase() {
    return this.activeCase ? this.cases.get(this.activeCase) : null;
  }

  /**
   * Get all cases
   * @returns {Map} All cases
   */
  getAllCases() {
    return this.cases;
  }

  /**
   * Get case progress
   * @param {string} caseId - Case ID
   * @returns {Object} Progress summary
   */
  getCaseProgress(caseId) {
    const caseFile = this.cases.get(caseId);
    if (!caseFile) return null;

    return {
      caseId,
      title: caseFile.title,
      status: caseFile.status,
      evidenceCollected: caseFile.collectedEvidence.size,
      totalEvidence: caseFile.evidenceIds.size,
      cluesDiscovered: caseFile.discoveredClues.size,
      totalClues: caseFile.requiredClues.size,
      objectivesCompleted: caseFile.objectives.filter(obj => obj.completed).length,
      totalObjectives: caseFile.objectives.length,
      accuracy: caseFile.accuracy
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.cases.clear();
    this.evidenceDatabase.clear();
    this.clueDatabase.clear();
    this.theoryGraphs.clear();
  }
}
