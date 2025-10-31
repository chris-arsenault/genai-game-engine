import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Prepare a share-ready delivery for a previously generated Save/Load QA packet.
 * Copies the primary artifacts into a deliveries directory, emits a manifest, and
 * scaffolds readme/feedback templates so QA can acknowledge schema validation quickly.
 *
 * @param {object} options
 * @param {string} options.packetDir - Absolute or relative path to the packet directory produced by buildSaveLoadQAPacket.
 * @param {string} options.deliveriesRoot - Root directory where deliveries should be staged.
 * @param {string} [options.archivePath] - Optional path to an existing archive to include in the delivery.
 * @param {string[]} [options.qaRecipients] - Optional list of intended QA recipients for manifest metadata.
 * @param {Date} [options.now] - Override for timestamping (useful for tests).
 * @returns {Promise<object>} Distribution metadata including resolved paths.
 */
export async function prepareSaveLoadQADistribution(options) {
  const {
    packetDir,
    deliveriesRoot,
    archivePath,
    qaRecipients = [],
    now = new Date(),
  } = options ?? {};

  if (!packetDir || typeof packetDir !== 'string') {
    throw new TypeError('prepareSaveLoadQADistribution: "packetDir" is required');
  }
  if (!deliveriesRoot || typeof deliveriesRoot !== 'string') {
    throw new TypeError('prepareSaveLoadQADistribution: "deliveriesRoot" is required');
  }

  const resolvedPacketDir = path.resolve(packetDir);
  const resolvedDeliveriesRoot = path.resolve(deliveriesRoot);

  await assertDirectory(resolvedPacketDir);
  await fs.mkdir(resolvedDeliveriesRoot, { recursive: true });

  const metadataPath = path.join(resolvedPacketDir, 'metadata.json');
  const metadataRaw = await fs.readFile(metadataPath, 'utf8');
  const metadata = JSON.parse(metadataRaw);

  const safeLabel = slugify(metadata.label ?? 'save-load');
  const creationTimestamp = metadata.createdAt ?? now.toISOString();
  const sanitizedTimestamp = sanitizeTimestamp(creationTimestamp);
  const distributionId = `${safeLabel}-distribution-${sanitizedTimestamp}`;
  const distributionDir = path.join(resolvedDeliveriesRoot, safeLabel, distributionId);

  await fs.mkdir(distributionDir, { recursive: true });

  const packetFiles = metadata.files ?? {};
  const copyPlan = buildCopyPlan({ packetDir: resolvedPacketDir, packetFiles });
  const copiedFiles = {};

  for (const file of copyPlan) {
    const destinationPath = path.join(distributionDir, file.targetName);
    await fs.copyFile(file.sourcePath, destinationPath);
    copiedFiles[file.key] = file.targetName;
  }

  let archiveSourcePath = archivePath ? path.resolve(archivePath) : null;
  if (!archiveSourcePath && packetFiles.archive) {
    const candidate = path.join(path.dirname(resolvedPacketDir), packetFiles.archive);
    if (await fileExists(candidate)) {
      archiveSourcePath = candidate;
    }
  }

  let archiveTargetName = null;
  if (archiveSourcePath) {
    archiveTargetName = path.basename(archiveSourcePath);
    const archiveDestination = path.join(distributionDir, archiveTargetName);
    await fs.copyFile(archiveSourcePath, archiveDestination);
  }

  const preparedAt = now.toISOString();
  const manifest = {
    distributionId,
    packetId: metadata.packetId ?? null,
    packetLabel: metadata.label ?? null,
    packetDir: resolvedPacketDir,
    preparedAt,
    createdAt: creationTimestamp,
    recipients: qaRecipients,
    files: {
      ...copiedFiles,
      archive: archiveTargetName,
    },
  };

  const manifestPath = path.join(distributionDir, 'distribution-manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const handoffReadme = buildHandoffReadme({
    metadata,
    manifest,
  });
  await fs.writeFile(path.join(distributionDir, 'handoff-readme.md'), `${handoffReadme}\n`, 'utf8');

  const feedbackTracker = buildFeedbackTracker({ metadata, preparedAt });
  await fs.writeFile(
    path.join(distributionDir, 'qa-feedback-tracker.md'),
    `${feedbackTracker}\n`,
    'utf8'
  );

  return {
    distributionDir,
    manifestPath,
    manifest,
    metadata,
    archivePath: archiveTargetName ? path.join(distributionDir, archiveTargetName) : null,
  };
}

function buildCopyPlan({ packetDir, packetFiles }) {
  const knownFiles = [
    { key: 'readme', fileName: packetFiles.readme ?? 'README.md', required: true },
    {
      key: 'shareSummary',
      fileName: packetFiles.shareSummary ?? 'share-summary.md',
      required: true,
    },
    {
      key: 'latencyReport',
      fileName: packetFiles.latencyReport ?? 'save-load-latency.json',
      required: true,
    },
    {
      key: 'payloadSummary',
      fileName: packetFiles.payloadSummary ?? 'save-payload-summary.json',
      required: true,
    },
    { key: 'metadata', fileName: packetFiles.metadata ?? 'metadata.json', required: true },
  ];

  const plan = [];

  for (const entry of knownFiles) {
    if (!entry.fileName) {
      if (entry.required) {
        throw new Error(
          `prepareSaveLoadQADistribution: Missing required packet artifact for "${entry.key}"`
        );
      }
      continue;
    }

    const sourcePath = path.join(packetDir, entry.fileName);
    plan.push({
      key: entry.key,
      sourcePath,
      targetName: entry.fileName,
    });
  }

  return plan;
}

async function assertDirectory(directoryPath) {
  const stats = await fs.stat(directoryPath).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error(`prepareSaveLoadQADistribution: Packet directory not found at ${directoryPath}`);
    }
    throw error;
  });

  if (!stats.isDirectory()) {
    throw new Error(
      `prepareSaveLoadQADistribution: Expected packetDir to be a directory (${directoryPath})`
    );
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

function buildHandoffReadme({ metadata, manifest }) {
  const lines = [
    '# Save/Load QA Distribution Handoff',
    '',
    `- Packet ID: ${metadata.packetId ?? 'n/a'}`,
    `- Packet Label: ${metadata.label ?? 'save-load'}`,
    `- Packet Created: ${metadata.createdAt ?? 'unknown'}`,
    `- Distribution ID: ${manifest.distributionId}`,
    `- Prepared At: ${manifest.preparedAt}`,
    '',
    '## Included Artifacts',
  ];

  const artifactEntries = Object.entries(manifest.files).filter(
    ([key, value]) => key !== 'archive' && Boolean(value)
  );
  for (const [, fileName] of artifactEntries) {
    lines.push(`- ${fileName}`);
  }
  if (manifest.files.archive) {
    lines.push(`- ${manifest.files.archive}`);
  }

  lines.push(
    '',
    '## Key Metrics',
    `- Average Save: ${formatMs(metadata.profile?.averages?.saveMs)}`,
    `- Average Load: ${formatMs(metadata.profile?.averages?.loadMs)}`,
    `- Max Save: ${formatMs(metadata.profile?.maxima?.saveMs)}`,
    `- Max Load: ${formatMs(metadata.profile?.maxima?.loadMs)}`,
    `- Iterations: ${metadata.profile?.iterations ?? 'n/a'}`,
    `- Under Threshold: ${metadata.profile?.underThreshold ? 'Yes' : 'No'}`,
    '',
    '## Next Steps',
    '- Deliver the archive and `share-summary.md` contents to the QA distro list.',
    '- Capture schema validation feedback in `qa-feedback-tracker.md`.',
    '- Update backlog item M3-016 with any requested schema adjustments.'
  );

  return lines.join('\n');
}

function buildFeedbackTracker({ metadata, preparedAt }) {
  const lines = [
    '# Save/Load QA Feedback Tracker',
    '',
    `- Packet ID: ${metadata.packetId ?? 'n/a'}`,
    `- Distribution Prepared At: ${preparedAt}`,
    '',
    '## Review Checklist',
    '- [ ] QA received packet archive and share summary',
    '- [ ] Schema validated against current payload expectations',
    '- [ ] Latency metrics reviewed and approved',
    '- [ ] Feedback recorded in backlog item M3-016',
    '',
    '## Feedback Log',
    '| Timestamp | Reviewer | Notes |',
    '| --- | --- | --- |',
    '| | | |',
  ];

  return lines.join('\n');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeTimestamp(value) {
  return String(value).replace(/[:.]/g, '-');
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value}ms`;
}
