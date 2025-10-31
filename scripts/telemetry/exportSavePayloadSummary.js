#!/usr/bin/env node

/**
 * Exports a condensed save payload schema summary for QA and telemetry review.
 * Accepts an optional output path; defaults to stdout.
 */

import { buildSavePayloadSummary } from '../../src/game/managers/savePayloadSummary.js';
import { buildSummarySaveManager } from './lib/saveManagerFixtures.js';

async function main() {
  const saveManager = buildSummarySaveManager();
  const summary = buildSavePayloadSummary(saveManager, { slotName: 'payload-summary' });
  const output = JSON.stringify(summary, null, 2);

  const outputPath = process.argv[2];
  if (outputPath) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(outputPath, `${output}\n`, 'utf8');
  } else {
    // eslint-disable-next-line no-console
    console.log(output);
  }

  saveManager.cleanup();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[exportSavePayloadSummary] Failed to build summary', error);
  process.exitCode = 1;
});
