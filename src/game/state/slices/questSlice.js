import { createSelector } from '../utils/memoize.js';

const initialQuestState = {
  byId: {},
  activeIds: [],
  completedIds: [],
  failedIds: [],
  lastActionAt: null,
};

function cloneQuestState(state) {
  return {
    byId: { ...state.byId },
    activeIds: [...state.activeIds],
    completedIds: [...state.completedIds],
    failedIds: [...state.failedIds],
    lastActionAt: state.lastActionAt,
  };
}

function ensureQuestRecord(state, payload) {
  const existing = state.byId[payload.questId];
  if (existing) {
    return existing;
  }

  const record = {
    id: payload.questId,
    title: payload.title ?? null,
    type: payload.type ?? null,
    status: payload.status ?? 'not_started',
    startedAt: null,
    completedAt: null,
    failedAt: null,
    objectives: {},
    metadata: payload.metadata ?? {},
  };

  state.byId[payload.questId] = record;
  return record;
}

function updateListsForStatus(state, questId, newStatus) {
  state.activeIds = state.activeIds.filter((id) => id !== questId);
  state.completedIds = state.completedIds.filter((id) => id !== questId);
  state.failedIds = state.failedIds.filter((id) => id !== questId);

  if (newStatus === 'active') {
    state.activeIds.push(questId);
  } else if (newStatus === 'completed') {
    state.completedIds.push(questId);
  } else if (newStatus === 'failed') {
    state.failedIds.push(questId);
  }
}

export const questSlice = {
  key: 'quest',

  getInitialState() {
    return cloneQuestState(initialQuestState);
  },

  /**
   * Reducer for quest-related actions.
   * @param {Object} state
   * @param {Object} action
   * @returns {Object}
   */
  reducer(state = initialQuestState, action) {
    if (!action) {
      return state;
    }

    if (action.domain !== 'quest' && action.type !== 'WORLDSTATE_HYDRATE') {
      return state;
    }

    const next = cloneQuestState(state);
    const payload = action.payload || {};
    let hasChange = false;

    switch (action.type) {
      case 'QUEST_REGISTERED': {
        if (!payload.questId) break;
        if (next.byId[payload.questId]) break;

        next.byId[payload.questId] = {
          id: payload.questId,
          title: payload.title ?? null,
          type: payload.type ?? null,
          status: 'not_started',
          objectives: {},
          metadata: payload.metadata ?? {},
          startedAt: null,
          completedAt: null,
          failedAt: null,
        };
        hasChange = true;
        break;
      }

      case 'QUEST_STARTED': {
        if (!payload.questId) break;
        const quest = ensureQuestRecord(next, payload);
        quest.status = 'active';
        quest.startedAt = payload.timestamp ?? Date.now();
        updateListsForStatus(next, payload.questId, 'active');
        hasChange = true;
        break;
      }

      case 'QUEST_COMPLETED': {
        if (!payload.questId) break;
        const quest = ensureQuestRecord(next, payload);
        quest.status = 'completed';
        quest.completedAt = payload.timestamp ?? Date.now();
        if (payload.rewards) {
          quest.rewards = payload.rewards;
        }
        updateListsForStatus(next, payload.questId, 'completed');
        hasChange = true;
        break;
      }

      case 'QUEST_FAILED': {
        if (!payload.questId) break;
        const quest = ensureQuestRecord(next, payload);
        quest.status = 'failed';
        quest.failedAt = payload.timestamp ?? Date.now();
        updateListsForStatus(next, payload.questId, 'failed');
        hasChange = true;
        break;
      }

      case 'OBJECTIVE_PROGRESS': {
        if (!payload.questId || !payload.objectiveId) break;
        const quest = ensureQuestRecord(next, payload);
        const objective = quest.objectives[payload.objectiveId] || {
          id: payload.objectiveId,
          status: 'in_progress',
          progress: 0,
          target: payload.target ?? 1,
        };
        objective.progress = payload.progress ?? objective.progress;
        objective.target = payload.target ?? objective.target;
        if (objective.progress >= objective.target) {
          objective.status = 'completed';
        }
        quest.objectives[payload.objectiveId] = objective;
        hasChange = true;
        break;
      }

      case 'OBJECTIVE_COMPLETED': {
        if (!payload.questId || !payload.objectiveId) break;
        const quest = ensureQuestRecord(next, payload);
        const objective = quest.objectives[payload.objectiveId] || {
          id: payload.objectiveId,
          status: 'in_progress',
          progress: payload.target ?? 1,
          target: payload.target ?? 1,
        };
        objective.status = 'completed';
        objective.progress = payload.target ?? objective.progress ?? 1;
        quest.objectives[payload.objectiveId] = objective;
        hasChange = true;
        break;
      }

      case 'WORLDSTATE_HYDRATE': {
        if (!payload?.quests) break;
        return cloneQuestState({
          ...initialQuestState,
          ...payload.quests,
        });
      }

      default:
        break;
    }

    if (hasChange) {
      next.lastActionAt = action.timestamp ?? Date.now();
      return next;
    }

    return state;
  },

  serialize(state) {
    return {
      byId: state.byId,
      activeIds: state.activeIds,
      completedIds: state.completedIds,
      failedIds: state.failedIds,
    };
  },

  selectors: {
    selectSlice(state) {
      return state.quest;
    },
    selectQuestById: createSelector(
      (state) => state.quest,
      (state, questId) => questId,
      (questState, questId) => questState.byId[questId] || null
    ),
    selectActiveQuests: createSelector(
      (state) => state.quest,
      (questState) => questState.activeIds.map((id) => questState.byId[id]).filter(Boolean)
    ),
    selectCompletedQuests: createSelector(
      (state) => state.quest,
      (questState) => questState.completedIds.map((id) => questState.byId[id]).filter(Boolean)
    ),
    selectQuestLogEntries: createSelector(
      (state) => state.quest,
      (questState) => questState.activeIds.map((id) => {
        const quest = questState.byId[id];
        if (!quest) return null;
        const objectives = Object.values(quest.objectives || {});
        const pendingObjectives = objectives.filter((obj) => obj.status !== 'completed');
        return {
          id: quest.id,
          title: quest.title,
          type: quest.type,
          status: quest.status,
          pendingObjectives,
          completedObjectives: objectives.filter((obj) => obj.status === 'completed'),
        };
      }).filter(Boolean)
    ),
  },
};

export default questSlice;
