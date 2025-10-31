function cloneBindings(source) {
  const clone = {};
  for (const [action, codes] of Object.entries(source || {})) {
    if (!Array.isArray(codes)) {
      continue;
    }
    clone[action] = codes.filter((code) => typeof code === 'string' && code.length > 0);
  }
  return clone;
}

function normalizeCodes(codes, fallback = []) {
  const set = new Set();
  const normalized = [];
  const allCodes = Array.isArray(codes) ? codes : [];
  for (const code of allCodes) {
    if (typeof code !== 'string' || code.length === 0) {
      continue;
    }
    if (set.has(code)) {
      continue;
    }
    set.add(code);
    normalized.push(code);
  }

  if (normalized.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
    for (const code of fallback) {
      if (typeof code !== 'string' || code.length === 0) {
        continue;
      }
      if (set.has(code)) {
        continue;
      }
      set.add(code);
      normalized.push(code);
    }
  }

  return normalized;
}

function buildKeyToActions(bindings) {
  const map = new Map();
  for (const [action, codes] of Object.entries(bindings)) {
    if (!Array.isArray(codes)) {
      continue;
    }
    for (const code of codes) {
      if (typeof code !== 'string' || code.length === 0) {
        continue;
      }
      const existing = map.get(code);
      if (existing) {
        existing.add(action);
      } else {
        map.set(code, new Set([action]));
      }
    }
  }
  return map;
}

let defaultBindings = {};
let currentBindings = {};
let keyToActionsMap = new Map();
const listeners = new Set();

function emitChange(change) {
  if (!listeners.size) {
    return;
  }

  const snapshot = getBindingsSnapshot();
  const keySnapshot = new Map();
  for (const [key, actions] of keyToActionsMap.entries()) {
    keySnapshot.set(key, new Set(actions));
  }

  for (const listener of listeners) {
    try {
      listener({
        change,
        bindings: snapshot,
        keyToActions: keySnapshot,
      });
    } catch (error) {
      console.warn('[controlBindingsStore] listener error', error);
    }
  }
}

function bindingsAreEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const action of aKeys) {
    const aCodes = Array.isArray(a[action]) ? a[action] : [];
    const bCodes = Array.isArray(b[action]) ? b[action] : [];
    if (aCodes.length !== bCodes.length) {
      return false;
    }
    for (let i = 0; i < aCodes.length; i++) {
      if (aCodes[i] !== bCodes[i]) {
        return false;
      }
    }
  }

  return true;
}

function rebuildCaches() {
  keyToActionsMap = buildKeyToActions(currentBindings);
}

export function initializeControlBindings(defaults) {
  const normalizedDefaults = cloneBindings(defaults);
  const hadDefaults = Object.keys(defaultBindings).length > 0;
  defaultBindings = normalizedDefaults;

  if (!hadDefaults && Object.keys(currentBindings).length === 0) {
    currentBindings = cloneBindings(defaultBindings);
    rebuildCaches();
    return;
  }

  const merged = cloneBindings(defaultBindings);
  for (const [action, codes] of Object.entries(currentBindings)) {
    merged[action] = normalizeCodes(codes, defaultBindings[action]);
  }
  currentBindings = merged;
  rebuildCaches();
}

export function getBindingsSnapshot() {
  return cloneBindings(currentBindings);
}

export function getActionBindings(action) {
  if (typeof action !== 'string' || action.length === 0) {
    return [];
  }
  const bindings = currentBindings[action];
  if (Array.isArray(bindings) && bindings.length > 0) {
    return [...bindings];
  }
  const fallback = defaultBindings[action];
  return Array.isArray(fallback) ? [...fallback] : [];
}

export function getKeyToActionsSnapshot() {
  const snapshot = new Map();
  for (const [key, actions] of keyToActionsMap.entries()) {
    snapshot.set(key, new Set(actions));
  }
  return snapshot;
}

export function setActionBindings(action, codes, options = {}) {
  if (typeof action !== 'string' || action.length === 0) {
    throw new Error('setActionBindings requires a valid action string');
  }
  const fallback = defaultBindings[action];
  const normalized = normalizeCodes(codes, fallback);
  const previous = Array.isArray(currentBindings[action]) ? [...currentBindings[action]] : [];

  const areSame =
    previous.length === normalized.length && previous.every((code, idx) => code === normalized[idx]);

  if (areSame) {
    return [...normalized];
  }

  currentBindings[action] = normalized;
  rebuildCaches();

  emitChange({
    type: 'action',
    action,
    previous,
    next: [...normalized],
    metadata: options.metadata ?? null,
  });

  return [...normalized];
}

export function setBindings(bindings, options = {}) {
  const incoming = cloneBindings(bindings);
  const fallbackMerged = cloneBindings(defaultBindings);

  for (const [action, codes] of Object.entries(incoming)) {
    fallbackMerged[action] = normalizeCodes(codes, defaultBindings[action]);
  }

  if (bindingsAreEqual(currentBindings, fallbackMerged)) {
    return getBindingsSnapshot();
  }

  currentBindings = fallbackMerged;
  rebuildCaches();

  emitChange({
    type: 'bulk',
    metadata: options.metadata ?? null,
  });

  return getBindingsSnapshot();
}

export function resetBindings(options = {}) {
  const previous = currentBindings;
  currentBindings = cloneBindings(defaultBindings);
  rebuildCaches();

  if (!bindingsAreEqual(previous, currentBindings)) {
    emitChange({
      type: 'reset',
      metadata: options.metadata ?? null,
    });
  }

  return getBindingsSnapshot();
}

export function subscribe(listener) {
  if (typeof listener !== 'function') {
    throw new Error('subscribe requires a listener function');
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasBindingForKey(code) {
  if (typeof code !== 'string' || code.length === 0) {
    return false;
  }
  return keyToActionsMap.has(code);
}

export function getActionsForKey(code) {
  if (typeof code !== 'string' || code.length === 0) {
    return [];
  }
  const actions = keyToActionsMap.get(code);
  if (!actions) {
    return [];
  }
  return Array.from(actions);
}

export function getRegisteredActions() {
  return Object.keys(currentBindings);
}
