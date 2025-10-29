/**
 * InvestigationSystem
 *
 * Handles evidence collection, clue derivation, and deduction mechanics.
 * Core system for knowledge-gated progression.
 *
 * Priority: 30
 * Queries: [Transform, Evidence], [Transform, InteractionZone]
 */

import { System } from '../../engine/ecs/System.js';
import { GameConfig } from '../config/GameConfig.js';
import { evidenceToInventoryItem } from '../state/inventory/inventoryEvents.js';

export class InvestigationSystem extends System {
  constructor(componentRegistry, eventBus) {
    super(componentRegistry, eventBus, ['Transform']);
    this.priority = 30;

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

    // Performance tracking
    this.evidenceCache = new Map(); // entityId -> Evidence component
    this.lastCacheUpdate = 0;
    this.promptVisible = false;
  }

  /**
   * Initialize system
   */
  init() {
    // Default starting ability
    this.playerAbilities.add('basic_observation');

    // Listen for ability unlocks from external sources (e.g., quest rewards, scenes)
    this.eventBus.on('ability:unlocked', (data) => {
      // Add ability directly without re-emitting (to avoid recursion)
      if (!this.playerAbilities.has(data.abilityId)) {
        this.playerAbilities.add(data.abilityId);
        console.log(`[InvestigationSystem] Ability unlocked via event: ${data.abilityId}`);
      }
    });

    console.log('[InvestigationSystem] Initialized');
  }

  /**
   * Update investigation mechanics
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {Array} entities - All entity IDs
   */
  update(deltaTime, entities) {
    // Update detective vision timer
    this.updateDetectiveVision(deltaTime);

    // Find player entity
    const player = entities.find(id => {
      const entity = this.componentRegistry.entityManager.getEntity(id);
      return entity && entity.hasTag && entity.hasTag('player');
    });

    if (!player) return;

    const playerTransform = this.getComponent(player, 'Transform');
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

    for (const entityId of entities) {
      const evidence = this.getComponent(entityId, 'Evidence');
      if (!evidence || evidence.collected) continue;

      const transform = this.getComponent(entityId, 'Transform');
      if (!transform) continue;

      // Check if evidence is in range (optimized with squared distance)
      const dx = transform.x - playerTransform.x;
      const dy = transform.y - playerTransform.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        // Check if evidence is visible (not hidden or detective vision active)
        const isVisible = !evidence.hidden || this.detectiveVisionActive;

        if (isVisible) {
          this.eventBus.emit('evidence:detected', {
            entityId: entityId,
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
   * @param {number} playerId - Player entity ID
   * @param {Transform} playerTransform
   * @param {Array} entities - Array of entity IDs
   */
  checkInteractionZones(playerId, playerTransform, entities) {
    const playerController = this.getComponent(playerId, 'PlayerController');
    if (!playerController) return;

    const interactPressed = playerController.input.interact;
    let promptShown = false;

    for (const entityId of entities) {
      const zone = this.getComponent(entityId, 'InteractionZone');
      if (!zone || !zone.active) continue;

      const transform = this.getComponent(entityId, 'Transform');
      if (!transform) continue;

      // Check if in range
      if (!zone.isInRange(playerTransform, transform)) {
        if (zone.type === 'trigger' && zone.triggered && !zone.oneShot) {
          zone.triggered = false;
        }
        continue;
      }

      // Handle interaction based on type
      if (zone.type === 'evidence') {
        if (interactPressed || !zone.requiresInput) {
          this.collectEvidence(entityId, zone.data.evidenceId);
        } else {
          if (!promptShown) {
            this.eventBus.emit('ui:show_prompt', {
              text: zone.prompt,
              position: { x: transform.x, y: transform.y }
            });
            promptShown = true;
            this.promptVisible = true;
          }
        }
      } else if (zone.type === 'trigger') {
        // Area trigger (automatic, no input required)
        if (!zone.requiresInput && !zone.triggered) {
          zone.triggered = true;
          this.eventBus.emit('area:entered', {
            areaId: zone.id,
            entityId,
            position: { x: transform.x, y: transform.y }
          });
          console.log(`[InvestigationSystem] Area entered: ${zone.id}`);

          // Deactivate zone if it's a one-shot trigger
          if (zone.oneShot) {
            zone.active = false;
          }
        }
      } else if (zone.type === 'npc' || zone.type === 'dialogue') {
        // NPC interaction zone
        if (interactPressed) {
          this.eventBus.emit('interaction:dialogue', {
            npcId: zone.id,
            dialogueId: zone.data?.dialogueId || zone.id,
            entityId
          });
          console.log(`[InvestigationSystem] Interacting with NPC: ${zone.id}`);
          this.hideActivePrompt();
        } else {
          if (!promptShown) {
            this.eventBus.emit('ui:show_prompt', {
              text: zone.prompt || 'Press E to talk',
              position: { x: transform.x, y: transform.y }
            });
            promptShown = true;
            this.promptVisible = true;
          }
        }
      }
    }

    if (!promptShown && this.promptVisible) {
      this.hideActivePrompt();
    }
  }

  /**
   * Collect evidence
   * @param {number} entityId - Evidence entity ID
   * @param {string} evidenceId - Evidence data ID
   */
  collectEvidence(entityId, evidenceId) {
    const evidence = this.getComponent(entityId, 'Evidence');
    if (!evidence || evidence.collected) return;

    // Check if player has required ability
    if (!evidence.canCollect(this.playerAbilities)) {
      this.eventBus.emit('evidence:collection_failed', {
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
    this.eventBus.emit('evidence:collected', {
      evidenceId,
      caseId: evidence.caseId,
      type: evidence.type,
      category: evidence.category,
      entityId
    });

    const inventoryPayload = evidenceToInventoryItem(evidence, {
      source: 'investigation',
      entityId,
    });
    if (inventoryPayload) {
      this.eventBus.emit('inventory:item_added', inventoryPayload);
    }

    // Check if this evidence derives any clues
    this.checkClueDerivation(evidence);

    console.log(`[InvestigationSystem] Collected evidence: ${evidence.title}`);

    this.hideActivePrompt();
  }

  /**
   * Check if collecting evidence reveals new clues
   * @param {Evidence} evidence
   */
  checkClueDerivation(evidence) {
    for (const clueId of evidence.derivedClues) {
      if (!this.discoveredClues.has(clueId)) {
        // Mark clue as discovered
        this.discoveredClues.set(clueId, true);

        this.eventBus.emit('clue:derived', {
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
      this.eventBus.emit('ability:cooldown', {
        ability: 'detective_vision',
        remaining: this.detectiveVisionCooldown
      });
      return;
    }

    if (!this.playerAbilities.has('detective_vision')) {
      this.eventBus.emit('ability:locked', {
        ability: 'detective_vision'
      });
      return;
    }

    this.detectiveVisionActive = true;
    this.detectiveVisionTimer = GameConfig.player.detectiveVisionDuration / 1000;

    this.eventBus.emit('detective_vision:activated', {
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

    this.eventBus.emit('detective_vision:deactivated', {
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

    this.eventBus.emit('ability:unlocked', {
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

    this.eventBus.emit('knowledge:learned', {
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

    this.eventBus.emit('case:solved', {
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

  /**
   * Hide the currently active interaction prompt if present.
   */
  hideActivePrompt() {
    if (!this.promptVisible) {
      return;
    }
    this.eventBus.emit('ui:hide_prompt');
    this.promptVisible = false;
  }
}
