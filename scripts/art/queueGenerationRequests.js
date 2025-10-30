#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PAYLOAD =
  path.resolve(__dirname, '../../assets/images/generation-payloads/ar-001-005.json');
const DEFAULT_MANIFEST = path.resolve(__dirname, '../../assets/images/requests.json');
const DEFAULT_QUEUE_DIR = path.resolve(__dirname, '../../assets/images/generation-queue');

function parseArgs(argv) {
  const options = {
    payload: DEFAULT_PAYLOAD,
    manifest: DEFAULT_MANIFEST,
    queueDir: DEFAULT_QUEUE_DIR,
    filter: null,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--payload=')) {
      options.payload = path.resolve(process.cwd(), arg.slice('--payload='.length));
    } else if (arg.startsWith('--manifest=')) {
      options.manifest = path.resolve(process.cwd(), arg.slice('--manifest='.length));
    } else if (arg.startsWith('--queue-dir=')) {
      options.queueDir = path.resolve(process.cwd(), arg.slice('--queue-dir='.length));
    } else if (arg.startsWith('--filter=')) {
      const raw = arg.slice('--filter='.length).trim();
      if (raw.length > 0) {
        options.filter = raw.split(',').map((value) => value.trim()).filter(Boolean);
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      options.help = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(`Usage: node scripts/art/queueGenerationRequests.js [options]

Options:
  --payload=<path>     Generation payload JSON (default assets/images/generation-payloads/ar-001-005.json)
  --manifest=<path>    Requests manifest JSON (default assets/images/requests.json)
  --queue-dir=<path>   Output directory for queued requests (default assets/images/generation-queue)
  --filter=<ids>       Comma separated AR IDs or request IDs to queue
  --dry-run            Preview queue entries without writing files
  --help               Show this message
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const payload = await readJson(options.payload);
  if (!payload || !Array.isArray(payload.requests)) {
    console.error(
      `[queueGenerationRequests] Invalid payload at ${options.payload}; expected { requests: [] }`
    );
    process.exitCode = 1;
    return;
  }

  const manifest = await readJson(options.manifest);
  if (!Array.isArray(manifest)) {
    console.error(
      `[queueGenerationRequests] Manifest at ${options.manifest} must be an array of requests`
    );
    process.exitCode = 1;
    return;
  }

  const filterSet = buildFilterSet(options.filter);
  const now = new Date().toISOString();
  const requestsToQueue = payload.requests.filter((request) =>
    shouldIncludeRequest(request, filterSet)
  );

  if (requestsToQueue.length === 0) {
    console.warn('[queueGenerationRequests] No requests matched the provided filter.');
    return;
  }

  const queueEntries = requestsToQueue.map((request) => buildQueueEntry(request, now));
  const queueFileName = buildQueueFileName(queueEntries, now);
  const queueFilePath = path.join(options.queueDir, queueFileName);

  const updatedManifest = updateManifest(manifest, queueEntries, {
    queueFileRelative: path.relative(path.dirname(options.manifest), queueFilePath),
    queuedAt: now,
  });

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          queueFile: queueFilePath,
          entries: queueEntries,
          manifestUpdates: queueEntries.map((entry) => entry.requestId),
        },
        null,
        2
      )
    );
    return;
  }

  await fs.mkdir(options.queueDir, { recursive: true });
  await writeJsonLines(queueFilePath, queueEntries);
  await fs.writeFile(options.manifest, JSON.stringify(updatedManifest, null, 2), 'utf8');

  console.log(
    `[queueGenerationRequests] Queued ${queueEntries.length} requests into ${path.relative(
      process.cwd(),
      queueFilePath
    )}`
  );
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function buildFilterSet(filter) {
  if (!filter || filter.length === 0) {
    return null;
  }
  return new Set(filter);
}

function shouldIncludeRequest(request, filterSet) {
  if (!filterSet) {
    return true;
  }
  const requestId = request?.requestId ?? null;
  const arId = request?.arId ?? null;
  if (requestId && filterSet.has(requestId)) {
    return true;
  }
  if (arId && filterSet.has(arId)) {
    return true;
  }
  return false;
}

function buildQueueEntry(request, queuedAt) {
  return {
    requestId: request.requestId,
    arId: request.arId,
    title: request.title,
    usage: request.usage,
    prompt: request.prompt,
    negativePrompt: request.negativePrompt ?? null,
    label: request.label ?? null,
    status: 'queued',
    queuedAt,
    metadata: {
      notes: request.notes ?? null,
      source: request.source ?? null,
    },
  };
}

function buildQueueFileName(queueEntries, queuedAt) {
  const arIds = Array.from(
    new Set(
      queueEntries
        .map((entry) => entry.arId)
        .filter((value) => typeof value === 'string' && value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  const prefix = arIds.length > 0 ? arIds.join('-').toLowerCase() : 'requests';
  const timestamp = queuedAt.replace(/[:.]/g, '-');
  return `${timestamp}-${prefix}.jsonl`;
}

function updateManifest(manifest, queueEntries, { queueFileRelative, queuedAt }) {
  const queueMap = new Map(queueEntries.map((entry) => [entry.requestId, entry]));
  return manifest.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      return entry;
    }
    if (!queueMap.has(entry.id)) {
      return entry;
    }
    const queuedEntry = queueMap.get(entry.id);
    return {
      ...entry,
      status: 'generation-queued',
      generationQueue: queueFileRelative,
      generationQueuedAt: queuedAt,
      generationQueueLabel: queuedEntry.label ?? null,
      generationQueueNotes: queuedEntry.metadata?.notes ?? null,
      creator: entry.creator || 'TBD (AI-generation pending)',
      license: entry.license || 'AI-generated (review pending)',
    };
  });
}

async function writeJsonLines(filePath, entries) {
  const lines = entries.map((entry) => JSON.stringify(entry));
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

if (process.argv[1] && process.argv[1].includes('queueGenerationRequests.js')) {
  main().catch((error) => {
    console.error(
      '[queueGenerationRequests] Unexpected failure while queueing requests:',
      error
    );
    process.exitCode = 1;
  });
}
