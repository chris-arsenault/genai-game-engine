import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  applyAssetRequestStatusUpdate,
  updateAssetRequestStatusOnDisk,
} from '../../../src/game/tools/AssetRequestStatus.js';

describe('AssetRequestStatus', () => {
  test('applyAssetRequestStatusUpdate updates status and history', () => {
    const entry = {
      id: 'asset-001',
      status: 'prompt-drafted',
      notes: 'Initial prompt ready',
      statusHistory: [
        { status: 'prompt-drafted', recordedAt: '2025-10-30T10:00:00.000Z', context: null },
      ],
    };

    const updated = applyAssetRequestStatusUpdate(entry, {
      status: 'bespoke-pending',
      note: 'Routing to bespoke after concept review.',
      route: 'bespoke',
      recordedAt: '2025-10-31T05:00:00.000Z',
    });

    expect(updated.status).toBe('bespoke-pending');
    expect(updated.route).toBe('bespoke');
    expect(updated.statusHistory).toHaveLength(2);
    expect(updated.statusHistory[1]).toMatchObject({
      status: 'bespoke-pending',
      recordedAt: '2025-10-31T05:00:00.000Z',
      context: 'Routing to bespoke after concept review.',
      route: 'bespoke',
    });
    expect(updated.notes).toContain('Routing to bespoke after concept review.');
  });

  test('updateAssetRequestStatusOnDisk persists manifest changes', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asset-request-'));
    const manifestPath = path.join(tempDir, 'requests.json');

    const manifest = [
      {
        id: 'image-ar-003-kira-evasion-pack',
        status: 'prompt-drafted',
        notes: 'Prompt drafted during Session 159',
        statusHistory: [
          {
            status: 'prompt-drafted',
            recordedAt: '2025-10-31T04:50:00.000Z',
            context: 'Dash and slide animation prompt staged.',
          },
        ],
      },
    ];

    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const updated = await updateAssetRequestStatusOnDisk({
      projectRoot: tempDir,
      requestsRelativePath: 'requests.json',
      requestId: 'image-ar-003-kira-evasion-pack',
      status: 'bespoke-pending',
      note: 'OpenAI generation unavailable; escalate to bespoke sprint.',
      route: 'bespoke',
      recordedAt: '2025-10-31T05:10:00.000Z',
    });

    expect(updated.status).toBe('bespoke-pending');
    expect(updated.statusHistory).toHaveLength(2);
    expect(updated.statusHistory[1].route).toBe('bespoke');

    const persisted = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(persisted[0].status).toBe('bespoke-pending');

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
