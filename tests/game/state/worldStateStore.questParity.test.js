import { EventBus } from '../../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../../src/game/state/WorldStateStore.js';
import { FactionManager } from '../../../src/game/managers/FactionManager.js';
import { QuestManager } from '../../../src/game/managers/QuestManager.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { questSlice } from '../../../src/game/state/slices/questSlice.js';

describe('WorldStateStore quest invariants', () => {
  let eventBus;
  let store;
  let factionManager;
  let storyFlagManager;
  let questManager;

  beforeEach(() => {
    eventBus = new EventBus();
    store = new WorldStateStore(eventBus, { enableDebug: true });
    store.init();

    factionManager = new FactionManager(eventBus);
    storyFlagManager = new StoryFlagManager(eventBus);
    storyFlagManager.init();

    questManager = new QuestManager(eventBus, factionManager, storyFlagManager);
    questManager.init();
  });

  afterEach(() => {
    store.destroy();
  });

  test('quest manager lifecycle mirrors store state', () => {
    const questDefinition = {
      id: 'quest_alpha',
      title: 'Alpha Directive',
      type: 'main',
      description: 'Prototype quest for parity validation.',
      act: 'act1',
      objectives: [
        {
          id: 'obj_intro',
          description: 'Complete the introductory step.',
          trigger: { event: 'custom:event', count: 1 },
        },
      ],
      rewards: {
        storyFlags: ['quest_alpha_completed'],
      },
    };

    questManager.registerQuest(questDefinition);

    const registeredQuest = store.select(questSlice.selectors.selectQuestById, questDefinition.id);
    expect(registeredQuest).not.toBeNull();
    expect(registeredQuest.description).toBe(questDefinition.description);

    const pendingObjectives = store.select(questSlice.selectors.selectQuestObjectives, questDefinition.id);
    expect(pendingObjectives).toHaveLength(1);
    expect(pendingObjectives[0].status).toBe('pending');

    questManager.startQuest(questDefinition.id);

    const questRef = questManager.getQuest(questDefinition.id);
    const objectiveState = questRef.objectiveStates.get('obj_intro');
    questManager.progressObjective(questDefinition.id, 'obj_intro', questRef, objectiveState);

    const questFromStore = store.select(questSlice.selectors.selectQuestById, questDefinition.id);
    expect(questFromStore.status).toBe('completed');
    expect(questFromStore.act).toBe('act1');
    expect(questFromStore.rewards).toBeDefined();
    expect(questFromStore.rewards.storyFlags).toContain('quest_alpha_completed');

    const completedObjectives = store.select(questSlice.selectors.selectQuestObjectives, questDefinition.id);
    expect(completedObjectives[0].status).toBe('completed');
    expect(completedObjectives[0].description).toBe(questDefinition.objectives[0].description);

    const completedQuests = store.select(questSlice.selectors.selectCompletedQuests);
    expect(completedQuests.some((quest) => quest.id === questDefinition.id)).toBe(true);
  });

  test('NPC availability events mirror into quest slice state', () => {
    const questDefinition = {
      id: 'quest_availability',
      title: 'Silent Archives',
      type: 'side',
      objectives: [
        {
          id: 'obj_meet_lira',
          title: 'Meet Archivist Lira',
          trigger: { event: 'dialogue:completed', count: 1 },
        },
      ],
    };

    questManager.registerQuest(questDefinition);
    questManager.startQuest(questDefinition.id);

    const availabilityTimestamp = Date.now();
    eventBus.emit('quest:npc_availability', {
      npcId: 'npc_lira',
      npcName: 'Archivist Lira',
      factionId: 'archivists',
      available: false,
      updatedAt: availabilityTimestamp,
      objectives: [
        {
          questId: questDefinition.id,
          questTitle: questDefinition.title,
          objectiveId: 'obj_meet_lira',
          objectiveTitle: 'Meet Archivist Lira',
        },
      ],
      reason: 'entity_destroyed',
      tag: 'dialogue-trigger',
    });

    const availabilityRecords = store.select(questSlice.selectors.selectNpcAvailabilityRecords);
    expect(availabilityRecords[0]).toMatchObject({
      npcId: 'npc_lira',
      available: false,
    });
    expect(availabilityRecords[0].objectives[0]).toMatchObject({
      questId: questDefinition.id,
      objectiveId: 'obj_meet_lira',
    });

    const blockedObjectives = store.select(
      questSlice.selectors.selectQuestBlockedObjectives,
      questDefinition.id
    );
    expect(blockedObjectives).toHaveLength(1);
    expect(blockedObjectives[0].npcId).toBe('npc_lira');

    eventBus.emit('quest:npc_availability', {
      npcId: 'npc_lira',
      npcName: 'Archivist Lira',
      available: true,
      updatedAt: availabilityTimestamp + 1000,
      reason: 'availability_restored',
    });

    const updatedRecords = store.select(questSlice.selectors.selectNpcAvailabilityRecords);
    expect(updatedRecords.find((record) => record.npcId === 'npc_lira')?.available).toBe(true);

    const clearedObjectives = store.select(
      questSlice.selectors.selectQuestBlockedObjectives,
      questDefinition.id
    );
    expect(clearedObjectives).toHaveLength(0);
  });
});
