#!/usr/bin/env node

/**
 * Generates the AR-009 environmental SFX suite via procedural synthesis.
 * Outputs loopable WAV files under assets/generated/audio/ar-009/ and updates
 * downstream manifests with mixer routing plus AudioManager registration stubs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { generateEnvironmentalSfx } from '../../src/game/tools/EnvironmentalSfxGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DEFAULT_OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'assets/generated/audio/ar-009');
const REQUESTS_PATH = path.resolve(PROJECT_ROOT, 'assets/music/requests.json');
const SFX_CATALOG_PATH = path.resolve(PROJECT_ROOT, 'assets/sfx/catalog.json');
const GENERATED_AUDIO_SRC_DIR = path.resolve(PROJECT_ROOT, 'src/game/audio/generated');
const GENERATED_MODULE_PATH = path.resolve(GENERATED_AUDIO_SRC_DIR, 'ar009EnvironmentalLoops.js');

const ROUTING_CONFIG = {
  'sfx-ar-009-footsteps-concrete': {
    bus: 'ambient',
    type: 'ambient-loop',
    mixGroup: 'infiltration_surface',
    defaultVolume: 0.38,
    tags: ['ar-009', 'environment', 'loop', 'footsteps', 'concrete'],
    stateGains: {
      ambient: 0.28,
      stealth: 0.42,
      alert: 0.33,
      combat: 0.18,
    },
    recommendedScenes: ['act2_corporate_infiltration', 'memory_parlor'],
  },
  'sfx-ar-009-footsteps-metal': {
    bus: 'ambient',
    type: 'ambient-loop',
    mixGroup: 'infiltration_surface',
    defaultVolume: 0.4,
    tags: ['ar-009', 'environment', 'loop', 'footsteps', 'metal'],
    stateGains: {
      ambient: 0.26,
      stealth: 0.44,
      alert: 0.35,
      combat: 0.2,
    },
    recommendedScenes: ['act2_corporate_infiltration', 'act3_zenith_infiltration'],
  },
  'sfx-ar-009-rain-ambience': {
    bus: 'ambient',
    type: 'ambient-loop',
    mixGroup: 'weather_beds',
    defaultVolume: 0.58,
    tags: ['ar-009', 'environment', 'loop', 'weather', 'rain'],
    stateGains: {
      ambient: 0.54,
      stealth: 0.6,
      alert: 0.68,
      combat: 0.72,
    },
    recommendedScenes: ['act2_crossroads', 'neon_district'],
  },
  'sfx-ar-009-neon-buzz': {
    bus: 'ambient',
    type: 'ambient-loop',
    mixGroup: 'diegetic_layers',
    defaultVolume: 0.34,
    tags: ['ar-009', 'environment', 'loop', 'neon', 'electrical'],
    stateGains: {
      ambient: 0.3,
      stealth: 0.36,
      alert: 0.44,
      combat: 0.5,
    },
    recommendedScenes: ['act2_crossroads', 'neon_district', 'memory_parlor'],
  },
  'sfx-ar-009-distant-city': {
    bus: 'ambient',
    type: 'ambient-loop',
    mixGroup: 'district_beds',
    defaultVolume: 0.47,
    tags: ['ar-009', 'environment', 'loop', 'city', 'ambience'],
    stateGains: {
      ambient: 0.5,
      stealth: 0.48,
      alert: 0.56,
      combat: 0.64,
    },
    recommendedScenes: ['act2_crossroads', 'act3_zenith_infiltration'],
  },
  'sfx-ar-009-terminal-hum': {
    bus: 'ambient',
    type: 'ambient-loop',
    mixGroup: 'diegetic_layers',
    defaultVolume: 0.31,
    tags: ['ar-009', 'environment', 'loop', 'terminal', 'electronics'],
    stateGains: {
      ambient: 0.28,
      stealth: 0.32,
      alert: 0.4,
      combat: 0.46,
    },
    recommendedScenes: ['act2_corporate_infiltration', 'memory_parlor', 'act3_zenith_infiltration'],
  },
};

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

async function loadJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function loadRequestsManifest() {
  return loadJsonFile(REQUESTS_PATH, []);
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
  await writeJsonFile(REQUESTS_PATH, entries);
}

function cloneRouting(id) {
  const routing = ROUTING_CONFIG[id];
  if (!routing) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(routing));
}

function buildRequestRecord({ id, title, usage, relativeFilePath, metadata }) {
  const durationLabel = metadata.loopEndSeconds.toFixed(1);
  const routing = cloneRouting(id);
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
      runtimeUrl: metadata.runtimeUrl,
      routing,
    },
  };
}

async function writeMetadataFile(outputDir, records) {
  const metadataPath = path.join(outputDir, 'metadata.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    assets: records,
  };
  await writeJsonFile(metadataPath, payload);
}

async function writeRoutingFile(outputDir, records) {
  const routingPath = path.join(outputDir, 'mixer-routing.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    loops: records.map((record) => ({
      id: record.id,
      runtimeUrl: record.runtimeUrl,
      loopStartSeconds: record.loopStartSeconds,
      loopEndSeconds: record.loopEndSeconds,
      routing: record.routing ?? null,
      usage: record.usage,
    })),
  };
  await writeJsonFile(routingPath, payload);
}

async function ensureGeneratedModule(records) {
  await fs.mkdir(GENERATED_AUDIO_SRC_DIR, { recursive: true });

  const descriptor = records.map((record) => ({
    id: record.id,
    runtimeUrl: record.runtimeUrl,
    loopStartSeconds: record.loopStartSeconds,
    loopEndSeconds: record.loopEndSeconds,
    durationSeconds: record.durationSeconds,
    defaultVolume: record.defaultVolume,
    routing: record.routing ?? null,
    usage: record.usage,
    statistics: record.statistics,
  }));

  const header = [
    '/**',
    ' * Auto-generated by scripts/audio/generateAr009EnvironmentalSfx.js',
    ' * Do not edit manually.',
    ' */',
    '',
  ].join('\n');

  const moduleSource = `${header}export const AR009_ENVIRONMENTAL_LOOPS = ${JSON.stringify(descriptor, null, 2)};\n\nexport async function registerAr009EnvironmentalLoops(audioManager) {\n  const summary = { registered: 0, skipped: 0, failed: 0 };\n  if (!audioManager || typeof audioManager.loadSound !== 'function') {\n    return summary;\n  }\n\n  if (typeof audioManager.init === 'function') {\n    try {\n      await audioManager.init();\n    } catch (error) {\n      if (typeof console !== 'undefined' && console.warn) {\n        console.warn('[registerAr009EnvironmentalLoops] AudioManager init failed', error);\n      }\n    }\n  }\n\n  const hasBuffer = typeof audioManager.hasBuffer === 'function'\n    ? (id) => {\n        try {\n          return audioManager.hasBuffer(id);\n        } catch (_) {\n          return false;\n        }\n      }\n    : () => false;\n\n  for (const entry of AR009_ENVIRONMENTAL_LOOPS) {\n    if (hasBuffer(entry.id)) {\n      summary.skipped += 1;\n      continue;\n    }\n    const routing = entry.routing ?? {};\n    const options = {\n      volume: entry.defaultVolume,\n      type: routing.type || 'ambient-loop',\n      bus: routing.bus || 'ambient',\n      loop: true,\n      loopStart: entry.loopStartSeconds,\n      loopEnd: entry.loopEndSeconds,\n    };\n    if (routing.mixGroup) {\n      options.mixGroup = routing.mixGroup;\n    }\n    if (routing.stateGains) {\n      options.stateGains = routing.stateGains;\n    }\n    if (Array.isArray(routing.tags)) {\n      options.tags = routing.tags;\n    }\n    if (Array.isArray(routing.recommendedScenes)) {\n      options.recommendedScenes = routing.recommendedScenes;\n    }\n    try {\n      await audioManager.loadSound(entry.id, entry.runtimeUrl, options);\n      summary.registered += 1;\n    } catch (error) {\n      summary.failed += 1;\n      if (typeof console !== 'undefined' && console.warn) {\n        console.warn('[registerAr009EnvironmentalLoops] Failed to load loop', entry.id, error);\n      }\n    }\n  }\n\n  return summary;\n}\n`;

  await fs.writeFile(GENERATED_MODULE_PATH, `${moduleSource}\n`, 'utf8');
}

async function updateSfxCatalog(records) {
  const catalog = await loadJsonFile(SFX_CATALOG_PATH, () => ({
    version: '0.1.0',
    updated: new Date().toISOString().slice(0, 10),
    items: [],
  }));

  const items = Array.isArray(catalog.items) ? catalog.items.slice() : [];
  const indexById = new Map(items.map((item, index) => [item?.id, index]));
  let changed = false;

  for (const record of records) {
    const routing = record.routing ?? {};
    const entry = {
      id: record.id,
      file: record.runtimeUrl,
      tags:
        Array.isArray(routing.tags) && routing.tags.length > 0
          ? routing.tags
          : ['ar-009', 'environment', 'loop'],
      baseVolume: routing.defaultVolume ?? record.defaultVolume ?? 0.5,
      loop: true,
      loopStart: record.loopStartSeconds,
      loopEnd: record.loopEndSeconds,
      description: record.usage,
      routing: Object.keys(routing).length > 0 ? routing : undefined,
      source: {
        name: 'Procedural synthesis',
        author: 'Codex Audio Lab',
        license: 'CC0 (original)',
        notes: `Generated via scripts/audio/generateAr009EnvironmentalSfx.js (seed=${record.seed})`,
      },
    };

    const existingIndex = indexById.get(entry.id);
    if (existingIndex == null) {
      items.push(entry);
      changed = true;
      continue;
    }

    const existing = items[existingIndex] ?? {};
    const merged = {
      ...existing,
      ...entry,
      tags: entry.tags,
      routing: entry.routing,
      source: entry.source,
    };

    if (JSON.stringify(existing) !== JSON.stringify(merged)) {
      items[existingIndex] = merged;
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  const updatedCatalog = {
    ...catalog,
    updated: new Date().toISOString().slice(0, 10),
    items,
  };

  await writeJsonFile(SFX_CATALOG_PATH, updatedCatalog);
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

    const relativePath = path.relative(PROJECT_ROOT, outputPath).replace(/\\/g, '/');
    const runtimeUrl = `/${relativePath.replace(/^assets\//, '')}`;
    const routing = cloneRouting(asset.requestId);
    const defaultVolume = routing?.defaultVolume ?? 0.5;

    const requestRecord = buildRequestRecord({
      id: asset.requestId,
      title: asset.title,
      usage: asset.usage,
      relativeFilePath: relativePath,
      metadata: {
        ...metadata,
        runtimeUrl,
      },
    });

    upsertRequest(manifestEntries, requestRecord);

    metadataRecords.push({
      id: asset.requestId,
      title: asset.title,
      usage: asset.usage,
      file: relativePath,
      runtimeUrl,
      loopStartSeconds: metadata.loopStartSeconds,
      loopEndSeconds: metadata.loopEndSeconds,
      sampleRate: metadata.sampleRate,
      channels: metadata.channels,
      seed: metadata.seed,
      type: metadata.type,
      durationSeconds: metadata.durationSeconds,
      statistics: metadata.statistics,
      checksumSha256: metadata.checksumSha256,
      routing,
      defaultVolume,
    });

    process.stdout.write(
      `[generateAr009EnvironmentalSfx] Generated ${asset.type} at ${relativePath}\n`
    );
  }

  await writeManifest(manifestEntries);
  await writeMetadataFile(options.outputDir, metadataRecords);
  await writeRoutingFile(options.outputDir, metadataRecords);
  await ensureGeneratedModule(metadataRecords);
  await updateSfxCatalog(metadataRecords);

  process.stdout.write(
    `[generateAr009EnvironmentalSfx] Updated manifests, routing metadata, and AudioManager registration module\n`
  );
}

main().catch((error) => {
  process.stderr.write(`[generateAr009EnvironmentalSfx] Failed: ${error.message}\n`);
  if (error.cause) {
    process.stderr.write(`  Cause: ${error.cause.message}\n`);
  }
  process.exitCode = 1;
});
