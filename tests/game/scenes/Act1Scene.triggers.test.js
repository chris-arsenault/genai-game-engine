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

  beforeEach(() => {
    QuestTriggerRegistry.reset([definition]);
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
    };
    const eventBus = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const outstandingBefore = QuestTriggerRegistry.listOutstandingMigrations();
    expect(outstandingBefore).toHaveLength(1);
    expect(outstandingBefore[0].id).toBe(definition.id);

    const entityId = createCrimeSceneArea(entityManager, componentRegistry, eventBus);
    expect(entityId).toBe(101);

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
    expect(outstandingAfter).toHaveLength(0);
    const stored = QuestTriggerRegistry.getTriggerDefinition(definition.id);
    expect(stored).toBeTruthy();
    expect(stored.migrated).toBe(true);
  });
});
