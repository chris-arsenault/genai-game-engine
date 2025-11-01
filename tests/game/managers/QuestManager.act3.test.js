import { EventBus } from '../../../src/engine/events/EventBus.js';
import { QuestManager } from '../../../src/game/managers/QuestManager.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { registerAct3GatheringSupportQuest } from '../../../src/game/data/quests/act3GatheringSupportQuest.js';

class StubFactionManager {
  getReputation() {
    return { fame: 0, infamy: 0 };
  }

  getAttitude() {
    return 'neutral';
  }
}

describe('QuestManager Act 3 Gathering Support integration', () => {
  let eventBus;
  let storyFlags;
  let questManager;

  beforeEach(() => {
    eventBus = new EventBus();
    storyFlags = new StoryFlagManager(eventBus);
    storyFlags.init();
    questManager = new QuestManager(eventBus, new StubFactionManager(), storyFlags);
    questManager.init();

    registerAct3GatheringSupportQuest(questManager);
    storyFlags.setFlag('act3_plan_committed', true);
    questManager.startQuest('main-act3-gathering-support');
  });

  function getObjectiveState(objectiveId) {
    const quest = questManager.quests.get('main-act3-gathering-support');
    return quest?.objectiveStates?.get(objectiveId);
  }

  test('stance commitment sets story flags and completes opening objective', () => {
    const beforeState = getObjectiveState('obj_commit_act3_stance');
    expect(beforeState.status).toBe('pending');

    eventBus.emit('act3:stance_committed', {
      questId: 'main-act3-gathering-support',
      stanceId: 'opposition',
      branchId: 'opposition',
      stanceFlag: 'act3_stance_opposition',
      planFlag: 'act3_plan_committed',
      worldFlags: ['act3_branch_opposition'],
    });

    const afterState = getObjectiveState('obj_commit_act3_stance');
    expect(afterState.status).toBe('completed');
    expect(storyFlags.getFlag('act3_plan_committed')).toBe(true);
    expect(storyFlags.getFlag('act3_stance_opposition')).toBe(true);
    expect(storyFlags.getFlag('act3_branch_opposition')).toBe(true);
  });

  test('branch milestone only progresses matching objectives', () => {
    const drChenBefore = getObjectiveState('obj_opposition_recruit_dr_chen');
    expect(drChenBefore.status).toBe('pending');
    const supportBefore = getObjectiveState('obj_support_upgrade_broadcast_grid');
    expect(supportBefore.status).toBe('pending');

    eventBus.emit('act3:gathering_support:milestone', {
      questId: 'main-act3-gathering-support',
      branchId: 'opposition',
      stanceId: 'opposition',
      milestoneId: 'opposition_recruit_dr_chen',
      objectiveId: 'obj_opposition_recruit_dr_chen',
      successFlag: 'act3_opposition_dr_chen_committed',
    });

    const drChenAfter = getObjectiveState('obj_opposition_recruit_dr_chen');
    expect(drChenAfter.status).toBe('completed');
    expect(storyFlags.getFlag('act3_opposition_dr_chen_committed')).toBe(true);

    const supportAfter = getObjectiveState('obj_support_upgrade_broadcast_grid');
    expect(supportAfter.status).toBe('pending');
  });

  test('shared objectives respond to global events', () => {
    eventBus.emit('area:entered', {
      areaId: 'archive_care_facility_dmitri',
    });
    const visitState = getObjectiveState('obj_visit_dmitri');
    expect(visitState.status).toBe('completed');

    eventBus.emit('act3:gathering_support:milestone', {
      questId: 'main-act3-gathering-support',
      branchId: 'shared',
      stanceId: 'shared',
      milestoneId: 'shared_prepare_archive_loadout',
      objectiveId: 'obj_prepare_archive_loadout',
      successFlag: 'act3_shared_loadout_prepared',
    });
    const loadoutState = getObjectiveState('obj_prepare_archive_loadout');
    expect(loadoutState.status).toBe('completed');
    expect(storyFlags.getFlag('act3_shared_loadout_prepared')).toBe(true);
  });
});
