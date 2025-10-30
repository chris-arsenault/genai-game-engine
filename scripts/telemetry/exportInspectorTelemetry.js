#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { SaveManager } from '../../src/game/managers/SaveManager.js';
import { FileSystemTelemetryWriter } from '../../src/game/telemetry/FileSystemTelemetryWriter.js';
import { CiArtifactPublisher } from '../../src/game/telemetry/CiArtifactPublisher.js';
import {
  buildBudgetStatusReport,
  formatBudgetStatusMarkdown,
} from '../../src/game/telemetry/budgetStatusReporter.js';
import { GitHubActionsArtifactFallback } from '../../src/game/telemetry/GitHubActionsArtifactFallback.js';

/**
 * Parse CLI arguments into a simple key/value map.
 * Supports `--key value`, `--key=value`, and flag boolean form.
 * Repeated keys accumulate into arrays.
 */
function parseArgs(argv) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('-')) {
      result._.push(token);
      continue;
    }

    const isLong = token.startsWith('--');
    const trimmed = isLong ? token.slice(2) : token.slice(1);
    if (!trimmed) {
      continue;
    }

    const [key, inlineValue] = trimmed.split('=', 2);
    if (!key) {
      continue;
    }

    if (inlineValue !== undefined) {
      appendArg(result, key, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      appendArg(result, key, next);
      index += 1;
    } else {
      appendArg(result, key, true);
    }
  }

  return result;
}

function appendArg(container, key, value) {
  if (container[key] === undefined) {
    container[key] = value;
    return;
  }
  if (Array.isArray(container[key])) {
    container[key].push(value);
    return;
  }
  container[key] = [container[key], value];
}

function toBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  return defaultValue;
}

function parseList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseList(entry));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [value];
}

function parseCommands(raw) {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => parseCommands(entry));
  }

  if (typeof raw === 'object') {
    return [raw];
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parseCommands(parsed);
    } catch {
      // Fall through to fallback segmentation when JSON parsing fails.
    }
  }

  if (trimmed.includes('\n')) {
    return trimmed
      .split(/\r?\n/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .flatMap((segment) => parseCommands(segment));
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .flatMap((segment) => parseCommands(segment));
  }

  return [trimmed];
}

async function resolveCiCommands(options, env, logger) {
  let commands = [];

  if (options.ciCommands !== undefined) {
    commands = parseCommands(options.ciCommands);
  }

  const envCandidates = [
    env?.TELEMETRY_CI_COMMANDS,
    env?.TELEMETRY_CI_COMMANDS_JSON,
  ].filter((value) => value !== undefined && value !== null);

  for (const candidate of envCandidates) {
    commands = commands.concat(parseCommands(candidate));
  }

  if (commands.length === 0 && env?.TELEMETRY_CI_COMMANDS_PATH) {
    try {
      const raw = await fs.readFile(path.resolve(env.TELEMETRY_CI_COMMANDS_PATH), 'utf8');
      commands = commands.concat(parseCommands(raw));
    } catch (error) {
      logger?.warn?.('[telemetry-export] Failed to read CI command file', {
        path: env.TELEMETRY_CI_COMMANDS_PATH,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return commands;
}

function normalizeStatusList(statuses) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return ['exceeds_budget'];
  }
  return statuses
    .map((status) => status)
    .filter((status) => status !== undefined && status !== null)
    .map((status) => String(status).trim().toLowerCase())
    .filter(Boolean);
}

function shouldNotifyBudgetWebhook(budgetStatus, statuses) {
  if (!budgetStatus) {
    return false;
  }

  const normalizedStatuses = normalizeStatusList(statuses);
  const statusValue = budgetStatus.status ? String(budgetStatus.status).toLowerCase() : null;
  const statusMatches = statusValue ? normalizedStatuses.includes(statusValue) : false;
  return statusMatches || Boolean(budgetStatus.hasBudgetOverruns);
}

function buildBudgetWebhookText(budgetStatus, context = {}) {
  if (!budgetStatus) {
    return 'Telemetry payload budget status: unavailable';
  }

  const lines = [];
  const statusLabel = budgetStatus.status ?? 'unknown';
  lines.push(`Telemetry payload budget status: ${statusLabel}`);

  if (budgetStatus.payloadBytes != null && budgetStatus.budgetBytes != null) {
    lines.push(
      `Payload size ${budgetStatus.payloadBytes} bytes (budget ${budgetStatus.budgetBytes} bytes)`
    );
  } else if (budgetStatus.payloadBytes != null) {
    lines.push(`Payload size ${budgetStatus.payloadBytes} bytes`);
  }

  if (budgetStatus.exceededBy != null && budgetStatus.exceededBy > 0) {
    lines.push(`Exceeded by ${budgetStatus.exceededBy} bytes`);
  }

  if (budgetStatus.generatedIso) {
    lines.push(`Generated at ${budgetStatus.generatedIso}`);
  }

  const overrunEvent = Array.isArray(budgetStatus.events)
    ? budgetStatus.events.find((event) => event && event.status === 'exceeds_budget')
    : null;

  if (overrunEvent) {
    const contextFragments = [];
    if (overrunEvent.payloadBytes != null && overrunEvent.budgetBytes != null) {
      contextFragments.push(
        `${overrunEvent.payloadBytes} bytes vs budget ${overrunEvent.budgetBytes} bytes`
      );
    }
    if (overrunEvent.exceededBy != null) {
      contextFragments.push(`+${overrunEvent.exceededBy} bytes`);
    }
    if (overrunEvent.context) {
      const contextStr =
        typeof overrunEvent.context === 'object'
          ? JSON.stringify(overrunEvent.context)
          : String(overrunEvent.context);
      contextFragments.push(`context: ${contextStr}`);
    }
    lines.push(
      `Latest exceedance: ${contextFragments.length ? contextFragments.join(' | ') : 'details in artifacts'}`
    );
  } else {
    lines.push(`Events recorded: ${Array.isArray(budgetStatus.events) ? budgetStatus.events.length : 0}`);
  }

  if (context.runId) {
    lines.push(`Run ID: ${context.runId}`);
  }
  if (context.branch) {
    lines.push(`Branch: ${context.branch}`);
  }
  if (context.prefix) {
    lines.push(`Export prefix: ${context.prefix}`);
  }
  if (context.missionId) {
    lines.push(`Mission: ${context.missionId}`);
  }

  lines.push('Source: telemetry export pipeline');
  return lines.join('\n');
}

async function sendBudgetStatusWebhook({ url, budgetStatus, context, fetchImpl, logger }) {
  const fetchFn = fetchImpl ?? (typeof fetch === 'function' ? fetch : null);

  if (!fetchFn) {
    logger?.warn?.('[telemetry-export] Skipping budget webhook (fetch unavailable).');
    return { sent: false, status: null };
  }

  const body = {
    text: buildBudgetWebhookText(budgetStatus, context),
  };

  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let responseText = '';
      if (typeof response.text === 'function') {
        try {
          responseText = await response.text();
        } catch {
          responseText = '';
        }
      }
      logger?.warn?.('[telemetry-export] Budget webhook responded with non-OK status', {
        status: response.status,
        body: responseText?.slice(0, 200) ?? null,
      });
      return {
        sent: false,
        status: response.status,
      };
    }

    return {
      sent: true,
      status: response.status,
    };
  } catch (error) {
    logger?.warn?.('[telemetry-export] Failed to send budget webhook', {
      message: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, status: null };
  }
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

/**
 * Execute the telemetry export pipeline.
 * Designed for both CLI usage and integration tests.
 * @param {Object} options
 * @returns {Promise<{ artifactDir: string, artifactPaths: string[], exportResult: Object, publishResult: Object }>}
 */
export async function runTelemetryExport(options = {}) {
  const env = options.env ?? (typeof process !== 'undefined' ? process.env : {});
  const logger = options.logger ?? console;

  const artifactDirInput =
    options.artifactDir ?? env.TELEMETRY_EXPORT_DIR ?? './telemetry-artifacts';
  const resolvedArtifactDir = path.resolve(artifactDirInput);
  const metadataPathInput =
    options.metadataPath ?? path.join(resolvedArtifactDir, 'ci-artifacts.json');
  const resolvedMetadataPath = path.resolve(metadataPathInput);

  const formats = Array.isArray(options.formats) ? options.formats : parseList(options.formats);
  const prefix = options.prefix ?? 'save-inspector';
  const dryRun = typeof options.dryRun === 'boolean' ? options.dryRun : !Boolean(env?.CI);

  const context = {
    runId: options.runId ?? env.BUILD_ID ?? env.GITHUB_RUN_ID ?? null,
    ...options.context,
  };

  const budgetWebhookUrl =
    options.budgetWebhook ?? env?.TELEMETRY_BUDGET_WEBHOOK_URL ?? null;
  const budgetWebhookStatuses = parseList(
    options.budgetWebhookStatuses ?? env?.TELEMETRY_BUDGET_WEBHOOK_STATUSES
  );

  const eventBus = options.eventBus ?? new EventBus();
  const worldStateStore =
    options.worldStateStore ?? new WorldStateStore(eventBus, { enableDebug: false });
  worldStateStore.init();

  const budgetEvents = [];
  const removeBudgetListener = eventBus.on('telemetry:export_budget_status', (payload = {}) => {
    budgetEvents.push({
      status: typeof payload.status === 'string' ? payload.status : 'unknown',
      type: payload.type ?? null,
      payloadBytes: payload.payloadBytes ?? null,
      budgetBytes: payload.budgetBytes ?? null,
      exceededBy: payload.exceededBy ?? null,
      context: payload.context ?? null,
      recordedAt: payload.updatedAt ?? Date.now(),
    });
  });

  try {
    const budgetWebhookResult = {
      attempted: false,
      sent: false,
      status: null,
      url: budgetWebhookUrl ?? null,
    };
    let snapshotData = options.snapshot ?? null;
    if (!snapshotData && options.snapshotPath) {
      const snapshotRaw = await fs.readFile(path.resolve(options.snapshotPath), 'utf8');
      snapshotData = JSON.parse(snapshotRaw);
    }
    if (snapshotData) {
      worldStateStore.hydrate(snapshotData);
    }

    const storage = options.storage ?? createMemoryStorage();
    if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
      globalThis.localStorage = storage;
    }

    const fileSystemWriter =
      options.filesystemWriter ?? new FileSystemTelemetryWriter({ artifactRoot: resolvedArtifactDir });

    const saveManager =
      options.saveManager ??
      new SaveManager(eventBus, {
        worldStateStore,
        storage,
        telemetryWriters: [fileSystemWriter],
      });

    const exportResult = await saveManager.exportInspectorSummary({
      prefix,
      formats: formats.length ? formats : undefined,
      writerContext: {
        artifactDir: resolvedArtifactDir,
        ...(options.writerContext ?? {}),
      },
    });

    const budgetStatus = buildBudgetStatusReport({
      summary: exportResult.summary,
      events: budgetEvents,
    });

    const budgetArtifacts = [];
    if (budgetStatus) {
      await fs.mkdir(resolvedArtifactDir, { recursive: true });

      const budgetJsonFilename = `${prefix}-budget-status.json`;
      const budgetJsonPath = path.join(resolvedArtifactDir, budgetJsonFilename);
      await fs.writeFile(budgetJsonPath, `${JSON.stringify(budgetStatus, null, 2)}\n`, 'utf8');

      const budgetMarkdownFilename = `${prefix}-budget-status.md`;
      const budgetMarkdownPath = path.join(resolvedArtifactDir, budgetMarkdownFilename);
      const budgetMarkdown = formatBudgetStatusMarkdown(budgetStatus);
      await fs.writeFile(budgetMarkdownPath, `${budgetMarkdown}\n`, 'utf8');

      budgetArtifacts.push(
        {
          type: 'json',
          section: 'budget-status',
          filename: budgetJsonFilename,
          mimeType: 'application/json',
        },
        {
          type: 'markdown',
          section: 'budget-status',
          filename: budgetMarkdownFilename,
          mimeType: 'text/markdown',
        }
      );

      const stepSummaryPath = options.stepSummaryPath ?? env?.GITHUB_STEP_SUMMARY ?? null;
      if (stepSummaryPath) {
        try {
          await fs.mkdir(path.dirname(stepSummaryPath), { recursive: true });
          await fs.appendFile(stepSummaryPath, `${budgetMarkdown}\n`, 'utf8');
        } catch (summaryError) {
          logger?.warn?.('[telemetry-export] Failed to append budget status summary', {
            summaryPath: stepSummaryPath,
            message:
              summaryError instanceof Error ? summaryError.message : String(summaryError),
          });
        }
      }
    }

    if (budgetArtifacts.length) {
      exportResult.artifacts = [...exportResult.artifacts, ...budgetArtifacts];
    }

    if (budgetWebhookUrl && budgetStatus) {
      const shouldSend = shouldNotifyBudgetWebhook(budgetStatus, budgetWebhookStatuses);
      if (shouldSend) {
        budgetWebhookResult.attempted = true;
        const webhookResponse = await sendBudgetStatusWebhook({
          url: budgetWebhookUrl,
          budgetStatus,
          context,
          fetchImpl: options.fetchImpl,
          logger,
        });
        budgetWebhookResult.sent = webhookResponse.sent;
        budgetWebhookResult.status = webhookResponse.status ?? null;
      }
    }

    const artifactPaths = exportResult.artifacts.map((artifact) =>
      path.resolve(resolvedArtifactDir, artifact.filename)
    );

    const ciCommands = await resolveCiCommands(options, env, logger);

    const fallbackUploaders =
      Array.isArray(options.fallbackUploaders) && options.fallbackUploaders.length > 0
        ? options.fallbackUploaders
        : thisMayUseGitHubActions(env)
          ? [
              new GitHubActionsArtifactFallback({
                logger,
                env,
              }),
            ]
          : [];

    const ciPublisher =
      options.ciPublisher ??
      new CiArtifactPublisher({
        metadataPath: resolvedMetadataPath,
        dryRun,
        commands: ciCommands,
        env,
        eventBus,
        logger,
        commandRunner: options.commandRunner,
        fallbackUploaders,
      });

    const publishContext = {
      ...context,
      prefix,
      artifactDir: resolvedArtifactDir,
      artifactFilenames: exportResult.artifacts.map((artifact) => artifact.filename),
      metrics: exportResult.metrics,
      summarySource: exportResult.summary?.source ?? 'unknown',
      budgetStatus,
    };

    const publishResult = await ciPublisher.publish(artifactPaths, publishContext);

    return {
      artifactDir: resolvedArtifactDir,
      artifactPaths,
      exportResult,
      publishResult,
      budgetStatus,
      budgetWebhook: budgetWebhookResult,
    };
  } finally {
    if (typeof removeBudgetListener === 'function') {
      removeBudgetListener();
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const formats = parseList(args.format ?? args.formats);
  const ciCommands = args.ciCommand ?? args.ciCommands ?? null;
  let context = {};

  if (args.context) {
    try {
      context = JSON.parse(Array.isArray(args.context) ? args.context.at(-1) : args.context);
    } catch (error) {
      console.warn('[telemetry-export] Failed to parse --context JSON, continuing with defaults.', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const result = await runTelemetryExport({
      artifactDir: args.artifactDir,
      metadataPath: args.metadata,
      formats,
      prefix: args.prefix,
      snapshotPath: args.snapshot,
      dryRun: args.dryRun !== undefined ? toBoolean(args.dryRun, false) : undefined,
      ciCommands,
      budgetWebhook: args['budget-webhook'] ?? args.budgetWebhook,
      budgetWebhookStatuses:
        args['budget-webhook-status'] ??
        args['budget-webhook-statuses'] ??
        args.budgetWebhookStatus ??
        args.budgetWebhookStatuses,
      context,
      env: process.env,
    });

    console.log('[telemetry-export] Inspector summary source:', result.exportResult.summary?.source);
    console.log('[telemetry-export] Artifacts generated:', result.exportResult.artifacts.length);
    console.log('[telemetry-export] Artifact directory:', result.artifactDir);
    console.log(
      '[telemetry-export] Files:',
      result.artifactPaths.map((filepath) => path.relative(process.cwd(), filepath)).join(', ')
    );
    if (result.budgetStatus) {
      console.log('[telemetry-export] Budget status:', result.budgetStatus.status);
    }
    console.log('[telemetry-export] Metadata manifest:', result.publishResult.metadataPath);
    console.log(
      '[telemetry-export] CI dry-run:',
      result.publishResult.metadata?.dryRun ?? !Boolean(process.env.CI)
    );
  } catch (error) {
    console.error('[telemetry-export] Export failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  path.basename(process.argv[1] || '') === 'exportInspectorTelemetry.js' &&
  !process.env.JEST_WORKER_ID
) {
  main();
}

function thisMayUseGitHubActions(env) {
  if (!env) {
    return false;
  }
  return Boolean(env.GITHUB_ACTIONS === 'true' || env.ACTIONS_RUNTIME_URL || env.RUNNER_NAME);
}
