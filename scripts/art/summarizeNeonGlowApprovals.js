#!/usr/bin/env node

/**
 * Summarize neon signage & glow-pass asset approvals from the image manifest.
 *
 * Usage:
 *   node scripts/art/summarizeNeonGlowApprovals.js [--outDir=reports/art]
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const KEYWORDS = ['neon', 'glow', 'signage', 'memory parlor', 'crossroads'];
const PENDING_STATUSES = new Set(['bespoke-pending', 'bespoke-in-review']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.resolve(PROJECT_ROOT, 'assets/images/requests.json');

const OUTPUT_DIR_DEFAULT = path.resolve(PROJECT_ROOT, 'reports/art');
const OUTPUT_BASENAME = 'neon-glow-approval-status';

function toLower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function collectTextFields(item) {
  const fields = [];
  if (item.id) fields.push(item.id);
  if (item.title) fields.push(item.title);
  if (item.usage) fields.push(item.usage);
  if (item.notes) fields.push(item.notes);
  if (Array.isArray(item.statusHistory)) {
    for (const history of item.statusHistory) {
      if (history?.context) {
        fields.push(history.context);
      }
    }
  }
  return fields.join(' ');
}

function matchesFocus(item) {
  const haystack = toLower(collectTextFields(item));
  return KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function detectApprovalSignals(text) {
  const normalized = text.replace(/render\s?ops/gi, 'renderops');
  const lower = normalized.toLowerCase();

  const containsPending = lower.includes('pending') || lower.includes('awaiting');
  const containsApproval = lower.includes('approval') || lower.includes('approve');

  const narrativePending =
    lower.includes('narrative') && (containsPending || containsApproval);
  const renderOpsPending =
    lower.includes('renderops') && (containsPending || containsApproval);

  return {
    narrativePending,
    renderOpsPending,
  };
}

function deriveLastStatusEntry(item) {
  if (!Array.isArray(item.statusHistory) || item.statusHistory.length === 0) {
    return null;
  }
  return item.statusHistory[item.statusHistory.length - 1];
}

function sanitizeNotes(value) {
  if (!value) {
    return '';
  }
  return String(value).replace(/\|/g, '\\|').trim();
}

function formatApprovals(flags) {
  const approvals = [];
  if (flags.narrativePending) approvals.push('Narrative');
  if (flags.renderOpsPending) approvals.push('RenderOps');
  return approvals.length ? approvals.join(', ') : '—';
}

function statusOrder(status) {
  switch (status) {
    case 'bespoke-pending':
      return 0;
    case 'bespoke-in-review':
      return 1;
    case 'bespoke-approved':
      return 2;
    case 'placeholder-generated':
    case 'derivative-generated':
      return 3;
    default:
      return 4;
  }
}

function buildSummary(entries) {
  const summary = {
    generatedAt: new Date().toISOString(),
    totalTracked: entries.length,
    statusBreakdown: {},
    approvalsPending: {
      narrative: 0,
      renderOps: 0,
    },
    items: [],
  };

  for (const entry of entries) {
    summary.statusBreakdown[entry.status] =
      (summary.statusBreakdown[entry.status] ?? 0) + 1;
    if (entry.needsNarrativeApproval) {
      summary.approvalsPending.narrative += 1;
    }
    if (entry.needsRenderOpsApproval) {
      summary.approvalsPending.renderOps += 1;
    }
    summary.items.push(entry);
  }

  return summary;
}

function renderMarkdown(summary) {
  const lines = [];
  lines.push('# Neon Glow Approval Status');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total tracked neon/glow assets: ${summary.totalTracked}`);
  const pendingStatuses = Object.entries(summary.statusBreakdown)
    .filter(([status]) => PENDING_STATUSES.has(status))
    .reduce((total, [, count]) => total + count, 0);
  lines.push(`- Pending/in review count: ${pendingStatuses}`);
  lines.push(
    `- Narrative approvals pending: ${summary.approvalsPending.narrative}`
  );
  lines.push(
    `- RenderOps approvals pending: ${summary.approvalsPending.renderOps}`
  );
  lines.push('');
  lines.push('## Asset Details');
  lines.push(
    '| ID | Status | Last Updated | Approvals Needed | Latest Notes |'
  );
  lines.push('| --- | --- | --- | --- | --- |');

  for (const item of summary.items) {
    const approvals = [];
    if (item.needsNarrativeApproval) approvals.push('Narrative');
    if (item.needsRenderOpsApproval) approvals.push('RenderOps');
    const approvalsCell = approvals.length ? approvals.join(', ') : '—';
    lines.push(
      `| ${item.id} | ${item.status} | ${item.lastUpdated ?? '—'} | ${approvalsCell} | ${sanitizeNotes(item.latestContext || item.notes)} |`
    );
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const outDirArg = process.argv
    .find((arg) => arg.startsWith('--outDir='))
    ?.split('=')[1];
  const outputDir = outDirArg
    ? path.resolve(PROJECT_ROOT, outDirArg)
    : OUTPUT_DIR_DEFAULT;

  const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest = JSON.parse(raw);

  const focusedItems = manifest.filter(matchesFocus);

  const mapped = focusedItems.map((item) => {
    const combinedText = collectTextFields(item);
    const approvalFlags = detectApprovalSignals(combinedText);
    const lastHistory = deriveLastStatusEntry(item);
    const lastUpdated =
      lastHistory?.recordedAt ??
      item.updatedAt ??
      item.approvedOn ??
      item.receivedOn ??
      null;

    const needsNarrativeApproval =
      PENDING_STATUSES.has(item.status) && approvalFlags.narrativePending;
    const needsRenderOpsApproval =
      PENDING_STATUSES.has(item.status) && approvalFlags.renderOpsPending;

    return {
      id: item.id,
      title: item.title ?? null,
      status: item.status,
      arId: item.arId ?? null,
      scheduledWeek: item.scheduledWeek ?? null,
      deliverablePath: item.deliverablePath ?? null,
      statusHistory: Array.isArray(item.statusHistory)
        ? item.statusHistory.slice(-5)
        : [],
      notes: item.notes ?? null,
      latestContext: lastHistory?.context ?? null,
      lastUpdated,
      needsNarrativeApproval,
      needsRenderOpsApproval,
      approvalsDetected: {
        narrativePending: approvalFlags.narrativePending,
        renderOpsPending: approvalFlags.renderOpsPending,
      },
      focusMatch: KEYWORDS.filter((keyword) =>
        toLower(combinedText).includes(keyword)
      ),
    };
  });

  mapped.sort((a, b) => {
    const statusCompare = statusOrder(a.status) - statusOrder(b.status);
    if (statusCompare !== 0) {
      return statusCompare;
    }
    const aTime = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
    const bTime = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
    return bTime - aTime;
  });

  const summary = buildSummary(mapped);

  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.resolve(
    outputDir,
    `${OUTPUT_BASENAME}.json`
  );
  const markdownPath = path.resolve(
    outputDir,
    `${OUTPUT_BASENAME}.md`
  );

  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
  await fs.writeFile(markdownPath, renderMarkdown(summary), 'utf-8');

  const relativeJson = path.relative(PROJECT_ROOT, jsonPath);
  const relativeMarkdown = path.relative(PROJECT_ROOT, markdownPath);

  console.log(
    `[summarizeNeonGlowApprovals] Wrote ${mapped.length} records -> ${relativeJson}, ${relativeMarkdown}`
  );
}

main().catch((error) => {
  console.error('[summarizeNeonGlowApprovals] Failed:', error);
  process.exitCode = 1;
});
