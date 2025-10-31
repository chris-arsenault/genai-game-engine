#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'node:perf_hooks';
import { ForensicSystem } from '../../src/game/systems/ForensicSystem.js';
import { ForensicEvidence } from '../../src/game/components/ForensicEvidence.js';
import { Evidence } from '../../src/game/components/Evidence.js';
import { FactionManager } from '../../src/game/managers/FactionManager.js';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { BSPGenerator } from '../../src/game/procedural/BSPGenerator.js';
import { DetectiveVisionOverlay } from '../../src/game/ui/DetectiveVisionOverlay.js';

const DEFAULT_OUTPUT = 'telemetry-artifacts/performance/performance-metrics.json';
const THRESHOLDS = {
  forensicAnalysisMs: 4,
  factionModifyAvgMs: 2,
  factionAttitudeAvgMs: 0.05,
  bspGenerationMs: 10,
  detectiveVisionUpdateAvgMs: 0.6,
  detectiveVisionRenderAvgMs: 0.75,
  detectiveVisionCombinedAvgMs: 1,
};

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      continue;
    }
    const trimmed = token.replace(/^-+/, '');
    const [key, value] = trimmed.split('=', 2);
    if (value !== undefined) {
      args[key] = value;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

class ComponentRegistryStub {
  constructor() {
    this.components = new Map();
  }

  _key(entityId, type) {
    return `${entityId}:${type}`;
  }

  addComponent(entityId, type, component) {
    this.components.set(this._key(entityId, type), component);
  }

  setComponent(entityId, type, component) {
    this.addComponent(entityId, type, component);
  }

  getComponent(entityId, type) {
    return this.components.get(this._key(entityId, type)) ?? null;
  }

  hasComponent(entityId, type) {
    return this.components.has(this._key(entityId, type));
  }

  removeComponent(entityId, type) {
    this.components.delete(this._key(entityId, type));
  }

  removeAllComponents(entityId) {
    const prefix = `${entityId}:`;
    for (const key of this.components.keys()) {
      if (key.startsWith(prefix)) {
        this.components.delete(key);
      }
    }
  }
}

function measureForensicAnalysis(runs = 5) {
  const samples = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    for (let run = 0; run < runs; run += 1) {
      const componentRegistry = new ComponentRegistryStub();
      const eventBus = new EventBus();
      const forensicSystem = new ForensicSystem(componentRegistry, eventBus);
      forensicSystem.init();

      const entityId = run + 1;
      const evidenceId = `forensic-${run}`;
      componentRegistry.addComponent(
        entityId,
        'Evidence',
        new Evidence({ id: evidenceId, collected: true, caseId: 'telemetry-case' })
      );
      componentRegistry.addComponent(
        entityId,
        'ForensicEvidence',
        new ForensicEvidence({
          requiredTool: 'basic_magnifier',
          difficulty: 1,
          analysisTime: 0,
          hiddenClues: ['clue-telemetry'],
        })
      );

      forensicSystem.initiateAnalysis(entityId, evidenceId);
      const start = performance.now();
      forensicSystem.update(0.016, []);
      forensicSystem.update(1.0, []);
      const elapsed = performance.now() - start;
      samples.push(elapsed);
      forensicSystem.cleanup();
    }
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
  return summariseSamples(samples);
}

function measureFactionPerformance(iterations = 200) {
  const eventBus = {
    emit() {},
    on() {},
  };
  const factionManager = new FactionManager(eventBus);

  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};

  try {
    const modifyTimes = [];
    const attitudeTimes = [];
    for (let run = 0; run < 5; run += 1) {
      const modifyStart = performance.now();
      for (let i = 0; i < iterations; i += 1) {
        factionManager.modifyReputation('vanguard_prime', 1, 1, 'telemetry');
      }
      const modifyElapsed = performance.now() - modifyStart;
      modifyTimes.push(modifyElapsed / iterations);

      const attitudeStart = performance.now();
      for (let i = 0; i < iterations * 5; i += 1) {
        factionManager.getFactionAttitude('vanguard_prime');
      }
      const attitudeElapsed = performance.now() - attitudeStart;
      attitudeTimes.push(attitudeElapsed / (iterations * 5));
    }
    return {
      modify: summariseSamples(modifyTimes),
      attitude: summariseSamples(attitudeTimes),
    };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

function measureBspGeneration(runs = 5) {
  const generator = new BSPGenerator();
  const samples = [];

  // Warm up generator to avoid counting JIT and first-allocation overhead
  // in performance telemetry samples.
  generator.generate(100, 100, 98765);

  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    generator.generate(100, 100, 12345 + i);
    const elapsed = performance.now() - start;
    samples.push(elapsed);
  }
  return summariseSamples(samples);
}

function summariseSamples(samples = []) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      samples: [],
    };
  }
  const average = samples.reduce((acc, value) => acc + value, 0) / samples.length;
  return {
    average,
    min: Math.min(...samples),
    max: Math.max(...samples),
    samples,
  };
}

class DetectiveVisionComponentRegistryStub {
  constructor(hiddenCount = 48) {
    this.entityIds = [];
    this.components = new Map();

    for (let index = 0; index < hiddenCount; index += 1) {
      const id = `hidden-${index}`;
      this.entityIds.push(id);
      this._setComponent(id, 'Evidence', {
        id,
        title: `Hidden Evidence ${index + 1}`,
        hidden: true,
        requires: 'detective_vision',
        collected: false,
        derivedClues: [],
      });
      this._setComponent(id, 'Transform', {
        x: (index % 12) * 96 + 32,
        y: Math.floor(index / 12) * 96 + 48,
      });
      this._setComponent(id, 'Sprite', {
        width: 28,
        height: 28,
      });
    }
  }

  _key(entityId, type) {
    return `${entityId}:${type}`;
  }

  _setComponent(entityId, type, component) {
    this.components.set(this._key(entityId, type), component);
  }

  queryEntities(required) {
    if (!Array.isArray(required)) {
      return [];
    }
    if (required.includes('Evidence') && required.includes('Transform')) {
      return [...this.entityIds];
    }
    return [];
  }

  getComponent(entityId, type) {
    return this.components.get(this._key(entityId, type)) ?? null;
  }
}

function createMockContext() {
  const noop = () => {};
  return {
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    closePath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    fillText: noop,
    measureText: () => ({ width: 128 }),
  };
}

function measureDetectiveVisionOverlay(options = {}) {
  const runs = Number.isFinite(options.runs) ? Math.max(1, options.runs) : 360;
  const hiddenCount = Number.isFinite(options.hiddenCount) ? Math.max(1, options.hiddenCount) : 48;

  const canvas = { width: 1920, height: 1080 };
  const eventBus = new EventBus();
  const componentRegistry = new DetectiveVisionComponentRegistryStub(hiddenCount);
  const camera = {
    worldToScreen(x, y) {
      return { x, y };
    },
  };

  const overlay = new DetectiveVisionOverlay(
    canvas,
    eventBus,
    camera,
    componentRegistry,
    {
      highlightRefreshInterval: options.highlightRefreshInterval ?? 0.25,
      fadeSpeed: 8,
    }
  );
  overlay.init();

  const statusPayload = {
    active: true,
    energy: 4,
    energyMax: 5,
    cooldown: 0,
    cooldownMax: 5,
    canActivate: true,
    timestamp: performance.now(),
  };
  eventBus.emit('detective_vision:status', statusPayload);
  eventBus.emit('detective_vision:activated', { duration: 6 });

  const ctx = createMockContext();
  overlay.update(1 / 60);
  overlay.render(ctx);

  const updateSamples = [];
  const renderSamples = [];
  const combinedSamples = [];

  for (let i = 0; i < runs; i += 1) {
    const updateStart = performance.now();
    overlay.update(1 / 60);
    const updateElapsed = performance.now() - updateStart;

    const renderStart = performance.now();
    overlay.render(ctx);
    const renderElapsed = performance.now() - renderStart;

    updateSamples.push(updateElapsed);
    renderSamples.push(renderElapsed);
    combinedSamples.push(updateElapsed + renderElapsed);

    if (i > 0 && i % 90 === 0) {
      statusPayload.energy = Math.max(0.5, statusPayload.energy - 0.3);
      statusPayload.cooldown = Math.max(0, statusPayload.cooldown - 0.1);
      statusPayload.timestamp = performance.now();
      eventBus.emit('detective_vision:status', { ...statusPayload });
    }
  }

  eventBus.emit('detective_vision:deactivated', { reason: 'telemetry_profile' });
  overlay.cleanup();

  return {
    update: summariseSamples(updateSamples),
    render: summariseSamples(renderSamples),
    combined: summariseSamples(combinedSamples),
  };
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

function formatMetric(summary, threshold) {
  const average = Number(summary.average.toFixed(4));
  const min = Number(summary.min.toFixed(4));
  const max = Number(summary.max.toFixed(4));
  return {
    averageMs: average,
    minMs: min,
    maxMs: max,
    samples: summary.samples.map((value) => Number(value.toFixed(4))),
    thresholdMs: threshold,
    passed: average <= threshold,
  };
}

async function main() {
  const args = parseArgs();
  const outputPath = path.resolve(args.out || args.output || DEFAULT_OUTPUT);

  const forensicSummary = measureForensicAnalysis();
  const factionSummary = measureFactionPerformance();
  const bspSummary = measureBspGeneration();
  const detectiveVisionSummary = measureDetectiveVisionOverlay();

  const report = {
    generatedAt: new Date().toISOString(),
    metrics: {
      forensicAnalysis: formatMetric(forensicSummary, THRESHOLDS.forensicAnalysisMs),
      factionModify: formatMetric(factionSummary.modify, THRESHOLDS.factionModifyAvgMs),
      factionAttitude: formatMetric(factionSummary.attitude, THRESHOLDS.factionAttitudeAvgMs),
      bspGeneration: formatMetric(bspSummary, THRESHOLDS.bspGenerationMs),
      detectiveVisionUpdate: formatMetric(
        detectiveVisionSummary.update,
        THRESHOLDS.detectiveVisionUpdateAvgMs
      ),
      detectiveVisionRender: formatMetric(
        detectiveVisionSummary.render,
        THRESHOLDS.detectiveVisionRenderAvgMs
      ),
      detectiveVisionCombined: formatMetric(
        detectiveVisionSummary.combined,
        THRESHOLDS.detectiveVisionCombinedAvgMs
      ),
    },
    thresholds: THRESHOLDS,
  };

  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log('[performance-telemetry] Forensic analysis average:', report.metrics.forensicAnalysis.averageMs, 'ms');
  console.log('[performance-telemetry] Faction modify average:', report.metrics.factionModify.averageMs, 'ms');
  console.log('[performance-telemetry] Faction attitude average:', report.metrics.factionAttitude.averageMs, 'ms');
  console.log('[performance-telemetry] BSP generation average:', report.metrics.bspGeneration.averageMs, 'ms');
  console.log(
    '[performance-telemetry] Detective vision update average:',
    report.metrics.detectiveVisionUpdate.averageMs,
    'ms'
  );
  console.log(
    '[performance-telemetry] Detective vision render average:',
    report.metrics.detectiveVisionRender.averageMs,
    'ms'
  );
  console.log(
    '[performance-telemetry] Detective vision combined average:',
    report.metrics.detectiveVisionCombined.averageMs,
    'ms'
  );

  const failedMetrics = Object.entries(report.metrics)
    .filter(([, metric]) => metric.passed === false)
    .map(([key]) => key);

  if (failedMetrics.length > 0) {
    console.error('[performance-telemetry] Threshold check failed for:', failedMetrics.join(', '));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[performance-telemetry] Fatal error', error);
  process.exitCode = 1;
});
