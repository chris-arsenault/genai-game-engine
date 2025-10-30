#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  evaluateTelemetrySchedule,
  renderTelemetryReminderMarkdown,
  createTelemetryReminderICS,
} from '../../src/game/tools/TelemetryScheduleReminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SCHEDULE = path.resolve(
  __dirname,
  '../../telemetry-artifacts/analytics/parity-schedule.json'
);
const DEFAULT_JSON_OUT = path.resolve(
  __dirname,
  '../../reports/telemetry/parity-schedule-reminder.json'
);
const DEFAULT_MD_OUT = path.resolve(
  __dirname,
  '../../reports/telemetry/parity-schedule-reminder.md'
);
const DEFAULT_ICS_OUT = path.resolve(
  __dirname,
  '../../reports/telemetry/parity-schedule-reminder.ics'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    schedulePath: DEFAULT_SCHEDULE,
    warningThresholdDays: 3,
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
    icsOut: DEFAULT_ICS_OUT,
  };

  for (const arg of args) {
    if (arg.startsWith('--schedule=')) {
      options.schedulePath = path.resolve(process.cwd(), arg.slice(11));
    } else if (arg.startsWith('--warning-days=')) {
      const value = Number.parseFloat(arg.slice(15));
      if (!Number.isNaN(value) && value > 0) {
        options.warningThresholdDays = value;
      }
    } else if (arg.startsWith('--json-out=')) {
      options.jsonOut = path.resolve(process.cwd(), arg.slice(11));
    } else if (arg.startsWith('--markdown-out=')) {
      options.markdownOut = path.resolve(process.cwd(), arg.slice(15));
    } else if (arg.startsWith('--ics-out=')) {
      options.icsOut = path.resolve(process.cwd(), arg.slice(10));
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  try {
    const reminder = await evaluateTelemetrySchedule({
      schedulePath: options.schedulePath,
      warningThresholdDays: options.warningThresholdDays,
    });

    await ensureDirectory(options.jsonOut);
    await ensureDirectory(options.markdownOut);
    if (options.icsOut) {
      await ensureDirectory(options.icsOut);
    }

    await fs.writeFile(
      options.jsonOut,
      `${JSON.stringify(reminder, null, 2)}\n`,
      'utf-8'
    );
    await fs.writeFile(
      options.markdownOut,
      renderTelemetryReminderMarkdown(reminder),
      'utf-8'
    );

    process.stdout.write(
      `[remindParitySchedule] Status: ${reminder.status}, next check: ${reminder.nextCheckAt}\n`
    );
    process.stdout.write(
      `[remindParitySchedule] JSON report: ${options.jsonOut}\n`
    );
    process.stdout.write(
      `[remindParitySchedule] Markdown summary: ${options.markdownOut}\n`
    );
    if (reminder.calendar && options.icsOut) {
      const icsContent = createTelemetryReminderICS(reminder);
      await fs.writeFile(options.icsOut, icsContent, 'utf-8');
      process.stdout.write(
        `[remindParitySchedule] Calendar invite: ${options.icsOut}\n`
      );
    }
  } catch (error) {
    process.stderr.write(
      `[remindParitySchedule] Failed to evaluate telemetry schedule: ${error.message}\n`
    );
    if (error.cause) {
      process.stderr.write(`  Cause: ${error.cause.message}\n`);
    }
    process.exitCode = 1;
  }
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/telemetry/remindParitySchedule.js [options]',
      '',
      'Options:',
      '  --schedule=<path>        Path to parity-schedule.json.',
      '  --warning-days=<number>  Days before due date to flag as due-soon (default 3).',
      '  --json-out=<path>        Output path for JSON reminder.',
      '  --markdown-out=<path>    Output path for Markdown summary.',
      '  --ics-out=<path>         Output path for calendar invite (.ics).',
      '  -h, --help               Show this help message.',
      '',
    ].join('\n')
  );
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

main();
