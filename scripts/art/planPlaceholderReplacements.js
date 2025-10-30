#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  buildPlaceholderScheduleArtifacts,
  createPlaceholderReplacementSchedule,
} from '../../src/game/tools/PlaceholderSchedulePlanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PLAN_PATH = path.resolve(
  __dirname,
  '../../reports/art/placeholder-replacement-plan.json'
);
const DEFAULT_JSON_OUT = path.resolve(
  __dirname,
  '../../reports/art/placeholder-replacement-schedule.json'
);
const DEFAULT_MD_OUT = path.resolve(
  __dirname,
  '../../reports/art/placeholder-replacement-schedule.md'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    planPath: DEFAULT_PLAN_PATH,
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
    slotsPerWeek: 4,
    startDate: undefined,
  };

  for (const arg of args) {
    if (arg.startsWith('--plan=')) {
      options.planPath = path.resolve(process.cwd(), arg.slice(7));
    } else if (arg.startsWith('--json-out=')) {
      options.jsonOut = path.resolve(process.cwd(), arg.slice(11));
    } else if (arg.startsWith('--markdown-out=')) {
      options.markdownOut = path.resolve(process.cwd(), arg.slice(15));
    } else if (arg.startsWith('--slots-per-week=')) {
      const value = Number.parseInt(arg.slice(17), 10);
      if (!Number.isNaN(value) && value > 0) {
        options.slotsPerWeek = value;
      }
    } else if (arg.startsWith('--start-date=')) {
      options.startDate = arg.slice(13);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  try {
    if (options.dryRun) {
      const schedule = createPlaceholderReplacementSchedule({
        plan: await loadPlan(options.planPath),
        startDate: options.startDate,
        slotsPerWeek: options.slotsPerWeek,
      });
      process.stdout.write(
        `${JSON.stringify(schedule, null, 2)}\n`
      );
      return;
    }

    const { schedule } = await buildPlaceholderScheduleArtifacts(options);
    process.stdout.write(
      `[planPlaceholderReplacements] Weeks planned: ${schedule.weekCount}, slots/week: ${schedule.slotsPerWeek}\n`
    );
    process.stdout.write(
      `[planPlaceholderReplacements] JSON schedule: ${options.jsonOut}\n`
    );
    process.stdout.write(
      `[planPlaceholderReplacements] Markdown schedule: ${options.markdownOut}\n`
    );
  } catch (error) {
    process.stderr.write(
      `[planPlaceholderReplacements] Failed to build schedule: ${error.message}\n`
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
      'Usage: node scripts/art/planPlaceholderReplacements.js [options]',
      '',
      'Options:',
      '  --plan=<path>            Source placeholder-replacement-plan.json path.',
      '  --json-out=<path>        Output path for schedule JSON.',
      '  --markdown-out=<path>    Output path for schedule Markdown.',
      '  --slots-per-week=<num>   Number of assets to schedule per week (default 4).',
      '  --start-date=<ISO>       ISO-8601 date to anchor the first week (default today).',
      '  --dry-run                Print schedule JSON to stdout without writing files.',
      '  -h, --help               Show this help message.',
      '',
    ].join('\n')
  );
}

async function loadPlan(planPath) {
  const module = await import('node:fs/promises');
  const fs = module.default ?? module;
  const resolved = path.resolve(planPath);
  const raw = await fs.readFile(resolved, 'utf-8');
  return JSON.parse(raw);
}

main();
