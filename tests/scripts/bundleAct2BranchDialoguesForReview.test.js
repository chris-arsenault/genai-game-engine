import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('bundleAct2BranchDialoguesForReview CLI', () => {
  it('seeds approvals based on CLI options', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'act2-bundle-test-'));
    const summaryPath = path.resolve(
      process.cwd(),
      'telemetry-artifacts/act2-branch-dialogues-summary.json'
    );
    const markdownPath = path.resolve(
      process.cwd(),
      'telemetry-artifacts/act2-branch-dialogues-summary.md'
    );
    const changesPath = path.resolve(
      process.cwd(),
      'telemetry-artifacts/act2-branch-dialogues-changes.json'
    );

    await execFileAsync('node', [
      path.resolve(
        process.cwd(),
        'scripts/narrative/bundleAct2BranchDialoguesForReview.js'
      ),
      `--summary=${summaryPath}`,
      `--markdown=${markdownPath}`,
      `--changes=${changesPath}`,
      `--out-dir=${tempDir}`,
      '--label=jtest',
      '--approver=Zara Ellis:Lead Writer',
      '--mark-approval=Dana Singh:Localization:approved:LGTM',
    ]);

    const manifestPath = path.join(tempDir, 'review-manifest.json');
    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    expect(Array.isArray(manifest.approvals)).toBe(true);
    expect(manifest.approvals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reviewer: 'Zara Ellis',
          role: 'Lead Writer',
          status: 'pending',
          requestedAt: expect.any(String),
          updatedAt: null,
        }),
        expect.objectContaining({
          reviewer: 'Dana Singh',
          role: 'Localization',
          status: 'approved',
          notes: 'LGTM',
          updatedAt: expect.any(String),
        }),
      ])
    );

    await rm(tempDir, { recursive: true, force: true });
  });
});
