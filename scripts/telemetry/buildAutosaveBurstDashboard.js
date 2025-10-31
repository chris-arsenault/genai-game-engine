#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function coerceNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function coercePercent(ratio) {
  if (!ratio || !Number.isFinite(ratio.value)) {
    return {
      value: 0,
      percentage: '0%',
    };
  }
  const clamped = Math.max(0, Math.min(1, Number(ratio.value)));
  return {
    value: clamped,
    percentage: typeof ratio.percentage === 'string' ? ratio.percentage : `${Math.round(clamped * 100)}%`,
  };
}

function extractControlBindings(controlBindings = {}) {
  const dwell = controlBindings.dwell ?? {};
  const ratios = controlBindings.ratios ?? {};
  return {
    source: controlBindings.source ?? 'unavailable',
    totalEvents: coerceNumber(controlBindings.totalEvents, 0),
    durationMs: coerceNumber(controlBindings.durationMs, 0),
    actionsVisitedCount: coerceNumber(controlBindings.actionsVisitedCount, 0),
    actionsRemappedCount: coerceNumber(controlBindings.actionsRemappedCount, 0),
    selectionMoves: coerceNumber(controlBindings.metrics?.selectionMoves, 0),
    selectionBlocked: coerceNumber(controlBindings.metrics?.selectionBlocked, 0),
    listModeChanges: coerceNumber(controlBindings.metrics?.listModeChanges, 0),
    pageNavigations: coerceNumber(controlBindings.metrics?.pageNavigations, 0),
    pageNavigationBlocked: coerceNumber(controlBindings.metrics?.pageNavigationBlocked, 0),
    dwell: {
      count: coerceNumber(dwell.count, 0),
      averageMs: coerceNumber(dwell.averageMs, 0),
      maxMs: coerceNumber(dwell.maxMs, 0),
      lastMs: coerceNumber(dwell.lastMs, 0),
      longestAction: dwell.longestAction ?? null,
      lastAction: dwell.lastAction ?? null,
    },
    ratios: {
      selectionBlocked: coercePercent(ratios.selectionBlocked),
      pageNavigationBlocked: coercePercent(ratios.pageNavigationBlocked),
    },
  };
}

function extractDistrictMetrics(districts = {}) {
  return {
    lastUpdatedIso: districts.lastUpdatedIso ?? null,
    lastLockdownIso: districts.lastLockdownIso ?? null,
    totals: {
      total: coerceNumber(districts.metrics?.total, 0),
      restricted: coerceNumber(districts.metrics?.restricted, 0),
      fastTravelDisabled: coerceNumber(districts.metrics?.fastTravelDisabled, 0),
      infiltrationLocked: coerceNumber(districts.metrics?.infiltrationLocked, 0),
      infiltrationUnlocked: coerceNumber(districts.metrics?.infiltrationUnlocked, 0),
      lockdownEvents: coerceNumber(districts.metrics?.lockdownEvents, 0),
    },
    restrictedDistricts: Array.isArray(districts.restrictedDistricts)
      ? districts.restrictedDistricts.slice()
      : [],
  };
}

function extractNpcMetrics(npcs = {}) {
  return {
    lastUpdatedIso: npcs.lastUpdatedIso ?? null,
    totals: {
      total: coerceNumber(npcs.metrics?.total, 0),
      alerts: coerceNumber(npcs.metrics?.alerts, 0),
      suspicious: coerceNumber(npcs.metrics?.suspicious, 0),
      knowsPlayer: coerceNumber(npcs.metrics?.knowsPlayer, 0),
      witnessedCrimes: coerceNumber(npcs.metrics?.witnessedCrimes, 0),
    },
    alerts: Array.isArray(npcs.alerts) ? npcs.alerts.slice() : [],
    suspicious: Array.isArray(npcs.suspicious) ? npcs.suspicious.slice() : [],
  };
}

function extractFactions(factions = {}) {
  return {
    lastCascadeEvent: factions.lastCascadeEvent ?? null,
    cascadeTargets: Array.isArray(factions.cascadeTargets) ? factions.cascadeTargets.slice() : [],
    recentMemberRemovals: Array.isArray(factions.recentMemberRemovals)
      ? factions.recentMemberRemovals.slice()
      : [],
    metrics: {
      cascadeTargetCount: coerceNumber(factions.metrics?.cascadeTargetCount, 0),
      activeCascadeTargets: coerceNumber(factions.metrics?.activeCascadeTargets, 0),
      recentMemberRemovalCount: coerceNumber(factions.metrics?.recentMemberRemovalCount, 0),
    },
  };
}

function extractTutorial(tutorial = {}) {
  return {
    snapshotCount: coerceNumber(tutorial.metrics?.snapshotCount, 0),
    transcriptCount: coerceNumber(tutorial.metrics?.transcriptCount, 0),
    latestSnapshot: tutorial.latestSnapshot ?? null,
  };
}

export function buildAutosaveBurstDashboardDataset(summary, options = {}) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('[buildAutosaveBurstDashboardDataset] summary payload is required');
  }

  const exportResult = summary.exportResult ?? {};
  const summaryPayload = exportResult.summary ?? {};
  const results = Array.isArray(summary.results) ? summary.results : [];
  const iterations = Number.isFinite(summary.iterations) ? summary.iterations : results.length;

  const normalizedResults = results.map((result, index) => ({
    iteration: Number.isFinite(result?.iteration) ? result.iteration : index,
    success: Boolean(result?.success),
    durationMs: Number.isFinite(result?.durationMs) ? result.durationMs : null,
    failureReason: result?.failureReason ?? null,
    error: result?.error ?? null,
  }));

  const successCount = normalizedResults.filter((result) => result.success).length;
  const failureIterations = normalizedResults
    .filter((result) => !result.success)
    .map((result) => result.iteration);

  const artifactList = Array.isArray(exportResult.artifacts) ? exportResult.artifacts : [];
  const artifactCounts = artifactList.reduce((acc, artifact) => {
    const key = typeof artifact?.type === 'string' && artifact.type.length > 0 ? artifact.type : 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const writerSummaries = Array.isArray(exportResult.metrics?.writerSummaries)
    ? exportResult.metrics.writerSummaries.map((writer) => ({
        id: writer?.id ?? writer?.writerId ?? null,
        attempted: coerceNumber(writer?.attempted, 0),
        successes: coerceNumber(writer?.successes, 0),
        failures: coerceNumber(writer?.failures, 0),
        durationMs: Number.isFinite(writer?.durationMs) ? writer.durationMs : null,
      }))
    : [];

  const dataset = {
    slot: summary.slot ?? 'autosave',
    generatedAt: summaryPayload.generatedAt ?? null,
    generatedIso: summaryPayload.generatedIso ?? null,
    source: summaryPayload.source ?? exportResult.source ?? 'unknown',
    iterations,
    successCount,
    failureCount: iterations - successCount,
    successRate: iterations > 0 ? successCount / iterations : 0,
    hasFailures: failureIterations.length > 0,
    failureIterations,
    timeline: normalizedResults.map((result) => ({
      iteration: result.iteration,
      status: result.success ? 'success' : 'failure',
    })),
    results: normalizedResults,
    metrics: {
      controlBindings: extractControlBindings(summaryPayload.controlBindings),
      districts: extractDistrictMetrics(summaryPayload.districts),
      npcs: extractNpcMetrics(summaryPayload.npcs),
      factions: extractFactions(summaryPayload.factions),
      tutorial: extractTutorial(summaryPayload.tutorial),
    },
    artifacts: {
      total: artifactList.length,
      byType: artifactCounts,
      filenames: artifactList.map((artifact) => artifact?.filename).filter(Boolean),
    },
    writers: writerSummaries,
    durationMs: Number.isFinite(exportResult.metrics?.durationMs) ? exportResult.metrics.durationMs : null,
    failures: Array.isArray(summary.failures) ? summary.failures.slice() : [],
    flags: {
      controlBindingsRecorded: coerceNumber(summaryPayload.controlBindings?.totalEvents, 0) > 0,
      tutorialCaptured: Array.isArray(summaryPayload.tutorial?.snapshots)
        ? summaryPayload.tutorial.snapshots.length > 0
        : false,
      factionsActive: coerceNumber(summaryPayload.factions?.metrics?.cascadeTargetCount, 0) > 0,
    },
  };

  if (options.includeArtifacts !== false) {
    dataset.artifacts.details = artifactList.map((artifact) => ({
      type: artifact?.type ?? 'unknown',
      filename: artifact?.filename ?? null,
      section: artifact?.section ?? null,
      mimeType: artifact?.mimeType ?? null,
    }));
  }

  return dataset;
}

const DEFAULT_MIRROR_OUTPUTS = [
  'telemetry-artifacts/reports/autosave-burst/dashboard-feed.json',
  'telemetry-artifacts/analytics/autosave-burst/dashboard-feed.json',
];

async function writeDatasetFile(targetPath, dataset) {
  const resolved = path.resolve(targetPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  return resolved;
}

export async function buildAutosaveBurstDashboard(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const summaryPath = path.resolve(
    cwd,
    typeof options.summaryPath === 'string' && options.summaryPath.length > 0
      ? options.summaryPath
      : 'reports/telemetry/autosave-burst/test-burst-summary.json'
  );
  const outputPath = path.resolve(
    cwd,
    typeof options.outputPath === 'string' && options.outputPath.length > 0
      ? options.outputPath
      : 'reports/telemetry/autosave-burst/dashboard-feed.json'
  );

  let summary = options.summary ?? null;
  if (!summary) {
    const fileBuffer = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(fileBuffer);
  }

  const dataset = buildAutosaveBurstDashboardDataset(summary, options);
  const mirrorCandidates =
    options.mirrorOutputPaths ??
    (options.includeDefaultMirrors === false ? [] : DEFAULT_MIRROR_OUTPUTS);
  const mirrorOutputPaths = Array.isArray(mirrorCandidates)
    ? mirrorCandidates
    : typeof mirrorCandidates === 'string' && mirrorCandidates.length > 0
      ? [mirrorCandidates]
      : [];

  let finalOutputPath = path.resolve(outputPath);
  const writtenMirrors = [];

  if (options.writeOutput !== false) {
    finalOutputPath = await writeDatasetFile(outputPath, dataset);

    const seen = new Set([finalOutputPath]);
    for (const candidate of mirrorOutputPaths) {
      if (typeof candidate !== 'string' || candidate.trim().length === 0) {
        continue;
      }
      const resolvedCandidate = path.resolve(cwd, candidate.trim());
      if (seen.has(resolvedCandidate)) {
        continue;
      }
      await writeDatasetFile(resolvedCandidate, dataset);
      seen.add(resolvedCandidate);
      writtenMirrors.push(resolvedCandidate);
    }
  }

  return {
    dataset,
    outputPath: finalOutputPath,
    mirrorOutputPaths: writtenMirrors,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let summaryPath = 'reports/telemetry/autosave-burst/test-burst-summary.json';
  let outputPath = 'reports/telemetry/autosave-burst/dashboard-feed.json';
  let includeArtifacts = true;
  const mirrorOutputs = [];
  let includeDefaultMirrors = true;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('--summary=')) {
      summaryPath = arg.slice('--summary='.length).trim();
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.slice('--output='.length).trim();
    } else if (arg === '--no-artifacts') {
      includeArtifacts = false;
    } else if (arg === '--include-artifacts') {
      includeArtifacts = true;
    } else if (arg.startsWith('--mirror=')) {
      const value = arg.slice('--mirror='.length).trim();
      if (value.length > 0) {
        mirrorOutputs.push(value);
      }
    } else if (arg === '--mirror') {
      const next = args[index + 1];
      if (next && !next.startsWith('-')) {
        mirrorOutputs.push(next.trim());
        index += 1;
      }
    } else if (arg === '--no-default-mirrors') {
      includeDefaultMirrors = false;
    }
  }

  const { dataset, outputPath: resolvedOutput, mirrorOutputPaths: mirrors } =
    await buildAutosaveBurstDashboard({
      summaryPath,
      outputPath,
      includeArtifacts,
      mirrorOutputPaths: mirrorOutputs.length > 0 ? mirrorOutputs : undefined,
      includeDefaultMirrors,
    });

  console.log(
    `[buildAutosaveBurstDashboard] Processed ${dataset.iterations} iterations ` +
      `(${dataset.successCount} successes, ${dataset.failureCount} failures) ` +
      `-> ${resolvedOutput}` +
      (mirrors.length > 0 ? ` mirrors=[${mirrors.join(', ')}]` : '')
  );
}

if (process.argv[1] && process.argv[1].includes('buildAutosaveBurstDashboard.js')) {
  main().catch((error) => {
    console.error('[buildAutosaveBurstDashboard] Failed to build dashboard dataset:', error);
    process.exitCode = 1;
  });
}
