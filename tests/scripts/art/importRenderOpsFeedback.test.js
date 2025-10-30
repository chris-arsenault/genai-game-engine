import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { importRenderOpsFeedback } from '../../../scripts/art/importRenderOpsFeedback.js';

describe('importRenderOpsFeedback', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'renderops-feedback-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('writes normalized feedback reports', async () => {
    const feedback = {
      packetId: 'packet-123',
      label: 'act2-crossroads',
      reviewer: 'RenderOps Team',
      receivedAt: '2025-10-30T18:00:00Z',
      items: [
        {
          segmentId: 'crossroads_floor_safehouse',
          status: 'needs_revision',
          severity: 'medium',
          notes: 'Increase the neon spill to match preview reference.',
          requestedBy: 'R. Vega',
        },
      ],
    };

    const result = await importRenderOpsFeedback({
      feedbackData: feedback,
      reportsDir: tempDir,
    });

    const storedJson = JSON.parse(await fs.readFile(result.jsonPath, 'utf8'));
    expect(storedJson.entries).toHaveLength(1);
    expect(storedJson.entries[0]).toEqual(
      expect.objectContaining({
        packetId: 'packet-123',
        label: 'act2-crossroads',
        items: expect.arrayContaining([
          expect.objectContaining({
            segmentId: 'crossroads_floor_safehouse',
            status: 'needs_revision',
          }),
        ]),
      })
    );
    expect(storedJson.totalsByStatus).toEqual({ needs_revision: 1 });

    const markdown = await fs.readFile(result.markdownPath, 'utf8');
    expect(markdown).toContain('# RenderOps Feedback Log');
    expect(markdown).toContain('act2-crossroads');
    expect(markdown).toContain('needs_revision');
  });

  test('replaces feedback for the same packetId', async () => {
    await importRenderOpsFeedback({
      feedbackData: {
        packetId: 'packet-001',
        label: 'act2-crossroads',
        items: [
          { segmentId: 'segment-a', status: 'needs_revision', notes: 'Original note' },
        ],
      },
      reportsDir: tempDir,
    });

    await importRenderOpsFeedback({
      feedbackData: {
        packetId: 'packet-001',
        label: 'act2-crossroads',
        items: [
          { segmentId: 'segment-a', status: 'approved', notes: 'Updated after revision' },
        ],
      },
      reportsDir: tempDir,
    });

    const storedJson = JSON.parse(
      await fs.readFile(path.join(tempDir, 'renderops-feedback.json'), 'utf8')
    );

    expect(storedJson.entries).toHaveLength(1);
    expect(storedJson.entries[0].items[0].status).toBe('approved');
    expect(storedJson.totalsByStatus).toEqual({ approved: 1 });
  });
});
