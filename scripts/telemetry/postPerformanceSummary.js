#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import {
  loadBaseline,
  summariseBaseline,
  formatMarkdownSummary,
} from './summarizePerformanceBaseline.js';

const HISTORY_ENV_VAR = 'TELEMETRY_BASELINE_HISTORY_DIR';

/**
 * Resolve CLI arguments for baseline and output paths.
 * @returns {{ baselinePath: string, outputPath: string }}
 */
function resolvePaths() {
  const baselineArg = process.argv[2] || 'telemetry-artifacts/performance/ci-baseline.json';
  const outputArg = process.argv[3] || 'telemetry-artifacts/performance/ci-baseline-summary.md';
  const baselinePath = path.resolve(baselineArg);
  const outputPath = path.resolve(outputArg);
  return { baselinePath, outputPath };
}

async function ensureDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function resolveHistoryDir(baselinePath) {
  if (process.env[HISTORY_ENV_VAR]) {
    return path.resolve(process.env[HISTORY_ENV_VAR]);
  }
  return path.join(path.dirname(baselinePath), 'history');
}

function sanitiseTimestamp(value) {
  if (!value) {
    return null;
  }
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

export function buildHistoryFileName(summary = {}, fallbackDate = null) {
  const timestamp = sanitiseTimestamp(summary.generatedAt) || fallbackDate || new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:]/g, '-');
  const runs =
    Number.isFinite(summary.runs) && summary.runs > 0
      ? `-r${String(summary.runs).padStart(2, '0')}`
      : '';
  return `baseline-${safeTimestamp}${runs}.json`;
}

export async function persistBaselineHistory(baselinePath, summary) {
  const historyDir = resolveHistoryDir(baselinePath);
  await fs.mkdir(historyDir, { recursive: true });
  const fallbackIso = new Date().toISOString();
  const fileName = buildHistoryFileName(summary, fallbackIso);
  const destinationPath = path.join(historyDir, fileName);

  try {
    await fs.copyFile(baselinePath, destinationPath);
    console.log(`::notice title=Performance baseline history::Archived baseline to ${destinationPath}`);
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.warn(
        `::notice title=Performance baseline history::History file ${destinationPath} already exists, skipping copy.`
      );
    } else {
      console.warn(
        `[postPerformanceSummary] Failed to persist baseline history to ${destinationPath}`,
        error
      );
    }
  }

  return destinationPath;
}

export async function ensureHistorySeeded(baselinePath, summary) {
  const historyDir = resolveHistoryDir(baselinePath);
  let entries = [];
  try {
    entries = await fs.readdir(historyDir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(
        `[postPerformanceSummary] Unable to read baseline history directory ${historyDir} before seeding`,
        error
      );
    }
  }

  const hasExistingEntries = entries.some((entry) => entry.isFile() && entry.name.endsWith('.json'));
  if (hasExistingEntries) {
    return null;
  }

  const seededPath = await persistBaselineHistory(baselinePath, summary);
  console.log(
    `::notice title=Performance baseline history::Seeded history archive with ${seededPath}`
  );
  return seededPath;
}

export async function listHistoryEntries(baselinePath, limit = 5) {
  const historyDir = resolveHistoryDir(baselinePath);
  let entries;
  try {
    entries = await fs.readdir(historyDir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(
        `[postPerformanceSummary] Unable to read baseline history directory ${historyDir}`,
        error
      );
    }
    return [];
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(historyDir, entry.name));

  const annotated = [];

  for (const filePath of files) {
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      console.warn(
        `[postPerformanceSummary] Unable to stat history file ${filePath}`,
        error
      );
      continue;
    }

    annotated.push({
      name: path.basename(filePath),
      path: filePath,
      modifiedAt: stats.mtime ? stats.mtime.toISOString() : null,
      size: Number.isFinite(stats.size) ? stats.size : null,
    });
  }

  annotated.sort((a, b) => {
    if (a.modifiedAt && b.modifiedAt && a.modifiedAt !== b.modifiedAt) {
      return b.modifiedAt.localeCompare(a.modifiedAt);
    }
    if (a.name !== b.name) {
      return b.name.localeCompare(a.name);
    }
    return 0;
  });

  if (Number.isFinite(limit) && limit > 0) {
    return annotated.slice(0, limit);
  }
  return annotated;
}

async function findPreviousBaselineInfo(baselinePath, options = {}) {
  const historyDir = resolveHistoryDir(baselinePath);
  let entries;
  try {
    entries = await fs.readdir(historyDir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(
        `[postPerformanceSummary] Unable to read baseline history directory ${historyDir}`,
        error
      );
    }
    return null;
  }

  const currentResolved = path.resolve(baselinePath);
  const excludeResolved = new Set(
    (options.excludePaths || [])
      .filter((item) => typeof item === 'string' && item.length > 0)
      .map((item) => path.resolve(item))
  );
  const candidates = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const candidatePath = path.join(historyDir, entry.name);
      return {
        name: entry.name,
        path: candidatePath,
        resolved: path.resolve(candidatePath),
      };
    })
    .filter((candidate) => candidate.resolved !== currentResolved && !excludeResolved.has(candidate.resolved))
    .sort((a, b) => (a.name < b.name ? 1 : -1));

  if (candidates.length === 0) {
    return null;
  }

  return { path: candidates[0].path, name: candidates[0].name };
}

function computeMetricDeltas(currentSummary, previousSummary) {
  const previousMap = new Map();
  for (const metric of previousSummary.metrics || []) {
    previousMap.set(metric.name, metric);
  }

  const deltas = [];

  for (const metric of currentSummary.metrics || []) {
    const previous = previousMap.get(metric.name);
    if (previous) {
      const rawDelta = Number(metric.averageMs ?? 0) - Number(previous.averageMs ?? 0);
      const deltaMs = Number(rawDelta.toFixed(4));
      const deltaPct =
        Number(previous.averageMs ?? 0) === 0
          ? null
          : Number(((rawDelta / Number(previous.averageMs)) * 100).toFixed(2));
      const trend =
        deltaMs > 0 ? 'regression' : deltaMs < 0 ? 'improvement' : 'flat';
      deltas.push({
        name: metric.name,
        previous: Number(previous.averageMs ?? 0),
        current: Number(metric.averageMs ?? 0),
        deltaMs,
        deltaPct,
        trend,
      });
      previousMap.delete(metric.name);
    } else {
      deltas.push({
        name: metric.name,
        previous: null,
        current: Number(metric.averageMs ?? 0),
        deltaMs: null,
        deltaPct: null,
        trend: 'new',
      });
    }
  }

  for (const [name, metric] of previousMap.entries()) {
    deltas.push({
      name,
      previous: Number(metric.averageMs ?? 0),
      current: null,
      deltaMs: null,
      deltaPct: null,
      trend: 'removed',
    });
  }

  return deltas.sort((a, b) => a.name.localeCompare(b.name));
}

function annotateDeltas(deltas = [], previousLabel) {
  if (!Array.isArray(deltas) || deltas.length === 0) {
    return;
  }

  const label = previousLabel ? `previous baseline (${previousLabel})` : 'previous baseline';

  for (const delta of deltas) {
    if (delta.deltaMs == null || delta.deltaMs === 0) {
      continue;
    }

    const absMs = Math.abs(delta.deltaMs).toFixed(4);
    const pct =
      delta.deltaPct != null ? `${Math.abs(delta.deltaPct).toFixed(2)}%` : 'n/a';

    if (delta.deltaMs > 0) {
      console.warn(
        `::warning title=Performance delta::${delta.name} regressed ${absMs} ms (${pct}) vs ${label}`
      );
    } else {
      console.log(
        `::notice title=Performance delta::${delta.name} improved ${absMs} ms (${pct}) vs ${label}`
      );
    }
  }
}

async function main() {
  const { baselinePath, outputPath } = resolvePaths();

  let baseline;
  try {
    baseline = await loadBaseline(baselinePath);
  } catch (error) {
    console.warn(
      `::warning title=Performance baseline summary::Baseline file not found at ${baselinePath}.`
    );
    throw error;
  }

  const summary = summariseBaseline(baseline);
  summary.baselinePath = baselinePath;
  const seededHistoryPath = await ensureHistorySeeded(baselinePath, summary);
  const previousInfo = await findPreviousBaselineInfo(baselinePath, {
    excludePaths: seededHistoryPath ? [seededHistoryPath] : [],
  });

  if (previousInfo) {
    try {
      const previousBaseline = await loadBaseline(previousInfo.path);
      const previousSummary = summariseBaseline(previousBaseline);
      summary.previousBaseline = {
        label: previousInfo.name,
        path: previousInfo.path,
        generatedAt: previousSummary.generatedAt || null,
        runs: previousSummary.runs ?? null,
      };
      summary.deltas = computeMetricDeltas(summary, previousSummary);
    } catch (error) {
      console.warn(
        `[postPerformanceSummary] Failed to load previous baseline from ${previousInfo.path}`,
        error
      );
      summary.deltas = [];
    }
  } else {
    summary.deltas = [];
    console.log(
      '::notice title=Performance delta::No prior baseline found for delta comparison.'
    );
  }

  let historyEntryPath = seededHistoryPath;
  if (!historyEntryPath) {
    historyEntryPath = await persistBaselineHistory(baselinePath, summary);
  }
  if (historyEntryPath) {
    summary.historyEntry = {
      path: historyEntryPath,
      directory: path.dirname(historyEntryPath),
    };
  }

  const recentHistory = await listHistoryEntries(baselinePath, 5);
  if (recentHistory.length > 0) {
    const listSummary = recentHistory
      .map((entry) => {
        if (entry.modifiedAt) {
          return `${entry.name} (${entry.modifiedAt})`;
        }
        return entry.name;
      })
      .join(', ');
    console.log(
      `::notice title=Performance history entries::Recent archive files: ${listSummary}`
    );
  } else {
    console.log(
      '::notice title=Performance history entries::No archived baseline files present.'
    );
  }

  const markdown = formatMarkdownSummary(summary);

  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, `${markdown}\n`, 'utf8');

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }

  for (const metric of summary.metrics || []) {
    if (metric.status === 'critical') {
      const details = metric.issues?.length ? metric.issues.join('; ') : 'Threshold exceeded';
      console.error(
        `::error title=Performance baseline critical::${metric.name}: ${details} (avg ${metric.averageMs}ms vs ${metric.thresholdMs}ms)`
      );
    } else if (metric.status === 'warning') {
      const details = metric.issues?.length ? metric.issues.join('; ') : 'Near threshold';
      console.warn(
        `::warning title=Performance baseline warning::${metric.name}: ${details} (avg ${metric.averageMs}ms vs ${metric.thresholdMs}ms)`
      );
    }
  }

  annotateDeltas(summary.deltas, summary.previousBaseline?.label);
}

const CLI_SCRIPT_NAME = 'postPerformanceSummary.js';
const isCliInvocation =
  Array.isArray(process?.argv) &&
  typeof process.argv[1] === 'string' &&
  process.argv[1].endsWith(CLI_SCRIPT_NAME);

if (isCliInvocation) {
  main().catch((error) => {
    console.error('[postPerformanceSummary] Fatal error', error);
    process.exitCode = 1;
  });
}
