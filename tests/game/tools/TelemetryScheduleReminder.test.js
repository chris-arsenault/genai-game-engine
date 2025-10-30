import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  evaluateTelemetrySchedule,
  renderTelemetryReminderMarkdown,
  createTelemetryReminderICS,
} from '../../../src/game/tools/TelemetryScheduleReminder.js';

describe('TelemetryScheduleReminder', () => {
  test('evaluateTelemetrySchedule flags overdue schedules', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'telemetry-reminder-')
    );
    const schedulePath = path.join(tempDir, 'parity-schedule.json');

    const schedule = {
      nextCheckAt: '2025-11-10T12:00:00.000Z',
      overdue: true,
      latestDispatch: { label: 'sample', dispatchedAt: '2025-10-25T12:00:00.000Z' },
      latestAcknowledgement: {
        label: 'sample',
        acknowledgedAt: '2025-10-25T12:15:00.000Z',
        acknowledgedBy: 'Codex Session',
      },
      history: [
        {
          type: 'parity-check',
          checkedAt: '2025-10-25T12:10:00.000Z',
          status: 'ok',
        },
      ],
    };

    await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2), 'utf-8');

    const reminder = await evaluateTelemetrySchedule({
      schedulePath,
      warningThresholdDays: 3,
      now: new Date('2025-11-15T12:00:00.000Z'),
    });

    expect(reminder.status).toBe('overdue');
    expect(reminder.overdueFlag).toBe(true);
    expect(reminder.recommendedAction).toContain('telemetry:check-parity');
    expect(reminder.dueInDays).toBeLessThan(0);
    expect(reminder.daysSinceLastCheck).toBeGreaterThan(20 / 1); // approx 21 days
    expect(reminder.alertLevel).toBe('critical');
    expect(reminder.alerts[0]).toContain('overdue');
    expect(reminder.calendar).toBeTruthy();

    const ics = createTelemetryReminderICS(reminder);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Telemetry Parity Check');
  });

  test('renderTelemetryReminderMarkdown documents due-soon status', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'telemetry-reminder-')
    );
    const schedulePath = path.join(tempDir, 'parity-schedule.json');

    const schedule = {
      nextCheckAt: '2025-11-15T12:00:00.000Z',
      overdue: false,
      history: [],
    };

    await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2), 'utf-8');

    const reminder = await evaluateTelemetrySchedule({
      schedulePath,
      warningThresholdDays: 5,
      now: new Date('2025-11-12T12:00:00.000Z'),
    });

    expect(reminder.status).toBe('due-soon');
    expect(reminder.recommendedAction).toContain('Plan the next parity review');
    expect(reminder.alertLevel).toBe('warning');
    expect(reminder.alerts[0]).toContain('Parity checkpoint due within');
    expect(reminder.calendar).toBeTruthy();
    expect(reminder.calendar.alarmMinutes).toBeGreaterThan(0);

    const markdown = renderTelemetryReminderMarkdown(reminder);
    expect(markdown).toContain('# Telemetry Parity Schedule Reminder');
    expect(markdown).toContain('Status: due-soon');
    expect(markdown).toContain('Plan the next parity review');
    expect(markdown).toContain('## Alerts');
    expect(markdown).toContain('## Calendar Event');
  });
});
