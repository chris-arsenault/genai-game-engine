#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

/**
 * Parse CLI arguments supporting `--key value`, `--key=value`, and boolean flags.
 * @param {string[]} argv
 * @returns {Record<string, any>}
 */
export function parseArgs(argv = []) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      result._.push(token);
      continue;
    }

    const isLong = token.startsWith('--');
    const trimmed = token.slice(isLong ? 2 : 1);
    if (!trimmed) {
      continue;
    }

    const [key, value] = trimmed.split('=', 2);
    if (value !== undefined) {
      appendArg(result, key, value);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      appendArg(result, key, next);
      index += 1;
    } else {
      appendArg(result, key, true);
    }
  }

  return result;
}

function appendArg(container, key, value) {
  if (container[key] === undefined) {
    container[key] = value;
    return;
  }
  if (Array.isArray(container[key])) {
    container[key].push(value);
    return;
  }
  container[key] = [container[key], value];
}

function resolveMetadataPath(args, env) {
  const candidates = [
    args.metadata,
    env?.CI_ARTIFACT_METADATA,
    'telemetry-artifacts/ci-artifacts.json',
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return path.resolve(candidate);
    }
  }

  return path.resolve('telemetry-artifacts/ci-artifacts.json');
}

/**
 * Read CI metadata manifest from disk.
 * @param {string} metadataPath
 * @returns {Promise<Object|null>}
 */
export async function readCiMetadata(metadataPath) {
  try {
    const raw = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[telemetry-metrics] Failed to read metadata manifest', {
      metadataPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Summarise provider upload results for reporting.
 * @param {Array<Object>} providerResults
 * @returns {{ total: number, statusCounts: Record<string, number>, providers: Array<Object>, hasFailures: boolean }}
 */
export function summariseProviderResults(providerResults = []) {
  const summary = {
    total: 0,
    statusCounts: {},
    providers: [],
    hasFailures: false,
  };

  if (!Array.isArray(providerResults) || providerResults.length === 0) {
    return summary;
  }

  summary.total = providerResults.length;

  for (const entry of providerResults) {
    const provider = entry?.provider ?? 'unknown';
    const status = entry?.status ?? 'unknown';
    const exitCode =
      typeof entry?.exitCode === 'number' && Number.isFinite(entry.exitCode)
        ? entry.exitCode
        : null;
    const durationMs =
      typeof entry?.durationMs === 'number' && Number.isFinite(entry.durationMs)
        ? entry.durationMs
        : null;
    const fileCount =
      typeof entry?.fileCount === 'number' && Number.isFinite(entry.fileCount)
        ? entry.fileCount
        : Array.isArray(entry?.files)
          ? entry.files.length
          : null;

    summary.statusCounts[status] = (summary.statusCounts[status] ?? 0) + 1;
    if (status === 'failed' || status === 'error') {
      summary.hasFailures = true;
    }

    summary.providers.push({
      provider,
      status,
      exitCode,
      durationMs,
      artifactName: entry?.artifactName ?? null,
      fileCount,
      skippedReason: entry?.skippedReason ?? null,
      attemptedAt: entry?.attemptedAt ?? null,
    });
  }

  return summary;
}

/**
 * Format provider metrics as markdown for CI dashboards.
 * @param {ReturnType<typeof summariseProviderResults>} summary
 * @returns {string}
 */
export function formatMarkdown(summary) {
  const lines = [];
  lines.push('## Telemetry Provider Uploads');
  lines.push('');

  if (!summary || summary.total === 0) {
    lines.push('No provider results recorded in `ci-artifacts.json`.');
    lines.push('');
    lines.push(
      'Ensure telemetry commands executed after export (e.g., GitHub uploads) and that metrics persistence is enabled.'
    );
    return lines.join('\n');
  }

  const statusSummary = Object.entries(summary.statusCounts)
    .map(([status, count]) => `\`${status}\`: ${count}`)
    .join(', ');
  lines.push(`- Providers reported: ${summary.total}`);
  lines.push(`- Status breakdown: ${statusSummary || 'n/a'}`);
  lines.push(`- Failures detected: ${summary.hasFailures ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('| Provider | Status | Exit | Duration (ms) | Artifact | Files | Skip Reason |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');

  for (const provider of summary.providers) {
    const exitCode = provider.exitCode ?? '—';
    const duration = provider.durationMs != null ? provider.durationMs : '—';
    const artifact = provider.artifactName || '—';
    const files = provider.fileCount != null ? provider.fileCount : '—';
    const skipped = provider.skippedReason || '—';
    lines.push(
      `| ${provider.provider} | ${provider.status} | ${exitCode} | ${duration} | ${artifact} | ${files} | ${skipped} |`
    );
  }

  return lines.join('\n');
}

async function writeSummary(markdown, summaryPath) {
  try {
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.appendFile(summaryPath, `${markdown}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.warn('[telemetry-metrics] Failed to append CI summary', {
      summaryPath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const metadataPath = resolveMetadataPath(args, env);
  const metadata = await readCiMetadata(metadataPath);

  if (!metadata) {
    return { metadataPath, summary: null, providerSummary: null };
  }

  const providerSummary = summariseProviderResults(metadata.providerResults || []);
  const markdown = formatMarkdown(providerSummary);

  const summaryPath =
    (typeof args.summary === 'string' && args.summary.length > 0
      ? args.summary
      : env?.GITHUB_STEP_SUMMARY) || null;

  if (summaryPath) {
    await writeSummary(markdown, path.resolve(summaryPath));
  } else {
    console.info(markdown);
  }

  return { metadataPath, summary: markdown, providerSummary };
}

const isExecutedAsCli =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv.length > 1 &&
  typeof process.argv[1] === 'string' &&
  process.argv[1].endsWith('reportProviderMetrics.js');

if (isExecutedAsCli) {
  main().catch((error) => {
    console.error('[telemetry-metrics] Unexpected failure', error);
    process.exitCode = 1;
  });
}
