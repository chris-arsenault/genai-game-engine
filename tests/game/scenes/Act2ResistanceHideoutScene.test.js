import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadAct2ResistanceHideoutScene,
  ACT2_RESISTANCE_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2ResistanceHideoutScene.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { QUEST_ACT2_RESISTANCE } from '../../../src/game/data/quests/act2ResistanceQuest.js';
import { seedAct2CrossroadsTriggers } from '../../../src/game/data/quests/act2TriggerDefinitions.js';

describe('Act2ResistanceHideoutScene', () => {
  let entityManager;
  let componentRegistry;
  let eventBus;
  let sceneData;

  beforeEach(async () => {
    QuestTriggerRegistry.reset();
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    sceneData = await loadAct2ResistanceHideoutScene(
      entityManager,
      componentRegistry,
      eventBus
    );
  });

  afterEach(() => {
    if (sceneData) {
      sceneData.cleanup?.();
      for (const entityId of sceneData.sceneEntities) {
        componentRegistry.removeAllComponents(entityId);
        if (entityManager.hasEntity(entityId)) {
          entityManager.destroyEntity(entityId);
        }
      }
    }
    QuestTriggerRegistry.reset();
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
  });

  it('registers resistance quest triggers and exposes geometry metadata', () => {
    const triggerLookup = new Map();

    for (const entityId of sceneData.sceneEntities) {
      const trigger = componentRegistry.getComponent(entityId, 'Trigger');
      if (trigger) {
        triggerLookup.set(trigger.id, {
          trigger,
          quest: componentRegistry.getComponent(entityId, 'Quest'),
          entityId,
        });
      }
    }

    expect(triggerLookup.has('resistance_contact_entry')).toBe(true);
    expect(triggerLookup.has('resistance_strategy_table')).toBe(true);
    expect(triggerLookup.has('resistance_escape_tunnel')).toBe(true);

    const entry = triggerLookup.get('resistance_contact_entry');
    const strategy = triggerLookup.get('resistance_strategy_table');
    const escape = triggerLookup.get('resistance_escape_tunnel');

    expect(entry.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_RESISTANCE.id,
        objectiveId: 'obj_locate_resistance_contact',
        areaId: 'resistance_contact_entry',
      })
    );
    expect(entry.trigger.once).toBe(true);
    expect(entry.trigger.data.metadata).toEqual(
      expect.objectContaining({
        narrativeBeat: 'act2_resistance_hideout_entry',
      })
    );

    expect(strategy.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_RESISTANCE.id,
        objectiveId: 'obj_negotiate_alliance_terms',
        areaId: 'resistance_strategy_table',
      })
    );
    expect(strategy.trigger.once).toBe(false);
    expect(strategy.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_resistance_strategy_table',
      })
    );

    expect(escape.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_RESISTANCE.id,
        objectiveId: 'obj_secure_escape_routes',
        areaId: 'resistance_escape_tunnel',
      })
    );
    expect(escape.trigger.once).toBe(true);
    expect(escape.trigger.data.metadata).toEqual(
      expect.objectContaining({
        unlocksMechanic: 'fast_travel',
      })
    );

    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_RESISTANCE_TRIGGER_IDS.ENTRY)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_RESISTANCE_TRIGGER_IDS.STRATEGY_TABLE)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_RESISTANCE_TRIGGER_IDS.ESCAPE_TUNNEL)?.migrated
    ).toBe(true);

    expect(sceneData.sceneName).toBe('act2_resistance_hideout');
    expect(sceneData.spawnPoint).toEqual({ x: 200, y: 560 });
    expect(sceneData.metadata.navigationMesh).toEqual(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'hideout_entry' }),
          expect.objectContaining({ id: 'strategy_table' }),
          expect.objectContaining({ id: 'escape_tunnel' }),
        ]),
        walkableSurfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'lower_platform' }),
          expect.objectContaining({ id: 'strategy_platform' }),
          expect.objectContaining({ id: 'tunnel_platform' }),
        ]),
      })
    );
    expect(sceneData.metadata.geometry?.floors?.length).toBeGreaterThanOrEqual(3);
    expect(sceneData.metadata.triggerLayout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ triggerId: ACT2_RESISTANCE_TRIGGER_IDS.ENTRY }),
        expect.objectContaining({ triggerId: ACT2_RESISTANCE_TRIGGER_IDS.STRATEGY_TABLE }),
        expect.objectContaining({ triggerId: ACT2_RESISTANCE_TRIGGER_IDS.ESCAPE_TUNNEL }),
      ])
    );
  });
});

