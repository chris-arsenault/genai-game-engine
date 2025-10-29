import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

/**
 * CiArtifactPublisher
 *
 * Prepares SaveManager telemetry artifacts for CI consumption by writing
 * metadata manifests and optionally executing upload commands. Designed to be
 * orchestrated by the export CLI after filesystem writers persist artifacts.
 */
export class CiArtifactPublisher {
  /**
   * @param {Object} options
   * @param {Function} [options.commandRunner] - Executes shell commands. Defaults to spawn-based runner.
   * @param {string} [options.metadataPath='./telemetry-artifacts/ci-artifacts.json'] - Where to write metadata manifest.
   * @param {Object} [options.env=process.env] - Environment variables used for CI detection and command execution.
   * @param {boolean|null} [options.dryRun=null] - Force dry-run (skip commands). Defaults to !env.CI.
   * @param {Array} [options.commands=[]] - Upload commands (string, array, or {command, args, env, cwd} objects).
   * @param {Object} [options.logger=console] - Logger interface.
   * @param {import('../../engine/events/EventBus.js').EventBus|null} [options.eventBus=null] - Optional EventBus for telemetry events.
   * @param {typeof fs} [options.fsModule=fs] - Dependency injection for tests.
   */
  constructor({
    commandRunner = defaultCommandRunner,
    metadataPath = './telemetry-artifacts/ci-artifacts.json',
    env = typeof process !== 'undefined' ? process.env : {},
    dryRun = null,
    commands = [],
    logger = console,
    eventBus = null,
    fsModule = fs,
    fallbackUploaders = [],
  } = {}) {
    this.commandRunner = commandRunner;
    this.metadataPath = metadataPath;
    this.env = env || {};
    this.logger = logger || console;
    this.eventBus = eventBus;
    this.fs = fsModule;
    this.commands = Array.isArray(commands) ? commands.map(normalizeCommand) : [];
    this.dryRun = typeof dryRun === 'boolean' ? dryRun : !Boolean(this.env?.CI);
    this.fallbackUploaders = Array.isArray(fallbackUploaders) ? fallbackUploaders : [];
  }

  /**
   * Publish collected artifact paths into CI-friendly outputs.
   * @param {string[]} artifactPaths
   * @param {Object} [context={}]
   * @returns {Promise<{metadataPath: string, metadata: Object, commandResults: Array}>}
   */
  async publish(artifactPaths, context = {}) {
    const resolvedPaths = this.#normalizeArtifactPaths(artifactPaths);
    const resolvedMetadataPath = path.resolve(this.metadataPath);

    const basePayload = {
      artifactCount: resolvedPaths.length,
      metadataPath: resolvedMetadataPath,
      commands: this.commands.map((entry) => entry.command),
      dryRun: this.dryRun,
      context,
    };

    this.#emitEvent('telemetry:ci_publish_started', basePayload);

    const generatedAt = Date.now();
    const metadata = {
      generatedAt,
      generatedIso: new Date(generatedAt).toISOString(),
      dryRun: this.dryRun,
      artifacts: resolvedPaths.map((filepath) => ({
        filepath,
        filename: path.basename(filepath),
      })),
      context,
    };

    let metadataDirty = false;
    try {
      await this.#ensureDirectory(path.dirname(resolvedMetadataPath));
      await this.fs.writeFile(resolvedMetadataPath, JSON.stringify(metadata, null, 2), { encoding: 'utf8' });

      if (this.dryRun || this.commands.length === 0) {
        this.logger?.info?.('[CiArtifactPublisher] Dry run or no commands configured', {
          metadataPath: resolvedMetadataPath,
          artifactCount: resolvedPaths.length,
        });
        this.#emitEvent('telemetry:ci_publish_completed', {
          ...basePayload,
          commandResults: [],
        });
        return {
          metadataPath: resolvedMetadataPath,
          metadata,
          commandResults: [],
        };
      }

      const commandResults = [];
      let fallbackInvoked = false;
      for (const entry of this.commands) {
        try {
          const result = await this.commandRunner(entry.command, entry.args, {
            env: { ...this.env, ...(entry.env || {}) },
            cwd: entry.cwd || process.cwd(),
          });

          const exitCode = typeof result?.exitCode === 'number' ? result.exitCode : 0;
          const normalizedResult = {
            command: entry.command,
            args: [...entry.args],
            exitCode,
            stdout: result?.stdout ?? '',
            stderr: result?.stderr ?? '',
            status: exitCode === 0 ? 'succeeded' : 'failed',
            skippedReason: null,
            errorMessage: null,
            errorCode: null,
          };

          if (result && typeof result === 'object') {
            for (const [key, value] of Object.entries(result)) {
              if (!(key in normalizedResult)) {
                normalizedResult[key] = value;
              }
            }
          }

          commandResults.push(normalizedResult);

          if (exitCode !== 0) {
            this.logger?.warn?.('[CiArtifactPublisher] Command exited with non-zero code', {
              command: entry.command,
              exitCode,
            });
          }
        } catch (error) {
          if (this.#isCommandMissingError(error)) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger?.warn?.('[CiArtifactPublisher] Command missing; skipping execution', {
              command: entry.command,
              message,
            });
            const skipResult = {
              command: entry.command,
              args: [...entry.args],
              exitCode: 127,
              stdout: '',
              stderr: '',
              status: 'skipped',
              skippedReason: 'command_not_found',
              errorMessage: message,
              errorCode: typeof error === 'object' && error?.code ? error.code : null,
              durationMs: 0,
            };
            commandResults.push(skipResult);

            if (!fallbackInvoked && this.fallbackUploaders.length > 0) {
              fallbackInvoked = true;
              const fallbackResults = await this.#runFallbackUploaders(resolvedPaths, {
                metadata,
                context,
              });
              if (fallbackResults.length > 0) {
                commandResults.push(...fallbackResults);
                metadataDirty = this.#appendFallbackResults(metadata, fallbackResults) || metadataDirty;
              }
            }
            continue;
          }

          throw error;
        }
      }

      this.#emitEvent('telemetry:ci_publish_completed', {
        ...basePayload,
        commandResults,
      });

      if (metadataDirty) {
        await this.fs.writeFile(resolvedMetadataPath, JSON.stringify(metadata, null, 2), { encoding: 'utf8' });
      }

      return {
        metadataPath: resolvedMetadataPath,
        metadata,
        commandResults,
      };
    } catch (error) {
      this.logger?.error?.('[CiArtifactPublisher] Publish failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      this.#emitEvent('telemetry:ci_publish_failed', {
        ...basePayload,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async #ensureDirectory(dir) {
    await this.fs.mkdir(dir, { recursive: true });
  }

  async #runFallbackUploaders(artifactPaths, { metadata, context } = {}) {
    const results = [];
    for (const uploader of this.fallbackUploaders) {
      if (!uploader || typeof uploader.upload !== 'function') {
        continue;
      }
      try {
        const rawResult = await uploader.upload(artifactPaths, {
          artifactDir: context?.artifactDir ?? metadata?.context?.artifactDir ?? null,
          artifactName: context?.artifactName ?? context?.prefix ?? metadata?.context?.artifactName ?? null,
          retentionDays: context?.retentionDays ?? metadata?.context?.retentionDays ?? null,
          context,
        });
        if (rawResult) {
          results.push(this.#normalizeFallbackResult(rawResult));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger?.error?.('[CiArtifactPublisher] Fallback uploader failed', {
          uploader: uploader?.constructor?.name ?? 'unknown',
          message,
        });
        results.push({
          command: uploader?.commandLabel ?? 'fallback',
          args: [],
          exitCode: 1,
          stdout: '',
          stderr: '',
          status: 'failed',
          skippedReason: null,
          errorMessage: message,
          errorCode: error?.code ?? null,
          provider: uploader?.provider ?? 'fallback',
        });
      }
    }
    return results;
  }

  #appendFallbackResults(metadata, fallbackResults) {
    if (!metadata || !Array.isArray(fallbackResults) || fallbackResults.length === 0) {
      return false;
    }

    if (!Array.isArray(metadata.providerResults)) {
      metadata.providerResults = [];
    }

    const timestamp = new Date().toISOString();
    for (const result of fallbackResults) {
      metadata.providerResults.push({
        provider: result.provider ?? 'fallback',
        attemptedAt: result.attemptedAt ?? timestamp,
        status: result.status ?? 'unknown',
        exitCode: result.exitCode ?? 0,
        durationMs: result.durationMs ?? 0,
        artifactName: result.artifactName ?? null,
        artifactDir: result.artifactDir ?? null,
        fileCount: Array.isArray(result.files) ? result.files.length : 0,
        files: Array.isArray(result.files) ? result.files : [],
        skippedReason: result.skippedReason ?? null,
        command: result.command ?? null,
        args: Array.isArray(result.args) ? result.args : [],
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      });
    }

    return true;
  }

  #normalizeFallbackResult(raw) {
    if (!raw || typeof raw !== 'object') {
      return {
        command: 'fallback',
        args: [],
        exitCode: 0,
        stdout: '',
        stderr: '',
        status: 'skipped',
        skippedReason: 'fallback_no_result',
      };
    }

    const normalized = {
      command:
        typeof raw.command === 'string'
          ? raw.command
          : raw.provider
            ? `${raw.provider}:fallback`
            : 'fallback',
      args: Array.isArray(raw.args) ? [...raw.args] : [],
      exitCode: typeof raw.exitCode === 'number' ? raw.exitCode : null,
      stdout: typeof raw.stdout === 'string' ? raw.stdout : '',
      stderr: typeof raw.stderr === 'string' ? raw.stderr : '',
      status: typeof raw.status === 'string' ? raw.status : null,
      skippedReason: raw.skippedReason ?? null,
      errorMessage: raw.errorMessage ?? null,
      errorCode: raw.errorCode ?? null,
    };

    if (normalized.exitCode === null) {
      if (normalized.status === 'uploaded' || normalized.status === 'succeeded') {
        normalized.exitCode = 0;
      } else if (normalized.status === 'failed') {
        normalized.exitCode = 1;
      } else {
        normalized.exitCode = 0;
      }
    }

    if (!normalized.status) {
      normalized.status = normalized.exitCode === 0 ? 'succeeded' : 'failed';
    }

    for (const [key, value] of Object.entries(raw)) {
      if (!(key in normalized)) {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  #normalizeArtifactPaths(paths) {
    if (!Array.isArray(paths)) {
      return [];
    }
    const results = [];
    for (const candidate of paths) {
      if (!candidate || typeof candidate !== 'string') {
        continue;
      }
      results.push(path.resolve(candidate));
    }
    return Array.from(new Set(results));
  }

  #emitEvent(eventName, payload) {
    if (!this.eventBus?.emit) {
      return;
    }
    try {
      this.eventBus.emit(eventName, payload);
    } catch (error) {
      this.logger?.warn?.('[CiArtifactPublisher] Event emit failed', {
        eventName,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  #isCommandMissingError(error) {
    if (!error) {
      return false;
    }

    if (error.code === 'ENOENT') {
      return true;
    }

    const message =
      typeof error.message === 'string'
        ? error.message
        : typeof error === 'string'
          ? error
          : '';

    if (!message) {
      return false;
    }

    const normalized = message.toLowerCase();
    return normalized.includes('enoent') || normalized.includes('not found') || normalized.includes('is not recognized');
  }
}

async function defaultCommandRunner(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...(options || {}),
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr?.on('data', (chunk) => stderrChunks.push(chunk));

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

function normalizeCommand(entry, index) {
  if (!entry) {
    throw new Error(`commands[${index}] is invalid`);
  }

  if (typeof entry === 'string') {
    return { command: entry, args: [] };
  }

  if (Array.isArray(entry) && entry.length > 0) {
    return { command: entry[0], args: entry.slice(1) };
  }

  if (typeof entry === 'object' && typeof entry.command === 'string') {
    return {
      command: entry.command,
      args: Array.isArray(entry.args) ? entry.args : [],
      env: entry.env,
      cwd: entry.cwd,
    };
  }

  throw new Error(`commands[${index}] must be a string, array, or object with a command property.`);
}
