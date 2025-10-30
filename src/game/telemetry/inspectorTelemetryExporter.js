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
import {
  serializeTranscriptToCsv,
  serializeTranscriptToMarkdown,
} from '../tutorial/serializers/tutorialTranscriptSerializer.js';

const DEFAULT_PREFIX = 'save-inspector';
const DEFAULT_FORMATS = ['json', 'csv'];
export const SPATIAL_HISTORY_BUDGET_BYTES = 12 * 1024; // 12 KB guardrail for inspector payloads

const FORMAT_ALIASES = new Map([
  ['json', 'json'],
  ['csv', 'csv'],
  ['cascade', 'csv'],
  ['tutorial-csv', 'csv'],
  ['transcript-csv', 'transcript-csv'],
  ['transcript:csv', 'transcript-csv'],
  ['transcript_csv', 'transcript-csv'],
  ['transcript', 'transcript-csv'],
  ['transcript-md', 'transcript-md'],
  ['transcript_markdown', 'transcript-md'],
  ['transcript:markdown', 'transcript-md'],
  ['transcript-markdown', 'transcript-md'],
  ['markdown', 'transcript-md'],
  ['md', 'transcript-md'],
]);

function normalizeFormats(formats) {
  if (!formats) {
    return [...DEFAULT_FORMATS];
  }
  const normalized = Array.isArray(formats) ? formats : [formats];
  const unique = new Set();
  for (const entry of normalized) {
    if (!entry) continue;
    const value = String(entry).toLowerCase();
    const mapped = FORMAT_ALIASES.get(value);
    if (mapped) {
      unique.add(mapped);
    }
  }
  return unique.size ? Array.from(unique) : [...DEFAULT_FORMATS];
}

function sanitizeAggregate(aggregate) {
  if (!aggregate || typeof aggregate !== 'object') {
    return null;
  }
  const safe = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  return {
    average: safe(aggregate.average),
    min: safe(aggregate.min),
    max: safe(aggregate.max),
  };
}

function sanitizeSample(sample) {
  if (!sample || typeof sample !== 'object') {
    return null;
  }
  const safe = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  return {
    cellCount: safe(sample.cellCount),
    maxBucketSize: safe(sample.maxBucketSize),
    trackedEntities: safe(sample.trackedEntities),
    timestamp: safe(sample.timestamp),
  };
}

function sanitizeStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return null;
  }
  const safe = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  return {
    insertions: safe(stats.insertions),
    updates: safe(stats.updates),
    removals: safe(stats.removals),
  };
}

function sanitizeSpatialTelemetry(spatial) {
  if (!spatial || typeof spatial !== 'object') {
    return null;
  }

  const history = Array.isArray(spatial.history)
    ? spatial.history.map(sanitizeSample).filter(Boolean)
    : [];

  const payloadBytesNumeric = Number(spatial.payloadBytes);
  let payloadBytes = Number.isFinite(payloadBytesNumeric)
    ? payloadBytesNumeric
    : null;
  if (!payloadBytes) {
    try {
      payloadBytes = JSON.stringify(history).length;
    } catch (error) {
      console.warn('[TelemetryExporter] Failed to estimate spatial history payload size', error);
      payloadBytes = null;
    }
  }

  const windowNumeric = Number(spatial.window);
  const windowSize = Number.isFinite(windowNumeric)
    ? Math.max(1, Math.floor(windowNumeric))
    : null;

  const sampleCountNumeric = Number(spatial.sampleCount);
  const sampleCountField = Number.isFinite(sampleCountNumeric)
    ? Math.max(0, Math.floor(sampleCountNumeric))
    : null;
  const sampleCount = sampleCountField ?? history.length;

  const lastSample =
    sanitizeSample(spatial.lastSample) ??
    (history.length ? history[history.length - 1] : null);

  const cellSizeNumeric = Number(spatial.cellSize);
  const budgetStatus = (() => {
    if (!Number.isFinite(payloadBytes)) {
      return {
        status: 'unknown',
        exceededBy: 0,
      };
    }
    if (payloadBytes <= SPATIAL_HISTORY_BUDGET_BYTES) {
      return {
        status: 'within_budget',
        exceededBy: 0,
      };
    }
    return {
      status: 'exceeds_budget',
      exceededBy: payloadBytes - SPATIAL_HISTORY_BUDGET_BYTES,
    };
  })();

  return {
    cellSize: Number.isFinite(cellSizeNumeric) ? cellSizeNumeric : null,
    window: windowSize,
    sampleCount,
    lastSample,
    aggregates: {
      cellCount: sanitizeAggregate(spatial.aggregates?.cellCount),
      maxBucketSize: sanitizeAggregate(spatial.aggregates?.maxBucketSize),
      trackedEntities: sanitizeAggregate(spatial.aggregates?.trackedEntities),
    },
    stats: sanitizeStats(spatial.stats),
    history,
    payloadBytes,
    payloadBudgetBytes: SPATIAL_HISTORY_BUDGET_BYTES,
    payloadBudgetStatus: budgetStatus.status,
    payloadBudgetExceededBy: budgetStatus.exceededBy,
  };
}

function sanitizeSummary(summary) {
  const generatedAt = summary?.generatedAt ?? Date.now();
  const source = summary?.source ?? 'unavailable';

  const factions = summary?.factions ?? {};
  const cascadeTargets = Array.isArray(factions.cascadeTargets)
    ? factions.cascadeTargets
    : [];
  const recentMemberRemovals = Array.isArray(factions.recentMemberRemovals)
    ? factions.recentMemberRemovals
    : [];

  const tutorial = summary?.tutorial ?? {};
  const snapshots = Array.isArray(tutorial.snapshots) ? tutorial.snapshots : [];
  const transcript = Array.isArray(tutorial.transcript) ? tutorial.transcript : [];

  const engine = summary?.engine ?? {};
  const spatialHash = sanitizeSpatialTelemetry(engine.spatialHash);

  return {
    generatedAt,
    generatedIso: new Date(generatedAt).toISOString(),
    source,
    factions: {
      lastCascadeEvent: factions.lastCascadeEvent ?? null,
      cascadeTargets,
      recentMemberRemovals: recentMemberRemovals.map((entry) => ({
        factionId: entry?.factionId ?? null,
        factionName: entry?.factionName ?? null,
        npcId: entry?.npcId ?? null,
        entityId: entry?.entityId ?? null,
        tag: entry?.tag ?? null,
        removedAt: entry?.removedAt ?? null,
        removedIso: entry?.removedAt
          ? new Date(entry.removedAt).toISOString()
          : null,
      })),
      metrics: {
        cascadeTargetCount: cascadeTargets.length,
        activeCascadeTargets: cascadeTargets.filter(
          (target) => (target?.cascadeCount ?? 0) > 0
        ).length,
        recentMemberRemovalCount: recentMemberRemovals.length,
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
    engine: {
      spatialHash,
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
      engine: sanitizedSummary.engine,
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

  if (formats.includes('transcript-csv')) {
    artifacts.push({
      type: 'transcript-csv',
      section: 'tutorial-transcript',
      filename: `${prefix}-tutorial-transcript-${timestampFragment}.csv`,
      mimeType: 'text/csv',
      content: `${serializeTranscriptToCsv(sanitizedSummary.tutorial.transcript)}\n`,
    });
  }

  if (formats.includes('transcript-md')) {
    artifacts.push({
      type: 'transcript-md',
      section: 'tutorial-transcript',
      filename: `${prefix}-tutorial-transcript-${timestampFragment}.md`,
      mimeType: 'text/markdown',
      content: `${serializeTranscriptToMarkdown(sanitizedSummary.tutorial.transcript)}\n`,
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
