import { questSlice } from '../../../../src/game/state/slices/questSlice.js';

describe('questSlice', () => {
  function reduce(state, action) {
    return questSlice.reducer(state, action);
  }

  test('initializes with empty quest state', () => {
    const initial = questSlice.getInitialState();
    expect(initial.byId).toEqual({});
    expect(initial.activeIds).toEqual([]);
  });

  test('handles quest lifecycle events', () => {
    let state = questSlice.getInitialState();

    state = reduce(state, {
      type: 'QUEST_REGISTERED',
      domain: 'quest',
      payload: {
        questId: 'quest_1',
        title: 'Test Quest',
        type: 'main',
        description: 'Track metadata',
        objectives: [
          {
            id: 'obj_1',
            description: 'Complete intro',
            trigger: { count: 2 },
          },
        ],
      },
    });

    state = reduce(state, {
      type: 'QUEST_STARTED',
      domain: 'quest',
      payload: { questId: 'quest_1', title: 'Test Quest', type: 'main' },
    });

    expect(state.activeIds).toContain('quest_1');
    expect(state.byId.quest_1.status).toBe('active');

    state = reduce(state, {
      type: 'OBJECTIVE_PROGRESS',
      domain: 'quest',
      payload: {
        questId: 'quest_1',
        objectiveId: 'obj_1',
        progress: 1,
        target: 2,
      },
    });

    expect(state.byId.quest_1.objectives.obj_1.progress).toBe(1);

    state = reduce(state, {
      type: 'OBJECTIVE_COMPLETED',
      domain: 'quest',
      payload: {
        questId: 'quest_1',
        objectiveId: 'obj_1',
        target: 2,
      },
    });

    expect(state.byId.quest_1.objectives.obj_1.status).toBe('completed');

    state = reduce(state, {
      type: 'QUEST_COMPLETED',
      domain: 'quest',
      payload: { questId: 'quest_1' },
    });

    expect(state.completedIds).toContain('quest_1');
    expect(state.activeIds).not.toContain('quest_1');
    expect(state.byId.quest_1.description).toBe('Track metadata');
    expect(state.byId.quest_1.objectives.obj_1.target).toBe(2);
    expect(state.byId.quest_1.objectivesOrder).toContain('obj_1');
  });

  test('hydrates snapshot payload', () => {
    const hydrated = reduce(questSlice.getInitialState(), {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        quests: {
          byId: {
            quest_2: { id: 'quest_2', status: 'completed', objectives: {} },
          },
          activeIds: [],
          completedIds: ['quest_2'],
          failedIds: [],
        },
      },
    });

    expect(hydrated.byId.quest_2.status).toBe('completed');
    expect(hydrated.completedIds).toContain('quest_2');
  });
});
