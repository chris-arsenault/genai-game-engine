import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadAct2CorporateInfiltrationScene,
  ACT2_CORPORATE_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2CorporateInfiltrationScene.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { QUEST_ACT2_NEUROSYNC } from '../../../src/game/data/quests/act2NeuroSyncQuest.js';
import { seedAct2CrossroadsTriggers } from '../../../src/game/data/quests/act2TriggerDefinitions.js';

describe('Act2CorporateInfiltrationScene', () => {
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
    sceneData = await loadAct2CorporateInfiltrationScene(
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

  it('registers quest triggers and exposes navigation metadata', () => {
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

    expect(triggerLookup.has('corporate_lobby')).toBe(true);
    expect(triggerLookup.has('corporate_security_floor')).toBe(true);
    expect(triggerLookup.has('corporate_server_access')).toBe(true);

    const lobby = triggerLookup.get('corporate_lobby');
    const security = triggerLookup.get('corporate_security_floor');
    const serverAccess = triggerLookup.get('corporate_server_access');

    expect(lobby.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_NEUROSYNC.id,
        objectiveId: 'obj_infiltrate_lobby',
        areaId: 'corporate_lobby',
      })
    );
    expect(lobby.trigger.once).toBe(true);
    expect(lobby.trigger.data.metadata).toEqual(
      expect.objectContaining({
        narrativeBeat: 'act2_corporate_lobby_entry',
      })
    );

    expect(security.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_NEUROSYNC.id,
        objectiveId: 'obj_bypass_security_floor',
        areaId: 'corporate_security_floor',
      })
    );
    expect(security.trigger.once).toBe(false);
    expect(security.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_corporate_security_floor',
      })
    );

    expect(serverAccess.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_NEUROSYNC.id,
        objectiveId: 'obj_locate_server_room',
        areaId: 'corporate_server_access',
      })
    );
    expect(serverAccess.trigger.once).toBe(true);
    expect(serverAccess.trigger.data.metadata).toEqual(
      expect.objectContaining({
        narrativeBeat: 'act2_corporate_server_access',
      })
    );

    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_CORPORATE_TRIGGER_IDS.LOBBY_ENTRY)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_CORPORATE_TRIGGER_IDS.SECURITY_FLOOR)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_CORPORATE_TRIGGER_IDS.SERVER_ACCESS)?.migrated
    ).toBe(true);

    expect(sceneData.sceneName).toBe('act2_corporate_interior');
    expect(sceneData.spawnPoint).toEqual({ x: 220, y: 520 });
    expect(sceneData.metadata.navigationMesh).toEqual(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'lobby_spawn' }),
          expect.objectContaining({ id: 'security_checkpoint' }),
          expect.objectContaining({ id: 'server_hall_entry' }),
        ]),
        walkableSurfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'lobby_floor' }),
          expect.objectContaining({ id: 'security_walkway' }),
          expect.objectContaining({ id: 'server_access' }),
        ]),
      })
    );
    expect(sceneData.metadata.geometry?.floors?.length).toBeGreaterThanOrEqual(3);
    expect(sceneData.metadata.triggerLayout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.LOBBY_ENTRY }),
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.SECURITY_FLOOR }),
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.SERVER_ACCESS }),
      ])
    );
  });
});
