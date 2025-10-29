import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import {
  uploadWithGh,
  persistProviderResult,
} from '../../scripts/telemetry/providers/githubUpload.js';

describe('githubUpload provider script', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'github-upload-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('skips upload when metadata is a dry run', async () => {
    const result = await uploadWithGh(tempDir, { dryRun: true });
    expect(result.status).toBe('skipped');
    expect(result.skippedReason).toBe('dry_run');
    expect(result.exitCode).toBe(0);
  });

  it('skips upload when GitHub CLI is unavailable', async () => {
    const artifactPath = path.join(tempDir, 'artifact.json');
    await fs.writeFile(artifactPath, '{}', 'utf8');

    const metadata = {
      dryRun: false,
      artifacts: [{ filepath: artifactPath }],
      context: { prefix: 'ci-telemetry' },
    };

    const result = await uploadWithGh(tempDir, metadata, {
      commandExistsFn: async () => false,
      env: {},
    });

    expect(result.status).toBe('skipped');
    expect(result.skippedReason).toBe('gh_unavailable');
    expect(result.files).toContain(artifactPath);
  });

  it('falls back to Actions API when provided and GitHub CLI is unavailable', async () => {
    const artifactPath = path.join(tempDir, 'artifact.json');
    await fs.writeFile(artifactPath, '{}', 'utf8');

    const metadata = {
      dryRun: false,
      artifacts: [{ filepath: artifactPath }],
      context: { prefix: 'ci-telemetry' },
    };

    const fallbackUploader = {
      upload: jest.fn().mockResolvedValue({
        provider: 'githubActionsApi',
        status: 'uploaded',
        exitCode: 0,
        files: [artifactPath],
        artifactName: 'ci-telemetry',
        artifactDir: tempDir,
        durationMs: 12,
      }),
    };

    const result = await uploadWithGh(tempDir, metadata, {
      commandExistsFn: async () => false,
      env: {
        GITHUB_ACTIONS: 'true',
        ACTIONS_RUNTIME_URL: 'https://runtime',
        ACTIONS_RUNTIME_TOKEN: 'token',
      },
      fallbackUploader,
    });

    expect(fallbackUploader.upload).toHaveBeenCalledWith(
      [path.resolve(artifactPath)],
      expect.objectContaining({
        artifactDir: tempDir,
        artifactName: 'ci-telemetry',
      })
    );
    expect(result.status).toBe('uploaded');
    expect(result.transport).toBe('actions_api');
    expect(result.fallbackAttempted).toBe(true);
  });

  it('fails when artifacts listed in metadata are missing on disk', async () => {
    const missingPath = path.join(tempDir, 'missing.json');
    const metadata = {
      dryRun: false,
      artifacts: [{ filepath: missingPath }],
    };

    const result = await uploadWithGh(tempDir, metadata, {
      commandExistsFn: async () => true,
      env: {},
    });

    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    expect(result.skippedReason).toBe('missing_artifacts');
  });

  it('attempts fallback when GitHub CLI command fails', async () => {
    const artifactPath = path.join(tempDir, 'telemetry.json');
    await fs.writeFile(artifactPath, '{"ok":true}', 'utf8');

    const metadata = {
      dryRun: false,
      artifacts: [{ filepath: artifactPath }],
      context: { prefix: 'ci-telemetry' },
    };

    const fallbackUploader = {
      upload: jest.fn().mockResolvedValue({
        provider: 'githubActionsApi',
        status: 'uploaded',
        exitCode: 0,
        files: [artifactPath],
        artifactDir: tempDir,
        artifactName: 'ci-telemetry',
        durationMs: 8,
      }),
    };

    const runCommand = jest.fn().mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'network failure',
    });

    const result = await uploadWithGh(tempDir, metadata, {
      commandExistsFn: async () => true,
      runCommand,
      env: {
        GITHUB_ACTIONS: 'true',
        ACTIONS_RUNTIME_URL: 'https://runtime',
        ACTIONS_RUNTIME_TOKEN: 'token',
      },
      fallbackUploader,
    });

    expect(runCommand).toHaveBeenCalled();
    expect(fallbackUploader.upload).toHaveBeenCalled();
    expect(result.status).toBe('uploaded');
    expect(result.transport).toBe('actions_api');
    expect(result.previousResult).toEqual(
      expect.objectContaining({
        exitCode: 1,
        command: 'gh',
      })
    );
  });

  it('uploads artifacts when GitHub CLI succeeds', async () => {
    const artifactPath = path.join(tempDir, 'telemetry.json');
    await fs.writeFile(artifactPath, '{"ok":true}', 'utf8');

    const metadata = {
      dryRun: false,
      artifacts: [{ filepath: artifactPath }],
      context: { prefix: 'ci-telemetry' },
    };

    const runCommand = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: 'uploaded',
      stderr: '',
    });

    const result = await uploadWithGh(tempDir, metadata, {
      commandExistsFn: async () => true,
      runCommand,
      env: {},
    });

    expect(runCommand).toHaveBeenCalledTimes(1);
    const [command, args] = runCommand.mock.calls[0];
    expect(command).toBe('gh');
    expect(args[0]).toBe('artifact');
    expect(args[1]).toBe('upload');
    expect(args).toContain('ci-telemetry');
    expect(result.status).toBe('uploaded');
    expect(result.exitCode).toBe(0);
    expect(result.files).toEqual([artifactPath]);
  });

  it('persists provider results back to metadata manifest', async () => {
    const metadataPath = path.join(tempDir, 'ci-artifacts.json');
    const metadata = {
      dryRun: false,
      artifacts: [],
      providerResults: [],
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    const result = {
      provider: 'githubUpload',
      attemptedAt: new Date().toISOString(),
      status: 'uploaded',
      exitCode: 0,
      durationMs: 25,
      artifactName: 'ci-telemetry',
      artifactDir: tempDir,
      files: [path.join(tempDir, 'telemetry.json')],
      stdout: 'ok',
      stderr: '',
      command: 'gh',
      args: ['artifact', 'upload'],
      skippedReason: null,
      transport: 'github_cli',
      fallbackAttempted: false,
      fallbackDetails: null,
    };

    await persistProviderResult(metadataPath, metadata, result);

    expect(metadata.providerResults).toHaveLength(1);
    const persisted = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    expect(persisted.providerResults).toHaveLength(1);
    expect(persisted.providerResults[0].status).toBe('uploaded');
    expect(persisted.providerResults[0].artifactName).toBe('ci-telemetry');
    expect(persisted.providerResults[0].transport).toBe('github_cli');
  });
});
