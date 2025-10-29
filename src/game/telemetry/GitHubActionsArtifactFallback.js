import path from 'path';

/**
 * GitHubActionsArtifactFallback
 *
 * Attempts to upload telemetry artifacts using the GitHub Actions Artifact API.
 * Intended to run inside GitHub-hosted runners when the GitHub CLI is unavailable.
 */
export class GitHubActionsArtifactFallback {
  /**
   * @param {Object} options
   * @param {Function} [options.artifactClientFactory] - Lazy factory returning an artifact client (DefaultArtifactClient).
   * @param {Object} [options.logger=console] - Logger interface.
   * @param {Object} [options.env=process.env] - Environment variables (primarily from GitHub Actions runtime).
   */
  constructor({
    artifactClientFactory = defaultArtifactClientFactory,
    logger = console,
    env = typeof process !== 'undefined' ? process.env : {},
  } = {}) {
    this.artifactClientFactory = artifactClientFactory;
    this.logger = logger || console;
    this.env = env || {};
  }

  /**
   * Upload the provided artifacts using the GitHub Actions runtime API.
   * @param {string[]} artifactPaths
   * @param {Object} options
   * @param {string} [options.artifactDir]
   * @param {string} [options.artifactName]
   * @param {number|string|null} [options.retentionDays]
   * @param {Object} [options.context]
   * @returns {Promise<Object>} Command-style result payload.
   */
  async upload(artifactPaths, { artifactDir, artifactName, retentionDays, context = {} } = {}) {
    const env = this.env;

    if (!Array.isArray(artifactPaths) || artifactPaths.length === 0) {
      return this.#skip('no_artifacts', 'No artifact paths were supplied for fallback upload.');
    }

    if (!this.#isGithubActionsRuntime(env)) {
      return this.#skip(
        'environment_unavailable',
        'GitHub Actions runtime token/url not present; skipping artifact fallback.'
      );
    }

    const resolvedArtifactDir = artifactDir
      ? path.resolve(artifactDir)
      : this.#deriveArtifactDir(artifactPaths);

    if (!resolvedArtifactDir) {
      return this.#skip('artifact_dir_missing', 'Unable to resolve fallback artifact directory.');
    }

    const uploadName =
      artifactName ??
      context?.artifactName ??
      context?.prefix ??
      env?.GITHUB_ARTIFACT_NAME ??
      'telemetry-artifacts';

    const normalizedRetention = this.#normalizeRetention(retentionDays, context, env);

    try {
      const client = await this.artifactClientFactory();
      if (!client?.uploadArtifact) {
        return this.#skip('client_unavailable', 'Artifact client missing upload capability.');
      }

      const start = Date.now();
      const uploadResult = await client.uploadArtifact(uploadName, artifactPaths, resolvedArtifactDir, {
        continueOnError: false,
        ...(normalizedRetention !== null ? { retentionDays: normalizedRetention } : {}),
      });
      const durationMs = Date.now() - start;

      const failedItems = Array.isArray(uploadResult?.failedItems) ? uploadResult.failedItems : [];
      const status = failedItems.length === 0 ? 'uploaded' : 'partial';

      if (status === 'uploaded') {
        this.logger?.info?.('[GitHubActionsArtifactFallback] Uploaded telemetry artifacts via Actions API', {
          artifactName: uploadResult?.artifactName ?? uploadName,
          fileCount: artifactPaths.length,
          durationMs,
        });
      } else {
        this.logger?.warn?.('[GitHubActionsArtifactFallback] Partial upload via Actions API', {
          artifactName: uploadResult?.artifactName ?? uploadName,
          failedItems,
        });
      }

      return {
        provider: 'githubActionsApi',
        command: 'actions.artifact.upload',
        args: [],
        exitCode: failedItems.length === 0 ? 0 : 1,
        status,
        skippedReason: null,
        stdout: '',
        stderr:
          failedItems.length === 0 ? '' : `Failed to upload ${failedItems.length} item(s): ${failedItems.join(', ')}`,
        durationMs,
        artifactName: uploadResult?.artifactName ?? uploadName,
        artifactDir: resolvedArtifactDir,
        files: artifactPaths,
        details: {
          itemCount: Array.isArray(uploadResult?.artifactItems)
            ? uploadResult.artifactItems.length
            : artifactPaths.length,
          failedItems,
          size: uploadResult?.size ?? null,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error?.('[GitHubActionsArtifactFallback] Upload failed', {
        artifactName: uploadName,
        message,
      });
      return {
        provider: 'githubActionsApi',
        command: 'actions.artifact.upload',
        args: [],
        exitCode: 1,
        status: 'failed',
        skippedReason: null,
        stdout: '',
        stderr: '',
        errorMessage: message,
        errorCode: error?.code ?? null,
        durationMs: null,
        artifactName: uploadName,
        artifactDir: resolvedArtifactDir,
        files: artifactPaths,
      };
    }
  }

  #deriveArtifactDir(artifactPaths) {
    if (!Array.isArray(artifactPaths) || artifactPaths.length === 0) {
      return null;
    }
    const dirs = artifactPaths
      .filter((entry) => typeof entry === 'string' && entry)
      .map((entry) => path.dirname(path.resolve(entry)));

    if (dirs.length === 0) {
      return null;
    }

    // If multiple directories, fall back to their common ancestor.
    let current = dirs[0];
    for (const dir of dirs.slice(1)) {
      current = this.#commonDir(current, dir);
      if (!current) {
        break;
      }
    }
    return current || path.dirname(path.resolve(artifactPaths[0]));
  }

  #commonDir(dirA, dirB) {
    const partsA = path.resolve(dirA).split(path.sep);
    const partsB = path.resolve(dirB).split(path.sep);
    const length = Math.min(partsA.length, partsB.length);
    const shared = [];

    for (let index = 0; index < length; index += 1) {
      if (partsA[index] !== partsB[index]) {
        break;
      }
      shared.push(partsA[index]);
    }

    return shared.length ? shared.join(path.sep) : null;
  }

  #normalizeRetention(retentionDays, context, env) {
    const candidate =
      retentionDays ?? context?.retentionDays ?? env?.GITHUB_ARTIFACT_RETENTION_DAYS ?? null;
    if (candidate === null || candidate === undefined) {
      return null;
    }
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  }

  #isGithubActionsRuntime(env) {
    if (!env) {
      return false;
    }
    const hasRuntime = Boolean(env.ACTIONS_RUNTIME_URL && env.ACTIONS_RUNTIME_TOKEN);
    const isActions = env.GITHUB_ACTIONS === 'true' || env.RUNNER_NAME !== undefined;
    return hasRuntime && isActions;
  }

  #skip(reason, message) {
    if (message) {
      this.logger?.info?.('[GitHubActionsArtifactFallback] Skipping Actions API upload', {
        reason,
        message,
      });
    }
    return {
      provider: 'githubActionsApi',
      command: 'actions.artifact.upload',
      args: [],
      exitCode: 0,
      status: 'skipped',
      skippedReason: reason,
      stdout: '',
      stderr: '',
      durationMs: null,
      artifactName: null,
      artifactDir: null,
      files: [],
    };
  }
}

async function defaultArtifactClientFactory() {
  const module = await import('@actions/artifact');
  const DefaultArtifactClient = module?.DefaultArtifactClient ?? module?.create ?? null;
  if (!DefaultArtifactClient) {
    throw new Error('Unable to load @actions/artifact DefaultArtifactClient.');
  }
  return new DefaultArtifactClient();
}
