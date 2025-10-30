import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadMemoryParlorScene,
  unloadMemoryParlorScene,
} from '../../../src/game/scenes/MemoryParlorScene.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { QUEST_003_MEMORY_PARLOR } from '../../../src/game/data/quests/act1Quests.js';

const TRIGGER_IDS = {
  ENTRANCE: 'memory_parlor_entrance',
  INTERIOR: 'memory_parlor_interior',
  EXIT: 'neon_districts_street',
};

describe('MemoryParlorScene quest trigger migration', () => {
  let entityManager;
  let componentRegistry;
  let eventBus;
  let sceneData;

  beforeEach(async () => {
    QuestTriggerRegistry.reset();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    sceneData = await loadMemoryParlorScene(entityManager, componentRegistry, eventBus);
  });

  afterEach(() => {
    if (sceneData) {
      unloadMemoryParlorScene(entityManager, componentRegistry, sceneData.sceneEntities);
      sceneData.cleanup?.();
    }
  });

  it('attaches Quest and Trigger components for registry-backed areas', () => {
    const triggerLookup = new Map();
    for (const entityId of sceneData.sceneEntities) {
      const trigger = componentRegistry.getComponent(entityId, 'Trigger');
      if (trigger) {
        triggerLookup.set(trigger.id, { entityId, trigger });
      }
    }

    expect(triggerLookup.has(TRIGGER_IDS.ENTRANCE)).toBe(true);
    expect(triggerLookup.has(TRIGGER_IDS.INTERIOR)).toBe(true);
    expect(triggerLookup.has(TRIGGER_IDS.EXIT)).toBe(true);

    const entrance = triggerLookup.get(TRIGGER_IDS.ENTRANCE);
    const interior = triggerLookup.get(TRIGGER_IDS.INTERIOR);
    const exit = triggerLookup.get(TRIGGER_IDS.EXIT);

    expect(componentRegistry.getComponent(entrance.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: QUEST_003_MEMORY_PARLOR.id,
        objectiveId: 'obj_locate_parlor',
        areaId: TRIGGER_IDS.ENTRANCE,
        oneTime: true,
      })
    );
    expect(entrance.trigger.once).toBe(true);
    expect(entrance.trigger.data.questTrigger).toBe(true);
    expect(entrance.trigger.data.objectiveId).toBe('obj_locate_parlor');
    expect(entrance.trigger.data.metadata).toEqual(
      expect.objectContaining({
        narrativeBeat: 'act1_memory_parlor_entry',
      })
    );

    expect(componentRegistry.getComponent(interior.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: QUEST_003_MEMORY_PARLOR.id,
        objectiveId: 'obj_infiltrate_parlor',
        areaId: TRIGGER_IDS.INTERIOR,
        oneTime: false,
      })
    );
    expect(interior.trigger.once).toBe(false);
    expect(interior.trigger.data.objectiveId).toBe('obj_infiltrate_parlor');
    expect(interior.trigger.data.metadata).toEqual(
      expect.objectContaining({
        requiresScrambler: true,
      })
    );

    expect(componentRegistry.getComponent(exit.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: QUEST_003_MEMORY_PARLOR.id,
        objectiveId: 'obj_escape_parlor',
        areaId: TRIGGER_IDS.EXIT,
        oneTime: true,
      })
    );
    expect(exit.trigger.once).toBe(true);
    expect(exit.trigger.data.objectiveId).toBe('obj_escape_parlor');
    expect(exit.trigger.data.metadata).toEqual(
      expect.objectContaining({
        narrativeBeat: 'act1_memory_parlor_exit',
      })
    );

    expect(QuestTriggerRegistry.getTriggerDefinition(TRIGGER_IDS.ENTRANCE)?.migrated).toBe(true);
    expect(QuestTriggerRegistry.getTriggerDefinition(TRIGGER_IDS.INTERIOR)?.migrated).toBe(true);
    expect(QuestTriggerRegistry.getTriggerDefinition(TRIGGER_IDS.EXIT)?.migrated).toBe(true);
  });
});
