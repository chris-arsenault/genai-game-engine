import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareSaveLoadQADistribution } from '../../../src/game/tools/SaveLoadQADistributor.js';

function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('SaveLoadQADistributor', () => {
  let tempRoot;
  let deliveriesRoot;

  beforeEach(async () => {
    tempRoot = await createTempDir('save-load-packet-');
    deliveriesRoot = await createTempDir('save-load-delivery-');
  });

  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
    if (deliveriesRoot) {
      await fs.rm(deliveriesRoot, { recursive: true, force: true });
      deliveriesRoot = null;
    }
  });

  async function seedPacketDir(packetDir, { withArchive = true } = {}) {
    const createdAt = '2025-10-31T04:42:21.907Z';
    const metadata = {
      packetId: 'test-packet',
      label: 'save-load',
      createdAt,
      files: {
        readme: 'README.md',
        shareSummary: 'share-summary.md',
        latencyReport: 'save-load-latency.json',
        payloadSummary: 'save-payload-summary.json',
        metadata: 'metadata.json',
        archive: withArchive ? 'save-load-2025-10-31T04-42-21-907Z.zip' : null,
      },
      profile: {
        averages: { saveMs: 1, loadMs: 0 },
        maxima: { saveMs: 2, loadMs: 1 },
        iterations: 5,
        underThreshold: true,
      },
    };

    await fs.mkdir(packetDir, { recursive: true });
    await fs.writeFile(path.join(packetDir, 'README.md'), '# Packet README\n', 'utf8');
    await fs.writeFile(
      path.join(packetDir, 'share-summary.md'),
      '# Share Summary\n- hello QA\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(packetDir, 'save-load-latency.json'),
      `${JSON.stringify({ summary: {} }, null, 2)}\n`,
      'utf8'
    );
    await fs.writeFile(
      path.join(packetDir, 'save-payload-summary.json'),
      `${JSON.stringify({ sections: {} }, null, 2)}\n`,
      'utf8'
    );
    await fs.writeFile(
      path.join(packetDir, 'metadata.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
      'utf8'
    );

    if (withArchive) {
      const archivePath = path.join(path.dirname(packetDir), metadata.files.archive);
      await fs.writeFile(archivePath, 'dummy-archive', 'utf8');
    }

    return metadata;
  }

  test('creates distribution directory with manifest and feedback tracker', async () => {
    const packetDir = path.join(tempRoot, 'save-load-2025-10-31T04-42-21-907Z');
    const metadata = await seedPacketDir(packetDir);

    const result = await prepareSaveLoadQADistribution({
      packetDir,
      deliveriesRoot,
      qaRecipients: ['qa@example.com'],
      now: new Date('2025-10-31T05:00:00.000Z'),
    });

    expect(result.manifest.packetId).toBe(metadata.packetId);
    expect(result.manifest.files.readme).toBe('README.md');
    expect(result.manifest.files.archive).toBe(metadata.files.archive);

    const distributionDir = result.distributionDir;
    const files = await fs.readdir(distributionDir);
    expect(files).toEqual(
      expect.arrayContaining([
        'README.md',
        'share-summary.md',
        'save-load-latency.json',
        'save-payload-summary.json',
        'metadata.json',
        'distribution-manifest.json',
        'handoff-readme.md',
        'qa-feedback-tracker.md',
        metadata.files.archive,
      ])
    );

    const tracker = await fs.readFile(
      path.join(distributionDir, 'qa-feedback-tracker.md'),
      'utf8'
    );
    expect(tracker).toContain('Feedback Log');
  });

  test('handles missing archive gracefully', async () => {
    const packetDir = path.join(tempRoot, 'save-load-2025-10-31T04-42-21-907Z');
    const metadata = await seedPacketDir(packetDir, { withArchive: false });

    const result = await prepareSaveLoadQADistribution({
      packetDir,
      deliveriesRoot,
      now: new Date('2025-10-31T05:10:00.000Z'),
    });

    expect(result.manifest.files.archive).toBeNull();
    const files = await fs.readdir(result.distributionDir);
    expect(files).toEqual(
      expect.arrayContaining([
        'README.md',
        'share-summary.md',
        'save-load-latency.json',
        'save-payload-summary.json',
        'metadata.json',
        'distribution-manifest.json',
        'handoff-readme.md',
        'qa-feedback-tracker.md',
      ])
    );
  });
});
