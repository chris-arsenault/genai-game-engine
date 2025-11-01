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
  constructor(componentRegistry, eventBus) {
    super(componentRegistry, eventBus, ['Transform']);
    this.priority = 31;

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

    const progress = this.analysisTimer / this.activeAnalysis.duration;

    // Emit progress event
    this.eventBus.emit('forensic:progress', {
      evidenceId: this.activeAnalysis.evidenceId,
      progress: Math.min(progress, 1.0),
      forensicType: this.activeAnalysis.forensicType
    });

    // Check if analysis complete
    if (this.analysisTimer >= this.activeAnalysis.duration) {
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
    this.eventBus.emit('forensic:available', {
      evidenceId,
      forensicType: forensic.forensicType,
      requirements: forensic.getRequirements()
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

    // Add to analysis queue
    this.analysisQueue.push({
      entityId,
      evidenceId,
      caseId: evidence.caseId,
      forensicType: forensic.forensicType,
      duration: forensic.analysisTime / 1000, // Convert to seconds
      hiddenClues: forensic.hiddenClues
    });

    this.eventBus.emit('forensic:queued', {
      evidenceId,
      forensicType: forensic.forensicType,
      position: this.analysisQueue.length
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
      duration: this.activeAnalysis.duration
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
      worldPosition
    });

    console.log(`[ForensicSystem] Analysis started: ${this.activeAnalysis.evidenceId}`);
  }

  /**
   * Complete current analysis and reveal hidden clues
   */
  completeAnalysis() {
    if (!this.activeAnalysis) return;

    const { entityId, evidenceId, caseId, hiddenClues, forensicType } = this.activeAnalysis;

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
        clues: revealedClues
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
        worldPosition
      });

      console.log(`[ForensicSystem] Analysis complete: ${evidenceId} (${revealedClues.length} clues revealed)`);

      // Update performance metrics
      this.performanceMetrics.analysesCompleted++;
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

    const progress = Math.min(this.analysisTimer / this.activeAnalysis.duration, 1.0);

    return {
      evidenceId: this.activeAnalysis.evidenceId,
      forensicType: this.activeAnalysis.forensicType,
      progress,
      timeRemaining: Math.max(0, this.activeAnalysis.duration - this.analysisTimer),
      queueLength: this.analysisQueue.length
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
    let maxDifficulty = 0;
    for (let i = 1; i <= 3; i++) {
      if (this.playerKnowledge.has(`forensic_skill_${i}`)) {
        maxDifficulty = i;
      }
    }
    return maxDifficulty;
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
  }
}
