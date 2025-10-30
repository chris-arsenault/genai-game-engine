import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { CiArtifactPublisher } from '../../../src/game/telemetry/CiArtifactPublisher.js';

describe('CiArtifactPublisher', () => {
  let tempDir;
  let artifactDir;
  let artifactPath;
  let logger;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-publisher-'));
    artifactDir = path.join(tempDir, 'artifacts');
    await fs.mkdir(artifactDir, { recursive: true });
    artifactPath = path.join(artifactDir, 'summary.json');
    await fs.writeFile(artifactPath, '{"hello":"world"}\n', 'utf8');
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  test('writes metadata manifest and respects dry-run', async () => {
    const metadataPath = path.join(tempDir, 'ci-metadata.json');
    const publisher = new CiArtifactPublisher({
      metadataPath,
      dryRun: true,
      logger,
      env: { CI: '' },
    });

    const result = await publisher.publish([artifactPath], { runId: 'local' });

    expect(result.metadataPath).toBe(path.resolve(metadataPath));
    expect(result.commandResults).toEqual([]);

    const manifest = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    expect(manifest.dryRun).toBe(true);
    expect(manifest.context).toEqual({ runId: 'local' });
    expect(manifest.artifacts).toHaveLength(1);
    expect(manifest.artifacts[0]).toEqual(
      expect.objectContaining({
        filepath: path.resolve(artifactPath),
        filename: 'summary.json',
      })
    );
    expect(manifest.fallbackSummary).toEqual({
      attempted: false,
      attempts: 0,
      succeeded: 0,
      failed: 0,
      partial: 0,
      skipped: 0,
      lastAttemptedAt: null,
      providers: {},
    });

    expect(result.metadata.fallbackSummary).toEqual(manifest.fallbackSummary);
  });

  test('executes configured commands when not in dry-run', async () => {
    const metadataPath = path.join(tempDir, 'ci-metadata.json');
    const commandRunner = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: 'uploaded',
      stderr: '',
    });

    const publisher = new CiArtifactPublisher({
      metadataPath,
      dryRun: false,
      commands: [{ command: 'gh', args: ['run', 'upload-artifact'] }],
      commandRunner,
      env: { CI: 'true' },
      logger,
    });

    const result = await publisher.publish([artifactPath], { runId: 'ci' });

    expect(commandRunner).toHaveBeenCalledWith(
      'gh',
      ['run', 'upload-artifact'],
      expect.objectContaining({
        env: expect.objectContaining({ CI: 'true' }),
        cwd: expect.any(String),
      })
    );
    expect(result.commandResults).toEqual([
      expect.objectContaining({
        command: 'gh',
        args: ['run', 'upload-artifact'],
        exitCode: 0,
        status: 'succeeded',
        skippedReason: null,
      }),
    ]);
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Dry run'),
      expect.any(Object)
    );
  });

  test('emits lifecycle events with telemetry payloads', async () => {
    const eventBus = { emit: jest.fn() };
    const metadataPath = path.join(tempDir, 'ci-metadata.json');
    const publisher = new CiArtifactPublisher({
      metadataPath,
      dryRun: true,
      eventBus,
      logger,
    });

    await publisher.publish([artifactPath], { missionId: 'cascade' });

    expect(eventBus.emit).toHaveBeenCalledWith(
      'telemetry:ci_publish_started',
      expect.objectContaining({
        artifactCount: 1,
        context: { missionId: 'cascade' },
      })
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      'telemetry:ci_publish_completed',
      expect.objectContaining({
        artifactCount: 1,
        context: { missionId: 'cascade' },
      })
    );
  });

  test('emits failure event when command runner rejects', async () => {
    const metadataPath = path.join(tempDir, 'ci-metadata.json');
    const commandRunner = jest.fn().mockRejectedValue(new Error('upload failed'));
    const eventBus = { emit: jest.fn() };

    const publisher = new CiArtifactPublisher({
      metadataPath,
      dryRun: false,
      commands: [['gh', 'run', 'upload-artifact']],
      commandRunner,
      env: { CI: 'true' },
      eventBus,
      logger,
    });

    await expect(publisher.publish([artifactPath], { runId: 'ci' })).rejects.toThrow('upload failed');

    expect(eventBus.emit).toHaveBeenCalledWith(
      'telemetry:ci_publish_failed',
      expect.objectContaining({
        errorMessage: 'upload failed',
        context: { runId: 'ci' },
      })
    );
    expect(logger.error).toHaveBeenCalledWith(
      '[CiArtifactPublisher] Publish failed',
      expect.objectContaining({ message: 'upload failed' })
    );
  });

  test('skips missing command gracefully and records fallback result', async () => {
    const metadataPath = path.join(tempDir, 'ci-metadata.json');
    const missingError = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    const commandRunner = jest.fn().mockRejectedValue(missingError);

    const publisher = new CiArtifactPublisher({
      metadataPath,
      dryRun: false,
      commands: [{ command: 'gh', args: ['artifact', 'upload'] }],
      commandRunner,
      env: { CI: 'true' },
      logger,
    });

    const result = await publisher.publish([artifactPath], { runId: 'ci' });

    expect(result.commandResults).toHaveLength(1);
    expect(result.commandResults[0]).toEqual(
      expect.objectContaining({
        command: 'gh',
        status: 'skipped',
        skippedReason: 'command_not_found',
        exitCode: 127,
        errorMessage: expect.stringContaining('ENOENT'),
      })
    );
    expect(logger.warn).toHaveBeenCalledWith(
      '[CiArtifactPublisher] Command missing; skipping execution',
      expect.objectContaining({ command: 'gh', message: expect.stringContaining('ENOENT') })
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('invokes fallback uploaders when command is missing', async () => {
    const metadataPath = path.join(tempDir, 'ci-metadata.json');
    const missingError = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    const commandRunner = jest.fn().mockRejectedValue(missingError);
    const fallbackUploader = {
      upload: jest.fn().mockResolvedValue({
        provider: 'githubActionsApi',
        command: 'actions.artifact.upload',
        exitCode: 0,
        status: 'uploaded',
        files: [artifactPath],
        artifactDir,
        artifactName: 'ci-telemetry',
        durationMs: 10,
      }),
    };

    const publisher = new CiArtifactPublisher({
      metadataPath,
      dryRun: false,
      commands: [{ command: 'gh', args: ['artifact', 'upload'] }],
      commandRunner,
      env: { CI: 'true' },
      logger,
      fallbackUploaders: [fallbackUploader],
    });

    const result = await publisher.publish([artifactPath], {
      runId: 'ci',
      artifactDir,
      prefix: 'ci-telemetry',
    });

    expect(fallbackUploader.upload).toHaveBeenCalledWith(
      [path.resolve(artifactPath)],
      expect.objectContaining({
        artifactDir,
        artifactName: 'ci-telemetry',
      })
    );

    expect(result.commandResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'githubActionsApi',
          status: 'uploaded',
          exitCode: 0,
        }),
      ])
    );

    expect(result.metadata.providerResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'githubActionsApi',
          status: 'uploaded',
        }),
      ])
    );

    expect(result.metadata.fallbackSummary).toEqual(
      expect.objectContaining({
        attempted: true,
        attempts: 1,
        succeeded: 1,
        failed: 0,
        partial: 0,
        skipped: 0,
      })
    );

    const manifest = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    expect(manifest.providerResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'githubActionsApi',
          status: 'uploaded',
          fileCount: 1,
        }),
      ])
    );
    expect(manifest.fallbackSummary).toEqual(
      expect.objectContaining({
        attempted: true,
        attempts: 1,
        succeeded: 1,
        failed: 0,
        partial: 0,
        skipped: 0,
        lastAttemptedAt: expect.any(String),
      })
    );
    expect(manifest.fallbackSummary.providers).toEqual(
      expect.objectContaining({
        githubActionsApi: expect.objectContaining({
          attempts: 1,
          succeeded: 1,
          failed: 0,
          partial: 0,
          skipped: 0,
          lastAttemptedAt: expect.any(String),
        }),
      })
    );
  });
});
