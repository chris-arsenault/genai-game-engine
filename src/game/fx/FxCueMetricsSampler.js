/**
 * FxCueMetricsSampler
 *
 * Samples FxCueCoordinator metrics on an interval, aggregates rolling figures,
 * and emits debug telemetry so performance instrumentation can react without
 * polling the coordinator directly.
 */
export class FxCueMetricsSampler {
  /**
   * @param {FxCueCoordinator} coordinator
   * @param {EventBus|null} eventBus
   * @param {object} [options]
   */
  constructor(coordinator, eventBus, options = {}) {
    this.coordinator = coordinator;
    this.eventBus = eventBus;

    this.options = {
      sampleIntervalSeconds: 0.25,
      averageWindowSeconds: 3,
      warningActiveThreshold: 12,
      warningQueuedThreshold: 6,
      warningThroughputThreshold: 22,
      warningDebounceSeconds: 6,
      emitEvent: 'fx:metrics_sample',
      warningEvent: 'fx:metrics_warning',
      getNow: () => (typeof performance !== 'undefined' && performance.now)
        ? performance.now() / 1000
        : Date.now() / 1000,
      ...options,
    };

    this.isRunning = false;
    this._accumulator = 0;
    this._lastMetrics = null;
    this._lastSampleTime = null;
    this._lastWarningTime = 0;
    this._peaks = {
      active: 0,
      queued: 0,
      throughput: 0,
    };
    this._window = [];
    this._windowCapacity = Math.max(
      1,
      Math.round(this.options.averageWindowSeconds / this.options.sampleIntervalSeconds)
    );
  }

  start() {
    this.isRunning = true;
    this._accumulator = 0;
    this._lastMetrics = null;
    this._lastSampleTime = null;
    this._lastWarningTime = 0;
    this._peaks.active = 0;
    this._peaks.queued = 0;
    this._peaks.throughput = 0;
    this._window.length = 0;
  }

  stop() {
    this.isRunning = false;
    this._window.length = 0;
    this._lastMetrics = null;
    this._lastSampleTime = null;
  }

  update(deltaTime) {
    if (!this.isRunning || !this.coordinator || typeof this.coordinator.getMetrics !== 'function') {
      return;
    }

    this._accumulator += deltaTime;
    if (this._accumulator < this.options.sampleIntervalSeconds) {
      return;
    }

    const now = this.options.getNow();
    const elapsed = this._consumeAccumulator();
    const metrics = this._safeGetMetrics();
    if (!metrics) {
      return;
    }

    if (!this._lastMetrics || this._lastSampleTime == null) {
      this._lastMetrics = { ...metrics };
      this._lastSampleTime = now;
      this._emitSample(now, metrics, 0, elapsed);
      return;
    }

    const intervalSeconds = Math.max(elapsed, now - this._lastSampleTime || elapsed);
    const deltas = this._calculateDeltas(metrics);
    const throughput = intervalSeconds > 0 ? deltas.accepted / intervalSeconds : 0;

    this._lastMetrics = { ...metrics };
    this._lastSampleTime = now;
    this._emitSample(now, metrics, throughput, intervalSeconds);
    this._maybeWarn(now, metrics, throughput);
  }

  _consumeAccumulator() {
    const interval = this.options.sampleIntervalSeconds;
    if (this._accumulator >= interval) {
      this._accumulator -= interval;
      return interval;
    }
    return this._accumulator;
  }

  _safeGetMetrics() {
    try {
      return this.coordinator.getMetrics();
    } catch (error) {
      console.warn('[FxCueMetricsSampler] Failed to read metrics', error);
      return null;
    }
  }

  _calculateDeltas(metrics) {
    const prev = this._lastMetrics || metrics;
    return {
      accepted: Math.max(0, (metrics.totalAccepted ?? 0) - (prev.totalAccepted ?? 0)),
      deferred: Math.max(0, (metrics.totalDeferred ?? 0) - (prev.totalDeferred ?? 0)),
      dropped: Math.max(0, (metrics.totalDropped ?? 0) - (prev.totalDropped ?? 0)),
      replayed: Math.max(0, (metrics.totalReplayed ?? 0) - (prev.totalReplayed ?? 0)),
    };
  }

  _emitSample(timestamp, metrics, throughput, intervalSeconds) {
    const sample = {
      timestamp,
      intervalSeconds,
      throughputPerSecond: throughput,
      active: metrics.active ?? 0,
      queued: metrics.queued ?? 0,
      totals: {
        accepted: metrics.totalAccepted ?? 0,
        deferred: metrics.totalDeferred ?? 0,
        dropped: metrics.totalDropped ?? 0,
        replayed: metrics.totalReplayed ?? 0,
      },
    };

    this._window.push(sample);
    if (this._window.length > this._windowCapacity) {
      this._window.shift();
    }

    this._peaks.active = Math.max(this._peaks.active, sample.active);
    this._peaks.queued = Math.max(this._peaks.queued, sample.queued);
    this._peaks.throughput = Math.max(this._peaks.throughput, throughput);

    const averages = this._calculateAverages();

    const payload = {
      ...sample,
      averages,
      peaks: { ...this._peaks },
    };

    if (typeof this.options.onSample === 'function') {
      this.options.onSample(payload);
    }

    if (this.eventBus && typeof this.eventBus.emit === 'function' && this.options.emitEvent) {
      this.eventBus.emit(this.options.emitEvent, payload);
    }
  }

  _calculateAverages() {
    if (!this._window.length) {
      return { throughput: 0, active: 0, queued: 0 };
    }

    let throughputSum = 0;
    let activeSum = 0;
    let queuedSum = 0;
    for (let i = 0; i < this._window.length; i += 1) {
      const sample = this._window[i];
      throughputSum += sample.throughputPerSecond;
      activeSum += sample.active;
      queuedSum += sample.queued;
    }

    const divisor = this._window.length;
    return {
      throughput: throughputSum / divisor,
      active: activeSum / divisor,
      queued: queuedSum / divisor,
    };
  }

  _maybeWarn(now, metrics, throughput) {
    const hitThroughput = throughput >= this.options.warningThroughputThreshold;
    const hitActive = (metrics.active ?? 0) >= this.options.warningActiveThreshold;
    const hitQueued = (metrics.queued ?? 0) >= this.options.warningQueuedThreshold;

    if (!hitThroughput && !hitActive && !hitQueued) {
      return;
    }

    if (now - this._lastWarningTime < this.options.warningDebounceSeconds) {
      return;
    }

    this._lastWarningTime = now;
    const warningPayload = {
      timestamp: now,
      throughputPerSecond: throughput,
      active: metrics.active ?? 0,
      queued: metrics.queued ?? 0,
      totals: {
        accepted: metrics.totalAccepted ?? 0,
        deferred: metrics.totalDeferred ?? 0,
        dropped: metrics.totalDropped ?? 0,
      },
      reasons: {
        throughput: hitThroughput,
        active: hitActive,
        queued: hitQueued,
      },
    };

    if (typeof this.options.onWarning === 'function') {
      this.options.onWarning(warningPayload);
    }

    if (this.eventBus && typeof this.eventBus.emit === 'function' && this.options.warningEvent) {
      this.eventBus.emit(this.options.warningEvent, warningPayload);
    }
  }

  /**
   * Emit a synthetic metrics sample without mutating rolling state.
   * Useful for automation harnesses that need deterministic HUD updates.
   * @param {object} [sampleOverrides]
   * @returns {object} payload emitted to listeners
   */
  emitSyntheticSample(sampleOverrides = {}) {
    const timestamp = typeof sampleOverrides.timestamp === 'number'
      ? sampleOverrides.timestamp
      : this.options.getNow();
    const intervalSeconds = typeof sampleOverrides.intervalSeconds === 'number'
      ? sampleOverrides.intervalSeconds
      : this.options.sampleIntervalSeconds;
    const throughput = typeof sampleOverrides.throughputPerSecond === 'number'
      ? sampleOverrides.throughputPerSecond
      : 0;
    const active = typeof sampleOverrides.active === 'number' ? sampleOverrides.active : 0;
    const queued = typeof sampleOverrides.queued === 'number' ? sampleOverrides.queued : 0;

    const totals = {
      accepted: sampleOverrides.totals?.accepted ?? 0,
      deferred: sampleOverrides.totals?.deferred ?? 0,
      dropped: sampleOverrides.totals?.dropped ?? 0,
      replayed: sampleOverrides.totals?.replayed ?? 0,
    };

    const payload = {
      timestamp,
      intervalSeconds,
      throughputPerSecond: throughput,
      active,
      queued,
      totals,
      averages: sampleOverrides.averages ?? {
        throughput,
        active,
        queued,
      },
      peaks: sampleOverrides.peaks ?? {
        throughput,
        active,
        queued,
      },
    };

    if (typeof this.options.onSample === 'function') {
      this.options.onSample(payload);
    }

    if (this.eventBus && typeof this.eventBus.emit === 'function' && this.options.emitEvent) {
      this.eventBus.emit(this.options.emitEvent, payload);
    }

    return payload;
  }

  /**
   * Emit a synthetic warning payload for deterministic automation.
   * @param {object} [warningOverrides]
   * @returns {object} warning payload emitted
   */
  emitSyntheticWarning(warningOverrides = {}) {
    const timestamp = typeof warningOverrides.timestamp === 'number'
      ? warningOverrides.timestamp
      : this.options.getNow();
    const throughput = typeof warningOverrides.throughputPerSecond === 'number'
      ? warningOverrides.throughputPerSecond
      : 0;
    const active = typeof warningOverrides.active === 'number' ? warningOverrides.active : 0;
    const queued = typeof warningOverrides.queued === 'number' ? warningOverrides.queued : 0;

    const payload = {
      timestamp,
      throughputPerSecond: throughput,
      active,
      queued,
      totals: {
        accepted: warningOverrides.totals?.accepted ?? 0,
        deferred: warningOverrides.totals?.deferred ?? 0,
        dropped: warningOverrides.totals?.dropped ?? 0,
      },
      reasons: warningOverrides.reasons ?? {
        throughput: throughput > 0,
        active: active > 0,
        queued: queued > 0,
      },
    };

    if (typeof this.options.onWarning === 'function') {
      this.options.onWarning(payload);
    }

    if (this.eventBus && typeof this.eventBus.emit === 'function' && this.options.warningEvent) {
      this.eventBus.emit(this.options.warningEvent, payload);
    }

    return payload;
  }
}
