#!/usr/bin/env node
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ALLOWED_APPROVAL_STATUSES = new Set(['pending', 'approved', 'changes_requested', 'rejected']);

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.manifestOnly) {
    const manifestPath = resolveCwd(options.manifestOnly);
    await assertFileExists(manifestPath, '--manifest-only');
    await updateManifestApprovals(manifestPath, options);
    console.log(
      `[bundleAct2BranchDialoguesForReview] Updated approvals for ${manifestPath}`
    );
    return;
  }

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

  const packageCreatedAt = new Date().toISOString();
  const manifest = {
    packageCreatedAt,
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

  manifest.approvals = seedApprovals({
    manifest,
    options,
    referenceTimestamp: packageCreatedAt,
  });

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
    approverTokens: [],
    approvalTokens: [],
    manifestOnly: null,
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
    } else if (arg.startsWith('--approver=')) {
      const token = arg.slice('--approver='.length).trim();
      if (token.length > 0) {
        options.approverTokens.push(token);
      }
    } else if (arg.startsWith('--mark-approval=')) {
      const token = arg.slice('--mark-approval='.length).trim();
      if (token.length > 0) {
        options.approvalTokens.push(token);
      }
    } else if (arg.startsWith('--manifest-only=')) {
      options.manifestOnly = arg.slice('--manifest-only='.length).trim();
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

async function updateManifestApprovals(manifestPath, options) {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const referenceTimestamp =
    typeof manifest?.packageCreatedAt === 'string' ? manifest.packageCreatedAt : new Date().toISOString();
  manifest.approvals = seedApprovals({
    manifest,
    options,
    referenceTimestamp,
    existingApprovals: manifest.approvals,
    now: new Date().toISOString(),
  });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

function seedApprovals({ manifest, options, referenceTimestamp, existingApprovals = [], now = referenceTimestamp }) {
  const approvals = Array.isArray(existingApprovals)
    ? existingApprovals.map((entry) => ({ ...entry }))
    : [];

  for (const token of options.approverTokens ?? []) {
    const entry = parseApprovalToken(token, { defaultStatus: 'pending' });
    if (!entry) {
      continue;
    }
    upsertApproval(approvals, {
      ...entry,
      requestedAt: referenceTimestamp,
      updatedAt: entry.status !== 'pending' ? referenceTimestamp : null,
    });
  }

  for (const token of options.approvalTokens ?? []) {
    const entry = parseApprovalToken(token, { defaultStatus: 'approved' });
    if (!entry) {
      continue;
    }
    upsertApproval(approvals, {
      ...entry,
      requestedAt: referenceTimestamp,
      updatedAt: now,
    });
  }

  approvals.sort((a, b) => {
    const nameA = (a.reviewer ?? '').toLowerCase();
    const nameB = (b.reviewer ?? '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return approvals;
}

function parseApprovalToken(raw, { defaultStatus }) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const parts = raw.split(':').map((part) => part.trim());
  if (parts.length === 0 || parts[0].length === 0) {
    return null;
  }
  const [reviewer, role, statusOrNote, maybeNote] = parts;
  let status = defaultStatus ?? 'pending';
  let notes = null;

  if (parts.length === 2) {
    status = defaultStatus ?? 'pending';
  } else if (parts.length === 3) {
    if (ALLOWED_APPROVAL_STATUSES.has(statusOrNote.toLowerCase())) {
      status = statusOrNote.toLowerCase();
    } else {
      status = defaultStatus ?? 'pending';
      notes = statusOrNote.length > 0 ? statusOrNote : null;
    }
  } else if (parts.length >= 4) {
    status = ALLOWED_APPROVAL_STATUSES.has(statusOrNote.toLowerCase())
      ? statusOrNote.toLowerCase()
      : defaultStatus ?? 'pending';
    notes = maybeNote && maybeNote.length > 0 ? maybeNote : null;
  }

  if (!ALLOWED_APPROVAL_STATUSES.has(status)) {
    status = defaultStatus ?? 'pending';
  }

  return {
    reviewer,
    role: role && role.length > 0 ? role : null,
    status,
    notes,
  };
}

function upsertApproval(approvals, entry) {
  if (!entry?.reviewer) {
    return;
  }

  const index = approvals.findIndex(
    (existing) =>
      existing?.reviewer === entry.reviewer &&
      (!entry.role || !existing.role || existing.role === entry.role)
  );

  if (index === -1) {
    approvals.push({
      reviewer: entry.reviewer,
      role: entry.role ?? null,
      status: entry.status ?? 'pending',
      requestedAt: entry.requestedAt ?? entry.updatedAt ?? new Date().toISOString(),
      updatedAt:
        entry.status && entry.status !== 'pending'
          ? entry.updatedAt ?? new Date().toISOString()
          : null,
      notes: entry.notes ?? null,
    });
    return;
  }

  const existing = approvals[index] ?? {};
  const status = entry.status ?? existing.status ?? 'pending';
  approvals[index] = {
    reviewer: entry.reviewer,
    role: entry.role ?? existing.role ?? null,
    status,
    requestedAt: existing.requestedAt ?? entry.requestedAt ?? entry.updatedAt ?? new Date().toISOString(),
    updatedAt:
      status !== 'pending'
        ? entry.updatedAt ?? new Date().toISOString()
        : null,
    notes: entry.notes ?? existing.notes ?? null,
  };
}
