#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import {
  buildAct3EpilogueSummary,
  writeAct3EpilogueSummary,
  writeAct3EpilogueMarkdown,
} from '../../src/game/tools/Act3EpilogueExporter.js';

async function main() {
  const args = process.argv.slice(2);
  let outputPath = 'telemetry-artifacts/act3-epilogues-summary.json';
  let pretty = true;
  let markdownOptIn = false;
  let markdownOutputPath = null;

  for (const arg of args) {
    if (arg.startsWith('--out=')) {
      outputPath = arg.slice('--out='.length).trim();
    } else if (arg === '--compact') {
      pretty = false;
    } else if (arg === '--markdown') {
      markdownOptIn = true;
    } else if (arg.startsWith('--markdown-out=')) {
      markdownOptIn = true;
      markdownOutputPath = arg.slice('--markdown-out='.length).trim();
    }
  }

  const summary = buildAct3EpilogueSummary();
  const resolvedOutput = path.resolve(process.cwd(), outputPath);
  const result = await writeAct3EpilogueSummary(resolvedOutput, {
    pretty,
    summary,
  });

  let markdownResolved = null;
  if (markdownOptIn) {
    const derivedMarkdown = deriveMarkdownPath(outputPath);
    markdownResolved = path.resolve(
      process.cwd(),
      markdownOutputPath && markdownOutputPath.length > 0 ? markdownOutputPath : derivedMarkdown
    );
    await writeAct3EpilogueMarkdown(markdownResolved, { summary });
  }

  const suffix = markdownResolved ? ` (Markdown: ${markdownResolved})` : '';
  console.log(
    `[exportAct3Epilogues] Wrote ${result.stanceCount} stances / ${result.totalBeats} beats to ${resolvedOutput}${suffix}`
  );
}

function deriveMarkdownPath(jsonPath) {
  if (typeof jsonPath !== 'string' || jsonPath.length === 0) {
    return 'telemetry-artifacts/act3-epilogues-summary.md';
  }
  if (jsonPath.toLowerCase().endsWith('.json')) {
    return jsonPath.slice(0, -5) + '.md';
  }
  return `${jsonPath}.md`;
}

main().catch((error) => {
  console.error('[exportAct3Epilogues] Failed to export epilogue summary:', error);
  process.exitCode = 1;
});
