#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OVERLAY_DIR = path.resolve(
  __dirname,
  '../../assets/overlays/act2-crossroads'
);

/**
 * Computes summary statistics for every pixel in an overlay.
 * @param {Jimp} image
 * @returns {{
 *   pixelCount: number,
 *   averageLuma: number,
 *   averageAlpha: number,
 *   peakAlpha: number,
 *   highAlphaRatio: number,
 *   lowAlphaRatio: number
 * }}
 */
function computeOverlayStats(image) {
  let lumaSum = 0;
  let alphaSum = 0;
  let peakAlpha = 0;
  let highAlpha = 0;
  let lowAlpha = 0;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (_x, _y, idx) => {
    const r = image.bitmap.data[idx];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    const a = image.bitmap.data[idx + 3];

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumaSum += luma;
    alphaSum += a;
    peakAlpha = Math.max(peakAlpha, a);

    if (a >= 220) {
      highAlpha += 1;
    } else if (a <= 64) {
      lowAlpha += 1;
    }
  });

  const pixelCount = image.bitmap.width * image.bitmap.height;
  const averageLuma = pixelCount > 0 ? lumaSum / pixelCount : 0;
  const averageAlpha = pixelCount > 0 ? alphaSum / pixelCount : 0;

  return {
    pixelCount,
    averageLuma,
    averageAlpha,
    peakAlpha,
    highAlphaRatio: pixelCount > 0 ? highAlpha / pixelCount : 0,
    lowAlphaRatio: pixelCount > 0 ? lowAlpha / pixelCount : 0,
  };
}

/**
 * Formats the stats into a concise string.
 * @param {string} name
 * @param {ReturnType<typeof computeOverlayStats>} stats
 * @param {Jimp} image
 * @returns {string}
 */
function formatStats(name, stats, image) {
  const {
    averageLuma,
    averageAlpha,
    peakAlpha,
    highAlphaRatio,
    lowAlphaRatio,
  } = stats;

  const size = `${image.bitmap.width}x${image.bitmap.height}`;
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

async function loadPng(filePath) {
  const buffer = await fs.readFile(filePath);
  return Jimp.read(buffer);
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
      const image = await loadPng(fullPath);
      const stats = computeOverlayStats(image);
      console.log(formatStats(fileName, stats, image));
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

