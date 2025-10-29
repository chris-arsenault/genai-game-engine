import { TriggerMigrationToolkit } from '../../../src/game/quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { Trigger } from '../../../src/engine/physics/Trigger.js';

describe('TriggerMigrationToolkit', () => {
  beforeEach(() => {
    QuestTriggerRegistry.reset();
  });

  it('migrates legacy interaction zones into Trigger components', () => {
    const componentRegistry = {
      addComponent: jest.fn(),
    };
    const toolkit = new TriggerMigrationToolkit(componentRegistry, null);

    const trigger = toolkit.migrateInteractionZone(101, {
      id: 'crime_scene_entry',
      questId: 'quest_hollow_case',
      objectiveId: 'obj_arrive_scene',
      radius: 80,
      prompt: 'Enter the crime scene',
      metadata: { sceneId: 'act1_hollow_case' },
    });

    expect(componentRegistry.addComponent).toHaveBeenCalledWith(
      101,
      'Trigger',
      expect.any(Trigger)
    );
    expect(trigger).toBeInstanceOf(Trigger);
    expect(trigger.eventOnEnter).toBe('area:entered');
    expect(trigger.data.questTrigger).toBe(true);
    expect(trigger.data.metadata.sceneId).toBe('act1_hollow_case');
    expect(QuestTriggerRegistry.listOutstandingMigrations()).toHaveLength(0);
  });

  it('creates trigger from registry definitions', () => {
    QuestTriggerRegistry.registerDefinition({
      id: 'vendor_trigger',
      questId: 'quest_hollow_case',
      objectiveId: 'obj_interview_vendor',
      once: false,
    });

    const componentRegistry = {
      addComponent: jest.fn(),
    };
    const toolkit = new TriggerMigrationToolkit(componentRegistry, null);
    const trigger = toolkit.createQuestTrigger(33, 'vendor_trigger');

    expect(trigger).toBeInstanceOf(Trigger);
    expect(trigger.once).toBe(false);
    expect(componentRegistry.addComponent).toHaveBeenCalledTimes(1);
    expect(QuestTriggerRegistry.listOutstandingMigrations()).toHaveLength(0);
  });

  it('throws when legacy config missing identifiers', () => {
    const toolkit = new TriggerMigrationToolkit({ addComponent: jest.fn() }, null);
    expect(() =>
      toolkit.migrateInteractionZone(1, { questId: 'quest', objectiveId: 'objective' })
    ).toThrow('[TriggerMigrationToolkit] Legacy config missing id/triggerId');
  });
});

