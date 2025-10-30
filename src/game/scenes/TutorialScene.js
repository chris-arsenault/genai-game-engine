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
import { loadAct1Scene } from './Act1Scene.js';

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
    this.sceneEntities = new Set();
    this._sceneCleanup = null;
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

    this._cleanupSceneEntities();

    // Register evidence and clues in databases
    this._registerEvidenceAndClues();

    // Ensure fresh scene state
    this._teardownSceneEventHandlers();
    this.evidenceEntities.clear();

    // Create the tutorial case
    this.caseManager.createCase(tutorialCase);
    this.caseManager.setActiveCase(tutorialCase.id);
    this.caseActive = true;

    const sceneData = await loadAct1Scene(
      this.entityManager,
      this.componentRegistry,
      this.eventBus,
      { reusePlayerId: null }
    );

    this.sceneEntities = new Set(
      Array.isArray(sceneData.sceneEntities) ? sceneData.sceneEntities : []
    );
    this._sceneCleanup = typeof sceneData.cleanup === 'function' ? sceneData.cleanup : null;
    this.playerEntityId = sceneData.playerId ?? null;
    if (this.playerEntityId != null) {
      this.sceneEntities.add(this.playerEntityId);
    }

    this._cacheEvidenceEntities();

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

    this._cleanupSceneEntities();

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
   * Destroy any existing scene entities and invoke cleanup handlers.
   * @private
   */
  _cleanupSceneEntities() {
    if (typeof this._sceneCleanup === 'function') {
      try {
        this._sceneCleanup();
      } catch (error) {
        console.warn('[TutorialScene] Scene cleanup handler failed', error);
      }
    }
    this._sceneCleanup = null;

    if (!(this.sceneEntities instanceof Set)) {
      this.sceneEntities = new Set();
    }

    const hasEntityFn = typeof this.entityManager?.hasEntity === 'function'
      ? this.entityManager.hasEntity.bind(this.entityManager)
      : null;

    for (const entityId of this.sceneEntities) {
      if (entityId == null) {
        continue;
      }
      if (this.componentRegistry?.removeAllComponents) {
        this.componentRegistry.removeAllComponents(entityId);
      }
      if (typeof this.entityManager.destroyEntity === 'function') {
        if (!hasEntityFn || hasEntityFn(entityId)) {
          this.entityManager.destroyEntity(entityId);
        }
      }
    }

    this.sceneEntities.clear();
  }

  /**
   * Build evidence entity lookup from the current scene.
   * @private
   */
  _cacheEvidenceEntities() {
    this.evidenceEntities.clear();

    const candidateEntities = [];

    if (this.sceneEntities instanceof Set) {
      for (const entityId of this.sceneEntities) {
        candidateEntities.push(entityId);
      }
    }

    if (candidateEntities.length === 0 && typeof this.componentRegistry?.queryEntities === 'function') {
      const evidenceEntities = this.componentRegistry.queryEntities('Evidence');
      if (Array.isArray(evidenceEntities)) {
        candidateEntities.push(...evidenceEntities);
      }
    }

    for (const entityId of candidateEntities) {
      const evidence = this.componentRegistry.getComponent(entityId, 'Evidence');
      if (evidence && typeof evidence.id === 'string') {
        this.evidenceEntities.set(evidence.id, entityId);
      }
    }
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
