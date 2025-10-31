import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('trackBespokeDeliverables script', () => {
  it('updates manifest entries and writes a weekly progress summary', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'track-bespoke-'));
    const assetsDir = path.join(tmpDir, 'assets', 'images');
    const reportsDir = path.join(tmpDir, 'reports', 'art');

    await fs.mkdir(assetsDir, { recursive: true });
    await fs.mkdir(reportsDir, { recursive: true });

    const requestsPath = path.join(assetsDir, 'requests.json');
    const schedulePath = path.join(reportsDir, 'placeholder-replacement-schedule.json');
    const updatesPath = path.join(reportsDir, 'bespoke-week1-tracking.json');

    const requests = [
      {
        id: 'image-ar-003-kira-core-pack',
        status: 'placeholder-generated',
      },
      {
        id: 'image-ar-005-tileset-neon-district',
        status: 'placeholder-generated',
      },
    ];

    const schedule = {
      weeks: [
        {
          weekNumber: 1,
          plannedAssets: [
            { id: 'image-ar-003-kira-core-pack' },
            { id: 'image-ar-005-tileset-neon-district' },
          ],
        },
      ],
    };

    const updates = {
      updates: [
        {
          id: 'image-ar-003-kira-core-pack',
          status: 'bespoke-approved',
          artist: 'Helena Voss',
          approvedOn: '2025-11-16',
          reviewNotes: 'Sprite sheet alignment passes traversal QA.',
        },
        {
          id: 'image-ar-005-tileset-neon-district',
          status: 'bespoke-in-review',
          notes: 'Pending neon signage polish.',
        },
      ],
    };

    await fs.writeFile(requestsPath, `${JSON.stringify(requests, null, 2)}\n`, 'utf8');
    await fs.writeFile(schedulePath, `${JSON.stringify(schedule, null, 2)}\n`, 'utf8');
    await fs.writeFile(updatesPath, `${JSON.stringify(updates, null, 2)}\n`, 'utf8');

    const scriptPath = path.resolve(process.cwd(), 'scripts/art/trackBespokeDeliverables.js');
    const result = spawnSync(
      'node',
      [scriptPath, '--week=1', '--updates=reports/art/bespoke-week1-tracking.json'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        env: { ...process.env, TRACK_BESPOKE_ROOT: tmpDir },
      }
    );

    expect(result.status).toBe(0);

    const updatedRequests = JSON.parse(fsSync.readFileSync(requestsPath, 'utf8'));
    const kiraSheet = updatedRequests.find((entry) => entry.id === 'image-ar-003-kira-core-pack');
    const neonTiles = updatedRequests.find(
      (entry) => entry.id === 'image-ar-005-tileset-neon-district'
    );

    expect(kiraSheet.status).toBe('bespoke-approved');
    expect(Array.isArray(kiraSheet.statusHistory)).toBe(true);
    const latestStatusEntry = kiraSheet.statusHistory[kiraSheet.statusHistory.length - 1];
    expect(latestStatusEntry).toEqual(expect.objectContaining({ status: 'bespoke-approved' }));
    expect(kiraSheet.artist).toBe('Helena Voss');
    expect(kiraSheet.bespokeApprovedOn).toBe('2025-11-16');
    expect(kiraSheet.bespokeNotes?.some((note) => note.includes('alignment'))).toBe(true);

    expect(neonTiles.status).toBe('bespoke-in-review');
    expect(neonTiles.bespokeNotes?.some((note) => note.includes('neon signage'))).toBe(true);

    const summaryPath = path.join(reportsDir, 'week1-bespoke-progress.json');
    const summary = JSON.parse(fsSync.readFileSync(summaryPath, 'utf8'));

    expect(summary.weekNumber).toBe(1);
    expect(summary.updatesApplied).toBe(2);
    expect(summary.statusBreakdown['bespoke-approved']).toBe(1);
    expect(summary.statusBreakdown['bespoke-in-review']).toBe(1);
  });
});
