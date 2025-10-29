import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';

describe('QuestTriggerRegistry', () => {
  beforeEach(() => {
    QuestTriggerRegistry.reset();
  });

  it('registers and retrieves trigger definitions', () => {
    const definition = {
      id: 'crime_scene_entry',
      questId: 'quest_hollow_case',
      objectiveId: 'obj_arrive_scene',
      areaId: 'crime_scene_entry_area',
      radius: 72,
      once: true,
      prompt: 'Arrive at the crime scene',
    };

    QuestTriggerRegistry.registerDefinition(definition);

    const stored = QuestTriggerRegistry.getTriggerDefinition('crime_scene_entry');
    expect(stored).toEqual(
      expect.objectContaining({
        id: 'crime_scene_entry',
        questId: 'quest_hollow_case',
        objectiveId: 'obj_arrive_scene',
        radius: 72,
        once: true,
      })
    );

    const byQuest = QuestTriggerRegistry.listByQuest('quest_hollow_case');
    expect(byQuest).toHaveLength(1);
    expect(byQuest[0].id).toBe('crime_scene_entry');
  });

  it('tracks outstanding and migrated triggers', () => {
    QuestTriggerRegistry.registerDefinitions([
      {
        id: 'crime_scene_entry',
        questId: 'quest_hollow_case',
        objectiveId: 'obj_arrive_scene',
      },
      {
        id: 'vendor_greeting',
        questId: 'quest_hollow_case',
        objectiveId: 'obj_interview_vendor',
        migrated: true,
      },
    ]);

    const outstandingBefore = QuestTriggerRegistry.listOutstandingMigrations();
    expect(outstandingBefore.map((def) => def.id)).toEqual(['crime_scene_entry']);

    QuestTriggerRegistry.markMigrated('crime_scene_entry');
    const outstandingAfter = QuestTriggerRegistry.listOutstandingMigrations();
    expect(outstandingAfter).toHaveLength(0);
  });

  it('reset clears definitions and seeds new ones', () => {
    QuestTriggerRegistry.registerDefinition({
      id: 'temp',
      questId: 'quest_temp',
      objectiveId: 'obj_temp',
    });
    expect(QuestTriggerRegistry.listOutstandingMigrations()).toHaveLength(1);

    QuestTriggerRegistry.reset([
      {
        id: 'seed_trigger',
        questId: 'quest_seed',
        objectiveId: 'obj_seed',
      },
    ]);

    expect(QuestTriggerRegistry.getTriggerDefinition('temp')).toBeNull();
    const outstanding = QuestTriggerRegistry.listOutstandingMigrations();
    expect(outstanding).toHaveLength(1);
    expect(outstanding[0].id).toBe('seed_trigger');
  });
});

