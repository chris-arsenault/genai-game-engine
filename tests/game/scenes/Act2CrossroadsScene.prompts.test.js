import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import {
  ACT2_CROSSROADS_TRIGGER_DEFINITIONS,
  seedAct2CrossroadsTriggers,
} from '../../../src/game/data/quests/act2TriggerDefinitions.js';
import {
  Act2CrossroadsScene,
  ACT2_CROSSROADS_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2CrossroadsScene.js';

describe('Act2CrossroadsScene trigger-driven prompts', () => {
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
    scene._loadAct2CrossroadsArtConfig = jest.fn().mockResolvedValue({
      input: null,
      manifestUrl: null,
      config: null,
    });
  });

  afterEach(() => {
    if (scene) {
      scene.unload();
    }
    QuestTriggerRegistry.reset([]);
  });

  it('emits UI, narrative, and telemetry events when branch selection trigger fires', async () => {
    const shownPrompts = [];
    const hiddenPrompts = [];
    const narrativeEvents = [];
    const telemetryEvents = [];

    eventBus.on('ui:show_prompt', (payload) => shownPrompts.push(payload));
    eventBus.on('ui:hide_prompt', (payload) => hiddenPrompts.push(payload));
    eventBus.on('narrative:crossroads_prompt', (payload) => narrativeEvents.push(payload));
    eventBus.on('telemetry:trigger_entered', (payload) => telemetryEvents.push(payload));

    await scene.load();

    const triggerEntities = Array.from(scene.sceneEntities).filter((entityId) =>
      componentRegistry.hasComponent(entityId, 'Trigger')
    );
    const selectionEntityId = triggerEntities.find((entityId) => {
      const trigger = componentRegistry.getComponent(entityId, 'Trigger');
      return trigger?.data?.areaId === 'branch_selection_console';
    });

    const triggerComponent = componentRegistry.getComponent(selectionEntityId, 'Trigger');
    const transform = componentRegistry.getComponent(selectionEntityId, 'Transform');

    eventBus.emit('area:entered', {
      trigger: triggerComponent,
      data: triggerComponent.data,
      triggerId: selectionEntityId,
      triggerPosition: { x: transform.x, y: transform.y },
      targetPosition: { x: transform.x, y: transform.y },
    });

    expect(shownPrompts).toHaveLength(1);
    expect(shownPrompts[0]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('Select the next investigation thread'),
        areaId: 'branch_selection_console',
        questId: 'main-act2-crossroads',
        objectiveId: 'obj_choose_investigation_thread',
      })
    );

    expect(narrativeEvents).toHaveLength(1);
    expect(narrativeEvents[0]).toEqual(
      expect.objectContaining({
        triggerId: ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT,
        areaId: 'branch_selection_console',
        metadata: expect.objectContaining({ telemetryTag: 'act2_thread_selection' }),
      })
    );

    expect(telemetryEvents).toHaveLength(1);
    expect(telemetryEvents[0]).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_thread_selection',
        triggerId: ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT,
      })
    );

    eventBus.emit('area:exited', {
      trigger: triggerComponent,
      data: triggerComponent.data,
      triggerId: selectionEntityId,
    });

    expect(hiddenPrompts).toHaveLength(1);
    expect(hiddenPrompts[0]).toEqual(expect.objectContaining({ areaId: 'branch_selection_console' }));
  });
});
