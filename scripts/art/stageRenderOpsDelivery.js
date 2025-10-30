#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PACKET_ROOT = path.resolve(
  __dirname,
  '../../reports/art/renderops-packets'
);
const DEFAULT_DELIVERY_ROOT = path.resolve(
  __dirname,
  '../../deliveries/renderops'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    packetDir: null,
    packetRoot: DEFAULT_PACKET_ROOT,
    deliveryRoot: DEFAULT_DELIVERY_ROOT,
    labelOverride: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--packet-dir=')) {
      options.packetDir = path.resolve(process.cwd(), arg.slice(13));
    } else if (arg.startsWith('--packet-root=')) {
      options.packetRoot = path.resolve(process.cwd(), arg.slice(14));
    } else if (arg.startsWith('--delivery-root=')) {
      options.deliveryRoot = path.resolve(process.cwd(), arg.slice(16));
    } else if (arg.startsWith('--label=')) {
      options.labelOverride = arg.slice(8);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  try {
    const packetDir =
      options.packetDir ?? (await findLatestPacketDirectory(options.packetRoot));
    if (!packetDir) {
      throw new Error('No packet directory found; run packageRenderOps first.');
    }

    const packetName = path.basename(packetDir);
    const archivePath = path.join(
      path.dirname(packetDir),
      `${packetName}.zip`
    );
    const deliveryManifestPath = path.join(
      path.dirname(packetDir),
      `${packetName}-delivery.json`
    );
    const shareManifestPath = path.join(packetDir, 'share-manifest.json');
    const metadataPath = path.join(packetDir, 'metadata.json');
    const packetReadmePath = path.join(packetDir, 'PACKET_README.md');

    const requiredFiles = [shareManifestPath, metadataPath, packetReadmePath];
    await assertFilesExist(requiredFiles);

    const shareManifest = await readJson(shareManifestPath);
    const metadata = await readJson(metadataPath);

    const label = sanitizeLabel(
      options.labelOverride ??
        metadata?.label ??
        shareManifest?.label ??
        'renderops'
    );
    const deliveryDir = path.join(options.deliveryRoot, label, packetName);
    await fs.mkdir(deliveryDir, { recursive: true });

    const copies = [
      {
        src: archivePath,
        dest: path.join(deliveryDir, path.basename(archivePath)),
        optional: true,
      },
      {
        src: deliveryManifestPath,
        dest: path.join(deliveryDir, path.basename(deliveryManifestPath)),
        optional: true,
      },
      {
        src: shareManifestPath,
        dest: path.join(deliveryDir, path.basename(shareManifestPath)),
      },
      {
        src: metadataPath,
        dest: path.join(deliveryDir, path.basename(metadataPath)),
      },
      {
        src: packetReadmePath,
        dest: path.join(deliveryDir, path.basename(packetReadmePath)),
      },
      {
        src: path.join(packetDir, 'lighting-preview-summary.md'),
        dest: path.join(deliveryDir, 'lighting-preview-summary.md'),
        optional: true,
      },
    ];

    for (const file of copies) {
      if (file.optional) {
        try {
          await fs.copyFile(file.src, file.dest);
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            continue;
          }
          throw error;
        }
      } else {
        await fs.copyFile(file.src, file.dest);
      }
    }

    const stagingManifest = {
      packetName,
      packetDir,
      deliveryDir,
      label,
      stagedAt: new Date().toISOString(),
      shareManifest: path.basename(shareManifestPath),
      deliveryManifest: (await fileExists(deliveryManifestPath))
        ? path.basename(deliveryManifestPath)
        : null,
      archiveFile: (await fileExists(archivePath))
        ? path.basename(archivePath)
        : null,
      instructions: shareManifest?.instructions ?? [],
      actionableSegmentCount: shareManifest?.actionableSegmentCount ?? 0,
      actionableSegments: shareManifest?.actionableSegments ?? [],
    };

    const stagingManifestPath = path.join(deliveryDir, 'staging-manifest.json');
    await fs.writeFile(
      stagingManifestPath,
      `${JSON.stringify(stagingManifest, null, 2)}\n`,
      'utf-8'
    );

    const handoffReadme = buildHandoffReadme({
      packetName,
      shareManifest,
      metadata,
      deliveryManifest: await readJsonOptional(deliveryManifestPath),
    });
    await fs.writeFile(
      path.join(deliveryDir, 'handoff-readme.md'),
      handoffReadme,
      'utf-8'
    );

    process.stdout.write(
      `[stageRenderOpsDelivery] Staged packet "${packetName}" for label "${label}" at ${deliveryDir}\n`
    );
    if (stagingManifest.instructions.length > 0) {
      process.stdout.write(
        `[stageRenderOpsDelivery] Primary instructions: ${stagingManifest.instructions.join(
          ' '
        )}\n`
      );
    }
  } catch (error) {
    process.stderr.write(
      `[stageRenderOpsDelivery] Failed to stage RenderOps delivery: ${error.message}\n`
    );
    if (error.cause) {
      process.stderr.write(`  Cause: ${error.cause.message}\n`);
    }
    process.exitCode = 1;
  }
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/art/stageRenderOpsDelivery.js [options]',
      '',
      'Options:',
      '  --packet-dir=<path>    Specific packet directory to stage.',
      '  --packet-root=<path>   Directory containing packet folders (default reports/art/renderops-packets).',
      '  --delivery-root=<path> Output root for staged deliveries (default deliveries/renderops).',
      '  --label=<value>        Override delivery label (defaults to packet metadata label).',
      '  -h, --help             Show this help message.',
      '',
    ].join('\n')
  );
}

async function findLatestPacketDirectory(packetRoot) {
  const root = path.resolve(packetRoot);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  return directories.length > 0 ? path.join(root, directories[0]) : null;
}

async function assertFilesExist(files) {
  for (const file of files) {
    try {
      await fs.access(file);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        throw new Error(`Required file not found: ${file}`);
      }
      throw error;
    }
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function readJsonOptional(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function buildHandoffReadme({ packetName, shareManifest, metadata, deliveryManifest }) {
  const lines = [
    `# RenderOps Delivery – ${packetName}`,
    '',
    `Created: ${shareManifest?.createdAt ?? metadata?.createdAt ?? 'n/a'}`,
    `Label: ${shareManifest?.label ?? metadata?.label ?? 'n/a'}`,
    '',
    '## Contents',
    '',
    '- RenderOps bundle ZIP and checksum manifest (if available)',
    '- PACKET_README.md + lighting preview summary',
    '- share-manifest.json with actionable segments',
    deliveryManifest ? '- delivery JSON with checksum metadata' : '',
    '',
    '## Actionable Segments',
    '',
  ].filter(Boolean);

  const actionableSegments = Array.isArray(
    shareManifest?.actionableSegments
  )
    ? shareManifest.actionableSegments
    : [];

  if (actionableSegments.length === 0) {
    lines.push('- None – all segments evaluated as OK.');
  } else {
    for (const segment of actionableSegments) {
      lines.push(
        `- ${segment.segmentId ?? 'unknown'} (${segment.category ?? 'n/a'}) – status: ${
          segment.status ?? 'n/a'
        }`
      );
    }
  }

  const instructions = Array.isArray(shareManifest?.instructions)
    ? shareManifest.instructions
    : [];
  if (instructions.length > 0) {
    lines.push('', '## Share Instructions', '');
    for (const instruction of instructions) {
      lines.push(`- ${instruction}`);
    }
  }

  if (deliveryManifest?.bundle?.checksumSha256) {
    lines.push(
      '',
      '## Checksum',
      '',
      `SHA-256: ${deliveryManifest.bundle.checksumSha256}`
    );
  }

  return `${lines.join('\n')}\n`;
}

function sanitizeLabel(label) {
  return String(label ?? 'renderops')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

main();
