import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { enqueueRenderOpsApprovalJob } from '../../../src/game/tools/RenderOpsApprovalQueue.js';

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

describe('RenderOpsApprovalQueue', () => {
  let queueRoot;

  beforeEach(async () => {
    queueRoot = await createTempDir('renderops-queue-');
  });

  afterEach(async () => {
    if (queueRoot) {
      await cleanup(queueRoot);
      queueRoot = null;
    }
  });

  function buildMetadata(actionableSegments = []) {
    return {
      packetId: 'test-packet',
      label: 'act2-crossroads',
      summary: {
        total: 11,
        statusCounts: {
          ok: 9,
          skipped: actionableSegments.length,
        },
        metadataDriftCount: 0,
        skippedCount: actionableSegments.length,
      },
      actionableSegments,
    };
  }

  function buildShareManifest(actionableSegments = []) {
    return {
      packetId: 'test-packet',
      label: 'act2-crossroads',
      summary: {
        total: 11,
        statusCounts: {
          ok: 9,
          skipped: actionableSegments.length,
        },
        metadataDriftCount: 0,
        skippedCount: actionableSegments.length,
      },
      actionableSegmentCount: actionableSegments.length,
      actionableSegments,
      instructions: ['Share packet with RenderOps.'],
    };
  }

  test('creates approval job with pending status when actionable segments exist', async () => {
    const actionableSegments = [
      {
        segmentId: 'crossroads_floor_safehouse',
        status: 'skipped',
        category: 'floors',
        presetId: 'safehouse_idle',
        projected: { luminance: null, targetLuminance: null, deviation: null },
        issues: [],
      },
    ];

    const { jobPath, job } = await enqueueRenderOpsApprovalJob({
      packetDir: '/tmp/renderops/packet',
      metadata: buildMetadata(actionableSegments),
      shareManifest: buildShareManifest(actionableSegments),
      deliveryManifest: null,
      queueRoot,
      shareManifestPath: '/tmp/renderops/packet/share-manifest.json',
      deliveryManifestPath: null,
      now: new Date('2025-10-31T10:30:00.000Z'),
    });

    expect(job.status).toBe('pending_review');
    expect(job.actionableSegments).toHaveLength(1);
    expect(job.actionableSegments[0]).toMatchObject({
      segmentId: 'crossroads_floor_safehouse',
      status: 'skipped',
      category: 'floors',
    });

    const written = await fs.readFile(jobPath, 'utf8');
    const parsed = JSON.parse(written);
    expect(parsed.queue).toBe('renderops-lighting');
    expect(parsed.packet.label).toBe('act2-crossroads');
  });

  test('creates ready status when no actionable segments remain', async () => {
    const { job } = await enqueueRenderOpsApprovalJob({
      packetDir: '/tmp/renderops/packet',
      metadata: buildMetadata([]),
      shareManifest: buildShareManifest([]),
      deliveryManifest: {
        bundle: {
          format: 'zip',
          fileName: 'packet.zip',
          checksumSha256: 'abc',
        },
        attachmentCount: 2,
      },
      queueRoot,
      shareManifestPath: '/tmp/renderops/packet/share-manifest.json',
      deliveryManifestPath: '/tmp/renderops/packet/delivery-manifest.json',
      now: new Date('2025-10-31T10:40:00.000Z'),
    });

    expect(job.status).toBe('ready_for_ack');
    expect(job.actionableSegments).toHaveLength(0);
    expect(job.delivery.bundle.format).toBe('zip');
    expect(job.packet.instructions).toContain('Share packet with RenderOps.');
  });
});
