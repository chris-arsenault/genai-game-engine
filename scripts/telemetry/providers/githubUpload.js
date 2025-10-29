#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_ARTIFACT_NAME = 'inspector-telemetry';
const MAX_LOG_LENGTH = 2000;

function resolvePath(input, fallback) {
  if (!input) {
    return path.resolve(fallback);
  }
  return path.isAbsolute(input) ? input : path.resolve(input);
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const checkCommand = process.platform === 'win32' ? 'where' : 'command';
    const args = process.platform === 'win32' ? [command] : ['-v', command];
    const child = spawn(checkCommand, args, {
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function readMetadata(metadataPath) {
  try {
    const raw = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[telemetry-provider] Failed to read CI metadata manifest', {
      metadataPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function fileExists(fsModule, filepath) {
  try {
    await fsModule.access(filepath);
    return true;
  } catch {
    return false;
  }
}

function truncate(value, limit = MAX_LOG_LENGTH) {
  if (!value) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.length <= limit) {
    return stringValue;
  }
  return `${stringValue.slice(0, limit)}…`;
}

async function defaultRunCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...(options || {}),
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr?.on('data', (chunk) => stderrChunks.push(chunk));

    const finalize = (code, error) => {
      resolve({
        exitCode: typeof code === 'number' ? code : 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        error: error ?? null,
      });
    };

    child.on('error', (error) => {
      finalize(1, error);
    });

    child.on('close', (code) => {
      finalize(code ?? 0, null);
    });
  });
}

function normalizeArtifactPaths(metadata, artifactDir) {
  if (!metadata?.artifacts) {
    return [];
  }
  const resolved = [];
  for (const entry of metadata.artifacts) {
    if (!entry) {
      continue;
    }
    if (entry.filepath) {
      resolved.push(path.resolve(entry.filepath));
      continue;
    }
    if (entry.filename) {
      resolved.push(path.resolve(artifactDir, entry.filename));
    }
  }
  return Array.from(new Set(resolved));
}

export async function uploadWithGh(
  artifactDir,
  metadata,
  {
    commandName = process.env.GITHUB_CLI || 'gh',
    commandExistsFn = commandExists,
    runCommand = defaultRunCommand,
    fsModule = fs,
    env = process.env,
    cwd = process.cwd(),
  } = {}
) {
  const startedAt = Date.now();
  const baseResult = {
    provider: 'githubUpload',
    attemptedAt: new Date(startedAt).toISOString(),
    artifactDir,
    artifactName: null,
    files: [],
    exitCode: 0,
    status: 'skipped',
    skippedReason: null,
    durationMs: 0,
    command: null,
    args: [],
    stdout: '',
    stderr: '',
  };

  if (!metadata) {
    return {
      ...baseResult,
      skippedReason: 'metadata_unavailable',
    };
  }

  if (metadata.dryRun) {
    console.info('[telemetry-provider] Metadata indicates dry run; skipping upload.');
    return {
      ...baseResult,
      skippedReason: 'dry_run',
    };
  }

  const artifactPaths = normalizeArtifactPaths(metadata, artifactDir);
  if (artifactPaths.length === 0) {
    console.warn('[telemetry-provider] No artifacts listed in metadata; skipping upload.');
    return {
      ...baseResult,
      skippedReason: 'no_artifacts',
    };
  }

  const existingPaths = [];
  for (const candidate of artifactPaths) {
    if (await fileExists(fsModule, candidate)) {
      existingPaths.push(candidate);
    } else {
      console.warn('[telemetry-provider] Artifact file missing', { filepath: candidate });
    }
  }

  if (existingPaths.length === 0) {
    console.error('[telemetry-provider] All artifact files are missing; aborting upload.');
    return {
      ...baseResult,
      exitCode: 1,
      status: 'failed',
      skippedReason: 'missing_artifacts',
    };
  }

  const ghAvailable = await commandExistsFn(commandName);
  if (!ghAvailable) {
    console.info('[telemetry-provider] GitHub CLI not found; skipping telemetry upload.');
    return {
      ...baseResult,
      files: existingPaths,
      skippedReason: 'gh_unavailable',
    };
  }

  const artifactName =
    env?.GITHUB_ARTIFACT_NAME ||
    metadata?.context?.artifactName ||
    metadata?.context?.prefix ||
    DEFAULT_ARTIFACT_NAME;

  const retentionDays =
    metadata?.context?.retentionDays ??
    env?.GITHUB_ARTIFACT_RETENTION_DAYS ??
    null;

  const repo = env?.GITHUB_REPOSITORY || null;
  const visibility = env?.GITHUB_ARTIFACT_VISIBILITY || null;
  const compression = env?.GITHUB_ARTIFACT_COMPRESSION || null;

  const args = ['artifact', 'upload'];
  if (repo) {
    args.push('--repo', repo);
  }
  if (retentionDays) {
    args.push('--retention-days', String(retentionDays));
  }
  if (visibility) {
    args.push('--visibility', visibility);
  }
  if (compression) {
    args.push('--compression', compression);
  }
  args.push('--clobber');
  args.push(artifactName);
  args.push(...existingPaths);

  const result = await runCommand(commandName, args, { env: { ...env }, cwd });
  const durationMs = Date.now() - startedAt;

  if (result.exitCode === 0) {
    console.info('[telemetry-provider] Uploaded telemetry artifacts to GitHub', {
      artifactName,
      fileCount: existingPaths.length,
      durationMs,
    });
  } else {
    console.error('[telemetry-provider] GitHub CLI upload failed', {
      artifactName,
      exitCode: result.exitCode,
      stderr: truncate(result.stderr),
    });
  }

  return {
    ...baseResult,
    artifactName,
    files: existingPaths,
    exitCode: result.exitCode ?? 0,
    status: result.exitCode === 0 ? 'uploaded' : 'failed',
    durationMs,
    command: commandName,
    args,
    stdout: truncate(result.stdout),
    stderr: truncate(result.stderr),
  };
}

export async function persistProviderResult(metadataPath, metadata, result, fsModule = fs) {
  if (!metadata || !result) {
    return;
  }

  const record = {
    provider: result.provider ?? 'githubUpload',
    attemptedAt: result.attemptedAt ?? new Date().toISOString(),
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
  };

  if (!Array.isArray(metadata.providerResults)) {
    metadata.providerResults = [];
  }
  metadata.providerResults.push(record);

  try {
    await fsModule.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { encoding: 'utf8' });
  } catch (error) {
    console.warn('[telemetry-provider] Failed to persist provider results', {
      metadataPath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function main() {
  const metadataPath = resolvePath(
    process.env.CI_ARTIFACT_METADATA,
    'telemetry-artifacts/ci-artifacts.json'
  );
  const artifactDir = resolvePath(
    process.env.TELEMETRY_ARTIFACT_DIR,
    path.dirname(metadataPath)
  );

  const metadata = await readMetadata(metadataPath);
  if (!metadata) {
    console.info('[telemetry-provider] Metadata unavailable; skipping GitHub upload.');
    return;
  }

  const result = await uploadWithGh(artifactDir, metadata);
  await persistProviderResult(metadataPath, metadata, result);

  if (result.exitCode !== 0 && result.status === 'failed') {
    process.exitCode = result.exitCode;
  }
}

if (process.argv?.[1] && path.basename(process.argv[1]) === 'githubUpload.js') {
  main().catch((error) => {
    console.error('[telemetry-provider] Unexpected failure', error);
    process.exitCode = 1;
  });
}

export {
  resolvePath,
  commandExists,
  readMetadata,
  defaultRunCommand,
};
