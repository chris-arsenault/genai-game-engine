#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildAct2BranchDialogueSummary,
  compareAct2BranchDialogueSummaries,
  writeAct2BranchDialogueSummary,
  writeAct2BranchDialogueMarkdown,
  writeAct2BranchDialogueChangeReport,
} from '../../src/game/tools/Act2BranchDialogueExporter.js';

async function main() {
  const args = process.argv.slice(2);
  let outputPath = 'telemetry-artifacts/act2-branch-dialogues-summary.json';
  let pretty = true;
  let includeChoices = true;
  let markdownOptIn = false;
  let markdownOutputPath = null;
  let baselinePath = null;
  let changeReportOutputPath = null;

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
    } else if (arg.startsWith('--baseline=')) {
      baselinePath = arg.slice('--baseline='.length).trim();
    } else if (arg.startsWith('--changes-out=')) {
      changeReportOutputPath = arg.slice('--changes-out='.length).trim();
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

  let changeReportResolved = null;
  if (baselinePath && baselinePath.length > 0) {
    const resolvedBaseline = path.resolve(process.cwd(), baselinePath);
    let previousSummary = null;
    try {
      const raw = await readFile(resolvedBaseline, 'utf8');
      previousSummary = JSON.parse(raw);
    } catch (error) {
      console.warn(
        `[exportAct2BranchDialogues] Unable to load baseline summary at ${resolvedBaseline}; treating current export as initial drop.`,
        error
      );
    }

    const changeReport = compareAct2BranchDialogueSummaries(summary, previousSummary);
    changeReportResolved = path.resolve(
      process.cwd(),
      changeReportOutputPath && changeReportOutputPath.length > 0
        ? changeReportOutputPath
        : deriveChangesPath(outputPath)
    );
    await writeAct2BranchDialogueChangeReport(changeReportResolved, { report: changeReport });

    console.log(
      `[exportAct2BranchDialogues] Change summary → ${changeReport.changedDialogues.length} modified, ${changeReport.addedDialogues.length} added, ${changeReport.removedDialogues.length} removed dialogues`
    );
  }

  const suffix = markdownResolved ? ` (Markdown: ${markdownResolved})` : '';
  const changeSuffix = changeReportResolved ? ` (Changes: ${changeReportResolved})` : '';
  console.log(
    `[exportAct2BranchDialogues] Wrote ${summary.dialogues.length} dialogues to ${resolvedOutput}${suffix}${changeSuffix}`
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

function deriveChangesPath(jsonPath) {
  if (typeof jsonPath !== 'string' || jsonPath.length === 0) {
    return 'telemetry-artifacts/act2-branch-dialogues-changes.json';
  }
  const hasJsonExtension = jsonPath.toLowerCase().endsWith('.json');
  if (hasJsonExtension) {
    return jsonPath.slice(0, -5) + '-changes.json';
  }
  return `${jsonPath}-changes.json`;
}

main().catch((error) => {
  console.error('[exportAct2BranchDialogues] Failed to export dialogue summary:', error);
  process.exitCode = 1;
});
