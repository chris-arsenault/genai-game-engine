import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { TriggerSystem } from '../../../src/engine/physics/TriggerSystem.js';
import { Trigger } from '../../../src/engine/physics/Trigger.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { FactionMember } from '../../../src/game/components/FactionMember.js';

describe('TriggerSystem', () => {
  let entityManager;
  let componentRegistry;
  let eventBus;
  let system;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    system = new TriggerSystem(componentRegistry, eventBus);
  });

  function addEntity(tag, x, y) {
    const id = entityManager.createEntity(tag);
    componentRegistry.addComponent(id, 'Transform', new Transform(x, y));
    return id;
  }

  function runSystem() {
    const triggers = componentRegistry.queryEntities('Transform', 'Trigger');
    system.update(0.016, triggers);
  }

  it('emits enter and exit events as entities move through trigger radius', () => {
    const triggerId = addEntity('trigger_ZONE', 0, 0);
    componentRegistry.addComponent(triggerId, 'Trigger', new Trigger({ radius: 120 }));

    const playerId = addEntity('player', 50, 0);

    const entered = jest.fn();
    const exited = jest.fn();
    eventBus.on('trigger:entered', entered);
    eventBus.on('trigger:exited', exited);

    runSystem();
    expect(entered).toHaveBeenCalledWith(
      expect.objectContaining({ triggerId, targetId: playerId })
    );
    expect(exited).not.toHaveBeenCalled();

    componentRegistry.getComponent(playerId, 'Transform').setPosition(500, 500);
    runSystem();
    expect(exited).toHaveBeenCalledWith(
      expect.objectContaining({ triggerId, targetId: playerId })
    );
  });

  it('supports one-shot triggers that deactivate after first entry', () => {
    const triggerId = addEntity('trigger_once', 0, 0);
    componentRegistry.addComponent(triggerId, 'Trigger', new Trigger({ radius: 90, once: true }));

    const playerId = addEntity('player', 60, 0);

    const entered = jest.fn();
    eventBus.on('trigger:entered', entered);

    runSystem();
    expect(entered).toHaveBeenCalledTimes(1);

    // Move out and back in; one-shot should not trigger again
    componentRegistry.getComponent(playerId, 'Transform').setPosition(300, 0);
    runSystem();
    componentRegistry.getComponent(playerId, 'Transform').setPosition(50, 0);
    runSystem();

    expect(entered).toHaveBeenCalledTimes(1);
  });

  it('filters targets using explicit entity IDs and tags', () => {
    const triggerId = addEntity('zone', 0, 0);
    const trigger = new Trigger({
      radius: 100,
      targets: [],
      targetTags: ['player'],
    });
    componentRegistry.addComponent(triggerId, 'Trigger', trigger);

    const playerId = addEntity('player', 80, 0);
    const npcId = addEntity('npc', 40, 0);

    const entered = jest.fn();
    eventBus.on('trigger:entered', entered);

    runSystem();
    expect(entered).toHaveBeenCalledTimes(1);
    expect(entered).toHaveBeenCalledWith(expect.objectContaining({ targetId: playerId }));

    entered.mockClear();
    // Add explicit target restriction to only allow npc
    trigger.targets = new Set([npcId]);
    trigger.targetTags = new Set(['npc']);
    trigger.entitiesInside.clear();
    componentRegistry.getComponent(playerId, 'Transform').setPosition(50, 0);
    runSystem();

    expect(entered).toHaveBeenCalledTimes(1);
    expect(entered).toHaveBeenCalledWith(expect.objectContaining({ targetId: npcId }));
  });

  it('requires additional components when specified', () => {
    const triggerId = addEntity('zone', 0, 0);
    componentRegistry.addComponent(
      triggerId,
      'Trigger',
      new Trigger({ radius: 120, requiredComponents: ['FactionMember'] })
    );

    const playerId = addEntity('player', 60, 0);

    const entered = jest.fn();
    eventBus.on('trigger:entered', entered);

    runSystem();
    expect(entered).not.toHaveBeenCalled();

    componentRegistry.addComponent(playerId, 'FactionMember', new FactionMember({ primaryFaction: 'police' }));
    runSystem();

    expect(entered).toHaveBeenCalledTimes(1);
  });
});
