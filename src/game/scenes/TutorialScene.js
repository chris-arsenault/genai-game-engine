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
import { Transform } from '../components/Transform.js';
import { Collider } from '../components/Collider.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';
import { QUEST_001_HOLLOW_CASE } from '../data/quests/act1Quests.js';
import { createNPCEntity } from '../entities/NPCEntity.js';
import { createMartinezDialogue } from '../data/dialogues/MartinezWitnessDialogue.js';
import { createMrsChenDialogue } from '../data/dialogues/MrsChenWitnessDialogue.js';
import {
  NarrativeActs,
  NarrativeBeats,
} from '../data/narrative/NarrativeBeatCatalog.js';

const TUTORIAL_TRIGGER_IDS = Object.freeze({
  ARRIVAL: 'crime_scene_entry',
  DETECTIVE_VISION: 'tutorial_detective_vision_training',
  DEDUCTION: 'tutorial_deduction_board',
  EXIT: 'tutorial_scene_exit',
});

const TUTORIAL_TRIGGER_DEFINITIONS = [
  {
    id: TUTORIAL_TRIGGER_IDS.ARRIVAL,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_arrive_scene',
    areaId: 'crime_scene_alley',
    radius: 150,
    once: true,
    prompt: 'Crime Scene Perimeter',
    triggerType: 'crime_scene',
    metadata: {
      moodHint: 'investigation_peak',
      narrativeBeat: NarrativeBeats.tutorial.ARRIVAL,
    },
  },
  {
    id: TUTORIAL_TRIGGER_IDS.DETECTIVE_VISION,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_unlock_detective_vision',
    areaId: 'tutorial_detective_vision_training',
    radius: 120,
    once: true,
    prompt: 'Use Detective Vision to reveal hidden evidence hotspots.',
    triggerType: 'tutorial_training',
    metadata: {
      tutorialStage: 'detective_vision',
      moodHint: 'investigation_focus',
      narrativeBeat: NarrativeBeats.tutorial.DETECTIVE_VISION,
    },
  },
  {
    id: TUTORIAL_TRIGGER_IDS.DEDUCTION,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_connect_clues',
    areaId: 'tutorial_deduction_board',
    radius: 96,
    once: false,
    prompt: 'Open the deduction board to connect Marcus’s clues.',
    triggerType: 'tutorial_objective',
    metadata: {
      tutorialStage: 'deduction_board',
      moodHint: 'analysis_phase',
      narrativeBeat: NarrativeBeats.tutorial.DEDUCTION,
    },
  },
  {
    id: TUTORIAL_TRIGGER_IDS.EXIT,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_report_findings',
    areaId: 'tutorial_scene_exit',
    radius: 128,
    once: true,
    prompt: 'Exit to report findings to Captain Reese.',
    triggerType: 'scene_exit',
    metadata: {
      tutorialStage: 'reporting',
      moodHint: 'resolution_moment',
      narrativeBeat: NarrativeBeats.tutorial.REPORT,
    },
  },
];

const TUTORIAL_TRIGGER_LAYOUT = {
  [TUTORIAL_TRIGGER_IDS.ARRIVAL]: {
    x: 200,
    y: 320,
    radius: 200,
  },
  [TUTORIAL_TRIGGER_IDS.DETECTIVE_VISION]: {
    x: 520,
    y: 210,
    width: 220,
    height: 170,
  },
  [TUTORIAL_TRIGGER_IDS.DEDUCTION]: {
    x: 340,
    y: 160,
    width: 180,
    height: 120,
  },
  [TUTORIAL_TRIGGER_IDS.EXIT]: {
    x: 60,
    y: 250,
    width: 140,
    height: 160,
  },
};

function ensureTutorialTriggerDefinitions() {
  for (const definition of TUTORIAL_TRIGGER_DEFINITIONS) {
    if (!QuestTriggerRegistry.getTriggerDefinition(definition.id)) {
      QuestTriggerRegistry.registerDefinition(definition);
    }
  }
}

ensureTutorialTriggerDefinitions();

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
    this.witnessEntities = new Map();
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

    ensureTutorialTriggerDefinitions();

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
      {
        reusePlayerId: null,
        narrativeContext: NarrativeActs.TUTORIAL,
      }
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

    this._ensureTutorialDialogues();

    const witnessEntityIds = this._spawnWitnesses(tutorialCase.witnesses || []);
    for (const witnessEntityId of witnessEntityIds) {
      if (witnessEntityId != null) {
        this.sceneEntities.add(witnessEntityId);
      }
    }

    const questTriggerToolkit = new TriggerMigrationToolkit(this.componentRegistry, this.eventBus);
    const tutorialTriggerEntities = this._createTutorialQuestTriggers(questTriggerToolkit);
    for (const entityId of tutorialTriggerEntities) {
      if (entityId != null) {
        this.sceneEntities.add(entityId);
      }
    }

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
      this._evaluateWitnessAvailability();
    });

    const offObjectiveCompleted = this.eventBus.on('case:objective_completed', (data = {}) => {
      if (data.caseId === tutorialCase.id) {
        this._evaluateWitnessAvailability();
      }
    });

    this._eventHandlers.push(offEvidenceCollected, offObjectiveCompleted);
  }

  _ensureTutorialDialogues() {
    const dialogueSystem = this.game?.gameSystems?.dialogue;
    if (!dialogueSystem || typeof dialogueSystem.registerDialogueTree !== 'function') {
      return;
    }

    const ensureDialogue = (dialogueId, factory) => {
      if (typeof dialogueSystem.getDialogueTree === 'function') {
        const existing = dialogueSystem.getDialogueTree(dialogueId);
        if (existing) {
          return;
        }
      }

      const tree = factory();
      dialogueSystem.registerDialogueTree(tree);
    };

    ensureDialogue('martinez_witness_interview', createMartinezDialogue);
    ensureDialogue('mrs_chen_witness_interview', createMrsChenDialogue);
  }

  /**
   * Spawn witness NPCs defined on the tutorial case.
   * @param {Array<Object>} witnesses
   * @returns {number[]} Entity IDs for spawned witnesses
   * @private
   */
  _spawnWitnesses(witnesses = []) {
    if (!Array.isArray(witnesses) || witnesses.length === 0) {
      return [];
    }

    if (!(this.witnessEntities instanceof Map)) {
      this.witnessEntities = new Map();
    }

    const spawnIds = [];

    for (const witness of witnesses) {
      if (!witness || typeof witness.id !== 'string') {
        continue;
      }

      const { position = {} } = witness;
      const entityId = createNPCEntity(this.entityManager, this.componentRegistry, {
        id: witness.id,
        name: witness.name ?? witness.id,
        faction: witness.faction ?? 'civilian',
        x: Number.isFinite(position.x) ? position.x : 0,
        y: Number.isFinite(position.y) ? position.y : 0,
        hasDialogue: Boolean(witness.dialogueId),
        dialogueId: witness.dialogueId,
        navigationAgent: witness.navigationAgent ?? null
      });

      const interactionZone = this.componentRegistry?.getComponent?.(entityId, 'InteractionZone');
      if (interactionZone) {
        if (Number.isFinite(witness.interaction?.radius)) {
          interactionZone.radius = witness.interaction.radius;
        }

        if (typeof witness.interaction?.prompt === 'string' && witness.interaction.prompt.length > 0) {
          interactionZone.prompt = witness.interaction.prompt;
        }

        if (typeof witness.interaction?.promptAction === 'string') {
          interactionZone.promptAction = witness.interaction.promptAction;
        }
      }

      this.witnessEntities.set(witness.id, {
        entityId,
        definition: witness,
        unlocked: false,
        defaultPrompt: interactionZone?.prompt ?? `Talk to ${witness.name ?? witness.id}`,
        lockedPrompt: witness.interaction?.lockedPrompt ?? 'Collect more evidence before interviewing.'
      });

      spawnIds.push(entityId);
    }

    this._evaluateWitnessAvailability();

    return spawnIds;
  }

  /**
   * Evaluate witness prerequisites and toggle interaction availability.
   * @private
   */
  _evaluateWitnessAvailability() {
    if (!(this.witnessEntities instanceof Map) || this.witnessEntities.size === 0) {
      return;
    }

    const caseFile = this.caseManager?.getCase?.(tutorialCase.id);
    const collectedEvidence = caseFile?.collectedEvidence;
    const objectives = Array.isArray(caseFile?.objectives) ? caseFile.objectives : [];

    for (const [witnessId, entry] of this.witnessEntities.entries()) {
      if (!entry || entry.entityId == null || !entry.definition) {
        continue;
      }

      const interactionZone = this.componentRegistry?.getComponent?.(entry.entityId, 'InteractionZone');
      if (!interactionZone) {
        continue;
      }

      const requiredEvidence = Array.isArray(entry.definition.prerequisites?.requiredEvidence)
        ? entry.definition.prerequisites.requiredEvidence
        : [];
      const requiredObjective = entry.definition.prerequisites?.requiredObjective ?? null;

      const hasEvidence =
        requiredEvidence.length === 0 ||
        requiredEvidence.every((evidenceId) => {
          if (!evidenceId) {
            return true;
          }
          if (collectedEvidence instanceof Set) {
            return collectedEvidence.has(evidenceId);
          }
          if (Array.isArray(collectedEvidence)) {
            return collectedEvidence.includes(evidenceId);
          }
          return false;
        });

      const hasObjective =
        !requiredObjective ||
        objectives.some((objective) => objective.id === requiredObjective && objective.completed);

      const shouldUnlock = hasEvidence && hasObjective;

      if (shouldUnlock && !entry.unlocked) {
        interactionZone.active = true;
        interactionZone.prompt = entry.defaultPrompt;
        entry.unlocked = true;
        this.witnessEntities.set(witnessId, entry);
      } else if (!shouldUnlock && entry.unlocked) {
        interactionZone.active = false;
        interactionZone.prompt = entry.lockedPrompt ?? entry.defaultPrompt;
        entry.unlocked = false;
        this.witnessEntities.set(witnessId, entry);
      } else if (!shouldUnlock && entry.unlocked === false) {
        interactionZone.active = false;
        interactionZone.prompt = entry.lockedPrompt ?? entry.defaultPrompt;
      }
    }
  }

  /**
   * Create registry-backed quest triggers for tutorial objectives.
   * @param {TriggerMigrationToolkit} questTriggerToolkit
   * @returns {number[]} Entity IDs created for tutorial triggers
   * @private
   */
  _createTutorialQuestTriggers(questTriggerToolkit) {
    if (!questTriggerToolkit || typeof questTriggerToolkit.createQuestTrigger !== 'function') {
      return [];
    }

    const entities = [];
    for (const [triggerId, layout] of Object.entries(TUTORIAL_TRIGGER_LAYOUT)) {
      const entityId = this._createTutorialTriggerEntity(questTriggerToolkit, triggerId, layout);
      if (entityId != null) {
        entities.push(entityId);
      }
    }
    return entities;
  }

  /**
   * Construct a tutorial trigger entity aligned with registry definitions.
   * @param {TriggerMigrationToolkit} questTriggerToolkit
   * @param {string} triggerId
   * @param {{x:number,y:number,width:number,height:number}} layout
   * @returns {number|null} Entity ID or null when construction fails
   * @private
   */
  _createTutorialTriggerEntity(questTriggerToolkit, triggerId, layout) {
    if (
      !layout ||
      typeof layout.x !== 'number' ||
      typeof layout.y !== 'number' ||
      typeof layout.width !== 'number' ||
      typeof layout.height !== 'number'
    ) {
      return null;
    }

    if (
      !this.entityManager ||
      typeof this.entityManager.createEntity !== 'function' ||
      !this.componentRegistry ||
      typeof this.componentRegistry.addComponent !== 'function'
    ) {
      return null;
    }

    const definition = QuestTriggerRegistry.getTriggerDefinition(triggerId);
    if (!definition) {
      return null;
    }

    const entityId = this.entityManager.createEntity('tutorial_trigger');
    let interactionRadius = null;

    if (Number.isFinite(layout.radius)) {
      const transform = new Transform(layout.x, layout.y, 0, 1, 1);
      this.componentRegistry.addComponent(entityId, 'Transform', transform);

      const collider = new Collider({
        type: 'circle',
        radius: layout.radius,
        isTrigger: true,
        isStatic: true,
        tags: ['tutorial_trigger', 'quest_trigger'],
      });
      this.componentRegistry.addComponent(entityId, 'Collider', collider);
      interactionRadius = layout.radius;
    } else {
      const centerX = layout.x + layout.width / 2;
      const centerY = layout.y + layout.height / 2;

      const transform = new Transform(centerX, centerY, 0, 1, 1);
      this.componentRegistry.addComponent(entityId, 'Transform', transform);

      const collider = new Collider({
        type: 'AABB',
        width: layout.width,
        height: layout.height,
        isTrigger: true,
        isStatic: true,
        tags: ['tutorial_trigger', 'quest_trigger'],
      });
      this.componentRegistry.addComponent(entityId, 'Collider', collider);

      interactionRadius = Math.max(layout.width, layout.height) / 2;
    }
    const effectiveRadius = Number.isFinite(interactionRadius)
      ? interactionRadius
      : Number.isFinite(definition.radius)
      ? definition.radius
      : 96;

    const interaction = new InteractionZone({
      id: triggerId,
      type: 'trigger',
      radius: effectiveRadius,
      requiresInput: false,
      prompt: definition.prompt ?? 'Interact',
      oneShot: definition.once ?? true,
      data: {
        areaId: definition.areaId,
        questTrigger: true,
        tutorialStage: definition.metadata?.tutorialStage ?? null,
      },
    });
    this.componentRegistry.addComponent(entityId, 'InteractionZone', interaction);

    questTriggerToolkit.createQuestTrigger(entityId, triggerId);
    return entityId;
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

    if (this.witnessEntities instanceof Map) {
      this.witnessEntities.clear();
    }
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
