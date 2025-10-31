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
      controlBindings: {
        source: 'observation-log',
        totalEvents: 6,
        durationMs: 5400,
        durationLabel: '5.4s',
        firstEventAt: Date.UTC(2025, 9, 30, 17, 0, 30),
        lastEventAt: Date.UTC(2025, 9, 30, 17, 5, 0),
        actionsVisitedCount: 4,
        actionsVisited: ['interact', 'quest', 'inventory', 'pause'],
        actionsRemappedCount: 2,
        actionsRemapped: ['inventory', 'quest'],
        listModesVisited: ['sections', 'conflicts', 'alphabetical'],
        pageRange: { min: 0, max: 3 },
        lastSelectedAction: 'inventory',
        metrics: {
          selectionMoves: 5,
          selectionBlocked: 1,
          listModeChanges: 2,
          listModeUnchanged: 1,
          pageNavigations: 2,
          pageNavigationBlocked: 1,
          pageSetChanges: 0,
          pageSetBlocked: 0,
          captureStarted: 1,
          captureCancelled: 1,
          bindingsApplied: 2,
          bindingsReset: 0,
          manualOverrideEvents: 0,
          captureCancelReasons: {
            cancelled_with_escape: 2,
            changed_mind: 1,
          },
        },
        dwell: {
          count: 2,
          totalMs: 3000,
          averageMs: 1500,
          maxMs: 2000,
          minMs: 1000,
          lastMs: 1000,
          lastAction: 'interact',
          longestAction: 'inventory',
        },
      ratios: {
        selectionBlocked: { numerator: 1, denominator: 6 },
        pageNavigationBlocked: { numerator: 1, denominator: 2 },
      },
      },
      districts: {
        lastUpdatedAt: Date.UTC(2025, 9, 30, 17, 3, 30),
        lastLockdownAt: Date.UTC(2025, 9, 30, 17, 3, 45),
        metrics: {
          total: 5,
          restricted: 2,
          fastTravelDisabled: 1,
          infiltrationLocked: 4,
          infiltrationUnlocked: 6,
          lockdownEvents: 3,
        },
        restrictedDistricts: [
          {
            id: 'neon_districts',
            name: 'Neon Districts',
            tier: 'foundation',
            fastTravelEnabled: false,
            controllingFaction: 'wraith_network',
            stability: { rating: 'volatile', value: 32 },
            activeRestrictionCount: 2,
            lastRestrictionChangeAt: Date.UTC(2025, 9, 30, 17, 3, 40),
            restrictions: [
              {
                id: 'lockdown_gate',
                type: 'lockdown',
                description: 'Security lockdown active',
                lastChangedAt: Date.UTC(2025, 9, 30, 17, 3, 40),
              },
            ],
            infiltrationLocked: 2,
            infiltrationUnlocked: 1,
            lockdownsTriggered: 2,
            lastLockdownAt: Date.UTC(2025, 9, 30, 17, 3, 45),
          },
        ],
      },
      npcs: {
        lastUpdatedAt: Date.UTC(2025, 9, 30, 17, 3, 50),
        metrics: {
          total: 6,
          alerts: 2,
          suspicious: 1,
          knowsPlayer: 2,
          witnessedCrimes: 3,
        },
        alerts: [
          {
            id: 'npc_echo',
            name: 'Echo Operative',
            factionId: 'wraith_network',
            status: 'alert',
            reason: 'security breach',
            updatedAt: Date.UTC(2025, 9, 30, 17, 3, 55),
          },
        ],
        suspicious: [
          {
            id: 'npc_scout',
            name: 'Perimeter Scout',
            factionId: 'cipher_collective',
            status: 'suspicious',
            reason: 'trespassing',
            updatedAt: Date.UTC(2025, 9, 30, 17, 3, 52),
          },
        ],
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
    expect(sanitized.controlBindings.totalEvents).toBe(6);
    expect(sanitized.controlBindings.metrics.selectionMoves).toBe(5);
    expect(sanitized.controlBindings.metrics.selectionBlocked).toBe(1);
    expect(sanitized.controlBindings.captureCancelReasons.cancelled_with_escape).toBe(2);
    expect(sanitized.controlBindings.dwell).toEqual(
      expect.objectContaining({
        count: 2,
        averageMs: 1500,
        averageLabel: '1.5s',
        maxMs: 2000,
        maxLabel: '2.0s',
        lastMs: 1000,
        lastLabel: '1.0s',
        lastAction: 'interact',
        longestAction: 'inventory',
      })
    );
    expect(sanitized.controlBindings.ratios.selectionBlocked.numerator).toBe(1);
    expect(sanitized.controlBindings.ratios.selectionBlocked.denominator).toBe(6);
    expect(sanitized.controlBindings.ratios.selectionBlocked.value).toBeCloseTo(0.167, 3);
    expect(sanitized.controlBindings.ratios.pageNavigationBlocked.value).toBe(0.5);
    expect(sanitized.districts.metrics).toEqual(
      expect.objectContaining({
        total: 5,
        restricted: 2,
        fastTravelDisabled: 1,
        infiltrationLocked: 4,
        lockdownEvents: 3,
      })
    );
    expect(sanitized.districts.restrictedDistricts[0]).toEqual(
      expect.objectContaining({
        id: 'neon_districts',
        infiltrationLocked: 2,
        lastLockdownIso: new Date(Date.UTC(2025, 9, 30, 17, 3, 45)).toISOString(),
      })
    );
    expect(sanitized.npcs.metrics).toEqual(
      expect.objectContaining({ alerts: 2, suspicious: 1, knowsPlayer: 2 })
    );
    expect(sanitized.npcs.alerts[0]).toEqual(
      expect.objectContaining({
        id: 'npc_echo',
        updatedIso: new Date(Date.UTC(2025, 9, 30, 17, 3, 55)).toISOString(),
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
    expect(parsed.controlBindings.totalEvents).toBe(6);
    expect(parsed.controlBindings.metrics.selectionMoves).toBe(5);
    expect(parsed.controlBindings.dwell.averageMs).toBe(1500);
    expect(parsed.controlBindings.ratios.selectionBlocked.percentage).toBe('17%');
    expect(parsed.districts.metrics.lockdownEvents).toBe(3);
    expect(parsed.npcs.metrics.alerts).toBe(2);

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
    expect(summary.controlBindings.totalEvents).toBe(0);
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
