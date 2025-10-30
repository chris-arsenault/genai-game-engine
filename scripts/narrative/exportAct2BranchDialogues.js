#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import {
  buildAct2BranchDialogueSummary,
  writeAct2BranchDialogueSummary,
  writeAct2BranchDialogueMarkdown,
} from '../../src/game/tools/Act2BranchDialogueExporter.js';

async function main() {
  const args = process.argv.slice(2);
  let outputPath = 'telemetry-artifacts/act2-branch-dialogues-summary.json';
  let pretty = true;
  let includeChoices = true;
  let markdownOptIn = false;
  let markdownOutputPath = null;

  for (const arg of args) {
    if (arg.startsWith('--out=')) {
      outputPath = arg.slice('--out='.length).trim();
    } else if (arg === '--compact') {
      pretty = false;
    } else if (arg === '--no-choices') {
      includeChoices = false;
    } else if (arg === '--markdown') {
      markdownOptIn = true;
    } else if (arg.startsWith('--markdown-out=')) {
      markdownOptIn = true;
      markdownOutputPath = arg.slice('--markdown-out='.length).trim();
    }
  }

  const summary = buildAct2BranchDialogueSummary({ includeChoices });
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  await writeAct2BranchDialogueSummary(resolvedOutput, { pretty, summary });

  let markdownResolved = null;
  if (markdownOptIn) {
    const defaultMarkdownPath = deriveMarkdownPath(outputPath);
    markdownResolved = path.resolve(
      process.cwd(),
      markdownOutputPath && markdownOutputPath.length > 0
        ? markdownOutputPath
        : defaultMarkdownPath
    );
    await writeAct2BranchDialogueMarkdown(markdownResolved, { summary });
  }

  const suffix = markdownResolved ? ` (Markdown: ${markdownResolved})` : '';
  console.log(
    `[exportAct2BranchDialogues] Wrote ${summary.dialogues.length} dialogues to ${resolvedOutput}${suffix}`
  );
}

function deriveMarkdownPath(jsonPath) {
  if (typeof jsonPath !== 'string' || jsonPath.length === 0) {
    return 'telemetry-artifacts/act2-branch-dialogues-summary.md';
  }
  const hasJsonExtension = jsonPath.toLowerCase().endsWith('.json');
  if (hasJsonExtension) {
    return jsonPath.slice(0, -5) + '.md';
  }
  return `${jsonPath}.md`;
}

main().catch((error) => {
  console.error('[exportAct2BranchDialogues] Failed to export dialogue summary:', error);
  process.exitCode = 1;
});
