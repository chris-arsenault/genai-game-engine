import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { runTelemetryExport } from '../../scripts/telemetry/exportInspectorTelemetry.js';

function seedWorldStateStore(worldStateStore) {
  const cascadeTimestamp = Date.UTC(2025, 9, 30, 17, 0, 0);
  const tutorialTimestamp = Date.UTC(2025, 9, 30, 17, 5, 0);

  worldStateStore.state.faction.byId = {
    luminari_syndicate: {
      id: 'luminari_syndicate',
      cascadeCount: 2,
      cascadeSources: ['vanguard_prime'],
      lastCascade: {
        sourceFactionId: 'vanguard_prime',
        sourceFactionName: 'Vanguard Prime',
        occurredAt: cascadeTimestamp,
        newAttitude: 'friendly',
      },
    },
  };
  worldStateStore.state.faction.lastCascadeEvent = {
    targetFactionId: 'luminari_syndicate',
    targetFactionName: 'The Luminari Syndicate',
    sourceFactionId: 'vanguard_prime',
    sourceFactionName: 'Vanguard Prime',
    newAttitude: 'friendly',
    occurredAt: cascadeTimestamp,
  };

  worldStateStore.state.tutorial.promptHistorySnapshots = [
    {
      event: 'step_completed',
      timestamp: tutorialTimestamp,
      stepId: 'tutorial_intro',
      stepIndex: 1,
      totalSteps: 4,
      completedSteps: ['intro'],
      currentPrompt: {
        title: 'Tutorial Intro',
        stepId: 'tutorial_intro',
        stepIndex: 1,
        totalSteps: 4,
        canSkip: false,
      },
      promptHistory: [],
      analytics: {
        completedTimeline: {},
        stepDurations: {},
      },
      metadata: {
        promptId: 'tutorial_intro',
        zoneId: 'tutorial',
        dismissed: false,
      },
    },
  ];
}

function createSeededWorldStateStore() {
  const eventBus = new EventBus();
  const worldStateStore = new WorldStateStore(eventBus, { enableDebug: false });
  worldStateStore.init();
  seedWorldStateStore(worldStateStore);
  return { eventBus, worldStateStore };
}

describe('telemetry export CLI', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'telemetry-export-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('produces inspector telemetry artifacts and CI metadata manifest', async () => {
    const artifactDir = path.join(tempDir, 'artifacts');
    const metadataPath = path.join(tempDir, 'ci', 'manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'integration',
      formats: ['json', 'csv', 'transcript-csv', 'transcript-md'],
      dryRun: true,
      env: { CI: '' },
      eventBus,
      worldStateStore,
      context: { missionId: 'cascade', branch: 'integration-test' },
    });

    expect(result.exportResult.summary.source).toBe('worldStateStore');
    expect(result.exportResult.artifacts).toHaveLength(7);
    expect(
      result.exportResult.artifacts.some((artifact) => artifact.filename.endsWith('budget-status.json'))
    ).toBe(true);
    expect(
      result.exportResult.artifacts.some((artifact) => artifact.filename.endsWith('budget-status.md'))
    ).toBe(true);
    expect(result.budgetStatus).toBeDefined();

    const expectedFiles = result.exportResult.artifacts.map((artifact) =>
      path.join(artifactDir, artifact.filename)
    );

    for (const filepath of expectedFiles) {
      const stat = await fs.stat(filepath);
      expect(stat.isFile()).toBe(true);
    }

    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    expect(metadata.dryRun).toBe(true);
    expect(metadata.artifacts).toHaveLength(7);
    expect(metadata.context).toEqual(
      expect.objectContaining({
        missionId: 'cascade',
        branch: 'integration-test',
        prefix: 'integration',
        budgetStatus: expect.objectContaining({ status: expect.any(String) }),
      })
    );
    expect(result.publishResult.commandResults).toEqual([]);
    expect(result.exportResult.summary.tutorial.transcript).toEqual([]);
  });

  test('executes CI upload commands configured via TELEMETRY_CI_COMMANDS', async () => {
    const artifactDir = path.join(tempDir, 'artifacts-env');
    const metadataPath = path.join(tempDir, 'ci', 'env-manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();
    const commandRunner = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: 'uploaded',
      stderr: '',
    });

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'env',
      env: {
        CI: 'true',
        TELEMETRY_CI_COMMANDS: JSON.stringify([{ command: 'echo', args: ['upload'] }]),
      },
      eventBus,
      worldStateStore,
      commandRunner,
    });

    expect(result.budgetStatus).toBeDefined();
    expect(commandRunner).toHaveBeenCalledWith(
      'echo',
      ['upload'],
      expect.objectContaining({
        env: expect.objectContaining({ CI: 'true' }),
      })
    );
    expect(result.publishResult.commandResults).toHaveLength(1);
    expect(result.publishResult.commandResults[0]).toEqual(
      expect.objectContaining({
        command: 'echo',
        exitCode: 0,
      })
    );
  });

  test('loads CI upload commands from TELEMETRY_CI_COMMANDS_PATH when env list absent', async () => {
    const artifactDir = path.join(tempDir, 'artifacts-file');
    const metadataPath = path.join(tempDir, 'ci', 'file-manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();
    const commandRunner = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: 'uploaded',
      stderr: '',
    });

    const commandFile = path.join(tempDir, 'telemetry-ci-commands.json');
    await fs.writeFile(
      commandFile,
      JSON.stringify([{ command: 'echo', args: ['from-file'] }], null, 2),
      'utf8'
    );

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'file',
      env: {
        CI: 'true',
        TELEMETRY_CI_COMMANDS_PATH: commandFile,
      },
      eventBus,
      worldStateStore,
      commandRunner,
    });

    expect(result.budgetStatus).toBeDefined();
    expect(commandRunner).toHaveBeenCalledWith(
      'echo',
      ['from-file'],
      expect.objectContaining({
        env: expect.objectContaining({ CI: 'true' }),
      })
    );
    expect(result.publishResult.commandResults).toHaveLength(1);
    expect(result.publishResult.commandResults[0]).toEqual(
      expect.objectContaining({
        command: 'echo',
        exitCode: 0,
      })
    );
  });

  test('sends budget webhook notification when overruns detected', async () => {
    const artifactDir = path.join(tempDir, 'artifacts-webhook');
    const metadataPath = path.join(tempDir, 'ci', 'webhook-manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });

    const fakeSaveManager = {
      exportInspectorSummary: jest.fn(async () => {
        eventBus.emit('telemetry:export_budget_status', {
          status: 'exceeds_budget',
          payloadBytes: 13000,
          budgetBytes: 12000,
          exceededBy: 1000,
          context: { label: 'spatial-history' },
          updatedAt: Date.UTC(2025, 9, 30, 18, 15, 0),
        });

        return {
          summary: {
            source: 'worldStateStore',
            generatedAt: Date.UTC(2025, 9, 30, 18, 15, 0),
            engine: {
              spatialHash: {
                payloadBudgetStatus: 'exceeds_budget',
                payloadBytes: 13000,
                payloadBudgetBytes: 12000,
                payloadBudgetExceededBy: 1000,
              },
            },
          },
          artifacts: [],
          metrics: {},
        };
      }),
    };

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'webhook',
      env: { CI: 'true', TELEMETRY_BUDGET_WEBHOOK_URL: 'https://hooks.example.com/test' },
      eventBus,
      worldStateStore,
      saveManager: fakeSaveManager,
      filesystemWriter: { write: jest.fn(), finalize: jest.fn() },
      fetchImpl: fetchMock,
      dryRun: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hooks.example.com/test');
    expect(options).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.any(String),
      })
    );
    const payload = JSON.parse(options.body);
    expect(payload.text).toContain('Telemetry payload budget status');
    expect(payload.text).toContain('exceeds_budget');
    expect(result.budgetWebhook).toEqual(
      expect.objectContaining({ attempted: true, sent: true, url: 'https://hooks.example.com/test' })
    );
  });

  test('does not send budget webhook when status not configured', async () => {
    const artifactDir = path.join(tempDir, 'artifacts-webhook-none');
    const metadataPath = path.join(tempDir, 'ci', 'webhook-none-manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();
    const fetchMock = jest.fn();

    const fakeSaveManager = {
      exportInspectorSummary: jest.fn(async () => ({
        summary: {
          source: 'worldStateStore',
          generatedAt: Date.UTC(2025, 9, 30, 18, 30, 0),
          engine: {
            spatialHash: {
              payloadBudgetStatus: 'within_budget',
              payloadBytes: 8200,
              payloadBudgetBytes: 12000,
              payloadBudgetExceededBy: 0,
            },
          },
        },
        artifacts: [],
        metrics: {},
      })),
    };

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'webhook-none',
      env: { CI: 'true', TELEMETRY_BUDGET_WEBHOOK_URL: 'https://hooks.example.com/test' },
      eventBus,
      worldStateStore,
      saveManager: fakeSaveManager,
      filesystemWriter: { write: jest.fn(), finalize: jest.fn() },
      fetchImpl: fetchMock,
      dryRun: true,
      budgetWebhookStatuses: ['exceeds_budget'],
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.budgetWebhook).toEqual(
      expect.objectContaining({ attempted: false, sent: false, url: 'https://hooks.example.com/test' })
    );
  });

  test('gracefully skips commands when runner indicates missing executable', async () => {
    const artifactDir = path.join(tempDir, 'artifacts-missing');
    const metadataPath = path.join(tempDir, 'ci', 'missing-manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();
    const missingError = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    const commandRunner = jest.fn().mockRejectedValue(missingError);

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'missing',
      env: {
        CI: 'true',
        TELEMETRY_CI_COMMANDS: JSON.stringify([{ command: 'gh', args: ['artifact', 'upload'] }]),
      },
      eventBus,
      worldStateStore,
      commandRunner,
    });

    expect(commandRunner).toHaveBeenCalledWith(
      'gh',
      ['artifact', 'upload'],
      expect.objectContaining({ env: expect.objectContaining({ CI: 'true' }) })
    );
    expect(result.publishResult.commandResults).toEqual([
      expect.objectContaining({
        command: 'gh',
        status: 'skipped',
        skippedReason: 'command_not_found',
        exitCode: 127,
      }),
    ]);
  });

  test('invokes fallback uploader when publish command is missing', async () => {
    const artifactDir = path.join(tempDir, 'artifacts-fallback');
    const metadataPath = path.join(tempDir, 'ci', 'fallback-manifest.json');
    const { eventBus, worldStateStore } = createSeededWorldStateStore();
    const missingError = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    const commandRunner = jest.fn().mockRejectedValue(missingError);
    const fallbackUploader = {
      upload: jest.fn().mockResolvedValue({
        provider: 'githubActionsApi',
        status: 'uploaded',
        exitCode: 0,
        command: 'actions.artifact.upload',
        files: [],
        artifactDir,
        artifactName: 'fallback-telemetry',
      }),
    };

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'fallback',
      env: {
        CI: 'true',
        TELEMETRY_CI_COMMANDS: JSON.stringify([{ command: 'gh', args: ['artifact', 'upload'] }]),
      },
      eventBus,
      worldStateStore,
      commandRunner,
      fallbackUploaders: [fallbackUploader],
    });

    expect(fallbackUploader.upload).toHaveBeenCalled();
    expect(result.publishResult.commandResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'githubActionsApi',
          status: 'uploaded',
        }),
      ])
    );
    expect(result.publishResult.metadata.providerResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'githubActionsApi',
          status: 'uploaded',
        }),
      ])
    );
  });
});
