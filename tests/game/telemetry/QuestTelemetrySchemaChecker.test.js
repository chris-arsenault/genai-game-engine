import { checkQuestTelemetrySchema } from '../../../src/game/telemetry/QuestTelemetrySchemaChecker.js';

describe('QuestTelemetrySchemaChecker', () => {
  function buildSampleDataset(overrides = {}) {
    return {
      schemaVersion: '1.0.0',
      generatedAt: new Date('2025-11-08T00:00:00Z').toISOString(),
      totalEvents: 2,
      uniqueTelemetryTags: ['act2_test_entry', 'act2_test_exit'],
      report: {
        issues: {
          details: {},
          summary: {},
        },
      },
      events: [
        {
          type: 'telemetry:trigger_entered',
          timestamp: 1_700_000_000_000,
          payload: {
            telemetryTag: 'act2_test_entry',
            questId: 'quest-alpha',
            objectiveId: 'obj-a',
            triggerId: 'trigger-a',
            source: 'act2_crossroads_manifest',
          },
        },
        {
          type: 'telemetry:trigger_exited',
          timestamp: '2025-11-08T00:00:05Z',
          payload: {
            telemetryTag: 'act2_test_exit',
            questId: 'quest-alpha',
            objectiveId: 'obj-a',
            areaId: 'trigger-a',
          },
        },
      ],
      ...overrides,
    };
  }

  it('passes when dataset matches canonical schema', () => {
    const dataset = buildSampleDataset();
    const result = checkQuestTelemetrySchema(dataset);

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags missing payload fields as errors', () => {
    const dataset = buildSampleDataset({
      events: [
        {
          type: 'telemetry:trigger_entered',
          timestamp: 1_700_000_000_000,
          payload: {
            telemetryTag: 'act2_test_entry',
            // questId intentionally omitted
            objectiveId: 'obj-a',
          },
        },
      ],
    });
    const result = checkQuestTelemetrySchema(dataset);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          path: 'events[0].payload.questId',
        }),
      ])
    );
  });

  it('reports unexpected fields as warnings', () => {
    const dataset = buildSampleDataset({
      events: [
        {
          type: 'telemetry:trigger_entered',
          timestamp: 1_700_000_000_000,
          payload: {
            telemetryTag: 'act2_test_entry',
            questId: 'quest-alpha',
            objectiveId: 'obj-a',
            extraField: 'unexpected',
          },
          extraEventField: true,
        },
      ],
    });

    const result = checkQuestTelemetrySchema(dataset);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          path: 'events[0].payload.extraField',
        }),
        expect.objectContaining({
          severity: 'warning',
          path: 'events[0].extraEventField',
        }),
      ])
    );
  });
});
