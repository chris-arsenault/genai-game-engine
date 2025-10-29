import { createSelector } from '../utils/memoize.js';

const initialFactionState = {
  byId: {},
  lastActionAt: null,
  lastResetAt: null,
  lastResetReason: null,
  lastResetInitiatedBy: null,
};

function cloneState(state) {
  return {
    byId: { ...state.byId },
    lastActionAt: state.lastActionAt,
    lastResetAt: state.lastResetAt ?? null,
    lastResetReason: state.lastResetReason ?? null,
    lastResetInitiatedBy: state.lastResetInitiatedBy ?? null,
  };
}

function ensureFactionRecord(state, factionId) {
  if (!state.byId[factionId]) {
    state.byId[factionId] = {
      id: factionId,
      fame: 0,
      infamy: 0,
      attitude: 'neutral',
      lastDelta: { fame: 0, infamy: 0 },
      lastReason: null,
      updatedAt: null,
    };
  }
  return state.byId[factionId];
}

export const factionSlice = {
  key: 'faction',

  getInitialState() {
    return cloneState(initialFactionState);
  },

  reducer(state = initialFactionState, action) {
    if (!action) {
      return state;
    }

    if (action.domain !== 'faction' && action.type !== 'WORLDSTATE_HYDRATE') {
      return state;
    }

    const next = cloneState(state);
    const payload = action.payload || {};
    let hasChange = false;

    switch (action.type) {
      case 'FACTION_REPUTATION_CHANGED': {
        if (!payload.factionId) break;
        const record = ensureFactionRecord(next, payload.factionId);
        record.fame = payload.newFame ?? record.fame;
        record.infamy = payload.newInfamy ?? record.infamy;
        record.lastDelta = {
          fame: payload.deltaFame ?? 0,
          infamy: payload.deltaInfamy ?? 0,
        };
        record.lastReason = payload.reason ?? null;
        record.updatedAt = action.timestamp ?? Date.now();
        hasChange = true;
        break;
      }

      case 'FACTION_ATTITUDE_CHANGED': {
        if (!payload.factionId) break;
        const record = ensureFactionRecord(next, payload.factionId);
        record.attitude = payload.newAttitude ?? record.attitude;
        record.updatedAt = action.timestamp ?? Date.now();
        hasChange = true;
        break;
      }

      case 'WORLDSTATE_HYDRATE': {
        if (!payload?.factions) break;
        return cloneState({
          byId: payload.factions.byId ?? {},
          lastActionAt: payload.factions.lastActionAt ?? null,
          lastResetAt: payload.factions.lastResetAt ?? null,
          lastResetReason: payload.factions.lastResetReason ?? null,
          lastResetInitiatedBy: payload.factions.lastResetInitiatedBy ?? null,
        });
      }

      case 'FACTION_REPUTATION_RESET': {
        const timestamp = action.timestamp ?? Date.now();
        return {
          byId: {},
          lastActionAt: timestamp,
          lastResetAt: timestamp,
          lastResetReason: payload.reason ?? null,
          lastResetInitiatedBy: payload.initiatedBy ?? null,
        };
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
      lastActionAt: state.lastActionAt ?? null,
      lastResetAt: state.lastResetAt ?? null,
      lastResetReason: state.lastResetReason ?? null,
      lastResetInitiatedBy: state.lastResetInitiatedBy ?? null,
    };
  },

  selectors: {
    selectSlice(state) {
      return state.faction;
    },
    selectFactionById: createSelector(
      (state) => state.faction.byId,
      (state, factionId) => factionId,
      (byId, factionId) => byId[factionId] || null
    ),
    selectFactionOverview: createSelector(
      (state) => state.faction.byId,
      (byId) => Object.values(byId)
    ),
    selectFactionAttitude: createSelector(
      (state) => state.faction.byId,
      (state, factionId) => factionId,
      (byId, factionId) => {
        const record = byId[factionId];
        return record ? record.attitude : 'neutral';
      }
    ),
    selectFactionLastReset: createSelector(
      (state) => state.faction,
      (factionState) => ({
        at: factionState.lastResetAt ?? null,
        reason: factionState.lastResetReason ?? null,
        initiatedBy: factionState.lastResetInitiatedBy ?? null,
      })
    ),
  },
};

export default factionSlice;
