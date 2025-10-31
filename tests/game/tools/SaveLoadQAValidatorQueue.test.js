import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { enqueueSaveLoadValidationJob } from '../../../src/game/tools/SaveLoadQAValidatorQueue.js';

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function removeDirSafe(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

function buildManifest() {
  return {
    distributionId: 'save-load-distribution-test',
    packetId: 'packet-test',
    packetLabel: 'save-load',
    files: {
      latencyReport: 'save-load-latency.json',
      payloadSummary: 'save-payload-summary.json',
      metadata: 'metadata.json',
    },
  };
}

function buildMetadata(overrides = {}) {
  return {
    packetId: 'packet-test',
    label: 'save-load',
    profile: {
      iterations: 2,
      thresholdMs: 2000,
      averages: {
        saveMs: 1,
        loadMs: 2,
      },
      maxima: {
        saveMs: 2,
        loadMs: 3,
      },
      underThreshold: true,
    },
    ...overrides,
  };
}

async function seedDistribution(dir, { latency, payload }) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'save-load-latency.json'),
    `${JSON.stringify(latency, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(dir, 'save-payload-summary.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

async function seedBaselines(root, { latency, schema }) {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(
    path.join(root, 'latency-baseline.json'),
    `${JSON.stringify(latency, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(root, 'schema-baseline.json'),
    `${JSON.stringify(schema, null, 2)}\n`,
    'utf8'
  );
}

describe('SaveLoadQAValidatorQueue', () => {
  let distributionDir;
  let queueRoot;
  let baselineRoot;

  beforeEach(async () => {
    distributionDir = await createTempDir('save-load-distribution-');
    queueRoot = await createTempDir('save-load-queue-');
    baselineRoot = await createTempDir('save-load-baseline-');
  });

  afterEach(async () => {
    if (distributionDir) {
      await removeDirSafe(distributionDir);
      distributionDir = null;
    }
    if (queueRoot) {
      await removeDirSafe(queueRoot);
      queueRoot = null;
    }
    if (baselineRoot) {
      await removeDirSafe(baselineRoot);
      baselineRoot = null;
    }
  });

  test('enqueues validation job and passes when metrics meet baseline', async () => {
    const latencyReport = {
      summary: {
        iterations: 2,
        thresholdMs: 2000,
        load: { averageMs: 10, maxMs: 20, underThreshold: true },
        save: { averageMs: 15, maxMs: 25 },
      },
    };
    const payloadSummary = {
      sections: {
        storyFlags: { count: 3, keys: ['investigation_started', 'tutorial_completed', 'extra'] },
        inventory: {
          itemCount: 3,
          equippedSlots: ['primaryWeapon', 'tool', 'gadget'],
        },
        district: { count: 4 },
        npc: { count: 5 },
        tutorial: { completed: true },
      },
    };

    await seedDistribution(distributionDir, {
      latency: latencyReport,
      payload: payloadSummary,
    });
    await seedBaselines(baselineRoot, {
      latency: {
        maxLoadMs: 50,
        averageLoadMs: 30,
        maxSaveMs: 40,
        averageSaveMs: 20,
      },
      schema: {
        sections: {
          storyFlags: { minCount: 2, requiredKeys: ['investigation_started', 'tutorial_completed'] },
          inventory: { minCount: 2, requiredEquippedSlots: ['primaryWeapon', 'tool'] },
          district: { minCount: 2 },
          npc: { minCount: 2 },
          tutorial: { mustBeCompleted: true },
        },
      },
    });

    const { jobPath, job } = await enqueueSaveLoadValidationJob({
      distributionDir,
      manifest: buildManifest(),
      metadata: buildMetadata(),
      queueRoot,
      baselineRoot,
      now: new Date('2025-10-31T10:00:00.000Z'),
    });

    const queueEntries = await fs.readdir(path.join(queueRoot, 'save-load'));
    expect(queueEntries).toEqual([path.basename(jobPath)]);

    expect(job.status).toBe('passed');
    expect(job.latency.status).toBe('passed');
    expect(job.schema.status).toBe('passed');
    expect(job.issues).toEqual([]);
  });

  test('captures latency regression above baseline', async () => {
    const latencyReport = {
      summary: {
        iterations: 2,
        thresholdMs: 2000,
        load: { averageMs: 400, maxMs: 800, underThreshold: false },
        save: { averageMs: 120, maxMs: 250 },
      },
    };
    const payloadSummary = {
      sections: {
        storyFlags: { count: 3, keys: ['investigation_started', 'tutorial_completed', 'extra'] },
        inventory: {
          itemCount: 3,
          equippedSlots: ['primaryWeapon', 'tool'],
        },
        district: { count: 3 },
        npc: { count: 3 },
        tutorial: { completed: true },
      },
    };

    await seedDistribution(distributionDir, {
      latency: latencyReport,
      payload: payloadSummary,
    });
    await seedBaselines(baselineRoot, {
      latency: {
        maxLoadMs: 500,
        averageLoadMs: 300,
        maxSaveMs: 200,
        averageSaveMs: 100,
      },
      schema: {
        sections: {
          storyFlags: { minCount: 2, requiredKeys: ['investigation_started', 'tutorial_completed'] },
          inventory: { minCount: 2, requiredEquippedSlots: ['primaryWeapon', 'tool'] },
          district: { minCount: 2 },
          npc: { minCount: 2 },
          tutorial: { mustBeCompleted: true },
        },
      },
    });

    const { job } = await enqueueSaveLoadValidationJob({
      distributionDir,
      manifest: buildManifest(),
      metadata: buildMetadata(),
      queueRoot,
      baselineRoot,
      now: new Date('2025-10-31T10:10:00.000Z'),
    });

    expect(job.status).toBe('failed');
    expect(job.latency.status).toBe('failed');
    const messages = job.latency.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Max load latency 800ms exceeds baseline 500ms'),
        expect.stringContaining('Average load latency 400ms exceeds baseline 300ms'),
        'Load latency breached configured threshold',
      ])
    );
  });

  test('flags schema regressions when required keys missing', async () => {
    const latencyReport = {
      summary: {
        iterations: 2,
        thresholdMs: 2000,
        load: { averageMs: 10, maxMs: 20, underThreshold: true },
        save: { averageMs: 12, maxMs: 15 },
      },
    };
    const payloadSummary = {
      sections: {
        storyFlags: { count: 1, keys: ['investigation_started'] },
        inventory: {
          itemCount: 1,
          equippedSlots: ['primaryWeapon'],
        },
        district: { count: 1 },
        npc: { count: 1 },
        tutorial: { completed: false },
      },
    };

    await seedDistribution(distributionDir, {
      latency: latencyReport,
      payload: payloadSummary,
    });
    await seedBaselines(baselineRoot, {
      latency: {
        maxLoadMs: 50,
        averageLoadMs: 30,
        maxSaveMs: 40,
        averageSaveMs: 20,
      },
      schema: {
        sections: {
          storyFlags: { minCount: 2, requiredKeys: ['investigation_started', 'tutorial_completed'] },
          inventory: { minCount: 2, requiredEquippedSlots: ['primaryWeapon', 'tool'] },
          district: { minCount: 2 },
          npc: { minCount: 2 },
          tutorial: { mustBeCompleted: true },
        },
      },
    });

    const { job } = await enqueueSaveLoadValidationJob({
      distributionDir,
      manifest: buildManifest(),
      metadata: buildMetadata(),
      queueRoot,
      baselineRoot,
      now: new Date('2025-10-31T10:20:00.000Z'),
    });

    expect(job.status).toBe('failed');
    expect(job.schema.status).toBe('failed');
    const schemaIssues = job.schema.issues.map((issue) => issue.message);
    expect(schemaIssues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Count for storyFlags dropped below baseline'),
        expect.stringContaining('Count for inventoryItems dropped below baseline'),
        expect.stringContaining('Missing required story flags'),
        expect.stringContaining('Missing required equipped slots'),
        'Tutorial completion flag is not set',
      ])
    );
  });
});
