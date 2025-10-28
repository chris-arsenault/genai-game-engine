/**
 * QuestManager
 *
 * Manages quest lifecycle: creation, activation, objective tracking, completion, branching.
 * Core narrative progression system integrating with investigation, faction, and progression systems.
 *
 * Quest Structure:
 * - id: Unique quest identifier
 * - title: Display name
 * - type: 'main', 'side', 'faction'
 * - act: 'act1', 'act2', 'act3'
 * - prerequisites: { storyFlags: [], faction: {}, abilities: [] }
 * - objectives: Array of objectives with triggers
 * - rewards: { abilityUnlock, storyFlags, factionReputation, items }
 * - branches: Conditional next quests based on completion
 */

export class QuestManager {
  constructor(eventBus, factionManager, storyFlagManager) {
    this.events = eventBus;
    this.factionManager = factionManager;
    this.storyFlags = storyFlagManager;

    // Quest state
    this.quests = new Map(); // All registered quests
    this.activeQuests = new Map(); // Currently active quests
    this.completedQuests = new Set(); // Completed quest IDs
    this.failedQuests = new Set(); // Failed quest IDs

    // Objective state
    this.objectiveProgress = new Map(); // objectiveId -> progress data
  }

  /**
   * Initialize the quest manager
   */
  init() {
    // Subscribe to game events for objective tracking
    this.events.subscribe('evidence:collected', (data) => this.onEvidenceCollected(data));
    this.events.subscribe('case:solved', (data) => this.onCaseSolved(data));
    this.events.subscribe('theory:validated', (data) => this.onTheoryValidated(data));
    this.events.subscribe('dialogue:completed', (data) => this.onDialogueCompleted(data));
    this.events.subscribe('npc:interviewed', (data) => this.onNPCInterviewed(data));
    this.events.subscribe('ability:unlocked', (data) => this.onAbilityUnlocked(data));
    this.events.subscribe('area:entered', (data) => this.onAreaEntered(data));
    this.events.subscribe('faction:reputation:changed', (data) => this.onReputationChanged(data));
    this.events.subscribe('knowledge:learned', (data) => this.onKnowledgeLearned(data));

    console.log('[QuestManager] Initialized');
  }

  /**
   * Register a quest definition
   * @param {Object} questData - Quest definition
   */
  registerQuest(questData) {
    if (!questData.id) {
      throw new Error('[QuestManager] Quest must have an id');
    }

    if (this.quests.has(questData.id)) {
      console.warn(`[QuestManager] Quest ${questData.id} already registered, overwriting`);
    }

    // Validate quest structure
    this.validateQuest(questData);

    // Store quest
    this.quests.set(questData.id, {
      ...questData,
      status: 'not_started',
      objectiveStates: this.initializeObjectiveStates(questData.objectives || [])
    });

    console.log(`[QuestManager] Registered quest: ${questData.title} (${questData.id})`);

    this.events.emit('quest:registered', {
      questId: questData.id,
      title: questData.title,
      type: questData.type,
      metadata: {
        act: questData.act,
        prerequisites: questData.prerequisites,
      }
    });
  }

  /**
   * Validate quest structure
   * @param {Object} quest
   */
  validateQuest(quest) {
    const required = ['id', 'title', 'type'];
    for (const field of required) {
      if (!quest[field]) {
        throw new Error(`[QuestManager] Quest missing required field: ${field}`);
      }
    }

    if (!['main', 'side', 'faction'].includes(quest.type)) {
      throw new Error(`[QuestManager] Invalid quest type: ${quest.type}`);
    }
  }

  /**
   * Initialize objective states for a quest
   * @param {Array} objectives
   * @returns {Map} objectiveId -> state
   */
  initializeObjectiveStates(objectives) {
    const states = new Map();
    for (const objective of objectives) {
      states.set(objective.id, {
        status: 'pending',
        progress: 0,
        target: objective.trigger?.count || 1,
        optional: objective.optional || false,
        hidden: objective.hidden || false
      });
    }
    return states;
  }

  /**
   * Check if prerequisites are met for a quest
   * @param {Object} quest
   * @returns {boolean}
   */
  checkPrerequisites(quest) {
    if (!quest.prerequisites) return true;

    const prereqs = quest.prerequisites;

    // Check story flags
    if (prereqs.storyFlags) {
      for (const flag of prereqs.storyFlags) {
        if (!this.storyFlags.hasFlag(flag)) {
          return false;
        }
      }
    }

    // Check faction requirements
    if (prereqs.faction) {
      for (const [factionId, requirements] of Object.entries(prereqs.faction)) {
        const rep = this.factionManager.getReputation(factionId);
        if (requirements.minFame && rep.fame < requirements.minFame) {
          return false;
        }
        if (requirements.maxInfamy && rep.infamy > requirements.maxInfamy) {
          return false;
        }
        if (requirements.attitude) {
          const attitude = this.factionManager.getAttitude(factionId);
          if (attitude !== requirements.attitude) {
            return false;
          }
        }
      }
    }

    // Check ability requirements
    if (prereqs.abilities) {
      for (const abilityId of prereqs.abilities) {
        if (!this.storyFlags.hasFlag(`ability_${abilityId}`)) {
          return false;
        }
      }
    }

    // Check completed quests
    if (prereqs.completedQuests) {
      for (const questId of prereqs.completedQuests) {
        if (!this.completedQuests.has(questId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Start a quest (if prerequisites met)
   * @param {string} questId
   * @returns {boolean} Success
   */
  startQuest(questId) {
    const quest = this.quests.get(questId);
    if (!quest) {
      console.error(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    if (this.activeQuests.has(questId)) {
      console.warn(`[QuestManager] Quest already active: ${questId}`);
      return false;
    }

    if (this.completedQuests.has(questId)) {
      console.warn(`[QuestManager] Quest already completed: ${questId}`);
      return false;
    }

    // Check prerequisites
    if (!this.checkPrerequisites(quest)) {
      console.log(`[QuestManager] Quest prerequisites not met: ${questId}`);
      return false;
    }

    // Activate quest
    quest.status = 'active';
    this.activeQuests.set(questId, quest);

    // Emit event
    this.events.emit('quest:started', {
      questId,
      title: quest.title,
      type: quest.type
    });

    console.log(`[QuestManager] Started quest: ${quest.title}`);
    return true;
  }

  /**
   * Update objective progress based on game event
   * @param {string} eventType
   * @param {Object} eventData
   */
  updateObjectives(eventType, eventData) {
    for (const [questId, quest] of this.activeQuests) {
      for (const objective of quest.objectives || []) {
        const state = quest.objectiveStates.get(objective.id);
        if (state.status === 'completed') continue;

        // Check if this objective is triggered by this event
        if (this.checkObjectiveTrigger(objective, eventType, eventData)) {
          this.progressObjective(questId, objective.id, quest, state);
        }
      }
    }
  }

  /**
   * Check if an objective's trigger matches the event
   * @param {Object} objective
   * @param {string} eventType
   * @param {Object} eventData
   * @returns {boolean}
   */
  checkObjectiveTrigger(objective, eventType, eventData) {
    if (!objective.trigger) return false;

    const trigger = objective.trigger;

    // Event type must match
    if (trigger.event !== eventType) return false;

    // Check additional conditions
    if (trigger.caseId && eventData.caseId !== trigger.caseId) return false;
    if (trigger.theoryId && eventData.theoryId !== trigger.theoryId) return false;
    if (trigger.npcId && eventData.npcId !== trigger.npcId) return false;
    if (trigger.areaId && eventData.areaId !== trigger.areaId) return false;
    if (trigger.abilityId && eventData.abilityId !== trigger.abilityId) return false;

    return true;
  }

  /**
   * Progress an objective
   * @param {string} questId
   * @param {string} objectiveId
   * @param {Object} quest
   * @param {Object} state
   */
  progressObjective(questId, objectiveId, quest, state) {
    state.progress++;

    // Emit progress event
    this.events.emit('objective:progress', {
      questId,
      objectiveId,
      progress: state.progress,
      target: state.target
    });

    // Check if completed
    if (state.progress >= state.target) {
      state.status = 'completed';

      this.events.emit('objective:completed', {
        questId,
        objectiveId
      });

      console.log(`[QuestManager] Objective completed: ${objectiveId} (${quest.title})`);

      // Check if all required objectives are completed
      this.checkQuestCompletion(questId, quest);
    }
  }

  /**
   * Check if quest is complete
   * @param {string} questId
   * @param {Object} quest
   */
  checkQuestCompletion(questId, quest) {
    const objectives = quest.objectives || [];
    let allRequired = true;

    for (const objective of objectives) {
      const state = quest.objectiveStates.get(objective.id);
      if (!objective.optional && state.status !== 'completed') {
        allRequired = false;
        break;
      }
    }

    if (allRequired) {
      this.completeQuest(questId);
    }
  }

  /**
   * Complete a quest and grant rewards
   * @param {string} questId
   */
  completeQuest(questId) {
    const quest = this.activeQuests.get(questId);
    if (!quest) {
      console.error(`[QuestManager] Cannot complete inactive quest: ${questId}`);
      return;
    }

    // Mark as completed
    quest.status = 'completed';
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);

    // Grant rewards
    if (quest.rewards) {
      this.grantRewards(quest.rewards);
    }

    // Emit completion event
    this.events.emit('quest:completed', {
      questId,
      title: quest.title,
      type: quest.type,
      rewards: quest.rewards
    });

    console.log(`[QuestManager] Completed quest: ${quest.title}`);

    // Check for branching quests
    if (quest.branches) {
      this.evaluateBranches(quest.branches);
    }
  }

  /**
   * Grant quest rewards
   * @param {Object} rewards
   */
  grantRewards(rewards) {
    // Ability unlock
    if (rewards.abilityUnlock) {
      this.events.emit('ability:unlocked', { abilityId: rewards.abilityUnlock });
      this.storyFlags.setFlag(`ability_${rewards.abilityUnlock}`);
      console.log(`[QuestManager] Ability unlocked: ${rewards.abilityUnlock}`);
    }

    // Story flags
    if (rewards.storyFlags) {
      for (const flag of rewards.storyFlags) {
        this.storyFlags.setFlag(flag);
      }
      console.log(`[QuestManager] Story flags set: ${rewards.storyFlags.join(', ')}`);
    }

    // Faction reputation
    if (rewards.factionReputation) {
      for (const [factionId, value] of Object.entries(rewards.factionReputation)) {
        if (value > 0) {
          this.factionManager.modifyReputation(factionId, value, 0);
        } else {
          this.factionManager.modifyReputation(factionId, 0, Math.abs(value));
        }
      }
      console.log('[QuestManager] Faction reputation granted');
    }

    // Items (future implementation)
    if (rewards.items) {
      console.log(`[QuestManager] Items granted: ${rewards.items.join(', ')}`);
    }
  }

  /**
   * Evaluate branching paths based on conditions
   * @param {Array} branches
   */
  evaluateBranches(branches) {
    for (const branch of branches) {
      if (this.evaluateBranchCondition(branch.condition)) {
        this.startQuest(branch.nextQuest);
        return; // Only take first matching branch
      }
    }
  }

  /**
   * Evaluate a branch condition
   * @param {Object} condition
   * @returns {boolean}
   */
  evaluateBranchCondition(condition) {
    for (const [key, value] of Object.entries(condition)) {
      // Check objective completion
      if (key.startsWith('obj_')) {
        const objectiveId = key;
        // Check if objective was completed in any active or recently completed quest
        // This is a simplified check; real implementation might need more context
        const completed = this.storyFlags.hasFlag(`objective_${objectiveId}_completed`);
        if (value === true && !completed) return false;
        if (value === false && completed) return false;
      }

      // Check story flags
      if (key === 'storyFlags') {
        for (const flag of value) {
          if (!this.storyFlags.hasFlag(flag)) return false;
        }
      }

      // Check faction attitudes
      if (key === 'factionAttitude') {
        for (const [factionId, requiredAttitude] of Object.entries(value)) {
          const attitude = this.factionManager.getAttitude(factionId);
          if (attitude !== requiredAttitude) return false;
        }
      }
    }

    return true;
  }

  /**
   * Fail a quest
   * @param {string} questId
   * @param {string} reason
   */
  failQuest(questId, reason) {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;

    quest.status = 'failed';
    this.activeQuests.delete(questId);
    this.failedQuests.add(questId);

    this.events.emit('quest:failed', {
      questId,
      title: quest.title,
      reason
    });

    console.log(`[QuestManager] Quest failed: ${quest.title} (${reason})`);
  }

  /**
   * Get all active quests
   * @returns {Array}
   */
  getActiveQuests() {
    return Array.from(this.activeQuests.values());
  }

  /**
   * Get quest by ID
   * @param {string} questId
   * @returns {Object|null}
   */
  getQuest(questId) {
    return this.quests.get(questId) || null;
  }

  /**
   * Get quest objectives with progress
   * @param {string} questId
   * @returns {Array}
   */
  getQuestObjectives(questId) {
    const quest = this.activeQuests.get(questId) || this.quests.get(questId);
    if (!quest) return [];

    return (quest.objectives || []).map(obj => ({
      ...obj,
      state: quest.objectiveStates.get(obj.id)
    }));
  }

  /**
   * Serialize quest state for saving
   * @returns {Object}
   */
  serialize() {
    return {
      activeQuests: Array.from(this.activeQuests.keys()),
      completedQuests: Array.from(this.completedQuests),
      failedQuests: Array.from(this.failedQuests),
      objectiveProgress: Array.from(this.objectiveProgress.entries())
    };
  }

  /**
   * Deserialize quest state from save
   * @param {Object} data
   */
  deserialize(data) {
    // Restore active quests
    if (data.activeQuests) {
      for (const questId of data.activeQuests) {
        const quest = this.quests.get(questId);
        if (quest) {
          quest.status = 'active';
          this.activeQuests.set(questId, quest);
        }
      }
    }

    // Restore completed/failed quests
    if (data.completedQuests) {
      this.completedQuests = new Set(data.completedQuests);
    }
    if (data.failedQuests) {
      this.failedQuests = new Set(data.failedQuests);
    }

    // Restore objective progress
    if (data.objectiveProgress) {
      this.objectiveProgress = new Map(data.objectiveProgress);
    }

    console.log('[QuestManager] State deserialized');
  }

  // Event handlers for objective tracking

  onEvidenceCollected(data) {
    this.updateObjectives('evidence:collected', data);
  }

  onCaseSolved(data) {
    this.updateObjectives('case:solved', data);
  }

  onTheoryValidated(data) {
    this.updateObjectives('theory:validated', data);
  }

  onDialogueCompleted(data) {
    this.updateObjectives('dialogue:completed', data);
  }

  onNPCInterviewed(data) {
    this.updateObjectives('npc:interviewed', data);
  }

  onAbilityUnlocked(data) {
    this.updateObjectives('ability:unlocked', data);
  }

  onAreaEntered(data) {
    this.updateObjectives('area:entered', data);
  }

  onReputationChanged(data) {
    this.updateObjectives('faction:reputation:changed', data);
  }

  onKnowledgeLearned(data) {
    this.updateObjectives('knowledge:learned', data);
  }
}
