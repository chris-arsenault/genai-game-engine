import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('dispatchQuestTelemetrySummary CLI', () => {
  it('copies the summary and generates a manifest for analytics handoff', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'telemetry-dispatch-'));
    const summaryPath = path.resolve(
      process.cwd(),
      'telemetry-artifacts/reports/act2-crossroads-parity-summary.json'
    );

    await execFileAsync('node', [
      path.resolve(
        process.cwd(),
        'scripts/telemetry/dispatchQuestTelemetrySummary.js'
      ),
      `--summary=${summaryPath}`,
      `--out-dir=${tempDir}`,
      '--label=test-dispatch',
      '--recipient=analytics@thememorysyndicate',
      '--note=Share with data platform',
      '--include-samples',
    ]);

    const dispatchDir = path.join(tempDir, 'test-dispatch');
    const manifestPath = path.join(dispatchDir, 'dispatch-manifest.json');
    const readmePath = path.join(dispatchDir, 'README.md');
    const copiedSummaryPath = path.join(
      dispatchDir,
      path.basename(summaryPath)
    );

    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    expect(manifest.summary).toEqual(
      expect.objectContaining({
        filename: path.basename(summaryPath),
        checksum: expect.stringMatching(/^sha256:[0-9a-f]+$/),
        ok: true,
      })
    );
    expect(manifest.recipients).toContain('analytics@thememorysyndicate');
    expect(manifest.notes).toContain('Share with data platform');
    expect(manifest.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'sample',
          filename: expect.any(String),
        }),
      ])
    );

    const readme = await readFile(readmePath, 'utf8');
    expect(readme).toContain('Quest Telemetry Parity Dispatch');
    expect(readme).toContain('analytics@thememorysyndicate');

    const summaryStats = await stat(copiedSummaryPath);
    expect(summaryStats.isFile()).toBe(true);

    await rm(tempDir, { recursive: true, force: true });
  });
});
