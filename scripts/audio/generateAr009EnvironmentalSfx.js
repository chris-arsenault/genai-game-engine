#!/usr/bin/env node

/**
 * Generates the AR-009 environmental SFX suite via procedural synthesis.
 * Outputs loopable WAV files under assets/generated/audio/ar-009/ and updates
 * the audio requests manifest with metadata for downstream integration.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { generateEnvironmentalSfx } from '../../src/game/tools/EnvironmentalSfxGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../../assets/generated/audio/ar-009');
const REQUESTS_PATH = path.resolve(__dirname, '../../assets/music/requests.json');

function parseArgs(argv) {
  const options = {
    outputDir: DEFAULT_OUTPUT_DIR,
    sampleRate: 44100,
    seed: 'ar009',
    help: false,
  };

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg.startsWith('--out-dir=')) {
      options.outputDir = path.resolve(process.cwd(), arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--sample-rate=')) {
      const value = Number.parseInt(arg.slice('--sample-rate='.length), 10);
      if (Number.isFinite(value) && value > 0) {
        options.sampleRate = value;
      }
    } else if (arg.startsWith('--seed=')) {
      const value = arg.slice('--seed='.length).trim();
      if (value.length) {
        options.seed = value;
      }
    }
  }

  return options;
}

function printHelp() {
  const lines = [
    'Usage: node scripts/audio/generateAr009EnvironmentalSfx.js [options]',
    '',
    'Options:',
    '  --out-dir=<path>       Output directory (default assets/generated/audio/ar-009)',
    '  --sample-rate=<hz>     Sample rate (default 44100)',
    '  --seed=<value>         Base seed for deterministic synthesis (default ar009)',
    '  -h, --help             Show this message',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadRequestsManifest() {
  try {
    const raw = await fs.readFile(REQUESTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function upsertRequest(entries, record) {
  const index = entries.findIndex((item) => item?.id === record.id);
  if (index === -1) {
    entries.push(record);
    return entries;
  }

  const existing = entries[index] ?? {};
  const merged = {
    ...existing,
    ...record,
    metadata: {
      ...(existing.metadata ?? {}),
      ...(record.metadata ?? {}),
    },
  };

  // Preserve downstream status escalations (e.g., integrated) if already set.
  if (
    existing.status &&
    existing.status !== 'generated' &&
    record.status === 'generated'
  ) {
    merged.status = existing.status;
  }

  entries[index] = merged;
  return entries;
}

async function writeManifest(entries) {
  const payload = `${JSON.stringify(entries, null, 2)}\n`;
  await fs.writeFile(REQUESTS_PATH, payload, 'utf8');
}

function buildRequestRecord({ id, title, usage, relativeFilePath, metadata }) {
  const durationLabel = metadata.loopEndSeconds.toFixed(1);
  return {
    id,
    title,
    creator: 'Codex Audio Generator',
    source: 'scripts/audio/generateAr009EnvironmentalSfx.js',
    license: 'CC0 / Original work (automation)',
    status: 'generated',
    usage,
    notes: `Loop ${durationLabel}s at ${metadata.sampleRate}Hz (${metadata.channels}ch); seed=${metadata.seed}; peak=${metadata.statistics.peak.toFixed(
      3
    )}; checksum=${metadata.checksumSha256}`,
    metadata: {
      file: relativeFilePath,
      loopStartSeconds: metadata.loopStartSeconds,
      loopEndSeconds: metadata.loopEndSeconds,
      sampleRate: metadata.sampleRate,
      channels: metadata.channels,
      seed: metadata.seed,
      statistics: metadata.statistics,
      checksumSha256: metadata.checksumSha256,
    },
  };
}

async function writeMetadataFile(outputDir, records) {
  const metadataPath = path.join(outputDir, 'metadata.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    assets: records,
  };
  await fs.writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await ensureDir(options.outputDir);

  const manifestEntries = await loadRequestsManifest();
  const metadataRecords = [];

  const assets = [
    {
      type: 'footsteps-concrete',
      filename: 'ar-009-footsteps-concrete.wav',
      requestId: 'sfx-ar-009-footsteps-concrete',
      title: 'Footsteps — Concrete Loop',
      usage: 'Looped concrete footstep bed for infiltration walk cycles.',
      durationSeconds: 12,
    },
    {
      type: 'footsteps-metal',
      filename: 'ar-009-footsteps-metal.wav',
      requestId: 'sfx-ar-009-footsteps-metal',
      title: 'Footsteps — Metal Loop',
      usage: 'Looped metallic walkway footstep bed with subtle resonance.',
      durationSeconds: 12,
    },
    {
      type: 'rain-ambience',
      filename: 'ar-009-rain-ambience.wav',
      requestId: 'sfx-ar-009-rain-ambience',
      title: 'Rain Ambience Loop',
      usage: 'Exterior rain ambience with occasional droplets for noir scenes.',
      durationSeconds: 24,
    },
    {
      type: 'neon-buzz',
      filename: 'ar-009-neon-buzz.wav',
      requestId: 'sfx-ar-009-neon-buzz',
      title: 'Neon Buzz Loop',
      usage: 'Electrical signage hum with crackle accents for city alleys.',
      durationSeconds: 18,
    },
    {
      type: 'distant-city',
      filename: 'ar-009-distant-city.wav',
      requestId: 'sfx-ar-009-distant-city',
      title: 'Distant City Loop',
      usage: 'Far skyline traffic and horn beds for open district exteriors.',
      durationSeconds: 24,
    },
    {
      type: 'terminal-hum',
      filename: 'ar-009-terminal-hum.wav',
      requestId: 'sfx-ar-009-terminal-hum',
      title: 'Terminal Hum Loop',
      usage: 'Data terminal hum with intermittent glitch pulses.',
      durationSeconds: 18,
    },
  ];

  for (const asset of assets) {
    const { buffer, metadata } = generateEnvironmentalSfx({
      type: asset.type,
      durationSeconds: asset.durationSeconds,
      sampleRate: options.sampleRate,
      channels: 2,
      seed: options.seed,
    });

    const outputPath = path.join(options.outputDir, asset.filename);
    await fs.writeFile(outputPath, buffer);

    const relativePath = path
      .relative(path.resolve(__dirname, '../../'), outputPath)
      .replace(/\\/g, '/');

    const requestRecord = buildRequestRecord({
      id: asset.requestId,
      title: asset.title,
      usage: asset.usage,
      relativeFilePath: relativePath,
      metadata,
    });

    upsertRequest(manifestEntries, requestRecord);
    metadataRecords.push({
      id: asset.requestId,
      title: asset.title,
      usage: asset.usage,
      ...requestRecord.metadata,
    });

    process.stdout.write(
      `[generateAr009EnvironmentalSfx] Generated ${asset.type} at ${relativePath}\n`
    );
  }

  await writeManifest(manifestEntries);
  await writeMetadataFile(options.outputDir, metadataRecords);

  process.stdout.write(
    `[generateAr009EnvironmentalSfx] Updated ${REQUESTS_PATH} with environmental SFX metadata\n`
  );
}

main().catch((error) => {
  process.stderr.write(`[generateAr009EnvironmentalSfx] Failed: ${error.message}\n`);
  if (error.cause) {
    process.stderr.write(`  Cause: ${error.cause.message}\n`);
  }
  process.exitCode = 1;
});
