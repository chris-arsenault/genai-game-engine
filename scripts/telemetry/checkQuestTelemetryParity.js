#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { checkQuestTelemetrySchema } from '../../src/game/telemetry/QuestTelemetrySchemaChecker.js';

async function main() {
  const args = process.argv.slice(2);
  let datasetPath = 'telemetry-artifacts/quest-telemetry-dashboard.json';

  for (const arg of args) {
    if (arg.startsWith('--dataset=')) {
      datasetPath = arg.slice('--dataset='.length).trim();
    }
  }

  const resolvedDatasetPath = path.resolve(process.cwd(), datasetPath);
  let dataset = null;

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

  const result = checkQuestTelemetrySchema(dataset);

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
}

if (process.argv[1] && process.argv[1].includes('checkQuestTelemetryParity.js')) {
  main().catch((error) => {
    console.error('[checkQuestTelemetryParity] Unexpected failure:', error);
    process.exitCode = 1;
  });
}
