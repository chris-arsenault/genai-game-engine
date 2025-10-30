#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      args._.push(token);
      continue;
    }

    const trimmed = token.replace(/^-+/, '');
    if (!trimmed) {
      continue;
    }

    const [key, inline] = trimmed.split('=', 2);
    if (inline !== undefined) {
      args[key] = inline;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => toArray(entry));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [value];
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    segmentId: item.segmentId ?? item.id ?? null,
    status: item.status ?? 'unknown',
    severity: item.severity ?? null,
    notes: item.notes ?? item.comment ?? null,
    requestedBy: item.requestedBy ?? item.reviewer ?? null,
    attachments: toArray(item.attachments),
    reference: item.reference ?? null,
    updatedAt: item.updatedAt ?? item.recordedAt ?? null,
  };
}

function normalizeFeedback(raw, defaults = {}) {
  if (!raw) {
    throw new Error('Feedback payload is empty');
  }

  if (Array.isArray(raw)) {
    return {
      packetId: defaults.packetId ?? null,
      label: defaults.label ?? null,
      receivedAt: defaults.receivedAt ?? new Date().toISOString(),
      reviewer: defaults.reviewer ?? null,
      items: raw.map((item) => normalizeItem(item)).filter(Boolean),
    };
  }

  if (typeof raw === 'object') {
    const items = Array.isArray(raw.items) ? raw.items : raw.entries;
    return {
      packetId: raw.packetId ?? defaults.packetId ?? null,
      label: raw.label ?? defaults.label ?? null,
      receivedAt: raw.receivedAt ?? raw.reviewedAt ?? defaults.receivedAt ?? new Date().toISOString(),
      reviewer: raw.reviewer ?? raw.reviewedBy ?? defaults.reviewer ?? null,
      items: Array.isArray(items)
        ? items.map((item) => normalizeItem(item)).filter(Boolean)
        : [],
    };
  }

  throw new Error('Unsupported feedback payload');
}

function summarizeStatuses(entries) {
  const totals = {};
  for (const entry of entries) {
    for (const item of entry.items ?? []) {
      const key = (item.status ?? 'unknown').toLowerCase();
      totals[key] = (totals[key] ?? 0) + 1;
    }
  }
  return totals;
}

function buildMarkdown(entries, stats, updatedIso) {
  const lines = [];
  lines.push('# RenderOps Feedback Log');
  lines.push('');
  lines.push(`Updated: ${updatedIso}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total packets: ${entries.length}`);
  const statusKeys = Object.keys(stats);
  if (statusKeys.length === 0) {
    lines.push('- No feedback items recorded.');
  } else {
    for (const key of statusKeys.sort()) {
      lines.push(`- ${key}: ${stats[key]}`);
    }
  }
  lines.push('');

  for (const entry of entries) {
    lines.push(`## Packet: ${entry.label ?? entry.packetId ?? 'unknown'}`);
    lines.push('');
    lines.push(`- Packet ID: ${entry.packetId ?? 'n/a'}`);
    lines.push(`- Reviewer: ${entry.reviewer ?? 'n/a'}`);
    lines.push(`- Received: ${entry.receivedAt ?? 'n/a'}`);
    lines.push(`- Items: ${entry.items.length}`);
    lines.push('');

    if (entry.items.length === 0) {
      lines.push('No actionable feedback recorded for this packet.');
      lines.push('');
      continue;
    }

    lines.push('| Segment | Status | Severity | Notes | Requested By |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const item of entry.items) {
      const segment = item.segmentId ?? '—';
      const status = item.status ?? '—';
      const severity = item.severity ?? '—';
      const notes = item.notes ? item.notes.replace(/\n/g, ' ') : '—';
      const requestedBy = item.requestedBy ?? '—';
      lines.push(`| ${segment} | ${status} | ${severity} | ${notes} | ${requestedBy} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export async function importRenderOpsFeedback({
  inputPath,
  feedbackData,
  reportsDir = path.join('reports', 'art'),
  packetId,
  label,
  reviewer,
  logger = console,
} = {}) {
  let rawFeedback = feedbackData ?? null;

  if (!rawFeedback) {
    if (!inputPath) {
      throw new Error('No input provided. Use --input to specify a feedback JSON file.');
    }
    const resolvedInput = path.resolve(inputPath);
    const payload = await fs.readFile(resolvedInput, 'utf8');
    rawFeedback = JSON.parse(payload);
  }

  const normalized = normalizeFeedback(rawFeedback, {
    packetId,
    label,
    reviewer,
  });

  if (!Array.isArray(normalized.items) || normalized.items.length === 0) {
    logger?.warn?.('[import-renderops-feedback] No feedback items found in payload.');
  }

  const resolvedReportsDir = path.resolve(reportsDir);
  await fs.mkdir(resolvedReportsDir, { recursive: true });

  const jsonPath = path.join(resolvedReportsDir, 'renderops-feedback.json');
  const markdownPath = path.join(resolvedReportsDir, 'renderops-feedback.md');

  let existing = { entries: [] };
  try {
    const previous = await fs.readFile(jsonPath, 'utf8');
    existing = JSON.parse(previous);
    if (!Array.isArray(existing.entries)) {
      existing.entries = [];
    }
  } catch {
    existing = { entries: [] };
  }

  const mergedEntries = [normalized];
  for (const entry of existing.entries) {
    if (entry.packetId === normalized.packetId) {
      continue;
    }
    mergedEntries.push(entry);
  }

  mergedEntries.sort((a, b) => {
    const timeA = new Date(a.receivedAt ?? 0).getTime();
    const timeB = new Date(b.receivedAt ?? 0).getTime();
    return timeB - timeA;
  });

  const stats = summarizeStatuses(mergedEntries);
  const updatedAt = new Date().toISOString();

  const output = {
    updatedAt,
    entries: mergedEntries,
    totalsByStatus: stats,
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const markdown = buildMarkdown(mergedEntries, stats, updatedAt);
  await fs.writeFile(markdownPath, markdown, 'utf8');

  logger?.info?.('[import-renderops-feedback] Feedback imported.', {
    packetId: normalized.packetId,
    label: normalized.label,
    items: normalized.items.length,
    output: jsonPath,
  });

  return {
    jsonPath,
    markdownPath,
    entries: mergedEntries,
    stats,
  };
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));

  try {
    await importRenderOpsFeedback({
      inputPath: args.input ?? args.i ?? args._[0],
      reportsDir: args.reportsDir ?? args.output ?? path.join('reports', 'art'),
      packetId: args.packetId ?? args.packet ?? null,
      label: args.label ?? null,
      reviewer: args.reviewer ?? null,
    });
  } catch (error) {
    console.error('[import-renderops-feedback] Failed to import feedback:', error);
    process.exitCode = 1;
  }
}

if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  path.basename(process.argv[1] || '') === 'importRenderOpsFeedback.js' &&
  !process.env.JEST_WORKER_ID
) {
  runCli();
}
