import { createSelector } from '../utils/memoize.js';

const HISTORY_LIMIT = 10;
const CHANGE_LOG_LIMIT = 50;

function createNpcRecord(npcId) {
  return {
    id: npcId,
    name: null,
    factionId: null,
    status: 'unknown',
    knowsPlayer: false,
    interactions: {
      interviews: 0,
      recognitions: 0,
      witnessedCrimes: 0,
    },
    suspicion: {
      active: false,
      reason: null,
      updatedAt: null,
    },
    alert: {
      active: false,
      reason: null,
      updatedAt: null,
    },
    lastInteractionAt: null,
    lastDialogueId: null,
    lastCrimeWitnessed: null,
    history: [],
    tags: [],
  };
}

function cloneRecord(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    interactions: {
      interviews: record.interactions?.interviews ?? 0,
      recognitions: record.interactions?.recognitions ?? 0,
      witnessedCrimes: record.interactions?.witnessedCrimes ?? 0,
    },
    suspicion: {
      active: Boolean(record.suspicion?.active),
      reason: record.suspicion?.reason ?? null,
      updatedAt: record.suspicion?.updatedAt ?? null,
    },
    alert: {
      active: Boolean(record.alert?.active),
      reason: record.alert?.reason ?? null,
      updatedAt: record.alert?.updatedAt ?? null,
    },
    lastCrimeWitnessed: record.lastCrimeWitnessed
      ? { ...record.lastCrimeWitnessed }
      : null,
    history: Array.isArray(record.history)
      ? record.history.map((entry) => ({ ...entry }))
      : [],
    tags: Array.isArray(record.tags) ? [...record.tags] : [],
  };
}

function cloneState(state) {
  const next = {
    byId: {},
    changeLog: Array.isArray(state?.changeLog)
      ? state.changeLog.map((entry) => ({ ...entry }))
      : [],
    lastUpdatedAt: state?.lastUpdatedAt ?? null,
  };

  for (const [npcId, record] of Object.entries(state?.byId || {})) {
    next.byId[npcId] = cloneRecord(record);
  }

  return next;
}

function ensureNpc(state, npcId, payload = {}) {
  if (!npcId) {
    return null;
  }

  if (!state.byId[npcId]) {
    state.byId[npcId] = createNpcRecord(npcId);
  }

  const record = state.byId[npcId];
  if (payload.npcName && payload.npcName !== record.name) {
    record.name = payload.npcName;
  }
  if (payload.npcFaction && payload.npcFaction !== record.factionId) {
    record.factionId = payload.npcFaction;
  }

  return record;
}

function appendHistory(record, entry) {
  if (!record) {
    return;
  }
  const history = Array.isArray(record.history) ? [...record.history] : [];
  history.push(entry);
  if (history.length > HISTORY_LIMIT) {
    history.splice(0, history.length - HISTORY_LIMIT);
  }
  record.history = history;
}

function appendChangeLog(state, entry) {
  const log = Array.isArray(state.changeLog) ? [...state.changeLog] : [];
  log.push(entry);
  if (log.length > CHANGE_LOG_LIMIT) {
    log.splice(0, log.length - CHANGE_LOG_LIMIT);
  }
  state.changeLog = log;
}

function mergeSnapshot(snapshot) {
  const next = {
    byId: {},
    changeLog: Array.isArray(snapshot?.changeLog)
      ? snapshot.changeLog.map((entry) => ({ ...entry }))
      : [],
    lastUpdatedAt: snapshot?.lastUpdatedAt ?? null,
  };

  if (snapshot && typeof snapshot.byId === 'object') {
    for (const [npcId, record] of Object.entries(snapshot.byId)) {
      next.byId[npcId] = cloneRecord(record);
    }
  }

  if (next.changeLog.length > CHANGE_LOG_LIMIT) {
    next.changeLog.splice(0, next.changeLog.length - CHANGE_LOG_LIMIT);
  }

  return next;
}

export const npcSlice = {
  key: 'npc',

  getInitialState() {
    return {
      byId: {},
      changeLog: [],
      lastUpdatedAt: null,
    };
  },

  reducer(state = npcSlice.getInitialState(), action) {
    if (!action) {
      return state;
    }

    if (action.type === 'WORLDSTATE_HYDRATE') {
      const snapshot = action.payload?.npc ?? action.payload?.npcs ?? null;
      if (!snapshot || typeof snapshot !== 'object') {
        return state;
      }
      return mergeSnapshot(snapshot);
    }

    if (action.domain !== 'npc') {
      return state;
    }

    const next = cloneState(state);
    const payload = action.payload ?? {};
    const timestamp = action.timestamp ?? Date.now();
    let changed = false;

    switch (action.type) {
      case 'NPC_REGISTERED': {
        const npcId = payload.npcId ?? payload.id ?? null;
        if (!npcId) {
          break;
        }
        ensureNpc(next, npcId, payload);
        appendChangeLog(next, {
          type: 'registered',
          npcId,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'NPC_INTERVIEWED': {
        const npcId = payload.npcId ?? null;
        if (!npcId) {
          break;
        }
        const record = ensureNpc(next, npcId, payload);
        if (!record) {
          break;
        }
        if (record.status !== 'alerted') {
          record.status = 'cooperative';
        }
        record.knowsPlayer = true;
        record.interactions.interviews += 1;
        record.lastInteractionAt = timestamp;
        record.lastDialogueId = payload.dialogueId ?? null;
        appendHistory(record, {
          type: 'interview',
          dialogueId: payload.dialogueId ?? null,
          timestamp,
        });
        appendChangeLog(next, {
          type: 'interview',
          npcId,
          dialogueId: payload.dialogueId ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'NPC_RECOGNIZED_PLAYER': {
        const npcId = payload.npcId ?? null;
        if (!npcId) {
          break;
        }
        const record = ensureNpc(next, npcId, payload);
        if (!record) {
          break;
        }
        record.knowsPlayer = payload.playerKnown ?? true;
        record.status = record.status === 'alerted' ? 'alerted' : 'aware';
        record.interactions.recognitions += 1;
        record.lastInteractionAt = timestamp;
        appendHistory(record, {
          type: 'recognized_player',
          timestamp,
        });
        appendChangeLog(next, {
          type: 'recognized_player',
          npcId,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'NPC_WITNESSED_CRIME': {
        const npcId = payload.npcId ?? null;
        if (!npcId) {
          break;
        }
        const record = ensureNpc(next, npcId, payload);
        if (!record) {
          break;
        }
        record.interactions.witnessedCrimes += 1;
        record.lastCrimeWitnessed = {
          crimeType: payload.crimeType ?? 'unknown',
          severity: payload.severity ?? null,
          timestamp,
        };
        if (record.status !== 'alerted') {
          record.status = 'witness';
        }
        appendHistory(record, {
          type: 'witnessed_crime',
          crimeType: payload.crimeType ?? 'unknown',
          severity: payload.severity ?? null,
          timestamp,
        });
        appendChangeLog(next, {
          type: 'witnessed_crime',
          npcId,
          crimeType: payload.crimeType ?? 'unknown',
          severity: payload.severity ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'NPC_BECAME_SUSPICIOUS': {
        const npcId = payload.npcId ?? null;
        if (!npcId) {
          break;
        }
        const record = ensureNpc(next, npcId, payload);
        if (!record) {
          break;
        }
        if (record.status !== 'alerted') {
          record.status = 'suspicious';
        }
        record.suspicion = {
          active: true,
          reason: payload.reason ?? 'unknown',
          updatedAt: timestamp,
        };
        appendHistory(record, {
          type: 'became_suspicious',
          reason: payload.reason ?? null,
          timestamp,
        });
        appendChangeLog(next, {
          type: 'became_suspicious',
          npcId,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'NPC_ALERTED': {
        const npcId = payload.npcId ?? null;
        if (!npcId) {
          break;
        }
        const record = ensureNpc(next, npcId, payload);
        if (!record) {
          break;
        }
        record.status = 'alerted';
        record.alert = {
          active: true,
          reason: payload.reason ?? null,
          updatedAt: timestamp,
        };
        record.suspicion = {
          active: true,
          reason: record.suspicion?.reason ?? payload.reason ?? null,
          updatedAt: timestamp,
        };
        appendHistory(record, {
          type: 'alerted',
          reason: payload.reason ?? null,
          timestamp,
        });
        appendChangeLog(next, {
          type: 'alerted',
          npcId,
          reason: payload.reason ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      default:
        break;
    }

    return changed ? next : state;
  },

  serialize(state) {
    const serialized = {
      byId: {},
      changeLog: Array.isArray(state?.changeLog)
        ? state.changeLog.map((entry) => ({ ...entry }))
        : [],
      lastUpdatedAt: state?.lastUpdatedAt ?? null,
    };

    for (const [npcId, record] of Object.entries(state?.byId || {})) {
      serialized.byId[npcId] = cloneRecord(record);
    }

    return serialized;
  },

  selectors: {
    selectRoot: (state) => state?.npc ?? npcSlice.getInitialState(),

    selectNpcById: createSelector(
      (state) => state?.npc ?? npcSlice.getInitialState(),
      (_, npcId) => npcId,
      (npcState, npcId) => npcState.byId[npcId] ?? null
    ),

    selectAllNpcs: createSelector(
      (state) => state?.npc ?? npcSlice.getInitialState(),
      (npcState) => Object.values(npcState.byId || {})
    ),

    selectNpcSummaries: createSelector(
      (state) => state?.npc ?? npcSlice.getInitialState(),
      (npcState) =>
        Object.values(npcState.byId || {}).map((record) => ({
          id: record.id,
          name: record.name ?? record.id,
          status: record.status,
          factionId: record.factionId ?? null,
          knowsPlayer: Boolean(record.knowsPlayer),
          lastInteractionAt: record.lastInteractionAt ?? null,
          lastDialogueId: record.lastDialogueId ?? null,
          suspicion: {
            active: Boolean(record.suspicion?.active),
            reason: record.suspicion?.reason ?? null,
            updatedAt: record.suspicion?.updatedAt ?? null,
          },
          alert: {
            active: Boolean(record.alert?.active),
            reason: record.alert?.reason ?? null,
            updatedAt: record.alert?.updatedAt ?? null,
          },
          lastCrimeWitnessed: record.lastCrimeWitnessed ?? null,
          interviews: record.interactions?.interviews ?? 0,
          recognitions: record.interactions?.recognitions ?? 0,
          witnessedCrimes: record.interactions?.witnessedCrimes ?? 0,
        }))
    ),
  },
};

export default npcSlice;
