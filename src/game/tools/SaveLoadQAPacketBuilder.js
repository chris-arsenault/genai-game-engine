import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import JSZip from 'jszip';

const DEFAULT_LABEL = 'save-load';

export async function buildSaveLoadQAPacket(options) {
  const {
    profile,
    payloadSummary,
    outputRoot,
    label = DEFAULT_LABEL,
    now = new Date(),
    includeSamples = true,
    createArchive = true,
    archiveFormat = 'zip',
  } = options ?? {};

  if (!profile || typeof profile !== 'object') {
    throw new TypeError('buildSaveLoadQAPacket: "profile" object is required');
  }
  if (!payloadSummary || typeof payloadSummary !== 'object') {
    throw new TypeError('buildSaveLoadQAPacket: "payloadSummary" object is required');
  }
  if (!outputRoot || typeof outputRoot !== 'string') {
    throw new TypeError('buildSaveLoadQAPacket: "outputRoot" must be a directory path');
  }
  if (createArchive && archiveFormat !== 'zip') {
    throw new Error(
      `buildSaveLoadQAPacket: Unsupported archiveFormat "${archiveFormat}". Only "zip" is available.`
    );
  }

  const resolvedOutputRoot = path.resolve(outputRoot);
  const packetId = randomUUID();
  const timestampIso = now.toISOString();
  const safeLabel = slugify(label ?? DEFAULT_LABEL) || DEFAULT_LABEL;
  const dirName = `${safeLabel}-${timestampIso.replace(/[:.]/g, '-')}`;
  const packetDir = path.join(resolvedOutputRoot, dirName);

  await fs.mkdir(packetDir, { recursive: true });

  const latencyFileName = 'save-load-latency.json';
  const payloadFileName = 'save-payload-summary.json';
  const metadataFileName = 'metadata.json';
  const readmeFileName = 'README.md';
  const shareSummaryFileName = 'share-summary.md';
  const archiveFileName = createArchive ? `${dirName}.zip` : null;

  const profileData = includeSamples
    ? profile
    : {
        summary: profile.summary ?? {},
        samples: Array.isArray(profile.samples) ? profile.samples.slice(0, 5) : [],
      };

  await fs.writeFile(
    path.join(packetDir, latencyFileName),
    `${JSON.stringify(profileData, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(packetDir, payloadFileName),
    `${JSON.stringify(payloadSummary, null, 2)}\n`,
    'utf8'
  );

  const metadata = buildMetadata({
    packetId,
    label,
    timestampIso,
    profile,
    payloadSummary,
    files: {
      latencyReport: latencyFileName,
      payloadSummary: payloadFileName,
      metadata: metadataFileName,
      readme: readmeFileName,
      shareSummary: shareSummaryFileName,
      archive: archiveFileName,
    },
  });

  await fs.writeFile(
    path.join(packetDir, metadataFileName),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8'
  );

  const readmeContents = buildReadme({ label, timestampIso, metadata });
  await fs.writeFile(path.join(packetDir, readmeFileName), `${readmeContents}\n`, 'utf8');

  let archiveInfo = null;
  if (createArchive) {
    const archivePath = path.join(resolvedOutputRoot, archiveFileName);
    archiveInfo = await createPacketArchive({ packetDir, archivePath });
  }

  const shareSummaryContents = buildShareSummary({
    metadata,
    archiveInfo,
    relativeArchivePath: archiveFileName,
  });
  await fs.writeFile(
    path.join(packetDir, shareSummaryFileName),
    `${shareSummaryContents}\n`,
    'utf8'
  );

  return {
    packetDir,
    latencyReportPath: path.join(packetDir, latencyFileName),
    payloadSummaryPath: path.join(packetDir, payloadFileName),
    metadataPath: path.join(packetDir, metadataFileName),
    metadata,
    archivePath: archiveInfo?.archivePath ?? null,
    archiveInfo,
  };
}

function buildMetadata({ packetId, label, timestampIso, profile, payloadSummary, files }) {
  const profileSummary = profile?.summary ?? {};
  const payloadSections = payloadSummary?.sections ?? {};
  const latencySampleCount = Array.isArray(profile?.samples) ? profile.samples.length : 0;

  return {
    packetId,
    label,
    createdAt: timestampIso,
    files,
    instructions: [
      'Share the included latency report and payload summary with QA for schema validation.',
      'Capture QA feedback and update the save/load backlog items if schema adjustments are requested.',
    ],
    profile: {
      iterations: profileSummary.iterations ?? latencySampleCount,
      thresholdMs: profileSummary.thresholdMs ?? null,
      sampleCount: latencySampleCount,
      averages: {
        saveMs: profileSummary.save?.averageMs ?? null,
        loadMs: profileSummary.load?.averageMs ?? null,
      },
      maxima: {
        saveMs: profileSummary.save?.maxMs ?? null,
        loadMs: profileSummary.load?.maxMs ?? null,
      },
      underThreshold: profileSummary.load?.underThreshold ?? true,
    },
    payload: {
      slot: payloadSummary.slot ?? null,
      version: payloadSummary.version ?? null,
      timestamp: payloadSummary.timestamp ?? null,
      sectionCounts: {
        storyFlags: payloadSections.storyFlags?.count ?? 0,
        questsActive: payloadSections.quests?.activeCount ?? 0,
        questsCompleted: payloadSections.quests?.completedCount ?? 0,
        factions: payloadSections.factions?.factionCount ?? 0,
        inventoryItems: payloadSections.inventory?.itemCount ?? 0,
        districtRecords: payloadSections.district?.count ?? 0,
        npcRecords: payloadSections.npc?.count ?? 0,
      },
    },
  };
}

function buildReadme({ label, timestampIso, metadata }) {
  const lines = [
    `# Save/Load QA Packet — ${label}`,
    '',
    `- Generated: ${timestampIso}`,
    `- Packet ID: ${metadata.packetId}`,
    `- Latency Iterations: ${metadata.profile.iterations}`,
    `- Average Save: ${formatMs(metadata.profile.averages.saveMs)}`,
    `- Average Load: ${formatMs(metadata.profile.averages.loadMs)}`,
    `- Max Save: ${formatMs(metadata.profile.maxima.saveMs)}`,
    `- Max Load: ${formatMs(metadata.profile.maxima.loadMs)}`,
    `- Under Threshold: ${metadata.profile.underThreshold ? 'Yes' : 'No'}`,
    '',
    '## Payload Snapshot Overview',
    `- Slot: ${metadata.payload.slot ?? 'n/a'}`,
    `- Version: ${metadata.payload.version ?? 'n/a'}`,
    `- Story Flags: ${metadata.payload.sectionCounts.storyFlags}`,
    `- Active Quests: ${metadata.payload.sectionCounts.questsActive}`,
    `- Completed Quests: ${metadata.payload.sectionCounts.questsCompleted}`,
    `- Factions Tracked: ${metadata.payload.sectionCounts.factions}`,
    `- Inventory Items: ${metadata.payload.sectionCounts.inventoryItems}`,
    `- District Records: ${metadata.payload.sectionCounts.districtRecords}`,
    `- NPC Records: ${metadata.payload.sectionCounts.npcRecords}`,
    '',
    '## Included Files',
    `- ${metadata.files.latencyReport}`,
    `- ${metadata.files.payloadSummary}`,
    `- ${metadata.files.metadata}`,
  ];

  if (metadata.files.readme) {
    lines.push(`- ${metadata.files.readme}`);
  }
  if (metadata.files.shareSummary) {
    lines.push(`- ${metadata.files.shareSummary}`);
  }
  if (metadata.files.archive) {
    lines.push(`- ${metadata.files.archive}`);
  }

  lines.push('', '## Next Steps', ...metadata.instructions.map((instruction) => `- ${instruction}`));

  return lines.join('\n');
}

function buildShareSummary({ metadata, archiveInfo, relativeArchivePath }) {
  const lines = [
    '# Save/Load QA Packet Share Summary',
    '',
    `**Packet ID**: ${metadata.packetId}`,
    `**Label**: ${metadata.label}`,
    `**Generated**: ${metadata.createdAt}`,
    '',
    '## Distribution Artifacts',
    `- README: ${metadata.files.readme}`,
    `- Latency Report: ${metadata.files.latencyReport}`,
    `- Payload Summary: ${metadata.files.payloadSummary}`,
    `- Metadata: ${metadata.files.metadata}`,
  ];

  if (metadata.files.shareSummary) {
    lines.push(`- Share Summary: ${metadata.files.shareSummary}`);
  }
  if (relativeArchivePath) {
    lines.push(`- Archive: ${relativeArchivePath}`);
  }

  if (archiveInfo) {
    lines.push(
      '',
      '### Archive Details',
      `- File Name: ${archiveInfo.fileName}`,
      `- Size: ${formatKb(archiveInfo.sizeBytes)} KB`,
      `- SHA256: ${archiveInfo.checksumSha256}`
    );
  }

  lines.push(
    '',
    '## Key Metrics',
    `- Average Save: ${formatMs(metadata.profile.averages.saveMs)}`,
    `- Average Load: ${formatMs(metadata.profile.averages.loadMs)}`,
    `- Max Save: ${formatMs(metadata.profile.maxima.saveMs)}`,
    `- Max Load: ${formatMs(metadata.profile.maxima.loadMs)}`,
    `- Iterations: ${metadata.profile.iterations}`,
    `- Under Threshold: ${metadata.profile.underThreshold ? 'Yes' : 'No'}`,
    '',
    '## Snapshot Summary',
    `- Slot: ${metadata.payload.slot ?? 'n/a'}`,
    `- Version: ${metadata.payload.version ?? 'n/a'}`,
    `- Story Flags: ${metadata.payload.sectionCounts.storyFlags}`,
    `- Active Quests: ${metadata.payload.sectionCounts.questsActive}`,
    `- Completed Quests: ${metadata.payload.sectionCounts.questsCompleted}`,
    `- Factions: ${metadata.payload.sectionCounts.factions}`,
    `- Inventory Items: ${metadata.payload.sectionCounts.inventoryItems}`,
    `- District Records: ${metadata.payload.sectionCounts.districtRecords}`,
    `- NPC Records: ${metadata.payload.sectionCounts.npcRecords}`,
    '',
    '## Suggested Message',
    'Hi QA Team,',
    '',
    `The latest save/load QA packet (${metadata.packetId}) is attached. Key metrics: average save ${formatMs(metadata.profile.averages.saveMs)}, average load ${formatMs(metadata.profile.averages.loadMs)}, under threshold ${metadata.profile.underThreshold ? 'Yes' : 'No'}. The payload snapshot includes ${metadata.payload.sectionCounts.storyFlags} story flags and ${metadata.payload.sectionCounts.inventoryItems} inventory items.`,
    '',
    'Please review the latency report and payload summary to confirm the schema looks correct. Let us know if any adjustments are required.',
    '',
    'Thanks!',
  );

  return lines.join('\n');
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value}ms`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatKb(bytes) {
  if (!Number.isFinite(bytes)) {
    return 'n/a';
  }
  return (bytes / 1024).toFixed(1);
}

async function createPacketArchive({ packetDir, archivePath }) {
  const zip = new JSZip();
  await addDirectoryToZip({ zip, directoryPath: packetDir, basePath: packetDir });

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  await fs.writeFile(archivePath, buffer);

  const checksumSha256 = createHash('sha256').update(buffer).digest('hex');

  return {
    format: 'zip',
    archivePath,
    fileName: path.basename(archivePath),
    sizeBytes: buffer.byteLength,
    checksumSha256,
  };
}

async function addDirectoryToZip({ zip, directoryPath, basePath }) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    const relativePath = path.relative(basePath, absolutePath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const folder = zip.folder(relativePath);
      if (folder) {
        await addDirectoryToZip({ zip: folder, directoryPath: absolutePath, basePath });
      }
    } else if (entry.isFile()) {
      const content = await fs.readFile(absolutePath);
      zip.file(relativePath, content);
    }
  }
}
