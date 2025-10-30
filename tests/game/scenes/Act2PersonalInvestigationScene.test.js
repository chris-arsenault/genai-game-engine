import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadAct2PersonalInvestigationScene,
  ACT2_PERSONAL_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2PersonalInvestigationScene.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { QUEST_ACT2_PERSONAL } from '../../../src/game/data/quests/act2PersonalInvestigationQuest.js';
import { seedAct2CrossroadsTriggers } from '../../../src/game/data/quests/act2TriggerDefinitions.js';

describe('Act2PersonalInvestigationScene', () => {
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
    sceneData = await loadAct2PersonalInvestigationScene(
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

  it('registers personal investigation triggers and exposes navigation metadata', () => {
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

    expect(triggerLookup.has('personal_archive_entry')).toBe(true);
    expect(triggerLookup.has('personal_casefile_review')).toBe(true);
    expect(triggerLookup.has('personal_memory_vault')).toBe(true);
    expect(triggerLookup.has('personal_projection_lab')).toBe(true);
    expect(triggerLookup.has('personal_broadcast_terminal')).toBe(true);

    const entry = triggerLookup.get('personal_archive_entry');
    const casefile = triggerLookup.get('personal_casefile_review');
    const memoryVault = triggerLookup.get('personal_memory_vault');
    const projectionLab = triggerLookup.get('personal_projection_lab');
    const broadcastTerminal = triggerLookup.get('personal_broadcast_terminal');

    expect(entry.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_PERSONAL.id,
        objectiveId: 'obj_access_personal_archive',
        areaId: 'personal_archive_entry',
      })
    );
    expect(entry.trigger.once).toBe(true);
    expect(entry.trigger.data.metadata).toEqual(
      expect.objectContaining({
        narrativeBeat: 'act2_personal_archive_entry',
      })
    );

    expect(casefile.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_PERSONAL.id,
        objectiveId: 'obj_reconstruct_cold_cases',
        areaId: 'personal_casefile_review',
      })
    );
    expect(casefile.trigger.once).toBe(false);
    expect(casefile.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_personal_casefile_review',
      })
    );

    expect(memoryVault.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_PERSONAL.id,
        objectiveId: 'obj_unlock_memory_vault',
        areaId: 'personal_memory_vault',
      })
    );
    expect(memoryVault.trigger.once).toBe(true);
    expect(memoryVault.trigger.data.metadata).toEqual(
      expect.objectContaining({
        unlocksMechanic: 'testimony_projection',
      })
    );

    expect(projectionLab.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_PERSONAL.id,
        objectiveId: 'obj_decode_projection_logs',
        areaId: 'personal_projection_lab',
      })
    );
    expect(projectionLab.trigger.once).toBe(true);
    expect(projectionLab.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_personal_projection_lab',
        unlocksMechanic: 'knowledge_ledger',
      })
    );

    expect(broadcastTerminal.quest).toEqual(
      expect.objectContaining({
        questId: QUEST_ACT2_PERSONAL.id,
        objectiveId: 'obj_schedule_public_exposure',
        areaId: 'personal_broadcast_terminal',
      })
    );
    expect(broadcastTerminal.trigger.once).toBe(true);
    expect(broadcastTerminal.trigger.data.metadata).toEqual(
      expect.objectContaining({
        telemetryTag: 'act2_personal_broadcast_terminal',
        unlocksMechanic: 'network_signal',
      })
    );

    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.ENTRY)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.CASEFILES)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.MEMORY_VAULT)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.PROJECTION_LAB)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(
        ACT2_PERSONAL_TRIGGER_IDS.BROADCAST_TERMINAL
      )?.migrated
    ).toBe(true);

    expect(sceneData.sceneName).toBe('act2_personal_archive');
    expect(sceneData.spawnPoint).toEqual({ x: 240, y: 540 });
    expect(sceneData.metadata.navigationMesh).toEqual(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'archive_entry' }),
          expect.objectContaining({ id: 'casefile_desk' }),
          expect.objectContaining({ id: 'memory_vault' }),
          expect.objectContaining({ id: 'projection_lab' }),
          expect.objectContaining({ id: 'broadcast_terminal' }),
        ]),
        walkableSurfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'archive_floor' }),
          expect.objectContaining({ id: 'casefile_platform' }),
          expect.objectContaining({ id: 'vault_platform' }),
          expect.objectContaining({ id: 'projection_lab_platform' }),
          expect.objectContaining({ id: 'broadcast_platform' }),
        ]),
      })
    );
    expect(sceneData.metadata.geometry?.floors?.length).toBeGreaterThanOrEqual(3);
    expect(sceneData.metadata.triggerLayout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.ENTRY }),
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.CASEFILES }),
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.MEMORY_VAULT }),
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.PROJECTION_LAB }),
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.BROADCAST_TERMINAL }),
      ])
    );
    expect(sceneData.metadata.narrativeBeats).toEqual(
      expect.objectContaining({
        entry: 'act2_personal_archive_entry',
        progression: 'act2_personal_casefile_reckoning',
        projection: 'act2_personal_projection_analysis',
        broadcast: 'act2_personal_broadcast_commitment',
        objective: 'act2_personal_memory_vault_unlocked',
      })
    );
  });
});
