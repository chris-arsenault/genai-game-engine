#!/usr/bin/env node

/**
 * Generates a QA-ready packet containing the latest save/load latency profile
 * and payload summary. Outputs a timestamped bundle under
 * reports/telemetry/save-load-qa by default.
 */

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { profileSaveLoadLatency, summarizeProfile } from '../../src/game/managers/saveLoadProfiling.js';
import { buildSavePayloadSummary } from '../../src/game/managers/savePayloadSummary.js';
import { buildSaveLoadQAPacket } from '../../src/game/tools/SaveLoadQAPacketBuilder.js';
import {
  buildProfilingSaveManager,
  buildSummarySaveManager,
} from './lib/saveManagerFixtures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT_ROOT = path.resolve(__dirname, '../../reports/telemetry/save-load-qa');

function parseArgs(argv) {
  const options = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    iterations: 5,
    label: 'save-load',
    includeSamples: true,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--out-dir=')) {
      options.outputRoot = path.resolve(process.cwd(), arg.slice(10));
    } else if (arg.startsWith('--iterations=')) {
      const value = Number.parseInt(arg.slice(13), 10);
      if (Number.isFinite(value) && value > 0) {
        options.iterations = value;
      }
    } else if (arg.startsWith('--label=')) {
      const value = arg.slice(8).trim();
      if (value.length) {
        options.label = value;
      }
    } else if (arg === '--no-samples') {
      options.includeSamples = false;
    }
  }

  return options;
}

function printHelp() {
  const lines = [
    'Usage: node scripts/telemetry/packageSaveLoadQa.js [options]',
    '',
    'Options:',
    '  --out-dir=<path>    Output directory root (default reports/telemetry/save-load-qa)',
    '  --iterations=<n>    Number of profiling iterations to run (default 5)',
    '  --label=<value>     Custom label for the generated packet (default "save-load")',
    '  --no-samples        Exclude raw samples from the latency report (summary only)',
    '  -h, --help          Show this help message',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const profilingManager = buildProfilingSaveManager();
  const profile = profileSaveLoadLatency(profilingManager, {
    iterations: options.iterations,
    slotName: 'profiling-latency',
  });
  const profileSummary = summarizeProfile(profile);
  profilingManager.cleanup();

  const summaryManager = buildSummarySaveManager();
  const payloadSummary = buildSavePayloadSummary(summaryManager, {
    slotName: 'payload-summary',
  });
  summaryManager.cleanup();

  const { packetDir, metadata, archivePath } = await buildSaveLoadQAPacket({
    profile: { summary: profileSummary, samples: profile.samples },
    payloadSummary,
    outputRoot: options.outputRoot,
    label: options.label,
    includeSamples: options.includeSamples,
    createArchive: true,
  });

  process.stdout.write(
    `[packageSaveLoadQa] Packet generated at ${packetDir}\n` +
      `[packageSaveLoadQa] Avg save/load: ${formatMs(metadata.profile.averages.saveMs)} / ${formatMs(metadata.profile.averages.loadMs)}\n`
  );

  if (archivePath) {
    process.stdout.write(`[packageSaveLoadQa] Shareable archive created at ${archivePath}\n`);
  }
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value}ms`;
}

main().catch((error) => {
  process.stderr.write(`[packageSaveLoadQa] Failed to generate packet: ${error.message}\n`);
  if (error.cause) {
    process.stderr.write(`  Cause: ${error.cause.message}\n`);
  }
  process.exitCode = 1;
});
