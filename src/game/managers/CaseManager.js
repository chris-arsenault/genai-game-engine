/**
 * CaseManager
 *
 * Manages investigation cases, evidence collection, clue derivation, and case completion.
 * Coordinates with InvestigationSystem for core detective gameplay loop.
 *
 * @class CaseManager
 */
import { TheoryValidator } from '../data/TheoryValidator.js';

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
    this.theoryValidator = new TheoryValidator();

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
      alternateTheoryGraphs = [],
      theoryGraphs = null,
      accuracyThreshold = 0.7,
      rewards = {},
      scene = null,
      witnesses: witnessDefinitions = [],
      tutorial: tutorialMetadata = null,
      allowedConnectionTypes = null,
      optionalClueIds = [],
      narrative = null,
      hintOverrides = null
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
      alternateTheoryGraphs: Array.isArray(alternateTheoryGraphs)
        ? alternateTheoryGraphs.map((graph) => ({ ...graph }))
        : [],
      theoryGraphs: Array.isArray(theoryGraphs)
        ? theoryGraphs.map((graph) => ({ ...graph }))
        : [],
      allowedConnectionTypes: Array.isArray(allowedConnectionTypes)
        ? Array.from(new Set(allowedConnectionTypes.filter((type) => typeof type === 'string')))
        : null,
      optionalClueIds: Array.isArray(optionalClueIds)
        ? Array.from(new Set(optionalClueIds.filter((idValue) => typeof idValue === 'string')))
        : [],

      // Metadata
      startTime: Date.now(),
      solveTime: null,
      accuracy: 0,

      // Rewards
      rewards,

      // Scene metadata
      scene: scene ? { ...scene } : null,

      // Witness definitions (tutorial interactions)
      witnesses: Array.isArray(witnessDefinitions)
        ? witnessDefinitions.map((witness) => ({ ...witness }))
        : [],

      // Tutorial metadata snapshot
      tutorial: tutorialMetadata ? { ...tutorialMetadata } : null,
      narrative: narrative ? { ...narrative } : null,
      hintOverrides: hintOverrides ? { ...hintOverrides } : null
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

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'caseEvidencePulse',
      origin: 'case',
      caseId,
      evidenceId,
      objectiveCount: caseFile.objectives.length,
      collectedEvidence: caseFile.collectedEvidence.size,
    });

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

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'caseCluePulse',
      origin: 'case',
      caseId,
      clueId,
      totalClues: caseFile.requiredClues.size,
      discoveredClues: caseFile.discoveredClues.size,
    });

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
        case 'validate_theory':
          completed = this.checkTheoryObjective(caseFile, objective);
          break;
        default:
          console.warn(
            `[CaseManager] Unknown objective type: ${objective.type} (objective id: ${objective.id ?? 'unknown'})`
          );
      }

      if (completed) {
        const extraData =
          objective.type === 'validate_theory'
            ? {
                accuracy: Number.isFinite(caseFile.accuracy) ? caseFile.accuracy : 0,
                threshold: this.getTheoryAccuracyThreshold(caseFile, objective),
              }
            : {};
        this.completeObjective(caseId, caseFile, objective, extraData);
      }
    }
  }

  /**
   * Resolve the accuracy threshold for a theory validation objective.
   * @param {Object} caseFile
   * @param {Object} objective
   * @returns {number}
   */
  getTheoryAccuracyThreshold(caseFile, objective) {
    if (objective && typeof objective.minAccuracy === 'number' && Number.isFinite(objective.minAccuracy)) {
      return objective.minAccuracy;
    }
    if (Number.isFinite(caseFile.accuracyThreshold)) {
      return caseFile.accuracyThreshold;
    }
    return 0;
  }

  /**
   * Determine if a theory validation objective is complete.
   * @param {Object} caseFile
   * @param {Object} objective
   * @returns {boolean}
   */
  checkTheoryObjective(caseFile, objective) {
    if (!caseFile || !objective) {
      return false;
    }

    if (caseFile.status !== 'solved') {
      return false;
    }

    const threshold = this.getTheoryAccuracyThreshold(caseFile, objective);
    const accuracy = Number.isFinite(caseFile.accuracy) ? caseFile.accuracy : 0;
    return accuracy >= threshold;
  }

  /**
   * Mark an objective as completed, emitting objective and FX events.
   * @param {string} caseId
   * @param {Object} caseFile
   * @param {Object} objective
   * @param {Object} extraData
   * @returns {boolean}
   */
  completeObjective(caseId, caseFile, objective, extraData = {}) {
    if (!objective || objective.completed) {
      return false;
    }

    objective.completed = true;

    const objectiveId = objective.id ?? objective.description ?? 'objective';
    const completedObjectives = caseFile.objectives.filter((obj) => obj.completed).length;
    const objectiveType = objective.type ?? null;
    const payload = {
      caseId,
      objective: objective.description ?? objectiveId,
      objectiveId,
      objectiveType,
      ...extraData,
    };

    this.eventBus.emit('case:objective_completed', payload);

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'caseObjectivePulse',
      origin: 'case',
      caseId,
      objectiveId,
      objectiveType,
      completedObjectives,
      totalObjectives: caseFile.objectives.length,
      ...extraData,
    });

    console.log(`[CaseManager] Objective completed: ${objective.description ?? objectiveId}`);

    if (caseFile.objectives.every((obj) => obj.completed)) {
      this.eventBus.emit('case:objectives_complete', {
        caseId,
        title: caseFile.title
      });
    }

    return true;
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

    const validation = this.theoryValidator.validate(playerTheory, caseFile, {
      clueLookup: this.clueDatabase,
      threshold: caseFile.accuracyThreshold,
      allowedConnectionTypes: caseFile.allowedConnectionTypes
    });

    caseFile.playerTheory = validation.normalizedTheory;
    caseFile.accuracy = validation.accuracy;

    const hasSolutionGraph =
      Boolean(caseFile.theoryGraph) ||
      (Array.isArray(caseFile.alternateTheoryGraphs) && caseFile.alternateTheoryGraphs.length > 0) ||
      (Array.isArray(caseFile.theoryGraphs) && caseFile.theoryGraphs.length > 0);

    if (hasSolutionGraph && validation.valid) {
      this.solveCase(caseId, validation.accuracy);
    }

    this.eventBus.emit('theory:validated', {
      caseId,
      accuracy: validation.accuracy,
      valid: validation.valid,
      threshold: caseFile.accuracyThreshold,
      hints: validation.hints,
      missingConnections: validation.missingConnections,
      extraConnections: validation.extraConnections,
      invalidConnections: validation.invalidConnections,
      solutionId: validation.solutionId
    });

    return validation;
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

    // Ensure theory validation objectives and final completion state are updated
    this.checkObjectiveCompletion(caseId);

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

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'caseSolvedBurst',
      origin: 'case',
      caseId,
      title: caseFile.title,
      accuracy,
      duration: 1.15,
    });

    console.log(`[CaseManager] Case solved: ${caseFile.title} (${(accuracy * 100).toFixed(0)}% accuracy)`);
  }

  /**
   * Serialize case progress for persistence.
   * @returns {Object}
   */
  serialize() {
    const cases = {};
    for (const [caseId, caseFile] of this.cases.entries()) {
      cases[caseId] = {
        status: caseFile.status,
        collectedEvidence: Array.from(caseFile.collectedEvidence),
        discoveredClues: Array.from(caseFile.discoveredClues),
        objectives: caseFile.objectives.map((objective) => ({
          id: objective?.id ?? null,
          type: objective?.type ?? null,
          completed: Boolean(objective?.completed),
        })),
        accuracy: Number.isFinite(caseFile.accuracy) ? caseFile.accuracy : 0,
        solveTime: Number.isFinite(caseFile.solveTime) ? caseFile.solveTime : null,
        playerTheory:
          caseFile.playerTheory && typeof caseFile.playerTheory === 'object'
            ? {
                nodes: Array.isArray(caseFile.playerTheory.nodes)
                  ? caseFile.playerTheory.nodes
                      .filter((node) => node && typeof node === 'object')
                      .map((node) => ({ ...node }))
                  : [],
                connections: Array.isArray(caseFile.playerTheory.connections)
                  ? caseFile.playerTheory.connections
                      .filter((conn) => conn && typeof conn === 'object')
                      .map((conn) => ({ ...conn }))
                  : [],
              }
            : { nodes: [], connections: [] },
      };
    }

    return {
      activeCaseId: this.activeCase ?? null,
      cases,
    };
  }

  /**
   * Restore case progress from serialized data.
   * @param {Object} snapshot
   * @returns {boolean}
   */
  deserialize(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }

    const serializedCases =
      snapshot.cases && typeof snapshot.cases === 'object' ? snapshot.cases : {};
    for (const [caseId, caseData] of Object.entries(serializedCases)) {
      if (!caseData || typeof caseData !== 'object') {
        continue;
      }
      const caseFile = this.cases.get(caseId);
      if (!caseFile) {
        continue;
      }

      const status = caseData.status;
      if (status === 'solved' || status === 'failed') {
        caseFile.status = status;
      } else {
        caseFile.status = 'active';
      }

      const collectedEvidence = Array.isArray(caseData.collectedEvidence)
        ? caseData.collectedEvidence.filter(
            (evidenceId) => typeof evidenceId === 'string' && evidenceId.length > 0
          )
        : [];
      caseFile.collectedEvidence = new Set(collectedEvidence);

      const discoveredClues = Array.isArray(caseData.discoveredClues)
        ? caseData.discoveredClues.filter(
            (clueId) => typeof clueId === 'string' && clueId.length > 0
          )
        : [];
      caseFile.discoveredClues = new Set(discoveredClues);

      if (Array.isArray(caseData.objectives)) {
        for (let index = 0; index < caseFile.objectives.length; index += 1) {
          const incoming = caseData.objectives[index];
          if (!incoming || typeof incoming !== 'object') {
            continue;
          }
          if (!caseFile.objectives[index]) {
            continue;
          }
          caseFile.objectives[index].completed = Boolean(incoming.completed);
        }
      }

      if (Number.isFinite(caseData.accuracy)) {
        caseFile.accuracy = caseData.accuracy;
      }

      if (Number.isFinite(caseData.solveTime)) {
        caseFile.solveTime = caseData.solveTime;
      }

      if (caseData.playerTheory && typeof caseData.playerTheory === 'object') {
        const nodes = Array.isArray(caseData.playerTheory.nodes)
          ? caseData.playerTheory.nodes
              .filter((node) => node && typeof node === 'object')
              .map((node) => ({ ...node }))
          : [];
        const connections = Array.isArray(caseData.playerTheory.connections)
          ? caseData.playerTheory.connections
              .filter((conn) => conn && typeof conn === 'object')
              .map((conn) => ({ ...conn }))
          : [];
        caseFile.playerTheory = { nodes, connections };
      }
    }

    if (typeof snapshot.activeCaseId === 'string' && this.cases.has(snapshot.activeCaseId)) {
      this.activeCase = snapshot.activeCaseId;
    } else if (snapshot.activeCaseId === null) {
      this.activeCase = null;
    }

    this.eventBus.emit('case:hydrated', {
      activeCaseId: this.activeCase,
      totalCases: this.cases.size,
    });

    return true;
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
