#!/usr/bin/env node

/**
 * Generates the AR-008 adaptive music stems (ambient/tension/combat) using procedural synthesis.
 * Outputs loopable WAV files under assets/generated/audio/ar-008/ and updates the music
 * request manifest with metadata for adaptive playback.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { generateAdaptiveStem } from '../../src/game/tools/AdaptiveAudioStemGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../../assets/generated/audio/ar-008');
const REQUESTS_PATH = path.resolve(__dirname, '../../assets/music/requests.json');

function parseArgs(argv) {
  const options = {
    outputDir: DEFAULT_OUTPUT_DIR,
    durationSeconds: 64,
    sampleRate: 44100,
    seed: 'ar008',
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--out-dir=')) {
      options.outputDir = path.resolve(process.cwd(), arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--duration=')) {
      const value = Number.parseFloat(arg.slice('--duration='.length));
      if (Number.isFinite(value) && value > 0) {
        options.durationSeconds = value;
      }
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
    'Usage: node scripts/audio/generateAr008AdaptiveStems.js [options]',
    '',
    'Options:',
    '  --out-dir=<path>       Output directory (default assets/generated/audio/ar-008)',
    '  --duration=<seconds>   Loop duration (default 64)',
    '  --sample-rate=<hz>     Sample rate (default 44100)',
    '  --seed=<value>         PRNG seed for deterministic noise layers (default ar008)',
    '  -h, --help             Show this help message',
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
  } else {
    const existing = entries[index] ?? {};
    const merged = { ...existing, ...record };

    if (
      existing.status &&
      existing.status !== 'generated' &&
      record.status === 'generated'
    ) {
      merged.status = existing.status;
    }

    if (existing.notes && record.notes) {
      const existingSuffix = existing.notes.split('|').slice(1).join('|').trim();
      if (existingSuffix.length > 0) {
        const baseNote = record.notes.split('|')[0].trim();
        merged.notes = `${baseNote} | ${existingSuffix}`.trim();
      }
    }

    entries[index] = merged;
  }
  return entries;
}

async function writeManifest(entries) {
  await fs.writeFile(REQUESTS_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function buildRequestRecord({ id, title, usage, relativeFilePath, metadata }) {
  return {
    id,
    title,
    creator: 'Codex Audio Generator',
    source: 'scripts/audio/generateAr008AdaptiveStems.js',
    license: 'CC0 / Original work (automation)',
    status: 'generated',
    usage,
    notes: `Loop ${metadata.loopEndSeconds.toFixed(1)}s at ${metadata.sampleRate}Hz (${metadata.channels}ch); seed=${metadata.seed}; checksum=${metadata.checksumSha256}`,
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await ensureDir(options.outputDir);

  const stems = [
    {
      mode: 'ambient',
      filename: 'ar-008-downtown-ambient.wav',
      description: 'AR-008 downtown district adaptive ambient base layer.',
      requestId: 'music-downtown-ambient-001',
      title: 'Downtown Pulse Ambient Stem',
    },
    {
      mode: 'tension',
      filename: 'ar-008-downtown-tension.wav',
      description: 'AR-008 downtown district adaptive tension layer.',
      requestId: 'music-downtown-tension-001',
      title: 'Downtown Pulse Tension Stem',
    },
    {
      mode: 'combat',
      filename: 'ar-008-downtown-combat.wav',
      description: 'AR-008 downtown district adaptive combat escalation layer.',
      requestId: 'music-downtown-combat-001',
      title: 'Downtown Pulse Combat Stem',
    },
  ];

  const manifestEntries = await loadRequestsManifest();
  const metadataRecords = [];

  for (const stem of stems) {
    const { buffer, metadata } = generateAdaptiveStem({
      mode: stem.mode,
      durationSeconds: options.durationSeconds,
      sampleRate: options.sampleRate,
      channels: 2,
      seed: `${options.seed}-${stem.mode}`,
    });

    const outputPath = path.join(options.outputDir, stem.filename);
    await fs.writeFile(outputPath, buffer);

    const relativePath = path.relative(
      path.resolve(__dirname, '../../'),
      outputPath
    ).replace(/\\/g, '/');

    const requestRecord = buildRequestRecord({
      id: stem.requestId,
      title: stem.title,
      usage: stem.description,
      relativeFilePath: relativePath,
      metadata,
    });

    upsertRequest(manifestEntries, requestRecord);
    metadataRecords.push({
      ...requestRecord.metadata,
      id: stem.requestId,
      title: stem.title,
      usage: stem.description,
    });

    process.stdout.write(
      `[generateAr008AdaptiveStems] Generated ${stem.mode} stem at ${relativePath}\n`
    );
  }

  await writeManifest(manifestEntries);
  await writeMetadataFile(options.outputDir, metadataRecords);

  process.stdout.write(
    `[generateAr008AdaptiveStems] Updated ${REQUESTS_PATH} with adaptive stem metadata\n`
  );
}

async function writeMetadataFile(outputDir, records) {
  const metadataPath = path.join(outputDir, 'metadata.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    stems: records,
  };
  await fs.writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  process.stderr.write(`[generateAr008AdaptiveStems] Failed: ${error.message}\n`);
  if (error.cause) {
    process.stderr.write(`  Cause: ${error.cause.message}\n`);
  }
  process.exitCode = 1;
});
