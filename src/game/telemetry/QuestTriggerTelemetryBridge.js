/**
 * QuestTriggerTelemetryBridge
 *
 * Listens for quest trigger area events and emits normalized telemetry payloads
 * so analytics dashboards capture player progression across branching content.
 *
 * @class
 */
export class QuestTriggerTelemetryBridge {
  /**
   * @param {import('../../engine/events/EventBus.js').EventBus} eventBus
   * @param {{ priority?: number, source?: string, getActiveScene?: Function }} [options]
   */
  constructor(eventBus, options = {}) {
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new Error('[QuestTriggerTelemetryBridge] eventBus with .on() is required');
    }

    this.eventBus = eventBus;
    this.priority = Number.isFinite(options.priority) ? options.priority : 18;
    this.source = typeof options.source === 'string' ? options.source : 'quest_trigger';
    this.getActiveScene = typeof options.getActiveScene === 'function' ? options.getActiveScene : null;

    this._offEnter = null;
    this._offExit = null;
    this._attached = false;
  }

  /**
   * Attach listeners for area enter/exit events.
   */
  attach() {
    if (this._attached) {
      return;
    }
    this._offEnter = this.eventBus.on('area:entered', (payload) => this._handleEnter(payload), null, this.priority);
    this._offExit = this.eventBus.on('area:exited', (payload) => this._handleExit(payload), null, this.priority);
    this._attached = true;
  }

  /**
   * Dispose of listeners.
   */
  dispose() {
    if (typeof this._offEnter === 'function') {
      this._offEnter();
    }
    if (typeof this._offExit === 'function') {
      this._offExit();
    }
    this._offEnter = null;
    this._offExit = null;
    this._attached = false;
  }

  _handleEnter(payload = {}) {
    if (this._isTelemetryDispatched(payload)) {
      return;
    }

    const details = this._extractDetails(payload);
    if (!details || !details.telemetryTag) {
      return;
    }

    const eventPayload = {
      source: this.source,
      telemetryTag: details.telemetryTag,
      triggerId: details.triggerId,
      areaId: details.areaId,
      questId: details.questId,
      objectiveId: details.objectiveId,
      metadata: details.metadata ? { ...details.metadata } : {},
      triggerPosition: details.triggerPosition ? { ...details.triggerPosition } : null,
      targetPosition: details.targetPosition ? { ...details.targetPosition } : null,
      sceneId: details.sceneId,
      branchId: details.branchId,
      timestamp: Date.now(),
    };

    this.eventBus.emit('telemetry:trigger_entered', eventPayload);
    this._markTelemetryDispatched(payload);
  }

  _handleExit(payload = {}) {
    if (this._isTelemetryDispatched(payload)) {
      return;
    }

    const details = this._extractDetails(payload);
    if (!details || !details.telemetryTag) {
      return;
    }

    const eventPayload = {
      source: this.source,
      telemetryTag: details.telemetryTag,
      triggerId: details.triggerId,
      areaId: details.areaId,
      questId: details.questId,
      objectiveId: details.objectiveId,
      sceneId: details.sceneId,
      branchId: details.branchId,
      timestamp: Date.now(),
    };

    this.eventBus.emit('telemetry:trigger_exited', eventPayload);
  }

  _extractDetails(payload = {}) {
    const data = typeof payload.data === 'object' && payload.data ? payload.data : {};
    const metadata =
      (payload.metadata && typeof payload.metadata === 'object' && payload.metadata) ||
      (data.metadata && typeof data.metadata === 'object' && data.metadata) ||
      null;

    if (!metadata || !metadata.telemetryTag) {
      return null;
    }

    const areaId =
      payload.areaId ||
      data.areaId ||
      payload.triggerId ||
      (data.triggerId && typeof data.triggerId === 'string' ? data.triggerId : null) ||
      null;

    const triggerId =
      data.triggerId ||
      payload.triggerId ||
      areaId ||
      null;

    const questId = payload.questId || data.questId || data.startQuestId || null;
    const objectiveId = payload.objectiveId || data.objectiveId || null;
    const triggerPosition = payload.triggerPosition || data.triggerPosition || null;
    const targetPosition = payload.targetPosition || data.targetPosition || null;

    let sceneId = null;
    let branchId = null;
    if (this.getActiveScene) {
      const scene = this.getActiveScene() || {};
      if (scene) {
        sceneId = scene.id || null;
        branchId = scene.metadata?.branchId ?? null;
      }
    }

    return {
      telemetryTag: metadata.telemetryTag,
      metadata,
      areaId,
      triggerId,
      questId,
      objectiveId,
      triggerPosition,
      targetPosition,
      sceneId,
      branchId,
    };
  }

  _markTelemetryDispatched(payload) {
    if (payload && typeof payload === 'object') {
      payload.telemetryDispatched = true;
      if (payload.data && typeof payload.data === 'object') {
        payload.data.telemetryDispatched = true;
      }
    }
  }

  _isTelemetryDispatched(payload) {
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    if (payload.telemetryDispatched) {
      return true;
    }
    if (payload.data && typeof payload.data === 'object' && payload.data.telemetryDispatched) {
      return true;
    }
    return false;
  }
}
