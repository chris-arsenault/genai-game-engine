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
});
