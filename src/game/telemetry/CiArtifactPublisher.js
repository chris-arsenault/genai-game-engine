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
  } = {}) {
    this.commandRunner = commandRunner;
    this.metadataPath = metadataPath;
    this.env = env || {};
    this.logger = logger || console;
    this.eventBus = eventBus;
    this.fs = fsModule;
    this.commands = Array.isArray(commands) ? commands.map(normalizeCommand) : [];
    this.dryRun = typeof dryRun === 'boolean' ? dryRun : !Boolean(this.env?.CI);
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
      for (const entry of this.commands) {
        const result = await this.commandRunner(entry.command, entry.args, {
          env: { ...this.env, ...(entry.env || {}) },
          cwd: entry.cwd || process.cwd(),
        });
        commandResults.push({
          command: entry.command,
          args: [...entry.args],
          ...result,
        });
      }

      this.#emitEvent('telemetry:ci_publish_completed', {
        ...basePayload,
        commandResults,
      });

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

