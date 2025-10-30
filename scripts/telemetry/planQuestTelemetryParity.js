#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTBOX_DIR = path.resolve(__dirname, '../../telemetry-artifacts/analytics/outbox');
const DEFAULT_ACK_PATH = path.resolve(
  __dirname,
  '../../telemetry-artifacts/analytics/acknowledgements.json'
);
const DEFAULT_SCHEDULE_PATH = path.resolve(
  __dirname,
  '../../telemetry-artifacts/analytics/parity-schedule.json'
);
const DEFAULT_INTERVAL_DAYS = 7;

function parseArgs(argv) {
  const options = {
    outboxDir: DEFAULT_OUTBOX_DIR,
    acknowledgements: DEFAULT_ACK_PATH,
    output: DEFAULT_SCHEDULE_PATH,
    intervalDays: DEFAULT_INTERVAL_DAYS,
  };

  for (const arg of argv) {
    if (arg.startsWith('--outbox=')) {
      options.outboxDir = path.resolve(process.cwd(), arg.slice('--outbox='.length));
    } else if (arg.startsWith('--acknowledgements=')) {
      options.acknowledgements = path.resolve(
        process.cwd(),
        arg.slice('--acknowledgements='.length)
      );
    } else if (arg.startsWith('--output=')) {
      options.output = path.resolve(process.cwd(), arg.slice('--output='.length));
    } else if (arg.startsWith('--interval-days=')) {
      const candidate = Number.parseInt(arg.slice('--interval-days='.length), 10);
      if (!Number.isNaN(candidate) && candidate > 0) {
        options.intervalDays = candidate;
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
  console.log(`Usage: node scripts/telemetry/planQuestTelemetryParity.js [options]

Options:
  --outbox=<path>              Telemetry outbox directory (default telemetry-artifacts/analytics/outbox)
  --acknowledgements=<path>    Acknowledgements log (default telemetry-artifacts/analytics/acknowledgements.json)
  --output=<path>              Output JSON schedule path (default telemetry-artifacts/analytics/parity-schedule.json)
  --interval-days=<number>     Recommended cadence in days (default 7)
  --dry-run                    Print schedule without writing file
  --help                       Show this message
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const dispatches = await loadDispatches(options.outboxDir);
  if (dispatches.length === 0) {
    console.warn('[planQuestTelemetryParity] No dispatch manifests found.');
    return;
  }

  const acknowledgements = await loadAcknowledgements(options.acknowledgements);
  const latestDispatch = dispatches[0];
  const latestAcknowledgement = acknowledgements.find(
    (ack) => ack.label === latestDispatch.label
  );
  const pendingDispatches = dispatches.filter((dispatch) => {
    return !acknowledgements.some((ack) => ack.label === dispatch.label);
  });

  const cadenceMillis = options.intervalDays * 24 * 60 * 60 * 1000;
  const baseTime = latestAcknowledgement
    ? Date.parse(latestAcknowledgement.acknowledgedAt)
    : Date.parse(latestDispatch.dispatchedAt);
  const nextCheckAt = new Date(baseTime + cadenceMillis).toISOString();
  const overdue = Date.now() > Date.parse(nextCheckAt);

  const schedule = {
    generatedAt: new Date().toISOString(),
    intervalDays: options.intervalDays,
    latestDispatch,
    latestAcknowledgement: latestAcknowledgement ?? null,
    nextCheckAt,
    overdue,
    pendingDispatches,
  };

  if (options.dryRun) {
    console.log(JSON.stringify(schedule, null, 2));
    return;
  }

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, JSON.stringify(schedule, null, 2), 'utf8');
  console.log(
    `[planQuestTelemetryParity] Wrote parity schedule to ${path.relative(
      process.cwd(),
      options.output
    )}`
  );
  if (overdue) {
    console.warn('[planQuestTelemetryParity] Next parity check is overdue.');
  }
  if (pendingDispatches.length > 0) {
    console.warn(
      `[planQuestTelemetryParity] ${pendingDispatches.length} dispatches awaiting acknowledgement.`
    );
  }
}

async function loadDispatches(outboxDir) {
  let entries;
  try {
    entries = await fs.readdir(outboxDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = path.join(outboxDir, entry.name, 'dispatch-manifest.json');
    try {
      const manifestRaw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);
      manifests.push({
        label: manifest.label ?? entry.name,
        dispatchedAt: manifest.dispatchedAt ?? null,
        nextSteps: manifest.nextSteps ?? [],
        manifestPath: path.relative(process.cwd(), manifestPath),
      });
    } catch (error) {
      console.warn(
        `[planQuestTelemetryParity] Failed to parse manifest at ${manifestPath}:`,
        error
      );
    }
  }
  return manifests.sort((a, b) => {
    const timeA = Date.parse(a.dispatchedAt ?? 0);
    const timeB = Date.parse(b.dispatchedAt ?? 0);
    return timeB - timeA;
  });
}

async function loadAcknowledgements(ackPath) {
  try {
    const raw = await fs.readFile(ackPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => Date.parse(b.acknowledgedAt ?? 0) - Date.parse(a.acknowledgedAt ?? 0));
    }
    return [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

if (process.argv[1] && process.argv[1].includes('planQuestTelemetryParity.js')) {
  main().catch((error) => {
    console.error(
      '[planQuestTelemetryParity] Unexpected failure while generating schedule:',
      error
    );
    process.exitCode = 1;
  });
}
