const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_UPDATE_EVENT = 'tutorial:transcript_updated';
const DEFAULT_UPDATE_DEBOUNCE_MS = 50;

/**
 * Captures a rolling transcript of tutorial events for export pipelines.
 * Records structured entries whenever tutorial lifecycle events fire and
 * emits a throttled update event so observers can react without being spammed.
 */
export class TutorialTranscriptRecorder {
  /**
   * @param {import('../../engine/events/EventBus.js').EventBus} eventBus
   * @param {Object} [options]
   * @param {number} [options.maxEntries=50] - Maximum transcript entries to retain.
   * @param {string} [options.updateEventName='tutorial:transcript_updated'] - Event emitted after transcript changes.
   * @param {number} [options.updateDebounceMs=50] - Debounce window for update events (ms).
   */
  constructor(eventBus, options = {}) {
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new Error('TutorialTranscriptRecorder requires a valid EventBus instance');
    }

    this.eventBus = eventBus;
    this.maxEntries =
      typeof options.maxEntries === 'number' && Number.isFinite(options.maxEntries) && options.maxEntries > 0
        ? Math.floor(options.maxEntries)
        : DEFAULT_MAX_ENTRIES;
    this.updateEventName =
      typeof options.updateEventName === 'string' && options.updateEventName.trim()
        ? options.updateEventName
        : DEFAULT_UPDATE_EVENT;
    this.updateDebounceMs =
      typeof options.updateDebounceMs === 'number' && Number.isFinite(options.updateDebounceMs) && options.updateDebounceMs >= 0
        ? options.updateDebounceMs
        : DEFAULT_UPDATE_DEBOUNCE_MS;

    this.entries = [];
    this._subscriptions = [];
    this._active = false;
    this._lastStepContext = null;
    this._updateTimeout = null;
    this._pendingUpdateEntry = null;
  }

  /**
   * Begin listening to tutorial events.
   */
  start() {
    if (this._active) {
      return;
    }

    this._subscriptions = [
      this.eventBus.on('tutorial:started', (payload) => {
        this.#recordStarted(payload);
      }),
      this.eventBus.on('tutorial:step_started', (payload) => {
        this.#recordStepStarted(payload);
      }),
      this.eventBus.on('tutorial:step_completed', (payload) => {
        this.#recordStepCompleted(payload);
      }),
      this.eventBus.on('tutorial:skipped', (payload) => {
        this.#recordSkipped(payload);
      }),
      this.eventBus.on('tutorial:completed', (payload) => {
        this.#recordCompleted(payload);
      }),
    ];

    this._active = true;
  }

  /**
   * Stop listening to tutorial events and release subscriptions.
   */
  stop() {
    if (!this._active) {
      return;
    }

    for (const unsubscribe of this._subscriptions) {
      try {
        unsubscribe?.();
      } catch (error) {
        console.warn('[TutorialTranscriptRecorder] Failed to unsubscribe listener', error);
      }
    }
    this._subscriptions.length = 0;
    this._active = false;
    this._lastStepContext = null;

    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = null;
    }
    this._pendingUpdateEntry = null;
  }

  /**
   * Clear all recorded transcript entries.
   */
  reset() {
    this.entries.length = 0;
    this._pendingUpdateEntry = null;
  }

  /**
   * Retrieve a cloned transcript array to avoid external mutation.
   * @returns {Array<Object>}
   */
  getTranscript() {
    return this.entries.map((entry) => cloneEntry(entry));
  }

  #recordStarted(payload = {}) {
    this.#appendEntry({
      event: 'tutorial_started',
      promptId: null,
      promptText: null,
      actionTaken: 'started',
      timestamp: this.#resolveTimestamp(payload),
      followUpNarrative: payload.followUpNarrative ?? null,
      metadata: {
        totalSteps: payload.totalSteps ?? null,
        startedAt: payload.startedAt ?? null,
      },
    });
  }

  #recordStepStarted(payload = {}) {
    const timestamp = this.#resolveTimestamp(payload);
    const stepId = payload.stepId ?? null;
    const title = payload.title ?? null;
    this._lastStepContext = {
      stepId,
      title,
      timestamp,
    };

    this.#appendEntry({
      event: 'tutorial_step_started',
      promptId: stepId,
      promptText: title,
      actionTaken: 'step_started',
      timestamp,
      followUpNarrative: payload.followUpNarrative ?? null,
      metadata: {
        stepIndex: payload.stepIndex ?? null,
        totalSteps: payload.totalSteps ?? null,
        description: payload.description ?? null,
        highlight: payload.highlight ? cloneMetadata(payload.highlight) : null,
        position: payload.position ? cloneMetadata(payload.position) : null,
        canSkip: payload.canSkip ?? null,
        startedAt: payload.startedAt ?? timestamp,
      },
    });
  }

  #recordStepCompleted(payload = {}) {
    const timestamp = this.#resolveTimestamp(payload);
    const fallbackPrompt = this._lastStepContext ?? {};

    this.#appendEntry({
      event: 'tutorial_step_completed',
      promptId: payload.stepId ?? fallbackPrompt.stepId ?? null,
      promptText: payload.title ?? fallbackPrompt.title ?? null,
      actionTaken: 'step_completed',
      timestamp,
      followUpNarrative: payload.followUpNarrative ?? null,
      metadata: {
        stepIndex: payload.stepIndex ?? null,
        totalSteps: payload.totalSteps ?? null,
        completedAt: payload.completedAt ?? timestamp,
        durationMs: payload.durationMs ?? null,
      },
    });
  }

  #recordSkipped(payload = {}) {
    this.#appendEntry({
      event: 'tutorial_skipped',
      promptId: payload.stepId ?? this._lastStepContext?.stepId ?? null,
      promptText: this._lastStepContext?.title ?? null,
      actionTaken: 'skipped',
      timestamp: this.#resolveTimestamp(payload),
      followUpNarrative: payload.followUpNarrative ?? null,
      metadata: {
        stepIndex: payload.stepIndex ?? null,
        skippedAt: payload.skippedAt ?? null,
      },
    });
  }

  #recordCompleted(payload = {}) {
    this.#appendEntry({
      event: 'tutorial_completed',
      promptId: null,
      promptText: null,
      actionTaken: 'completed',
      timestamp: this.#resolveTimestamp(payload),
      followUpNarrative: payload.followUpNarrative ?? null,
      metadata: {
        totalSteps: payload.totalSteps ?? null,
        completedSteps: payload.completedSteps ?? null,
        completedAt: payload.completedAt ?? null,
      },
    });
  }

  #appendEntry(entry) {
    const cloned = cloneEntry(entry);
    this.entries.push(cloned);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    this.#scheduleUpdate(cloned);
  }

  #scheduleUpdate(entry) {
    if (!this.updateEventName || typeof this.eventBus.emit !== 'function') {
      return;
    }

    this._pendingUpdateEntry = cloneEntry(entry);

    if (this.updateDebounceMs <= 0) {
      this.#emitUpdate();
      return;
    }

    if (this._updateTimeout) {
      return;
    }

    this._updateTimeout = setTimeout(() => {
      this._updateTimeout = null;
      this.#emitUpdate();
    }, this.updateDebounceMs);
  }

  #emitUpdate() {
    if (!this.updateEventName || typeof this.eventBus.emit !== 'function') {
      return;
    }
    const payload = {
      count: this.entries.length,
      lastEntry: this._pendingUpdateEntry ? cloneEntry(this._pendingUpdateEntry) : null,
    };
    this._pendingUpdateEntry = null;
    try {
      this.eventBus.emit(this.updateEventName, payload);
    } catch (error) {
      console.warn('[TutorialTranscriptRecorder] Failed to emit transcript update event', error);
    }
  }

  #resolveTimestamp(payload = {}) {
    const candidates = [
      payload.timestamp,
      payload.startedAt,
      payload.completedAt,
      payload.skippedAt,
      payload.occurredAt,
    ];
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
    return Date.now();
  }
}

function cloneEntry(entry) {
  if (!entry) {
    return {
      event: null,
      promptId: null,
      promptText: null,
      actionTaken: null,
      timestamp: null,
      followUpNarrative: null,
      metadata: {},
    };
  }
  return {
    event: entry.event ?? null,
    promptId: entry.promptId ?? null,
    promptText: entry.promptText ?? null,
    actionTaken: entry.actionTaken ?? null,
    timestamp: entry.timestamp ?? null,
    followUpNarrative: entry.followUpNarrative ?? null,
    metadata: cloneMetadata(entry.metadata),
  };
}

function cloneMetadata(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneMetadata(item));
  }
  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = cloneMetadata(val);
    }
    return result;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null;
  }
  return value;
}
