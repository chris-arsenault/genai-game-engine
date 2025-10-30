#!/usr/bin/env node
/**
 * trackBespokeDeliverables
 *
 * Updates assets/images/requests.json with bespoke art progress for a given week.
 * Consumes placeholder-replacement schedule + bespoke status payloads and
 * writes a progress report under reports/art/week{N}-bespoke-progress.json.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

function parseArgs(argv) {
  const options = {
    week: 1,
    updatesPath: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--week=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(value) && value > 0) {
        options.week = value;
      }
    } else if (arg === '--week') {
      continue;
    } else if (arg.startsWith('--updates=')) {
      options.updatesPath = arg.split('=')[1];
    } else if (arg === '--updates') {
      continue;
    }
  }

  return options;
}

function loadJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createStatusHistoryEntry(status, payload) {
  return {
    status,
    recordedAt: new Date().toISOString(),
    context: payload.reviewNotes || payload.notes || null,
    receivedOn: payload.receivedOn ?? null,
    approvedOn: payload.approvedOn ?? null,
  };
}

function applyUpdate(entry, update) {
  const result = { ...entry };

  if (!Array.isArray(result.statusHistory)) {
    result.statusHistory = [];
  }

  if (update.status) {
    result.status = update.status;
    result.statusHistory.push(createStatusHistoryEntry(update.status, update));
  }

  if (update.artist) {
    result.artist = update.artist;
  }

  if (update.license) {
    result.license = update.license;
  }

  if (update.deliverablePath) {
    result.deliverablePath = update.deliverablePath;
  }

  if (update.receivedOn) {
    result.bespokeReceivedOn = update.receivedOn;
  }

  if (update.approvedOn) {
    result.bespokeApprovedOn = update.approvedOn;
  }

  if (update.reviewedBy) {
    result.bespokeReviewedBy = update.reviewedBy;
  }

  if (update.reviewNotes || update.notes) {
    const note = update.reviewNotes ?? update.notes;
    if (note) {
      const existing = Array.isArray(result.bespokeNotes)
        ? result.bespokeNotes
        : result.bespokeNotes
        ? [result.bespokeNotes]
        : [];
      existing.push(note);
      result.bespokeNotes = existing;
    }
  }

  if (update.externalReference) {
    result.bespokeReference = update.externalReference;
  }

  result.updatedAt = new Date().toISOString();
  return result;
}

function summariseStatuses(entries, weekSet) {
  const summary = {};
  for (const entry of entries) {
    if (!weekSet.has(entry.id)) {
      continue;
    }
    const status = entry.status || 'unknown';
    summary[status] = (summary[status] ?? 0) + 1;
  }
  return summary;
}

function main() {
  const { week, updatesPath } = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

  const requestsPath = path.resolve(projectRoot, 'assets/images/requests.json');
  const schedulePath = path.resolve(
    projectRoot,
    'reports/art/placeholder-replacement-schedule.json'
  );

  const resolvedUpdatesPath =
    updatesPath && updatesPath.length
      ? path.resolve(projectRoot, updatesPath)
      : path.resolve(projectRoot, `reports/art/bespoke-week${week}-tracking.json`);

  const requests = loadJson(requestsPath);
  const schedule = loadJson(schedulePath);
  const updatesPayload = loadJson(resolvedUpdatesPath);

  const weekEntry = Array.isArray(schedule.weeks)
    ? schedule.weeks.find((entry) => entry.weekNumber === week)
    : null;

  if (!weekEntry) {
    console.error(`No schedule week ${week} found in placeholder-replacement schedule.`);
    process.exit(1);
  }

  const plannedIds = new Set(
    (weekEntry.plannedAssets || []).map((asset) => asset.id)
  );

  const updates = Array.isArray(updatesPayload.updates) ? updatesPayload.updates : [];

  const applied = [];
  const missing = [];

  for (const update of updates) {
    if (!update?.id) {
      continue;
    }
    if (!plannedIds.has(update.id)) {
      missing.push(update.id);
      continue;
    }

    const index = requests.findIndex((entry) => entry.id === update.id);
    if (index === -1) {
      missing.push(update.id);
      continue;
    }

    const original = requests[index];
    const next = applyUpdate(original, update);
    requests[index] = next;
    applied.push({
      id: update.id,
      status: next.status,
      artist: next.artist ?? null,
      approvedOn: next.bespokeApprovedOn ?? null,
      receivedOn: next.bespokeReceivedOn ?? null,
    });
  }

  fs.writeFileSync(requestsPath, `${JSON.stringify(requests, null, 2)}\n`, 'utf8');

  const summary = {
    weekNumber: week,
    generatedAt: new Date().toISOString(),
    updatesApplied: applied.length,
    plannedCount: plannedIds.size,
    statusBreakdown: summariseStatuses(requests, plannedIds),
    applied,
    skipped: missing,
  };

  const reportPath = path.resolve(
    projectRoot,
    `reports/art/week${week}-bespoke-progress.json`
  );
  ensureDirectoryExists(reportPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    `Updated ${applied.length} bespoke deliverable${applied.length === 1 ? '' : 's'} for week ${week}.`
  );
  if (missing.length) {
    console.warn(`Skipped ${missing.length} deliverable(s) not in week ${week}: ${missing.join(', ')}`);
  }
  console.log(`Progress report written to ${path.relative(projectRoot, reportPath)}`);
}

main();
