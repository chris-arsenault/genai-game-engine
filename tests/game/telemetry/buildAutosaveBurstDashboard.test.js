import { buildAutosaveBurstDashboardDataset } from '../../../scripts/telemetry/buildAutosaveBurstDashboard.js';

describe('buildAutosaveBurstDashboardDataset', () => {
  it('summarises autosave burst telemetry into dashboard dataset', () => {
    const summary = {
      slot: 'autosave',
      iterations: 2,
      results: [
        { iteration: 0, success: true, durationMs: 42 },
        { iteration: 1, success: false, failureReason: 'timeout' },
      ],
      exportResult: {
        summary: {
          generatedAt: 1234567890,
          generatedIso: '1970-01-15T06:56:07.890Z',
          source: 'worldStateStore',
          controlBindings: {
            source: 'observer',
            totalEvents: 12,
            durationMs: 3200,
            actionsVisitedCount: 4,
            metrics: {
              selectionMoves: 6,
              selectionBlocked: 1,
              listModeChanges: 2,
              pageNavigations: 3,
              pageNavigationBlocked: 1,
            },
            dwell: {
              count: 4,
              averageMs: 1200,
              maxMs: 2400,
              lastMs: 600,
              longestAction: 'switch_profile',
              lastAction: 'open_options',
            },
            ratios: {
              selectionBlocked: { value: 0.25, percentage: '25%' },
              pageNavigationBlocked: { value: 0.33, percentage: '33%' },
            },
          },
          districts: {
            lastUpdatedIso: '1970-01-15T06:50:00.000Z',
            metrics: {
              total: 4,
              restricted: 1,
              fastTravelDisabled: 2,
              infiltrationLocked: 5,
              infiltrationUnlocked: 1,
              lockdownEvents: 0,
            },
            restrictedDistricts: ['district_a'],
          },
          npcs: {
            lastUpdatedIso: '1970-01-15T06:40:00.000Z',
            metrics: {
              total: 12,
              alerts: 2,
              suspicious: 1,
              knowsPlayer: 0,
              witnessedCrimes: 0,
            },
            alerts: ['npc_a'],
            suspicious: ['npc_b'],
          },
          factions: {
            lastCascadeEvent: null,
            cascadeTargets: ['faction_alpha'],
            recentMemberRemovals: [],
            metrics: {
              cascadeTargetCount: 1,
              activeCascadeTargets: 1,
              recentMemberRemovalCount: 0,
            },
          },
          tutorial: {
            latestSnapshot: 'step_3',
            metrics: {
              snapshotCount: 3,
              transcriptCount: 5,
            },
          },
        },
        artifacts: [
          { type: 'json', filename: 'burst-summary.json', mimeType: 'application/json' },
          { type: 'csv', filename: 'burst-cascade.csv', mimeType: 'text/csv' },
        ],
        metrics: {
          writerSummaries: [
            { id: 'writer_1', attempted: 2, successes: 2, failures: 0, durationMs: 8 },
          ],
          durationMs: 8,
        },
      },
    };

    const dataset = buildAutosaveBurstDashboardDataset(summary);

    expect(dataset.slot).toBe('autosave');
    expect(dataset.iterations).toBe(2);
    expect(dataset.successCount).toBe(1);
    expect(dataset.failureCount).toBe(1);
    expect(dataset.successRate).toBe(0.5);
    expect(dataset.hasFailures).toBe(true);
    expect(dataset.failureIterations).toEqual([1]);
    expect(dataset.timeline).toEqual([
      { iteration: 0, status: 'success' },
      { iteration: 1, status: 'failure' },
    ]);
    expect(dataset.metrics.controlBindings.totalEvents).toBe(12);
    expect(dataset.metrics.controlBindings.ratios.selectionBlocked).toEqual({
      value: 0.25,
      percentage: '25%',
    });
    expect(dataset.metrics.districts.totals.infiltrationLocked).toBe(5);
    expect(dataset.metrics.npcs.totals.alerts).toBe(2);
    expect(dataset.metrics.factions.metrics.cascadeTargetCount).toBe(1);
    expect(dataset.metrics.tutorial.snapshotCount).toBe(3);
    expect(dataset.artifacts.total).toBe(2);
    expect(dataset.artifacts.byType).toEqual({ json: 1, csv: 1 });
    expect(dataset.artifacts.filenames).toEqual(['burst-summary.json', 'burst-cascade.csv']);
    expect(dataset.writers).toEqual([
      { id: 'writer_1', attempted: 2, successes: 2, failures: 0, durationMs: 8 },
    ]);
    expect(dataset.flags).toEqual({
      controlBindingsRecorded: true,
      tutorialCaptured: false,
      factionsActive: true,
    });
  });

  it('handles missing optional fields gracefully', () => {
    const dataset = buildAutosaveBurstDashboardDataset({
      exportResult: {},
      results: [],
    });

    expect(dataset.iterations).toBe(0);
    expect(dataset.successRate).toBe(0);
    expect(dataset.metrics.controlBindings.totalEvents).toBe(0);
    expect(dataset.artifacts.total).toBe(0);
  });
});
