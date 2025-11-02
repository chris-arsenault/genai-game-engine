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
import { NarrativeBeats } from '../../../src/game/data/narrative/NarrativeBeatCatalog.js';

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
    expect(triggerLookup.has('corporate_encryption_lab')).toBe(true);
    expect(triggerLookup.has('corporate_exfiltration_route')).toBe(true);

    const lobby = triggerLookup.get('corporate_lobby');
    const security = triggerLookup.get('corporate_security_floor');
    const serverAccess = triggerLookup.get('corporate_server_access');
    const encryptionLab = triggerLookup.get('corporate_encryption_lab');
    const exfilRoute = triggerLookup.get('corporate_exfiltration_route');

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

    expect(encryptionLab.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_NEUROSYNC.id,
        objectiveId: 'obj_clone_encryption_core',
        areaId: 'corporate_encryption_lab',
      })
    );
    expect(encryptionLab.trigger.once).toBe(true);
    expect(encryptionLab.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_corporate_encryption_lab',
        unlocksMechanic: 'data_extraction',
      })
    );

    expect(exfilRoute.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_NEUROSYNC.id,
        objectiveId: 'obj_exfiltrate_with_data',
        areaId: 'corporate_exfiltration_route',
      })
    );
    expect(exfilRoute.trigger.once).toBe(true);
    expect(exfilRoute.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_corporate_exfiltration_route',
        unlocksMechanic: 'escape_route',
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
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_CORPORATE_TRIGGER_IDS.ENCRYPTION_LAB)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_CORPORATE_TRIGGER_IDS.EXFIL_ROUTE)?.migrated
    ).toBe(true);

    expect(sceneData.sceneName).toBe('act2_corporate_interior');
    expect(sceneData.spawnPoint).toEqual({ x: 220, y: 520 });
    expect(sceneData.metadata.navigationMesh).toEqual(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'lobby_spawn' }),
          expect.objectContaining({ id: 'security_checkpoint' }),
          expect.objectContaining({ id: 'server_hall_entry' }),
          expect.objectContaining({ id: 'encryption_lab' }),
          expect.objectContaining({ id: 'exfil_route' }),
        ]),
        walkableSurfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'lobby_floor' }),
          expect.objectContaining({ id: 'security_walkway' }),
          expect.objectContaining({ id: 'server_access' }),
          expect.objectContaining({ id: 'encryption_lab_floor' }),
          expect.objectContaining({ id: 'exfil_route_floor' }),
        ]),
      })
    );
    expect(sceneData.metadata.geometry?.floors?.length).toBeGreaterThanOrEqual(3);
    expect(sceneData.metadata.triggerLayout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.LOBBY_ENTRY }),
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.SECURITY_FLOOR }),
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.SERVER_ACCESS }),
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.ENCRYPTION_LAB }),
        expect.objectContaining({ triggerId: ACT2_CORPORATE_TRIGGER_IDS.EXFIL_ROUTE }),
      ])
    );
    expect(sceneData.metadata.narrativeBeats).toEqual(
      expect.objectContaining({
        entry: NarrativeBeats.act2.corporate.ENTRY,
        progression: NarrativeBeats.act2.corporate.SECURITY,
        objective: NarrativeBeats.act2.corporate.SERVER_ACCESS,
        encryption: NarrativeBeats.act2.corporate.ENCRYPTION_CLONE,
        exfiltration: NarrativeBeats.act2.corporate.EXFILTRATION,
      })
    );
  });
});
