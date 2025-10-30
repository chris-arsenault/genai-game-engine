import { EventBus } from '../../../src/engine/events/EventBus.js';
import { QuestTelemetryValidationHarness } from '../../../src/game/telemetry/QuestTelemetryValidationHarness.js';

describe('QuestTelemetryValidationHarness dashboard reporting', () => {
  it('aggregates telemetry events for dashboard consumers', () => {
    const eventBus = new EventBus();
    const harness = new QuestTelemetryValidationHarness(eventBus);
    harness.attach();

    const sharedPayload = {
      questId: 'quest_alpha',
      objectiveId: 'obj_alpha',
      telemetryTag: 'act2_tag_a',
      triggerId: 'trigger_alpha',
      sceneId: 'scene_crossroads',
    };

    eventBus.emit('telemetry:trigger_entered', { ...sharedPayload });
    // Duplicate emits to exercise duplicate detection.
    eventBus.emit('telemetry:trigger_entered', { ...sharedPayload });
    // Missing objective to record a missing_field issue.
    eventBus.emit('telemetry:trigger_entered', {
      questId: 'quest_alpha',
      objectiveId: '',
      telemetryTag: 'act2_tag_b',
      triggerId: 'trigger_beta',
      sceneId: 'scene_crossroads',
    });
    eventBus.emit('telemetry:trigger_exited', {
      questId: 'quest_alpha',
      objectiveId: 'obj_alpha',
      telemetryTag: 'act2_tag_a',
      triggerId: 'trigger_alpha',
      sceneId: 'scene_crossroads',
    });
    eventBus.emit('telemetry:trigger_entered', {
      questId: 'quest_beta',
      objectiveId: 'obj_gamma',
      telemetryTag: 'act2_tag_c',
      triggerId: 'trigger_gamma',
      sceneId: 'scene_resistance',
    });

    harness.dispose();

    const report = harness.generateDashboardReport({
      expectedTags: ['act2_tag_a', 'act2_tag_b', 'act2_tag_missing'],
      expectedQuestObjectives: {
        quest_alpha: ['obj_alpha', 'obj_beta'],
        quest_beta: ['obj_gamma'],
        quest_gamma: ['obj_delta'],
      },
      includeIssueDetails: true,
    });

    expect(report.totalEvents).toBe(5);
    expect(report.eventTypeCounts['telemetry:trigger_entered']).toBe(4);
    expect(report.uniqueTelemetryTags).toEqual(
      expect.arrayContaining(['act2_tag_a', 'act2_tag_b', 'act2_tag_c'])
    );
    expect(report.missingExpectedTags).toEqual(expect.arrayContaining(['act2_tag_missing']));

    const questAlpha = report.quests.find((entry) => entry.questId === 'quest_alpha');
    expect(questAlpha).toBeDefined();
    expect(questAlpha.objectives).toEqual(expect.arrayContaining(['obj_alpha']));

    const questBeta = report.quests.find((entry) => entry.questId === 'quest_beta');
    expect(questBeta.telemetryTags).toContain('act2_tag_c');

    expect(report.missingQuestObjectives.quest_alpha).toEqual(expect.arrayContaining(['obj_beta']));
    expect(report.missingQuestObjectives.quest_gamma).toEqual(expect.arrayContaining(['obj_delta']));

    expect(report.issues.byType.duplicate_event).toBeGreaterThanOrEqual(1);
    expect(report.issues.byType.missing_field).toBeGreaterThanOrEqual(1);
    expect(report.issues.details.duplicates.length).toBeGreaterThanOrEqual(1);
    expect(report.issues.details.missingFields.length).toBeGreaterThanOrEqual(1);
  });
});

