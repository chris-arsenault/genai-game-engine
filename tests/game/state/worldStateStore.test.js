import { WorldStateStore } from '../../../src/game/state/WorldStateStore.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { questSlice } from '../../../src/game/state/slices/questSlice.js';
import { storySlice } from '../../../src/game/state/slices/storySlice.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';
import { tutorialSlice } from '../../../src/game/state/slices/tutorialSlice.js';

describe('WorldStateStore', () => {
  let eventBus;
  let store;

  beforeEach(() => {
    eventBus = new EventBus();
    store = new WorldStateStore(eventBus, { enableDebug: true });
    store.init();
  });

  afterEach(() => {
    store.destroy();
  });

  test('captures quest lifecycle via EventBus', () => {
    eventBus.emit('quest:registered', {
      questId: 'quest_alpha',
      title: 'Alpha Quest',
      type: 'main',
    });

    eventBus.emit('quest:started', {
      questId: 'quest_alpha',
      title: 'Alpha Quest',
      type: 'main',
    });

    eventBus.emit('objective:progress', {
      questId: 'quest_alpha',
      objectiveId: 'obj_1',
      progress: 1,
      target: 1,
    });

    eventBus.emit('quest:completed', {
      questId: 'quest_alpha',
      title: 'Alpha Quest',
      type: 'main',
    });

    const quest = store.select(questSlice.selectors.selectQuestById, 'quest_alpha');
    expect(quest.status).toBe('completed');
    expect(quest.objectives.obj_1.status).toBe('completed');
  });

  test('tracks story flags, faction reputation, and tutorial progress', () => {
    eventBus.emit('story:flag:changed', {
      flagId: 'act1_started',
      newValue: true,
    });

    eventBus.emit('reputation:changed', {
      factionId: 'faction_alpha',
      newFame: 30,
      newInfamy: 10,
      deltaFame: 5,
      deltaInfamy: -2,
      reason: 'Test change',
    });

    eventBus.emit('tutorial:started', { totalSteps: 3 });
    eventBus.emit('tutorial:step_started', { stepId: 'movement', stepIndex: 0, totalSteps: 3 });
    eventBus.emit('tutorial:step_completed', { stepId: 'movement', stepIndex: 0 });

    const currentAct = store.select(storySlice.selectors.selectCurrentAct);
    expect(currentAct).toBe('act1');

    const faction = store.select(factionSlice.selectors.selectFactionById, 'faction_alpha');
    expect(faction.fame).toBe(30);

    const tutorial = store.select(tutorialSlice.selectors.selectTutorialProgress);
    expect(tutorial.enabled).toBe(true);
    expect(tutorial.completedSteps).toContain('movement');
  });

  test('produces and hydrates snapshots', () => {
    eventBus.emit('story:flag:changed', {
      flagId: 'act1_started',
      newValue: true,
    });

    const snapshot = store.snapshot();
    expect(snapshot.storyFlags.flags.act1_started.value).toBe(true);
    expect(snapshot.meta).toBeUndefined();

    const secondBus = new EventBus();
    const restoredStore = new WorldStateStore(secondBus, { enableDebug: false });
    restoredStore.init();
    restoredStore.hydrate(snapshot);

    const restoredFlag = restoredStore.select(storySlice.selectors.selectFlag, 'act1_started');
    expect(restoredFlag).toBe(true);

    restoredStore.destroy();
  });
});
