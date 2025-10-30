import {
  createInspectorExportArtifacts,
  SPATIAL_HISTORY_BUDGET_BYTES,
} from '../../../src/game/telemetry/inspectorTelemetryExporter.js';

describe('inspectorTelemetryExporter', () => {
  test('generates JSON and CSV artifacts from inspector summary', () => {
    const summary = {
      generatedAt: Date.UTC(2025, 9, 30, 17, 5, 0),
      source: 'worldStateStore',
      factions: {
        lastCascadeEvent: {
          targetFactionId: 'luminari_syndicate',
          targetFactionName: 'The Luminari Syndicate',
          sourceFactionId: 'vanguard_prime',
          sourceFactionName: 'Vanguard Prime',
          newAttitude: 'friendly',
          occurredAt: Date.UTC(2025, 9, 30, 17, 4, 0),
        },
        cascadeTargets: [
          {
            factionId: 'luminari_syndicate',
            cascadeCount: 2,
            lastCascade: {
              sourceFactionId: 'vanguard_prime',
              sourceFactionName: 'Vanguard Prime',
              newAttitude: 'friendly',
              occurredAt: Date.UTC(2025, 9, 30, 17, 4, 0),
            },
            sources: ['vanguard_prime'],
          },
          {
            factionId: 'wraith_network',
            cascadeCount: 1,
            lastCascade: {
              sourceFactionId: 'vanguard_prime',
              sourceFactionName: 'Vanguard Prime',
              newAttitude: 'hostile',
              occurredAt: Date.UTC(2025, 9, 30, 17, 4, 30),
            },
            sources: ['vanguard_prime'],
          },
        ],
        recentMemberRemovals: [
          {
            factionId: 'luminari_syndicate',
            factionName: 'The Luminari Syndicate',
            npcId: 'operative_echo',
            entityId: 512,
            tag: 'npc',
            removedAt: Date.UTC(2025, 9, 30, 17, 4, 50),
          },
        ],
      },
      tutorial: {
        latestSnapshot: {
          event: 'tutorial_completed',
          timestamp: Date.UTC(2025, 9, 30, 17, 4, 45),
          stepId: 'tutorial_complete',
          totalSteps: 5,
          completedSteps: ['intro', 'movement'],
        },
        snapshots: [
          {
            event: 'tutorial_started',
            timestamp: Date.UTC(2025, 9, 30, 17, 0, 0),
            stepIndex: 0,
            totalSteps: 5,
            stepId: 'intro',
            title: 'Introduction',
            completedSteps: [],
          },
          {
            event: 'tutorial_completed',
            timestamp: Date.UTC(2025, 9, 30, 17, 4, 45),
            stepIndex: 4,
            totalSteps: 5,
            stepId: 'tutorial_complete',
            title: 'Tutorial Complete',
            completedSteps: ['intro', 'movement'],
            promptId: 'tutorial_complete_prompt',
          },
        ],
        transcript: [
          {
            sequence: 0,
            event: 'tutorial_step_started',
            promptId: 'intro',
            title: 'Introduction',
            action: 'step_started',
            timestamp: Date.UTC(2025, 9, 30, 17, 0, 0),
            timestampIso: new Date(Date.UTC(2025, 9, 30, 17, 0, 0)).toISOString(),
            followUpNarrative: null,
            metadata: { stepIndex: 0 },
          },
        ],
      },
      engine: {
        spatialHash: {
          cellSize: '128',
          window: 180.8,
          sampleCount: '4',
          lastSample: {
            cellCount: '58',
            maxBucketSize: '5',
            trackedEntities: '47',
            timestamp: '1700001004000',
          },
          aggregates: {
            cellCount: { average: '52.5', min: '48', max: '60' },
            maxBucketSize: { average: '4.2', min: '3', max: '6' },
            trackedEntities: { average: '45.1', min: '40', max: '50' },
          },
          stats: { insertions: '420', updates: '280', removals: undefined },
          history: [
            { cellCount: '50', maxBucketSize: '4', trackedEntities: '42', timestamp: '1700001001000' },
            { cellCount: '52', maxBucketSize: '4', trackedEntities: '43', timestamp: '1700001002000' },
            { cellCount: '54', maxBucketSize: '5', trackedEntities: '45', timestamp: '1700001003000' },
            { cellCount: '58', maxBucketSize: '5', trackedEntities: '47', timestamp: '1700001004000' },
          ],
          payloadBytes: null,
        },
      },
    };

    const { artifacts, summary: sanitized } = createInspectorExportArtifacts(summary, {
      prefix: 'qa-export',
      formats: ['json', 'csv', 'transcript-csv', 'transcript-md'],
    });

    expect(sanitized.generatedAt).toBe(summary.generatedAt);
    expect(sanitized.factions.metrics.cascadeTargetCount).toBe(2);
    expect(sanitized.tutorial.metrics.snapshotCount).toBe(2);
    expect(sanitized.tutorial.metrics.transcriptCount).toBe(1);
    expect(sanitized.factions.metrics.recentMemberRemovalCount).toBe(1);
    expect(sanitized.factions.recentMemberRemovals).toHaveLength(1);
    expect(sanitized.factions.recentMemberRemovals[0]).toMatchObject({
      factionId: 'luminari_syndicate',
      npcId: 'operative_echo',
      removedIso: new Date(Date.UTC(2025, 9, 30, 17, 4, 50)).toISOString(),
    });
    expect(sanitized.tutorial.transcript[0]).toEqual(
      expect.objectContaining({ promptId: 'intro', sequence: 0 })
    );
    expect(sanitized.engine.spatialHash).toEqual(
      expect.objectContaining({
        cellSize: 128,
        window: 180,
        sampleCount: 4,
        history: expect.arrayContaining([
          expect.objectContaining({ cellCount: 50 }),
          expect.objectContaining({ cellCount: 58 }),
        ]),
        stats: expect.objectContaining({ insertions: 420, updates: 280 }),
        payloadBudgetBytes: SPATIAL_HISTORY_BUDGET_BYTES,
        payloadBudgetStatus: 'within_budget',
        payloadBudgetExceededBy: 0,
      })
    );

    expect(artifacts).toHaveLength(5);

    const jsonArtifact = artifacts.find((artifact) => artifact.type === 'json');
    expect(jsonArtifact).toBeDefined();
    expect(jsonArtifact.filename).toBe('qa-export-summary-20251030T170500Z.json');
    expect(jsonArtifact.mimeType).toBe('application/json');
    const parsed = JSON.parse(jsonArtifact.content);
    expect(parsed.factions.cascadeTargets[0].factionId).toBe('luminari_syndicate');
    expect(parsed.factions.recentMemberRemovals[0].npcId).toBe('operative_echo');
    expect(parsed.engine.spatialHash.sampleCount).toBe(4);
    expect(parsed.engine.spatialHash.history[parsed.engine.spatialHash.history.length - 1]).toEqual(
      expect.objectContaining({ cellCount: 58, trackedEntities: 47 })
    );
    expect(parsed.engine.spatialHash.payloadBudgetStatus).toBe('within_budget');

    const cascadeCsv = artifacts.find(
      (artifact) => artifact.type === 'csv' && artifact.section === 'cascade'
    );
    expect(cascadeCsv).toBeDefined();
    expect(cascadeCsv.filename).toBe('qa-export-cascade-targets-20251030T170500Z.csv');
    expect(cascadeCsv.content).toContain('luminari_syndicate');
    expect(cascadeCsv.content).toContain('last_event');

    const tutorialCsv = artifacts.find(
      (artifact) => artifact.type === 'csv' && artifact.section === 'tutorial'
    );
    expect(tutorialCsv).toBeDefined();
    expect(tutorialCsv.filename).toBe('qa-export-tutorial-snapshots-20251030T170500Z.csv');
    expect(tutorialCsv.content).toContain('tutorial_completed');
    expect(tutorialCsv.content).toContain('tutorial_complete_prompt');

    const transcriptCsv = artifacts.find(
      (artifact) => artifact.type === 'transcript-csv' && artifact.section === 'tutorial-transcript'
    );
    expect(transcriptCsv).toBeDefined();
    expect(transcriptCsv.filename).toBe('qa-export-tutorial-transcript-20251030T170500Z.csv');
    expect(transcriptCsv.content).toContain('tutorial_step_started');
    expect(transcriptCsv.content).toContain('metadata');

    const transcriptMd = artifacts.find(
      (artifact) => artifact.type === 'transcript-md' && artifact.section === 'tutorial-transcript'
    );
    expect(transcriptMd).toBeDefined();
    expect(transcriptMd.filename).toBe('qa-export-tutorial-transcript-20251030T170500Z.md');
    expect(transcriptMd.content).toContain('| Event | Prompt |');
    expect(transcriptMd.content).toContain('tutorial_step_started');
  });

  test('falls back to defaults when summary unavailable', () => {
    const { artifacts, summary } = createInspectorExportArtifacts(null);

    expect(summary.source).toBe('unavailable');
    expect(summary.factions.cascadeTargets).toEqual([]);
    expect(summary.factions.recentMemberRemovals).toEqual([]);
    expect(summary.tutorial.snapshots).toEqual([]);
    expect(summary.tutorial.transcript).toEqual([]);
    expect(summary.engine.spatialHash).toBeNull();
    expect(artifacts.length).toBe(3);

    const jsonArtifact = artifacts.find((artifact) => artifact.type === 'json');
    expect(jsonArtifact.filename).toMatch(/^save-inspector-summary-/);
    expect(JSON.parse(jsonArtifact.content).tutorial.snapshots).toEqual([]);
  });

  test('flags spatial telemetry payloads that exceed budget', () => {
    const history = Array.from({ length: 256 }, (_, index) => ({
      cellCount: String(40 + (index % 5)),
      maxBucketSize: '6',
      trackedEntities: String(60 + (index % 3)),
      timestamp: String(1700001000000 + index * 16),
    }));

    const summary = {
      generatedAt: Date.now(),
      source: 'worldStateStore',
      factions: {},
      tutorial: {},
      engine: {
        spatialHash: {
          cellSize: '128',
          window: 256,
          sampleCount: String(history.length),
          lastSample: history[history.length - 1],
          aggregates: {},
          stats: {},
          history,
          payloadBytes: null,
        },
      },
    };

    const { summary: sanitized } = createInspectorExportArtifacts(summary);

    expect(sanitized.engine.spatialHash.payloadBudgetStatus).toBe('exceeds_budget');
    expect(sanitized.engine.spatialHash.payloadBudgetExceededBy).toBeGreaterThan(0);
    expect(sanitized.engine.spatialHash.payloadBudgetBytes).toBe(
      SPATIAL_HISTORY_BUDGET_BYTES
    );
  });
});
