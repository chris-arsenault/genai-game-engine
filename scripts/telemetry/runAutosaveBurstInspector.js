#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { SaveManager } from '../../src/game/managers/SaveManager.js';
import { FileSystemTelemetryWriter } from '../../src/game/telemetry/FileSystemTelemetryWriter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const result = {};
  for (const token of argv) {
    if (!token.startsWith('--')) {
      continue;
    }
    const trimmed = token.slice(2);
    if (!trimmed.length) {
      continue;
    }
    const [key, value] = trimmed.split('=', 2);
    if (!key) {
      continue;
    }
    if (value === undefined) {
      result[key] = true;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function sanitizeSlot(raw) {
  if (typeof raw !== 'string') {
    return 'autosave';
  }
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : 'autosave';
}

function timestampPrefix() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function maybeLoadSnapshot(worldStateStore, snapshotPath) {
  if (!snapshotPath) {
    return;
  }
  const resolved = path.resolve(snapshotPath);
  const raw = await fs.readFile(resolved, 'utf8');
  const data = JSON.parse(raw);
  worldStateStore.hydrate(data);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const iterations = toNumber(args.iterations ?? args.i, 12);
  const delayMs = Math.max(0, toNumber(args.delay ?? args.delayMs ?? 0, 0));
  const slot = sanitizeSlot(args.slot);
  const artifactDirInput =
    args.outDir ??
    args.output ??
    path.resolve(__dirname, '../../reports/telemetry/autosave-burst');
  const artifactDir = path.resolve(artifactDirInput);
  const prefix = args.prefix ?? `autosave-burst-${timestampPrefix()}`;
  const snapshotPath = args.snapshot ?? args.state ?? null;

  await ensureDir(artifactDir);

  const eventBus = new EventBus();
  const worldStateStore = new WorldStateStore(eventBus, { enableDebug: false });
  worldStateStore.init();

  if (snapshotPath) {
    await maybeLoadSnapshot(worldStateStore, snapshotPath);
  }

  const storage = createMemoryStorage();
  if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
    globalThis.localStorage = storage;
  }

  const writer = new FileSystemTelemetryWriter({ artifactRoot: artifactDir });

  const saveManager = new SaveManager(eventBus, {
    worldStateStore,
    storage,
    telemetryWriters: [writer],
  });

  saveManager.init();

  let summary;
  try {
    summary = await saveManager.runAutosaveBurst({
      iterations,
      delayMs,
      slot,
      collectResults: true,
      exportInspector: true,
      exportOptions: {
        prefix,
        writerContext: {
          artifactDir,
        },
      },
    });
  } finally {
    try {
      saveManager.cleanup();
    } catch (error) {
      // swallow cleanup errors to avoid masking export failures
      if (process.env.DEBUG_AUTOSAVE_BURST === '1') {
        console.warn('[runAutosaveBurstInspector] cleanup warning', error);
      }
    }
  }

  const summaryPath = path.join(artifactDir, `${prefix}-summary.json`);
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const metrics = summary?.exportResult?.metrics ?? null;
  if (metrics) {
    const metricsPath = path.join(artifactDir, `${prefix}-metrics.json`);
    await fs.writeFile(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  }

  process.stdout.write(
    [
      `[runAutosaveBurstInspector] Completed ${iterations} iterations on slot "${slot}"`,
      `[runAutosaveBurstInspector] Summary saved to ${summaryPath}`,
      metrics
        ? `[runAutosaveBurstInspector] Writer summaries: ${metrics.writerSummaries
            .map((entry) => `${entry.id}:${entry.successes}/${entry.attempted}`)
            .join(', ')}`
        : '[runAutosaveBurstInspector] No telemetry metrics available',
    ].join('\n') + '\n',
  );
}

main().catch((error) => {
  process.stderr.write(
    `[runAutosaveBurstInspector] Failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

