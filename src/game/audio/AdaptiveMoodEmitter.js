import { SuspicionMoodMapper } from './SuspicionMoodMapper.js';

/**
 * AdaptiveMoodEmitter
 *
 * Centralises emission of adaptive mood requests from gameplay systems. Handles
 * debouncing, telemetry forwarding, and optional state mapping via
 * {@link SuspicionMoodMapper}.
 */
export class AdaptiveMoodEmitter {
  /**
   * @param {import('../../engine/events/EventBus.js').EventBus|null} eventBus
   * @param {object} [options]
   * @param {number} [options.debounceMs=250] - Minimum time between identical mood emissions.
   * @param {string} [options.telemetryTopic='audio:adaptive:emitter_event'] - Telemetry event topic.
   * @param {string} [options.defaultSource='gameplay'] - Default source metadata for emissions.
   * @param {SuspicionMoodMapper} [options.moodMapper] - Optional mapper used by {@link emitFromState}.
   */
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus || null;
    this.debounceMs = Number.isFinite(options.debounceMs) ? Math.max(0, options.debounceMs) : 250;
    this.telemetryTopic =
      typeof options.telemetryTopic === 'string' && options.telemetryTopic.trim()
        ? options.telemetryTopic.trim()
        : 'audio:adaptive:emitter_event';
    this.defaultSource =
      typeof options.defaultSource === 'string' && options.defaultSource.trim()
        ? options.defaultSource.trim()
        : 'gameplay';

    this.moodMapper =
      options.moodMapper instanceof SuspicionMoodMapper ? options.moodMapper : null;

    this._lastMood = null;
    this._lastEmitTime = 0;
    this._disposed = false;
  }

  /**
   * Emit a mood directly.
   * @param {string} mood
   * @param {object} [options]
   * @param {boolean} [options.force] - Force even if last mood matches.
   * @returns {boolean} True when event emitted.
   */
  emitMood(mood, options = {}) {
    if (this._disposed) {
      return false;
    }
    const sanitizedMood = typeof mood === 'string' ? mood.trim() : '';
    if (!sanitizedMood) {
      return false;
    }
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      return false;
    }

    const now = Date.now();
    const force = Boolean(options.force);
    if (!force && this._lastMood === sanitizedMood && now - this._lastEmitTime < this.debounceMs) {
      return false;
    }

    const payload = {
      mood: sanitizedMood,
      options: {
        ...options,
        source: options.source || this.defaultSource,
      },
    };

    this.eventBus.emit('audio:adaptive:set_mood', payload);

    if (this.telemetryTopic) {
      this.eventBus.emit(this.telemetryTopic, {
        ...payload,
        timestamp: now,
      });
    }

    this._lastMood = sanitizedMood;
    this._lastEmitTime = now;
    return true;
  }

  /**
   * Emit mood based on state snapshot.
   * @param {object} snapshot
   * @returns {boolean}
   */
  emitFromState(snapshot = {}) {
    if (!this.moodMapper || typeof this.moodMapper.mapState !== 'function') {
      throw new Error(
        '[AdaptiveMoodEmitter] emitFromState requires a SuspicionMoodMapper instance'
      );
    }

    const mapped = this.moodMapper.mapState({
      ...snapshot,
      timestamp: snapshot.timestamp ?? Date.now(),
    });
    if (!mapped || typeof mapped.mood !== 'string') {
      return false;
    }

    const options = {
      ...(mapped.options || {}),
      source: mapped.options?.source || this.defaultSource,
    };

    return this.emitMood(mapped.mood, options);
  }

  /**
   * Cleanup emitter state.
   */
  dispose() {
    this._disposed = true;
    this._lastMood = null;
    this._lastEmitTime = 0;
  }

  /**
   * Retrieve emitter diagnostics for telemetry overlays.
   * @returns {{ lastMood: string|null, lastEmitTime: number, debounceMs: number, disposed: boolean }}
   */
  getState() {
    return {
      lastMood: this._lastMood,
      lastEmitTime: this._lastEmitTime,
      debounceMs: this.debounceMs,
      disposed: this._disposed,
    };
  }
}
