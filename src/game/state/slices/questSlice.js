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

function normalizeObjectiveDefinition(objective) {
  if (!objective || !objective.id) {
    return null;
  }

  const targetCount = objective.trigger?.count ?? objective.target ?? 1;

  return {
    id: objective.id,
    title: objective.title ?? objective.description ?? objective.id,
    description: objective.description ?? objective.title ?? '',
    optional: Boolean(objective.optional),
    hidden: Boolean(objective.hidden),
    status: 'pending',
    progress: 0,
    target: targetCount,
    metadata: {
      trigger: objective.trigger ?? null,
      tags: objective.tags ?? [],
    },
  };
}

function mergeObjectiveRecord(existing, definition) {
  if (!definition) {
    return existing;
  }

  const merged = existing ? { ...existing } : {};

  merged.id = definition.id;
  merged.title = definition.title ?? existing?.title ?? definition.id;
  merged.description = definition.description ?? existing?.description ?? '';
  merged.optional = definition.optional ?? existing?.optional ?? false;
  merged.hidden = definition.hidden ?? existing?.hidden ?? false;
  merged.target = definition.target ?? existing?.target ?? 1;
  merged.metadata = {
    ...(existing?.metadata || {}),
    ...(definition.metadata || {}),
  };

  if (typeof merged.progress !== 'number') {
    merged.progress = 0;
  }

  if (!merged.status) {
    merged.status = 'pending';
  }

  return merged;
}

function applyQuestDefinition(record, payload) {
  if (!payload) {
    return record;
  }

  const next = { ...record };

  if (payload.title) {
    next.title = payload.title;
  }

  if (payload.type) {
    next.type = payload.type;
  }

  if (payload.description) {
    next.description = payload.description;
  }

  if (payload.act) {
    next.act = payload.act;
  }

  if (payload.rewards) {
    next.rewards = payload.rewards;
  }

  if (payload.branches) {
    next.branches = payload.branches;
  }

  if (typeof payload.autoStart === 'boolean') {
    next.autoStart = payload.autoStart;
  }

  if (payload.metadata) {
    next.metadata = {
      ...(next.metadata || {}),
      ...payload.metadata,
    };
  }

  if (Array.isArray(payload.objectives)) {
    if (!next.objectivesOrder) {
      next.objectivesOrder = [];
    }

    const updatedObjectives = { ...(next.objectives || {}) };
    const objectivesOrder = [...next.objectivesOrder];

    for (const objective of payload.objectives) {
      const definition = normalizeObjectiveDefinition(objective);
      if (!definition) continue;

      const merged = mergeObjectiveRecord(updatedObjectives[definition.id], definition);
      updatedObjectives[definition.id] = merged;

      if (!objectivesOrder.includes(definition.id)) {
        objectivesOrder.push(definition.id);
      }
    }

    next.objectives = updatedObjectives;
    next.objectivesOrder = objectivesOrder;
  }

  return next;
}

function ensureQuestRecord(state, payload) {
  const existing = state.byId[payload.questId];
  if (existing) {
    const updated = applyQuestDefinition(existing, payload);
    state.byId[payload.questId] = updated;
    return updated;
  }

  const record = applyQuestDefinition({
    id: payload.questId,
    title: payload.title ?? null,
    type: payload.type ?? null,
    status: payload.status ?? 'not_started',
    startedAt: null,
    completedAt: null,
    failedAt: null,
    objectives: {},
    metadata: payload.metadata ?? {},
    objectivesOrder: [],
    description: payload.description ?? null,
    rewards: payload.rewards ?? null,
    act: payload.act ?? payload.metadata?.act ?? null,
    autoStart: payload.autoStart ?? false,
    branches: payload.branches ?? null,
  }, payload);

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

        next.byId[payload.questId] = ensureQuestRecord(next, {
          ...payload,
          status: 'not_started',
        });
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
        const existingObjective = quest.objectives[payload.objectiveId];
        const baseObjective = mergeObjectiveRecord(existingObjective, {
          id: payload.objectiveId,
          target: payload.target ?? existingObjective?.target ?? 1,
        });

        const objective = { ...baseObjective };
        objective.status = objective.status === 'completed' ? 'completed' : 'in_progress';
        objective.progress = payload.progress ?? objective.progress ?? 0;
        objective.target = payload.target ?? objective.target;

        if (objective.progress >= objective.target) {
          objective.status = 'completed';
        }

        quest.objectives[payload.objectiveId] = objective;
        if (!quest.objectivesOrder) {
          quest.objectivesOrder = [];
        }
        if (!quest.objectivesOrder.includes(payload.objectiveId)) {
          quest.objectivesOrder.push(payload.objectiveId);
        }
        hasChange = true;
        break;
      }

      case 'OBJECTIVE_COMPLETED': {
        if (!payload.questId || !payload.objectiveId) break;
        const quest = ensureQuestRecord(next, payload);
        const existingObjective = quest.objectives[payload.objectiveId];
        const baseObjective = mergeObjectiveRecord(existingObjective, {
          id: payload.objectiveId,
          target: payload.target ?? existingObjective?.target ?? 1,
        });

        const objective = { ...baseObjective };
        objective.status = 'completed';
        objective.progress = payload.target ?? objective.progress ?? 1;
        quest.objectives[payload.objectiveId] = objective;
        if (!quest.objectivesOrder) {
          quest.objectivesOrder = [];
        }
        if (!quest.objectivesOrder.includes(payload.objectiveId)) {
          quest.objectivesOrder.push(payload.objectiveId);
        }
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
    selectFailedQuests: createSelector(
      (state) => state.quest,
      (questState) => questState.failedIds.map((id) => questState.byId[id]).filter(Boolean)
    ),
    selectQuestObjectives: createSelector(
      (state) => state.quest,
      (state, questId) => questId,
      (questState, questId) => {
        const quest = questState.byId[questId];
        if (!quest) return [];
        const order = Array.isArray(quest.objectivesOrder) && quest.objectivesOrder.length
          ? quest.objectivesOrder
          : Object.keys(quest.objectives || {});
        return order.map((objectiveId) => quest.objectives[objectiveId]).filter(Boolean);
      }
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
           description: quest.description ?? '',
          pendingObjectives,
          completedObjectives: objectives.filter((obj) => obj.status === 'completed'),
        };
      }).filter(Boolean)
    ),
  },
};

export default questSlice;
