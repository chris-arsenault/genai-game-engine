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

    const entry = triggerLookup.get('personal_archive_entry');
    const casefile = triggerLookup.get('personal_casefile_review');
    const memoryVault = triggerLookup.get('personal_memory_vault');

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

    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.ENTRY)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.CASEFILES)?.migrated
    ).toBe(true);
    expect(
      QuestTriggerRegistry.getTriggerDefinition(ACT2_PERSONAL_TRIGGER_IDS.MEMORY_VAULT)?.migrated
    ).toBe(true);

    expect(sceneData.sceneName).toBe('act2_personal_archive');
    expect(sceneData.spawnPoint).toEqual({ x: 240, y: 540 });
    expect(sceneData.metadata.navigationMesh).toEqual(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'archive_entry' }),
          expect.objectContaining({ id: 'casefile_desk' }),
          expect.objectContaining({ id: 'memory_vault' }),
        ]),
        walkableSurfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'archive_floor' }),
          expect.objectContaining({ id: 'casefile_platform' }),
          expect.objectContaining({ id: 'vault_platform' }),
        ]),
      })
    );
    expect(sceneData.metadata.geometry?.floors?.length).toBeGreaterThanOrEqual(3);
    expect(sceneData.metadata.triggerLayout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.ENTRY }),
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.CASEFILES }),
        expect.objectContaining({ triggerId: ACT2_PERSONAL_TRIGGER_IDS.MEMORY_VAULT }),
      ])
    );
  });
});
