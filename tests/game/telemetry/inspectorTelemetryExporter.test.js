import { createInspectorExportArtifacts } from '../../../src/game/telemetry/inspectorTelemetryExporter.js';

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
    };

    const { artifacts, summary: sanitized } = createInspectorExportArtifacts(summary, {
      prefix: 'qa-export',
      formats: ['json', 'csv'],
    });

    expect(sanitized.generatedAt).toBe(summary.generatedAt);
    expect(sanitized.factions.metrics.cascadeTargetCount).toBe(2);
    expect(sanitized.tutorial.metrics.snapshotCount).toBe(2);
    expect(sanitized.tutorial.metrics.transcriptCount).toBe(1);
    expect(sanitized.tutorial.transcript[0]).toEqual(
      expect.objectContaining({ promptId: 'intro', sequence: 0 })
    );

    expect(artifacts).toHaveLength(3);

    const jsonArtifact = artifacts.find((artifact) => artifact.type === 'json');
    expect(jsonArtifact).toBeDefined();
    expect(jsonArtifact.filename).toBe('qa-export-summary-20251030T170500Z.json');
    expect(jsonArtifact.mimeType).toBe('application/json');
    const parsed = JSON.parse(jsonArtifact.content);
    expect(parsed.factions.cascadeTargets[0].factionId).toBe('luminari_syndicate');

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
  });

  test('falls back to defaults when summary unavailable', () => {
    const { artifacts, summary } = createInspectorExportArtifacts(null);

    expect(summary.source).toBe('unavailable');
    expect(summary.factions.cascadeTargets).toEqual([]);
    expect(summary.tutorial.snapshots).toEqual([]);
    expect(summary.tutorial.transcript).toEqual([]);
    expect(artifacts.length).toBe(3);

    const jsonArtifact = artifacts.find((artifact) => artifact.type === 'json');
    expect(jsonArtifact.filename).toMatch(/^save-inspector-summary-/);
    expect(JSON.parse(jsonArtifact.content).tutorial.snapshots).toEqual([]);
  });
});
