/**
 * ControlBindingsObservationLog
 * Records control bindings overlay navigation events for qualitative UX analysis.
 */
function createInitialMetrics() {
  return {
    selectionMoves: 0,
    selectionBlocked: 0,
    listModeChanges: 0,
    listModeUnchanged: 0,
    pageNavigations: 0,
    pageNavigationBlocked: 0,
    pageSetChanges: 0,
    pageSetBlocked: 0,
    captureStarted: 0,
    captureCancelled: 0,
    bindingsApplied: 0,
    bindingsReset: 0,
    manualOverrideEvents: 0,
  };
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function cloneStringArray(values) {
  if (!Array.isArray(values) || !values.length) {
    return [];
  }
  const result = [];
  for (const value of values) {
    if (typeof value === 'string') {
      result.push(value);
    }
  }
  return result;
}

function clonePlainObject(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const target = {};
  for (const [key, value] of Object.entries(source)) {
    if (value == null) {
      target[key] = value;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      target[key] = value;
    } else if (Array.isArray(value)) {
      target[key] = value.slice(0, 16).map((entry) => {
        if (entry == null) {
          return entry;
        }
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
          return entry;
        }
        return String(entry);
      });
    } else {
      target[key] = String(value);
    }
  }
  return target;
}

export class ControlBindingsObservationLog {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxEntries=1000]
   */
  constructor(options = {}) {
    const { maxEntries = 1000 } = options || {};
    this.maxEntries = isFiniteNumber(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 1000;
    this.events = [];
    this.metrics = createInitialMetrics();
    this.firstEventTimestamp = null;
    this.lastEventTimestamp = null;

    this._actionsVisited = new Set();
    this._actionsRemapped = new Set();
    this._listModesSeen = new Set();
    this._captureCancelReasons = new Map();
    this._pageMin = null;
    this._pageMax = null;
  }

  /**
   * Record a control bindings overlay event.
   * @param {Object} data
   */
  record(data = {}) {
    const event = this._sanitizeEvent(data);
    if (!event) {
      return;
    }

    this.events.push(event);
    if (this.events.length > this.maxEntries) {
      this.events.shift();
    }

    if (this.firstEventTimestamp == null || event.timestamp < this.firstEventTimestamp) {
      this.firstEventTimestamp = event.timestamp;
    }
    if (this.lastEventTimestamp == null || event.timestamp > this.lastEventTimestamp) {
      this.lastEventTimestamp = event.timestamp;
    }

    this._updateMetrics(event);
    this._trackQualitativeSignals(event);
  }

  /**
   * Return a defensive copy of recorded events.
   * @returns {Array<Object>}
   */
  getEvents() {
    return this.events.map((entry) => ({
      ...entry,
      codes: Array.isArray(entry.codes) ? [...entry.codes] : undefined,
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  /**
   * Produce an aggregated summary for qualitative review.
   * @returns {Object}
   */
  getSummary() {
    const totalEvents = this.events.length;
    const durationMs = this.firstEventTimestamp != null && this.lastEventTimestamp != null
      ? Math.max(0, this.lastEventTimestamp - this.firstEventTimestamp)
      : 0;

    return {
      totalEvents,
      firstEventAt: this.firstEventTimestamp,
      lastEventAt: this.lastEventTimestamp,
      durationMs,
      durationLabel: this._formatDuration(durationMs),
      metrics: {
        ...this.metrics,
        captureCancelReasons: Object.fromEntries(this._captureCancelReasons),
      },
      actionsVisited: Array.from(this._actionsVisited),
      actionsRemapped: Array.from(this._actionsRemapped),
      listModesVisited: Array.from(this._listModesSeen),
      pageRange: this._pageMin == null || this._pageMax == null
        ? null
        : {
            min: this._pageMin,
            max: this._pageMax,
          },
      lastSelectedAction: totalEvents
        ? this.events[this.events.length - 1].selectedAction ?? null
        : null,
    };
  }

  /**
   * Generate a serialisable payload with summary and events.
   * @returns {Object}
   */
  toSerializable() {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      summary: this.getSummary(),
      events: this.getEvents(),
    };
  }

  /**
   * Reset the observation log.
   */
  reset() {
    this.events.length = 0;
    this.metrics = createInitialMetrics();
    this.firstEventTimestamp = null;
    this.lastEventTimestamp = null;
    this._actionsVisited.clear();
    this._actionsRemapped.clear();
    this._listModesSeen.clear();
    this._captureCancelReasons.clear();
    this._pageMin = null;
    this._pageMax = null;
  }

  _sanitizeEvent(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const eventName = typeof data.event === 'string' && data.event.length ? data.event : null;
    if (!eventName) {
      return null;
    }

    const timestamp = isFiniteNumber(data.timestamp) ? data.timestamp : Date.now();
    const event = {
      event: eventName,
      overlayId: typeof data.overlayId === 'string' && data.overlayId.length
        ? data.overlayId
        : 'controlBindings',
      timestamp,
      visible: Boolean(data.visible),
      capturing: Boolean(data.capturing),
      manualOverride: Boolean(data.manualOverride),
    };

    if (typeof data.listMode === 'string' && data.listMode.length) {
      event.listMode = data.listMode;
    }
    if (typeof data.listModeLabel === 'string' && data.listModeLabel.length) {
      event.listModeLabel = data.listModeLabel;
    }
    if (isFiniteNumber(data.pageIndex)) {
      event.pageIndex = data.pageIndex;
    }
    if (isFiniteNumber(data.pageCount)) {
      event.pageCount = data.pageCount;
    }
    if (isFiniteNumber(data.selectedIndex)) {
      event.selectedIndex = data.selectedIndex;
    }
    if (typeof data.selectedAction === 'string' && data.selectedAction.length) {
      event.selectedAction = data.selectedAction;
    }
    if (typeof data.selectedActionLabel === 'string' && data.selectedActionLabel.length) {
      event.selectedActionLabel = data.selectedActionLabel;
    }
    if (typeof data.direction === 'number' && Number.isFinite(data.direction)) {
      event.direction = data.direction;
    }
    if (isFiniteNumber(data.previousIndex)) {
      event.previousIndex = data.previousIndex;
    }
    if (isFiniteNumber(data.nextIndex)) {
      event.nextIndex = data.nextIndex;
    }
    if (typeof data.previousAction === 'string' && data.previousAction.length) {
      event.previousAction = data.previousAction;
    }
    if (typeof data.previousActionLabel === 'string' && data.previousActionLabel.length) {
      event.previousActionLabel = data.previousActionLabel;
    }
    if (typeof data.nextAction === 'string' && data.nextAction.length) {
      event.nextAction = data.nextAction;
    }
    if (typeof data.nextActionLabel === 'string' && data.nextActionLabel.length) {
      event.nextActionLabel = data.nextActionLabel;
    }
    if (typeof data.changed === 'boolean') {
      event.changed = data.changed;
    }
    if (typeof data.action === 'string' && data.action.length) {
      event.action = data.action;
    }
    if (Array.isArray(data.codes) && data.codes.length) {
      event.codes = cloneStringArray(data.codes);
    }
    if (data.metadata && typeof data.metadata === 'object') {
      const metadata = clonePlainObject(data.metadata);
      if (metadata) {
        event.metadata = metadata;
      }
    }
    if (typeof data.source === 'string' && data.source.length) {
      event.source = data.source;
    }
    if (typeof data.reason === 'string' && data.reason.length) {
      event.reason = data.reason;
    }
    if (isFiniteNumber(data.pageLimit)) {
      event.pageLimit = data.pageLimit;
    }

    return event;
  }

  _updateMetrics(event) {
    switch (event.event) {
      case 'selection_move':
        if (event.changed) {
          this.metrics.selectionMoves += 1;
        } else {
          this.metrics.selectionBlocked += 1;
        }
        break;
      case 'list_mode_change':
        if (event.changed) {
          this.metrics.listModeChanges += 1;
        } else {
          this.metrics.listModeUnchanged += 1;
        }
        break;
      case 'page_navigate':
        if (event.changed) {
          this.metrics.pageNavigations += 1;
        } else {
          this.metrics.pageNavigationBlocked += 1;
        }
        break;
      case 'page_set':
        if (event.changed) {
          this.metrics.pageSetChanges += 1;
        } else {
          this.metrics.pageSetBlocked += 1;
        }
        break;
      case 'capture_started':
        this.metrics.captureStarted += 1;
        break;
      case 'capture_cancelled':
        this.metrics.captureCancelled += 1;
        break;
      case 'binding_applied':
        this.metrics.bindingsApplied += 1;
        break;
      case 'binding_reset':
        this.metrics.bindingsReset += 1;
        break;
      default:
        break;
    }

    if (event.manualOverride) {
      this.metrics.manualOverrideEvents += 1;
    }
  }

  _trackQualitativeSignals(event) {
    if (typeof event.selectedAction === 'string' && event.selectedAction.length) {
      this._actionsVisited.add(event.selectedAction);
    }

    if (event.event === 'binding_applied' && typeof event.action === 'string' && event.action.length) {
      this._actionsRemapped.add(event.action);
    }

    if (typeof event.listMode === 'string' && event.listMode.length) {
      this._listModesSeen.add(event.listMode);
    }

    if (isFiniteNumber(event.pageIndex)) {
      if (this._pageMin == null || event.pageIndex < this._pageMin) {
        this._pageMin = event.pageIndex;
      }
      if (this._pageMax == null || event.pageIndex > this._pageMax) {
        this._pageMax = event.pageIndex;
      }
    }

    if (event.event === 'capture_cancelled') {
      const reason = typeof event.source === 'string' && event.source.length ? event.source : 'unknown';
      this._captureCancelReasons.set(reason, (this._captureCancelReasons.get(reason) || 0) + 1);
    }
  }

  _formatDuration(ms) {
    if (!isFiniteNumber(ms) || ms <= 0) {
      return '0s';
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor(ms % 1000);

    const parts = [];
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (remainingSeconds > 0) {
      parts.push(`${remainingSeconds}s`);
    }
    if (minutes === 0 && remainingSeconds === 0) {
      parts.push(`${remainingMs}ms`);
    } else if (remainingMs > 0 && minutes === 0) {
      parts.push(`${remainingMs}ms`);
    }

    return parts.join(' ');
  }
}
