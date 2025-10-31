import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Enqueue a RenderOps lighting approval job so telemetry can track review state.
 *
 * @param {object} options
 * @param {string} options.packetDir - Directory containing the generated packet.
 * @param {object} options.metadata - Packet metadata from RenderOpsPacketBuilder.
 * @param {object} options.shareManifest - Share manifest object from RenderOpsPacketBuilder.
 * @param {object|null} [options.deliveryManifest] - Delivery manifest object (if available).
 * @param {string} options.queueRoot - Root directory where approval jobs should be written.
 * @param {string} [options.shareManifestPath] - Path to share manifest for reference.
 * @param {string|null} [options.deliveryManifestPath] - Path to delivery manifest for reference.
 * @param {Date} [options.now] - Timestamp override.
 * @returns {Promise<{jobPath: string, job: object}>}
 */
export async function enqueueRenderOpsApprovalJob(options) {
  const {
    packetDir,
    metadata,
    shareManifest,
    deliveryManifest,
    queueRoot,
    shareManifestPath = null,
    deliveryManifestPath = null,
    now = new Date(),
  } = options ?? {};

  if (!packetDir || typeof packetDir !== 'string') {
    throw new TypeError('enqueueRenderOpsApprovalJob: "packetDir" is required');
  }
  if (!metadata || typeof metadata !== 'object') {
    throw new TypeError('enqueueRenderOpsApprovalJob: "metadata" object is required');
  }
  if (!shareManifest || typeof shareManifest !== 'object') {
    throw new TypeError('enqueueRenderOpsApprovalJob: "shareManifest" object is required');
  }
  if (!queueRoot || typeof queueRoot !== 'string') {
    throw new TypeError('enqueueRenderOpsApprovalJob: "queueRoot" directory is required');
  }

  const resolvedQueueRoot = path.resolve(queueRoot);
  const queueDir = path.join(resolvedQueueRoot, sanitizeLabel(metadata.label ?? 'renderops'));
  await fs.mkdir(queueDir, { recursive: true });

  const jobId = randomUUID();
  const createdAt = now.toISOString();

  const actionable = Array.isArray(metadata.actionableSegments)
    ? metadata.actionableSegments
    : [];
  const instructions = Array.isArray(shareManifest.instructions)
    ? shareManifest.instructions
    : [];

  const status = actionable.length > 0 ? 'pending_review' : 'ready_for_ack';

  const job = {
    jobId,
    queue: 'renderops-lighting',
    status,
    createdAt,
    packet: {
      id: metadata.packetId ?? null,
      label: metadata.label ?? null,
      packetDir: path.resolve(packetDir),
      shareManifestPath: shareManifestPath ? path.resolve(shareManifestPath) : null,
      deliveryManifestPath: deliveryManifestPath ? path.resolve(deliveryManifestPath) : null,
      instructions,
      summary: shareManifest.summary ?? metadata.summary ?? {},
    },
    actionableSegments: actionable.map((segment) => normalizeSegment(segment)),
    delivery: deliveryManifest
      ? {
          bundle: deliveryManifest.bundle ?? null,
          attachmentCount: deliveryManifest.attachmentCount ?? 0,
        }
      : null,
  };

  const jobPath = path.join(queueDir, `${createdAt}-${jobId}.json`);
  await fs.writeFile(jobPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');

  return {
    jobPath,
    job,
  };
}

function sanitizeLabel(value) {
  const safe = String(value ?? 'renderops')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return safe.length ? safe : 'renderops';
}

function normalizeSegment(segment) {
  const segmentId = String(segment?.segmentId ?? 'unknown');
  const status = segment?.status ?? 'unknown';
  return {
    segmentId,
    status,
    category: segment?.category ?? null,
    presetId: segment?.presetId ?? null,
    issues: Array.isArray(segment?.issues)
      ? segment.issues.map((issue) => normalizeIssue(issue))
      : [],
    projected: normalizeProjected(segment?.projected),
  };
}

function normalizeIssue(issue) {
  if (!issue || typeof issue !== 'object') {
    return null;
  }
  return {
    code: issue.code ?? null,
    message: issue.message ?? null,
    severity: issue.severity ?? 'info',
  };
}

function normalizeProjected(projected) {
  if (!projected || typeof projected !== 'object') {
    return null;
  }
  return {
    luminance: projected.luminance ?? null,
    targetLuminance: projected.targetLuminance ?? null,
    deviation: projected.deviation ?? null,
  };
}
