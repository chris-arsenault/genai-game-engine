import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import JSZip from 'jszip';

const DEFAULT_LABEL = 'renderops-packet';

/**
 * Build a RenderOps review packet from an existing lighting preview report and summary.
 * Copies the referenced files into a timestamped directory, emits metadata for tracking,
 * and highlights segments that require follow-up outside the \"ok\" baseline.
 *
 * @param {{
 *   reportPath: string,
 *   summaryPath: string,
 *   outputRoot: string,
 *   label?: string,
 *   now?: Date
 * }} options
 * @returns {Promise<{ packetDir: string, metadataPath: string, metadata: object }>}
 */
export async function buildRenderOpsPacket(options) {
  const {
    reportPath,
    summaryPath,
    outputRoot,
    label = DEFAULT_LABEL,
    now = new Date(),
    createArchive = true,
    archiveFormat = 'zip',
  } = options ?? {};

  if (!reportPath || typeof reportPath !== 'string') {
    throw new TypeError('buildRenderOpsPacket: "reportPath" is required');
  }
  if (!summaryPath || typeof summaryPath !== 'string') {
    throw new TypeError('buildRenderOpsPacket: "summaryPath" is required');
  }
  if (!outputRoot || typeof outputRoot !== 'string') {
    throw new TypeError('buildRenderOpsPacket: "outputRoot" is required');
  }

  const resolvedReportPath = path.resolve(reportPath);
  const resolvedSummaryPath = path.resolve(summaryPath);
  const resolvedOutputRoot = path.resolve(outputRoot);

  const [reportRaw, summaryRaw] = await Promise.all([
    fs.readFile(resolvedReportPath, 'utf-8'),
    fs.readFile(resolvedSummaryPath, 'utf-8'),
  ]);

  let reportJson;
  try {
    reportJson = JSON.parse(reportRaw);
  } catch (error) {
    const wrapped = new Error(
      `buildRenderOpsPacket: Failed to parse report JSON at ${resolvedReportPath}`
    );
    wrapped.cause = error;
    throw wrapped;
  }

  if (createArchive && archiveFormat !== 'zip') {
    throw new Error(
      `buildRenderOpsPacket: Unsupported archiveFormat "${archiveFormat}"; only "zip" is supported.`
    );
  }

  const packetId = randomUUID();
  const timestampIso = now.toISOString();
  const safeLabel = slugify(label ?? DEFAULT_LABEL) || DEFAULT_LABEL;
  const dirName = `${safeLabel}-${timestampIso.replace(/[:.]/g, '-')}`;
  const packetDir = path.join(resolvedOutputRoot, dirName);
  const archiveFileName = `${dirName}.zip`;

  await fs.mkdir(packetDir, { recursive: true });

  const packetReportPath = path.join(packetDir, 'lighting-preview.json');
  const packetSummaryPath = path.join(packetDir, 'lighting-preview-summary.md');

  await Promise.all([
    fs.copyFile(resolvedReportPath, packetReportPath),
    fs.copyFile(resolvedSummaryPath, packetSummaryPath),
  ]);

  const summary = summarizeLightingReport(reportJson);

  const actionableSegments = Array.isArray(reportJson?.entries)
    ? reportJson.entries
        .filter(
          (entry) =>
            entry &&
            typeof entry === 'object' &&
            entry.status &&
            entry.status !== 'ok'
        )
        .map((entry) => ({
          segmentId: entry.segmentId ?? null,
          category: entry.category ?? null,
          status: entry.status ?? null,
          presetId: entry.presetId ?? null,
          projected: normalizeProjected(entry.projected),
          issues: Array.isArray(entry.issues)
            ? entry.issues
                .map((issue) => normalizeIssue(issue))
                .filter((issue) => issue !== null)
            : [],
        }))
    : [];

  const readmeFileName = 'PACKET_README.md';
  const metadataFileName = 'metadata.json';
  const shareManifestFileName = 'share-manifest.json';
  const relativeBundlePath = createArchive ? `../${archiveFileName}` : null;

  const metadata = {
    packetId,
    label: safeLabel,
    createdAt: timestampIso,
    sourcePaths: {
      report: resolvedReportPath,
      summary: resolvedSummaryPath,
    },
    files: {
      report: path.basename(packetReportPath),
      summary: path.basename(packetSummaryPath),
      readme: readmeFileName,
      metadata: metadataFileName,
      shareManifest: shareManifestFileName,
    },
    summary,
    actionableSegments,
    bundle: createArchive
      ? {
          format: archiveFormat,
          relativePath: relativeBundlePath,
        }
      : null,
  };

  const metadataPath = path.join(packetDir, metadataFileName);
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
    encoding: 'utf-8',
  });

  const readmePath = path.join(packetDir, readmeFileName);
  await fs.writeFile(
    readmePath,
    createReadmeContent({ label: safeLabel, timestampIso, summary }),
    'utf-8'
  );

  metadata.files.readme = path.basename(readmePath);

  const shareManifestPath = path.join(packetDir, shareManifestFileName);
  const shareManifest = createShareManifest({ metadata, relativeBundlePath });
  await fs.writeFile(
    shareManifestPath,
    `${JSON.stringify(shareManifest, null, 2)}\n`,
    'utf-8'
  );

  let archiveInfo = null;
  let deliveryManifestPath = null;
  let deliveryManifest = null;

  if (createArchive) {
    const archivePath = path.join(resolvedOutputRoot, archiveFileName);
    archiveInfo = await createPacketArchive({ packetDir, archivePath });
    deliveryManifest = createDeliveryManifest({
      metadata,
      archiveInfo,
      shareManifestPath,
    });
    deliveryManifestPath = path.join(
      resolvedOutputRoot,
      `${dirName}-delivery.json`
    );
    await fs.writeFile(
      deliveryManifestPath,
      `${JSON.stringify(deliveryManifest, null, 2)}\n`,
      'utf-8'
    );
  }

  return {
    packetDir,
    metadataPath,
    metadata,
    shareManifestPath,
    shareManifest,
    archivePath: archiveInfo?.archivePath ?? null,
    archiveInfo,
    deliveryManifestPath,
    deliveryManifest,
  };
}

/**
 * Summaries a lighting report with totals, status counts, and drift counts.
 * Falls back to computing counts from the entries array when summary data is absent.
 *
 * @param {object} report
 * @returns {{
 *   total: number,
 *   statusCounts: Record<string, number>,
 *   metadataDriftCount: number,
 *   skippedCount: number
 * }}
 */
export function summarizeLightingReport(report) {
  const entries = Array.isArray(report?.entries) ? report.entries : [];
  const summary = isPlainObject(report?.summary) ? report.summary : {};

  const total =
    typeof summary.total === 'number' && Number.isFinite(summary.total)
      ? summary.total
      : entries.length;

  const statusCounts = {};
  for (const entry of entries) {
    const status =
      entry && typeof entry.status === 'string' ? entry.status : 'unknown';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  if (isPlainObject(summary.statusCounts)) {
    for (const [key, value] of Object.entries(summary.statusCounts)) {
      const numeric =
        typeof value === 'number' && Number.isFinite(value) ? value : 0;
      const statusKey = String(key);
      if (statusCounts[statusKey] === undefined) {
        statusCounts[statusKey] = numeric;
      } else {
        statusCounts[statusKey] = Math.max(statusCounts[statusKey], numeric);
      }
    }
  }

  const metadataDriftArray = Array.isArray(summary.metadataDrift)
    ? summary.metadataDrift
    : [];

  const skippedCount =
    typeof summary.skippedCount === 'number' && Number.isFinite(summary.skippedCount)
      ? summary.skippedCount
      : statusCounts.skipped ?? 0;

  return {
    total,
    statusCounts,
    metadataDriftCount: metadataDriftArray.length,
    skippedCount,
  };
}

function createShareManifest({ metadata, relativeBundlePath }) {
  return {
    packetId: metadata.packetId,
    label: metadata.label,
    createdAt: metadata.createdAt,
    bundle:
      metadata.bundle && relativeBundlePath
        ? {
            format: metadata.bundle.format,
            relativePath: relativeBundlePath,
          }
        : null,
    files: metadata.files,
    summary: metadata.summary,
    actionableSegmentCount: Array.isArray(metadata.actionableSegments)
      ? metadata.actionableSegments.length
      : 0,
    actionableSegments: metadata.actionableSegments,
    instructions: [
      'Share the generated ZIP bundle with the RenderOps team via the secure art handoff channel.',
      `Include ${metadata.files.readme} in the communication so context and actionable segments are visible up front.`,
      'After RenderOps responds, update the placeholder audit and regenerate the packet if art tweaks were requested.',
    ],
  };
}

function createDeliveryManifest({ metadata, archiveInfo, shareManifestPath }) {
  return {
    packetId: metadata.packetId,
    label: metadata.label,
    createdAt: metadata.createdAt,
    bundle: archiveInfo
      ? {
          format: archiveInfo.format,
          fileName: archiveInfo.fileName,
          absolutePath: archiveInfo.archivePath,
          checksumSha256: archiveInfo.checksumSha256,
          sizeBytes: archiveInfo.sizeBytes,
        }
      : null,
    shareManifestPath,
    summary: metadata.summary,
    actionableSegmentCount: Array.isArray(metadata.actionableSegments)
      ? metadata.actionableSegments.length
      : 0,
  };
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
      await addDirectoryToZip({ zip, directoryPath: absolutePath, basePath });
    } else if (entry.isFile()) {
      const data = await fs.readFile(absolutePath);
      zip.file(relativePath, data);
    }
  }
}

function slugify(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function normalizeProjected(projected) {
  if (!projected || typeof projected !== 'object') {
    return {
      luminance: null,
      targetLuminance: null,
      deviation: null,
    };
  }
  return {
    luminance:
      typeof projected.luminance === 'number' && Number.isFinite(projected.luminance)
        ? projected.luminance
        : null,
    targetLuminance:
      typeof projected.targetLuminance === 'number' &&
      Number.isFinite(projected.targetLuminance)
        ? projected.targetLuminance
        : null,
    deviation:
      typeof projected.deviation === 'number' &&
      Number.isFinite(projected.deviation)
        ? projected.deviation
        : null,
  };
}

function normalizeIssue(issue) {
  if (!issue || typeof issue !== 'object') {
    return null;
  }
  return {
    severity:
      typeof issue.severity === 'string' && issue.severity.length > 0
        ? issue.severity
        : null,
    code:
      typeof issue.code === 'string' && issue.code.length > 0
        ? issue.code
        : null,
    message:
      typeof issue.message === 'string' && issue.message.length > 0
        ? issue.message
        : null,
  };
}

function createReadmeContent({ label, timestampIso, summary }) {
  const lines = [
    `# RenderOps Packet — ${label}`,
    '',
    `Generated: ${timestampIso}`,
    '',
    '## Contents',
    '- `lighting-preview.json`: Full numeric preview report for Act 2 Crossroads.',
    '- `lighting-preview-summary.md`: RenderOps-facing digest generated from the report.',
    '- `metadata.json`: Machine-readable metadata and actionable segment list.',
    '',
    '## Snapshot',
    `- Segments evaluated: ${summary.total}`,
    `- Status counts: ${Object.entries(summary.statusCounts)
      .map(([status, count]) => `${status}=${count}`)
      .join(', ')}`,
    `- Metadata drift flagged: ${summary.metadataDriftCount}`,
    `- Skipped segments: ${summary.skippedCount}`,
    '',
    '## Follow-ups',
    'Review `metadata.json` for actionable segments requiring manual intervention. Re-run the preview script after adjustments to keep this packet aligned with the latest art configuration.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
