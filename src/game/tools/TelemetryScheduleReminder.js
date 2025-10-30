import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SCHEDULE_PATH = path.resolve(
  'telemetry-artifacts/analytics/parity-schedule.json'
);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Evaluate the telemetry parity schedule and determine if action is required.
 *
 * @param {{
 *   schedulePath?: string,
 *   warningThresholdDays?: number,
 *   now?: Date
 * }} [options]
 * @returns {Promise<object>}
 */
export async function evaluateTelemetrySchedule(options = {}) {
  const {
    schedulePath = DEFAULT_SCHEDULE_PATH,
    warningThresholdDays = 3,
    now = new Date(),
  } = options;

  const resolvedSchedulePath = path.resolve(schedulePath);
  const raw = await fs.readFile(resolvedSchedulePath, 'utf-8');

  let schedule;
  try {
    schedule = JSON.parse(raw);
  } catch (error) {
    const wrapped = new Error(
      `evaluateTelemetrySchedule: Failed to parse schedule JSON at ${resolvedSchedulePath}`
    );
    wrapped.cause = error;
    throw wrapped;
  }

  const generatedAt = now.toISOString();
  const nextCheckAtStr =
    typeof schedule?.nextCheckAt === 'string' ? schedule.nextCheckAt : null;
  const nextCheckAt = nextCheckAtStr ? new Date(nextCheckAtStr) : null;
  const overdueFlag = schedule?.overdue === true;

  const diffMs =
    nextCheckAt instanceof Date && !Number.isNaN(nextCheckAt.valueOf())
      ? nextCheckAt.getTime() - now.getTime()
      : null;
  const dueInDays = diffMs !== null ? diffMs / MS_PER_DAY : null;

  const lastCheckStr =
    typeof schedule?.lastCheck?.checkedAt === 'string'
      ? schedule.lastCheck.checkedAt
      : Array.isArray(schedule?.history) && schedule.history.length > 0
      ? schedule.history[0].checkedAt ?? null
      : null;
  const lastCheckAt =
    lastCheckStr && typeof lastCheckStr === 'string'
      ? new Date(lastCheckStr)
      : null;
  const daysSinceLastCheck =
    lastCheckAt instanceof Date && !Number.isNaN(lastCheckAt.valueOf())
      ? Math.abs((now.getTime() - lastCheckAt.getTime()) / MS_PER_DAY)
      : null;

  let status = 'no-schedule';
  if (nextCheckAt) {
    if (overdueFlag || (dueInDays ?? 1) < 0) {
      status = 'overdue';
    } else if (typeof dueInDays === 'number' && dueInDays <= warningThresholdDays) {
      status = 'due-soon';
    } else {
      status = 'scheduled';
    }
  }

  const recommendedAction = buildRecommendedAction({
    status,
    nextCheckAtStr,
    warningThresholdDays,
  });

  return {
    generatedAt,
    schedulePath: resolvedSchedulePath,
    warningThresholdDays,
    nextCheckAt: nextCheckAtStr,
    dueInDays,
    status,
    overdueFlag,
    recommendedAction,
    latestDispatch: schedule?.latestDispatch ?? null,
    latestAcknowledgement: schedule?.latestAcknowledgement ?? null,
    pendingDispatches: Array.isArray(schedule?.pendingDispatches)
      ? schedule.pendingDispatches
      : [],
    daysSinceLastCheck,
    historyCount: Array.isArray(schedule?.history) ? schedule.history.length : 0,
  };
}

/**
 * Render a Markdown reminder summary from evaluateTelemetrySchedule output.
 * @param {object} reminder
 * @returns {string}
 */
export function renderTelemetryReminderMarkdown(reminder) {
  const lines = [
    '# Telemetry Parity Schedule Reminder',
    '',
    `Generated: ${reminder.generatedAt}`,
    `Schedule: ${reminder.schedulePath}`,
    '',
    `Status: ${reminder.status}`,
    `Next check at: ${reminder.nextCheckAt ?? 'n/a'}`,
    `Due in days: ${
      typeof reminder.dueInDays === 'number'
        ? reminder.dueInDays.toFixed(2)
        : 'n/a'
    }`,
    `Warning threshold (days): ${reminder.warningThresholdDays}`,
    `Days since last check: ${
      typeof reminder.daysSinceLastCheck === 'number'
        ? reminder.daysSinceLastCheck.toFixed(2)
        : 'n/a'
    }`,
    '',
    '## Recommended Action',
    '',
    reminder.recommendedAction,
  ];

  if (reminder.latestDispatch) {
    lines.push(
      '',
      '## Latest Dispatch',
      '',
      `- Label: ${reminder.latestDispatch.label ?? 'n/a'}`,
      `- Dispatched At: ${reminder.latestDispatch.dispatchedAt ?? 'n/a'}`,
      `- Manifest: ${reminder.latestDispatch.manifestPath ?? 'n/a'}`
    );
  }

  if (reminder.latestAcknowledgement) {
    lines.push(
      '',
      '## Latest Acknowledgement',
      '',
      `- Label: ${reminder.latestAcknowledgement.label ?? 'n/a'}`,
      `- Acknowledged At: ${
        reminder.latestAcknowledgement.acknowledgedAt ?? 'n/a'
      }`,
      `- By: ${reminder.latestAcknowledgement.acknowledgedBy ?? 'n/a'}`
    );
  }

  if (
    Array.isArray(reminder.pendingDispatches) &&
    reminder.pendingDispatches.length > 0
  ) {
    lines.push('', '## Pending Dispatches');
    for (const dispatch of reminder.pendingDispatches) {
      lines.push(`- ${JSON.stringify(dispatch)}`);
    }
  }

  lines.push('', '');
  return lines.join('\n');
}

function buildRecommendedAction({ status, nextCheckAtStr, warningThresholdDays }) {
  switch (status) {
    case 'overdue':
      return [
        'Run `npm run telemetry:check-parity` with the latest samples immediately.',
        'Update parity-schedule.json after verification and notify analytics of the refreshed cadence.',
      ].join(' ');
    case 'due-soon':
      return [
        `Plan the next parity review before ${nextCheckAtStr} (≤ ${warningThresholdDays} days remaining).`,
        'Confirm telemetry sample availability and prepare summary regeneration.',
      ].join(' ');
    case 'scheduled':
      return [
        `Next parity checkpoint is scheduled for ${nextCheckAtStr}.`,
        'Monitor incoming analytics requests and be ready to acknowledge ahead of the deadline if data changes.',
      ].join(' ');
    default:
      return [
        'Parity schedule is unavailable. Inspect telemetry-artifacts/analytics/parity-schedule.json.',
        'Recreate the schedule or document the blocker before the next analytics review.',
      ].join(' ');
  }
}
