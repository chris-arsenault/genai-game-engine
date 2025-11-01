#!/usr/bin/env node
/**
 * Corridor readiness validator for tileset seam manifests.
 *
 * Runs structural checks on seam annotations to ensure doorway metadata lines
 * up with corridor expectations before wiring manifests into runtime previews.
 */

import path from 'node:path';
import process from 'node:process';

import { loadTilesetSeamManifest } from './lib/tilesetSeamPreview.js';
import { validateTilesetSeamManifest } from '../../src/game/tools/TilesetSeamValidator.js';

function parseArgs(argv) {
  const options = {
    manifest: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('--manifest=')) {
      options.manifest = arg.slice('--manifest='.length);
      continue;
    }
  }

  return options;
}

function printUsage() {
  console.log(`Usage: node scripts/art/validateTilesetSeams.js --manifest=<path>

Options:
  --manifest=<path>   Tileset seam metadata JSON (required)
  --help              Show this message
`);
}

function logIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return;
  }

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? '[ERROR]' : '[WARN] ';
    const suffix = Number.isFinite(issue.tileIndex) ? ` (tileIndex ${issue.tileIndex})` : '';
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${issue.message}${suffix}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.manifest) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const manifestPath = path.resolve(process.cwd(), args.manifest);
  const manifest = await loadTilesetSeamManifest(manifestPath);
  const result = validateTilesetSeamManifest(manifest);

  // eslint-disable-next-line no-console
  console.log(
    `[validateTilesetSeams] ${result.ok ? 'PASS' : 'FAIL'} – ${manifest.tilesetId ?? path.basename(manifestPath)} | annotations=${result.stats.annotations} clusters=${result.stats.clusterCount} longest=${result.stats.longestClusterLength}`
  );

  if (result.issues.length > 0) {
    logIssues(result.issues);
  }

  if (!result.ok || result.hasWarnings) {
    const exitCode = result.ok ? 2 : 3;
    process.exit(exitCode);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export { validateTilesetSeamManifest };
