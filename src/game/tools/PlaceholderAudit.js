import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MANIFEST = path.resolve('assets/images/requests.json');
const DEFAULT_PLACEHOLDER_DIR = path.resolve('assets/generated/ar-placeholders');

/**
 * Audit placeholder-generated assets listed in the manifest and surface bespoke art gaps.
 *
 * @param {{
 *   manifestPath?: string,
 *   placeholderDir?: string,
 *   now?: Date
 * }} [options]
 * @returns {Promise<object>}
 */
export async function auditPlaceholderStatus(options = {}) {
  const {
    manifestPath = DEFAULT_MANIFEST,
    placeholderDir = DEFAULT_PLACEHOLDER_DIR,
    now = new Date(),
  } = options;

  const resolvedManifestPath = path.resolve(manifestPath);
  const resolvedPlaceholderDir = path.resolve(placeholderDir);
  const repoRoot = path.resolve(path.dirname(resolvedManifestPath), '..', '..');

  const manifestRaw = await fs.readFile(resolvedManifestPath, 'utf-8');
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    const wrapped = new Error(
      `auditPlaceholderStatus: Failed to parse manifest JSON at ${resolvedManifestPath}`
    );
    wrapped.cause = error;
    throw wrapped;
  }

  if (!Array.isArray(manifest)) {
    throw new TypeError(
      'auditPlaceholderStatus: Manifest JSON must contain an array of entries'
    );
  }

  const placeholders = [];
  const groups = new Map();
  const missingFiles = [];

  for (const entry of manifest) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    if (entry.status !== 'placeholder-generated') {
      continue;
    }

    const arId =
      typeof entry.arId === 'string' && entry.arId.length > 0
        ? entry.arId
        : 'unassigned';
    const manifestSource =
      typeof entry.source === 'string' && entry.source.length > 0
        ? entry.source
        : null;

    const candidatePaths = [];
    if (manifestSource) {
      candidatePaths.push(path.resolve(repoRoot, manifestSource));
    }
    candidatePaths.push(path.join(resolvedPlaceholderDir, `${entry.id}.png`));
    candidatePaths.push(path.join(resolvedPlaceholderDir, `${entry.id}.jpg`));

    const resolvedPlaceholderPath = await findFirstExistingPath(candidatePaths);

    const placeholderRecord = {
      id: entry.id ?? null,
      arId,
      title:
        typeof entry.title === 'string' && entry.title.length > 0
          ? entry.title
          : null,
      status: entry.status,
      manifestSource,
      placeholderPath: resolvedPlaceholderPath ?? candidatePaths[0] ?? null,
      placeholderExists: Boolean(resolvedPlaceholderPath),
      placeholderGeneratedAt:
        typeof entry.placeholderGeneratedAt === 'string'
          ? entry.placeholderGeneratedAt
          : null,
      notes:
        typeof entry.notes === 'string' && entry.notes.length > 0
          ? entry.notes
          : null,
    };

    placeholders.push(placeholderRecord);

    const group =
      groups.get(arId) ??
      {
        arId,
        total: 0,
        missing: 0,
        entries: [],
      };
    group.total += 1;
    if (!placeholderRecord.placeholderExists) {
      group.missing += 1;
      missingFiles.push({
        id: placeholderRecord.id,
        arId,
        expectedPath: placeholderRecord.placeholderPath,
      });
    }
    group.entries.push(placeholderRecord);
    groups.set(arId, group);
  }

  const summaryByArId = Array.from(groups.values()).map((group) => ({
    arId: group.arId,
    total: group.total,
    missing: group.missing,
    available: group.total - group.missing,
  }));

  summaryByArId.sort((a, b) => a.arId.localeCompare(b.arId));

  return {
    generatedAt: now.toISOString(),
    manifestPath: resolvedManifestPath,
    placeholderDir: resolvedPlaceholderDir,
    totalManifestEntries: manifest.length,
    placeholderEntryCount: placeholders.length,
    pendingReplacementCount: placeholders.length,
    missingFileCount: missingFiles.length,
    placeholders,
    missingFiles,
    summaryByArId,
  };
}

/**
 * Render a markdown summary for the placeholder audit.
 * @param {object} audit
 * @returns {string}
 */
export function renderPlaceholderAuditMarkdown(audit) {
  const lines = [
    '# Placeholder Asset Audit',
    '',
    `Generated: ${audit.generatedAt}`,
    `Manifest: ${audit.manifestPath}`,
    `Placeholder directory: ${audit.placeholderDir}`,
    '',
    `Total manifest entries: ${audit.totalManifestEntries}`,
    `Placeholder entries: ${audit.placeholderEntryCount}`,
    `Missing placeholder files: ${audit.missingFileCount}`,
    '',
    '## Pending Replacement Summary by Asset Request',
    '',
    '| Request | Placeholders | Missing Files | Ready Files |',
    '| ------- | ------------ | ------------- | ----------- |',
  ];

  if (Array.isArray(audit.summaryByArId) && audit.summaryByArId.length > 0) {
    for (const summary of audit.summaryByArId) {
      lines.push(
        `| ${summary.arId} | ${summary.total} | ${summary.missing} | ${summary.available} |`
      );
    }
  } else {
    lines.push('| n/a | 0 | 0 | 0 |');
  }

  lines.push('', '## Missing Placeholder Files');
  if (Array.isArray(audit.missingFiles) && audit.missingFiles.length > 0) {
    for (const missing of audit.missingFiles) {
      lines.push(
        `- ${missing.id ?? 'unknown'} (${missing.arId}): ${missing.expectedPath}`
      );
    }
  } else {
    lines.push('- None');
  }

  lines.push('', '## Placeholder Entries');
  if (Array.isArray(audit.placeholders) && audit.placeholders.length > 0) {
    lines.push(
      '',
      '| ID | Request | Generated At | Exists | Source |',
      '| -- | ------- | ------------ | ------ | ------ |'
    );
    for (const entry of audit.placeholders) {
      lines.push(
        `| ${entry.id ?? 'unknown'} | ${entry.arId} | ${
          entry.placeholderGeneratedAt ?? 'n/a'
        } | ${entry.placeholderExists ? 'yes' : 'no'} | ${
          entry.manifestSource ?? entry.placeholderPath ?? 'n/a'
        } |`
      );
    }
  } else {
    lines.push('', '_No placeholder-generated entries found._');
  }

  lines.push('', '');
  return lines.join('\n');
}

async function findFirstExistingPath(paths) {
  for (const filePath of paths) {
    if (!filePath) continue;
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // continue
    }
  }
  return null;
}
