/**
 * InvestigationSystem
 *
 * Handles evidence collection, clue derivation, and deduction mechanics.
 * Core system for knowledge-gated progression.
 *
 * Priority: 30
 * Queries: [Transform, Evidence], [Transform, InteractionZone]
 */

import { GameConfig } from '../config/GameConfig.js';

export class InvestigationSystem {
  constructor(componentRegistry, eventBus) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.requiredComponents = ['Transform'];

    // Investigation state
    this.playerKnowledge = new Set(); // Known knowledge IDs
    this.playerAbilities = new Set(); // Unlocked ability IDs
    this.playerCasesSolved = new Set(); // Solved case IDs
    this.collectedEvidence = new Map(); // caseId -> Set<evidenceId>
    this.discoveredClues = new Map(); // clueId -> ClueData
    this.activeCase = null;

    // Detective vision state
    this.detectiveVisionActive = false;
    this.detectiveVisionTimer = 0;
    this.detectiveVisionCooldown = 0;
  }

  /**
   * Initialize system
   */
  init() {
    // Default starting ability
    this.playerAbilities.add('basic_observation');

    console.log('[InvestigationSystem] Initialized');
  }

  /**
   * Update investigation mechanics
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {Array} entities - All entities
   */
  update(deltaTime, entities) {
    // Update detective vision timer
    this.updateDetectiveVision(deltaTime);

    // Find player
    const player = entities.find(e => e.hasTag && e.hasTag('player'));
    if (!player) return;

    const playerTransform = this.components.getComponent(player.id, 'Transform');
    if (!playerTransform) return;

    // Scan for evidence in observation radius
    this.scanForEvidence(playerTransform, entities);

    // Check for interaction zones
    this.checkInteractionZones(player, playerTransform, entities);
  }

  /**
   * Update detective vision state
   * @param {number} deltaTime
   */
  updateDetectiveVision(deltaTime) {
    if (this.detectiveVisionActive) {
      this.detectiveVisionTimer -= deltaTime;
      if (this.detectiveVisionTimer <= 0) {
        this.deactivateDetectiveVision();
      }
    }

    if (this.detectiveVisionCooldown > 0) {
      this.detectiveVisionCooldown -= deltaTime;
    }
  }

  /**
   * Scan for evidence in player's observation radius
   * @param {Transform} playerTransform
   * @param {Array} entities
   */
  scanForEvidence(playerTransform, entities) {
    const radius = GameConfig.player.observationRadius;
    const radiusSq = radius * radius;

    for (const entity of entities) {
      const evidence = this.components.getComponent(entity.id, 'Evidence');
      if (!evidence || evidence.collected) continue;

      const transform = this.components.getComponent(entity.id, 'Transform');
      if (!transform) continue;

      // Check if evidence is in range
      const dx = transform.x - playerTransform.x;
      const dy = transform.y - playerTransform.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        // Check if evidence is visible (not hidden or detective vision active)
        const isVisible = !evidence.hidden || this.detectiveVisionActive;

        if (isVisible) {
          this.events.emit('evidence:detected', {
            entityId: entity.id,
            evidenceId: evidence.id,
            distance: Math.sqrt(distSq),
            position: { x: transform.x, y: transform.y }
          });
        }
      }
    }
  }

  /**
   * Check interaction zones for evidence collection
   * @param {Object} player - Player entity
   * @param {Transform} playerTransform
   * @param {Array} entities
   */
  checkInteractionZones(player, playerTransform, entities) {
    const playerController = this.components.getComponent(player.id, 'PlayerController');
    if (!playerController) return;

    const interactPressed = playerController.input.interact;

    for (const entity of entities) {
      const zone = this.components.getComponent(entity.id, 'InteractionZone');
      if (!zone || !zone.active) continue;

      const transform = this.components.getComponent(entity.id, 'Transform');
      if (!transform) continue;

      // Check if in range
      if (!zone.isInRange(playerTransform, transform)) continue;

      // Handle interaction based on type
      if (zone.type === 'evidence') {
        if (interactPressed || !zone.requiresInput) {
          this.collectEvidence(entity.id, zone.data.evidenceId);
        } else {
          // Show prompt
          this.events.emit('ui:show_prompt', {
            text: zone.prompt,
            position: { x: transform.x, y: transform.y }
          });
        }
      }
    }
  }

  /**
   * Collect evidence
   * @param {string} entityId - Evidence entity ID
   * @param {string} evidenceId - Evidence data ID
   */
  collectEvidence(entityId, evidenceId) {
    const evidence = this.components.getComponent(entityId, 'Evidence');
    if (!evidence || evidence.collected) return;

    // Check if player has required ability
    if (!evidence.canCollect(this.playerAbilities)) {
      this.events.emit('evidence:collection_failed', {
        evidenceId,
        reason: 'missing_ability',
        required: evidence.requires
      });
      return;
    }

    // Collect evidence
    evidence.collect();

    // Track by case
    if (!this.collectedEvidence.has(evidence.caseId)) {
      this.collectedEvidence.set(evidence.caseId, new Set());
    }
    this.collectedEvidence.get(evidence.caseId).add(evidenceId);

    // Emit collection event
    this.events.emit('evidence:collected', {
      evidenceId,
      caseId: evidence.caseId,
      type: evidence.type,
      category: evidence.category,
      entityId
    });

    // Check if this evidence derives any clues
    this.checkClueDerivation(evidence);

    console.log(`[InvestigationSystem] Collected evidence: ${evidence.title}`);
  }

  /**
   * Check if collecting evidence reveals new clues
   * @param {Evidence} evidence
   */
  checkClueDerivation(evidence) {
    for (const clueId of evidence.derivedClues) {
      if (!this.discoveredClues.has(clueId)) {
        this.events.emit('clue:derived', {
          clueId,
          evidenceId: evidence.id,
          caseId: evidence.caseId
        });

        console.log(`[InvestigationSystem] New clue derived: ${clueId}`);
      }
    }
  }

  /**
   * Activate detective vision ability
   */
  activateDetectiveVision() {
    if (this.detectiveVisionCooldown > 0) {
      this.events.emit('ability:cooldown', {
        ability: 'detective_vision',
        remaining: this.detectiveVisionCooldown
      });
      return;
    }

    if (!this.playerAbilities.has('detective_vision')) {
      this.events.emit('ability:locked', {
        ability: 'detective_vision'
      });
      return;
    }

    this.detectiveVisionActive = true;
    this.detectiveVisionTimer = GameConfig.player.detectiveVisionDuration / 1000;

    this.events.emit('detective_vision:activated', {
      duration: this.detectiveVisionTimer
    });

    console.log('[InvestigationSystem] Detective vision activated');
  }

  /**
   * Deactivate detective vision
   */
  deactivateDetectiveVision() {
    this.detectiveVisionActive = false;
    this.detectiveVisionCooldown = GameConfig.player.detectiveVisionCooldown / 1000;

    this.events.emit('detective_vision:deactivated', {
      cooldown: this.detectiveVisionCooldown
    });

    console.log('[InvestigationSystem] Detective vision deactivated');
  }

  /**
   * Unlock new ability
   * @param {string} abilityId
   */
  unlockAbility(abilityId) {
    if (this.playerAbilities.has(abilityId)) return;

    this.playerAbilities.add(abilityId);

    this.events.emit('ability:unlocked', {
      abilityId
    });

    console.log(`[InvestigationSystem] Ability unlocked: ${abilityId}`);
  }

  /**
   * Learn new knowledge
   * @param {string} knowledgeId
   */
  learnKnowledge(knowledgeId) {
    if (this.playerKnowledge.has(knowledgeId)) return;

    this.playerKnowledge.add(knowledgeId);

    this.events.emit('knowledge:learned', {
      knowledgeId
    });

    console.log(`[InvestigationSystem] Knowledge learned: ${knowledgeId}`);
  }

  /**
   * Mark case as solved
   * @param {string} caseId
   * @param {number} accuracy - Solution accuracy (0.0 to 1.0)
   */
  solveCase(caseId, accuracy = 1.0) {
    if (this.playerCasesSolved.has(caseId)) return;

    this.playerCasesSolved.add(caseId);

    this.events.emit('case:solved', {
      caseId,
      accuracy,
      evidenceCollected: this.collectedEvidence.get(caseId)?.size || 0
    });

    console.log(`[InvestigationSystem] Case solved: ${caseId} (${(accuracy * 100).toFixed(0)}% accuracy)`);
  }

  /**
   * Get current player state for gate checking
   * @returns {Object}
   */
  getPlayerState() {
    return {
      knowledge: this.playerKnowledge,
      abilities: this.playerAbilities,
      casesSolved: this.playerCasesSolved,
      factionReputation: new Map() // Managed by FactionReputationSystem
    };
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.collectedEvidence.clear();
    this.discoveredClues.clear();
  }
}
