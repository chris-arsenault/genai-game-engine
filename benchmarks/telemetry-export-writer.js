/**
 * Telemetry artifact writer benchmark.
 *
 * Measures FileSystemTelemetryWriter throughput when driven by the
 * TelemetryArtifactWriterAdapter. Intended to guard the <10ms-per-artifact
 * target referenced in telemetry export plans.
 *
 * Usage: node benchmarks/telemetry-export-writer.js [iterations]
 * Set KEEP_TELEMETRY_BENCH=1 to retain generated artifacts for inspection.
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { performance } from 'node:perf_hooks';
import { TelemetryArtifactWriterAdapter } from '../src/game/telemetry/TelemetryArtifactWriterAdapter.js';
import { FileSystemTelemetryWriter } from '../src/game/telemetry/FileSystemTelemetryWriter.js';
import { createInspectorExportArtifacts } from '../src/game/telemetry/inspectorTelemetryExporter.js';

const iterationsArg = Number.parseInt(process.argv[2] ?? '', 10);
const iterations = Number.isFinite(iterationsArg) && iterationsArg > 0 ? iterationsArg : 25;

function createSyntheticSummary(seed = 0) {
  const now = Date.now() - seed * 2500;
  const cascadeTargets = Array.from({ length: 6 }, (_, idx) => ({
    factionId: `faction_${(idx + seed) % 5}`,
    cascadeCount: (idx * 2 + seed) % 7,
    lastCascade: {
      sourceFactionId: `source_${idx}`,
      newAttitude: ['ally', 'neutral', 'hostile'][idx % 3],
      occurredAt: now - idx * 60000,
    },
    sources: [`faction_${idx}`, `faction_${(idx + 2) % 5}`],
  }));

  const snapshots = Array.from({ length: 10 }, (_, idx) => ({
    event: idx === 9 ? 'tutorial_completed' : 'prompt_shown',
    timestamp: now - idx * 4500,
    stepIndex: idx,
    totalSteps: 10,
    stepId: `step_${idx}`,
    title: `Step ${idx}`,
    completedSteps: Array.from({ length: idx }, (_, step) => `step_${step}`),
    promptId: `prompt_${idx}`,
  }));

  return {
    generatedAt: now,
    source: 'benchmark',
    factions: {
      lastCascadeEvent: {
        targetFactionId: 'faction_0',
        targetFactionName: 'The Archivists',
        sourceFactionId: 'faction_2',
        sourceFactionName: 'The Vanguard',
        newAttitude: 'neutral',
        occurredAt: now - 30000,
      },
      cascadeTargets,
    },
    tutorial: {
      latestSnapshot: snapshots[snapshots.length - 1],
      snapshots,
    },
  };
}

async function runBenchmark() {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'telemetry-writer-'));
  const writer = new FileSystemTelemetryWriter({ artifactRoot: baseDir });
  const adapter = new TelemetryArtifactWriterAdapter({
    eventBus: {
      emit: () => {},
    },
    writers: [writer],
  });

  const timing = [];
  const aggregateMetrics = {
    artifactsAttempted: 0,
    artifactsWritten: 0,
    failures: 0,
  };

  try {
    for (let i = 0; i < iterations; i++) {
      const prefix = `bench-${i.toString().padStart(3, '0')}`;
      const { artifacts } = createInspectorExportArtifacts(createSyntheticSummary(i), { prefix });
      const iterationDir = path.join(baseDir, `run-${i}`);

      const start = performance.now();
      const metrics = await adapter.writeArtifacts(artifacts, {
        artifactDir: iterationDir,
        runId: i,
      });
      const elapsed = performance.now() - start;
      timing.push(elapsed);

      aggregateMetrics.artifactsAttempted += metrics?.artifactsAttempted ?? artifacts.length;
      aggregateMetrics.artifactsWritten += metrics?.artifactsWritten ?? artifacts.length;
      aggregateMetrics.failures += Array.isArray(metrics?.failures) ? metrics.failures.length : 0;
    }
  } finally {
    if (process.env.KEEP_TELEMETRY_BENCH === '1') {
      console.log(`Artifacts retained at: ${baseDir}`);
    } else {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  }

  const total = timing.reduce((acc, value) => acc + value, 0);
  const mean = total / timing.length;
  const min = Math.min(...timing);
  const max = Math.max(...timing);

  console.log('=== Telemetry Writer Benchmark ===');
  console.log(`Iterations: ${iterations}`);
  console.log(`Artifacts Attempted: ${aggregateMetrics.artifactsAttempted}`);
  console.log(`Artifacts Written: ${aggregateMetrics.artifactsWritten}`);
  console.log(`Writer Failures: ${aggregateMetrics.failures}`);
  console.log(`Mean Duration: ${mean.toFixed(3)} ms`);
  console.log(`Min Duration: ${min.toFixed(3)} ms`);
  console.log(`Max Duration: ${max.toFixed(3)} ms`);
}

runBenchmark().catch((error) => {
  console.error('[telemetry-export-writer] Benchmark failed', error);
  process.exitCode = 1;
});

