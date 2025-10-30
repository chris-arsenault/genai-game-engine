#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'node:perf_hooks';
import { SpatialHash } from '../../src/engine/physics/SpatialHash.js';

const DEFAULT_WINDOWS = [60, 90, 120, 180];
const DEFAULT_FRAMES = 360;
const DEFAULT_BASE_ENTITIES = 28;
const DEFAULT_ENTITY_VARIANCE = 14;
const DEFAULT_CELL_SIZE = 64;
const DEFAULT_BOUNDS = { width: 36, height: 36 };
const OUTPUT_BASENAME = 'spatial-hash-window-profile';

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      continue;
    }
    const trimmed = token.replace(/^-+/, '');
    const [key, value] = trimmed.split('=', 2);
    if (value !== undefined) {
      args[key] = value;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function parseWindows(value) {
  if (!value) {
    return [...DEFAULT_WINDOWS];
  }
  const tokens = String(value)
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return tokens.length ? tokens : [...DEFAULT_WINDOWS];
}

function toInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createRng(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
}

function average(values = []) {
  if (!values.length) {
    return 0;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function percentile(values = [], percentileValue = 0.95) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * percentileValue));
  return sorted[index];
}

function summariseTimings(samples = []) {
  return {
    averageMs: Number(average(samples).toFixed(4)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(4)),
    maxMs: Number((samples.length ? Math.max(...samples) : 0).toFixed(4)),
  };
}

function formatNumber(value, precision = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(precision)) : 0;
}

function simulateWindow(windowSize, options) {
  const {
    frames,
    baseEntities,
    entityVariance,
    cellSize,
    rngSeed,
    bounds,
  } = options;

  const rng = createRng(rngSeed);
  const spatialHash = new SpatialHash({
    cellSize,
    metricsWindow: windowSize,
  });

  const insertDurations = [];
  const metricDurations = [];
  const cellSamples = [];
  const entitySamples = [];
  const bucketSamples = [];

  for (let frame = 0; frame < frames; frame += 1) {
    const entityCount = baseEntities + Math.floor(entityVariance * rng());

    spatialHash.clear();
    spatialHash.stats.insertions = 0;
    spatialHash.stats.updates = 0;
    spatialHash.stats.removals = 0;

    const insertStart = performance.now();
    for (let index = 0; index < entityCount; index += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = 180 + rng() * 160;
      const x = 512 + Math.cos(angle) * radius + rng() * 24;
      const y = 384 + Math.sin(angle) * radius + rng() * 24;
      spatialHash.insert(
        1000 + frame * 100 + index,
        x,
        y,
        bounds.width,
        bounds.height
      );
    }
    insertDurations.push(performance.now() - insertStart);

    const metricStart = performance.now();
    const metrics = spatialHash.getMetrics();
    metricDurations.push(performance.now() - metricStart);

    cellSamples.push(metrics.cellCount);
    entitySamples.push(metrics.trackedEntities);
    bucketSamples.push(metrics.maxBucketSize);
  }

  const finalMetrics = spatialHash.getMetrics({ collectSample: false });
  const historyBytes = Buffer.byteLength(JSON.stringify(spatialHash._metricsHistory));
  const metricsBytes = Buffer.byteLength(JSON.stringify(finalMetrics));
  const perSampleBytes =
    spatialHash._metricsHistory.length > 0
      ? Number((historyBytes / spatialHash._metricsHistory.length).toFixed(2))
      : 0;

  return {
    window: windowSize,
    framesSimulated: frames,
    sampleCount: spatialHash._metricsHistory.length,
    retentionSeconds: Number((spatialHash._metricsHistory.length / 60).toFixed(2)),
    metrics: {
      averageCells: formatNumber(average(cellSamples), 2),
      peakCells: Math.max(0, ...cellSamples),
      averageTrackedEntities: formatNumber(average(entitySamples), 2),
      peakTrackedEntities: Math.max(0, ...entitySamples),
      averageMaxBucket: formatNumber(average(bucketSamples), 2),
      peakMaxBucket: Math.max(0, ...bucketSamples),
      rolling: finalMetrics.rolling ?? null,
    },
    timings: {
      insert: summariseTimings(insertDurations),
      getMetrics: summariseTimings(metricDurations),
    },
    telemetryPayload: {
      historyBytes,
      metricsBytes,
      perSampleBytes,
    },
  };
}

function resolveOutputDirectory(outDirArg) {
  if (outDirArg) {
    return path.resolve(outDirArg);
  }
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '../../reports/telemetry');
}

function buildMarkdownReport(summary, results) {
  const lines = [];
  lines.push(`# Spatial Hash Metrics Window Profiling`);
  lines.push('');
  lines.push(`- Generated: ${summary.generatedAt}`);
  lines.push(`- Frames simulated per window: ${summary.frames}`);
  lines.push(
    `- Entity density: base ${summary.baseEntities}, variance ${summary.entityVariance}`
  );
  lines.push(`- Collision cell size: ${summary.cellSize}`);
  lines.push('');
  lines.push(
    '| Window | Samples Retained | Retention (s) | Avg Cells | Peak Entities | Avg Max Bucket | Payload (bytes) | Avg getMetrics (ms) |'
  );
  lines.push(
    '| ------ | ---------------- | ------------- | --------- | ------------- | --------------- | ---------------- | ------------------- |'
  );

  for (const result of results) {
    lines.push(
      `| ${result.window} | ${result.sampleCount} | ${result.retentionSeconds} | ${result.metrics.averageCells} | ${result.metrics.peakTrackedEntities} | ${result.metrics.averageMaxBucket} | ${result.telemetryPayload.historyBytes} | ${result.timings.getMetrics.averageMs} |`
    );
  }

  lines.push('');
  lines.push('## Notes');
  lines.push(
    '- Sample count is capped by the metrics window; larger windows retain more history but increase payload size.'
  );
  lines.push(
    '- `Avg getMetrics` captures the mean cost of collecting spatial hash instrumentation per frame.'
  );
  lines.push(
    '- Payload bytes approximate the JSON footprint when exporting rolling metrics alongside telemetry artifacts.'
  );
  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  const windows = parseWindows(args.windows ?? args.windowSizes);
  const frames = toInteger(args.frames ?? args.iterations, DEFAULT_FRAMES);
  const baseEntities = toInteger(args.base ?? args.entities, DEFAULT_BASE_ENTITIES);
  const entityVariance = toInteger(args.variance ?? args.spread, DEFAULT_ENTITY_VARIANCE);
  const cellSize = toInteger(args.cell ?? args.cellSize, DEFAULT_CELL_SIZE);
  const rngSeed = toInteger(args.seed, 873109517);
  const outDir = resolveOutputDirectory(args.outDir ?? args.output ?? args.dir);

  await fs.mkdir(outDir, { recursive: true });

  const results = [];
  for (const windowSize of windows) {
    const result = simulateWindow(windowSize, {
      frames,
      baseEntities,
      entityVariance,
      cellSize,
      rngSeed: rngSeed + windowSize,
      bounds: DEFAULT_BOUNDS,
    });
    results.push(result);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    frames,
    baseEntities,
    entityVariance,
    cellSize,
    rngSeed,
    windows,
  };

  const report = {
    summary,
    results,
  };

  const jsonPath = path.join(outDir, `${OUTPUT_BASENAME}.json`);
  const markdownPath = path.join(outDir, `${OUTPUT_BASENAME}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  await fs.writeFile(markdownPath, buildMarkdownReport(summary, results), 'utf8');

  console.log(`[profile-spatial-hash] Wrote JSON report to ${jsonPath}`);
  console.log(`[profile-spatial-hash] Wrote markdown summary to ${markdownPath}`);
}

main().catch((error) => {
  console.error('[profile-spatial-hash] Fatal error', error);
  process.exitCode = 1;
});
