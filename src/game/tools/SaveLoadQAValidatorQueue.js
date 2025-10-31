import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_LATENCY_BASELINE = {
  maxLoadMs: 500,
  averageLoadMs: 200,
  maxSaveMs: 500,
  averageSaveMs: 200,
};

const DEFAULT_SCHEMA_BASELINE = {
  sections: {
    storyFlags: {
      minCount: 2,
      requiredKeys: ['investigation_started', 'tutorial_completed'],
    },
    inventory: {
      minCount: 2,
      requiredEquippedSlots: ['primaryWeapon', 'tool'],
    },
    district: {
      minCount: 2,
    },
    npc: {
      minCount: 2,
    },
    tutorial: {
      mustBeCompleted: true,
    },
  },
};

/**
 * Enqueue a Save/Load QA packet for automated validation.
 *
 * @param {object} options
 * @param {string} options.distributionDir - Directory containing the staged distribution artifacts.
 * @param {object} options.manifest - Distribution manifest object returned by prepareSaveLoadQADistribution.
 * @param {string} [options.manifestPath] - Absolute path to the manifest JSON file.
 * @param {object} options.metadata - Packet metadata.
 * @param {string} options.queueRoot - Root directory for validator queue outputs.
 * @param {string} options.baselineRoot - Directory containing baseline JSON definitions.
 * @param {Date} [options.now] - Timestamp override for deterministic tests.
 * @returns {Promise<{jobPath: string, job: object}>}
 */
export async function enqueueSaveLoadValidationJob(options) {
  const {
    distributionDir,
    manifest,
    manifestPath = null,
    metadata,
    queueRoot,
    baselineRoot,
    now = new Date(),
  } = options ?? {};

  if (!distributionDir || typeof distributionDir !== 'string') {
    throw new TypeError('enqueueSaveLoadValidationJob: "distributionDir" is required');
  }
  if (!manifest || typeof manifest !== 'object') {
    throw new TypeError('enqueueSaveLoadValidationJob: "manifest" object is required');
  }
  if (!metadata || typeof metadata !== 'object') {
    throw new TypeError('enqueueSaveLoadValidationJob: "metadata" object is required');
  }
  if (!queueRoot || typeof queueRoot !== 'string') {
    throw new TypeError('enqueueSaveLoadValidationJob: "queueRoot" directory is required');
  }
  if (!baselineRoot || typeof baselineRoot !== 'string') {
    throw new TypeError('enqueueSaveLoadValidationJob: "baselineRoot" directory is required');
  }

  const resolvedDistributionDir = path.resolve(distributionDir);
  const resolvedQueueRoot = path.resolve(queueRoot);
  const resolvedBaselineRoot = path.resolve(baselineRoot);

  const latencyPath = path.join(
    resolvedDistributionDir,
    manifest.files?.latencyReport ?? 'save-load-latency.json'
  );
  const payloadPath = path.join(
    resolvedDistributionDir,
    manifest.files?.payloadSummary ?? 'save-payload-summary.json'
  );

  const [latencyReport, payloadSummary, latencyBaseline, schemaBaseline] = await Promise.all([
    readJson(latencyPath, 'enqueueSaveLoadValidationJob: Failed to read latency report'),
    readJson(payloadPath, 'enqueueSaveLoadValidationJob: Failed to read payload summary'),
    readJson(path.join(resolvedBaselineRoot, 'latency-baseline.json'), null, DEFAULT_LATENCY_BASELINE),
    readJson(path.join(resolvedBaselineRoot, 'schema-baseline.json'), null, DEFAULT_SCHEMA_BASELINE),
  ]);

  const latencyEvaluation = evaluateLatency({
    latencyReport,
    metadataProfile: metadata.profile ?? {},
    baseline: latencyBaseline ?? DEFAULT_LATENCY_BASELINE,
  });

  const schemaEvaluation = evaluateSchema({
    payloadSummary,
    baseline: schemaBaseline ?? DEFAULT_SCHEMA_BASELINE,
  });

  const queueDir = path.join(resolvedQueueRoot, 'save-load');
  await fs.mkdir(queueDir, { recursive: true });

  const jobId = randomUUID();
  const createdAt = now.toISOString();
  const job = {
    jobId,
    queue: 'save-load',
    status:
      latencyEvaluation.status === 'passed' && schemaEvaluation.status === 'passed'
        ? 'passed'
        : 'failed',
    createdAt,
    distribution: {
      id: manifest.distributionId ?? null,
      packetId: manifest.packetId ?? metadata.packetId ?? null,
      packetLabel: metadata.label ?? manifest.packetLabel ?? null,
      manifestPath: manifestPath ? path.resolve(manifestPath) : null,
      distributionDir: resolvedDistributionDir,
      files: manifest.files ?? {},
    },
    latency: latencyEvaluation,
    schema: schemaEvaluation,
    issues: [...latencyEvaluation.issues, ...schemaEvaluation.issues],
  };

  const jobPath = path.join(queueDir, `${jobId}.json`);
  await fs.writeFile(jobPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');

  return {
    jobPath,
    job,
  };
}

async function readJson(filePath, errorPrefix, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== null) {
      return fallback;
    }
    if (errorPrefix) {
      const wrapped = new Error(`${errorPrefix} (${filePath})`);
      wrapped.cause = error;
      throw wrapped;
    }
    throw error;
  }
}

function evaluateLatency({ latencyReport, metadataProfile, baseline }) {
  const summary = latencyReport?.summary ?? {};
  const metrics = {
    iterations: summary.iterations ?? metadataProfile.iterations ?? null,
    thresholdMs: summary.thresholdMs ?? metadataProfile.thresholdMs ?? null,
    averageLoadMs: summary.load?.averageMs ?? metadataProfile.averages?.loadMs ?? null,
    maxLoadMs: summary.load?.maxMs ?? metadataProfile.maxima?.loadMs ?? null,
    loadUnderThreshold:
      summary.load?.underThreshold ??
      metadataProfile.underThreshold ??
      metadataProfile.maxima?.loadMs <= (metadataProfile.thresholdMs ?? baseline?.maxLoadMs ?? 0),
    averageSaveMs: summary.save?.averageMs ?? metadataProfile.averages?.saveMs ?? null,
    maxSaveMs: summary.save?.maxMs ?? metadataProfile.maxima?.saveMs ?? null,
  };

  const issues = [];

  if (typeof metrics.maxLoadMs === 'number' && typeof baseline?.maxLoadMs === 'number') {
    if (metrics.maxLoadMs > baseline.maxLoadMs) {
      issues.push({
        type: 'latency',
        metric: 'maxLoadMs',
        expected: baseline.maxLoadMs,
        actual: metrics.maxLoadMs,
        severity: 'error',
        message: `Max load latency ${metrics.maxLoadMs}ms exceeds baseline ${baseline.maxLoadMs}ms`,
      });
    }
  }

  if (typeof metrics.averageLoadMs === 'number' && typeof baseline?.averageLoadMs === 'number') {
    if (metrics.averageLoadMs > baseline.averageLoadMs) {
      issues.push({
        type: 'latency',
        metric: 'averageLoadMs',
        expected: baseline.averageLoadMs,
        actual: metrics.averageLoadMs,
        severity: 'warning',
        message: `Average load latency ${metrics.averageLoadMs}ms exceeds baseline ${baseline.averageLoadMs}ms`,
      });
    }
  }

  if (typeof metrics.maxSaveMs === 'number' && typeof baseline?.maxSaveMs === 'number') {
    if (metrics.maxSaveMs > baseline.maxSaveMs) {
      issues.push({
        type: 'latency',
        metric: 'maxSaveMs',
        expected: baseline.maxSaveMs,
        actual: metrics.maxSaveMs,
        severity: 'warning',
        message: `Max save latency ${metrics.maxSaveMs}ms exceeds baseline ${baseline.maxSaveMs}ms`,
      });
    }
  }

  if (typeof metrics.averageSaveMs === 'number' && typeof baseline?.averageSaveMs === 'number') {
    if (metrics.averageSaveMs > baseline.averageSaveMs) {
      issues.push({
        type: 'latency',
        metric: 'averageSaveMs',
        expected: baseline.averageSaveMs,
        actual: metrics.averageSaveMs,
        severity: 'info',
        message: `Average save latency ${metrics.averageSaveMs}ms exceeds baseline ${baseline.averageSaveMs}ms`,
      });
    }
  }

  if (metrics.loadUnderThreshold === false) {
    issues.push({
      type: 'latency',
      metric: 'loadUnderThreshold',
      expected: true,
      actual: false,
      severity: 'error',
      message: 'Load latency breached configured threshold',
    });
  }

  return {
    status: issues.some((issue) => issue.severity === 'error') ? 'failed' : 'passed',
    metrics,
    baseline,
    issues,
  };
}

function evaluateSchema({ payloadSummary, baseline }) {
  const sections = payloadSummary?.sections ?? {};
  const issues = [];

  const counts = {
    storyFlags: sections.storyFlags?.count ?? null,
    inventoryItems: sections.inventory?.itemCount ?? null,
    districtRecords: sections.district?.count ?? null,
    npcRecords: sections.npc?.count ?? null,
  };

  const required = baseline?.sections ?? {};

  checkMinCount({
    label: 'storyFlags',
    actual: counts.storyFlags,
    min: required.storyFlags?.minCount,
    issues,
  });
  checkMinCount({
    label: 'inventoryItems',
    actual: counts.inventoryItems,
    min: required.inventory?.minCount,
    issues,
  });
  checkMinCount({
    label: 'districtRecords',
    actual: counts.districtRecords,
    min: required.district?.minCount,
    issues,
  });
  checkMinCount({
    label: 'npcRecords',
    actual: counts.npcRecords,
    min: required.npc?.minCount,
    issues,
  });

  const missingStoryFlags = collectMissing(
    sections.storyFlags?.keys,
    required.storyFlags?.requiredKeys
  );
  if (missingStoryFlags.length > 0) {
    issues.push({
      type: 'schema',
      metric: 'storyFlags.requiredKeys',
      expected: required.storyFlags?.requiredKeys ?? [],
      actual: sections.storyFlags?.keys ?? [],
      severity: 'error',
      message: `Missing required story flags: ${missingStoryFlags.join(', ')}`,
    });
  }

  const missingEquippedSlots = collectMissing(
    sections.inventory?.equippedSlots,
    required.inventory?.requiredEquippedSlots
  );
  if (missingEquippedSlots.length > 0) {
    issues.push({
      type: 'schema',
      metric: 'inventory.requiredEquippedSlots',
      expected: required.inventory?.requiredEquippedSlots ?? [],
      actual: sections.inventory?.equippedSlots ?? [],
      severity: 'error',
      message: `Missing required equipped slots: ${missingEquippedSlots.join(', ')}`,
    });
  }

  if (required.tutorial?.mustBeCompleted === true) {
    if (!sections.tutorial?.completed) {
      issues.push({
        type: 'schema',
        metric: 'tutorial.completed',
        expected: true,
        actual: Boolean(sections.tutorial?.completed),
        severity: 'error',
        message: 'Tutorial completion flag is not set',
      });
    }
  }

  return {
    status: issues.length > 0 ? 'failed' : 'passed',
    summary: {
      counts,
      storyFlagKeys: sections.storyFlags?.keys ?? [],
      equippedSlots: sections.inventory?.equippedSlots ?? [],
      tutorialCompleted: Boolean(sections.tutorial?.completed),
    },
    baseline,
    issues,
  };
}

function checkMinCount({ label, actual, min, issues }) {
  if (typeof min === 'number' && typeof actual === 'number') {
    if (actual < min) {
      issues.push({
        type: 'schema',
        metric: `${label}.minCount`,
        expected: min,
        actual,
        severity: 'warning',
        message: `Count for ${label} dropped below baseline (${actual} < ${min})`,
      });
    }
  }
}

function collectMissing(actualValues, requiredValues) {
  if (!Array.isArray(requiredValues) || requiredValues.length === 0) {
    return [];
  }
  const actualSet = new Set(Array.isArray(actualValues) ? actualValues : []);
  return requiredValues.filter((value) => !actualSet.has(value));
}
