#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildRenderOpsPacket } from '../../src/game/tools/RenderOpsPacketBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_REPORT = path.resolve(
  __dirname,
  '../../reports/art/act2-crossroads-lighting-preview.json'
);
const DEFAULT_SUMMARY = path.resolve(
  __dirname,
  '../../reports/art/act2-crossroads-lighting-preview-summary.md'
);
const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '../../reports/art/renderops-packets'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    reportPath: DEFAULT_REPORT,
    summaryPath: DEFAULT_SUMMARY,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    label: 'act2-crossroads',
  };

  for (const arg of args) {
    if (arg.startsWith('--report=')) {
      options.reportPath = path.resolve(process.cwd(), arg.slice(9));
    } else if (arg.startsWith('--summary=')) {
      options.summaryPath = path.resolve(process.cwd(), arg.slice(10));
    } else if (arg.startsWith('--out-dir=')) {
      options.outputRoot = path.resolve(process.cwd(), arg.slice(10));
    } else if (arg.startsWith('--label=')) {
      options.label = arg.slice(8).trim();
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  try {
    const { packetDir, metadata } = await buildRenderOpsPacket(options);
    process.stdout.write(
      `[packageRenderOpsLighting] Packet generated at ${packetDir}\n`
    );
    process.stdout.write(
      `[packageRenderOpsLighting] Segments evaluated: ${metadata.summary.total}, actionable segments: ${metadata.actionableSegments.length}\n`
    );
  } catch (error) {
    process.stderr.write(
      `[packageRenderOpsLighting] Failed to generate packet: ${error.message}\n`
    );
    if (error.cause) {
      process.stderr.write(`  Cause: ${error.cause.message}\n`);
    }
    process.exitCode = 1;
  }
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/art/packageRenderOpsLighting.js [options]',
      '',
      'Options:',
      '  --report=<path>    Path to the lighting preview JSON report.',
      '  --summary=<path>   Path to the RenderOps-facing markdown summary.',
      '  --out-dir=<path>   Output directory root for generated packets.',
      '  --label=<value>    Label to include in the packet directory name.',
      '  -h, --help         Show this help message.',
      '',
    ].join('\n')
  );
}

main();
