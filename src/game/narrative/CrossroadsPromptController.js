import { GameConfig } from '../config/GameConfig.js';

const DEFAULT_CONFIG = GameConfig?.narrative?.act2?.crossroads || {};
const DEFAULT_DIALOGUE_ID = DEFAULT_CONFIG?.briefingDialogueId || 'dialogue_act2_crossroads_briefing';
const DEFAULT_QUEST_ID = DEFAULT_CONFIG?.questId || 'main-act2-crossroads';
const DEFAULT_NPC_ID = DEFAULT_CONFIG?.npcId || 'zara_crossroads';

function findThreadById(branchId, config = DEFAULT_CONFIG) {
  if (!branchId) {
    return null;
  }
  const threads = Array.isArray(config?.threads) ? config.threads : [];
  return threads.find((thread) => thread.id === branchId) || null;
}

function resolveAreaId(payload = {}) {
  if (payload?.areaId) {
    return payload.areaId;
  }
  if (payload?.data?.areaId) {
    return payload.data.areaId;
  }
  if (payload?.trigger?.data?.areaId) {
    return payload.trigger.data.areaId;
  }
  if (payload?.triggerId) {
    return payload.triggerId;
  }
  return null;
}

/**
 * CrossroadsPromptController
 *
 * Bridges Act 2 Crossroads trigger prompts to dialogue, quest state, and analytics hooks.
 */
export class CrossroadsPromptController {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.dialogueSystem = options.dialogueSystem;
    this.questManager = options.questManager;
    this.storyFlagManager = options.storyFlagManager;
    this.config = {
      ...DEFAULT_CONFIG,
      ...(options.config || {}),
    };

    this.dialogueId = options.dialogueId || DEFAULT_DIALOGUE_ID;
    this.crossroadsQuestId = options.questId || DEFAULT_QUEST_ID;
    this.npcId = options.npcId || DEFAULT_NPC_ID;

    this._unsubscribes = [];
    this.lastSelectedBranch = null;
  }

  init() {
    if (!this.eventBus) {
      throw new Error('[CrossroadsPromptController] EventBus instance required');
    }

    this._unsubscribes.push(
      this.eventBus.on('narrative:crossroads_prompt', (payload) => this.handleCrossroadsPrompt(payload), this, 30)
    );

    this._unsubscribes.push(
      this.eventBus.on('crossroads:thread_selected', (payload) => this.handleThreadSelected(payload), this, 20)
    );
  }

  dispose() {
    for (const off of this._unsubscribes) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._unsubscribes.length = 0;
  }

  handleCrossroadsPrompt(payload = {}) {
    const areaId = resolveAreaId(payload);
    if (!areaId) {
      return;
    }

    // Ensure the quest is active once we hit any crossroads trigger.
    this.ensureCrossroadsQuestStarted();

    const isBriefingArea = areaId === 'safehouse_briefing_table' || areaId === 'act2_crossroads_briefing';
    const isSelectionArea = areaId === 'branch_selection_console' || areaId === 'act2_crossroads_thread_select';

    if (isBriefingArea) {
      this.ensureBriefingDialogueActive();
      return;
    }

    if (isSelectionArea) {
      const started = this.ensureBriefingDialogueActive();
      if (!started && this.dialogueSystem && this.dialogueSystem.activeDialogue) {
        try {
          this.dialogueSystem.navigateToNode('thread_selection');
        } catch (error) {
          console.warn('[CrossroadsPromptController] Unable to navigate to thread selection node', error);
        }
      }
    }
  }

  handleThreadSelected(payload = {}) {
    const branchId = payload?.branchId || payload?.metadata?.branchId || null;
    if (!branchId) {
      return;
    }

    const telemetryTag = payload?.telemetryTag || payload?.metadata?.telemetryTag || null;
    if (telemetryTag) {
      this.eventBus.emit('telemetry:branch_selected', {
        tag: telemetryTag,
        branchId,
        questId: this.crossroadsQuestId,
      });
    }

    const worldFlags = Array.isArray(payload?.worldFlags)
      ? payload.worldFlags
      : Array.isArray(payload?.metadata?.worldFlags)
        ? payload.metadata.worldFlags
        : [];

    if (this.storyFlagManager && worldFlags.length > 0) {
      for (const flagId of worldFlags) {
        this.storyFlagManager.setFlag(flagId, true, {
          source: 'crossroads_branch_selection',
          branchId,
        });
      }
    }

    const thread = findThreadById(branchId, this.config);
    const branchTitle =
      thread?.title || payload?.branchTitle || payload?.metadata?.branchTitle || branchId;
    const summary = thread?.summary || payload?.summary || payload?.metadata?.summary || '';
    const selectedQuestId = thread?.questId || payload?.selectedQuestId || null;

    this.lastSelectedBranch = branchId;

    // Unlock navigation mesh access to the branch walkway + checkpoint.
    this.eventBus.emit('navigation:unlockSurfaceTag', { tag: 'transition' });
    this.eventBus.emit('navigation:unlockSurfaceTag', { tag: 'checkpoint' });
    this.eventBus.emit('navigation:unlockSurfaceId', { surfaceId: 'branch_walkway' });
    this.eventBus.emit('navigation:unlockSurfaceId', { surfaceId: 'checkpoint_plaza' });

    // Notify UI overlays about the branch landing context.
    this.eventBus.emit('crossroads:branch_landing_ready', {
      branchId,
      branchTitle,
      summary,
      questId: this.crossroadsQuestId,
      selectedQuestId,
      instructions: `Proceed to the checkpoint to launch "${branchTitle}".`,
    });

    this.eventBus.emit('quest:updated', {
      questId: this.crossroadsQuestId,
      branchId,
      newObjective: {
        id: 'obj_depart_crossroads_branch',
        title: 'Head to the checkpoint',
        description: `Proceed to the checkpoint to deploy the ${branchTitle} lead.`,
      },
    });

    if (selectedQuestId && this.questManager && typeof this.questManager.startQuest === 'function') {
      try {
        this.questManager.startQuest(selectedQuestId);
      } catch (error) {
        console.warn('[CrossroadsPromptController] Failed to start branch quest', selectedQuestId, error);
      }
    }
  }

  ensureCrossroadsQuestStarted() {
    if (!this.questManager || typeof this.questManager.startQuest !== 'function') {
      return;
    }
    try {
      this.questManager.startQuest(this.crossroadsQuestId);
    } catch (error) {
      console.warn('[CrossroadsPromptController] Failed to start crossroads quest', error);
    }
  }

  ensureBriefingDialogueActive() {
    if (!this.dialogueSystem || typeof this.dialogueSystem.startDialogue !== 'function') {
      return false;
    }

    const active = this.dialogueSystem.activeDialogue;
    if (active && active.dialogueId === this.dialogueId) {
      return false;
    }

    const started = this.dialogueSystem.startDialogue(this.npcId, this.dialogueId);
    if (!started && !active) {
      // Some dialogue setups may expect the player entity id as npc fallback
      this.dialogueSystem.startDialogue(this.dialogueId, this.dialogueId);
    }
    return true;
  }
}
