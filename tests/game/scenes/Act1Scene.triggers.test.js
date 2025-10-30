import { createCrimeSceneArea } from '../../../src/game/scenes/Act1Scene.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { QUEST_001_HOLLOW_CASE } from '../../../src/game/data/quests/act1Quests.js';
import { Trigger } from '../../../src/engine/physics/Trigger.js';

describe('Act1Scene quest trigger migration', () => {
  const definition = {
    id: 'crime_scene_entry',
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_arrive_scene',
    areaId: 'crime_scene_alley',
    radius: 150,
    once: true,
    prompt: 'Crime Scene Perimeter',
    triggerType: 'crime_scene',
    metadata: {
      moodHint: 'investigation_peak',
    },
  };

  const vendorDefinitions = [
    {
      id: 'act1_vendor_witness_trigger',
      questId: QUEST_001_HOLLOW_CASE.id,
      objectiveId: 'obj_interview_witness',
      areaId: 'market_vendor_corner',
      radius: 96,
      once: false,
      metadata: { moodHint: 'market_intrigue' },
    },
    {
      id: 'act1_black_market_trigger',
      questId: QUEST_001_HOLLOW_CASE.id,
      objectiveId: 'obj_consult_black_market_broker',
      areaId: 'black_market_exchange',
      radius: 96,
      once: false,
      metadata: { moodHint: 'underground_pressure' },
    },
    {
      id: 'act1_cipher_quartermaster_trigger',
      questId: QUEST_001_HOLLOW_CASE.id,
      objectiveId: 'obj_contact_cipher_quartermaster',
      areaId: 'cipher_quartermaster_bay',
      radius: 96,
      once: false,
      metadata: { moodHint: 'cipher_preparation' },
    },
  ];

  beforeEach(() => {
    QuestTriggerRegistry.reset([definition, ...vendorDefinitions]);
  });

  it('attaches Trigger component via migration toolkit and marks definition migrated', () => {
    const entityManager = {
      createEntity: jest.fn(() => 101),
    };
    const addedComponents = [];
    const componentRegistry = {
      addComponent: jest.fn((entityId, type, component) => {
        addedComponents.push({ entityId, type, component });
      }),
      hasComponent: jest.fn(() => false),
      getComponent: jest.fn(),
    };
    const eventBus = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const outstandingBefore = QuestTriggerRegistry.listOutstandingMigrations();
    expect(outstandingBefore.some((entry) => entry.id === definition.id)).toBe(true);

    const entityId = createCrimeSceneArea(entityManager, componentRegistry, eventBus);
    expect(entityId).toBe(101);

    expect(componentRegistry.hasComponent).toHaveBeenCalledWith(101, 'Quest');
    const questCall = componentRegistry.addComponent.mock.calls.find(
      ([, type]) => type === 'Quest'
    );
    expect(questCall).toBeDefined();
    expect(questCall[2]).toEqual(
      expect.objectContaining({
        questId: definition.questId,
        objectiveId: definition.objectiveId,
        areaId: definition.areaId,
        oneTime: true,
      })
    );

    const triggerCall = componentRegistry.addComponent.mock.calls.find(
      ([, type]) => type === 'Trigger'
    );
    expect(triggerCall).toBeDefined();
    const triggerInstance = triggerCall[2];
    expect(triggerInstance).toBeInstanceOf(Trigger);
    expect(triggerInstance.id).toBe(definition.areaId);
    expect(triggerInstance.radius).toBe(definition.radius);
    expect(triggerInstance.eventOnEnter).toBe('area:entered');
    expect(triggerInstance.eventOnExit).toBe('area:exited');
    expect(Array.from(triggerInstance.targetTags)).toEqual(['player']);
    expect(triggerInstance.data.questTrigger).toBe(true);
    expect(triggerInstance.data.questId).toBe(definition.questId);
    expect(triggerInstance.data.objectiveId).toBe(definition.objectiveId);
    expect(triggerInstance.data.metadata.moodHint).toBe(definition.metadata.moodHint);

    const outstandingAfter = QuestTriggerRegistry.listOutstandingMigrations();
    expect(outstandingAfter.some((entry) => entry.id === definition.id)).toBe(false);
    const stored = QuestTriggerRegistry.getTriggerDefinition(definition.id);
    expect(stored).toBeTruthy();
    expect(stored.migrated).toBe(true);
  });
});
