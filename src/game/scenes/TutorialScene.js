/**
 * TutorialScene - Tutorial investigation scene for "The Hollow Case"
 *
 * Demonstrates complete investigation loop:
 * 1. Scene loads with tutorial case active
 * 2. Evidence entities placed in scene
 * 3. Player collects evidence
 * 4. Player opens deduction board (Tab key)
 * 5. Player connects clues
 * 6. Player validates theory
 * 7. Case completion -> reward granted
 *
 * @class TutorialScene
 */
import { tutorialCase, tutorialEvidence, tutorialClues } from '../data/cases/tutorialCase.js';
import {
  currencyDeltaToInventoryUpdate,
  questRewardToInventoryItem,
} from '../state/inventory/inventoryEvents.js';
import { createEvidenceEntity } from '../entities/EvidenceEntity.js';
import { createPlayerEntity } from '../entities/PlayerEntity.js';

export class TutorialScene {
  /**
   * Create a TutorialScene
   * @param {Object} game - Game instance with managers and systems
   */
  constructor(game) {
    this.game = game;
    this.entityManager = game.entityManager;
    this.componentRegistry = game.componentRegistry;
    this.caseManager = game.caseManager;
    this.eventBus = game.eventBus;

    // Scene state
    this.loaded = false;
    this.caseActive = false;
    this.evidenceEntities = new Map();
    this.playerEntityId = null;
    this._eventHandlers = [];

    // Scene dimensions
    this.width = 800;
    this.height = 600;
  }

  /**
   * Load the tutorial scene
   */
  async load() {
    if (this.loaded) {
      console.warn('[TutorialScene] Already loaded');
      return;
    }

    console.log('[TutorialScene] Loading tutorial scene...');

    // Register evidence and clues in databases
    this._registerEvidenceAndClues();

    // Ensure fresh scene state
    this._teardownSceneEventHandlers();
    this.evidenceEntities.clear();

    // Create the tutorial case
    this.caseManager.createCase(tutorialCase);
    this.caseManager.setActiveCase(tutorialCase.id);
    this.caseActive = true;

    // Spawn evidence entities in scene
    this._spawnEvidenceEntities();

    // Create player entity if not exists
    this._createPlayer();

    this._registerSceneEventHandlers();

    this.loaded = true;

    // Emit tutorial start event
    this.eventBus.emit('tutorial:started', {
      caseId: tutorialCase.id
    });

    console.log('[TutorialScene] Tutorial scene loaded');
  }

  /**
   * Unload the tutorial scene
   */
  unload() {
    if (!this.loaded) return;

    this._teardownSceneEventHandlers();

    // Clean up evidence entities
    for (const entityId of this.evidenceEntities.values()) {
      if (this.componentRegistry?.removeAllComponents) {
        this.componentRegistry.removeAllComponents(entityId);
      }
      if (typeof this.entityManager.destroyEntity === 'function') {
        this.entityManager.destroyEntity(entityId);
      }
    }
    this.evidenceEntities.clear();

    this.playerEntityId = null;

    this.loaded = false;
    this.caseActive = false;

    console.log('[TutorialScene] Tutorial scene unloaded');
  }

  /**
   * Update scene
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.loaded) return;

    // Check case completion
    if (this.caseActive) {
      const caseFile = this.caseManager.getCase(tutorialCase.id);
      if (caseFile && caseFile.status === 'solved') {
        this._onCaseCompleted(caseFile);
      }
    }
  }

  /**
   * Register evidence and clues in manager databases
   * @private
   */
  _registerEvidenceAndClues() {
    // Register evidence
    tutorialEvidence.forEach(evidence => {
      this.caseManager.evidenceDatabase.set(evidence.id, evidence);
    });

    // Register clues
    tutorialClues.forEach(clue => {
      this.caseManager.clueDatabase.set(clue.id, clue);
    });

    console.log(
      `[TutorialScene] Registered ${tutorialEvidence.length} evidence and ${tutorialClues.length} clues`
    );
  }

  /**
   * Spawn evidence entities in the scene
   * @private
   */
  _registerSceneEventHandlers() {
    this._teardownSceneEventHandlers();

    const offEvidenceCollected = this.eventBus.on('evidence:collected', (data = {}) => {
      this._handleEvidenceCollected(data);
    });

    this._eventHandlers.push(offEvidenceCollected);
  }

  /**
   * Remove any registered scene event handlers.
   * @private
   */
  _teardownSceneEventHandlers() {
    if (!Array.isArray(this._eventHandlers)) {
      this._eventHandlers = [];
      return;
    }

    for (const off of this._eventHandlers) {
      if (typeof off === 'function') {
        off();
      }
    }

    this._eventHandlers.length = 0;
  }

  /**
   * Handle evidence collected event for tutorial visuals.
   * @param {Object} data
   * @private
   */
  _handleEvidenceCollected(data = {}) {
    const { evidenceId } = data;
    if (!evidenceId || !this.evidenceEntities.has(evidenceId)) {
      return;
    }

    const entityId = this.evidenceEntities.get(evidenceId);
    const sprite = this.componentRegistry?.getComponent?.(entityId, 'Sprite');
    if (sprite) {
      sprite.color = '#555555';
      sprite.alpha = 0.65;
    }
  }

  /**
   * Spawn evidence entities in the scene
   * @private
   */
  _spawnEvidenceEntities() {
    for (const evidence of tutorialEvidence) {
      const { position = { x: 0, y: 0 } } = evidence;
      const requiresAbility = Array.isArray(evidence.requires)
        ? evidence.requires[0] ?? null
        : evidence.requires ?? null;

      const entityId = createEvidenceEntity(this.entityManager, this.componentRegistry, {
        x: position.x,
        y: position.y,
        id: evidence.id,
        type: evidence.type,
        category: evidence.category,
        title: evidence.title,
        description: evidence.description,
        caseId: tutorialCase.id,
        hidden: Boolean(evidence.hidden),
        requires: requiresAbility,
        derivedClues: evidence.derivedClues || [],
        prompt: evidence.interactionPrompt || null,
      });

      this.evidenceEntities.set(evidence.id, entityId);
    }

    console.log(`[TutorialScene] Spawned ${this.evidenceEntities.size} evidence entities`);
  }

  /**
   * Create player entity
   * @private
   */
  _createPlayer() {
    // Check if player already exists
    const getByTag = this.entityManager.getEntitiesByTag?.bind(this.entityManager);
    const existingPlayers = typeof getByTag === 'function' ? getByTag('player') : [];
    if (existingPlayers && existingPlayers.length > 0) {
      this.playerEntityId = existingPlayers[0];
      console.log('[TutorialScene] Player already exists');
      return this.playerEntityId;
    }

    const playerEntityId = createPlayerEntity(this.entityManager, this.componentRegistry, 100, 300);
    this.playerEntityId = playerEntityId;

    console.log('[TutorialScene] Player entity created');
    return playerEntityId;
  }

  /**
   * Handle case completion
   * @private
   */
  _onCaseCompleted(caseFile) {
    if (!this.caseActive) return;

    this.caseActive = false;

    console.log(
      `[TutorialScene] Case completed! Accuracy: ${(caseFile.accuracy * 100).toFixed(0)}%`
    );

    // Award rewards
    if (tutorialCase.solution.rewards) {
      this._awardRewards(tutorialCase.solution.rewards);
    }

    // Emit tutorial completed event
    this.eventBus.emit('tutorial:completed', {
      caseId: tutorialCase.id,
      accuracy: caseFile.accuracy,
      timeTaken: caseFile.solveTime,
      rewards: tutorialCase.solution.rewards
    });
  }

  /**
   * Award case completion rewards
   * @private
   */
  _awardRewards(rewards) {
    if (rewards.abilityUnlock) {
      console.log(`[TutorialScene] Ability unlocked: ${rewards.abilityUnlock}`);
      this.eventBus.emit('ability:unlocked', {
        abilityId: rewards.abilityUnlock
      });
    }

    if (rewards.credits) {
      console.log(`[TutorialScene] Credits earned: ${rewards.credits}`);
      this.eventBus.emit('credits:earned', {
        amount: rewards.credits
      });

      const currencyPayload = currencyDeltaToInventoryUpdate({
        amount: rewards.credits,
        source: 'tutorial_case',
        metadata: {
          caseId: tutorialCase.id,
          rewardType: 'case_solution',
        },
      });

      if (currencyPayload) {
        this.eventBus.emit('inventory:item_updated', currencyPayload);
      }
    }

    if (rewards.reputation) {
      console.log(
        `[TutorialScene] Reputation changed: ${rewards.reputation.faction} ${rewards.reputation.change > 0 ? '+' : ''}${rewards.reputation.change}`
      );
      this.eventBus.emit('reputation:changed', {
        faction: rewards.reputation.faction,
        change: rewards.reputation.change
      });
    }

    if (rewards.experience) {
      console.log(`[TutorialScene] Experience earned: ${rewards.experience}`);
      this.eventBus.emit('experience:earned', {
        amount: rewards.experience
      });
    }

    if (Array.isArray(rewards.items)) {
      for (const rewardItem of rewards.items) {
        const inventoryPayload = questRewardToInventoryItem(rewardItem, {
          questId: tutorialCase.id,
          questTitle: tutorialCase.title,
          questType: 'tutorial_case',
          source: 'tutorial_case_reward',
        });

        if (inventoryPayload) {
          this.eventBus.emit('inventory:item_added', inventoryPayload);
        }
      }
    }
  }

  /**
   * Get tutorial progress
   * @returns {Object} Progress data
   */
  getProgress() {
    if (!this.caseActive) {
      return null;
    }

    return this.caseManager.getCaseProgress(tutorialCase.id);
  }

  /**
   * Get tutorial hints
   * @returns {Array} Array of hint strings
   */
  getHints() {
    return tutorialCase.narrative.hints || [];
  }

  /**
   * Reset tutorial scene
   */
  reset() {
    this.unload();
    this.load();
  }
}
