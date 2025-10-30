#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import {
  loadBaseline,
  summariseBaseline,
  formatMarkdownSummary,
} from './summarizePerformanceBaseline.js';

/**
 * Resolve CLI arguments for baseline and output paths.
 * @returns {{ baselinePath: string, outputPath: string }}
 */
function resolvePaths() {
  const baselineArg = process.argv[2] || 'telemetry-artifacts/performance/ci-baseline.json';
  const outputArg = process.argv[3] || 'telemetry-artifacts/performance/ci-baseline-summary.md';
  const baselinePath = path.resolve(baselineArg);
  const outputPath = path.resolve(outputArg);
  return { baselinePath, outputPath };
}

async function ensureDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const { baselinePath, outputPath } = resolvePaths();

  let baseline;
  try {
    baseline = await loadBaseline(baselinePath);
  } catch (error) {
    console.warn(
      `::warning title=Performance baseline summary::Baseline file not found at ${baselinePath}.`
    );
    throw error;
  }

  const summary = summariseBaseline(baseline);
  const markdown = formatMarkdownSummary(summary);

  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, `${markdown}\n`, 'utf8');

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }

  for (const metric of summary.metrics || []) {
    if (metric.status === 'critical') {
      const details = metric.issues?.length ? metric.issues.join('; ') : 'Threshold exceeded';
      console.error(
        `::error title=Performance baseline critical::${metric.name}: ${details} (avg ${metric.averageMs}ms vs ${metric.thresholdMs}ms)`
      );
    } else if (metric.status === 'warning') {
      const details = metric.issues?.length ? metric.issues.join('; ') : 'Near threshold';
      console.warn(
        `::warning title=Performance baseline warning::${metric.name}: ${details} (avg ${metric.averageMs}ms vs ${metric.thresholdMs}ms)`
      );
    }
  }
}

main().catch((error) => {
  console.error('[postPerformanceSummary] Fatal error', error);
  process.exitCode = 1;
});
