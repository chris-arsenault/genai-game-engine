import { GitHubActionsArtifactFallback } from '../../../src/game/telemetry/GitHubActionsArtifactFallback.js';

describe('GitHubActionsArtifactFallback', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips upload when GitHub Actions runtime variables are absent', async () => {
    const fallback = new GitHubActionsArtifactFallback({
      artifactClientFactory: jest.fn(),
      env: {},
      logger,
    });

    const result = await fallback.upload(['/tmp/artifact.json'], {
      artifactDir: '/tmp',
      artifactName: 'telemetry',
    });

    expect(result.status).toBe('skipped');
    expect(result.skippedReason).toBe('environment_unavailable');
    expect(logger.info).toHaveBeenCalled();
  });

  it('uploads artifacts when the Actions API client succeeds', async () => {
    const uploadArtifact = jest.fn().mockResolvedValue({
      artifactName: 'telemetry',
      artifactItems: ['/tmp/artifact.json'],
      failedItems: [],
      size: 1024,
    });

    const fallback = new GitHubActionsArtifactFallback({
      artifactClientFactory: async () => ({ uploadArtifact }),
      env: {
        ACTIONS_RUNTIME_URL: 'https://actions-runtime.test',
        ACTIONS_RUNTIME_TOKEN: 'token',
        GITHUB_ACTIONS: 'true',
      },
      logger,
    });

    const result = await fallback.upload(['/tmp/artifact.json'], {
      artifactDir: '/tmp',
      artifactName: 'telemetry',
    });

    expect(uploadArtifact).toHaveBeenCalledWith(
      'telemetry',
      ['/tmp/artifact.json'],
      '/tmp',
      expect.objectContaining({
        continueOnError: false,
      })
    );
    expect(result.status).toBe('uploaded');
    expect(result.exitCode).toBe(0);
    expect(result.provider).toBe('githubActionsApi');
  });

  it('reports failure when the Actions API client throws', async () => {
    const fallback = new GitHubActionsArtifactFallback({
      artifactClientFactory: async () => ({
        uploadArtifact: () => {
          throw new Error('runtime failure');
        },
      }),
      env: {
        ACTIONS_RUNTIME_URL: 'https://actions-runtime.test',
        ACTIONS_RUNTIME_TOKEN: 'token',
        GITHUB_ACTIONS: 'true',
      },
      logger,
    });

    const result = await fallback.upload(['/tmp/artifact.json'], {
      artifactDir: '/tmp',
      artifactName: 'telemetry',
    });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('runtime failure');
    expect(logger.error).toHaveBeenCalledWith(
      '[GitHubActionsArtifactFallback] Upload failed',
      expect.objectContaining({
        artifactName: 'telemetry',
        message: 'runtime failure',
      })
    );
  });
});
