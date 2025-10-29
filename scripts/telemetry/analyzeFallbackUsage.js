#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { parseArgs, readCiMetadata } from './reportProviderMetrics.js';

/**
 * Resolve metadata manifest paths from CLI arguments/environment.
 * @param {Record<string, any>} args
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
export function resolveMetadataPaths(args = {}, env = process?.env ?? {}) {
  const resolved = new Set();

  const addPath = (candidate) => {
    if (typeof candidate !== 'string') {
      return;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      return;
    }
    resolved.add(path.resolve(trimmed));
  };

  const metadataArg = args.metadata;
  if (Array.isArray(metadataArg)) {
    for (const entry of metadataArg) {
      addPath(entry);
    }
  } else {
    addPath(metadataArg);
  }

  if (Array.isArray(args._)) {
    for (const positional of args._) {
      addPath(positional);
    }
  }

  if (resolved.size === 0) {
    addPath(env?.CI_ARTIFACT_METADATA);
  }

  if (resolved.size === 0) {
    addPath('telemetry-artifacts/ci-artifacts.json');
  }

  return Array.from(resolved);
}

function coerceNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function coerceBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }
  return Boolean(value);
}

function ensureSummaryStructure(summary) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }
  return {
    attempted: Boolean(summary.attempted),
    attempts: coerceNumber(summary.attempts, 0),
    succeeded: coerceNumber(summary.succeeded, 0),
    failed: coerceNumber(summary.failed, 0),
    partial: coerceNumber(summary.partial, 0),
    skipped: coerceNumber(summary.skipped, 0),
    lastAttemptedAt: typeof summary.lastAttemptedAt === 'string' ? summary.lastAttemptedAt : null,
    providers: summary.providers && typeof summary.providers === 'object' ? summary.providers : {},
  };
}

/**
 * Aggregate fallback usage across CI metadata manifests.
 * @param {Array<{ path: string, summary: Object|null }>} entries
 * @returns {{
 *   totalManifests: number,
 *   manifestsWithFallback: number,
 *   attempts: number,
 *   succeeded: number,
 *   failed: number,
 *   partial: number,
 *   skipped: number,
 *   lastAttemptedAt: string|null,
 *   providers: Record<string, { manifests: number, attempts: number, succeeded: number, failed: number, partial: number, skipped: number, lastStatus: string|null, lastAttemptedAt: string|null }>,
 *   sources: Array<{ path: string, attempted: boolean, attempts: number, succeeded: number, failed: number, partial: number, skipped: number, lastAttemptedAt: string|null }>
 * }}
 */
export function aggregateFallbackSummaries(entries = []) {
  const aggregate = {
    totalManifests: 0,
    manifestsWithFallback: 0,
    attempts: 0,
    succeeded: 0,
    failed: 0,
    partial: 0,
    skipped: 0,
    lastAttemptedAt: null,
    providers: {},
    sources: [],
  };

  const updateLastAttempt = (current, candidate) => {
    if (!candidate) {
      return current;
    }
    if (!current) {
      return candidate;
    }
    return candidate > current ? candidate : current;
  };

  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') {
      continue;
    }
    aggregate.totalManifests += 1;

    const summary = ensureSummaryStructure(entry.summary);
    if (!summary) {
      aggregate.sources.push({
        path: entry.path,
        attempted: false,
        attempts: 0,
        succeeded: 0,
        failed: 0,
        partial: 0,
        skipped: 0,
        lastAttemptedAt: null,
      });
      continue;
    }

    if (summary.attempted) {
      aggregate.manifestsWithFallback += 1;
    }

    aggregate.attempts += summary.attempts;
    aggregate.succeeded += summary.succeeded;
    aggregate.failed += summary.failed;
    aggregate.partial += summary.partial;
    aggregate.skipped += summary.skipped;
    aggregate.lastAttemptedAt = updateLastAttempt(aggregate.lastAttemptedAt, summary.lastAttemptedAt);

    aggregate.sources.push({
      path: entry.path,
      attempted: summary.attempted,
      attempts: summary.attempts,
      succeeded: summary.succeeded,
      failed: summary.failed,
      partial: summary.partial,
      skipped: summary.skipped,
      lastAttemptedAt: summary.lastAttemptedAt,
    });

    const providers = summary.providers || {};
    for (const [providerKey, providerSummaryRaw] of Object.entries(providers)) {
      const providerSummary = ensureSummaryStructure(providerSummaryRaw) || {
        attempted: false,
        attempts: 0,
        succeeded: 0,
        failed: 0,
        partial: 0,
        skipped: 0,
        lastAttemptedAt: null,
      };

      if (!aggregate.providers[providerKey]) {
        aggregate.providers[providerKey] = {
          manifests: 0,
          attempts: 0,
          succeeded: 0,
          failed: 0,
          partial: 0,
          skipped: 0,
          lastStatus: null,
          lastAttemptedAt: null,
        };
      }

      const target = aggregate.providers[providerKey];
      const providerAttempted = providerSummary.attempted || providerSummary.attempts > 0;
      target.manifests += providerAttempted ? 1 : 0;
      target.attempts += providerSummary.attempts;
      target.succeeded += providerSummary.succeeded;
      target.failed += providerSummary.failed;
      target.partial += providerSummary.partial;
      target.skipped += providerSummary.skipped;
      target.lastAttemptedAt = updateLastAttempt(target.lastAttemptedAt, providerSummary.lastAttemptedAt);
      if (providerSummaryRaw?.lastStatus) {
        target.lastStatus = providerSummaryRaw.lastStatus;
      }
    }
  }

  return aggregate;
}

/**
 * Create a markdown report summarising fallback usage.
 * @param {ReturnType<typeof aggregateFallbackSummaries>} aggregate
 * @returns {string}
 */
export function formatFallbackReport(aggregate) {
  const lines = [];
  lines.push('## Telemetry Fallback Usage');
  lines.push('');

  if (!aggregate || aggregate.totalManifests === 0) {
    lines.push('No telemetry metadata manifests processed.');
    lines.push('');
    lines.push('Provide `ci-artifacts.json` via `--metadata <path>` or ensure the export CLI generated artifacts.');
    return lines.join('\n');
  }

  lines.push(`- Manifests processed: ${aggregate.totalManifests}`);
  lines.push(`- Manifests with fallback attempts: ${aggregate.manifestsWithFallback}`);
  lines.push(
    `- Total fallback attempts: ${aggregate.attempts} (succeeded: ${aggregate.succeeded}, partial: ${aggregate.partial}, failed: ${aggregate.failed}, skipped: ${aggregate.skipped})`
  );
  lines.push(`- Last fallback attempt: ${aggregate.lastAttemptedAt ?? 'n/a'}`);
  lines.push('');

  const providerKeys = Object.keys(aggregate.providers);
  if (providerKeys.length > 0) {
    lines.push('| Provider | Manifests | Attempts | Succeeded | Partial | Failed | Skipped | Last Attempt |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const provider of providerKeys) {
      const stats = aggregate.providers[provider];
      lines.push(
        `| ${provider} | ${stats.manifests} | ${stats.attempts} | ${stats.succeeded} | ${stats.partial} | ${stats.failed} | ${stats.skipped} | ${stats.lastAttemptedAt ?? '—'} |`
      );
    }
    lines.push('');
  } else {
    lines.push('No fallback providers reported usage.');
    lines.push('');
  }

  if (aggregate.sources.length > 0) {
    lines.push('### Sources');
    lines.push('');
    lines.push('| Manifest | Attempts | Succeeded | Partial | Failed | Skipped | Last Attempt |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const source of aggregate.sources) {
      lines.push(
        `| ${path.relative(process.cwd(), source.path)} | ${source.attempts} | ${source.succeeded} | ${source.partial} | ${source.failed} | ${source.skipped} | ${source.lastAttemptedAt ?? '—'} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function writeSummaryFile(summaryPath, content) {
  try {
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.appendFile(summaryPath, `${content}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.warn('[telemetry-fallback] Failed to write summary output', {
      summaryPath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function isCliInvocation(argv = []) {
  if (!Array.isArray(argv) || argv.length < 2) {
    return false;
  }
  const candidate = argv[1];
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return false;
  }
  const normalizedPath = path.normalize(candidate);
  const scriptSuffix = path.normalize('scripts/telemetry/analyzeFallbackUsage.js');
  return normalizedPath.endsWith(scriptSuffix);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const metadataPaths = resolveMetadataPaths(args, process.env);

  const entries = [];
  for (const metadataPath of metadataPaths) {
    const metadata = await readCiMetadata(metadataPath);
    if (!metadata) {
      continue;
    }
    entries.push({
      path: metadataPath,
      summary: metadata.fallbackSummary ?? null,
    });
  }

  const aggregate = aggregateFallbackSummaries(entries);
  const reportText = formatFallbackReport(aggregate);
  const reportJson = JSON.stringify(
    {
      metadataPaths,
      aggregate,
    },
    null,
    2
  );

  const outputJson = coerceBoolean(args.json, false);
  if (outputJson) {
    console.log(reportJson);
  } else {
    console.log(reportText);
  }

  if (typeof args.summary === 'string' && args.summary.trim().length > 0) {
    const summaryPath = path.resolve(args.summary.trim());
    await writeSummaryFile(summaryPath, outputJson ? reportJson : reportText);
  }

  const failOnUsage = coerceBoolean(args['fail-on-usage'] ?? args.failOnUsage, false);
  const maxAttempts = coerceNumber(args['max-attempts'] ?? args.maxAttempts, null);

  if (failOnUsage && aggregate.attempts > 0) {
    console.error('[telemetry-fallback] Fallback uploader usage detected.');
    process.exitCode = 1;
  }

  if (maxAttempts !== null && aggregate.attempts > maxAttempts) {
    console.error(
      `[telemetry-fallback] Fallback attempts (${aggregate.attempts}) exceeded threshold (${maxAttempts}).`
    );
    process.exitCode = 1;
  }
}

if (isCliInvocation(process.argv)) {
  run().catch((error) => {
    console.error('[telemetry-fallback] Unexpected failure', {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  });
}
