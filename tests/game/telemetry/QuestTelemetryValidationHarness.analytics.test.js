import { QuestTelemetryValidationHarness } from '../../../src/game/telemetry/QuestTelemetryValidationHarness.js';

describe('QuestTelemetryValidationHarness analytics dataset', () => {
  function createHarness() {
    const stubBus = {
      on: () => () => {},
      emit: () => {},
    };
    return new QuestTelemetryValidationHarness(stubBus);
  }

  it('normalises ingested events into analytics dataset rows', () => {
    const harness = createHarness();
    const timestamp = 1_700_000_000_000;
    harness.ingest([
      {
        type: 'telemetry:trigger_entered',
        timestamp,
        payload: {
          telemetryTag: 'act2_branch_objective_entry',
          questId: 'quest-test',
          objectiveId: 'objective-test',
          triggerId: 'trigger-test',
          sceneId: 'act2_test_scene',
          source: 'act2_branch_objective',
        },
      },
      {
        eventType: 'telemetry:trigger_exited',
        timestamp: '2025-11-07T12:00:00Z',
        data: {
          telemetryTag: 'act2_branch_objective_exit',
          questId: 'quest-test',
          objectiveId: 'objective-test',
          areaId: 'trigger-test',
        },
      },
    ]);

    const dataset = harness.generateAnalyticsDataset({ includeIssueDetails: true });
    expect(dataset.totalEvents).toBe(2);
    expect(dataset.events).toHaveLength(2);
    expect(dataset.schemaVersion).toBe('1.0.0');
    expect(dataset.uniqueTelemetryTags).toEqual(
      expect.arrayContaining(['act2_branch_objective_entry', 'act2_branch_objective_exit'])
    );

    const [enterEvent, exitEvent] = dataset.events;
    expect(enterEvent).toMatchObject({
      eventType: 'telemetry:trigger_entered',
      telemetryTag: 'act2_branch_objective_entry',
      questId: 'quest-test',
      objectiveId: 'objective-test',
      triggerId: 'trigger-test',
      sceneId: 'act2_test_scene',
      timestamp,
      timestampIso: new Date(timestamp).toISOString(),
    });

    expect(exitEvent).toMatchObject({
      eventType: 'telemetry:trigger_exited',
      telemetryTag: 'act2_branch_objective_exit',
      triggerId: 'trigger-test',
    });

    expect(dataset.report.totalEvents).toBe(2);
    expect(dataset.report.eventTypeCounts).toEqual(
      expect.objectContaining({
        'telemetry:trigger_entered': 1,
        'telemetry:trigger_exited': 1,
      })
    );
    expect(dataset.report.issues.details.missingFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'source',
          eventType: 'telemetry:trigger_exited',
        }),
      ])
    );
  });

  it('omits raw events when includeRawEvents is false', () => {
    const harness = createHarness();
    harness.ingest([
      {
        type: 'telemetry:trigger_entered',
        payload: {
          telemetryTag: 'act2_branch_objective_entry',
          questId: 'quest-test',
          objectiveId: 'objective-test',
        },
      },
    ]);

    const dataset = harness.generateAnalyticsDataset({ includeRawEvents: false });
    expect(dataset.events).toBeUndefined();
    expect(dataset.report.totalEvents).toBe(1);
  });
});
