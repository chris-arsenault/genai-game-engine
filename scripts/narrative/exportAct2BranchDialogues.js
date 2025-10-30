#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { writeAct2BranchDialogueSummary } from '../../src/game/tools/Act2BranchDialogueExporter.js';

async function main() {
  const args = process.argv.slice(2);
  let outputPath = 'telemetry-artifacts/act2-branch-dialogues-summary.json';
  let pretty = true;

  for (const arg of args) {
    if (arg.startsWith('--out=')) {
      outputPath = arg.slice('--out='.length).trim();
    } else if (arg === '--compact') {
      pretty = false;
    }
  }

  const resolvedOutput = path.resolve(process.cwd(), outputPath);
  const { dialogueCount } = await writeAct2BranchDialogueSummary(resolvedOutput, { pretty });

  console.log(
    `[exportAct2BranchDialogues] Wrote ${dialogueCount} dialogues to ${resolvedOutput}`
  );
}

main().catch((error) => {
  console.error('[exportAct2BranchDialogues] Failed to export dialogue summary:', error);
  process.exitCode = 1;
});
