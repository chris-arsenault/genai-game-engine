/**
 * QuestSystem
 *
 * ECS system that integrates QuestManager with the game world.
 * Handles quest trigger zones, objective markers, quest givers, and UI updates.
 *
 * Components used:
 * - QuestGiver: NPCs that can start quests
 * - QuestTrigger: Area triggers that start/progress quests
 * - ObjectiveMarker: Visual markers for quest objectives
 *
 * Priority: 27 (After movement, before rendering)
 */

import { System } from '../../engine/ecs/System.js';

export class QuestSystem extends System {
  constructor(componentRegistry, eventBus, questManager) {
    super(componentRegistry, eventBus, ['Quest']);
    this.priority = 27;
    this.quests = questManager;
    this.components = this.componentRegistry;

    // Track which quests have been auto-started
    this.autoStartedQuests = new Set();
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to quest events for UI updates
    this.eventBus.subscribe('quest:started', (data) => this.onQuestStarted(data));
    this.eventBus.subscribe('quest:completed', (data) => this.onQuestCompleted(data));
    this.eventBus.subscribe('quest:failed', (data) => this.onQuestFailed(data));
    this.eventBus.subscribe('objective:progress', (data) => this.onObjectiveProgress(data));
    this.eventBus.subscribe('objective:completed', (data) => this.onObjectiveCompleted(data));

    console.log('[QuestSystem] Initialized');
  }

  /**
   * Update quest system
   * @param {number} deltaTime
   * @param {Array} entities - Entities with Quest component (quest triggers, givers, markers)
   */
  update(deltaTime, entities) {
    // Get player entity
    const playerEntities = this.components.queryEntities(['Player', 'Transform']);
    if (playerEntities.length === 0) return;

    const playerEntity = playerEntities[0];
    const playerTransform = this.components.getComponent(playerEntity, 'Transform');

    // Check quest triggers and givers
    for (const entity of entities) {
      const quest = this.components.getComponent(entity, 'Quest');
      const transform = this.components.getComponent(entity, 'Transform');

      if (!transform) continue;

      // Check distance to player
      const dx = transform.x - playerTransform.x;
      const dy = transform.y - playerTransform.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Handle quest triggers
      if (quest.type === 'trigger') {
        this.updateQuestTrigger(entity, quest, distance);
      }

      // Handle quest givers
      if (quest.type === 'giver') {
        this.updateQuestGiver(entity, quest, distance);
      }

      // Handle objective markers
      if (quest.type === 'marker') {
        this.updateObjectiveMarker(entity, quest, distance);
      }
    }

    // Auto-start quests that have prerequisites met
    this.checkAutoStartQuests();
  }

  /**
   * Handle quest trigger zones
   * @param {number} entity
   * @param {Object} quest
   * @param {number} distance
   */
  updateQuestTrigger(entity, quest, distance) {
    const radius = quest.triggerRadius || 64;

    if (distance <= radius && !quest.triggered) {
      // Player entered trigger zone
      quest.triggered = true;

      if (quest.startQuestId) {
        const started = this.quests.startQuest(quest.startQuestId);
        if (started) {
          console.log(`[QuestSystem] Trigger activated: ${quest.startQuestId}`);

          // Emit trigger event for objective tracking
          this.eventBus.emit('area:entered', {
            triggerId: entity,
            areaId: quest.areaId || `trigger_${entity}`
          });

          // Destroy trigger if one-time only
          if (quest.oneTime) {
            this.components.removeEntity(entity);
          }
        }
      }

      // Progress objective if specified
      if (quest.objectiveId) {
        this.eventBus.emit('area:entered', {
          areaId: quest.areaId || `trigger_${entity}`
        });
      }
    } else if (distance > radius + 32 && quest.triggered) {
      // Player left trigger zone (with hysteresis)
      if (!quest.oneTime) {
        quest.triggered = false;
      }
    }
  }

  /**
   * Handle quest giver NPCs
   * @param {number} entity
   * @param {Object} quest
   * @param {number} distance
   */
  updateQuestGiver(entity, quest, distance) {
    const radius = quest.interactRadius || 48;

    if (distance <= radius) {
      // Player can interact with quest giver
      if (!quest.interactable) {
        quest.interactable = true;

        // Show interaction prompt
        this.eventBus.emit('ui:interaction:show', {
          entity,
          text: 'Talk',
          action: () => this.interactWithQuestGiver(entity, quest)
        });
      }
    } else {
      if (quest.interactable) {
        quest.interactable = false;

        // Hide interaction prompt
        this.eventBus.emit('ui:interaction:hide', { entity });
      }
    }
  }

  /**
   * Handle interaction with quest giver
   * @param {number} entity
   * @param {Object} quest
   */
  interactWithQuestGiver(entity, quest) {
    const npc = this.components.getComponent(entity, 'NPC');

    // Check if quest giver has available quests
    const availableQuests = quest.quests || [];
    const activeQuests = [];
    const completedQuests = [];

    for (const questId of availableQuests) {
      const questData = this.quests.getQuest(questId);
      if (!questData) continue;

      // Check if quest is active
      if (this.quests.activeQuests.has(questId)) {
        activeQuests.push(questData);
      }
      // Check if quest is available
      else if (!this.quests.completedQuests.has(questId) &&
               this.quests.checkPrerequisites(questData)) {
        // Start dialogue to offer quest
        this.eventBus.emit('dialogue:start', {
          npcId: npc?.id || entity,
          dialogueId: `quest_offer_${questId}`,
          onAccept: () => this.quests.startQuest(questId)
        });
        return;
      }
      // Check if quest is completed and giver has follow-up dialogue
      else if (this.quests.completedQuests.has(questId)) {
        completedQuests.push(questData);
      }
    }

    // If active quests, show turn-in dialogue
    if (activeQuests.length > 0) {
      const quest = activeQuests[0]; // Show first active quest
      this.eventBus.emit('dialogue:start', {
        npcId: npc?.id || entity,
        dialogueId: `quest_active_${quest.id}`
      });
      return;
    }

    // If completed quests, show acknowledgment
    if (completedQuests.length > 0) {
      this.eventBus.emit('dialogue:start', {
        npcId: npc?.id || entity,
        dialogueId: `quest_complete_thanks`
      });
      return;
    }

    // Default dialogue
    this.eventBus.emit('dialogue:start', {
      npcId: npc?.id || entity,
      dialogueId: 'default'
    });
  }

  /**
   * Update objective markers
   * @param {number} entity
   * @param {Object} quest
   * @param {number} distance
   */
  updateObjectiveMarker(entity, quest, distance) {
    // Check if the objective this marker points to is still active
    if (quest.questId && quest.objectiveId) {
      const questData = this.quests.getQuest(quest.questId);
      if (!questData || questData.status !== 'active') {
        // Quest not active, hide marker
        const sprite = this.components.getComponent(entity, 'Sprite');
        if (sprite) {
          sprite.visible = false;
        }
        return;
      }

      const objectives = this.quests.getQuestObjectives(quest.questId);
      const objective = objectives.find(obj => obj.id === quest.objectiveId);

      if (objective && objective.state.status === 'completed') {
        // Objective complete, remove marker
        this.components.removeEntity(entity);
        return;
      }

      // Show marker if objective is active
      const sprite = this.components.getComponent(entity, 'Sprite');
      if (sprite) {
        sprite.visible = true;

        // Pulse effect based on distance
        if (distance < 200) {
          sprite.alpha = 0.7 + Math.sin(Date.now() / 300) * 0.3;
        } else {
          sprite.alpha = 1.0;
        }
      }
    }
  }

  /**
   * Check for quests that should auto-start
   */
  checkAutoStartQuests() {
    const activeQuests = this.quests.getActiveQuests();

    // Check all registered quests
    for (const [questId, questData] of this.quests.quests) {
      // Skip if already started or completed
      if (this.quests.activeQuests.has(questId) ||
          this.quests.completedQuests.has(questId) ||
          this.autoStartedQuests.has(questId)) {
        continue;
      }

      // Check if quest has autoStart flag and prerequisites are met
      if (questData.autoStart && this.quests.checkPrerequisites(questData)) {
        const started = this.quests.startQuest(questId);
        if (started) {
          this.autoStartedQuests.add(questId);
          console.log(`[QuestSystem] Auto-started quest: ${questId}`);
        }
      }
    }
  }

  // Event handlers

  onQuestStarted(data) {
    console.log(`[QuestSystem] Quest started: ${data.title}`);

    // Show notification
    this.eventBus.emit('ui:notification:show', {
      type: 'quest_started',
      title: 'New Quest',
      message: data.title,
      duration: 3000
    });

    // Update quest log UI
    this.eventBus.emit('ui:questlog:update');
  }

  onQuestCompleted(data) {
    console.log(`[QuestSystem] Quest completed: ${data.title}`);

    // Show notification
    this.eventBus.emit('ui:notification:show', {
      type: 'quest_completed',
      title: 'Quest Complete',
      message: data.title,
      duration: 4000
    });

    // Play sound
    this.eventBus.emit('audio:sfx:play', { id: 'quest_complete' });

    // Update quest log UI
    this.eventBus.emit('ui:questlog:update');
  }

  onQuestFailed(data) {
    console.log(`[QuestSystem] Quest failed: ${data.title} (${data.reason})`);

    // Show notification
    this.eventBus.emit('ui:notification:show', {
      type: 'quest_failed',
      title: 'Quest Failed',
      message: `${data.title}: ${data.reason}`,
      duration: 4000
    });

    // Update quest log UI
    this.eventBus.emit('ui:questlog:update');
  }

  onObjectiveProgress(data) {
    // Update objective UI
    this.eventBus.emit('ui:objective:update', data);
  }

  onObjectiveCompleted(data) {
    console.log(`[QuestSystem] Objective completed: ${data.objectiveId}`);

    // Show brief notification
    this.eventBus.emit('ui:notification:show', {
      type: 'objective_completed',
      title: 'Objective Complete',
      duration: 2000
    });

    // Play sound
    this.eventBus.emit('audio:sfx:play', { id: 'objective_complete' });

    // Update UI
    this.eventBus.emit('ui:objective:update', data);
  }

  /**
   * Create a quest trigger entity
   * @param {number} x
   * @param {number} y
   * @param {string} questId
   * @param {Object} options
   * @returns {number} Entity ID
   */
  createQuestTrigger(x, y, questId, options = {}) {
    const entity = this.components.createEntity();

    this.components.addComponent(entity, 'Transform', { x, y });
    this.components.addComponent(entity, 'Quest', {
      type: 'trigger',
      startQuestId: questId,
      triggerRadius: options.radius || 64,
      oneTime: options.oneTime !== false,
      triggered: false,
      areaId: options.areaId || `trigger_${entity}`
    });

    return entity;
  }

  /**
   * Create an objective marker entity
   * @param {number} x
   * @param {number} y
   * @param {string} questId
   * @param {string} objectiveId
   * @returns {number} Entity ID
   */
  createObjectiveMarker(x, y, questId, objectiveId) {
    const entity = this.components.createEntity();

    this.components.addComponent(entity, 'Transform', { x, y });
    this.components.addComponent(entity, 'Quest', {
      type: 'marker',
      questId,
      objectiveId
    });
    this.components.addComponent(entity, 'Sprite', {
      sprite: 'quest_marker',
      visible: true,
      alpha: 1.0
    });

    return entity;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.autoStartedQuests.clear();
  }
}
