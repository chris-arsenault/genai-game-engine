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

const DEFAULT_OVERLAY_DIR = path.resolve(__dirname, '../../assets/overlays/act2-crossroads');
const DEFAULT_OUTPUT_DIR = path.resolve(
  __dirname,
  '../../reports/art/luminance-snapshots/act2-crossroads'
);

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return Number(value).toFixed(3);
}

function formatStatusRow(entry) {
  const target = formatNumber(entry.projected?.targetLuminance);
  const projected = formatNumber(entry.projected?.luminance);
  const deviation = formatNumber(entry.projected?.deviation);
  const alphaDelta = formatNumber(entry.overlay?.delta);

  const notes = entry.issues
    .map((issue) => `[${issue.severity}] ${issue.code}: ${issue.message}`)
    .join('; ');

  return [
    entry.segmentId ?? 'unknown',
    entry.category ?? 'n/a',
    entry.status ?? 'n/a',
    target,
    projected,
    deviation,
    alphaDelta,
    notes || '—',
  ];
}

function buildMarkdownSnapshot(snapshot) {
  const lines = [];
  lines.push(`# Act 2 Crossroads Luminance Snapshot — ${snapshot.generatedIso}`);
  lines.push('');
  lines.push(`- Total segments evaluated: **${snapshot.totalSegments}**`);
  lines.push(
    `- Status counts: ${Object.entries(snapshot.statusCounts)
      .map(([status, count]) => `${status}=${count}`)
      .join(', ')}`
  );
  lines.push(`- Overlay directory: \`${snapshot.overlayDir}\``);
  lines.push('');

  if (snapshot.highlights.length === 0) {
    lines.push('All segments meet luminance targets within configured tolerances.');
    return lines.join('\n');
  }

  lines.push('## Segments Requiring Review');
  lines.push('');
  lines.push(
    '| Segment | Category | Status | Target L | Projected L | ΔL | Δα | Notes |'
  );
  lines.push('|---------|----------|--------|----------|-------------|----|-----|-------|');

  for (const entry of snapshot.highlights) {
    const row = formatStatusRow(entry);
    lines.push(`| ${row.join(' | ')} |`);
  }

  lines.push('');
  lines.push('## Notes');
  lines.push(
    '- Refer to the latest RenderOps packet for full overlays and masks.'
  );
  lines.push(
    '- The deviation column reports projected luminance minus target luminance.'
  );

  return lines.join('\n');
}

export async function exportCrossroadsLuminanceSnapshot(options = {}) {
  const overlayDir = path.resolve(
    options.overlayDir ?? DEFAULT_OVERLAY_DIR
  );
  const outputDir = path.resolve(
    options.outputDir ?? DEFAULT_OUTPUT_DIR
  );
  const tolerance =
    typeof options.overlayAlphaTolerance === 'number'
      ? options.overlayAlphaTolerance
      : undefined;

  let entries;
  try {
    entries = await fs.readdir(overlayDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `[exportCrossroadsLuminanceSnapshot] Failed to read overlay directory at ${overlayDir}: ${error.message}`
    );
  }

  const pngEntries = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (pngEntries.length === 0) {
    throw new Error(
      `[exportCrossroadsLuminanceSnapshot] No PNG overlays found in ${overlayDir}`
    );
  }

  const overlayStats = new Map();
  for (const fileName of pngEntries) {
    const fullPath = path.join(overlayDir, fileName);
    const rawStats = await collectOverlayStatsFromFile(fullPath);
    const stats = normalizeOverlayStats(rawStats);
    overlayStats.set(fileName.replace(/\.png$/i, ''), {
      ...stats,
      fileName,
      path: fullPath,
    });
  }

  const report = generateCrossroadsLightingReport({
    config: Act2CrossroadsArtConfig,
    overlayStats,
    overlayAlphaTolerance: tolerance,
  });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const baseName = `act2-crossroads-luminance-${timestamp}`;

  const highlights = report.entries
    .filter(
      (entry) =>
        entry.status !== 'ok' &&
        entry.status !== 'metadata-drift' &&
        entry.status !== 'info'
    )
    .map((entry) => ({
      segmentId: entry.segmentId ?? null,
      category: entry.category ?? null,
      status: entry.status ?? null,
      presetId: entry.presetId ?? null,
      projected: {
        targetLuminance: entry.projected?.targetLuminance ?? null,
        luminance: entry.projected?.luminance ?? null,
        deviation: entry.projected?.deviation ?? null,
      },
      overlay: {
        averageAlpha: entry.overlay?.averageAlpha ?? null,
        delta: entry.overlay?.delta ?? null,
        fileName: entry.overlay?.fileName ?? null,
        assetId: entry.assetId ?? null,
      },
      issues: entry.issues ?? [],
    }));

  const snapshot = {
    generatedAt: now.getTime(),
    generatedIso: now.toISOString(),
    overlayDir: path.relative(process.cwd(), overlayDir),
    tolerance: tolerance ?? null,
    totalSegments: report.summary.total,
    statusCounts: report.summary.statusCounts,
    metadataDrift: report.summary.metadataDrift,
    highlights,
    links: options.links ?? {},
  };

  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const markdownPath = path.join(outputDir, `${baseName}.md`);

  await fs.writeFile(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const markdown = buildMarkdownSnapshot({
    ...snapshot,
    highlights: highlights,
  });
  await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');

  return {
    snapshot,
    jsonPath,
    markdownPath,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let overlayDir = DEFAULT_OVERLAY_DIR;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let tolerance = undefined;

  for (const arg of args) {
    if (arg.startsWith('--dir=')) {
      const candidate = arg.slice('--dir='.length).trim();
      if (candidate) {
        overlayDir = path.resolve(process.cwd(), candidate);
      }
    } else if (arg.startsWith('--out=')) {
      const candidate = arg.slice('--out='.length).trim();
      if (candidate) {
        outputDir = path.resolve(process.cwd(), candidate);
      }
    } else if (arg.startsWith('--tolerance=')) {
      const parsed = Number.parseFloat(arg.slice('--tolerance='.length));
      if (!Number.isNaN(parsed)) {
        tolerance = parsed;
      }
    }
  }

  try {
    const { snapshot, jsonPath, markdownPath } = await exportCrossroadsLuminanceSnapshot({
      overlayDir,
      outputDir,
      overlayAlphaTolerance: tolerance,
    });

    console.log(
      `[exportCrossroadsLuminanceSnapshot] Evaluated ${snapshot.totalSegments} segments ` +
        `(${snapshot.statusCounts.ok ?? 0} ok, ${snapshot.highlights.length} requires attention)`
    );
    console.log(
      `[exportCrossroadsLuminanceSnapshot] Wrote snapshot JSON to ${jsonPath}`
    );
    console.log(
      `[exportCrossroadsLuminanceSnapshot] Wrote snapshot Markdown to ${markdownPath}`
    );
  } catch (error) {
    console.error(
      '[exportCrossroadsLuminanceSnapshot] Failed to export snapshot:',
      error
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].includes('exportCrossroadsLuminanceSnapshot.js')) {
  main();
}
