#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_JSON = path.resolve(
  __dirname,
  '../../reports/telemetry/parity-schedule-reminder.json'
);
const DEFAULT_MARKDOWN = path.resolve(
  __dirname,
  '../../reports/telemetry/parity-schedule-reminder.md'
);
const DEFAULT_ICS = path.resolve(
  __dirname,
  '../../reports/telemetry/parity-schedule-reminder.ics'
);
const DEFAULT_DELIVERY_ROOT = path.resolve(
  __dirname,
  '../../deliveries/telemetry'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    jsonPath: DEFAULT_JSON,
    markdownPath: DEFAULT_MARKDOWN,
    icsPath: DEFAULT_ICS,
    deliveryRoot: DEFAULT_DELIVERY_ROOT,
    labelOverride: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--json=')) {
      options.jsonPath = path.resolve(process.cwd(), arg.slice(7));
    } else if (arg.startsWith('--markdown=')) {
      options.markdownPath = path.resolve(process.cwd(), arg.slice(11));
    } else if (arg.startsWith('--ics=')) {
      options.icsPath = path.resolve(process.cwd(), arg.slice(6));
    } else if (arg.startsWith('--delivery-root=')) {
      options.deliveryRoot = path.resolve(process.cwd(), arg.slice(16));
    } else if (arg.startsWith('--label=')) {
      options.labelOverride = arg.slice(8);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  try {
    const reminder = await readJson(options.jsonPath);
    const label = deriveLabel(reminder, options.labelOverride);
    const runId = buildRunId(reminder);
    const deliveryDir = path.join(options.deliveryRoot, label, runId);
    await fs.mkdir(deliveryDir, { recursive: true });

    const copies = [
      {
        src: options.jsonPath,
        dest: path.join(deliveryDir, path.basename(options.jsonPath)),
      },
      {
        src: options.markdownPath,
        dest: path.join(deliveryDir, path.basename(options.markdownPath)),
        optional: true,
      },
      {
        src: options.icsPath,
        dest: path.join(deliveryDir, path.basename(options.icsPath)),
        optional: true,
      },
    ];

    for (const file of copies) {
      if (file.optional) {
        await copyIfExists(file.src, file.dest);
      } else {
        await fs.copyFile(file.src, file.dest);
      }
    }

    const manifest = {
      label,
      runId,
      stagedAt: new Date().toISOString(),
      deliveryDir,
      json: path.basename(options.jsonPath),
      markdown: (await fileExists(options.markdownPath))
        ? path.basename(options.markdownPath)
        : null,
      ics: (await fileExists(options.icsPath))
        ? path.basename(options.icsPath)
        : null,
      status: reminder.status ?? 'unknown',
      nextCheckAt: reminder.nextCheckAt ?? null,
      dueInDays: reminder.dueInDays ?? null,
      alertLevel: reminder.alertLevel ?? null,
      alerts: reminder.alerts ?? [],
      recommendedAction: reminder.recommendedAction ?? null,
      warningThresholdDays: reminder.warningThresholdDays ?? null,
    };

    await fs.writeFile(
      path.join(deliveryDir, 'staging-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf-8'
    );

    const readme = buildReadme(reminder, manifest);
    await fs.writeFile(
      path.join(deliveryDir, 'handoff-readme.md'),
      readme,
      'utf-8'
    );

    process.stdout.write(
      `[stageParityReminder] Staged telemetry reminder for label "${label}" at ${deliveryDir}\n`
    );
  } catch (error) {
    process.stderr.write(
      `[stageParityReminder] Failed to stage telemetry reminder: ${error.message}\n`
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
      'Usage: node scripts/telemetry/stageParityReminder.js [options]',
      '',
      'Options:',
      '  --json=<path>           Path to parity-schedule-reminder.json',
      '  --markdown=<path>       Path to parity-schedule-reminder.md',
      '  --ics=<path>            Path to parity-schedule-reminder.ics',
      '  --delivery-root=<path>  Output root for staged deliveries (default deliveries/telemetry)',
      '  --label=<value>         Override staging label (defaults to latest dispatch label or schedule basename)',
      '  -h, --help              Show this help message.',
      '',
    ].join('\n')
  );
}

async function readJson(filePath) {
  const raw = await fs.readFile(path.resolve(filePath), 'utf-8');
  return JSON.parse(raw);
}

function deriveLabel(reminder, override) {
  if (override) {
    return sanitizeLabel(override);
  }
  if (reminder?.latestDispatch?.label) {
    return sanitizeLabel(reminder.latestDispatch.label);
  }
  if (reminder?.schedulePath) {
    return sanitizeLabel(path.basename(reminder.schedulePath, path.extname(reminder.schedulePath)));
  }
  return 'telemetry-parity';
}

function buildRunId(reminder) {
  const generatedAt =
    typeof reminder?.generatedAt === 'string'
      ? reminder.generatedAt
      : new Date().toISOString();
  return `telemetry-reminder-${generatedAt.replace(/[:.]/g, '-')
    .replace(/Z$/, '')}`;
}

async function copyIfExists(src, dest) {
  try {
    await fs.copyFile(src, dest);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildReadme(reminder, manifest) {
  const lines = [
    `# Telemetry Reminder – ${manifest.runId}`,
    '',
    `Generated: ${reminder.generatedAt ?? 'n/a'}`,
    `Schedule: ${reminder.schedulePath ?? 'n/a'}`,
    '',
    `Status: ${reminder.status ?? 'unknown'}`,
    `Alert level: ${reminder.alertLevel ?? 'n/a'}`,
    `Next check at: ${reminder.nextCheckAt ?? 'n/a'}`,
    `Due in days: ${
      typeof reminder.dueInDays === 'number'
        ? reminder.dueInDays.toFixed(2)
        : 'n/a'
    }`,
    `Warning threshold (days): ${reminder.warningThresholdDays ?? 'n/a'}`,
    '',
    '## Recommended Action',
    '',
    reminder.recommendedAction ?? 'No immediate action recorded.',
    '',
  ];

  if (Array.isArray(reminder.alerts) && reminder.alerts.length > 0) {
    lines.push('## Alerts', '');
    for (const alert of reminder.alerts) {
      lines.push(`- ${alert}`);
    }
    lines.push('');
  }

  if (reminder.latestDispatch) {
    lines.push(
      '## Latest Dispatch',
      '',
      `- Label: ${reminder.latestDispatch.label ?? 'n/a'}`,
      `- Dispatched At: ${reminder.latestDispatch.dispatchedAt ?? 'n/a'}`,
      `- Manifest: ${reminder.latestDispatch.manifestPath ?? 'n/a'}`,
      ''
    );
  }

  if (reminder.latestAcknowledgement) {
    lines.push(
      '## Latest Acknowledgement',
      '',
      `- Label: ${reminder.latestAcknowledgement.label ?? 'n/a'}`,
      `- Acknowledged At: ${
        reminder.latestAcknowledgement.acknowledgedAt ?? 'n/a'
      }`,
      `- By: ${reminder.latestAcknowledgement.acknowledgedBy ?? 'n/a'}`,
      ''
    );
  }

  if (
    Array.isArray(reminder.pendingDispatches) &&
    reminder.pendingDispatches.length > 0
  ) {
    lines.push('## Pending Dispatches', '');
    for (const dispatch of reminder.pendingDispatches) {
      lines.push(`- ${JSON.stringify(dispatch)}`);
    }
    lines.push('');
  }

  lines.push(
    '## Sharing Notes',
    '',
    '- Attach the JSON and Markdown summary when emailing analytics.',
    manifest.ics
      ? '- Import the ICS into shared calendars and confirm alarms align with the warning threshold.'
      : '- Run `npm run telemetry:reminder` with ICS output enabled before sharing.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function sanitizeLabel(label) {
  return String(label ?? 'telemetry-parity')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

main();
