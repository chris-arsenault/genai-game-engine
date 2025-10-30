#!/usr/bin/env node
/**
 * exportControlBindingsObservations
 *
 * Consumes a control bindings overlay observation log (JSON) and produces
 * qualitative summaries for UX micro-playtests. Outputs both JSON and Markdown
 * summaries under reports/ux/.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { ControlBindingsObservationLog } from '../../src/game/telemetry/ControlBindingsObservationLog.js';

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatActionId(actionId) {
  if (typeof actionId !== 'string' || !actionId.length) {
    return 'Unknown action';
  }
  const spaced = actionId
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatRatio(ratio = {}) {
  const numerator = Number.isFinite(ratio.numerator) ? Math.max(0, ratio.numerator) : 0;
  const denominator = Number.isFinite(ratio.denominator) ? Math.max(0, ratio.denominator) : 0;
  const percentage = typeof ratio.percentage === 'string' && ratio.percentage.length
    ? ratio.percentage
    : denominator > 0
      ? `${Math.round((numerator / denominator) * 100)}%`
      : '0%';
  return `${percentage} (${numerator}/${denominator})`;
}

function formatMs(ms) {
  const value = Number.isFinite(ms) ? ms : 0;
  if (value <= 0) {
    return '0s';
  }
  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }
  if (value < 60000) {
    const seconds = value / 1000;
    return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(value / 60000);
  const seconds = Math.round((value % 60000) / 1000);
  if (seconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function parseArgs(argv) {
  const options = {
    inputPath: null,
    outputDir: 'reports/ux',
    label: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }

    if (!options.inputPath && !arg.startsWith('--')) {
      options.inputPath = arg;
      continue;
    }

    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length);
    } else if (arg === '--input' && i + 1 < argv.length) {
      options.inputPath = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--out=')) {
      options.outputDir = arg.slice('--out='.length);
    } else if (arg === '--out' && i + 1 < argv.length) {
      options.outputDir = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--label=')) {
      options.label = arg.slice('--label='.length);
    } else if (arg === '--label' && i + 1 < argv.length) {
      options.label = argv[i + 1];
      i += 1;
    }
  }

  if (!options.inputPath) {
    throw new Error('exportControlBindingsObservations requires an input JSON file path.');
  }

  return options;
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadObservationData(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function ingestObservationPayload(payload) {
  const log = new ControlBindingsObservationLog({ maxEntries: Number.MAX_SAFE_INTEGER });

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      log.record(entry);
    }
    return log;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.events)) {
      for (const entry of payload.events) {
        log.record(entry);
      }
    } else if (Array.isArray(payload.log)) {
      for (const entry of payload.log) {
        log.record(entry);
      }
    } else {
      throw new Error('Unsupported payload shape: expected events array.');
    }
    return log;
  }

  throw new Error('Unsupported observation payload.');
}

function generateRecommendations(summary) {
  const recs = [];
  if (!summary || typeof summary !== 'object') {
    return recs;
  }

  const metrics = summary.metrics || {};
  const dwell = summary.dwell || {};
  const ratios = summary.ratios || {};
  const selectionRatio = Number.isFinite(ratios.selectionBlocked?.value)
    ? ratios.selectionBlocked.value
    : 0;
  const pageRatio = Number.isFinite(ratios.pageNavigationBlocked?.value)
    ? ratios.pageNavigationBlocked.value
    : 0;

  if ((metrics.pageNavigationBlocked || 0) > (metrics.pageNavigations || 0)) {
    recs.push('Testers attempted to page beyond available content frequently; consider clearer paging affordances or wrap-around navigation.');
  }

  if ((metrics.listModeChanges || 0) === 0) {
    recs.push('No list mode changes observed. Reinforce `[` and `]` shortcuts or surface a UI affordance for alternate views.');
  }

  if ((metrics.captureStarted || 0) > 0 && (metrics.bindingsApplied || 0) === 0) {
    recs.push('Players started remapping but never applied changes. Audit remap confirmation messaging or success feedback.');
  }

  if ((metrics.selectionBlocked || 0) > metrics.selectionMoves) {
    recs.push('Selection movement was often blocked, suggesting the focus state may be unclear when the overlay opens.');
  }

  if ((metrics.manualOverrideEvents || 0) > 0 && (summary.listModesVisited || []).length <= 1) {
    recs.push('Manual page overrides were used without switching list modes—consider surfacing total page count earlier.');
  }

  if ((dwell.averageMs || 0) >= 2500) {
    recs.push(`Average dwell between selection changes exceeded ${formatMs(2500)}; consider reinforcing focused row styling or contextual hints to reduce hesitation.`);
  }

  if ((dwell.maxMs || 0) >= 5000) {
    const actionLabel = formatActionId(dwell.longestAction);
    recs.push(`One selection lingered for ${formatMs(dwell.maxMs)} on ${actionLabel}. Review the detail panel or default highlight to ensure players understand the next action.`);
  }

  if (selectionRatio >= 0.35) {
    recs.push(`Roughly ${formatRatio(ratios.selectionBlocked)} of selection attempts were blocked; audit default focus position and highlight transitions when opening the overlay.`);
  }

  if (pageRatio >= 0.4) {
    recs.push(`Paging attempts were blocked ${formatRatio(ratios.pageNavigationBlocked)} of the time—consider clearer boundaries or wrap-around paging to prevent dead ends.`);
  }

  return recs;
}

function renderMarkdownSummary(summary, recommendations, recentEvents) {
  const lines = [];
  lines.push('# Control Bindings Overlay Observation Summary');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Total Events: ${summary.totalEvents}`);
  lines.push(`- Session Duration: ${summary.durationLabel}`);
  lines.push('');
  lines.push('## Metrics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  const metrics = summary.metrics || {};
  const metricRows = [
    ['Selection Moves', metrics.selectionMoves],
    ['Selection Blocked', metrics.selectionBlocked],
    ['List Mode Changes', metrics.listModeChanges],
    ['List Mode Attempts (No Change)', metrics.listModeUnchanged],
    ['Page Navigations', metrics.pageNavigations],
    ['Page Navigation Blocked', metrics.pageNavigationBlocked],
    ['Direct Page Set Changes', metrics.pageSetChanges],
    ['Direct Page Set Blocked', metrics.pageSetBlocked],
    ['Capture Started', metrics.captureStarted],
    ['Capture Cancelled', metrics.captureCancelled],
    ['Bindings Applied', metrics.bindingsApplied],
    ['Bindings Reset', metrics.bindingsReset],
    ['Manual Override Events', metrics.manualOverrideEvents],
  ];
  for (const [label, value] of metricRows) {
    lines.push(`| ${label} | ${value ?? 0} |`);
  }
  lines.push('');

  const dwell = summary.dwell || {};
  const ratios = summary.ratios || {};
  lines.push('## Navigation Heuristics');
  lines.push('');
  lines.push('| Heuristic | Value |');
  lines.push('| --- | --- |');
  const longestActionLabel = dwell.longestAction ? ` (on ${formatActionId(dwell.longestAction)})` : '';
  const lastActionLabel = dwell.lastAction ? ` on ${formatActionId(dwell.lastAction)}` : '';
  lines.push(`| Average dwell between selection changes | ${dwell.averageLabel || formatMs(dwell.averageMs)} |`);
  lines.push(`| Longest dwell | ${dwell.maxLabel || formatMs(dwell.maxMs)}${longestActionLabel} |`);
  lines.push(`| Last recorded dwell | ${dwell.lastLabel || formatMs(dwell.lastMs)}${lastActionLabel} |`);
  lines.push(`| Selection blocked ratio | ${formatRatio(ratios.selectionBlocked)} |`);
  lines.push(`| Paging blocked ratio | ${formatRatio(ratios.pageNavigationBlocked)} |`);
  lines.push('');

  if (summary.actionsVisited && summary.actionsVisited.length) {
    lines.push('## Actions Visited');
    lines.push('');
    for (const action of summary.actionsVisited) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }

  if (summary.actionsRemapped && summary.actionsRemapped.length) {
    lines.push('## Actions Remapped');
    lines.push('');
    for (const action of summary.actionsRemapped) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }

  if (summary.listModesVisited && summary.listModesVisited.length) {
    lines.push('## List Modes Visited');
    lines.push('');
    for (const mode of summary.listModesVisited) {
      lines.push(`- ${mode}`);
    }
    lines.push('');
  }

  if (summary.pageRange) {
    lines.push('## Page Range');
    lines.push('');
    lines.push(`- First Page Observed: ${summary.pageRange.min}`);
    lines.push(`- Last Page Observed: ${summary.pageRange.max}`);
    lines.push('');
  }

  const cancelReasons = summary.metrics?.captureCancelReasons || {};
  if (Object.keys(cancelReasons).length) {
    lines.push('## Capture Cancellation Reasons');
    lines.push('');
    for (const [reason, count] of Object.entries(cancelReasons)) {
      lines.push(`- ${reason}: ${count}`);
    }
    lines.push('');
  }

  if (recommendations.length) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  if (recentEvents.length) {
    lines.push('## Recent Events');
    lines.push('');
    lines.push('| Timestamp | Event | Action | Details |');
    lines.push('| --- | --- | --- | --- |');
    for (const event of recentEvents) {
      const timestamp = new Date(event.timestamp).toISOString();
      const action = event.action ?? event.selectedAction ?? '—';
      const details = [];
      if (typeof event.changed === 'boolean') {
        details.push(`changed=${event.changed}`);
      }
      if (typeof event.listMode === 'string') {
        details.push(`mode=${event.listMode}`);
      }
      if (typeof event.pageIndex === 'number') {
        details.push(`page=${event.pageIndex}`);
      }
      lines.push(`| ${timestamp} | ${event.event} | ${action} | ${details.join(', ') || '—'} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const resolvedInput = path.resolve(options.inputPath);
    const payload = loadObservationData(resolvedInput);
    const log = ingestObservationPayload(payload);
    const summary = log.getSummary();
    const events = log.getEvents();
    const recommendations = generateRecommendations(summary);
    const recentEvents = events.slice(-10);

    const outputDir = path.resolve(options.outputDir);
    ensureDirExists(outputDir);

    const baseName = options.label
      ? `control-bindings-observation-summary-${slugify(options.label)}`
      : 'control-bindings-observation-summary';

    const jsonOutput = {
      generatedAt: new Date().toISOString(),
      inputFile: resolvedInput,
      summary,
      recommendations,
      sample: recentEvents,
    };

    fs.writeFileSync(
      path.join(outputDir, `${baseName}.json`),
      JSON.stringify(jsonOutput, null, 2),
      'utf8'
    );

    const markdown = renderMarkdownSummary(summary, recommendations, recentEvents);
    fs.writeFileSync(
      path.join(outputDir, `${baseName}.md`),
      markdown,
      'utf8'
    );

    console.log(`[exportControlBindingsObservations] Wrote summary to ${outputDir}`);
  } catch (error) {
    console.error('[exportControlBindingsObservations] Failed:', error.message);
    process.exitCode = 1;
  }
}

main();
