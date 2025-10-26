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

export class TutorialScene {
  /**
   * Create a TutorialScene
   * @param {Object} game - Game instance with managers and systems
   */
  constructor(game) {
    this.game = game;
    this.entityManager = game.entityManager;
    this.caseManager = game.caseManager;
    this.eventBus = game.eventBus;

    // Scene state
    this.loaded = false;
    this.caseActive = false;
    this.evidenceEntities = [];

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

    // Create the tutorial case
    this.caseManager.createCase(tutorialCase);
    this.caseManager.setActiveCase(tutorialCase.id);
    this.caseActive = true;

    // Spawn evidence entities in scene
    this._spawnEvidenceEntities();

    // Create player entity if not exists
    this._createPlayer();

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

    // Clean up evidence entities
    this.evidenceEntities.forEach(entity => {
      this.entityManager.removeEntity(entity.id);
    });
    this.evidenceEntities = [];

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
  _spawnEvidenceEntities() {
    tutorialEvidence.forEach(evidence => {
      const entity = this._createEvidenceEntity(evidence);
      this.evidenceEntities.push(entity);
    });

    console.log(`[TutorialScene] Spawned ${this.evidenceEntities.length} evidence entities`);
  }

  /**
   * Create an evidence entity
   * @private
   * @param {Object} evidenceData - Evidence data
   * @returns {Object} Created entity
   */
  _createEvidenceEntity(evidenceData) {
    const entity = this.entityManager.createEntity();

    // Position component
    entity.addComponent('PositionComponent', {
      x: evidenceData.position.x,
      y: evidenceData.position.y
    });

    // Evidence component
    entity.addComponent('EvidenceComponent', {
      evidenceId: evidenceData.id,
      caseId: tutorialCase.id,
      collected: false,
      title: evidenceData.title,
      description: evidenceData.description,
      type: evidenceData.type,
      interactionPrompt: evidenceData.interactionPrompt || 'Examine evidence',
      derivedClues: evidenceData.derivedClues || []
    });

    // Interactable component
    entity.addComponent('InteractableComponent', {
      range: 50,
      prompt: evidenceData.interactionPrompt || 'Press E to examine',
      onInteract: (playerEntity) => {
        this._onEvidenceInteract(entity, playerEntity);
      }
    });

    // Render component (simple marker for now)
    entity.addComponent('RenderComponent', {
      type: 'circle',
      radius: 10,
      color: evidenceData.collected ? '#555555' : '#ffd700', // Gold when uncollected
      zIndex: 5
    });

    entity.addTag('evidence');

    return entity;
  }

  /**
   * Create player entity
   * @private
   */
  _createPlayer() {
    // Check if player already exists
    const existingPlayer = this.entityManager.getEntitiesWithTag('player')[0];
    if (existingPlayer) {
      console.log('[TutorialScene] Player already exists');
      return existingPlayer;
    }

    const player = this.entityManager.createEntity();

    // Position player at scene start
    player.addComponent('PositionComponent', {
      x: 100,
      y: 300
    });

    // Velocity component
    player.addComponent('VelocityComponent', {
      x: 0,
      y: 0
    });

    // Input component
    player.addComponent('InputComponent', {
      keys: {},
      mouseX: 0,
      mouseY: 0
    });

    // Render component
    player.addComponent('RenderComponent', {
      type: 'circle',
      radius: 15,
      color: '#4a9eff',
      zIndex: 10
    });

    player.addTag('player');

    console.log('[TutorialScene] Player entity created');
    return player;
  }

  /**
   * Handle evidence interaction
   * @private
   */
  _onEvidenceInteract(evidenceEntity, playerEntity) {
    const evidenceComp = evidenceEntity.getComponent('EvidenceComponent');

    if (evidenceComp.collected) {
      console.log('[TutorialScene] Evidence already collected');
      return;
    }

    // Mark as collected
    evidenceComp.collected = true;

    // Update render color
    const renderComp = evidenceEntity.getComponent('RenderComponent');
    if (renderComp) {
      renderComp.color = '#555555'; // Gray when collected
    }

    // Emit evidence collected event
    this.eventBus.emit('evidence:collected', {
      caseId: evidenceComp.caseId,
      evidenceId: evidenceComp.evidenceId
    });

    // Derive clues from evidence
    evidenceComp.derivedClues.forEach(clueId => {
      this.eventBus.emit('clue:derived', {
        caseId: evidenceComp.caseId,
        clueId: clueId
      });
    });

    console.log(`[TutorialScene] Evidence collected: ${evidenceComp.title}`);
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
