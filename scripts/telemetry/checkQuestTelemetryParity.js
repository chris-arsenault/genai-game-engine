#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildQuestTelemetryDatasetFromSamples,
  checkQuestTelemetrySchema,
  summarizeQuestTelemetrySchemaCheck,
} from '../../src/game/telemetry/QuestTelemetrySchemaChecker.js';

async function main() {
  const args = process.argv.slice(2);
  let datasetPath = 'telemetry-artifacts/quest-telemetry-dashboard.json';
  const samplePaths = [];
  let schemaVersionOverride = null;
  let summaryOutputPath = null;

  for (const arg of args) {
    if (arg.startsWith('--dataset=')) {
      datasetPath = arg.slice('--dataset='.length).trim();
    } else if (arg.startsWith('--samples=')) {
      const candidate = arg.slice('--samples='.length).trim();
      if (candidate.length > 0) {
        samplePaths.push(candidate);
      }
    } else if (arg.startsWith('--schema-version=')) {
      schemaVersionOverride = arg.slice('--schema-version='.length).trim();
    } else if (arg.startsWith('--summary-out=')) {
      summaryOutputPath = arg.slice('--summary-out='.length).trim();
    }
  }

  let dataset = null;

  if (samplePaths.length > 0) {
    const events = [];
    for (const samplePath of samplePaths) {
      const resolvedSample = path.resolve(process.cwd(), samplePath);
      try {
        const raw = await readFile(resolvedSample, 'utf8');
        const parsed = parseSampleContent(raw, resolvedSample);
        if (Array.isArray(parsed)) {
          events.push(...parsed);
        } else {
          console.warn(
            `[checkQuestTelemetryParity] Ignored sample at ${resolvedSample}; expected an array of events`
          );
        }
      } catch (error) {
        console.warn(
          `[checkQuestTelemetryParity] Unable to read telemetry samples from ${resolvedSample}:`,
          error
        );
      }
    }
    dataset = buildQuestTelemetryDatasetFromSamples(events, {
      schemaVersion: schemaVersionOverride ?? 'sample-batch',
      datasetOverrides: {
        report: {
          source: 'sample-batch',
          summary: {
            samples: samplePaths,
            note: 'Aggregated from quest telemetry sample logs',
          },
        },
      },
    });
  } else {
    const resolvedDatasetPath = path.resolve(process.cwd(), datasetPath);
    try {
      const raw = await readFile(resolvedDatasetPath, 'utf8');
      dataset = JSON.parse(raw);
    } catch (error) {
      console.error(
        `[checkQuestTelemetryParity] Unable to read dataset at ${resolvedDatasetPath}:`,
        error
      );
      process.exitCode = 1;
      return;
    }
  }

  const result = checkQuestTelemetrySchema(dataset);
  const summary = summarizeQuestTelemetrySchemaCheck(result);

  if (!result.ok) {
    console.error('[checkQuestTelemetryParity] Schema mismatches detected:');
    for (const issue of result.issues) {
      console.error(`  - (${issue.severity}) ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `[checkQuestTelemetryParity] Dataset matches expected schema with ${result.stats.totalEvents} events`
    );
  }

  reportParity(summary.parity);

  if (summaryOutputPath && summaryOutputPath.length > 0) {
    await writeSummaryReport(summaryOutputPath, {
      summary,
      stats: result.stats,
      datasetPath,
      samplePaths,
    });
  }
}

if (process.argv[1] && process.argv[1].includes('checkQuestTelemetryParity.js')) {
  main().catch((error) => {
    console.error('[checkQuestTelemetryParity] Unexpected failure:', error);
    process.exitCode = 1;
  });
}

function parseSampleContent(raw, filePath) {
  if (!raw || raw.length === 0) {
    return [];
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }
  if (filePath && (filePath.endsWith('.jsonl') || filePath.endsWith('.ndjson'))) {
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
  }
  const parsed = JSON.parse(trimmed);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed.events)) {
    return parsed.events;
  }
  return [];
}

function reportParity(parity) {
  if (!parity) {
    return;
  }

  const formatBucket = (label, bucket) => {
    if (!bucket) {
      return;
    }
    const coveragePercent = Math.round((bucket.coverage ?? 0) * 100);
    console.log(
      `[checkQuestTelemetryParity] ${label} coverage: ${coveragePercent}% (${bucket.requiredFields.length} required fields)`
    );
    if (Array.isArray(bucket.missingFieldNames) && bucket.missingFieldNames.length > 0) {
      console.log(
        `  - Missing ${label.toLowerCase()} fields: ${bucket.missingFieldNames.join(', ')}`
      );
    }
  };

  formatBucket('Dataset', parity.dataset);
  formatBucket('Event', parity.event);
  formatBucket('Payload', parity.payload);

  if (Array.isArray(parity.unexpected) && parity.unexpected.length > 0) {
    console.log(
      `[checkQuestTelemetryParity] Unexpected fields detected: ${parity.unexpected.join(', ')}`
    );
  }
}

async function writeSummaryReport(targetPath, context) {
  const resolved = path.resolve(process.cwd(), targetPath);
  const datasetBucket = context.summary?.parity?.dataset ?? {};
  const eventBucket = context.summary?.parity?.event ?? {};
  const payloadBucket = context.summary?.parity?.payload ?? {};
  const sampleSources = Array.isArray(context.samplePaths) ? context.samplePaths : [];

  const report = {
    generatedAt: new Date().toISOString(),
    ok: context.summary?.ok ?? false,
    totals: {
      events: context.stats?.totalEvents ?? 0,
      datasetFieldsRequired: Array.isArray(datasetBucket.requiredFields)
        ? datasetBucket.requiredFields.length
        : 0,
      eventFieldsRequired: Array.isArray(eventBucket.requiredFields) ? eventBucket.requiredFields.length : 0,
      payloadFieldsRequired: Array.isArray(payloadBucket.requiredFields)
        ? payloadBucket.requiredFields.length
        : 0,
    },
    coverage: {
      dataset: datasetBucket,
      event: eventBucket,
      payload: payloadBucket,
    },
    unexpectedFields: context.summary?.parity?.unexpected ?? [],
    issues: context.summary?.issues ?? [],
    sources: {
      dataset: sampleSources.length > 0 ? 'aggregated-samples' : path.resolve(process.cwd(), context.datasetPath),
      samples: sampleSources.map((sample) => path.resolve(process.cwd(), sample)),
    },
    nextSteps: context.summary?.ok
      ? ['Share summary with analytics for ingestion confirmation.', 'Schedule next parity run when new telemetry batches arrive.']
      : ['Resolve schema mismatches before handing off to analytics.'],
  };

  await writeFile(resolved, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[checkQuestTelemetryParity] Summary written to ${resolved}`);
}
