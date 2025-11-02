/**
 * ForensicSystem
 *
 * Handles forensic examination of evidence to reveal hidden clues.
 * Three forensic tool types: fingerprint analysis, document analysis, memory trace analysis.
 *
 * Priority: 31 (runs after InvestigationSystem)
 * Queries: [Transform, Evidence, ForensicEvidence]
 */

import { System } from '../../engine/ecs/System.js';
import { GameConfig } from '../config/GameConfig.js';

export class ForensicSystem extends System {
  constructor(componentRegistry, eventBus, options = {}) {
    super(componentRegistry, eventBus, ['Transform']);
    this.priority = 31;

    const opts = typeof options === 'object' && options !== null ? options : {};
    this.config = opts.config && typeof opts.config === 'object' ? opts.config : GameConfig;

    // Player forensic tools
    this.playerTools = new Set();
    this.playerKnowledge = new Set();

    // Analysis state
    this.activeAnalysis = null; // Current analysis in progress
    this.analysisTimer = 0;
    this.analysisQueue = []; // Queue of analyses to perform

    // Performance tracking
    this.performanceMetrics = {
      analysesCompleted: 0,
      averageAnalysisTime: 0
    };
    this._totalAnalysisSeconds = 0;
  }

  /**
   * Initialize system
   */
  init() {
    // Default starting tools and knowledge
    this.playerTools.add('basic_magnifier');
    this.playerKnowledge.add('forensic_skill_1');

    // Listen for evidence collection events
    this.eventBus.on('evidence:collected', (data) => {
      this.onEvidenceCollected(data);
    });

    console.log('[ForensicSystem] Initialized');
  }

  /**
   * Update forensic analysis
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {Array} entities - All entity IDs
   */
  update(deltaTime, entities) {
    // Update active analysis timer
    if (this.activeAnalysis) {
      this.updateActiveAnalysis(deltaTime);
    }

    // Process next item in queue if no active analysis
    if (!this.activeAnalysis && this.analysisQueue.length > 0) {
      this.startNextAnalysis();
    }
  }

  /**
   * Update active analysis progress
   * @param {number} deltaTime
   */
  updateActiveAnalysis(deltaTime) {
    const startTime = performance.now();

    this.analysisTimer += deltaTime;

    const targetDuration = Math.max(this.activeAnalysis.duration, Number.EPSILON);
    const progress = this.analysisTimer / targetDuration;

    // Emit progress event
    this.eventBus.emit('forensic:progress', {
      evidenceId: this.activeAnalysis.evidenceId,
      progress: Math.min(progress, 1.0),
      forensicType: this.activeAnalysis.forensicType,
      difficulty: this.activeAnalysis.difficulty,
      skillLevel: this.activeAnalysis.skillLevel,
      duration: targetDuration,
      timeRemaining: Math.max(0, targetDuration - this.analysisTimer)
    });

    // Check if analysis complete
    if (this.analysisTimer >= targetDuration) {
      this.completeAnalysis();
    }

    const elapsedTime = performance.now() - startTime;
    if (elapsedTime > 1) {
      console.warn(`[ForensicSystem] Analysis update took ${elapsedTime.toFixed(2)}ms`);
    }
  }

  /**
   * Handle evidence collection - check if it needs forensic analysis
   * @param {Object} data - Evidence collection event data
   */
  onEvidenceCollected(data) {
    const { entityId, evidenceId, caseId } = data;

    // Check if evidence has forensic component
    const forensic = this.getComponent(entityId, 'ForensicEvidence');
    if (!forensic || !forensic.requiresAnalysis || forensic.analyzed) {
      return;
    }

    // Notify player that forensic analysis is available
    const requirements = forensic.getRequirements();
    this.eventBus.emit('forensic:available', {
      evidenceId,
      forensicType: forensic.forensicType,
      requirements: {
        ...requirements,
        minimumDifficulty: this._normalizeDifficulty(forensic.difficulty)
      }
    });

    const transform = this.getComponent(entityId, 'Transform');
    const worldPosition = transform
      ? { x: transform.x, y: transform.y }
      : null;

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'forensicPulse',
      origin: 'forensic',
      stage: 'available',
      evidenceId,
      forensicType: forensic.forensicType,
      caseId,
      difficulty: this._normalizeDifficulty(forensic.difficulty),
      worldPosition
    });

    console.log(`[ForensicSystem] Forensic analysis available for: ${evidenceId}`);
  }

  /**
   * Initiate forensic examination on evidence
   * @param {number} entityId - Evidence entity ID
   * @param {string} evidenceId - Evidence data ID
   * @returns {boolean} Success
   */
  initiateAnalysis(entityId, evidenceId) {
    const evidence = this.getComponent(entityId, 'Evidence');
    const forensic = this.getComponent(entityId, 'ForensicEvidence');

    if (!evidence || !forensic) {
      console.warn('[ForensicSystem] Evidence or ForensicEvidence component not found');
      return false;
    }

    if (!evidence.collected) {
      this.eventBus.emit('forensic:failed', {
        evidenceId,
        reason: 'not_collected'
      });
      return false;
    }

    if (forensic.analyzed) {
      this.eventBus.emit('forensic:failed', {
        evidenceId,
        reason: 'already_analyzed'
      });
      return false;
    }

    // Check if player has required tools and knowledge
    if (!forensic.canAnalyze(this.playerTools, this.playerKnowledge)) {
      const requirements = forensic.getRequirements();
      this.eventBus.emit('forensic:failed', {
        evidenceId,
        reason: 'missing_requirements',
        requiredTool: requirements.tool,
        requiredSkill: requirements.requiredSkill
      });
      return false;
    }

    const durationSeconds = this._calculateAnalysisDurationSeconds(forensic);
    const difficulty = this._normalizeDifficulty(forensic.difficulty);
    const skillLevel = this._getMaxDifficulty();

    // Add to analysis queue
    this.analysisQueue.push({
      entityId,
      evidenceId,
      caseId: evidence.caseId,
      forensicType: forensic.forensicType,
      duration: durationSeconds,
      hiddenClues: forensic.hiddenClues,
      difficulty,
      skillLevel
    });

    this.eventBus.emit('forensic:queued', {
      evidenceId,
      forensicType: forensic.forensicType,
      position: this.analysisQueue.length,
      estimatedDuration: durationSeconds,
      difficulty,
      skillLevel
    });

    console.log(`[ForensicSystem] Analysis queued: ${evidenceId} (${forensic.forensicType})`);
    return true;
  }

  /**
   * Start next analysis from queue
   */
  startNextAnalysis() {
    if (this.analysisQueue.length === 0) return;

    this.activeAnalysis = this.analysisQueue.shift();
    this.analysisTimer = 0;

    this.eventBus.emit('forensic:started', {
      evidenceId: this.activeAnalysis.evidenceId,
      forensicType: this.activeAnalysis.forensicType,
      duration: this.activeAnalysis.duration,
      difficulty: this.activeAnalysis.difficulty,
      skillLevel: this.activeAnalysis.skillLevel
    });

    const transform = this.getComponent(this.activeAnalysis.entityId, 'Transform');
    const worldPosition = transform
      ? { x: transform.x, y: transform.y }
      : null;

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'forensicPulse',
      origin: 'forensic',
      stage: 'started',
      evidenceId: this.activeAnalysis.evidenceId,
      forensicType: this.activeAnalysis.forensicType,
      caseId: this.activeAnalysis.caseId,
      duration: this.activeAnalysis.duration,
      difficulty: this.activeAnalysis.difficulty,
      worldPosition
    });

    console.log(`[ForensicSystem] Analysis started: ${this.activeAnalysis.evidenceId}`);
  }

  /**
   * Complete current analysis and reveal hidden clues
   */
  completeAnalysis() {
    if (!this.activeAnalysis) return;

    const { entityId, evidenceId, caseId, forensicType, difficulty, skillLevel } =
      this.activeAnalysis;

    // Mark forensic evidence as analyzed
    const forensic = this.getComponent(entityId, 'ForensicEvidence');
    if (forensic) {
      const revealedClues = forensic.analyze();

      // Emit clue derivation events for each hidden clue
      for (const clueId of revealedClues) {
        this.eventBus.emit('clue:derived', {
          clueId,
          evidenceId,
          caseId,
          source: 'forensic_analysis'
        });
      }

      this.eventBus.emit('forensic:complete', {
        evidenceId,
        forensicType,
        cluesRevealed: revealedClues.length,
        clues: revealedClues,
        difficulty,
        skillLevel,
        duration: this.analysisTimer
      });

      const transform = this.getComponent(entityId, 'Transform');
      const worldPosition = transform
        ? { x: transform.x, y: transform.y }
        : null;

      this.eventBus.emit('fx:overlay_cue', {
        effectId: 'forensicRevealFlash',
        origin: 'forensic',
        stage: 'complete',
        evidenceId,
        forensicType,
        caseId,
        cluesRevealed: revealedClues.length,
        difficulty,
        worldPosition
      });

      console.log(`[ForensicSystem] Analysis complete: ${evidenceId} (${revealedClues.length} clues revealed)`);

      // Update performance metrics
      this._recordAnalysisDuration(this.analysisTimer);
    }

    this.activeAnalysis = null;
    this.analysisTimer = 0;
  }

  /**
   * Cancel current analysis
   * @returns {boolean} Success
   */
  cancelAnalysis() {
    if (!this.activeAnalysis) return false;

    const { evidenceId } = this.activeAnalysis;

    this.eventBus.emit('forensic:cancelled', {
      evidenceId
    });

    console.log(`[ForensicSystem] Analysis cancelled: ${evidenceId}`);

    this.activeAnalysis = null;
    this.analysisTimer = 0;

    return true;
  }

  /**
   * Unlock forensic tool
   * @param {string} toolId - Tool identifier
   */
  unlockTool(toolId) {
    if (this.playerTools.has(toolId)) return;

    this.playerTools.add(toolId);

    this.eventBus.emit('forensic:tool_unlocked', {
      toolId
    });

    console.log(`[ForensicSystem] Tool unlocked: ${toolId}`);
  }

  /**
   * Learn forensic knowledge
   * @param {string} knowledgeId - Knowledge identifier
   */
  learnKnowledge(knowledgeId) {
    if (this.playerKnowledge.has(knowledgeId)) return;

    this.playerKnowledge.add(knowledgeId);

    this.eventBus.emit('forensic:knowledge_learned', {
      knowledgeId
    });

    console.log(`[ForensicSystem] Knowledge learned: ${knowledgeId}`);
  }

  /**
   * Get current analysis status
   * @returns {Object|null} Analysis status or null
   */
  getAnalysisStatus() {
    if (!this.activeAnalysis) return null;

    const targetDuration = Math.max(this.activeAnalysis.duration, Number.EPSILON);
    const progress = Math.min(this.analysisTimer / targetDuration, 1.0);

    return {
      evidenceId: this.activeAnalysis.evidenceId,
      forensicType: this.activeAnalysis.forensicType,
      progress,
      timeRemaining: Math.max(0, targetDuration - this.analysisTimer),
      queueLength: this.analysisQueue.length,
      duration: targetDuration,
      difficulty: this.activeAnalysis.difficulty,
      skillLevel: this.activeAnalysis.skillLevel
    };
  }

  /**
   * Get player's forensic capabilities
   * @returns {Object}
   */
  getPlayerCapabilities() {
    return {
      tools: Array.from(this.playerTools),
      knowledge: Array.from(this.playerKnowledge),
      maxDifficulty: this._getMaxDifficulty()
    };
  }

  /**
   * Get maximum difficulty player can analyze
   * @private
   * @returns {number}
   */
  _getMaxDifficulty() {
    const maxSkill = this.config?.knowledge?.forensicSkillMax ?? 3;
    let maxDifficulty = 0;
    for (let i = 1; i <= maxSkill; i++) {
      if (this.playerKnowledge.has(`forensic_skill_${i}`)) {
        maxDifficulty = i;
      }
    }
    return maxDifficulty;
  }

  /**
    * Clamp and normalize difficulty values using configuration.
    * @param {number} value
    * @returns {number}
    * @private
    */
  _normalizeDifficulty(value) {
    const maxSkill = this.config?.knowledge?.forensicSkillMax ?? 3;
    if (!Number.isFinite(value)) {
      return 1;
    }
    const rounded = Math.round(value);
    if (rounded < 1) {
      return 1;
    }
    if (rounded > maxSkill) {
      return maxSkill;
    }
    return rounded;
  }

  /**
   * Calculate effective analysis duration in seconds based on difficulty and skill.
   * @param {import('../components/ForensicEvidence.js').ForensicEvidence} forensic
   * @returns {number}
   * @private
   */
  _calculateAnalysisDurationSeconds(forensic) {
    const baseMs =
      typeof forensic.analysisTime === 'number' && forensic.analysisTime >= 0
        ? forensic.analysisTime
        : this.config?.investigation?.forensicAnalysisTime ?? 2000;

    const tuning = this.config?.investigation?.forensicTuning ?? {};
    const difficulty = this._normalizeDifficulty(forensic.difficulty);
    const baseMultiplier =
      typeof tuning?.difficultyMultipliers === 'object' && tuning.difficultyMultipliers !== null
        ? tuning.difficultyMultipliers[difficulty] ?? 1 + 0.25 * (difficulty - 1)
        : 1 + 0.25 * (difficulty - 1);

    const playerSkill = this._getMaxDifficulty();
    const advantage = Math.max(0, playerSkill - difficulty);
    const advantageBonus = Number.isFinite(tuning.skillAdvantageTimeBonus)
      ? tuning.skillAdvantageTimeBonus
      : 0.15;
    const minMultiplier = Number.isFinite(tuning.minAdvantageMultiplier)
      ? tuning.minAdvantageMultiplier
      : 0.55;

    let skillMultiplier = 1;
    if (advantage > 0) {
      skillMultiplier = Math.max(minMultiplier, 1 - advantageBonus * advantage);
    }

    const totalMs = baseMs * baseMultiplier * skillMultiplier;
    const seconds = totalMs / 1000;
    return seconds > 0 ? seconds : 0.001;
  }

  /**
   * Record analysis duration for average tracking.
   * @param {number} durationSeconds
   * @private
   */
  _recordAnalysisDuration(durationSeconds) {
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return;
    }
    this._totalAnalysisSeconds += durationSeconds;
    this.performanceMetrics.analysesCompleted += 1;
    this.performanceMetrics.averageAnalysisTime =
      this._totalAnalysisSeconds / this.performanceMetrics.analysesCompleted;
  }

  /**
   * Get performance metrics
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      activeAnalysis: this.activeAnalysis !== null,
      queueLength: this.analysisQueue.length
    };
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.activeAnalysis = null;
    this.analysisQueue = [];
    this.analysisTimer = 0;
    this.performanceMetrics.analysesCompleted = 0;
    this.performanceMetrics.averageAnalysisTime = 0;
    this._totalAnalysisSeconds = 0;
  }
}
