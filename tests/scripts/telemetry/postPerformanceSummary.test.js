import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  buildHistoryFileName,
  persistBaselineHistory,
  ensureHistorySeeded,
  listHistoryEntries,
} from '../../../scripts/telemetry/postPerformanceSummary.js';

async function createTempFile(prefix, content = '{}') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dir, 'baseline.json');
  await fs.writeFile(filePath, content, 'utf8');
  return { dir, filePath };
}

describe('postPerformanceSummary helpers', () => {
  test('buildHistoryFileName formats timestamp and runs', () => {
    const fileName = buildHistoryFileName(
      {
        generatedAt: '2025-10-31T12:34:56.000Z',
        runs: 5,
      },
      '2025-10-31T12:00:00.000Z'
    );
    expect(fileName).toBe('baseline-2025-10-31T12-34-56.000Z-r05.json');
  });

  test('persistBaselineHistory copies baseline to history directory', async () => {
    const { dir, filePath } = await createTempFile('baseline-history-');
    const historyDir = path.join(dir, 'history');
    process.env.TELEMETRY_BASELINE_HISTORY_DIR = historyDir;

    try {
      const summary = {
        generatedAt: '2025-10-31T09:45:00.000Z',
        runs: 3,
      };
      await fs.writeFile(filePath, JSON.stringify({ metrics: {} }), 'utf8');
      const dest = await persistBaselineHistory(filePath, summary);
      const stats = await fs.stat(dest);
      expect(stats.isFile()).toBe(true);
    } finally {
      delete process.env.TELEMETRY_BASELINE_HISTORY_DIR;
    }
  });

  test('ensureHistorySeeded seeds archive when empty', async () => {
    const { filePath } = await createTempFile('baseline-seed-');
    const summary = {
      generatedAt: '2025-10-31T10:00:00.000Z',
      runs: 5,
    };

    const seededPath = await ensureHistorySeeded(filePath, summary);
    expect(seededPath).toBeTruthy();
    const stats = await fs.stat(seededPath);
    expect(stats.isFile()).toBe(true);

    // Second call should detect existing history and skip seeding.
    const secondSeed = await ensureHistorySeeded(filePath, summary);
    expect(secondSeed).toBeNull();
  });

  test('listHistoryEntries reports recent history files', async () => {
    const { dir, filePath } = await createTempFile('baseline-history-list-');
    const historyDir = path.join(dir, 'history');
    await fs.mkdir(historyDir);

    const older = path.join(historyDir, 'baseline-2025-10-29T00-00-00.000Z-r05.json');
    const newer = path.join(historyDir, 'baseline-2025-10-30T12-00-00.000Z-r05.json');

    await fs.writeFile(filePath, '{}', 'utf8');
    await fs.writeFile(older, '{}', 'utf8');
    await fs.writeFile(newer, '{}', 'utf8');

    const olderDate = new Date('2025-10-29T00:00:00.000Z');
    const newerDate = new Date('2025-10-30T12:00:00.000Z');
    await fs.utimes(older, olderDate, olderDate);
    await fs.utimes(newer, newerDate, newerDate);

    const entries = await listHistoryEntries(filePath, 5);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].name).toBe('baseline-2025-10-30T12-00-00.000Z-r05.json');
    expect(entries[0].modifiedAt).toBe(newerDate.toISOString());
    expect(entries[1].name).toBe('baseline-2025-10-29T00-00-00.000Z-r05.json');
  });
});
