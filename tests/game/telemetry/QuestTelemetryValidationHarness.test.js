import { EventBus } from '../../../src/engine/events/EventBus.js';
import { QuestTelemetryValidationHarness } from '../../../src/game/telemetry/QuestTelemetryValidationHarness.js';

describe('QuestTelemetryValidationHarness', () => {
  let eventBus;
  let harness;

  beforeEach(() => {
    eventBus = new EventBus();
    harness = new QuestTelemetryValidationHarness(eventBus);
    harness.attach();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('captures telemetry events and reports none when payloads are complete', () => {
    const payload = {
      source: 'bridge',
      telemetryTag: 'act2_sample_tag',
      questId: 'quest-1',
      objectiveId: 'objective-1',
      triggerId: 'trigger-1',
      areaId: 'area-1',
    };

    eventBus.emit('telemetry:trigger_entered', payload);

    const captured = harness.getEventsByType('telemetry:trigger_entered');
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject(payload);
    expect(harness.getIssues()).toHaveLength(0);
    expect(harness.hasEventForTag('act2_sample_tag', 'telemetry:trigger_entered')).toBe(true);
  });

  it('reports missing required fields', () => {
    eventBus.emit('telemetry:trigger_entered', {
      source: 'bridge',
      telemetryTag: 'missing_fields_tag',
      triggerId: 'trigger-2',
    });

    const issues = harness.getIssues();
    expect(issues).toHaveLength(1);
    expect(issues[0].details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'questId', type: 'missing_field' }),
        expect.objectContaining({ field: 'objectiveId', type: 'missing_field' }),
      ])
    );
  });

  it('flags duplicate telemetry events for the same tag and trigger combination', () => {
    const payload = {
      source: 'bridge',
      telemetryTag: 'duplicate_tag',
      questId: 'quest-dup',
      objectiveId: 'objective-dup',
      triggerId: 'trigger-dup',
    };

    eventBus.emit('telemetry:trigger_entered', payload);
    eventBus.emit('telemetry:trigger_entered', payload);

    const issues = harness.getIssues();
    expect(issues.some((issue) =>
      issue.details.some((detail) => detail.type === 'duplicate_event')
    )).toBe(true);
  });
});
