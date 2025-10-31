import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('monitorRenderOpsApprovals script', () => {
  it('aggregates job telemetry into summary output', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'renderops-monitor-'));
    const telemetryDir = path.join(tmpDir, 'reports', 'telemetry', 'renderops-approvals');
    await fs.mkdir(telemetryDir, { recursive: true });

    const jobOne = {
      jobId: 'renderops-job-001',
      status: 'approved',
      queue: 'lighting',
      createdAt: '2025-10-29T12:00:00Z',
      processedAt: '2025-10-29T13:00:00Z',
      actionableSegments: [
        { segmentId: 'seg-001', status: 'approved' },
        { segmentId: 'seg-002', status: 'approved' },
      ],
      packet: {
        id: 'packet-001',
        label: 'Crossroads Lighting Review',
        instructions: ['Verify neon rim bounce on walkway segments.'],
      },
    };

    const jobTwo = {
      jobId: 'renderops-job-002',
      status: 'in-review',
      queue: 'feedback',
      createdAt: '2025-10-30T08:00:00Z',
      processedAt: '2025-10-30T09:30:00Z',
      actionableSegments: [
        { segmentId: 'seg-010', status: 'pending' },
        { segmentId: 'seg-011', status: 'rework' },
      ],
      packet: {
        id: 'packet-002',
        label: 'Downtown Ambient Sweep',
        instructions: ['Tighten fog card contrast on upper balcony.'],
      },
    };

    await fs.writeFile(
      path.join(telemetryDir, 'renderops-job-001.json'),
      `${JSON.stringify(jobOne, null, 2)}\n`,
      'utf8'
    );
    await fs.writeFile(
      path.join(telemetryDir, 'renderops-job-002.json'),
      `${JSON.stringify(jobTwo, null, 2)}\n`,
      'utf8'
    );

    const scriptPath = path.resolve(process.cwd(), 'scripts/art/monitorRenderOpsApprovals.js');
    const result = spawnSync('node', [scriptPath, '--quiet'], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);

    const summaryPath = path.join(tmpDir, 'reports', 'art', 'renderops-approval-summary.json');
    const summary = JSON.parse(fsSync.readFileSync(summaryPath, 'utf8'));

    expect(summary.totalJobs).toBe(2);
    expect(summary.jobStatusTotals.approved).toBe(1);
    expect(summary.jobStatusTotals['in-review']).toBe(1);
    expect(summary.queueTotals.lighting).toBe(1);
    expect(summary.queueTotals.feedback).toBe(1);
    expect(summary.actionableSegmentsByStatus.approved).toBe(2);
    expect(summary.actionableSegmentsByStatus.pending).toBe(1);
    expect(summary.actionableSegmentsByStatus.rework).toBe(1);
    expect(summary.totalPendingSegments).toBe(2);
    expect(summary.totalApprovedSegments).toBe(2);

    expect(Array.isArray(summary.entries)).toBe(true);
    const [firstEntry] = summary.entries;
    expect(firstEntry.statusBreakdown).toBeDefined();
  });
});
