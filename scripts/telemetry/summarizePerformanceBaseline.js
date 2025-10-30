#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

export const DEFAULT_WARNING_RATIO = 0.8;
export const DEFAULT_CRITICAL_RATIO = 0.95;

function formatSigned(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return Number(0).toFixed(decimals);
  }
  const abs = Math.abs(value);
  const isZero = abs < 10 ** -(decimals + 1);
  const fixed = isZero ? Number(0).toFixed(decimals) : Number(value).toFixed(decimals);
  if (value > 0 && !fixed.startsWith('+')) {
    return `+${fixed}`;
  }
  return fixed;
}

/**
 * Parse CLI arguments for the summary script.
 * Supports both `--key value` and `--key=value` pairs plus positional args.
 * @param {string[]} argv
 * @returns {Record<string, any>}
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      args._.push(token);
      continue;
    }

    const trimmed = token.replace(/^-+/, '');
    const [key, inlineValue] = trimmed.split('=', 2);
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
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

/**
 * Resolve the baseline path from CLI args or fallback to default.
 * @param {Record<string, any>} args
 * @returns {string}
 */
export function resolveBaselinePath(args = {}) {
  const candidate =
    args.input || args.i || (Array.isArray(args._) && args._.length > 0 ? args._[0] : null);
  const resolved = candidate
    ? path.resolve(candidate)
    : path.resolve('telemetry-artifacts/performance/ci-baseline.json');
  return resolved;
}

/**
 * Load and parse the baseline JSON file.
 * @param {string} baselinePath
 * @returns {Promise<object>}
 */
export async function loadBaseline(baselinePath) {
  const content = await fs.readFile(baselinePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Evaluate a single metric against thresholds to determine alert status.
 * @param {string} name
 * @param {object} metric
 * @param {{ warningRatio?: number, criticalRatio?: number }} options
 * @returns {object}
 */
export function evaluateMetric(name, metric = {}, options = {}) {
  const warningRatio = Number.isFinite(options.warningRatio)
    ? options.warningRatio
    : DEFAULT_WARNING_RATIO;
  const criticalRatio = Number.isFinite(options.criticalRatio)
    ? options.criticalRatio
    : DEFAULT_CRITICAL_RATIO;

  const averageMs = Number(metric.averageMs ?? 0);
  const minMs = Number(metric.minMs ?? 0);
  const maxMs = Number(metric.maxMs ?? 0);
  const thresholdMs =
    metric.thresholdMs == null || Number.isNaN(Number(metric.thresholdMs))
      ? null
      : Number(metric.thresholdMs);
  const sampleCount = Array.isArray(metric.samples) ? metric.samples.length : 0;
  const ratio = thresholdMs ? averageMs / thresholdMs : null;
  const utilisation = ratio != null ? Number((ratio * 100).toFixed(2)) : null;

  let status = thresholdMs ? 'ok' : 'info';
  const issues = [];

  if (thresholdMs != null) {
    if (metric.passed === false || averageMs > thresholdMs || (ratio ?? 0) >= criticalRatio) {
      status = 'critical';
      if (averageMs > thresholdMs) {
        issues.push('Average exceeded threshold');
      } else if (metric.passed === false) {
        issues.push('Baseline reported failed status');
      } else {
        issues.push(`Average within ${Math.round((ratio ?? 0) * 100)}% of threshold`);
      }
    } else if ((ratio ?? 0) >= warningRatio) {
      status = 'warning';
      issues.push(`Average within ${Math.round((ratio ?? 0) * 100)}% of threshold`);
    }

    if (thresholdMs != null && maxMs > thresholdMs && status !== 'critical') {
      status = status === 'warning' ? status : 'warning';
      issues.push('Peak sample exceeded threshold');
    }
  }

  return {
    name,
    averageMs,
    minMs,
    maxMs,
    thresholdMs,
    utilisation,
    status,
    sampleCount,
    issues,
  };
}

/**
 * Summarise all metrics within the baseline payload.
 * @param {object} baseline
 * @param {{ warningRatio?: number, criticalRatio?: number }} options
 * @returns {object}
 */
export function summariseBaseline(baseline = {}, options = {}) {
  const metrics = [];
  const metricEntries = baseline.metrics && typeof baseline.metrics === 'object'
    ? Object.entries(baseline.metrics)
    : [];

  for (const [name, metric] of metricEntries) {
    metrics.push(evaluateMetric(name, metric, options));
  }

  const generatedAt = baseline.generatedAt || null;
  const runs = baseline.runs ?? null;
  const thresholds = baseline.thresholds || {};

  return {
    generatedAt,
    runs,
    metrics,
    thresholds,
  };
}

/**
 * Format a baseline summary as markdown.
 * @param {object} summary
 * @returns {string}
 */
export function formatMarkdownSummary(summary = {}) {
  const lines = [];
  lines.push('# Performance Baseline Summary');

  if (summary.generatedAt) {
    lines.push(`- Generated at: ${summary.generatedAt}`);
  }
  if (summary.runs != null) {
    lines.push(`- Runs aggregated: ${summary.runs}`);
  }
  if (summary.previousBaseline?.label || summary.previousBaseline?.generatedAt) {
    const label = summary.previousBaseline?.label ?? 'previous baseline';
    const generatedAt = summary.previousBaseline?.generatedAt
      ? ` (${summary.previousBaseline.generatedAt})`
      : '';
    const location = summary.previousBaseline?.path ? ` — \`${summary.previousBaseline.path}\`` : '';
    lines.push(`- Compared against: ${label}${generatedAt}${location}`);
  }
  if (summary.baselinePath) {
    lines.push(`- Baseline JSON: \`${summary.baselinePath}\``);
  }
  if (summary.historyEntry?.path) {
    lines.push(`- History archive entry: \`${summary.historyEntry.path}\``);
  }
  lines.push('');

  const headers = [
    'Metric',
    'Avg (ms)',
    'Threshold (ms)',
    'Utilisation',
    'Status',
    'Min / Max (ms)',
    'Samples',
  ];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  for (const metric of summary.metrics || []) {
    const utilisation = metric.utilisation != null ? `${metric.utilisation}%` : 'n/a';
    const statusLabel = metric.status?.toUpperCase() || 'INFO';
    const threshold = metric.thresholdMs != null ? metric.thresholdMs : 'n/a';
    const minMax = `${metric.minMs} / ${metric.maxMs}`;
    lines.push(
      `| ${metric.name} | ${metric.averageMs} | ${threshold} | ${utilisation} | ${statusLabel} | ${minMax} | ${metric.sampleCount} |`
    );
  }

  const alerts = (summary.metrics || []).filter(
    (metric) => metric.status === 'warning' || metric.status === 'critical'
  );

  if (alerts.length > 0) {
    lines.push('');
    lines.push('## Alerts');
    for (const metric of alerts) {
      const prefix = metric.status === 'critical' ? '[CRITICAL]' : '[WARNING]';
      const detail = metric.issues.length > 0 ? ` - ${metric.issues.join('; ')}` : '';
      lines.push(`- ${prefix}: ${metric.name}${detail}`);
    }
  }

  if (Array.isArray(summary.deltas) && summary.deltas.length > 0) {
    lines.push('');
    const headingLabel =
      summary.previousBaseline?.label ?? summary.previousBaseline?.generatedAt ?? 'previous baseline';
    lines.push(`## Delta vs Previous Baseline (${headingLabel})`);
    lines.push('| Metric | Current Avg (ms) | Previous Avg (ms) | Δ ms | Δ % | Trend |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const delta of summary.deltas) {
      const current = delta.current != null ? delta.current : 'n/a';
      const previous = delta.previous != null ? delta.previous : 'n/a';
      const deltaMs =
        delta.deltaMs != null ? formatSigned(delta.deltaMs, 4) : 'n/a';
      const deltaPct =
        delta.deltaPct != null ? `${formatSigned(delta.deltaPct, 2)}%` : 'n/a';
      const trend = delta.trend ? delta.trend.toUpperCase() : 'FLAT';
      lines.push(
        `| ${delta.name} | ${current} | ${previous} | ${deltaMs} | ${deltaPct} | ${trend} |`
      );
    }
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  const baselinePath = resolveBaselinePath(args);
  const warningRatio = args.warningRatio ? Number(args.warningRatio) : undefined;
  const criticalRatio = args.criticalRatio ? Number(args.criticalRatio) : undefined;
  const baseline = await loadBaseline(baselinePath);
  const summary = summariseBaseline(baseline, { warningRatio, criticalRatio });
  const markdown = formatMarkdownSummary(summary);

  if (args.output || args.out) {
    const outputPath = path.resolve(args.output || args.out);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${markdown}\n`, 'utf8');
  }

  process.stdout.write(`${markdown}\n`);
}

if (
  process.argv[1] &&
  process.argv[1].toLowerCase().endsWith('summarizeperformancebaseline.js')
) {
  main().catch((error) => {
    console.error('[summarize-performance-baseline] Fatal error', error);
    process.exitCode = 1;
  });
}
