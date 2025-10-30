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
    * Ingest pre-recorded telemetry events without using the EventBus.
    * @param {Array<{type?: string, eventType?: string, payload?: object, timestamp?: number|string}>} events
    */
  ingest(events = []) {
    if (!Array.isArray(events)) {
      return;
    }
    for (const entry of events) {
      if (!entry) {
        continue;
      }
      const type = typeof entry.type === 'string' ? entry.type : entry.eventType;
      if (!type) {
        continue;
      }
      const payload =
        entry.payload && typeof entry.payload === 'object'
          ? { ...entry.payload }
          : entry.data && typeof entry.data === 'object'
          ? { ...entry.data }
          : {};
      this._handle(type, payload, entry.timestamp ?? null);
    }
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

  /**
   * Produce an aggregated report suitable for analytics dashboards.
   * @param {{ expectedTags?: string[], expectedQuestObjectives?: Record<string, string[]>, includeIssueDetails?: boolean }} [options]
   * @returns {object}
   */
  generateDashboardReport(options = {}) {
    const expectedTags = Array.isArray(options.expectedTags) ? options.expectedTags : [];
    const expectedQuestObjectives =
      options.expectedQuestObjectives && typeof options.expectedQuestObjectives === 'object'
        ? options.expectedQuestObjectives
        : {};
    const includeIssueDetails = options.includeIssueDetails === true;

    const generatedAt = new Date().toISOString();
    const eventTypeCounts = {};
    const tagCounts = new Map();
    const triggerCounts = new Map();
    const sceneCounts = new Map();
    const uniqueTags = new Set();
    const questMatrix = new Map();

    for (const entry of this.events) {
      eventTypeCounts[entry.type] = (eventTypeCounts[entry.type] ?? 0) + 1;
      const payload = entry.payload ?? {};

      const telemetryTag =
        typeof payload.telemetryTag === 'string' && payload.telemetryTag.length > 0
          ? payload.telemetryTag
          : null;
      if (telemetryTag) {
        uniqueTags.add(telemetryTag);
        tagCounts.set(telemetryTag, (tagCounts.get(telemetryTag) ?? 0) + 1);
      }

      const questId =
        typeof payload.questId === 'string' && payload.questId.length > 0
          ? payload.questId
          : 'unknown';
      const questEntry =
        questMatrix.get(questId) ??
        {
          questId,
          objectives: new Set(),
          telemetryTags: new Set(),
          triggerIds: new Set(),
          scenes: new Set(),
          lastSeen: 0,
        };
      questEntry.lastSeen = Math.max(questEntry.lastSeen, entry.timestamp ?? 0);

      if (typeof payload.objectiveId === 'string' && payload.objectiveId.length > 0) {
        questEntry.objectives.add(payload.objectiveId);
      }
      if (telemetryTag) {
        questEntry.telemetryTags.add(telemetryTag);
      }

      const triggerId =
        typeof payload.triggerId === 'string' && payload.triggerId.length > 0
          ? payload.triggerId
          : typeof payload.areaId === 'string' && payload.areaId.length > 0
          ? payload.areaId
          : null;
      if (triggerId) {
        questEntry.triggerIds.add(triggerId);
        triggerCounts.set(triggerId, (triggerCounts.get(triggerId) ?? 0) + 1);
      }

      const sceneId =
        typeof payload.sceneId === 'string' && payload.sceneId.length > 0
          ? payload.sceneId
          : null;
      if (sceneId) {
        questEntry.scenes.add(sceneId);
        sceneCounts.set(sceneId, (sceneCounts.get(sceneId) ?? 0) + 1);
      }

      questMatrix.set(questId, questEntry);
    }

    const issuesByType = {};
    const duplicateIssues = [];
    const missingFieldIssues = [];
    const keyGenerationIssues = [];

    for (const issue of this.issues) {
      for (const detail of issue.details ?? []) {
        issuesByType[detail.type] = (issuesByType[detail.type] ?? 0) + 1;
        if (detail.type === 'duplicate_event') {
          duplicateIssues.push({
            key: detail.key ?? null,
            eventType: issue.eventType,
            telemetryTag: issue.telemetryTag,
            triggerId: issue.triggerId,
          });
        } else if (detail.type === 'missing_field') {
          missingFieldIssues.push({
            field: detail.field,
            eventType: issue.eventType,
            telemetryTag: issue.telemetryTag,
            triggerId: issue.triggerId,
          });
        } else if (detail.type === 'key_generation_error') {
          keyGenerationIssues.push({
            message: detail.message ?? null,
            eventType: issue.eventType,
            telemetryTag: issue.telemetryTag,
            triggerId: issue.triggerId,
          });
        }
      }
    }

    const missingExpectedTags = expectedTags.filter((tag) => !uniqueTags.has(tag));

    const missingQuestObjectives = {};
    for (const [questId, expectedObjectives] of Object.entries(expectedQuestObjectives)) {
      if (!Array.isArray(expectedObjectives) || expectedObjectives.length === 0) {
        continue;
      }
      const observedObjectives = questMatrix.get(questId)?.objectives ?? new Set();
      const missing = expectedObjectives.filter(
        (objectiveId) => !observedObjectives.has(objectiveId)
      );
      if (missing.length > 0) {
        missingQuestObjectives[questId] = missing;
      }
    }

    const quests = Array.from(questMatrix.values())
      .map((entry) => ({
        questId: entry.questId,
        objectives: Array.from(entry.objectives),
        telemetryTags: Array.from(entry.telemetryTags),
        triggerIds: Array.from(entry.triggerIds),
        scenes: Array.from(entry.scenes),
        lastSeenAt: entry.lastSeen > 0 ? new Date(entry.lastSeen).toISOString() : null,
      }))
      .sort((a, b) => a.questId.localeCompare(b.questId));

    const report = {
      generatedAt,
      totalEvents: this.events.length,
      eventTypeCounts,
      uniqueTelemetryTags: Array.from(uniqueTags),
      tagUsage: Array.from(tagCounts.entries()).map(([tag, count]) => ({ tag, count })),
      triggerUsage: Array.from(triggerCounts.entries()).map(([triggerId, count]) => ({
        triggerId,
        count,
      })),
      sceneUsage: Array.from(sceneCounts.entries()).map(([sceneId, count]) => ({
        sceneId,
        count,
      })),
      missingExpectedTags,
      quests,
      missingQuestObjectives,
      issues: {
        total: this.issues.length,
        byType: issuesByType,
      },
    };

    if (includeIssueDetails) {
      report.issues.details = {
        missingFields: missingFieldIssues,
        duplicates: duplicateIssues,
        keyGenerationErrors: keyGenerationIssues,
      };
    }

    return report;
  }

  generateAnalyticsDataset(options = {}) {
    const includeRawEvents = options.includeRawEvents !== false;
    const includeReport = options.includeReport !== false;
    const dataset = {
      generatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      totalEvents: this.events.length,
      uniqueTelemetryTags: Array.from(
        new Set(
          this.events
            .map((entry) => entry.payload?.telemetryTag)
            .filter((tag) => typeof tag === 'string' && tag.length > 0)
        )
      ),
    };

    if (includeRawEvents) {
      dataset.events = this.events.map((entry) => normaliseAnalyticsEvent(entry));
    }

    if (includeReport) {
      dataset.report = this.generateDashboardReport({
        expectedTags: options.expectedTags,
        expectedQuestObjectives: options.expectedQuestObjectives,
        includeIssueDetails: options.includeIssueDetails ?? true,
      });
    }

    return dataset;
  }

  _handle(eventType, payload = {}, timestampOverride = null) {
    const clonedPayload = { ...payload };
    const timestamp = normaliseTimestamp(timestampOverride);

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

function normaliseTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

function normaliseAnalyticsEvent(entry = {}) {
  const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const timestamp = normaliseTimestamp(entry.timestamp ?? null);

  return {
    eventType: entry.type ?? null,
    telemetryTag:
      typeof payload.telemetryTag === 'string' && payload.telemetryTag.length > 0
        ? payload.telemetryTag
        : null,
    questId:
      typeof payload.questId === 'string' && payload.questId.length > 0
        ? payload.questId
        : null,
    objectiveId:
      typeof payload.objectiveId === 'string' && payload.objectiveId.length > 0
        ? payload.objectiveId
        : null,
    triggerId:
      typeof payload.triggerId === 'string' && payload.triggerId.length > 0
        ? payload.triggerId
        : typeof payload.areaId === 'string' && payload.areaId.length > 0
        ? payload.areaId
        : null,
    sceneId:
      typeof payload.sceneId === 'string' && payload.sceneId.length > 0 ? payload.sceneId : null,
    source: typeof payload.source === 'string' && payload.source.length > 0 ? payload.source : null,
    actorId: typeof payload.actorId === 'string' && payload.actorId.length > 0 ? payload.actorId : null,
    timestamp,
    timestampIso: new Date(timestamp).toISOString(),
    payload: { ...payload },
  };
}
