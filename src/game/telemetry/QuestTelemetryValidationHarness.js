/**
 * QuestTelemetryValidationHarness
 *
 * Lightweight validation helper used in tests and developer tooling
 * to confirm quest trigger telemetry emits the shape dashboards expect.
 * Captures telemetry events, highlights missing fields, and flags duplicates.
 */
export class QuestTelemetryValidationHarness {
  /**
   * @param {import('../../engine/events/EventBus.js').EventBus} eventBus
   * @param {{ requiredFields?: string[], uniqueKey?: (eventType: string, payload: object) => string|null }} [options]
   */
  constructor(eventBus, options = {}) {
    if (!eventBus || typeof eventBus.on !== 'function' || typeof eventBus.emit !== 'function') {
      throw new Error('[QuestTelemetryValidationHarness] EventBus with on/emit is required');
    }

    this.eventBus = eventBus;
    this.requiredFields = Array.isArray(options.requiredFields) && options.requiredFields.length > 0
      ? [...options.requiredFields]
      : ['source', 'telemetryTag', 'questId', 'objectiveId'];
    this.uniqueKeyFn =
      typeof options.uniqueKey === 'function'
        ? options.uniqueKey
        : (eventType, payload) => {
            const tag = payload?.telemetryTag ?? '';
            const trigger = payload?.triggerId ?? payload?.areaId ?? '';
            return `${eventType}:${tag}:${trigger}`;
          };

    this.events = [];
    this.issues = [];
    this._subscriptions = [];
    this._seenKeys = new Set();
    this._attached = false;
  }

  /**
   * Begin capturing telemetry events.
   */
  attach() {
    if (this._attached) {
      return;
    }
    const offEnter = this.eventBus.on('telemetry:trigger_entered', (payload) =>
      this._handle('telemetry:trigger_entered', payload)
    );
    const offExit = this.eventBus.on('telemetry:trigger_exited', (payload) =>
      this._handle('telemetry:trigger_exited', payload)
    );
    this._subscriptions.push(offEnter, offExit);
    this._attached = true;
  }

  /**
   * Stop capturing telemetry events and clear listeners.
   */
  dispose() {
    while (this._subscriptions.length > 0) {
      const unsubscribe = this._subscriptions.pop();
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this._attached = false;
  }

  /**
   * Return captured telemetry events grouped by event type.
   * @param {string} type
   * @returns {Array<object>}
   */
  getEventsByType(type) {
    return this.events
      .filter((entry) => entry.type === type)
      .map((entry) => ({ ...entry.payload }));
  }

  /**
   * Return shallow copy of all captured events.
   * @returns {Array<{type: string, payload: object, timestamp: number}>}
   */
  getAllEvents() {
    return this.events.map((entry) => ({
      type: entry.type,
      timestamp: entry.timestamp,
      payload: { ...entry.payload },
    }));
  }

  /**
   * Return validation issues discovered so far.
   * @returns {Array<object>}
   */
  getIssues() {
    return this.issues.map((issue) => ({
      ...issue,
      details: issue.details.map((detail) => ({ ...detail })),
    }));
  }

  /**
   * Check whether an event for a telemetry tag was observed.
   * @param {string} telemetryTag
   * @param {string|null} [type]
   * @returns {boolean}
   */
  hasEventForTag(telemetryTag, type = null) {
    return this.events.some((entry) => {
      if (type && entry.type !== type) {
        return false;
      }
      return entry.payload?.telemetryTag === telemetryTag;
    });
  }

  /**
   * Build a lightweight summary for reporting.
   * @returns {{ totalEvents: number, tags: Set<string>, issues: Array<object> }}
   */
  getSummary() {
    const tags = new Set();
    for (const entry of this.events) {
      if (entry.payload?.telemetryTag) {
        tags.add(entry.payload.telemetryTag);
      }
    }
    return {
      totalEvents: this.events.length,
      tags,
      issues: this.getIssues(),
    };
  }

  _handle(eventType, payload = {}) {
    const clonedPayload = { ...payload };
    const timestamp = Date.now();

    this.events.push({
      type: eventType,
      payload: clonedPayload,
      timestamp,
    });

    const issueDetails = [];

    for (const field of this.requiredFields) {
      if (
        !Object.prototype.hasOwnProperty.call(clonedPayload, field) ||
        clonedPayload[field] === null ||
        clonedPayload[field] === ''
      ) {
        issueDetails.push({
          type: 'missing_field',
          field,
          eventType,
        });
      }
    }

    if (typeof this.uniqueKeyFn === 'function') {
      try {
        const uniqueKey = this.uniqueKeyFn(eventType, clonedPayload);
        if (uniqueKey) {
          if (this._seenKeys.has(uniqueKey)) {
            issueDetails.push({
              type: 'duplicate_event',
              key: uniqueKey,
              eventType,
            });
          } else {
            this._seenKeys.add(uniqueKey);
          }
        }
      } catch (error) {
        issueDetails.push({
          type: 'key_generation_error',
          message: error.message,
          eventType,
        });
      }
    }

    if (issueDetails.length > 0) {
      this.issues.push({
        eventType,
        telemetryTag: clonedPayload.telemetryTag ?? null,
        triggerId: clonedPayload.triggerId ?? clonedPayload.areaId ?? null,
        details: issueDetails,
        timestamp,
      });
    }
  }
}
