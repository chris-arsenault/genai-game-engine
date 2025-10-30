import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import {
  seedAct2CrossroadsTriggers,
  ACT2_CROSSROADS_TRIGGER_DEFINITIONS,
} from '../../../src/game/data/quests/act2TriggerDefinitions.js';
import {
  Act2CrossroadsScene,
  ACT2_CROSSROADS_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2CrossroadsScene.js';

describe('Act2CrossroadsScene trigger migration', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let scene;

  beforeEach(() => {
    QuestTriggerRegistry.reset(ACT2_CROSSROADS_TRIGGER_DEFINITIONS.map((def) => ({ ...def })));
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    scene = new Act2CrossroadsScene({
      entityManager,
      componentRegistry,
      eventBus,
    });
  });

  afterEach(() => {
    if (scene) {
      scene.unload();
    }
    QuestTriggerRegistry.reset([]);
  });

  it('attaches quest triggers using registry definitions', async () => {
    await scene.load();

    const triggerEntities = Array.from(scene.sceneEntities);
    expect(triggerEntities.length).toBe(3);

    const triggerComponents = new Map();
    for (const entityId of triggerEntities) {
      const trigger = componentRegistry.getComponent(entityId, 'Trigger');
      if (trigger) {
        triggerComponents.set(trigger.id, { entityId, trigger });
      }
    }

    const expectedAreas = {
      [ACT2_CROSSROADS_TRIGGER_IDS.CHECKPOINT]: 'corporate_spires_checkpoint',
      [ACT2_CROSSROADS_TRIGGER_IDS.BRIEFING]: 'safehouse_briefing_table',
      [ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT]: 'branch_selection_console',
    };

    expect(triggerComponents.has(expectedAreas[ACT2_CROSSROADS_TRIGGER_IDS.CHECKPOINT])).toBe(true);
    expect(triggerComponents.has(expectedAreas[ACT2_CROSSROADS_TRIGGER_IDS.BRIEFING])).toBe(true);
    expect(triggerComponents.has(expectedAreas[ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT])).toBe(true);

    const checkpoint = triggerComponents.get(
      expectedAreas[ACT2_CROSSROADS_TRIGGER_IDS.CHECKPOINT]
    );
    const briefing = triggerComponents.get(expectedAreas[ACT2_CROSSROADS_TRIGGER_IDS.BRIEFING]);
    const threadSelect = triggerComponents.get(
      expectedAreas[ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT]
    );

    expect(componentRegistry.getComponent(checkpoint.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: 'main-act2-crossroads',
        objectiveId: 'obj_enter_corporate_spires',
        areaId: 'corporate_spires_checkpoint',
        oneTime: true,
      })
    );
    expect(checkpoint.trigger.once).toBe(true);
    expect(checkpoint.trigger.data.metadata).toEqual(
      expect.objectContaining({
        worldFlag: 'act2_corporate_access',
      })
    );

    expect(componentRegistry.getComponent(briefing.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: 'main-act2-crossroads',
        objectiveId: 'obj_attend_zara_briefing',
        areaId: 'safehouse_briefing_table',
        oneTime: false,
      })
    );
    expect(briefing.trigger.once).toBe(false);
    expect(briefing.trigger.data.metadata).toEqual(
      expect.objectContaining({
        branchingChoice: true,
      })
    );

    expect(componentRegistry.getComponent(threadSelect.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: 'main-act2-crossroads',
        objectiveId: 'obj_choose_investigation_thread',
        areaId: 'branch_selection_console',
        oneTime: false,
      })
    );
    expect(threadSelect.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_thread_selection',
        branchingChoice: true,
      })
    );
  });

  it('marks Act 2 trigger definitions as migrated after load', async () => {
    await scene.load();

    const outstanding = QuestTriggerRegistry.listOutstandingMigrations();
    const outstandingIds = outstanding.map((def) => def.id);

    expect(outstandingIds).not.toContain(ACT2_CROSSROADS_TRIGGER_IDS.CHECKPOINT);
    expect(outstandingIds).not.toContain(ACT2_CROSSROADS_TRIGGER_IDS.BRIEFING);
    expect(outstandingIds).not.toContain(ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT);
  });
});
