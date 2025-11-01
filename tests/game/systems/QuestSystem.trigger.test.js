import { QuestSystem } from '../../../src/game/systems/QuestSystem.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';

describe('QuestSystem trigger integration', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let questManager;
  let system;

  beforeEach(() => {
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    questManager = {
      startQuest: jest.fn(() => true),
      getActiveQuests: jest.fn(() => []),
      quests: new Map(),
      activeQuests: new Set(),
      completedQuests: new Set(),
      checkPrerequisites: jest.fn(() => true),
    };
    system = new QuestSystem(componentRegistry, eventBus, questManager);
    system.init();
  });

  afterEach(() => {
    if (typeof system.cleanup === 'function') {
      system.cleanup();
    }
  });

  it('creates quest triggers with Trigger component metadata', () => {
    const entityId = system.createQuestTrigger(10, 20, 'quest_main', {
      radius: 90,
      objectiveId: 'obj_test',
      targetTags: ['player', 'companion'],
    });

    const trigger = componentRegistry.getComponent(entityId, 'Trigger');
    expect(trigger).toBeDefined();
    expect(trigger.radius).toBe(90);
    expect(trigger.once).toBe(true);
    expect(trigger.targetTags instanceof Set).toBe(true);
    expect(trigger.targetTags.has('player')).toBe(true);
    expect(trigger.targetTags.has('companion')).toBe(true);
    expect(trigger.data).toEqual(
      expect.objectContaining({
        questTrigger: true,
        questId: 'quest_main',
        objectiveId: 'obj_test',
      })
    );
  });

  it('starts quests and removes one-shot triggers on area entry', () => {
    const entityId = system.createQuestTrigger(0, 0, 'quest_alpha', { objectiveId: 'obj_alpha' });
    const trigger = componentRegistry.getComponent(entityId, 'Trigger');

    eventBus.emit('area:entered', {
      triggerId: entityId,
      trigger,
      data: { ...trigger.data, questTrigger: true },
    });

    expect(questManager.startQuest).toHaveBeenCalledWith('quest_alpha');
    expect(componentRegistry.entityManager.hasEntity(entityId)).toBe(false);
  });

  it('ignores legacy quest triggers that do not attach Trigger components', () => {
    const playerId = entityManager.createEntity('player');
    componentRegistry.addComponent(playerId, 'Transform', { x: 0, y: 0 });
    componentRegistry.addComponent(playerId, 'Player', { id: 'player-1' });

    const legacyEntity = entityManager.createEntity('legacy_quest_trigger');
    componentRegistry.addComponent(legacyEntity, 'Transform', { x: 0, y: 0 });
    componentRegistry.addComponent(legacyEntity, 'Quest', {
      type: 'trigger',
      startQuestId: 'quest_legacy',
      triggerRadius: 128,
      oneTime: true,
      triggered: false,
      areaId: 'legacy_area',
    });

    system.update(0.016, [legacyEntity]);

    expect(questManager.startQuest).not.toHaveBeenCalledWith('quest_legacy');
    const questComponent = componentRegistry.getComponent(legacyEntity, 'Quest');
    expect(questComponent.triggered).toBe(false);
  });

  it('resets non one-shot quest triggers on exit', () => {
    const entityId = system.createQuestTrigger(0, 0, 'quest_beta', { oneTime: false });
    const trigger = componentRegistry.getComponent(entityId, 'Trigger');
    const questComponent = componentRegistry.getComponent(entityId, 'Quest');

    eventBus.emit('area:entered', {
      triggerId: entityId,
      trigger,
      data: { ...trigger.data, questTrigger: true },
    });
    expect(questComponent.triggered).toBe(true);

    eventBus.emit('area:exited', {
      triggerId: entityId,
      trigger,
      data: { ...trigger.data, questTrigger: true },
    });
    expect(questComponent.triggered).toBe(false);
    expect(componentRegistry.entityManager.hasEntity(entityId)).toBe(true);
  });

  it('emits staged narrative events when trigger metadata defines emitEvent', () => {
    const entityId = system.createQuestTrigger(0, 0, 'main-act3-zenith-infiltration', {
      objectiveId: 'obj_zenith_sector_entry',
    });
    const trigger = componentRegistry.getComponent(entityId, 'Trigger');

    trigger.data.metadata = {
      emitEvent: 'act3:zenith_infiltration:stage',
      emitEventPayload: {
        branchId: 'shared',
        stageId: 'shared_sector_entry',
        successFlag: 'act3_zenith_sector_perimeter_breached',
      },
      branchId: 'shared',
      stageId: 'shared_sector_entry',
      successFlag: 'act3_zenith_sector_perimeter_breached',
      telemetryTag: 'act3_zenith_sector_entry',
    };

    const handler = jest.fn();
    eventBus.on('act3:zenith_infiltration:stage', handler);

    eventBus.emit('area:entered', {
      triggerId: entityId,
      trigger,
      data: { ...trigger.data, questTrigger: true },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        questId: 'main-act3-zenith-infiltration',
        objectiveId: 'obj_zenith_sector_entry',
        branchId: 'shared',
        stageId: 'shared_sector_entry',
        successFlag: 'act3_zenith_sector_perimeter_breached',
        telemetryTag: 'act3_zenith_sector_entry',
      })
    );
  });
});
