#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { importRenderOpsFeedback } from './importRenderOpsFeedback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEMETRY_ROOT = path.resolve(process.cwd(), 'reports', 'telemetry', 'renderops-approvals');
const INDEX_PATH = path.join(TELEMETRY_ROOT, 'index.json');
const SUMMARY_DIR = path.resolve(process.cwd(), 'reports', 'art');
const SUMMARY_PATH = path.join(SUMMARY_DIR, 'renderops-approval-summary.json');

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

async function readJson(filePath, defaultValue = null) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, payload, 'utf8');
}

async function listJobFiles(rootDir) {
  const results = [];
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        results.push(entryPath);
      }
    }
  }
  await walk(rootDir);
  return results.sort();
}

function summarizeActionable(actionableSegments = []) {
  const counts = {};
  for (const segment of actionableSegments) {
    const status = (segment?.status ?? 'unknown').toLowerCase();
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const verbose = Boolean(args.verbose);
  const autoImport = Boolean(args['auto-import'] ?? args.autoImport);

  let index = await readJson(INDEX_PATH, { jobs: {} });
  if (!index || typeof index !== 'object' || !index.jobs) {
    index = { jobs: {} };
  }

  await fs.mkdir(SUMMARY_DIR, { recursive: true });
  await fs.mkdir(TELEMETRY_ROOT, { recursive: true });

  const jobFiles = await listJobFiles(TELEMETRY_ROOT);
  const summaryEntries = [];
  const newJobs = [];
  const jobStatusTotals = {};
  const queueTotals = {};
  const actionableTotals = {};

  for (const jobPath of jobFiles) {
    let job;
    try {
      job = await readJson(jobPath);
    } catch (error) {
      console.warn(`[monitorRenderOpsApprovals] Failed to parse ${jobPath}:`, error.message);
      continue;
    }

    if (!job || typeof job !== 'object') {
      continue;
    }

    const jobId = job.jobId || path.basename(jobPath, '.json');
    const processedAt = job.processedAt || job.updatedAt || job.completedAt || null;
    const actionable = Array.isArray(job.actionableSegments) ? job.actionableSegments : [];
    const statusSummary = summarizeActionable(actionable);
    const approvedCount = statusSummary.approved ?? 0;
    const pendingCount = Object.entries(statusSummary).reduce((acc, [status, count]) => {
      if (status === 'approved') {
        return acc;
      }
      return acc + count;
    }, 0);

    const entry = {
      jobId,
      source: jobPath,
      feedbackLogPath: job.feedbackLogPath ?? null,
      queue: job.queue ?? null,
      status: job.status ?? null,
      createdAt: job.createdAt ?? null,
      processedAt,
      actionableSegments: actionable.length,
      approvedSegments: approvedCount,
      pendingSegments: pendingCount,
      packetLabel: job.packet?.label ?? null,
      packetId: job.packet?.id ?? null,
      notes: job.packet?.instructions ?? [],
      statusBreakdown: statusSummary,
    };

    summaryEntries.push(entry);

    const normalizedStatus = (entry.status ?? 'unknown').toLowerCase();
    jobStatusTotals[normalizedStatus] = (jobStatusTotals[normalizedStatus] ?? 0) + 1;

    const queueKey = entry.queue ?? 'unassigned';
    queueTotals[queueKey] = (queueTotals[queueKey] ?? 0) + 1;

    for (const [status, count] of Object.entries(statusSummary)) {
      const normalized = status.toLowerCase();
      actionableTotals[normalized] = (actionableTotals[normalized] ?? 0) + count;
    }

    const tracked = index.jobs[jobId];
    if (!tracked || tracked.processedAt !== processedAt) {
      newJobs.push(entry);
      if (autoImport && typeof job.feedbackLogPath === 'string' && job.feedbackLogPath.length > 0) {
        const resolvedFeedbackPath = path.resolve(job.feedbackLogPath);
        try {
          await importRenderOpsFeedback({ inputPath: resolvedFeedbackPath, logger: console });
          if (verbose) {
            console.log(`[monitorRenderOpsApprovals] Imported feedback for ${jobId} from ${resolvedFeedbackPath}`);
          }
        } catch (error) {
          console.warn(`[monitorRenderOpsApprovals] Failed to import feedback for ${jobId}:`, error.message);
        }
      }
      index.jobs[jobId] = {
        source: jobPath,
        processedAt,
        lastCheckedAt: new Date().toISOString(),
        status: job.status ?? null,
      };
    } else {
      index.jobs[jobId].lastCheckedAt = new Date().toISOString();
    }
  }

  const totalPendingSegments = Object.entries(actionableTotals).reduce((acc, [status, count]) => {
    if (status === 'approved') {
      return acc;
    }
    return acc + count;
  }, 0);
  const totalApprovedSegments = actionableTotals.approved ?? 0;

  const summaryPayload = {
    generatedAt: new Date().toISOString(),
    totalJobs: summaryEntries.length,
    newJobs: newJobs.length,
    jobStatusTotals,
    queueTotals,
    actionableSegmentsByStatus: actionableTotals,
    totalPendingSegments,
    totalApprovedSegments,
    entries: summaryEntries.sort((a, b) => {
      const left = a.processedAt || a.createdAt || '';
      const right = b.processedAt || b.createdAt || '';
      return right.localeCompare(left);
    }),
  };

  await writeJson(SUMMARY_PATH, summaryPayload);

  await writeJson(INDEX_PATH, index);

  if (verbose) {
    if (summaryEntries.length === 0) {
      console.log('[monitorRenderOpsApprovals] No RenderOps approval telemetry files found.');
    } else {
      console.log('[monitorRenderOpsApprovals] Jobs processed:');
      for (const entry of summaryEntries) {
        console.log(`- ${entry.jobId}: status=${entry.status}, pending=${entry.pendingSegments}, approved=${entry.approvedSegments}`);
      }
      console.log('[monitorRenderOpsApprovals] Actionable segments by status:', actionableTotals);
      console.log('[monitorRenderOpsApprovals] Queue totals:', queueTotals);
      console.log('[monitorRenderOpsApprovals] Job status totals:', jobStatusTotals);
    }
  }

  if (newJobs.length > 0) {
    console.log(`[monitorRenderOpsApprovals] ${newJobs.length} new job(s) detected.`);
    if (!args.quiet) {
      for (const entry of newJobs) {
        console.log(`  • ${entry.jobId} (${entry.status ?? 'unknown'}) — ${entry.pendingSegments} pending actionable segment(s)`);
      }
      console.log('Run `node scripts/art/importRenderOpsFeedback.js --input <feedback.json>` for new actionable segments.');
    }
  } else if (!args.quiet) {
    console.log('[monitorRenderOpsApprovals] No new RenderOps approvals detected.');
  }
  return summaryPayload;
}

if (import.meta.url === `file://${__filename}`) {
  main().catch((error) => {
    console.error('[monitorRenderOpsApprovals] Unhandled error:', error);
    process.exitCode = 1;
  });
}

export { summarizeActionable, main };
