const emptyState = Object.freeze({
  items: [],
  equipped: {},
  lastUpdatedAt: null,
  selectedItemId: null,
  selectedIndex: null,
  lastSelectionAt: null,
  selectionSource: null,
});

function cloneState(state = emptyState) {
  return {
    items: Array.isArray(state.items) ? state.items.map(item => ({ ...item })) : [],
    equipped: state.equipped ? { ...state.equipped } : {},
    lastUpdatedAt: state.lastUpdatedAt ?? null,
    selectedItemId: state.selectedItemId ?? null,
    selectedIndex: Number.isInteger(state.selectedIndex) ? state.selectedIndex : null,
    lastSelectionAt: state.lastSelectionAt ?? null,
    selectionSource: state.selectionSource ?? null,
  };
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .map((tag) => typeof tag === 'string' ? tag.trim() : null)
    .filter(Boolean);
}

function mergeTags(existingTags = [], newTags = []) {
  const combined = [];

  if (Array.isArray(existingTags)) {
    combined.push(...existingTags);
  }
  if (Array.isArray(newTags)) {
    combined.push(...newTags);
  }

  const unique = [];
  const seen = new Set();
  for (const tag of sanitizeTags(combined)) {
    if (!seen.has(tag)) {
      seen.add(tag);
      unique.push(tag);
    }
  }
  return unique;
}

function normalizeItem(payload = {}) {
  const id = typeof payload.id === 'string' ? payload.id : null;
  if (!id) {
    throw new Error('inventory item requires an id');
  }

  return {
    id,
    name: typeof payload.name === 'string' ? payload.name : id,
    description: typeof payload.description === 'string' ? payload.description : '',
    type: typeof payload.type === 'string' ? payload.type : 'generic',
    rarity: typeof payload.rarity === 'string' ? payload.rarity : 'common',
    quantity: Number.isFinite(payload.quantity) ? Math.max(1, Math.floor(payload.quantity)) : 1,
    tags: sanitizeTags(payload.tags),
    metadata: payload.metadata ? { ...payload.metadata } : {},
    lastSeenAt: payload.lastSeenAt ?? Date.now(),
  };
}

function insertOrUpdateItem(state, item = {}, timestamp) {
  if (!item || typeof item.id !== 'string') {
    return;
  }

  const quantityDelta = Number.isFinite(item.quantityDelta)
    ? Math.trunc(item.quantityDelta)
    : null;
  const metadata = item.metadata ? { ...item.metadata } : {};
  const lastSeenAt = timestamp ?? item.lastSeenAt ?? Date.now();

  const existingIndex = state.items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    const existing = state.items[existingIndex];
    let nextQuantity;

    if (quantityDelta !== null && quantityDelta !== 0) {
      const currentQuantity = Number.isFinite(existing.quantity) ? existing.quantity : 0;
      nextQuantity = currentQuantity + quantityDelta;
    } else if (Number.isFinite(item.quantity)) {
      nextQuantity = Math.trunc(item.quantity);
    } else {
      nextQuantity = Number.isFinite(existing.quantity) ? existing.quantity : 1;
    }

    if (!Number.isFinite(nextQuantity)) {
      nextQuantity = Number.isFinite(existing.quantity) ? existing.quantity : 1;
    }

    if (nextQuantity <= 0) {
      state.items.splice(existingIndex, 1);
      return;
    }

    const mergedTags = mergeTags(existing.tags, item.tags);

    state.items[existingIndex] = {
      ...existing,
      ...item,
      quantity: Math.max(1, nextQuantity),
      tags: mergedTags,
      metadata: {
        ...(existing.metadata || {}),
        ...metadata,
      },
      lastSeenAt,
    };

    delete state.items[existingIndex].quantityDelta;
  } else {
    let quantity = Number.isFinite(item.quantity) ? Math.trunc(item.quantity) : 1;

    if (quantityDelta !== null) {
      if (quantityDelta <= 0) {
        return;
      }
      quantity = quantityDelta;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const newItem = {
      ...item,
      quantity: Math.max(1, quantity),
      tags: sanitizeTags(item.tags),
      metadata,
      lastSeenAt,
    };

    delete newItem.quantityDelta;
    state.items.push(newItem);
  }
}

function removeItem(state, itemId) {
  state.items = state.items.filter((item) => item.id !== itemId);
  for (const [slot, equippedId] of Object.entries(state.equipped)) {
    if (equippedId === itemId) {
      delete state.equipped[slot];
    }
  }
}

function normalizeSnapshot(snapshot = {}) {
  const next = cloneState(emptyState);

  if (Array.isArray(snapshot.items)) {
    for (const entry of snapshot.items) {
      try {
        insertOrUpdateItem(next, normalizeItem(entry), entry?.lastSeenAt ?? snapshot?.lastUpdatedAt);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[inventorySlice] Skipping invalid snapshot item', error);
      }
    }
  }

  if (snapshot.equipped && typeof snapshot.equipped === 'object') {
    for (const [slot, itemId] of Object.entries(snapshot.equipped)) {
      if (typeof itemId === 'string') {
        next.equipped[slot] = itemId;
      }
    }
  }

  next.lastUpdatedAt = snapshot.lastUpdatedAt ?? Date.now();
  next.selectedItemId = typeof snapshot.selectedItemId === 'string' ? snapshot.selectedItemId : null;
  next.selectedIndex = Number.isInteger(snapshot.selectedIndex) ? snapshot.selectedIndex : null;
  next.lastSelectionAt = snapshot.lastSelectionAt ?? null;
  next.selectionSource = snapshot.selectionSource ?? null;
  return next;
}

export const inventorySlice = {
  getInitialState() {
    return cloneState(emptyState);
  },

  reducer(state = emptyState, action = {}) {
    const timestamp = action.timestamp ?? Date.now();
    switch (action.type) {
      case 'WORLDSTATE_HYDRATE': {
        if (action.payload?.inventory) {
          return normalizeSnapshot(action.payload.inventory);
        }
        return state;
      }

      case 'INVENTORY_ITEM_ADDED': {
        if (!action.payload) return state;
        let draft;
        try {
          draft = cloneState(state);
          const item = normalizeItem(action.payload);
          insertOrUpdateItem(draft, item, timestamp);
          draft.lastUpdatedAt = timestamp;
        } catch (error) {
          console.error('[inventorySlice] Failed to add inventory item', error);
          return state;
        }
        return draft;
      }

      case 'INVENTORY_ITEM_UPDATED': {
        if (!action.payload || !action.payload.id) return state;
        const draft = cloneState(state);
        insertOrUpdateItem(draft, {
          ...action.payload,
        }, timestamp);
        draft.lastUpdatedAt = timestamp;
        return draft;
      }

      case 'INVENTORY_ITEM_REMOVED': {
        if (!action.payload || !action.payload.id) return state;
        const draft = cloneState(state);
        removeItem(draft, action.payload.id);
        draft.lastUpdatedAt = timestamp;
        return draft;
      }

      case 'INVENTORY_CLEAR': {
        return cloneState({
          items: [],
          equipped: {},
          lastUpdatedAt: timestamp,
        });
      }

      case 'INVENTORY_EQUIPPED': {
        if (!action.payload || !action.payload.slot || !action.payload.itemId) {
          return state;
        }
        const draft = cloneState(state);
        draft.equipped[action.payload.slot] = action.payload.itemId;
        draft.lastUpdatedAt = timestamp;
        return draft;
      }

      case 'INVENTORY_SELECTION_CHANGED': {
        const selection = action.payload || {};
        const nextSelectedId = typeof selection.itemId === 'string' ? selection.itemId : null;
        const nextSelectedIndex = Number.isInteger(selection.index) ? selection.index : null;
        if (
          state.selectedItemId === nextSelectedId &&
          state.selectedIndex === nextSelectedIndex &&
          state.selectionSource === (selection.source ?? null)
        ) {
          return state;
        }
        const draft = cloneState(state);
        draft.selectedItemId = nextSelectedId;
        draft.selectedIndex = nextSelectedIndex;
        draft.lastSelectionAt = timestamp;
        draft.selectionSource = selection.source ?? null;
        return draft;
      }

      default:
        return state;
    }
  },

  serialize(state = emptyState) {
    return {
      items: Array.isArray(state.items) ? state.items.map((item) => ({ ...item })) : [],
      equipped: state.equipped ? { ...state.equipped } : {},
      lastUpdatedAt: state.lastUpdatedAt ?? null,
      selectedItemId: state.selectedItemId ?? null,
      selectedIndex: Number.isInteger(state.selectedIndex) ? state.selectedIndex : null,
      lastSelectionAt: state.lastSelectionAt ?? null,
      selectionSource: state.selectionSource ?? null,
    };
  },

  selectors: {
    _resolve(state) {
      if (state && typeof state === 'object') {
        if (Array.isArray(state.items) || state.selectedItemId !== undefined || state.equipped !== undefined) {
          return state;
        }
        if (state.inventory) {
          return state.inventory;
        }
      }
      return emptyState;
    },
    getItems(state) {
      const slice = inventorySlice.selectors._resolve(state);
      return Array.isArray(slice.items) ? slice.items : [];
    },
    getEquipped(state) {
      const slice = inventorySlice.selectors._resolve(state);
      return slice.equipped ? { ...slice.equipped } : {};
    },
    getSelectedItemId(state) {
      const slice = inventorySlice.selectors._resolve(state);
      return typeof slice.selectedItemId === 'string' ? slice.selectedItemId : null;
    },
    getSelectionInfo(state) {
      const slice = inventorySlice.selectors._resolve(state);
      return {
        itemId: typeof slice.selectedItemId === 'string' ? slice.selectedItemId : null,
        index: Number.isInteger(slice.selectedIndex) ? slice.selectedIndex : null,
        lastSelectionAt: slice.lastSelectionAt ?? null,
        source: slice.selectionSource ?? null,
      };
    },
  },
};

export default inventorySlice;
