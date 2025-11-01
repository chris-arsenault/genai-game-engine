import { EventBus } from '../../../src/engine/events/EventBus.js';
import { QuestManager } from '../../../src/game/managers/QuestManager.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { registerAct3GatheringSupportQuest } from '../../../src/game/data/quests/act3GatheringSupportQuest.js';
import { registerAct3ZenithInfiltrationQuest } from '../../../src/game/data/quests/act3ZenithInfiltrationQuest.js';

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

describe('QuestManager Act 3 Zenith Infiltration integration', () => {
  let eventBus;
  let storyFlags;
  let questManager;

  beforeEach(() => {
    eventBus = new EventBus();
    storyFlags = new StoryFlagManager(eventBus);
    storyFlags.init();
    questManager = new QuestManager(eventBus, new StubFactionManager(), storyFlags);
    questManager.init();

    registerAct3ZenithInfiltrationQuest(questManager);
    storyFlags.setFlag('act3_plan_committed', true);
    storyFlags.setFlag('act3_gathering_support_complete', true);
    questManager.startQuest('main-act3-zenith-infiltration');
  });

  function getObjectiveState(objectiveId) {
    const quest = questManager.quests.get('main-act3-zenith-infiltration');
    return quest?.objectiveStates?.get(objectiveId);
  }

  test('shared stage completion propagates success flag', () => {
    const beforeState = getObjectiveState('obj_zenith_sector_entry');
    expect(beforeState.status).toBe('pending');

    eventBus.emit('act3:zenith_infiltration:stage', {
      questId: 'main-act3-zenith-infiltration',
      branchId: 'shared',
      stageId: 'shared_sector_entry',
      objectiveId: 'obj_zenith_sector_entry',
      successFlag: 'act3_zenith_sector_perimeter_breached',
    });

    const afterState = getObjectiveState('obj_zenith_sector_entry');
    expect(afterState.status).toBe('completed');
    expect(storyFlags.getFlag('act3_zenith_sector_perimeter_breached')).toBe(true);
  });

  test('branch stage only advances matching stance objective', () => {
    storyFlags.setFlag('act3_stance_opposition', true);
    storyFlags.setFlag('act3_opposition_mcd_override_secured', true);

    const oppositionBefore = getObjectiveState('obj_zenith_opposition_disable_grid');
    const supportBefore = getObjectiveState('obj_zenith_support_overclock_relays');
    expect(oppositionBefore.status).toBe('pending');
    expect(supportBefore.status).toBe('pending');

    eventBus.emit('act3:zenith_infiltration:stage', {
      questId: 'main-act3-zenith-infiltration',
      branchId: 'opposition',
      stanceId: 'opposition',
      stanceFlag: 'act3_stance_opposition',
      stageId: 'opposition_disable_grid',
      objectiveId: 'obj_zenith_opposition_disable_grid',
      successFlag: 'act3_zenith_opposition_grid_disabled',
    });

    const oppositionAfter = getObjectiveState('obj_zenith_opposition_disable_grid');
    const supportAfter = getObjectiveState('obj_zenith_support_overclock_relays');
    expect(oppositionAfter.status).toBe('completed');
    expect(storyFlags.getFlag('act3_zenith_opposition_grid_disabled')).toBe(true);
    expect(supportAfter.status).toBe('pending');
  });
});
