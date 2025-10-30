import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Build a weekly replacement schedule from a placeholder replacement plan.
 *
 * @param {{
 *   plan: object | null,
 *   startDate?: Date | string,
 *   slotsPerWeek?: number
 * }} options
 * @returns {{ generatedAt: string, startDate: string, slotsPerWeek: number, weekCount: number, weeks: Array<object> }}
 */
export function createPlaceholderReplacementSchedule(options = {}) {
  const { plan, startDate = new Date(), slotsPerWeek = 4 } = options;

  if (!plan || typeof plan !== 'object') {
    throw new TypeError(
      'createPlaceholderReplacementSchedule: "plan" object is required'
    );
  }
  if (!Array.isArray(plan.schedule)) {
    throw new TypeError(
      'createPlaceholderReplacementSchedule: plan.schedule must be an array'
    );
  }
  if (
    typeof slotsPerWeek !== 'number' ||
    !Number.isFinite(slotsPerWeek) ||
    slotsPerWeek <= 0
  ) {
    throw new TypeError(
      'createPlaceholderReplacementSchedule: slotsPerWeek must be a positive number'
    );
  }

  const start = normalizeDate(startDate);
  const sorted = [...plan.schedule].sort((a, b) => {
    if (typeof a.rank === 'number' && typeof b.rank === 'number') {
      return a.rank - b.rank;
    }
    if (typeof b.priorityScore === 'number' && typeof a.priorityScore === 'number') {
      return b.priorityScore - a.priorityScore;
    }
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  const weeks = [];
  for (let index = 0; index < sorted.length; index += slotsPerWeek) {
    const weekNumber = weeks.length + 1;
    const weekStart = addDays(start, (weekNumber - 1) * 7);
    const weekEnd = addDays(weekStart, 6);
    const batch = sorted.slice(index, index + slotsPerWeek).map((entry, offset) =>
      enrichScheduleEntry(entry, {
        weekNumber,
        start: weekStart,
        targetDate: addDays(weekStart, offset),
      })
    );

    weeks.push({
      weekNumber,
      startDate: toIsoDate(weekStart),
      endDate: toIsoDate(weekEnd),
      plannedAssets: batch,
      focusRequests: summarizeRequestFocus(batch),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    startDate: toIsoDate(start),
    slotsPerWeek,
    weekCount: weeks.length,
    weeks,
  };
}

/**
 * Render a markdown summary for a placeholder replacement schedule.
 * @param {object} schedule
 * @returns {string}
 */
export function renderPlaceholderScheduleMarkdown(schedule) {
  const lines = [
    '# Placeholder Replacement Sprint Schedule',
    '',
    `Generated: ${schedule?.generatedAt ?? 'n/a'}`,
    `Start date: ${schedule?.startDate ?? 'n/a'}`,
    `Slots per week: ${schedule?.slotsPerWeek ?? 'n/a'}`,
    `Total weeks: ${schedule?.weekCount ?? 0}`,
    '',
  ];

  if (Array.isArray(schedule?.weeks) && schedule.weeks.length > 0) {
    for (const week of schedule.weeks) {
      lines.push(
        `## Week ${week.weekNumber} (${week.startDate} – ${week.endDate})`,
        ''
      );

      if (Array.isArray(week.focusRequests) && week.focusRequests.length > 0) {
        lines.push(
          `**Focus Requests:** ${week.focusRequests
            .map((focus) => `${focus.arId} (${focus.count})`)
            .join(', ')}`,
          ''
        );
      }

      lines.push(
        '| Day | Request | Asset | Priority | Recommended Action | Due Date |',
        '| --- | ------- | ----- | -------- | ------------------ | -------- |'
      );

      if (Array.isArray(week.plannedAssets) && week.plannedAssets.length > 0) {
        for (const asset of week.plannedAssets) {
          lines.push(
            `| ${asset.targetDay ?? 'n/a'} | ${sanitizeCell(asset.arId)} | ${sanitizeCell(asset.id)} | ${formatPriority(asset)} | ${sanitizeCell(asset.recommendedAction)} | ${asset.targetDate ?? 'n/a'} |`
          );
        }
      } else {
        lines.push('| n/a | n/a | n/a | n/a | n/a | n/a |');
      }

      lines.push('');
    }
  } else {
    lines.push('_No placeholder replacements scheduled._', '');
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Load the replacement plan from disk and create a schedule artifact.
 *
 * @param {{
 *   planPath: string,
 *   startDate?: Date | string,
 *   slotsPerWeek?: number,
 *   jsonOut?: string,
 *   markdownOut?: string
 * }} options
 */
export async function buildPlaceholderScheduleArtifacts(options = {}) {
  const {
    planPath,
    startDate = new Date(),
    slotsPerWeek = 4,
    jsonOut,
    markdownOut,
  } = options;

  if (!planPath || typeof planPath !== 'string') {
    throw new TypeError(
      'buildPlaceholderScheduleArtifacts: "planPath" is required'
    );
  }

  const resolvedPlanPath = path.resolve(planPath);
  const planRaw = await fs.readFile(resolvedPlanPath, 'utf-8');
  let plan;
  try {
    plan = JSON.parse(planRaw);
  } catch (error) {
    const wrapped = new Error(
      `buildPlaceholderScheduleArtifacts: Failed to parse plan JSON at ${resolvedPlanPath}`
    );
    wrapped.cause = error;
    throw wrapped;
  }

  const schedule = createPlaceholderReplacementSchedule({
    plan,
    startDate,
    slotsPerWeek,
  });
  const markdown = renderPlaceholderScheduleMarkdown(schedule);

  if (jsonOut) {
    const resolvedJsonOut = path.resolve(jsonOut);
    await fs.mkdir(path.dirname(resolvedJsonOut), { recursive: true });
    await fs.writeFile(
      resolvedJsonOut,
      `${JSON.stringify(schedule, null, 2)}\n`,
      'utf-8'
    );
  }

  if (markdownOut) {
    const resolvedMarkdownOut = path.resolve(markdownOut);
    await fs.mkdir(path.dirname(resolvedMarkdownOut), { recursive: true });
    await fs.writeFile(resolvedMarkdownOut, markdown, 'utf-8');
  }

  return { schedule, markdown };
}

function enrichScheduleEntry(entry, context) {
  const { weekNumber, start, targetDate } = context;
  const dayOffset = Math.max(
    0,
    Math.round((targetDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  );
  const weekDay = dayOfWeekLabel(targetDate.getDay());

  return {
    ...entry,
    weekNumber,
    targetDate: toIsoDate(targetDate),
    targetDay: `${weekDay} (Day ${dayOffset + 1})`,
  };
}

function summarizeRequestFocus(batch) {
  if (!Array.isArray(batch) || batch.length === 0) {
    return [];
  }
  const counts = new Map();
  for (const item of batch) {
    const arId = item?.arId ?? 'Unassigned';
    counts.set(arId, (counts.get(arId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([arId, count]) => ({
    arId,
    count,
  }));
}

function normalizeDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.valueOf())) {
      throw new TypeError('normalizeDate: Date value is invalid');
    }
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      throw new TypeError('normalizeDate: Unable to parse startDate string');
    }
    return normalizeDate(new Date(parsed));
  }
  throw new TypeError(
    'normalizeDate: startDate must be a Date instance or ISO-8601 string'
  );
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toIsoDate(date) {
  return date.toISOString().split('T')[0];
}

function dayOfWeekLabel(dayIndex) {
  const labels = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return labels[dayIndex] ?? 'Day';
}

function formatPriority(asset) {
  if (!asset) return 'n/a';
  const tier = asset.priorityTier
    ? `${String(asset.priorityTier).toUpperCase()}`
    : 'n/a';
  const score =
    typeof asset.priorityScore === 'number'
      ? asset.priorityScore.toFixed(0)
      : 'n/a';
  return `${tier} (${score})`;
}

function sanitizeCell(value) {
  if (value === null || value === undefined) {
    return 'n/a';
  }
  return String(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}
