#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Act2CrossroadsArtConfig } from '../../src/game/data/sceneArt/Act2CrossroadsArtConfig.js';
import {
  collectOverlayStatsFromFile,
  normalizeOverlayStats,
} from '../../src/game/tools/OverlayStatCollector.js';
import { generateCrossroadsLightingReport } from '../../src/game/tools/Act2CrossroadsLightingPreviewer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OVERLAY_DIR = path.resolve(
  __dirname,
  '../../assets/overlays/act2-crossroads'
);

async function main() {
  const args = process.argv.slice(2);
  let overlayDir = DEFAULT_OVERLAY_DIR;
  let outputPath = null;
  let overlayAlphaTolerance = null;

  for (const arg of args) {
    if (arg.startsWith('--dir=')) {
      const candidate = arg.slice('--dir='.length).trim();
      if (candidate) {
        overlayDir = path.resolve(process.cwd(), candidate);
      }
    } else if (arg.startsWith('--out=')) {
      const candidate = arg.slice('--out='.length).trim();
      if (candidate) {
        outputPath = path.resolve(process.cwd(), candidate);
      }
    } else if (arg.startsWith('--tolerance=')) {
      const candidate = Number.parseFloat(arg.slice('--tolerance='.length));
      if (!Number.isNaN(candidate) && candidate >= 0 && candidate <= 1) {
        overlayAlphaTolerance = candidate;
      }
    }
  }

  let entries;
  try {
    entries = await fs.readdir(overlayDir, { withFileTypes: true });
  } catch (error) {
    console.error(
      `[previewCrossroadsLighting] Failed to read overlay directory at ${overlayDir}:`,
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
      `[previewCrossroadsLighting] No PNG overlays found in ${overlayDir}`
    );
    return;
  }

  const overlayStats = new Map();
  for (const fileName of pngEntries) {
    const fullPath = path.join(overlayDir, fileName);
    try {
      const rawStats = await collectOverlayStatsFromFile(fullPath);
      const stats = normalizeOverlayStats(rawStats);
      overlayStats.set(fileName.replace(/\.png$/i, ''), {
        ...stats,
        fileName,
        path: fullPath,
      });
    } catch (error) {
      console.error(
        `[previewCrossroadsLighting] Failed to analyze ${fileName}:`,
        error
      );
    }
  }

  console.log(
    `[previewCrossroadsLighting] Loaded stats for ${overlayStats.size} overlays from ${overlayDir}`
  );

  const report = generateCrossroadsLightingReport({
    config: Act2CrossroadsArtConfig,
    overlayStats,
    overlayAlphaTolerance: overlayAlphaTolerance ?? undefined,
  });

  outputSummary(report);

  if (outputPath) {
    await writeReport(outputPath, report);
  }
}

function outputSummary(report) {
  const { summary, entries } = report;
  console.log(
    `[previewCrossroadsLighting] Evaluated ${summary.total} segments across lighting categories`
  );
  for (const [status, count] of Object.entries(summary.statusCounts)) {
    console.log(`  - ${status.padEnd(16)} ${count}`);
  }

  const interesting = entries.filter(
    (entry) => entry.status !== 'ok' && entry.status !== 'metadata-drift'
  );

  if (interesting.length > 0) {
    console.log(
      `[previewCrossroadsLighting] Detailed findings (${interesting.length}):`
    );
    for (const entry of interesting) {
      const deviation =
        entry.projected.deviation !== null
          ? entry.projected.deviation.toFixed(3)
          : 'n/a';
      const target =
        entry.projected.targetLuminance !== null
          ? entry.projected.targetLuminance.toFixed(3)
          : 'n/a';
      const projected =
        entry.projected.luminance !== null
          ? entry.projected.luminance.toFixed(3)
          : 'n/a';
      const alphaDelta =
        entry.overlay.delta !== null
          ? entry.overlay.delta.toFixed(3)
          : 'n/a';
      console.log(
        [
          `${entry.segmentId ?? 'unknown'} [${entry.category}]`,
          `status=${entry.status}`,
          `preset=${entry.presetId ?? 'n/a'}`,
          `projL=${projected}`,
          `target=${target}`,
          `dev=${deviation}`,
          `alphaDelta=${alphaDelta}`,
        ].join(' | ')
      );
      for (const issue of entry.issues) {
        console.log(`    • (${issue.severity}) [${issue.code}] ${issue.message}`);
      }
    }
  }

  if (summary.metadataDrift.length > 0) {
    console.log(
      `[previewCrossroadsLighting] ${summary.metadataDrift.length} segments show overlayAverageAlpha drift:`
    );
    for (const entry of summary.metadataDrift) {
      const delta =
        entry.overlay.delta !== null
          ? entry.overlay.delta.toFixed(3)
          : 'n/a';
      console.log(
        `    • ${entry.segmentId ?? 'unknown'} (delta=${delta}, asset=${entry.assetId})`
      );
    }
  }
}

async function writeReport(outputPath, report) {
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(
      `[previewCrossroadsLighting] Wrote report to ${outputPath}`
    );
  } catch (error) {
    console.error(
      `[previewCrossroadsLighting] Failed to write report to ${outputPath}:`,
      error
    );
  }
}

if (process.argv[1] && process.argv[1].includes('previewCrossroadsLighting.js')) {
  main().catch((error) => {
    console.error(
      '[previewCrossroadsLighting] Unexpected failure during preview:',
      error
    );
    process.exitCode = 1;
  });
}
