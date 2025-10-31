#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { updateAssetRequestStatusOnDisk } from '../../src/game/tools/AssetRequestStatus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const options = {
    note: null,
    route: null,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--id=')) {
      options.requestId = arg.slice('--id='.length);
    } else if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length);
    } else if (arg.startsWith('--route=')) {
      options.route = arg.slice('--route='.length);
    } else if (arg.startsWith('--note=')) {
      options.note = arg.slice('--note='.length);
    } else if (arg.startsWith('--recorded-at=')) {
      options.recordedAt = arg.slice('--recorded-at='.length);
    }
  }

  return options;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/art/decideAssetRouting.js --id=<asset-id> --status=<status> [options]',
      '',
      'Options:',
      '  --id=<asset-id>        Asset request identifier (required)',
      '  --status=<status>      New status to apply (required)',
      '  --route=<value>        Routing decision label (e.g., openai, bespoke)',
      '  --note=<text>          Optional note to record alongside history',
      '  --recorded-at=<iso>    Override history timestamp (ISO string)',
      '  -h, --help             Show this help message',
      '',
    ].join('\n')
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.requestId || !options.status) {
    process.stderr.write(
      '[decideAssetRouting] Missing required arguments. Use --id and --status (see --help).\n'
    );
    process.exitCode = 1;
    return;
  }

  const projectRoot = path.resolve(__dirname, '..', '..');
  const recordedAt = options.recordedAt ? new Date(options.recordedAt) : new Date();

  const updated = await updateAssetRequestStatusOnDisk({
    projectRoot,
    requestId: options.requestId,
    status: options.status,
    note: options.note,
    route: options.route,
    recordedAt,
  });

  process.stdout.write(
    [
      `[decideAssetRouting] Updated ${options.requestId}`,
      `  status: ${updated.status}`,
      `  route: ${updated.route ?? 'n/a'}`,
      `  history entries: ${updated.statusHistory?.length ?? 0}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`[decideAssetRouting] Failed to update manifest: ${error.message}\n`);
  process.exitCode = 1;
});
