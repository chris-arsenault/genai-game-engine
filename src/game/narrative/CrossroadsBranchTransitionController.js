/**
 * CrossroadsBranchTransitionController
 *
 * Bridges the Act 2 Crossroads landing flow with downstream quest/scene
 * transitions. Once a branch is selected and the player reaches the checkpoint,
 * the controller emits a dedicated scene load request so the next thread can
 * spin up without bespoke plumbing per scene.
 */
export class CrossroadsBranchTransitionController {
  /**
   * @param {object} options
   * @param {import('../../engine/events/EventBus.js').EventBus} options.eventBus
   * @param {import('../managers/QuestManager.js').QuestManager} [options.questManager]
   * @param {object} [options.config]
   */
  constructor({ eventBus, questManager, config } = {}) {
    this.eventBus = eventBus;
    this.questManager = questManager ?? null;
    this.config = config ?? {};
    this._pendingTransition = null;
    this._unsubscribes = [];
    this._defaultQuestId =
      this.config?.questId || 'main-act2-crossroads';
  }

  init() {
    if (!this.eventBus) {
      throw new Error(
        '[CrossroadsBranchTransitionController] EventBus instance required'
      );
    }

    this.dispose();

    this._unsubscribes.push(
      this.eventBus.on(
        'crossroads:branch_landing_ready',
        (payload) => this._handleLandingReady(payload),
        this,
        10
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'area:entered',
        (payload) => this._handleAreaEntered(payload),
        this,
        10
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'quest:completed',
        (payload) => this._handleQuestCompleted(payload),
        this,
        10
      )
    );
  }

  dispose() {
    if (!Array.isArray(this._unsubscribes)) {
      this._unsubscribes = [];
      return;
    }
    for (const off of this._unsubscribes) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._unsubscribes.length = 0;
  }

  _handleLandingReady(payload = {}) {
    const branchId = payload?.branchId;
    if (!branchId) {
      return;
    }

    const thread = this._findThread(branchId);
    this._pendingTransition = {
      branchId,
      questId: payload?.questId || this._defaultQuestId,
      selectedQuestId:
        payload?.selectedQuestId ||
        thread?.questId ||
        null,
      branchTitle:
        payload?.branchTitle ||
        thread?.title ||
        branchId,
      summary: payload?.summary || thread?.summary || '',
      landingPayload: { ...payload },
      threadConfig: thread ? { ...thread } : null,
      checkpointReached: false,
      questCompleted: false,
    };

    this.eventBus.emit('crossroads:branch_transition_pending', {
      branchId,
      questId: this._pendingTransition.questId,
      selectedQuestId: this._pendingTransition.selectedQuestId,
      thread: this._pendingTransition.threadConfig,
    });
  }

  _handleAreaEntered(payload = {}) {
    if (!this._pendingTransition) {
      return;
    }

    const areaId = this._resolveAreaId(payload);
    if (!areaId) {
      return;
    }

    const normalized = String(areaId);
    if (
      normalized !== 'corporate_spires_checkpoint' &&
      normalized !== 'act2_crossroads_checkpoint'
    ) {
      return;
    }

    if (!this._pendingTransition.checkpointReached) {
      this._pendingTransition.checkpointReached = true;
      this.eventBus.emit('crossroads:branch_checkpoint_reached', {
        branchId: this._pendingTransition.branchId,
        areaId: normalized,
      });
    }

    this._attemptTransition('checkpoint_reached');
  }

  _handleQuestCompleted(payload = {}) {
    if (!this._pendingTransition) {
      return;
    }

    const questId = payload?.questId;
    if (!questId) {
      return;
    }

    const targetQuest =
      this._pendingTransition.questId || this._defaultQuestId;
    if (questId !== targetQuest) {
      return;
    }

    if (!this._pendingTransition.questCompleted) {
      this._pendingTransition.questCompleted = true;
      this.eventBus.emit('crossroads:branch_transition_quest_complete', {
        branchId: this._pendingTransition.branchId,
        questId,
      });
    }

    this._attemptTransition('quest_completed');
  }

  _attemptTransition(trigger) {
    const pending = this._pendingTransition;
    if (
      !pending ||
      !pending.checkpointReached ||
      !pending.questCompleted
    ) {
      return;
    }

    this._commitTransition(trigger);
  }

  _commitTransition(trigger) {
    const pending = this._pendingTransition;
    if (!pending) {
      return;
    }

    const thread =
      pending.threadConfig || this._findThread(pending.branchId);
    const selectedQuestId =
      pending.selectedQuestId || thread?.questId || null;

    const transitionPayload = {
      branchId: pending.branchId,
      branchTitle:
        pending.branchTitle || thread?.title || pending.branchId,
      originQuestId: pending.questId || this._defaultQuestId,
      selectedQuestId,
      threadConfig: thread ? { ...thread } : null,
      trigger,
      landing: pending.landingPayload ? { ...pending.landingPayload } : null,
    };

    // Hide the landing overlay once the checkpoint clears.
    this.eventBus.emit('crossroads:branch_landing_clear', {
      branchId: pending.branchId,
    });

    this.eventBus.emit(
      'crossroads:branch_transition_ready',
      transitionPayload
    );

    this.eventBus.emit('scene:load:act2_thread', {
      branchId: transitionPayload.branchId,
      branchTitle: transitionPayload.branchTitle,
      questId: transitionPayload.selectedQuestId,
      originQuestId: transitionPayload.originQuestId,
      threadConfig: transitionPayload.threadConfig,
      landing: transitionPayload.landing,
    });

    this._pendingTransition = null;
  }

  _findThread(branchId) {
    if (!branchId || !Array.isArray(this.config?.threads)) {
      return null;
    }
    return (
      this.config.threads.find((thread) => thread.id === branchId) ||
      null
    );
  }

  _resolveAreaId(payload = {}) {
    if (payload?.data?.areaId) {
      return payload.data.areaId;
    }
    if (payload?.trigger?.data?.areaId) {
      return payload.trigger.data.areaId;
    }
    if (payload?.areaId) {
      return payload.areaId;
    }
    if (payload?.triggerId) {
      return payload.triggerId;
    }
    return null;
  }
}
