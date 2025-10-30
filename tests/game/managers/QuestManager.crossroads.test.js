import { EventBus } from '../../../src/engine/events/EventBus.js';
import { QuestManager } from '../../../src/game/managers/QuestManager.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { registerAct2CrossroadsQuest } from '../../../src/game/data/quests/act2CrossroadsQuest.js';

class StubFactionManager {
  constructor() {
    this.reputation = new Map();
  }

  getAttitude() {
    return 'neutral';
  }

  modifyReputation() {}
}

describe('QuestManager Crossroads integration', () => {
  let eventBus;
  let storyFlags;
  let questManager;

  beforeEach(() => {
    eventBus = new EventBus();
    storyFlags = new StoryFlagManager(eventBus);
    storyFlags.init();
    questManager = new QuestManager(eventBus, new StubFactionManager(), storyFlags);
    questManager.init();

    registerAct2CrossroadsQuest(questManager);
    storyFlags.setFlag('act1_complete', true);
    questManager.startQuest('main-act2-crossroads');
  });

  function getObjectiveState(objectiveId) {
    const quest = questManager.quests.get('main-act2-crossroads');
    return quest?.objectiveStates?.get(objectiveId);
  }

  test('briefing prompt advances briefing objective', () => {
    const stateBefore = getObjectiveState('obj_attend_zara_briefing');
    expect(stateBefore.status).toBe('pending');

    eventBus.emit('narrative:crossroads_prompt', {
      areaId: 'safehouse_briefing_table',
    });

    const stateAfter = getObjectiveState('obj_attend_zara_briefing');
    expect(stateAfter.status).toBe('completed');
  });

  test('thread selection completes quest, sets flag, and triggers branch logic', () => {
    eventBus.emit('area:entered', {
      areaId: 'corporate_spires_checkpoint',
    });
    eventBus.emit('narrative:crossroads_prompt', {
      areaId: 'safehouse_briefing_table',
    });
    eventBus.emit('crossroads:thread_selected', {
      questId: 'main-act2-crossroads',
      branchId: 'act2_thread_corporate_infiltration',
      worldFlags: ['act2_branch_corporate_selected'],
    });

    const branchFlag = storyFlags.getFlag('act2_branch_corporate_selected');
    expect(branchFlag).toBe(true);
    expect(questManager.completedQuests.has('main-act2-crossroads')).toBe(true);
  });
});
