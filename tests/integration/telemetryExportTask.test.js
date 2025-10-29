import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { runTelemetryExport } from '../../scripts/telemetry/exportInspectorTelemetry.js';

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

    const eventBus = new EventBus();
    const worldStateStore = new WorldStateStore(eventBus, { enableDebug: false });
    worldStateStore.init();

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

    const result = await runTelemetryExport({
      artifactDir,
      metadataPath,
      prefix: 'integration',
      dryRun: true,
      env: { CI: '' },
      eventBus,
      worldStateStore,
      context: { missionId: 'cascade', branch: 'integration-test' },
    });

    expect(result.exportResult.summary.source).toBe('worldStateStore');
    expect(result.exportResult.artifacts).toHaveLength(3);

    const expectedFiles = result.exportResult.artifacts.map((artifact) =>
      path.join(artifactDir, artifact.filename)
    );

    for (const filepath of expectedFiles) {
      const stat = await fs.stat(filepath);
      expect(stat.isFile()).toBe(true);
    }

    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    expect(metadata.dryRun).toBe(true);
    expect(metadata.artifacts).toHaveLength(3);
    expect(metadata.context).toEqual(
      expect.objectContaining({
        missionId: 'cascade',
        branch: 'integration-test',
        prefix: 'integration',
      })
    );
    expect(result.publishResult.commandResults).toEqual([]);
  });
});

