/* global performance */
/**
 * Utility helpers for profiling SaveManager save/load latency.
 *
 * Provides deterministic aggregation so production builds can confirm
 * the <2s load acceptance criterion while automated tests can inject
 * deterministic clocks.
 */

const DEFAULT_ITERATIONS = 3;
const DEFAULT_THRESHOLD_MS = 2000;

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now.bind(performance);
  }
  return Date.now;
}

function coerceIterationCount(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_ITERATIONS;
  }
  return Math.max(1, Math.floor(value));
}

function aggregateDurations(samples, key) {
  if (!Array.isArray(samples) || !samples.length) {
    return {
      minMs: 0,
      maxMs: 0,
      averageMs: 0,
      totalMs: 0,
    };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let total = 0;

  for (const sample of samples) {
    const value = Math.max(0, Number(sample?.[key] ?? 0));
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
    total += value;
  }

  const average = total / samples.length;
  return {
    minMs: min === Number.POSITIVE_INFINITY ? 0 : min,
    maxMs: max,
    averageMs: average,
    totalMs: total,
  };
}

function toLabel(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 2)}s`;
}

/**
 * Profile save/load latency for the provided SaveManager.
 *
 * @param {SaveManager} saveManager
 * @param {Object} [options]
 * @param {number} [options.iterations=3]
 * @param {string} [options.slotName='profiling-slot']
 * @param {number} [options.thresholdMs=2000]
 * @param {Function} [options.now] Optional monotonic clock override (e.g. in tests)
 * @param {Function} [options.prepareIteration] Callback invoked before each save/load pair
 * @param {boolean} [options.cleanupSlot=true] Whether to delete the profiling slot afterwards
 * @returns {Object}
 */
export function profileSaveLoadLatency(saveManager, options = {}) {
  if (!saveManager || typeof saveManager.saveGame !== 'function' || typeof saveManager.loadGame !== 'function') {
    throw new Error('profileSaveLoadLatency requires a SaveManager with saveGame/loadGame functions');
  }

  const iterations = coerceIterationCount(options.iterations);
  const slotName = typeof options.slotName === 'string' && options.slotName.trim().length
    ? options.slotName.trim()
    : 'profiling-slot';
  const thresholdMs = Number.isFinite(options.thresholdMs) ? Math.max(0, options.thresholdMs) : DEFAULT_THRESHOLD_MS;

  const now = typeof options.now === 'function' ? options.now : defaultNow();
  const samples = [];

  for (let i = 0; i < iterations; i += 1) {
    if (typeof options.prepareIteration === 'function') {
      options.prepareIteration(i, saveManager);
    }

    const saveStart = now();
    const saveResult = saveManager.saveGame(slotName);
    const saveEnd = now();
    if (!saveResult) {
      throw new Error(`Save failed while profiling (iteration ${i})`);
    }

    const loadStart = now();
    const loadResult = saveManager.loadGame(slotName);
    const loadEnd = now();
    if (!loadResult) {
      throw new Error(`Load failed while profiling (iteration ${i})`);
    }

    samples.push({
      iteration: i,
      saveMs: Math.max(0, loadStart - saveStart),
      loadMs: Math.max(0, loadEnd - loadStart),
    });
  }

  if (options.cleanupSlot !== false && typeof saveManager.deleteSave === 'function') {
    try {
      saveManager.deleteSave(slotName);
    } catch (error) {
      console.warn('[profileSaveLoadLatency] Failed to clean up profiling slot', error);
    }
  }

  const saveMetrics = aggregateDurations(samples, 'saveMs');
  const loadMetrics = aggregateDurations(samples, 'loadMs');

  const aggregate = {
    slot: slotName,
    iterations,
    thresholdMs,
    samples,
    save: {
      ...saveMetrics,
      minLabel: toLabel(saveMetrics.minMs),
      maxLabel: toLabel(saveMetrics.maxMs),
      averageLabel: toLabel(saveMetrics.averageMs),
    },
    load: {
      ...loadMetrics,
      minLabel: toLabel(loadMetrics.minMs),
      maxLabel: toLabel(loadMetrics.maxMs),
      averageLabel: toLabel(loadMetrics.averageMs),
      underThreshold: loadMetrics.maxMs <= thresholdMs,
    },
  };

  aggregate.totalDurationMs = aggregate.save.totalMs + aggregate.load.totalMs;
  aggregate.totalDurationLabel = toLabel(aggregate.totalDurationMs);

  return aggregate;
}

/**
 * Build a condensed summary payload suitable for logging / docs.
 * @param {Object} profileResult
 * @returns {Object}
 */
export function summarizeProfile(profileResult) {
  if (!profileResult || typeof profileResult !== 'object') {
    return null;
  }

  return {
    slot: profileResult.slot,
    iterations: profileResult.iterations,
    thresholdMs: profileResult.thresholdMs,
    load: {
      averageMs: Math.round(profileResult.load?.averageMs ?? 0),
      maxMs: Math.round(profileResult.load?.maxMs ?? 0),
      underThreshold: Boolean(profileResult.load?.underThreshold),
      averageLabel: profileResult.load?.averageLabel ?? '0ms',
      maxLabel: profileResult.load?.maxLabel ?? '0ms',
    },
    save: {
      averageMs: Math.round(profileResult.save?.averageMs ?? 0),
      maxMs: Math.round(profileResult.save?.maxMs ?? 0),
      averageLabel: profileResult.save?.averageLabel ?? '0ms',
      maxLabel: profileResult.save?.maxLabel ?? '0ms',
    },
    totalDurationLabel: profileResult.totalDurationLabel ?? '0ms',
  };
}
