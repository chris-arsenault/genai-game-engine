import { createSelector } from '../utils/memoize.js';

const MAX_ATTITUDE_HISTORY = 10;

const initialFactionState = {
  byId: {},
  lastActionAt: null,
  lastResetAt: null,
  lastResetReason: null,
  lastResetInitiatedBy: null,
  lastCascadeEvent: null,
};

function createDefaultLastDelta() {
  return { fame: 0, infamy: 0 };
}

function createFactionRecord(factionId) {
  return {
    id: factionId,
    fame: 0,
    infamy: 0,
    attitude: 'neutral',
    lastDelta: createDefaultLastDelta(),
    lastReason: null,
    updatedAt: null,
    lastAttitudeChange: null,
    attitudeHistory: [],
    lastCascade: null,
    cascadeCount: 0,
    cascadeSources: [],
  };
}

function cloneAttitudeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }
  return history.map((entry) => ({ ...entry }));
}

function cloneFactionRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    fame: record.fame ?? 0,
    infamy: record.infamy ?? 0,
    attitude: record.attitude ?? 'neutral',
    lastDelta: {
      fame: record.lastDelta?.fame ?? 0,
      infamy: record.lastDelta?.infamy ?? 0,
    },
    lastReason: record.lastReason ?? null,
    updatedAt: record.updatedAt ?? null,
    lastAttitudeChange: record.lastAttitudeChange ? { ...record.lastAttitudeChange } : null,
    attitudeHistory: cloneAttitudeHistory(record.attitudeHistory),
    lastCascade: record.lastCascade ? { ...record.lastCascade } : null,
    cascadeCount: record.cascadeCount ?? 0,
    cascadeSources: Array.isArray(record.cascadeSources) ? [...record.cascadeSources] : [],
  };
}

function cloneState(state) {
  const clonedById = {};
  for (const [factionId, record] of Object.entries(state.byId)) {
    clonedById[factionId] = cloneFactionRecord(record);
  }

  return {
    byId: clonedById,
    lastActionAt: state.lastActionAt,
    lastResetAt: state.lastResetAt ?? null,
    lastResetReason: state.lastResetReason ?? null,
    lastResetInitiatedBy: state.lastResetInitiatedBy ?? null,
    lastCascadeEvent: state.lastCascadeEvent ? { ...state.lastCascadeEvent } : null,
  };
}

function ensureFactionRecord(state, factionId) {
  const existing = state.byId[factionId];
  if (existing) {
    const cloned = cloneFactionRecord(existing);
    state.byId[factionId] = cloned;
    return cloned;
  }

  const record = createFactionRecord(factionId);
  state.byId[factionId] = record;
  return record;
}

function recordAttitudeChange(record, payload, timestamp) {
  const change = {
    factionId: record.id,
    factionName: payload.factionName ?? null,
    newAttitude: payload.newAttitude ?? record.attitude,
    oldAttitude: payload.oldAttitude ?? null,
    cascade: Boolean(payload.cascade),
    sourceFactionId: payload.source ?? null,
    sourceFactionName: payload.sourceFactionName ?? null,
    occurredAt: timestamp,
  };

  record.lastAttitudeChange = { ...change };

  const history = Array.isArray(record.attitudeHistory) ? [...record.attitudeHistory, change] : [change];
  if (history.length > MAX_ATTITUDE_HISTORY) {
    history.splice(0, history.length - MAX_ATTITUDE_HISTORY);
  }
  record.attitudeHistory = history.map((entry) => ({ ...entry }));

  if (change.cascade) {
    record.lastCascade = {
      sourceFactionId: change.sourceFactionId,
      sourceFactionName: change.sourceFactionName ?? null,
      occurredAt: change.occurredAt,
      newAttitude: change.newAttitude,
    };
    record.cascadeCount = (record.cascadeCount ?? 0) + 1;
    const sources = new Set(Array.isArray(record.cascadeSources) ? record.cascadeSources : []);
    if (change.sourceFactionId) {
      sources.add(change.sourceFactionId);
    }
    record.cascadeSources = [...sources];
  }

  return change;
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
        const timestamp = action.timestamp ?? Date.now();
        record.updatedAt = timestamp;
        const change = recordAttitudeChange(record, payload, timestamp);
        if (change.cascade) {
          next.lastCascadeEvent = {
            targetFactionId: change.factionId,
            targetFactionName: change.factionName,
            sourceFactionId: change.sourceFactionId,
            sourceFactionName: change.sourceFactionName ?? null,
            newAttitude: change.newAttitude,
            oldAttitude: change.oldAttitude,
            occurredAt: change.occurredAt,
          };
        }
        hasChange = true;
        break;
      }

      case 'WORLDSTATE_HYDRATE': {
        if (!payload?.factions) break;
        const snapshotById = payload.factions.byId ?? {};
        const normalizedById = {};
        for (const [factionId, record] of Object.entries(snapshotById)) {
          normalizedById[factionId] = cloneFactionRecord(record ?? createFactionRecord(factionId));
        }
        return {
          byId: normalizedById,
          lastActionAt: payload.factions.lastActionAt ?? null,
          lastResetAt: payload.factions.lastResetAt ?? null,
          lastResetReason: payload.factions.lastResetReason ?? null,
          lastResetInitiatedBy: payload.factions.lastResetInitiatedBy ?? null,
          lastCascadeEvent: payload.factions.lastCascadeEvent ? { ...payload.factions.lastCascadeEvent } : null,
        };
      }

      case 'FACTION_REPUTATION_RESET': {
        const timestamp = action.timestamp ?? Date.now();
        return {
          byId: {},
          lastActionAt: timestamp,
          lastResetAt: timestamp,
          lastResetReason: payload.reason ?? null,
          lastResetInitiatedBy: payload.initiatedBy ?? null,
          lastCascadeEvent: null,
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
    const serializedById = {};
    for (const [factionId, record] of Object.entries(state.byId)) {
      serializedById[factionId] = {
        id: record.id,
        fame: record.fame,
        infamy: record.infamy,
        attitude: record.attitude,
        lastDelta: {
          fame: record.lastDelta?.fame ?? 0,
          infamy: record.lastDelta?.infamy ?? 0,
        },
        lastReason: record.lastReason ?? null,
        updatedAt: record.updatedAt ?? null,
        lastAttitudeChange: record.lastAttitudeChange ? { ...record.lastAttitudeChange } : null,
        attitudeHistory: cloneAttitudeHistory(record.attitudeHistory),
        lastCascade: record.lastCascade ? { ...record.lastCascade } : null,
        cascadeCount: record.cascadeCount ?? 0,
        cascadeSources: Array.isArray(record.cascadeSources) ? [...record.cascadeSources] : [],
      };
    }

    return {
      byId: serializedById,
      lastActionAt: state.lastActionAt ?? null,
      lastResetAt: state.lastResetAt ?? null,
      lastResetReason: state.lastResetReason ?? null,
      lastResetInitiatedBy: state.lastResetInitiatedBy ?? null,
      lastCascadeEvent: state.lastCascadeEvent ? { ...state.lastCascadeEvent } : null,
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
    selectFactionLastAttitudeChange: createSelector(
      (state) => state.faction.byId,
      (state, factionId) => factionId,
      (byId, factionId) => {
        const record = byId[factionId];
        return record?.lastAttitudeChange ? { ...record.lastAttitudeChange } : null;
      }
    ),
    selectFactionAttitudeHistory: createSelector(
      (state) => state.faction.byId,
      (state, factionId) => factionId,
      (byId, factionId) => {
        const record = byId[factionId];
        return record?.attitudeHistory ? cloneAttitudeHistory(record.attitudeHistory) : [];
      }
    ),
    selectFactionCascadeSummary: createSelector(
      (state) => state.faction.byId,
      (state) => state.faction.lastCascadeEvent,
      (byId, lastCascadeEvent) => {
        const cascadeTargets = [];
        for (const record of Object.values(byId)) {
          if (record?.cascadeCount) {
            cascadeTargets.push({
              factionId: record.id,
              cascadeCount: record.cascadeCount,
              lastCascade: record.lastCascade ? { ...record.lastCascade } : null,
              sources: Array.isArray(record.cascadeSources) ? [...record.cascadeSources] : [],
            });
          }
        }

        return {
          lastCascadeEvent: lastCascadeEvent ? { ...lastCascadeEvent } : null,
          cascadeTargets,
        };
      }
    ),
  },
};

export default factionSlice;
