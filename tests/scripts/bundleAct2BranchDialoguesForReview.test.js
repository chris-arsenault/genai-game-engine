import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('bundleAct2BranchDialoguesForReview CLI', () => {
  it('captures self-review notes during bundle creation', async () => {
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
      '--note=Check branch 3 pacing',
    ]);

    const manifestPath = path.join(tempDir, 'review-manifest.json');
    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    expect(Array.isArray(manifest.notes)).toBe(true);
    expect(manifest.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Check branch 3 pacing',
          createdAt: expect.any(String),
        }),
      ])
    );

    await rm(tempDir, { recursive: true, force: true });
  });

  it('appends notes in manifest-only mode', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'act2-bundle-test-'));
    const summaryPath = path.resolve(
      process.cwd(),
      'telemetry-artifacts/act2-branch-dialogues-summary.json'
    );

    await execFileAsync('node', [
      path.resolve(
        process.cwd(),
        'scripts/narrative/bundleAct2BranchDialoguesForReview.js'
      ),
      `--summary=${summaryPath}`,
      `--out-dir=${tempDir}`,
      '--label=jtest',
    ]);

    const manifestPath = path.join(tempDir, 'review-manifest.json');

    await execFileAsync('node', [
      path.resolve(
        process.cwd(),
        'scripts/narrative/bundleAct2BranchDialoguesForReview.js'
      ),
      `--manifest-only=${manifestPath}`,
      '--note=Localization polish pending',
      '--note=Revisit VO cues after mix pass',
    ]);

    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    expect(manifest.notes).toHaveLength(2);
    expect(manifest.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Localization polish pending',
          createdAt: expect.any(String),
        }),
        expect.objectContaining({
          message: 'Revisit VO cues after mix pass',
          createdAt: expect.any(String),
        }),
      ])
    );

    await rm(tempDir, { recursive: true, force: true });
  });
});
