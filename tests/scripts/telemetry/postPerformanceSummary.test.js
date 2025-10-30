import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  buildHistoryFileName,
  persistBaselineHistory,
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
});
