#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

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
    const child = spawn(checkCommand, args, { stdio: 'ignore', shell: process.platform === 'win32' });
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

async function uploadWithGh(artifactDir, metadata) {
  const ghAvailable = await commandExists('gh');
  if (!ghAvailable) {
    console.info('[telemetry-provider] GitHub CLI not found; skipping telemetry upload.');
    return 0;
  }

  const args = [
    'artifact',
    'upload',
    metadata?.context?.prefix ? metadata.context.prefix : 'inspector-telemetry',
    '--clobber',
    '--pattern',
    path.join(artifactDir, '*'),
  ];

  return new Promise((resolve) => {
    const child = spawn('gh', args, {
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('error', (error) => {
      console.warn('[telemetry-provider] GitHub CLI upload failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      resolve(0);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.warn('[telemetry-provider] GitHub CLI exited with non-zero status', { code });
        resolve(0);
        return;
      }
      resolve(0);
    });
  });
}

async function main() {
  const metadataPath = resolvePath(process.env.CI_ARTIFACT_METADATA, 'telemetry-artifacts/ci-artifacts.json');
  const artifactDir = resolvePath(process.env.TELEMETRY_ARTIFACT_DIR, path.dirname(metadataPath));

  const metadata = await readMetadata(metadataPath);
  if (!metadata) {
    console.info('[telemetry-provider] Metadata unavailable; skipping GitHub upload.');
    return;
  }

  console.info('[telemetry-provider] Preparing GitHub artifact upload', {
    metadataPath,
    artifactDir,
    artifactCount: metadata.artifacts?.length ?? 0,
  });

  await uploadWithGh(artifactDir, metadata);
}

main().catch((error) => {
  console.error('[telemetry-provider] Unexpected failure', error);
  process.exitCode = 1;
});
