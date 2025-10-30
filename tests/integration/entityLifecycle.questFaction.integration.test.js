import { EventBus } from '../../src/engine/events/EventBus.js';
import { EntityManager } from '../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../src/engine/ecs/ComponentRegistry.js';
import { QuestManager } from '../../src/game/managers/QuestManager.js';
import { StoryFlagManager } from '../../src/game/managers/StoryFlagManager.js';
import { FactionManager } from '../../src/game/managers/FactionManager.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { questSlice } from '../../src/game/state/slices/questSlice.js';
import { factionSlice } from '../../src/game/state/slices/factionSlice.js';
import { SaveManager } from '../../src/game/managers/SaveManager.js';

function createLifecycleHarness() {
  const eventBus = new EventBus();
  const entityManager = new EntityManager();
  const componentRegistry = new ComponentRegistry(entityManager);

  const storyFlagManager = new StoryFlagManager(eventBus);
  storyFlagManager.init();

  const factionManager = new FactionManager(eventBus);
  const questManager = new QuestManager(
    eventBus,
    factionManager,
    storyFlagManager
  );
  questManager.init();

  const worldStateStore = new WorldStateStore(eventBus);
  worldStateStore.init();

  entityManager.onEntityDestroyed((entityId, metadata, snapshot) => {
    const payload = {
      entityId,
      tag: metadata?.tag ?? null,
      timestamp: Date.now(),
    };

    if (snapshot instanceof Map) {
      const npc = snapshot.get('NPC');
      const factionMember = snapshot.get('FactionMember');
      payload.narrative = {};
      if (npc?.npcId) {
        payload.narrative.npcId = npc.npcId;
      }
      if (npc?.faction) {
        payload.narrative.factionId = npc.faction;
      }
      if (!payload.narrative.factionId && factionMember?.primaryFaction) {
        payload.narrative.factionId = factionMember.primaryFaction;
      }
      if (Object.keys(payload.narrative).length === 0) {
        delete payload.narrative;
      }
    } else if (snapshot && typeof snapshot === 'object') {
      const narrative = snapshot.narrative || snapshot;
      if (narrative) {
        payload.narrative = { ...narrative };
      }
    }

    eventBus.emit('entity:destroyed', payload);
    questManager.handleEntityDestroyed(entityId, metadata, snapshot);
    factionManager.handleEntityDestroyed(entityId, metadata, snapshot);
  });

  return {
    eventBus,
    entityManager,
    componentRegistry,
    questManager,
    factionManager,
    worldStateStore,
  };
}

describe('Entity lifecycle integration', () => {
  test('quest objectives unblock after NPC respawn and renewed interaction', () => {
    const {
      eventBus,
      entityManager,
      componentRegistry,
      questManager,
      worldStateStore,
    } = createLifecycleHarness();

    const quest = {
      id: 'npc_support_quest',
      title: 'Find Witness Alpha',
      type: 'main',
      objectives: [
        {
          id: 'speak_to_witness',
          description: 'Interview the street witness',
          trigger: { event: 'npc:interviewed', npcId: 'witness_alpha' },
        },
      ],
    };

    questManager.registerQuest(quest);
    questManager.startQuest(quest.id);

    const entityId = entityManager.createEntity('npc', { active: true });
    componentRegistry.addComponent(entityId, 'NPC', {
      npcId: 'witness_alpha',
      name: 'Witness Alpha',
      faction: 'civilian',
    });
    componentRegistry.addComponent(entityId, 'FactionMember', {
      primaryFaction: 'civilian',
    });

    entityManager.destroyEntity(entityId);

    const blockedAfterDespawn = worldStateStore.select(
      questSlice.selectors.selectBlockedObjectives
    );
    expect(blockedAfterDespawn).toHaveLength(1);
    expect(blockedAfterDespawn[0]).toMatchObject({
      questId: 'npc_support_quest',
      objectiveId: 'speak_to_witness',
      reason: 'npc_unavailable',
      requirement: 'witness_alpha',
    });

    const respawnedId = entityManager.createEntity('npc', { active: true });
    componentRegistry.addComponent(respawnedId, 'NPC', {
      npcId: 'witness_alpha',
      name: 'Witness Alpha',
      faction: 'civilian',
    });
    componentRegistry.addComponent(respawnedId, 'FactionMember', {
      primaryFaction: 'civilian',
    });

    eventBus.emit('npc:interviewed', {
      npcId: 'witness_alpha',
      name: 'Witness Alpha',
    });

    expect(questManager.activeQuests.has('npc_support_quest')).toBe(false);
    expect(questManager.completedQuests.has('npc_support_quest')).toBe(true);

    const blockedAfterRespawn = worldStateStore.select(
      questSlice.selectors.selectBlockedObjectives
    );
    expect(blockedAfterRespawn).toHaveLength(0);
  });

  test('faction removal telemetry captured in inspector summary', () => {
    const {
      eventBus,
      entityManager,
      componentRegistry,
      worldStateStore,
    } = createLifecycleHarness();

    const entityId = entityManager.createEntity('npc', { active: true });
    componentRegistry.addComponent(entityId, 'NPC', {
      npcId: 'cipher_agent_alpha',
      faction: 'cipher_collective',
    });
    componentRegistry.addComponent(entityId, 'FactionMember', {
      primaryFaction: 'cipher_collective',
    });

    entityManager.destroyEntity(entityId);

    const removals = worldStateStore.select(
      factionSlice.selectors.selectRecentMemberRemovals
    );
    expect(removals).toHaveLength(1);
    expect(removals[0]).toMatchObject({
      factionId: 'cipher_collective',
      npcId: 'cipher_agent_alpha',
    });

    const saveManager = new SaveManager(eventBus, {
      worldStateStore,
    });

    const summary = saveManager.getInspectorSummary();
    expect(summary.factions.recentMemberRemovals).toHaveLength(1);
    expect(summary.factions.recentMemberRemovals[0]).toMatchObject({
      factionId: 'cipher_collective',
      npcId: 'cipher_agent_alpha',
    });
  });
});
