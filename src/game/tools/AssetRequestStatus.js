import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Apply a status update to a single asset request entry.
 *
 * @param {object} entry - Existing asset request entry.
 * @param {object} update - Update payload.
 * @param {string} update.status - New status string.
 * @param {string|null} [update.note] - Optional note/context for history.
 * @param {string|null} [update.route] - Optional routing decision (e.g., openai, bespoke).
 * @param {Date|string} [update.recordedAt] - Timestamp override for history entry.
 * @returns {object} Updated entry copy (original is not mutated).
 */
export function applyAssetRequestStatusUpdate(entry, update) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('applyAssetRequestStatusUpdate: entry object is required');
  }
  if (!update || typeof update !== 'object') {
    throw new TypeError('applyAssetRequestStatusUpdate: update object is required');
  }
  if (!update.status) {
    throw new TypeError('applyAssetRequestStatusUpdate: "status" is required in update');
  }

  const result = { ...entry };
  if (!Array.isArray(result.statusHistory)) {
    result.statusHistory = [];
  } else {
    result.statusHistory = [...result.statusHistory];
  }

  const recordedAt =
    update.recordedAt instanceof Date
      ? update.recordedAt.toISOString()
      : update.recordedAt ?? new Date().toISOString();

  result.status = update.status;
  result.updatedAt = recordedAt;

  const historyEntry = {
    status: update.status,
    recordedAt,
    context: update.note ?? null,
  };

  if (update.route) {
    historyEntry.route = update.route;
    result.route = update.route;
  }

  result.statusHistory.push(historyEntry);

  if (update.note) {
    const notes = Array.isArray(result.notes) ? [...result.notes] : result.notes ? [result.notes] : [];
    notes.push(update.note);
    result.notes = notes;
  }

  return result;
}

/**
 * Update assets/images/requests.json (or compatible manifest) with a new status entry.
 *
 * @param {object} options
 * @param {string} options.projectRoot - Repository root path.
 * @param {string} options.requestId - Target asset request id.
 * @param {string} options.status - New status value.
 * @param {string|null} [options.note] - Optional note to attach.
 * @param {string|null} [options.route] - Optional route label.
 * @param {Date|string} [options.recordedAt] - Override timestamp.
 * @param {string} [options.requestsRelativePath] - Relative manifest path (default assets/images/requests.json).
 * @returns {Promise<object>} Updated entry data.
 */
export async function updateAssetRequestStatusOnDisk(options) {
  const {
    projectRoot,
    requestId,
    status,
    note = null,
    route = null,
    recordedAt = new Date(),
    requestsRelativePath = 'assets/images/requests.json',
  } = options ?? {};

  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new TypeError('updateAssetRequestStatusOnDisk: "projectRoot" is required');
  }
  if (!requestId || typeof requestId !== 'string') {
    throw new TypeError('updateAssetRequestStatusOnDisk: "requestId" is required');
  }
  if (!status || typeof status !== 'string') {
    throw new TypeError('updateAssetRequestStatusOnDisk: "status" is required');
  }

  const manifestPath = path.resolve(projectRoot, requestsRelativePath);
  const raw = await fs.readFile(manifestPath, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error('updateAssetRequestStatusOnDisk: Manifest must be an array of requests');
  }

  const index = data.findIndex((entry) => entry.id === requestId);
  if (index === -1) {
    throw new Error(
      `updateAssetRequestStatusOnDisk: Request "${requestId}" not found in manifest`
    );
  }

  const updatedEntry = applyAssetRequestStatusUpdate(data[index], {
    status,
    note,
    route,
    recordedAt,
  });

  data[index] = updatedEntry;
  await fs.writeFile(manifestPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  return updatedEntry;
}
