import { createSelector } from '../utils/memoize.js';

const DEFAULT_HISTORY_LIMIT = 10;

const sliceRuntimeConfig = {
  historyLimit: DEFAULT_HISTORY_LIMIT,
  transcriptEnabled: true,
};

function cloneActive(active) {
  if (!active) {
    return null;
  }

  return {
    npcId: active.npcId,
    dialogueId: active.dialogueId,
    nodeId: active.nodeId,
    speaker: active.speaker,
    text: active.text,
    canAdvance: Boolean(active.canAdvance),
    hasChoices: Boolean(active.hasChoices),
    startedAt: active.startedAt ?? null,
    updatedAt: active.updatedAt ?? null,
    choices: Array.isArray(active.choices)
      ? active.choices.map((choice) => ({
          id: choice.id ?? null,
          text: choice.text ?? '',
          nextNode: choice.nextNode ?? null,
          lockedReason: choice.lockedReason ?? null,
        }))
      : [],
  };
}

function cloneHistory(historyByNpc = {}) {
  const nextHistory = {};
  for (const [npcId, entries] of Object.entries(historyByNpc)) {
    nextHistory[npcId] = entries.map((entry) => ({
      type: entry.type,
      dialogueId: entry.dialogueId,
      nodeId: entry.nodeId ?? null,
      choiceId: entry.choiceId ?? null,
      choiceText: entry.choiceText ?? null,
      speaker: entry.speaker ?? null,
      text: entry.text ?? null,
      timestamp: entry.timestamp ?? null,
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }
  return nextHistory;
}

function cloneCompleted(completedByNpc = {}) {
  const nextCompleted = {};
  for (const [npcId, record] of Object.entries(completedByNpc)) {
    nextCompleted[npcId] = {
      lastDialogueId: record.lastDialogueId ?? null,
      lastNodeId: record.lastNodeId ?? null,
      lastChoiceId: record.lastChoiceId ?? null,
      completedAt: record.completedAt ?? null,
    };
  }
  return nextCompleted;
}

function createInitialState() {
  return {
    active: null,
    historyByNpc: {},
    completedByNpc: {},
    lastActionAt: null,
    historyLimit: sliceRuntimeConfig.historyLimit,
    transcriptEnabled: sliceRuntimeConfig.transcriptEnabled,
  };
}

function appendHistoryEntry(state, npcId, entry) {
  if (!npcId) {
    return [];
  }

  if (!state.transcriptEnabled) {
    return state.historyByNpc[npcId] || [];
  }

  const existing = state.historyByNpc[npcId] ? [...state.historyByNpc[npcId]] : [];
  existing.push(entry);

  const overflow = existing.length - state.historyLimit;
  if (overflow > 0) {
    existing.splice(0, overflow);
  }

  state.historyByNpc = { ...state.historyByNpc, [npcId]: existing };
  return existing;
}

function normalizeActivePayload(payload = {}, timestamp) {
  const historyTimestamp = payload.timestamp ?? timestamp ?? Date.now();
  const startedAt = payload.startedAt ?? historyTimestamp;

  return {
    npcId: payload.npcId ?? null,
    dialogueId: payload.dialogueId ?? null,
    nodeId: payload.nodeId ?? null,
    speaker: payload.speaker ?? null,
    text: payload.text ?? '',
    choices: Array.isArray(payload.choices)
      ? payload.choices.map((choice, index) => ({
          id: choice.id ?? `choice_${index}`,
          text: choice.text ?? '',
          nextNode: choice.nextNode ?? null,
          lockedReason: choice.lockedReason ?? null,
        }))
      : [],
    canAdvance: Boolean(payload.canAdvance),
    hasChoices: Boolean(payload.hasChoices || (Array.isArray(payload.choices) && payload.choices.length > 0)),
    startedAt,
    updatedAt: historyTimestamp,
  };
}

function buildHistoryEntryFromNode(payload = {}, timestamp) {
  return {
    type: 'node',
    dialogueId: payload.dialogueId ?? null,
    nodeId: payload.nodeId ?? null,
    speaker: payload.speaker ?? null,
    text: payload.text ?? '',
    timestamp: timestamp ?? Date.now(),
  };
}

function buildHistoryEntryFromChoice(payload = {}, timestamp) {
  return {
    type: 'choice',
    dialogueId: payload.dialogueId ?? null,
    nodeId: payload.nodeId ?? null,
    choiceId: payload.choiceId ?? null,
    choiceText: payload.choiceText ?? payload.choice?.text ?? null,
    timestamp: timestamp ?? Date.now(),
  };
}

function hydrateFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return createInitialState();
  }

  const hydrated = createInitialState();
  hydrated.transcriptEnabled =
    typeof snapshot.transcriptEnabled === 'boolean' ? snapshot.transcriptEnabled : hydrated.transcriptEnabled;
  hydrated.historyLimit = typeof snapshot.historyLimit === 'number' ? snapshot.historyLimit : hydrated.historyLimit;

  if (snapshot.active) {
    hydrated.active = cloneActive(snapshot.active);
  }

  if (snapshot.historyByNpc && typeof snapshot.historyByNpc === 'object') {
    hydrated.historyByNpc = cloneHistory(snapshot.historyByNpc);
  }

  if (snapshot.completedByNpc && typeof snapshot.completedByNpc === 'object') {
    hydrated.completedByNpc = cloneCompleted(snapshot.completedByNpc);
  }

  hydrated.lastActionAt = snapshot.lastActionAt ?? hydrated.lastActionAt;
  return hydrated;
}

export const dialogueSlice = {
  key: 'dialogue',

  configure({ historyLimit, transcriptEnabled } = {}) {
    if (typeof historyLimit === 'number' && Number.isFinite(historyLimit) && historyLimit > 0) {
      sliceRuntimeConfig.historyLimit = Math.floor(historyLimit);
    }
    if (typeof transcriptEnabled === 'boolean') {
      sliceRuntimeConfig.transcriptEnabled = transcriptEnabled;
    }
  },

  getInitialState() {
    return createInitialState();
  },

  reducer(state = createInitialState(), action) {
    if (!action) {
      return state;
    }

    if (action.type !== 'WORLDSTATE_HYDRATE' && action.domain !== 'dialogue') {
      return state;
    }

    if (action.type === 'WORLDSTATE_HYDRATE') {
      return hydrateFromSnapshot(action.payload?.dialogue);
    }

    const timestamp = action.timestamp ?? Date.now();
    const next = {
      ...state,
      historyByNpc: cloneHistory(state.historyByNpc),
      completedByNpc: cloneCompleted(state.completedByNpc),
    };
    let hasChange = false;

    switch (action.type) {
      case 'DIALOGUE_STARTED': {
        const active = normalizeActivePayload(action.payload, timestamp);
        next.active = active;
        appendHistoryEntry(next, active.npcId, buildHistoryEntryFromNode(action.payload, timestamp));
        hasChange = true;
        break;
      }

      case 'DIALOGUE_NODE_CHANGED': {
        const active = normalizeActivePayload(
          {
            ...action.payload,
            startedAt: state.active?.startedAt ?? action.payload?.startedAt,
          },
          timestamp
        );
        next.active = active;
        appendHistoryEntry(next, active.npcId, buildHistoryEntryFromNode(action.payload, timestamp));
        hasChange = true;
        break;
      }

      case 'DIALOGUE_CHOICE_MADE': {
        const npcId = action.payload?.npcId ?? state.active?.npcId ?? null;
        if (npcId) {
          appendHistoryEntry(next, npcId, buildHistoryEntryFromChoice(action.payload, timestamp));
          hasChange = true;
        }
        break;
      }

      case 'DIALOGUE_ENDED': {
        if (state.active) {
          next.active = null;
          hasChange = true;
        }
        break;
      }

      case 'DIALOGUE_COMPLETED': {
        const npcId = action.payload?.npcId ?? state.active?.npcId ?? null;
        if (npcId) {
          next.completedByNpc = {
            ...next.completedByNpc,
            [npcId]: {
              lastDialogueId: action.payload?.dialogueId ?? state.active?.dialogueId ?? null,
              lastNodeId: action.payload?.nodeId ?? state.active?.nodeId ?? null,
              lastChoiceId: action.payload?.choiceId ?? null,
              completedAt: timestamp,
            },
          };
          hasChange = true;
        }
        next.active = null;
        break;
      }

      default:
        break;
    }

    if (hasChange) {
      next.lastActionAt = timestamp;
      return next;
    }

    return state;
  },

  serialize(state) {
    if (!state) {
      return createInitialState();
    }

    const historyByNpc = {};
    for (const [npcId, entries] of Object.entries(state.historyByNpc)) {
      const limit = state.historyLimit ?? sliceRuntimeConfig.historyLimit;
      const bounded = entries.slice(-limit).map((entry) => ({
        type: entry.type,
        dialogueId: entry.dialogueId ?? null,
        nodeId: entry.nodeId ?? null,
        choiceId: entry.choiceId ?? null,
        choiceText: entry.choiceText ?? null,
        speaker: entry.speaker ?? null,
        text: entry.text ?? null,
        timestamp: entry.timestamp ?? null,
      }));
      if (bounded.length) {
        historyByNpc[npcId] = bounded;
      }
    }

    return {
      active: state.active ? cloneActive(state.active) : null,
      historyByNpc,
      completedByNpc: cloneCompleted(state.completedByNpc),
      lastActionAt: state.lastActionAt ?? null,
      historyLimit: state.historyLimit ?? sliceRuntimeConfig.historyLimit,
      transcriptEnabled: state.transcriptEnabled ?? sliceRuntimeConfig.transcriptEnabled,
    };
  },

  selectors: {
    selectSlice(state) {
      return state.dialogue;
    },
    selectActiveDialogue: createSelector(
      (state) => state.dialogue?.active ?? null,
      (active) => active
    ),
    selectDialogueTranscript: createSelector(
      (state) => state.dialogue?.historyByNpc ?? {},
      (_state, npcId) => npcId,
      (historyByNpc, npcId) => (npcId && historyByNpc[npcId] ? historyByNpc[npcId] : [])
    ),
    selectLastChoiceForNPC: createSelector(
      (state) => state.dialogue?.completedByNpc ?? {},
      (_state, npcId) => npcId,
      (completedByNpc, npcId) => {
        if (!npcId || !completedByNpc[npcId]) {
          return null;
        }
        const record = completedByNpc[npcId];
        return {
          dialogueId: record.lastDialogueId ?? null,
          nodeId: record.lastNodeId ?? null,
          choiceId: record.lastChoiceId ?? null,
          completedAt: record.completedAt ?? null,
        };
      }
    ),
  },
};

export default dialogueSlice;
