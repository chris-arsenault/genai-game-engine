#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import { Act2CrossroadsArtConfig, ACT2_CROSSROADS_ART_MANIFEST_URL } from '../../src/game/data/sceneArt/Act2CrossroadsArtConfig.js';
import {
  loadAct2CrossroadsArtManifest,
  summarizeAct2CrossroadsArtValidation,
  validateAct2CrossroadsArtBundle,
} from '../../src/game/tools/Act2CrossroadsArtValidator.js';

async function main() {
  const args = process.argv.slice(2);
  let manifestPath = ACT2_CROSSROADS_ART_MANIFEST_URL;

  for (const arg of args) {
    if (arg.startsWith('--manifest=')) {
      manifestPath = arg.slice('--manifest='.length).trim();
    }
  }

  let manifest = null;
  try {
    manifest = await loadAct2CrossroadsArtManifest(manifestPath);
  } catch (error) {
    console.warn(
      `[validateAct2CrossroadsArt] Failed to load manifest at ${path.resolve(manifestPath)}:`,
      error
    );
  }

  const result = validateAct2CrossroadsArtBundle({
    config: Act2CrossroadsArtConfig,
    manifest,
  });
  const summary = summarizeAct2CrossroadsArtValidation(result);

  const missingEntries = Object.entries(summary.missing);
  if (missingEntries.length > 0) {
    console.error('[validateAct2CrossroadsArt] Missing segments detected:');
    for (const [category, ids] of missingEntries) {
      console.error(`  - ${category}: ${ids.join(', ')}`);
    }
  }

  if (summary.warnings.length > 0) {
    console.warn('[validateAct2CrossroadsArt] Warnings:');
    for (const warning of summary.warnings) {
      console.warn(
        `  - [${warning.category}] ${warning.segmentId}: ${warning.message}`
      );
    }
  }

  if (summary.status === 'fail') {
    console.error('[validateAct2CrossroadsArt] Validation failed');
    process.exitCode = 1;
  } else {
    console.log('[validateAct2CrossroadsArt] Art bundle validated successfully');
  }
}

if (process.argv[1] && process.argv[1].includes('validateAct2CrossroadsArt.js')) {
  main().catch((error) => {
    console.error('[validateAct2CrossroadsArt] Unexpected error:', error);
    process.exitCode = 1;
  });
}
