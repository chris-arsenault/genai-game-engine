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
import { hydratePromptWithBinding, formatActionPrompt } from '../utils/controlBindingPrompts.js';

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
    this.detectiveVisionEnergyMax = GameConfig.player.detectiveVisionEnergyMax ?? 5;
    this.detectiveVisionEnergy = this.detectiveVisionEnergyMax;
    this.detectiveVisionMinEnergyToActivate = GameConfig.player.detectiveVisionMinEnergyToActivate ?? 1;
    this._detectiveVisionStatusThreshold = 0.05;
    this._lastDetectiveVisionStatus = null;

    // Performance tracking
    this.evidenceCache = new Map(); // entityId -> Evidence component
    this.lastCacheUpdate = 0;
    this.promptVisible = false;

    this.playerEntityId = null;
    this.playerInvestigation = null;

    this._offAbilityUnlocked = null;
    this._offKnowledgeLearned = null;
    this._offInteractInput = null;
    this._offInputAction = null;
    this._interactInputSignal = false;
  }

  /**
   * Initialize system
   */
  init() {
    // Default starting ability
    this.registerAbility('basic_observation');

    // Listen for ability unlocks from external sources (e.g., quest rewards, scenes)
    this._offAbilityUnlocked = this.eventBus.on('ability:unlocked', (data = {}) => {
      // Add ability directly without re-emitting (to avoid recursion)
      if (this.registerAbility(data.abilityId)) {
        console.log(`[InvestigationSystem] Ability unlocked via event: ${data.abilityId}`);
      }
    });

    this._offKnowledgeLearned = this.eventBus.on('knowledge:learned', (data = {}) => {
      const knowledgeId = data.knowledgeId;
      if (typeof knowledgeId !== 'string' || knowledgeId.length === 0) {
        return;
      }
      if (this.playerKnowledge.has(knowledgeId)) {
        return;
      }
      this.playerKnowledge.add(knowledgeId);
      console.log(`[InvestigationSystem] Knowledge registered via event: ${knowledgeId}`);
    });

    this._offInteractInput = this.eventBus.on('input:interact:pressed', () => {
      this._interactInputSignal = true;
    });

    this._offInputAction = this.eventBus.on('input:action_pressed', (payload = {}) => {
      if (payload?.action === 'interact') {
        this._interactInputSignal = true;
      }
    });

    console.log('[InvestigationSystem] Initialized');

    this._emitDetectiveVisionStatus({ reason: 'init' }, true);
  }

  /**
   * Update investigation mechanics
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {Array} entities - All entity IDs
   */
  update(deltaTime, entities) {
    // Update detective vision timer
    this.updateDetectiveVision(deltaTime);

    this.playerEntityId = null;
    this.playerInvestigation = null;

    // Find player entity
    const player = entities.find((id) => {
      const tag =
        this.componentRegistry.entityManager.getTag(id) ??
        this.componentRegistry.entityManager.getEntity(id)?.tag ??
        null;
      return tag === 'player';
    });

    if (!player) return;
    this.playerEntityId = player;

    const playerTransform = this.getComponent(player, 'Transform');
    if (!playerTransform) return;

    const playerInvestigation = this.getComponent(player, 'Investigation');
    if (playerInvestigation) {
      this.playerInvestigation = playerInvestigation;
      playerInvestigation.addAbility('basic_observation');
      this._mergeAbilitiesWithComponent(playerInvestigation);
    }

    // Scan for evidence in observation radius
    this.scanForEvidence(playerTransform, playerInvestigation, entities);

    // Check for interaction zones
    this.checkInteractionZones(player, playerTransform, playerInvestigation, entities);
  }

  /**
   * Update detective vision state
   * @param {number} deltaTime
   */
  updateDetectiveVision(deltaTime) {
    let statusDirty = false;
    let broadcastHandled = false;

    if (this.detectiveVisionActive) {
      this.detectiveVisionTimer -= deltaTime;

      const energyCost = GameConfig.player.detectiveVisionEnergyCost ?? 0;
      if (energyCost > 0) {
        const nextEnergy = Math.max(0, this.detectiveVisionEnergy - energyCost * deltaTime);
        if (Math.abs(nextEnergy - this.detectiveVisionEnergy) > 1e-6) {
          this.detectiveVisionEnergy = nextEnergy;
          statusDirty = true;
        }

        if (this.detectiveVisionEnergy <= 0) {
          const deactivated = this.deactivateDetectiveVision({ reason: 'energy_depleted' });
          broadcastHandled = broadcastHandled || deactivated;
        }
      }

      if (!broadcastHandled && this.detectiveVisionActive && this.detectiveVisionTimer <= 0) {
        const deactivated = this.deactivateDetectiveVision({ reason: 'duration_expired' });
        broadcastHandled = broadcastHandled || deactivated;
      }
    } else {
      const regenRate = GameConfig.player.detectiveVisionEnergyRegen ?? 0;
      if (regenRate > 0 && this.detectiveVisionEnergy < this.detectiveVisionEnergyMax) {
        const nextEnergy = Math.min(
          this.detectiveVisionEnergyMax,
          this.detectiveVisionEnergy + regenRate * deltaTime
        );
        if (Math.abs(nextEnergy - this.detectiveVisionEnergy) > 1e-6) {
          this.detectiveVisionEnergy = nextEnergy;
          statusDirty = true;
        }
      }
    }

    if (this.detectiveVisionCooldown > 0) {
      const nextCooldown = Math.max(0, this.detectiveVisionCooldown - deltaTime);
      if (Math.abs(nextCooldown - this.detectiveVisionCooldown) > 1e-6) {
        this.detectiveVisionCooldown = nextCooldown;
        statusDirty = true;
      }
    }

    if (!broadcastHandled && statusDirty) {
      this._emitDetectiveVisionStatus({}, false);
    }
  }

  /**
   * Scan for evidence in player's observation radius
   * @param {Transform} playerTransform
   * @param {Array} entities
   */
  scanForEvidence(playerTransform, playerInvestigation, entities) {
    let investigationComponent = playerInvestigation;
    let entityCollection = entities;

    if (!entityCollection) {
      const candidate = playerInvestigation;
      if (candidate && typeof candidate[Symbol.iterator] === 'function' && typeof candidate.getDetectionRadius !== 'function') {
        entityCollection = candidate;
        investigationComponent = null;
      }
    }

    if (!entityCollection) {
      entityCollection = [];
    }

    const baseRadius =
      (investigationComponent && typeof investigationComponent.getDetectionRadius === 'function'
        ? investigationComponent.getDetectionRadius()
        : investigationComponent?.observationRadius) ??
      GameConfig.player.observationRadius;
    const abilityLevel = Math.max(1, investigationComponent?.abilityLevel ?? 1);
    const effectiveRadius = baseRadius * (1 + 0.1 * (abilityLevel - 1));
    const radiusSq = effectiveRadius * effectiveRadius;

    for (const entityId of entityCollection) {
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
  checkInteractionZones(playerId, playerTransform, playerInvestigation, entities) {
    const playerController = this.getComponent(playerId, 'PlayerController');
    if (!playerController) return;

    const interactPressed = Boolean(
      playerController.input.interact ||
      playerController.input.interactJustPressed ||
      this._consumeInteractSignal()
    );
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
          this.collectEvidence(entityId, zone.data.evidenceId, playerInvestigation);
        } else {
          if (!promptShown) {
            const promptText = this._resolveZonePrompt(zone, zone.data?.evidenceId
              ? `collect ${zone.data.evidenceId}`
              : 'collect evidence');
            this.eventBus.emit('ui:show_prompt', {
              text: promptText,
              position: { x: transform.x, y: transform.y },
              bindingAction: zone.promptAction ?? 'interact',
              bindingFallback: zone.data?.evidenceId ? `collect ${zone.data.evidenceId}` : 'collect evidence',
              source: 'investigation:evidence',
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
            const npcName = zone.data?.npcId ?? zone.id ?? 'NPC';
            const promptText = this._resolveZonePrompt(zone, `talk to ${npcName}`);
            this.eventBus.emit('ui:show_prompt', {
              text: promptText,
              position: { x: transform.x, y: transform.y },
              bindingAction: zone.promptAction ?? 'interact',
              bindingFallback: `talk to ${npcName}`,
              source: 'investigation:npc',
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

  _consumeInteractSignal() {
    const signal = this._interactInputSignal;
    this._interactInputSignal = false;
    return signal;
  }

  _resolveZonePrompt(zone, fallbackActionText = 'interact') {
    const promptText = typeof zone?.prompt === 'string' ? zone.prompt : '';
    const action = zone?.promptAction ?? (zone?.requiresInput ? 'interact' : null);
    if (action) {
      return hydratePromptWithBinding(promptText, action, {
        fallbackActionText,
      });
    }
    if (promptText.length > 0) {
      return promptText;
    }
    return formatActionPrompt('interact', fallbackActionText);
  }

  /**
   * Collect evidence
   * @param {number} entityId - Evidence entity ID
   * @param {string} evidenceId - Evidence data ID
   */
  collectEvidence(entityId, evidenceId, playerInvestigation) {
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

    if (playerInvestigation) {
      playerInvestigation.recordEvidence({
        caseId: evidence.caseId,
        evidenceId,
        type: evidence.type,
        category: evidence.category
      });
    }

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
    if (this.detectiveVisionActive) {
      return true;
    }

    if (!this.playerAbilities.has('detective_vision')) {
      this.eventBus.emit('ability:locked', {
        ability: 'detective_vision'
      });
      return false;
    }

    if (this.detectiveVisionCooldown > 0) {
      this.eventBus.emit('ability:cooldown', {
        ability: 'detective_vision',
        remaining: this.detectiveVisionCooldown
      });
      this._emitDetectiveVisionStatus({ reason: 'cooldown_blocked' }, false);
      return false;
    }

    if (this.detectiveVisionEnergy < this.detectiveVisionMinEnergyToActivate) {
      this.eventBus.emit('ability:insufficient_resource', {
        ability: 'detective_vision',
        resource: 'energy',
        available: this.detectiveVisionEnergy,
        required: this.detectiveVisionMinEnergyToActivate
      });
      this._emitDetectiveVisionStatus({ reason: 'energy_blocked' }, false);
      return false;
    }

    const durationSeconds = (GameConfig.player.detectiveVisionDuration ?? 5000) / 1000;
    const energyCost = GameConfig.player.detectiveVisionEnergyCost ?? 0;
    let effectiveDuration = durationSeconds;
    if (energyCost > 0) {
      effectiveDuration = Math.min(durationSeconds, this.detectiveVisionEnergy / energyCost);
    }

    if (effectiveDuration <= 0) {
      this.eventBus.emit('ability:insufficient_resource', {
        ability: 'detective_vision',
        resource: 'energy',
        available: this.detectiveVisionEnergy,
        required: this.detectiveVisionMinEnergyToActivate
      });
      this._emitDetectiveVisionStatus({ reason: 'energy_blocked' }, false);
      return false;
    }

    this.detectiveVisionActive = true;
    this.detectiveVisionTimer = effectiveDuration;
    this.detectiveVisionCooldown = 0;

    this.eventBus.emit('ability:activated', {
      abilityId: 'detective_vision',
      source: 'InvestigationSystem',
      timestamp: Date.now()
    });

    this.eventBus.emit('detective_vision:activated', {
      duration: this.detectiveVisionTimer,
      energy: this.detectiveVisionEnergy,
      energyMax: this.detectiveVisionEnergyMax
    });

    console.log('[InvestigationSystem] Detective vision activated');
    this._emitDetectiveVisionStatus({ reason: 'activated' }, true);
    return true;
  }

  /**
   * Deactivate detective vision
   */
  deactivateDetectiveVision(options = {}) {
    if (!this.detectiveVisionActive) {
      return false;
    }

    this.detectiveVisionActive = false;
    this.detectiveVisionCooldown = GameConfig.player.detectiveVisionCooldown / 1000;

    this.eventBus.emit('detective_vision:deactivated', {
      cooldown: this.detectiveVisionCooldown,
      reason: options.reason ?? 'manual'
    });

    console.log('[InvestigationSystem] Detective vision deactivated');
    this._emitDetectiveVisionStatus({ reason: options.reason ?? 'deactivated' }, true);
    return true;
  }

  /**
   * Toggle detective vision state based on current status.
   * @returns {boolean} True if state changed.
   */
  toggleDetectiveVision() {
    if (this.detectiveVisionActive) {
      return this.deactivateDetectiveVision({ reason: 'manual_toggle' });
    }
    return this.activateDetectiveVision();
  }

  /**
   * Check if detective vision can be activated right now.
   * @returns {boolean}
   */
  canActivateDetectiveVision() {
    if (!this.playerAbilities.has('detective_vision')) {
      return false;
    }
    if (this.detectiveVisionCooldown > 0) {
      return false;
    }
    return this.detectiveVisionEnergy >= this.detectiveVisionMinEnergyToActivate;
  }

  /**
   * Broadcast detective vision status changes to the event bus.
   * @param {object} [extra={}] - Additional payload data
   * @param {boolean} force - When true, bypass threshold checks
   */
  _emitDetectiveVisionStatus(extra = {}, force = false) {
    if (!this.eventBus) {
      return;
    }

    const cooldownMax = (GameConfig.player.detectiveVisionCooldown ?? 0) / 1000;
    const payload = {
      active: this.detectiveVisionActive,
      energy: Number(this.detectiveVisionEnergy.toFixed(3)),
      energyMax: this.detectiveVisionEnergyMax,
      cooldown: Number(Math.max(0, this.detectiveVisionCooldown).toFixed(3)),
      cooldownMax,
      cooldownRatio: cooldownMax > 0
        ? Math.min(1, Math.max(0, this.detectiveVisionCooldown / cooldownMax))
        : 0,
      canActivate: this.canActivateDetectiveVision(),
      timestamp: Date.now(),
      ...extra
    };

    if (!force && this._lastDetectiveVisionStatus) {
      const last = this._lastDetectiveVisionStatus;
      const energyDelta = Math.abs(payload.energy - last.energy);
      const cooldownDelta = Math.abs(payload.cooldown - last.cooldown);
      const activeChanged = payload.active !== last.active;
      const canActivateChanged = payload.canActivate !== last.canActivate;

      if (
        energyDelta < this._detectiveVisionStatusThreshold &&
        cooldownDelta < this._detectiveVisionStatusThreshold &&
        !activeChanged &&
        !canActivateChanged
      ) {
        return;
      }
    }

    this._lastDetectiveVisionStatus = {
      energy: payload.energy,
      cooldown: payload.cooldown,
      active: payload.active,
      canActivate: payload.canActivate
    };

    this.eventBus.emit('detective_vision:status', payload);
  }

  /**
   * Register ability without emitting events (used internally and by event handler).
   * @param {string} abilityId
   * @returns {boolean} True if ability added
   */
  registerAbility(abilityId) {
    if (typeof abilityId !== 'string' || abilityId.length === 0) {
      return false;
    }

    if (this.playerAbilities.has(abilityId)) {
      return false;
    }

    this.playerAbilities.add(abilityId);
    this._syncAbilityToComponent(abilityId);
    return true;
  }

  _mergeAbilitiesWithComponent(investigation) {
    if (!investigation) {
      return;
    }

    for (const ability of this.playerAbilities) {
      investigation.addAbility(ability);
    }

    const abilitiesFromComponent = investigation.getAbilities?.() ?? [];
    for (const ability of abilitiesFromComponent) {
      this.playerAbilities.add(ability);
    }
  }

  _syncAbilityToComponent(abilityId) {
    if (!abilityId) {
      return;
    }

    const investigation =
      this.playerInvestigation ||
      (this.playerEntityId != null
        ? this.getComponent(this.playerEntityId, 'Investigation')
        : null);

    if (investigation) {
      investigation.addAbility(abilityId);
    }
  }

  /**
   * Unlock new ability
   * @param {string} abilityId
   */
  unlockAbility(abilityId) {
    if (!this.registerAbility(abilityId)) {
      return;
    }

    this.eventBus.emit('ability:unlocked', {
      abilityId
    });

    console.log(`[InvestigationSystem] Ability unlocked: ${abilityId}`);

    if (abilityId === 'detective_vision') {
      this._emitDetectiveVisionStatus({ reason: 'ability_unlocked' }, true);
    }
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
   * Retrieve the player Investigation component if available.
   * @returns {import('../components/Investigation.js').Investigation|null}
   * @private
   */
  _getInvestigationComponent() {
    if (this.playerInvestigation) {
      return this.playerInvestigation;
    }

    if (
      this.playerEntityId != null &&
      this.componentRegistry?.entityManager?.hasEntity?.(this.playerEntityId)
    ) {
      const existing = this.getComponent(this.playerEntityId, 'Investigation');
      if (existing) {
        this.playerInvestigation = existing;
        return existing;
      }
    }

    const entityManager = this.componentRegistry?.entityManager;
    if (!entityManager || typeof entityManager.getEntitiesByTag !== 'function') {
      return null;
    }

    const playerIds = entityManager.getEntitiesByTag('player');
    for (const id of playerIds) {
      const investigation = this.getComponent(id, 'Investigation');
      if (investigation) {
        this.playerEntityId = id;
        this.playerInvestigation = investigation;
        return investigation;
      }
    }

    return null;
  }

  /**
   * Serialize investigation gameplay state for save files.
   * @returns {Object}
   */
  serialize() {
    const collectedEvidence = {};
    for (const [caseId, evidenceSet] of this.collectedEvidence.entries()) {
      collectedEvidence[caseId] = Array.from(evidenceSet);
    }

    const clueFlags = {};
    for (const [clueId, flag] of this.discoveredClues.entries()) {
      clueFlags[clueId] = Boolean(flag);
    }

    const investigationComponent = this._getInvestigationComponent();

    return {
      abilities: Array.from(this.playerAbilities),
      knowledge: Array.from(this.playerKnowledge),
      casesSolved: Array.from(this.playerCasesSolved),
      collectedEvidence,
      discoveredClues: clueFlags,
      activeCase: this.activeCase,
      detectiveVision: {
        active: this.detectiveVisionActive,
        energy: this.detectiveVisionEnergy,
        energyMax: this.detectiveVisionEnergyMax,
        cooldown: this.detectiveVisionCooldown,
        timer: this.detectiveVisionTimer
      },
      investigationComponent: investigationComponent?.serialize
        ? investigationComponent.serialize()
        : null
    };
  }

  /**
   * Restore investigation gameplay state from serialized data.
   * @param {Object} data
   */
  deserialize(data = {}) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const {
      abilities = [],
      knowledge = [],
      casesSolved = [],
      collectedEvidence = {},
      discoveredClues = {},
      activeCase = null,
      detectiveVision = {},
      investigationComponent: componentData = null
    } = data;

    this.playerAbilities = new Set(
      Array.isArray(abilities)
        ? abilities.filter((ability) => typeof ability === 'string' && ability.length > 0)
        : []
    );

    if (componentData?.abilities && Array.isArray(componentData.abilities)) {
      componentData.abilities
        .filter((ability) => typeof ability === 'string' && ability.length > 0)
        .forEach((ability) => this.playerAbilities.add(ability));
    }

    if (!this.playerAbilities.has('basic_observation')) {
      this.playerAbilities.add('basic_observation');
    }

    this.playerKnowledge = new Set(
      Array.isArray(knowledge)
        ? knowledge.filter((knowledgeId) => typeof knowledgeId === 'string' && knowledgeId.length > 0)
        : []
    );

    this.playerCasesSolved = new Set(
      Array.isArray(casesSolved)
        ? casesSolved.filter((caseId) => typeof caseId === 'string' && caseId.length > 0)
        : []
    );

    this.collectedEvidence.clear();
    if (collectedEvidence && typeof collectedEvidence === 'object') {
      Object.entries(collectedEvidence).forEach(([caseId, evidenceIds]) => {
        if (!caseId || !Array.isArray(evidenceIds)) {
          return;
        }
        const sanitized = evidenceIds.filter(
          (id) => typeof id === 'string' && id.length > 0
        );
        this.collectedEvidence.set(caseId, new Set(sanitized));
      });
    }

    this.discoveredClues.clear();
    if (Array.isArray(discoveredClues)) {
      // Handle legacy array format
      discoveredClues
        .filter((clueId) => typeof clueId === 'string' && clueId.length > 0)
        .forEach((clueId) => this.discoveredClues.set(clueId, true));
    } else if (discoveredClues && typeof discoveredClues === 'object') {
      Object.entries(discoveredClues).forEach(([clueId, flag]) => {
        if (typeof clueId === 'string' && clueId.length > 0 && flag) {
          this.discoveredClues.set(clueId, Boolean(flag));
        }
      });
    }

    this.activeCase = typeof activeCase === 'string' && activeCase.length > 0 ? activeCase : null;

    if (detectiveVision && typeof detectiveVision === 'object') {
      if (Number.isFinite(detectiveVision.energyMax) && detectiveVision.energyMax >= 0) {
        this.detectiveVisionEnergyMax = detectiveVision.energyMax;
      }
      if (Number.isFinite(detectiveVision.energy) && detectiveVision.energy >= 0) {
        this.detectiveVisionEnergy = Math.min(
          this.detectiveVisionEnergyMax,
          detectiveVision.energy
        );
      } else {
        this.detectiveVisionEnergy = this.detectiveVisionEnergyMax;
      }

      if (Number.isFinite(detectiveVision.cooldown) && detectiveVision.cooldown >= 0) {
        this.detectiveVisionCooldown = detectiveVision.cooldown;
      } else {
        this.detectiveVisionCooldown = 0;
      }

      if (Number.isFinite(detectiveVision.timer) && detectiveVision.timer >= 0) {
        this.detectiveVisionTimer = detectiveVision.timer;
      } else {
        this.detectiveVisionTimer = 0;
      }

      this.detectiveVisionActive = Boolean(detectiveVision.active);
    } else {
      this.detectiveVisionActive = false;
      this.detectiveVisionCooldown = 0;
      this.detectiveVisionTimer = 0;
      this.detectiveVisionEnergy = this.detectiveVisionEnergyMax;
    }

    const investigation = this._getInvestigationComponent();
    if (investigation) {
      if (typeof investigation.replaceAbilities === 'function') {
        investigation.replaceAbilities(this.playerAbilities);
      } else {
        investigation.abilities = new Set(this.playerAbilities);
      }

      if (componentData && typeof componentData === 'object') {
        if (Number.isFinite(componentData.observationRadius)) {
          investigation.setDetectionRadius(componentData.observationRadius);
        }
        if (Number.isFinite(componentData.abilityLevel) && componentData.abilityLevel >= 1) {
          investigation.abilityLevel = componentData.abilityLevel;
        }

        if (typeof investigation.loadCaseFiles === 'function') {
          investigation.loadCaseFiles(componentData.caseFiles);
        } else if (componentData.caseFiles && typeof componentData.caseFiles === 'object') {
          investigation.caseFiles = new Map();
          Object.entries(componentData.caseFiles).forEach(([caseId, entries]) => {
            if (caseId && Array.isArray(entries)) {
              investigation.caseFiles.set(
                caseId,
                entries.map((entry) => ({ ...entry }))
              );
            }
          });
        }
      }

      // Ensure component abilities are kept in sync
      const componentAbilities = investigation.getAbilities?.() ?? [];
      for (const ability of componentAbilities) {
        if (typeof ability === 'string' && ability.length > 0) {
          this.playerAbilities.add(ability);
        }
      }
    }

    // Align collected evidence map with case file entries if necessary
    const caseFilesSource =
      componentData?.caseFiles && typeof componentData.caseFiles === 'object'
        ? componentData.caseFiles
        : null;
    if (caseFilesSource) {
      Object.entries(caseFilesSource).forEach(([caseId, entries]) => {
        if (!caseId || !Array.isArray(entries)) {
          return;
        }
        if (!this.collectedEvidence.has(caseId)) {
          this.collectedEvidence.set(caseId, new Set());
        }
        const evidenceSet = this.collectedEvidence.get(caseId);
        entries.forEach((entry) => {
          if (entry && typeof entry.evidenceId === 'string' && entry.evidenceId.length > 0) {
            evidenceSet.add(entry.evidenceId);
          }
        });
      });
    }

    // Reset prompt/UI state and broadcast updated detective vision status
    this.promptVisible = false;
    this._lastDetectiveVisionStatus = null;
    this._emitDetectiveVisionStatus({ reason: 'deserialize' }, true);
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.collectedEvidence.clear();
    this.discoveredClues.clear();

    if (typeof this._offAbilityUnlocked === 'function') {
      this._offAbilityUnlocked();
      this._offAbilityUnlocked = null;
    }

    if (typeof this._offKnowledgeLearned === 'function') {
      this._offKnowledgeLearned();
      this._offKnowledgeLearned = null;
    }

    if (typeof this._offInteractInput === 'function') {
      this._offInteractInput();
      this._offInteractInput = null;
    }

    if (typeof this._offInputAction === 'function') {
      this._offInputAction();
      this._offInputAction = null;
    }

    this._lastDetectiveVisionStatus = null;
    this._interactInputSignal = false;
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
