/**
 * Inspector Telemetry Exporter
 *
 * Converts SaveManager inspector summaries into portable artifacts suitable
 * for external QA tooling or CI attachments.
 *
 * Artifacts produced:
 * - JSON summary (canonical representation of inspector data)
 * - CSV of cascade targets (ally/enemy cascade rollups)
 * - CSV of tutorial snapshots (prompt timeline for automation review)
 */

import { getFaction } from '../data/factions/index.js';

const DEFAULT_PREFIX = 'save-inspector';
const DEFAULT_FORMATS = ['json', 'csv'];

function normalizeFormats(formats) {
  if (!formats) {
    return [...DEFAULT_FORMATS];
  }
  const normalized = Array.isArray(formats) ? formats : [formats];
  const unique = new Set();
  for (const entry of normalized) {
    if (!entry) continue;
    const value = String(entry).toLowerCase();
    if (value === 'json' || value === 'csv') {
      unique.add(value);
    }
  }
  return unique.size ? Array.from(unique) : [...DEFAULT_FORMATS];
}

function sanitizeSummary(summary) {
  const generatedAt = summary?.generatedAt ?? Date.now();
  const source = summary?.source ?? 'unavailable';

  const factions = summary?.factions ?? {};
  const cascadeTargets = Array.isArray(factions.cascadeTargets) ? factions.cascadeTargets : [];

  const tutorial = summary?.tutorial ?? {};
  const snapshots = Array.isArray(tutorial.snapshots) ? tutorial.snapshots : [];
  const transcript = Array.isArray(tutorial.transcript) ? tutorial.transcript : [];

  return {
    generatedAt,
    generatedIso: new Date(generatedAt).toISOString(),
    source,
    factions: {
      lastCascadeEvent: factions.lastCascadeEvent ?? null,
      cascadeTargets,
      metrics: {
        cascadeTargetCount: cascadeTargets.length,
        activeCascadeTargets: cascadeTargets.filter((target) => (target?.cascadeCount ?? 0) > 0).length,
      },
    },
    tutorial: {
      latestSnapshot: tutorial.latestSnapshot ?? null,
      snapshots,
      transcript,
      metrics: {
        snapshotCount: snapshots.length,
        transcriptCount: transcript.length,
      },
    },
  };
}

function formatTimestampFragment(timestamp) {
  if (!timestamp) {
    return '00000000T000000Z';
  }
  const iso = new Date(timestamp).toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCascadeCsv(sanitizedSummary) {
  const rows = [
    [
      'row_type',
      'faction_id',
      'faction_name',
      'cascade_count',
      'last_source_faction_id',
      'last_source_faction_name',
      'new_attitude',
      'occurred_at',
      'occurred_iso',
      'sources',
    ],
  ];

  const lastEvent = sanitizedSummary.factions.lastCascadeEvent;
  if (lastEvent) {
    rows.push([
      'last_event',
      lastEvent.targetFactionId ?? '',
      resolveFactionName(lastEvent.targetFactionId, lastEvent.targetFactionName),
      '',
      lastEvent.sourceFactionId ?? '',
      resolveFactionName(lastEvent.sourceFactionId, lastEvent.sourceFactionName),
      lastEvent.newAttitude ?? '',
      lastEvent.occurredAt ?? '',
      lastEvent.occurredAt ? new Date(lastEvent.occurredAt).toISOString() : '',
      '',
    ]);
  }

  const sortedTargets = [...sanitizedSummary.factions.cascadeTargets].sort(
    (a, b) => (b?.cascadeCount ?? 0) - (a?.cascadeCount ?? 0)
  );

  for (const target of sortedTargets) {
    if (!target?.factionId) {
      continue;
    }
    const lastCascade = target.lastCascade ?? null;
    const sources = Array.isArray(target.sources) ? target.sources : [];
    rows.push([
      'target',
      target.factionId,
      resolveFactionName(target.factionId),
      target.cascadeCount ?? 0,
      lastCascade?.sourceFactionId ?? '',
      resolveFactionName(lastCascade?.sourceFactionId, lastCascade?.sourceFactionName),
      lastCascade?.newAttitude ?? '',
      lastCascade?.occurredAt ?? '',
      lastCascade?.occurredAt ? new Date(lastCascade.occurredAt).toISOString() : '',
      sources.join('|'),
    ]);
  }

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function buildTutorialCsv(sanitizedSummary) {
  const rows = [
    [
      'event',
      'timestamp',
      'timestamp_iso',
      'step_index',
      'total_steps',
      'step_id',
      'step_title',
      'completed_steps',
      'metadata',
    ],
  ];

  for (const snapshot of sanitizedSummary.tutorial.snapshots) {
    if (!snapshot) {
      continue;
    }
    const metadata = {
      promptId: snapshot.promptId ?? null,
      zoneId: snapshot.zoneId ?? null,
      dismissed: snapshot.dismissed ?? null,
    };
    rows.push([
      snapshot.event ?? 'unknown',
      snapshot.timestamp ?? '',
      snapshot.timestamp ? new Date(snapshot.timestamp).toISOString() : '',
      typeof snapshot.stepIndex === 'number' ? snapshot.stepIndex : '',
      typeof snapshot.totalSteps === 'number' ? snapshot.totalSteps : '',
      snapshot.stepId ?? '',
      snapshot.title ?? snapshot.stepTitle ?? '',
      Array.isArray(snapshot.completedSteps) ? snapshot.completedSteps.join('|') : '',
      JSON.stringify(metadata),
    ]);
  }

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function resolveFactionName(factionId, fallbackName = null) {
  if (fallbackName) {
    return fallbackName;
  }
  if (!factionId) {
    return '';
  }
  const faction = getFaction(factionId);
  return faction?.name ?? factionId;
}

/**
 * Create export artifacts for a given inspector summary.
 * @param {Object|null} summary
 * @param {Object} options
 * @param {string|string[]} [options.formats] - 'json', 'csv', or both
 * @param {string} [options.prefix='save-inspector']
 * @returns {{ summary: Object, artifacts: Array<{type: string, filename: string, mimeType: string, content: string}> }}
 */
export function createInspectorExportArtifacts(summary, options = {}) {
  const sanitizedSummary = sanitizeSummary(summary);
  const formats = normalizeFormats(options.formats);
  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const timestampFragment = formatTimestampFragment(sanitizedSummary.generatedAt);

  const artifacts = [];

  if (formats.includes('json')) {
    const filename = `${prefix}-summary-${timestampFragment}.json`;
    const jsonPayload = {
      generatedAt: sanitizedSummary.generatedAt,
      generatedIso: sanitizedSummary.generatedIso,
      source: sanitizedSummary.source,
      factions: sanitizedSummary.factions,
      tutorial: sanitizedSummary.tutorial,
    };
    artifacts.push({
      type: 'json',
      filename,
      mimeType: 'application/json',
      content: `${JSON.stringify(jsonPayload, null, 2)}\n`,
    });
  }

  if (formats.includes('csv')) {
    artifacts.push({
      type: 'csv',
      section: 'cascade',
      filename: `${prefix}-cascade-targets-${timestampFragment}.csv`,
      mimeType: 'text/csv',
      content: `${buildCascadeCsv(sanitizedSummary)}\n`,
    });

    artifacts.push({
      type: 'csv',
      section: 'tutorial',
      filename: `${prefix}-tutorial-snapshots-${timestampFragment}.csv`,
      mimeType: 'text/csv',
      content: `${buildTutorialCsv(sanitizedSummary)}\n`,
    });
  }

  return {
    summary: sanitizedSummary,
    artifacts,
  };
}

export const inspectorTelemetryExporter = {
  createInspectorExportArtifacts,
};
