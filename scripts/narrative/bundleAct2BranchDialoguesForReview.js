#!/usr/bin/env node
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const summaryPath = resolveCwd(options.summary);
  await assertFileExists(summaryPath, '--summary');

  const markdownPath = options.markdown ? resolveCwd(options.markdown) : null;
  if (markdownPath) {
    await assertFileExists(markdownPath, '--markdown');
  }

  const changesPath = options.changes ? resolveCwd(options.changes) : null;
  if (changesPath) {
    await assertFileExists(changesPath, '--changes');
  }

  const summaryData = JSON.parse(await readFile(summaryPath, 'utf8'));
  const timestamp = options.label ?? createTimestampLabel();
  const outputDir = resolveCwd(
    options.outDir
      ? options.outDir
      : path.join('telemetry-artifacts/review/act2-branch-dialogues', timestamp)
  );

  await mkdir(outputDir, { recursive: true });

  const copiedFiles = [];

  const summaryDest = path.join(outputDir, path.basename(summaryPath));
  await copyFile(summaryPath, summaryDest);
  copiedFiles.push({
    role: 'summary',
    source: summaryPath,
    destination: summaryDest,
  });

  let markdownDest = null;
  if (markdownPath) {
    markdownDest = path.join(outputDir, path.basename(markdownPath));
    await copyFile(markdownPath, markdownDest);
    copiedFiles.push({
      role: 'markdown',
      source: markdownPath,
      destination: markdownDest,
    });
  }

  let changesDest = null;
  if (changesPath) {
    changesDest = path.join(outputDir, path.basename(changesPath));
    await copyFile(changesPath, changesDest);
    copiedFiles.push({
      role: 'change-report',
      source: changesPath,
      destination: changesDest,
    });
  }

  const manifest = {
    packageCreatedAt: new Date().toISOString(),
    label: timestamp,
    reviewerInstructions:
      'Review Markdown + change report, confirm no late edits, log approvals in reviewManifest.notes.',
    dialogueCount: Array.isArray(summaryData?.dialogues) ? summaryData.dialogues.length : null,
    files: copiedFiles.map((entry) => ({
      role: entry.role,
      filename: path.basename(entry.destination),
      absolutePath: entry.destination,
    })),
    approvals: [],
    notes: [],
  };

  const manifestPath = path.join(outputDir, 'review-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const checklist = buildChecklist(markdownDest && path.basename(markdownDest), changesDest && path.basename(changesDest));
  const checklistPath = path.join(outputDir, 'REVIEW_CHECKLIST.md');
  await writeFile(checklistPath, checklist, 'utf8');

  console.log(
    `[bundleAct2BranchDialoguesForReview] Packaged Act 2 bundle for review → ${outputDir}`
  );
}

function parseArgs(args) {
  const options = {
    summary: 'telemetry-artifacts/act2-branch-dialogues-summary.json',
    markdown: null,
    changes: null,
    outDir: null,
    label: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--summary=')) {
      options.summary = arg.slice('--summary='.length).trim();
    } else if (arg.startsWith('--markdown=')) {
      options.markdown = arg.slice('--markdown='.length).trim();
    } else if (arg.startsWith('--changes=')) {
      options.changes = arg.slice('--changes='.length).trim();
    } else if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.slice('--out-dir='.length).trim();
    } else if (arg.startsWith('--label=')) {
      options.label = sanitizeLabel(arg.slice('--label='.length).trim());
    }
  }

  return options;
}

function resolveCwd(targetPath) {
  return path.resolve(process.cwd(), targetPath);
}

async function assertFileExists(targetPath, flagName) {
  try {
    await access(targetPath);
  } catch {
    throw new Error(`[bundleAct2BranchDialoguesForReview] ${flagName} file not found at ${targetPath}`);
  }
}

function createTimestampLabel() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const y = now.getUTCFullYear();
  const m = pad(now.getUTCMonth() + 1);
  const d = pad(now.getUTCDate());
  const h = pad(now.getUTCHours());
  const min = pad(now.getUTCMinutes());
  const s = pad(now.getUTCSeconds());
  return `${y}${m}${d}-${h}${min}${s}Z`;
}

function sanitizeLabel(raw) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  return raw.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function buildChecklist(markdownFilename, changesFilename) {
  const lines = [
    '# Act 2 Branch Dialogue Review Checklist',
    '',
    '- [ ] Confirm Markdown summary renders correctly and matches in-game branching (file: ' +
      (markdownFilename ?? 'N/A') +
      ').',
    '- [ ] Compare change report against prior approvals and flag unexpected diffs (file: ' +
      (changesFilename ?? 'N/A') +
      ').',
    '- [ ] Capture reviewer names, date, and approval notes in `review-manifest.json`.',
    '- [ ] Send approvals to localization + VO to unblock recording/localization.',
  ];
  return lines.join('\n');
}

main().catch((error) => {
  console.error(
    '[bundleAct2BranchDialoguesForReview] Failed to package Act 2 branch dialogue bundle:',
    error
  );
  process.exitCode = 1;
});
