import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import {
  buildRenderOpsPacket,
  summarizeLightingReport,
} from '../../../src/game/tools/RenderOpsPacketBuilder.js';

describe('RenderOpsPacketBuilder', () => {
  test('buildRenderOpsPacket creates packet with metadata and copies assets', async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'renderops-packet-test-')
    );
    const reportPath = path.join(tempRoot, 'report.json');
    const summaryPath = path.join(tempRoot, 'summary.md');
    const outputRoot = path.join(tempRoot, 'out');

    const report = {
      entries: [
        {
          segmentId: 'segment-a',
          category: 'floors',
          status: 'ok',
          issues: [],
        },
        {
          segmentId: 'segment-b',
          category: 'accents',
          status: 'missing-overlay',
          presetId: 'test',
          projected: { luminance: 0.4, targetLuminance: 0.5, deviation: -0.1 },
          issues: [
            {
              severity: 'warning',
              code: 'missing-overlay',
              message: 'Overlay missing',
            },
          ],
        },
      ],
      summary: {
        total: 2,
        statusCounts: { ok: 1, 'missing-overlay': 1 },
        metadataDrift: [],
        skippedCount: 0,
      },
    };

    await fs.writeFile(reportPath, JSON.stringify(report), 'utf-8');
    await fs.writeFile(
      summaryPath,
      '# Test Summary\n\nSegments evaluated: 2\n',
      'utf-8'
    );

    const fixedDate = new Date('2025-11-13T12:00:00.000Z');
    const {
      packetDir,
      metadataPath,
      metadata,
      shareManifestPath,
      shareManifest,
      archivePath,
      archiveInfo,
      deliveryManifestPath,
      deliveryManifest,
    } = await buildRenderOpsPacket({
      reportPath,
      summaryPath,
      outputRoot,
      label: 'Act2 Crossroads',
      now: fixedDate,
    });

    const expectedDirName = 'act2-crossroads-2025-11-13T12-00-00-000Z';
    expect(path.basename(packetDir)).toBe(expectedDirName);

    const packetReportPath = path.join(packetDir, 'lighting-preview.json');
    const packetSummaryPath = path.join(
      packetDir,
      'lighting-preview-summary.md'
    );
    const readmePath = path.join(packetDir, 'PACKET_README.md');
    const expectedShareManifestPath = path.join(
      packetDir,
      'share-manifest.json'
    );
    const expectedDeliveryManifestPath = path.join(
      outputRoot,
      `${expectedDirName}-delivery.json`
    );
    const expectedArchivePath = path.join(outputRoot, `${expectedDirName}.zip`);

    await expect(fs.access(packetReportPath)).resolves.toBeUndefined();
    await expect(fs.access(packetSummaryPath)).resolves.toBeUndefined();
    await expect(fs.access(readmePath)).resolves.toBeUndefined();
    await expect(fs.access(expectedShareManifestPath)).resolves.toBeUndefined();
    await expect(fs.access(expectedArchivePath)).resolves.toBeUndefined();
    await expect(fs.access(expectedDeliveryManifestPath)).resolves.toBeUndefined();

    const metadataOnDisk = JSON.parse(
      await fs.readFile(metadataPath, 'utf-8')
    );

    expect(metadataOnDisk.summary.total).toBe(2);
    expect(metadataOnDisk.summary.statusCounts.ok).toBe(1);
    expect(metadataOnDisk.summary.statusCounts['missing-overlay']).toBe(1);
    expect(metadataOnDisk.bundle).toEqual({
      format: 'zip',
      relativePath: `../${expectedDirName}.zip`,
    });
    expect(metadataOnDisk.files.shareManifest).toBe('share-manifest.json');
    expect(metadataOnDisk.actionableSegments).toHaveLength(1);
    expect(metadataOnDisk.actionableSegments[0]).toMatchObject({
      segmentId: 'segment-b',
      status: 'missing-overlay',
    });

    // Ensure helper return value mirrors on-disk metadata.
    expect(metadata.actionableSegments).toHaveLength(1);
    expect(metadata.actionableSegments[0].segmentId).toBe('segment-b');

    // Share manifest should reference the bundle and actionable segments.
    expect(shareManifestPath).toBe(expectedShareManifestPath);
    const shareManifestOnDisk = JSON.parse(
      await fs.readFile(shareManifestPath, 'utf-8')
    );
    expect(shareManifestOnDisk.bundle).toEqual({
      format: 'zip',
      relativePath: `../${expectedDirName}.zip`,
    });
    expect(shareManifestOnDisk.actionableSegmentCount).toBe(1);
    expect(Array.isArray(shareManifestOnDisk.instructions)).toBe(true);
    expect(shareManifestOnDisk.instructions.length).toBeGreaterThanOrEqual(3);
    expect(shareManifest).toEqual(shareManifestOnDisk);

    // Delivery manifest should surface archive metadata for external delivery.
    expect(deliveryManifestPath).toBe(expectedDeliveryManifestPath);
    const deliveryManifestOnDisk = JSON.parse(
      await fs.readFile(deliveryManifestPath, 'utf-8')
    );
    expect(deliveryManifestOnDisk.bundle).toMatchObject({
      format: 'zip',
      fileName: `${expectedDirName}.zip`,
    });
    expect(typeof deliveryManifestOnDisk.bundle.checksumSha256).toBe('string');
    expect(deliveryManifestOnDisk.bundle.checksumSha256).toHaveLength(64);
    expect(deliveryManifest).toEqual(deliveryManifestOnDisk);

    expect(archivePath).toBe(expectedArchivePath);
    expect(archiveInfo).toMatchObject({
      format: 'zip',
      fileName: `${expectedDirName}.zip`,
    });

    // Inspect archive contents to confirm packet assets are bundled.
    const archiveBuffer = await fs.readFile(archivePath);
    const zip = await JSZip.loadAsync(archiveBuffer);
    expect(zip.file('lighting-preview.json')).not.toBeNull();
    expect(zip.file('lighting-preview-summary.md')).not.toBeNull();
    expect(zip.file('PACKET_README.md')).not.toBeNull();
    expect(zip.file('metadata.json')).not.toBeNull();
    expect(zip.file('share-manifest.json')).not.toBeNull();
  });

  test('summarizeLightingReport computes fallback counts when summary is missing', () => {
    const report = {
      entries: [
        { status: 'ok' },
        { status: 'skipped' },
        { status: null },
        {},
      ],
    };

    const summary = summarizeLightingReport(report);

    expect(summary.total).toBe(4);
    expect(summary.statusCounts.ok).toBe(1);
    expect(summary.statusCounts.skipped).toBe(1);
    expect(summary.statusCounts.unknown).toBe(2);
    expect(summary.metadataDriftCount).toBe(0);
    expect(summary.skippedCount).toBe(1);
  });
});
