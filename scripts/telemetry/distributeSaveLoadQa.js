#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { prepareSaveLoadQADistribution } from '../../src/game/tools/SaveLoadQADistributor.js';
import { enqueueSaveLoadValidationJob } from '../../src/game/tools/SaveLoadQAValidatorQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PACKETS_ROOT = path.resolve(__dirname, '../../reports/telemetry/save-load-qa');
const DEFAULT_DELIVERIES_ROOT = path.resolve(__dirname, '../../deliveries/qa/save-load');
const DEFAULT_VALIDATOR_ROOT = path.resolve(
  __dirname,
  '../../reports/telemetry/validator-queue'
);
const DEFAULT_BASELINE_ROOT = path.resolve(
  __dirname,
  '../../reports/telemetry/save-load-qa/baselines'
);

function parseArgs(argv) {
  const options = {
    packetsRoot: DEFAULT_PACKETS_ROOT,
    deliveriesRoot: DEFAULT_DELIVERIES_ROOT,
    recipients: [],
    validatorRoot: DEFAULT_VALIDATOR_ROOT,
    baselineRoot: DEFAULT_BASELINE_ROOT,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--packets-root=')) {
      options.packetsRoot = path.resolve(process.cwd(), arg.slice('--packets-root='.length));
    } else if (arg.startsWith('--deliveries-root=')) {
      options.deliveriesRoot = path.resolve(
        process.cwd(),
        arg.slice('--deliveries-root='.length)
      );
    } else if (arg.startsWith('--packet-dir=')) {
      options.packetDir = path.resolve(process.cwd(), arg.slice('--packet-dir='.length));
    } else if (arg.startsWith('--archive=')) {
      options.archivePath = path.resolve(process.cwd(), arg.slice('--archive='.length));
    } else if (arg.startsWith('--recipient=')) {
      const value = arg.slice('--recipient='.length).trim();
      if (value) {
        options.recipients.push(value);
      }
    } else if (arg.startsWith('--validator-root=')) {
      options.validatorRoot = path.resolve(
        process.cwd(),
        arg.slice('--validator-root='.length)
      );
    } else if (arg.startsWith('--baseline-root=')) {
      options.baselineRoot = path.resolve(
        process.cwd(),
        arg.slice('--baseline-root='.length)
      );
    }
  }

  return options;
}

function printHelp() {
  const lines = [
    'Usage: node scripts/telemetry/distributeSaveLoadQa.js [options]',
    '',
    'Options:',
    '  --packets-root=<path>     Root directory containing generated QA packets',
    '  --deliveries-root=<path>  Root directory for staging QA deliveries',
    '  --packet-dir=<path>       Specific packet directory to distribute',
    '  --archive=<path>          Optional archive path to include (defaults to sibling ZIP)',
    '  --recipient=<email>       QA recipient to document in the delivery manifest (repeatable)',
    '  --validator-root=<path>   Root directory for validator queue outputs',
    '  --baseline-root=<path>    Directory containing latency/schema baselines',
    '  -h, --help                Show this help message',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

async function findLatestPacketDir(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => []);
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      label: entry.name,
      dir: path.join(rootDir, entry.name),
    }))
    .sort((a, b) => b.label.localeCompare(a.label));

  for (const candidate of candidates) {
    const metadataPath = path.join(candidate.dir, 'metadata.json');
    try {
      await fs.access(metadataPath);
      return candidate.dir;
    } catch {
      continue;
    }
  }

  throw new Error(
    `distributeSaveLoadQa: No packet directories found under ${rootDir}. Run telemetry:package-save-load first.`
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const packetDir =
    options.packetDir ?? (await findLatestPacketDir(options.packetsRoot).catch((error) => {
      throw new Error(
        `distributeSaveLoadQa: Unable to locate packet directory. ${error.message}`
      );
    }));

  const result = await prepareSaveLoadQADistribution({
    packetDir,
    deliveriesRoot: options.deliveriesRoot,
    archivePath: options.archivePath,
    qaRecipients: options.recipients,
  });

  const queueResult = await enqueueSaveLoadValidationJob({
    distributionDir: result.distributionDir,
    manifest: result.manifest,
    manifestPath: result.manifestPath,
    metadata: result.metadata,
    queueRoot: options.validatorRoot,
    baselineRoot: options.baselineRoot,
  });

  const hasFailures = queueResult.job.status !== 'passed';
  const issueLines = queueResult.job.issues.map(
    (issue) =>
      `  - (${issue.type}/${issue.metric}) ${issue.message} [expected: ${formatIssueValue(issue.expected)}, actual: ${formatIssueValue(issue.actual)}, severity: ${issue.severity}]`
  );

  process.stdout.write(
    [
      `[distributeSaveLoadQa] Distribution staged at ${result.distributionDir}`,
      `[distributeSaveLoadQa] Manifest: ${result.manifestPath}`,
      `[distributeSaveLoadQa] Archive: ${
        result.archivePath ?? 'none (archive not available or skipped)'
      }`,
      `[distributeSaveLoadQa] Validator job staged at ${queueResult.jobPath}`,
      hasFailures
        ? '[distributeSaveLoadQa] Validation issues detected:\n' + issueLines.join('\n')
        : '[distributeSaveLoadQa] Validation passed against baseline thresholds',
    ].join('\n') + '\n'
  );

  if (hasFailures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`[distributeSaveLoadQa] Failed: ${error.message}\n`);
  process.exitCode = 1;
});

function formatIssueValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value === null || typeof value === 'undefined') {
    return 'n/a';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
