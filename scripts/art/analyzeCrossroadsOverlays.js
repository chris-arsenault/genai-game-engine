#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { collectOverlayStatsFromFile, normalizeOverlayStats } from '../../src/game/tools/OverlayStatCollector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OVERLAY_DIR = path.resolve(
  __dirname,
  '../../assets/overlays/act2-crossroads'
);

/**
 * Formats the stats into a concise string.
 * @param {string} name
 * @param {ReturnType<typeof normalizeOverlayStats>} stats
 * @returns {string}
 */
function formatStats(name, stats) {
  const {
    width,
    height,
    averageLuma,
    averageAlpha,
    peakAlpha,
    highAlphaRatio,
    lowAlphaRatio,
  } = stats;

  const size = `${width}x${height}`;
  const highPct = (highAlphaRatio * 100).toFixed(1).padStart(5);
  const lowPct = (lowAlphaRatio * 100).toFixed(1).padStart(5);

  return [
    `${name.padEnd(40)} | ${size.padStart(11)}`,
    `avgLuma=${averageLuma.toFixed(1).padStart(6)}`,
    `avgAlpha=${averageAlpha.toFixed(1).padStart(6)}`,
    `peakAlpha=${peakAlpha.toString().padStart(3)}`,
    `high@220+=${highPct}%`,
    `low@<=64=${lowPct}%`,
  ].join('  ');
}

async function main() {
  const args = process.argv.slice(2);
  let overlayDir = DEFAULT_OVERLAY_DIR;

  for (const arg of args) {
    if (arg.startsWith('--dir=')) {
      const target = arg.slice('--dir='.length).trim();
      if (target) {
        overlayDir = path.resolve(process.cwd(), target);
      }
    }
  }

  let entries;
  try {
    entries = await fs.readdir(overlayDir, { withFileTypes: true });
  } catch (error) {
    console.error(
      `[analyzeCrossroadsOverlays] Failed to read overlay directory at ${overlayDir}:`,
      error
    );
    process.exitCode = 1;
    return;
  }

  const pngEntries = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (pngEntries.length === 0) {
    console.warn(
      `[analyzeCrossroadsOverlays] No PNG overlays found in ${overlayDir}`
    );
    return;
  }

  console.log(`[analyzeCrossroadsOverlays] Evaluating ${pngEntries.length} overlays from ${overlayDir}`);
  console.log('-'.repeat(112));

  for (const fileName of pngEntries) {
    const fullPath = path.join(overlayDir, fileName);
    try {
      const rawStats = await collectOverlayStatsFromFile(fullPath);
      const stats = normalizeOverlayStats(rawStats);
      console.log(formatStats(fileName, stats));
    } catch (error) {
      console.error(
        `[analyzeCrossroadsOverlays] Failed to analyze ${fileName}:`,
        error
      );
    }
  }
}

if (process.argv[1] && process.argv[1].includes('analyzeCrossroadsOverlays.js')) {
  main().catch((error) => {
    console.error(
      '[analyzeCrossroadsOverlays] Unexpected analysis failure:',
      error
    );
    process.exitCode = 1;
  });
}
