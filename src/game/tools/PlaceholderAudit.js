import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MANIFEST = path.resolve('assets/images/requests.json');
const DEFAULT_PLACEHOLDER_DIR = path.resolve('assets/generated/ar-placeholders');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

  const replacementPlan = buildPlaceholderReplacementPlan({
    placeholders,
    now,
  });

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
    replacementSchedule: replacementPlan.schedule,
    replacementSummary: replacementPlan.summary,
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

/**
 * Render a markdown replacement plan derived from the placeholder audit.
 * @param {object} audit
 * @returns {string}
 */
export function renderPlaceholderReplacementPlanMarkdown(audit) {
  const summary = audit?.replacementSummary ?? {};
  const tiers = summary?.tiers ?? {};
  const lines = [
    '# Placeholder Replacement Plan',
    '',
    `Generated: ${audit?.generatedAt ?? 'n/a'}`,
    `Manifest: ${audit?.manifestPath ?? 'n/a'}`,
    '',
    `Total placeholder entries: ${audit?.placeholderEntryCount ?? 0}`,
    `Pending bespoke replacements: ${audit?.pendingReplacementCount ?? 0}`,
    `Missing placeholder files: ${audit?.missingFileCount ?? 0}`,
    `Urgent queue size: ${tiers.urgent ?? 0}`,
    `High priority queue size: ${tiers.high ?? 0}`,
    `Standard queue size: ${tiers.standard ?? 0}`,
    '',
    '## Priority Queue',
    '',
    '| Rank | Request | Asset | Priority | Days Aging | Key Reasons | Recommended Action |',
    '| ---- | ------- | ----- | -------- | ----------- | ----------- | ------------------ |',
  ];

  const schedule = Array.isArray(audit?.replacementSchedule)
    ? audit.replacementSchedule
    : [];

  if (schedule.length > 0) {
    for (const item of schedule) {
      lines.push(
        `| ${item.rank ?? 'n/a'} | ${sanitizeMarkdownCell(item.arId)} | ${sanitizeMarkdownCell(item.id)} | ${formatPriorityCell(item)} | ${formatDaysCell(item.daysSincePlaceholder)} | ${formatReasonsCell(item.reasons)} | ${sanitizeMarkdownCell(item.recommendedAction)} |`
      );
    }
  } else {
    lines.push('| n/a | n/a | n/a | n/a | n/a | n/a | n/a |');
  }

  lines.push('', '## Request Breakdown', '');

  const groupSummaries = Array.isArray(summary?.groups) ? summary.groups : [];
  if (groupSummaries.length > 0) {
    lines.push(
      '| Request | Pending | Missing | Highest Priority | Representative Assets |',
      '| ------- | ------- | ------- | ---------------- | ---------------------- |'
    );
    for (const group of groupSummaries) {
      const representative = Array.isArray(group.exampleAssets)
        ? group.exampleAssets.join(', ')
        : 'n/a';
      lines.push(
        `| ${sanitizeMarkdownCell(group.arId)} | ${group.pendingCount ?? 0} | ${group.missingCount ?? 0} | ${formatPriorityLabel(group.highestTier)} | ${sanitizeMarkdownCell(representative)} |`
      );
    }
  } else {
    lines.push('_No placeholder-generated items require bespoke replacements._');
  }

  lines.push('', '');
  return lines.join('\n');
}

function sanitizeMarkdownCell(value) {
  if (value === null || value === undefined) {
    return 'n/a';
  }
  return String(value).replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|');
}

function formatPriorityCell(item) {
  if (!item || !item.priorityTier) {
    return 'n/a';
  }
  const label = formatPriorityLabel(item.priorityTier);
  const score =
    typeof item.priorityScore === 'number' && Number.isFinite(item.priorityScore)
      ? item.priorityScore.toFixed(0)
      : 'n/a';
  return `${label} (${score})`;
}

function formatPriorityLabel(tier) {
  switch (tier) {
    case 'urgent':
      return 'Urgent';
    case 'high':
      return 'High';
    case 'standard':
      return 'Standard';
    default:
      return 'n/a';
  }
}

function formatDaysCell(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(1);
}

const REPLACEMENT_REASON_LABELS = {
  'missing-placeholder': 'Placeholder file missing',
  'placeholder-aged-42d': 'Placeholder older than 6 weeks',
  'placeholder-aged-28d': 'Placeholder older than 4 weeks',
  'placeholder-aged-21d': 'Placeholder older than 3 weeks',
  'placeholder-aged-14d': 'Placeholder older than 2 weeks',
  'placeholder-aged-7d': 'Placeholder older than 1 week',
  'placeholder-aged-3d': 'Placeholder older than 3 days',
  'placeholder-age-unknown': 'Generation timestamp unknown',
  'bespoke-required': 'Bespoke art required',
  'requirements-noted': 'Narrative requirements flagged',
  'prompt-ready': 'Generation prompt ready',
};

function formatReasonsCell(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return 'n/a';
  }
  return reasons
    .map((reason) => REPLACEMENT_REASON_LABELS[reason] ?? reason)
    .join('<br>');
}

function buildPlaceholderReplacementPlan({ placeholders, now }) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const fallbackNow = Date.now();
  const nowTime =
    nowDate instanceof Date && !Number.isNaN(nowDate.valueOf())
      ? nowDate.valueOf()
      : fallbackNow;

  if (!Array.isArray(placeholders) || placeholders.length === 0) {
    return {
      schedule: [],
      summary: {
        generatedAt: new Date(nowTime).toISOString(),
        total: 0,
        missingFileCount: 0,
        tiers: { urgent: 0, high: 0, standard: 0 },
        groups: [],
      },
    };
  }

  const schedule = placeholders.map((entry) =>
    computeReplacementScheduleItem(entry, nowTime)
  );

  schedule.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if ((a.arId ?? '') !== (b.arId ?? '')) {
      return String(a.arId ?? '').localeCompare(String(b.arId ?? ''));
    }
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  const tierCounts = { urgent: 0, high: 0, standard: 0 };
  const groupRankMap = new Map();
  const groupSummaries = new Map();

  for (let index = 0; index < schedule.length; index += 1) {
    const item = schedule[index];
    item.rank = index + 1;
    tierCounts[item.priorityTier] = (tierCounts[item.priorityTier] ?? 0) + 1;

    const segmentCount = groupRankMap.get(item.arId) ?? 0;
    item.groupRank = segmentCount + 1;
    groupRankMap.set(item.arId, segmentCount + 1);

    let group = groupSummaries.get(item.arId);
    if (!group) {
      group = {
        arId: item.arId,
        pendingCount: 0,
        missingCount: 0,
        highestTier: item.priorityTier,
        exampleAssets: [],
        topPriorityScore: item.priorityScore,
      };
      groupSummaries.set(item.arId, group);
    }

    group.pendingCount += 1;
    if (item.missingFile) {
      group.missingCount += 1;
    }
    if (priorityTierRank(item.priorityTier) < priorityTierRank(group.highestTier)) {
      group.highestTier = item.priorityTier;
    }
    if (item.priorityScore > group.topPriorityScore) {
      group.topPriorityScore = item.priorityScore;
    }
    if (group.exampleAssets.length < 3 && item.id) {
      group.exampleAssets.push(item.id);
    }
  }

  const summary = {
    generatedAt: new Date(nowTime).toISOString(),
    total: schedule.length,
    missingFileCount: schedule.filter((item) => item.missingFile).length,
    tiers: tierCounts,
    groups: Array.from(groupSummaries.values()),
  };

  summary.groups.sort((a, b) => {
    const tierDiff =
      priorityTierRank(a.highestTier) - priorityTierRank(b.highestTier);
    if (tierDiff !== 0) {
      return tierDiff;
    }
    if (b.missingCount !== a.missingCount) {
      return b.missingCount - a.missingCount;
    }
    if (b.pendingCount !== a.pendingCount) {
      return b.pendingCount - a.pendingCount;
    }
    return String(a.arId ?? '').localeCompare(String(b.arId ?? ''));
  });

  return { schedule, summary };
}

function computeReplacementScheduleItem(entry, nowTime) {
  const reasons = [];
  let score = 25;

  const missingFile = entry?.placeholderExists === false;
  if (missingFile) {
    score += 320;
    addReason(reasons, 'missing-placeholder');
  }

  let daysSincePlaceholder = null;
  if (entry?.placeholderGeneratedAt) {
    const parsed = Date.parse(entry.placeholderGeneratedAt);
    if (!Number.isNaN(parsed)) {
      const diffMs = Math.max(0, nowTime - parsed);
      const days = diffMs / MS_PER_DAY;
      daysSincePlaceholder = days;
      score += scoreForPlaceholderAge(days, reasons);
    } else {
      score += 35;
      addReason(reasons, 'placeholder-age-unknown');
    }
  } else {
    score += 35;
    addReason(reasons, 'placeholder-age-unknown');
  }

  const notesLower =
    typeof entry?.notes === 'string' ? entry.notes.toLowerCase() : '';
  if (notesLower.includes('bespoke')) {
    score += 60;
    addReason(reasons, 'bespoke-required');
  }
  if (notesLower.includes('needs') || notesLower.includes('requires')) {
    score += 30;
    addReason(reasons, 'requirements-noted');
  }
  if (notesLower.includes('prompt') && notesLower.includes('draft')) {
    score += 20;
    addReason(reasons, 'prompt-ready');
  }

  const priorityTier = tierFromScore(score);
  const recommendedAction = buildRecommendedAction({ missingFile, reasons });

  return {
    id: entry?.id ?? null,
    arId: entry?.arId ?? 'unassigned',
    title: entry?.title ?? null,
    placeholderExists: entry?.placeholderExists ?? false,
    missingFile,
    manifestSource: entry?.manifestSource ?? null,
    placeholderPath: entry?.placeholderPath ?? null,
    notes: entry?.notes ?? null,
    priorityScore: Math.round(score),
    priorityTier,
    reasons,
    daysSincePlaceholder:
      typeof daysSincePlaceholder === 'number'
        ? Number(daysSincePlaceholder.toFixed(2))
        : null,
    recommendedAction,
  };
}

function scoreForPlaceholderAge(days, reasons) {
  if (Number.isNaN(days)) {
    return 0;
  }
  let score = 0;
  if (days >= 42) {
    score += 110;
    addReason(reasons, 'placeholder-aged-42d');
  } else if (days >= 28) {
    score += 95;
    addReason(reasons, 'placeholder-aged-28d');
  } else if (days >= 21) {
    score += 80;
    addReason(reasons, 'placeholder-aged-21d');
  } else if (days >= 14) {
    score += 65;
    addReason(reasons, 'placeholder-aged-14d');
  } else if (days >= 7) {
    score += 45;
    addReason(reasons, 'placeholder-aged-7d');
  } else if (days >= 3) {
    score += 25;
    addReason(reasons, 'placeholder-aged-3d');
  } else {
    score += 10;
  }
  return score;
}

function buildRecommendedAction({ missingFile, reasons }) {
  const parts = [];
  if (missingFile) {
    pushUnique(parts, 'Regenerate the placeholder asset immediately to restore audit coverage.');
  } else {
    pushUnique(parts, 'Schedule bespoke art replacement and capture licensing updates once approved.');
  }
  if (reasons.includes('prompt-ready')) {
    pushUnique(parts, 'Leverage the drafted prompt to queue the generation batch.');
  }
  if (reasons.includes('bespoke-required')) {
    pushUnique(parts, 'Coordinate with the illustration team for the bespoke pass and narrative alignment.');
  }
  if (
    reasons.includes('placeholder-aged-42d') ||
    reasons.includes('placeholder-aged-28d') ||
    reasons.includes('placeholder-aged-21d') ||
    reasons.includes('placeholder-aged-14d')
  ) {
    pushUnique(parts, 'Expedite review before placeholders age out of visual parity baselines.');
  }
  return parts.join(' ');
}

function tierFromScore(score) {
  if (score >= 320) {
    return 'urgent';
  }
  if (score >= 180) {
    return 'high';
  }
  return 'standard';
}

function priorityTierRank(tier) {
  switch (tier) {
    case 'urgent':
      return 0;
    case 'high':
      return 1;
    default:
      return 2;
  }
}

function addReason(reasons, reason) {
  if (!reason) return;
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function pushUnique(array, value) {
  if (!value) return;
  if (!array.includes(value)) {
    array.push(value);
  }
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
