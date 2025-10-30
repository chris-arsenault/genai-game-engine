#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const DEFAULT_RUNS = 5;
const DEFAULT_OUTPUT = 'telemetry-artifacts/performance/ci-baseline.json';

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

function sanitisePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

function createRunFilePath(baseDir, index) {
  const padded = String(index).padStart(2, '0');
  return path.join(baseDir, `run-${padded}.json`);
}

function aggregateMetric(runSummaries = []) {
  const aggregateSamples = [];
  let thresholdMs = null;
  for (const summary of runSummaries) {
    if (!summary || typeof summary !== 'object') {
      continue;
    }
    const { samples = [], thresholdMs: summaryThreshold } = summary;
    if (Array.isArray(samples)) {
      aggregateSamples.push(...samples);
    }
    if (typeof summaryThreshold === 'number') {
      thresholdMs = summaryThreshold;
    }
  }

  if (aggregateSamples.length === 0) {
    return {
      averageMs: 0,
      minMs: 0,
      maxMs: 0,
      samples: [],
      thresholdMs,
      passed: true,
    };
  }

  const average =
    aggregateSamples.reduce((acc, value) => acc + value, 0) / aggregateSamples.length;
  const min = Math.min(...aggregateSamples);
  const max = Math.max(...aggregateSamples);
  const normalisedSamples = aggregateSamples.map((value) => Number(value.toFixed(4)));
  const averageMs = Number(average.toFixed(4));
  const minMs = Number(min.toFixed(4));
  const maxMs = Number(max.toFixed(4));
  const passed = thresholdMs == null ? true : averageMs <= thresholdMs;

  return {
    averageMs,
    minMs,
    maxMs,
    samples: normalisedSamples,
    thresholdMs,
    passed,
  };
}

async function readJson(jsonPath) {
  const content = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(content);
}

async function runPerformanceSnapshot(snapshotPath, outputPath, env = {}) {
  const nodePath = process.execPath;
  const args = [snapshotPath, '--out', outputPath];
  const { stdout, stderr } = await execFileAsync(nodePath, args, {
    env: { ...process.env, ...env },
  });
  return { stdout, stderr };
}

function resolveSnapshotPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, 'performanceSnapshot.js');
}

async function main() {
  const args = parseArgs();
  const runs = sanitisePositiveInteger(args.runs ?? args.iterations, DEFAULT_RUNS);
  const outputPath = path.resolve(args.out || args.output || DEFAULT_OUTPUT);
  const runDir = path.resolve(args.dir || path.dirname(outputPath));
  const snapshotPath = resolveSnapshotPath();

  await ensureDirectory(outputPath);
  await fs.mkdir(runDir, { recursive: true });

  const runSummaries = [];
  const runFiles = [];

  for (let index = 1; index <= runs; index += 1) {
    const runPath = createRunFilePath(runDir, index);
    await ensureDirectory(runPath);
    console.log(`[performance-baseline] Running snapshot ${index}/${runs}`);
    await runPerformanceSnapshot(snapshotPath, runPath);
    const runSummary = await readJson(runPath);
    runSummaries.push(runSummary);
    runFiles.push(runPath);
  }

  const metricsAggregate = {};
  const metricKeys =
    runSummaries[0] && runSummaries[0].metrics ? Object.keys(runSummaries[0].metrics) : [];

  for (const key of metricKeys) {
    const summaries = runSummaries
      .map((summary) => summary.metrics?.[key])
      .filter(Boolean)
      .map((metric) => ({
        averageMs: metric.averageMs,
        minMs: metric.minMs,
        maxMs: metric.maxMs,
        samples: metric.samples || [],
        thresholdMs: metric.thresholdMs,
      }));
    metricsAggregate[key] = aggregateMetric(summaries);
  }

  const thresholds =
    runSummaries[0] && runSummaries[0].thresholds ? runSummaries[0].thresholds : {};

  const aggregateReport = {
    generatedAt: new Date().toISOString(),
    runs,
    runFiles,
    metrics: metricsAggregate,
    thresholds,
    metadata: {
      executor: 'performanceBaseline',
      snapshotScript: path.relative(process.cwd(), snapshotPath),
    },
  };

  await fs.writeFile(outputPath, JSON.stringify(aggregateReport, null, 2));

  const failedMetrics = Object.entries(metricsAggregate)
    .filter(([, metric]) => metric.passed === false)
    .map(([key]) => key);

  if (failedMetrics.length > 0) {
    console.error('[performance-baseline] Threshold check failed for:', failedMetrics.join(', '));
    process.exitCode = 1;
  } else {
    console.log('[performance-baseline] Baseline generation completed successfully');
  }
}

main().catch((error) => {
  console.error('[performance-baseline] Fatal error', error);
  process.exitCode = 1;
});
