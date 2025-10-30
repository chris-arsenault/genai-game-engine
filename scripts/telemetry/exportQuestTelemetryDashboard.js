#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { QuestTelemetryValidationHarness } from '../../src/game/telemetry/QuestTelemetryValidationHarness.js';

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

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  const fileBuffer = await readFile(resolvedInput, 'utf8');
  const parsed = JSON.parse(fileBuffer);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[exportQuestTelemetryDashboard] Expected "${resolvedInput}" to contain an array of telemetry events`
    );
  }

  const stubBus = { on: () => () => {}, emit: () => {} };
  const harness = new QuestTelemetryValidationHarness(stubBus);
  harness.ingest(parsed);
  const dataset = harness.generateAnalyticsDataset({
    includeRawEvents,
    includeIssueDetails: true,
  });

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');

  console.log(
    `[exportQuestTelemetryDashboard] Processed ${dataset.totalEvents} events from ${resolvedInput} -> ${resolvedOutput}`
  );
}

main().catch((error) => {
  console.error('[exportQuestTelemetryDashboard] Failed to export dashboard dataset:', error);
  process.exitCode = 1;
});
