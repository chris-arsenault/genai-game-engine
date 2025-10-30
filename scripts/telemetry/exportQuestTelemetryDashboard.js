#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { QuestTelemetryValidationHarness } from '../../src/game/telemetry/QuestTelemetryValidationHarness.js';

export async function runQuestTelemetryDashboardExport(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const includeRawEvents = options.includeRawEvents !== false;
  const inputPath = path.resolve(
    cwd,
    typeof options.inputPath === 'string' && options.inputPath.length > 0
      ? options.inputPath
      : 'telemetry-artifacts/quest-telemetry-events.json'
  );
  const outputPath = path.resolve(
    cwd,
    typeof options.outputPath === 'string' && options.outputPath.length > 0
      ? options.outputPath
      : 'telemetry-artifacts/quest-telemetry-dashboard.json'
  );

  let events = Array.isArray(options.events) ? options.events : null;

  if (!events) {
    const fileBuffer = await readFile(inputPath, 'utf8');
    const parsed = JSON.parse(fileBuffer);
    if (!Array.isArray(parsed)) {
      throw new Error(
        `[runQuestTelemetryDashboardExport] Expected "${inputPath}" to contain an array of telemetry events`
      );
    }
    events = parsed;
  }

  const stubBus = { on: () => () => {}, emit: () => {} };
  const harness = new QuestTelemetryValidationHarness(stubBus);
  harness.ingest(events);
  const dataset = harness.generateAnalyticsDataset({
    includeRawEvents,
    includeIssueDetails: true,
    expectedTags: options.expectedTags,
    expectedQuestObjectives: options.expectedQuestObjectives,
  });

  if (options.writeOutput !== false) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  }

  return {
    dataset,
    outputPath,
    totalEvents: dataset.totalEvents,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let inputPath = 'telemetry-artifacts/quest-telemetry-events.json';
  let outputPath = 'telemetry-artifacts/quest-telemetry-dashboard.json';
  let includeRawEvents = true;

  for (const arg of args) {
    if (arg.startsWith('--in=')) {
      inputPath = arg.slice('--in='.length).trim();
    } else if (arg.startsWith('--out=')) {
      outputPath = arg.slice('--out='.length).trim();
    } else if (arg === '--summary-only') {
      includeRawEvents = false;
    }
  }

  const { totalEvents } = await runQuestTelemetryDashboardExport({
    inputPath,
    outputPath,
    includeRawEvents,
  });

  console.log(
    `[exportQuestTelemetryDashboard] Processed ${totalEvents} events from ${path.resolve(process.cwd(), inputPath)} -> ${path.resolve(process.cwd(), outputPath)}`
  );
}

if (process.argv[1] && process.argv[1].includes('exportQuestTelemetryDashboard.js')) {
  main().catch((error) => {
    console.error('[exportQuestTelemetryDashboard] Failed to export dashboard dataset:', error);
    process.exitCode = 1;
  });
}
