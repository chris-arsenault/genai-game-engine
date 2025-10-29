#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { SaveManager } from '../../src/game/managers/SaveManager.js';
import { FileSystemTelemetryWriter } from '../../src/game/telemetry/FileSystemTelemetryWriter.js';
import { CiArtifactPublisher } from '../../src/game/telemetry/CiArtifactPublisher.js';

/**
 * Parse CLI arguments into a simple key/value map.
 * Supports `--key value`, `--key=value`, and flag boolean form.
 * Repeated keys accumulate into arrays.
 */
function parseArgs(argv) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('-')) {
      result._.push(token);
      continue;
    }

    const isLong = token.startsWith('--');
    const trimmed = isLong ? token.slice(2) : token.slice(1);
    if (!trimmed) {
      continue;
    }

    const [key, inlineValue] = trimmed.split('=', 2);
    if (!key) {
      continue;
    }

    if (inlineValue !== undefined) {
      appendArg(result, key, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      appendArg(result, key, next);
      index += 1;
    } else {
      appendArg(result, key, true);
    }
  }

  return result;
}

function appendArg(container, key, value) {
  if (container[key] === undefined) {
    container[key] = value;
    return;
  }
  if (Array.isArray(container[key])) {
    container[key].push(value);
    return;
  }
  container[key] = [container[key], value];
}

function toBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  return defaultValue;
}

function parseList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseList(entry));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [value];
}

function parseCommands(raw) {
  const list = parseList(raw);
  return list
    .map((entry) => {
      if (typeof entry !== 'string') {
        return entry;
      }
      const trimmed = entry.trim();
      if (!trimmed) {
        return null;
      }
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    })
    .filter(Boolean);
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

/**
 * Execute the telemetry export pipeline.
 * Designed for both CLI usage and integration tests.
 * @param {Object} options
 * @returns {Promise<{ artifactDir: string, artifactPaths: string[], exportResult: Object, publishResult: Object }>}
 */
export async function runTelemetryExport(options = {}) {
  const env = options.env ?? (typeof process !== 'undefined' ? process.env : {});
  const logger = options.logger ?? console;

  const artifactDirInput =
    options.artifactDir ?? env.TELEMETRY_EXPORT_DIR ?? './telemetry-artifacts';
  const resolvedArtifactDir = path.resolve(artifactDirInput);
  const metadataPathInput =
    options.metadataPath ?? path.join(resolvedArtifactDir, 'ci-artifacts.json');
  const resolvedMetadataPath = path.resolve(metadataPathInput);

  const formats = Array.isArray(options.formats) ? options.formats : parseList(options.formats);
  const prefix = options.prefix ?? 'save-inspector';
  const dryRun = typeof options.dryRun === 'boolean' ? options.dryRun : !Boolean(env?.CI);

  const context = {
    runId: options.runId ?? env.BUILD_ID ?? env.GITHUB_RUN_ID ?? null,
    ...options.context,
  };

  const eventBus = options.eventBus ?? new EventBus();
  const worldStateStore =
    options.worldStateStore ?? new WorldStateStore(eventBus, { enableDebug: false });
  worldStateStore.init();

  let snapshotData = options.snapshot ?? null;
  if (!snapshotData && options.snapshotPath) {
    const snapshotRaw = await fs.readFile(path.resolve(options.snapshotPath), 'utf8');
    snapshotData = JSON.parse(snapshotRaw);
  }
  if (snapshotData) {
    worldStateStore.hydrate(snapshotData);
  }

  const storage = options.storage ?? createMemoryStorage();
  if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
    globalThis.localStorage = storage;
  }

  const fileSystemWriter =
    options.filesystemWriter ?? new FileSystemTelemetryWriter({ artifactRoot: resolvedArtifactDir });

  const saveManager =
    options.saveManager ??
    new SaveManager(eventBus, {
      worldStateStore,
      storage,
      telemetryWriters: [fileSystemWriter],
    });

  const exportResult = await saveManager.exportInspectorSummary({
    prefix,
    formats: formats.length ? formats : undefined,
    writerContext: {
      artifactDir: resolvedArtifactDir,
      ...(options.writerContext ?? {}),
    },
  });

  const artifactPaths = exportResult.artifacts.map((artifact) =>
    path.resolve(resolvedArtifactDir, artifact.filename)
  );

  const ciCommands = options.ciCommands ? parseCommands(options.ciCommands) : [];

  const ciPublisher =
    options.ciPublisher ??
    new CiArtifactPublisher({
      metadataPath: resolvedMetadataPath,
      dryRun,
      commands: ciCommands,
      env,
      eventBus,
      logger,
      commandRunner: options.commandRunner,
    });

  const publishContext = {
    ...context,
    prefix,
    artifactDir: resolvedArtifactDir,
    artifactFilenames: exportResult.artifacts.map((artifact) => artifact.filename),
    metrics: exportResult.metrics,
    summarySource: exportResult.summary?.source ?? 'unknown',
  };

  const publishResult = await ciPublisher.publish(artifactPaths, publishContext);

  return {
    artifactDir: resolvedArtifactDir,
    artifactPaths,
    exportResult,
    publishResult,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const formats = parseList(args.format ?? args.formats);
  const ciCommands = args.ciCommand ?? args.ciCommands ?? null;
  let context = {};

  if (args.context) {
    try {
      context = JSON.parse(Array.isArray(args.context) ? args.context.at(-1) : args.context);
    } catch (error) {
      console.warn('[telemetry-export] Failed to parse --context JSON, continuing with defaults.', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const result = await runTelemetryExport({
      artifactDir: args.artifactDir,
      metadataPath: args.metadata,
      formats,
      prefix: args.prefix,
      snapshotPath: args.snapshot,
      dryRun: args.dryRun !== undefined ? toBoolean(args.dryRun, false) : undefined,
      ciCommands,
      context,
      env: process.env,
    });

    console.log('[telemetry-export] Inspector summary source:', result.exportResult.summary?.source);
    console.log('[telemetry-export] Artifacts generated:', result.exportResult.artifacts.length);
    console.log('[telemetry-export] Artifact directory:', result.artifactDir);
    console.log(
      '[telemetry-export] Files:',
      result.artifactPaths.map((filepath) => path.relative(process.cwd(), filepath)).join(', ')
    );
    console.log('[telemetry-export] Metadata manifest:', result.publishResult.metadataPath);
    console.log(
      '[telemetry-export] CI dry-run:',
      result.publishResult.metadata?.dryRun ?? !Boolean(process.env.CI)
    );
  } catch (error) {
    console.error('[telemetry-export] Export failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  path.basename(process.argv[1] || '') === 'exportInspectorTelemetry.js' &&
  !process.env.JEST_WORKER_ID
) {
  main();
}
