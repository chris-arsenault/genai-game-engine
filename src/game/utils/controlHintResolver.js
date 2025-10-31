import { formatKeyLabels } from './controlLabels.js';
import { getActionBindings } from '../state/controlBindingsStore.js';

function normalizeManualLabels(labels) {
  if (!Array.isArray(labels)) {
    return [];
  }
  const result = [];
  const seen = new Set();
  for (const label of labels) {
    if (typeof label !== 'string') {
      continue;
    }
    const trimmed = label.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function dedupeKeys(keys) {
  const result = [];
  const seen = new Set();
  for (const key of keys) {
    if (typeof key !== 'string') {
      continue;
    }
    const trimmed = key.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function resolveControlHint(hint) {
  if (!hint || typeof hint !== 'object') {
    return null;
  }

  const actions = Array.isArray(hint.actions) ? hint.actions : [];
  const keyCodes = Array.isArray(hint.keyCodes) ? hint.keyCodes : [];
  const fallbackCodes = Array.isArray(hint.fallbackCodes) ? hint.fallbackCodes : [];
  const manualLabels = normalizeManualLabels(hint.manualLabels ?? hint.labels);

  const resolvedCodes = [];

  for (const action of actions) {
    if (typeof action !== 'string' || action.length === 0) {
      continue;
    }
    const bindings = getActionBindings(action);
    if (!Array.isArray(bindings) || bindings.length === 0) {
      continue;
    }
    for (const code of bindings) {
      if (typeof code === 'string' && code.length > 0) {
        resolvedCodes.push(code);
      }
    }
  }

  for (const code of keyCodes) {
    if (typeof code === 'string' && code.length > 0) {
      resolvedCodes.push(code);
    }
  }

  if (resolvedCodes.length === 0) {
    for (const code of fallbackCodes.length ? fallbackCodes : []) {
      if (typeof code === 'string' && code.length > 0) {
        resolvedCodes.push(code);
      }
    }
  }

  let formatted = formatKeyLabels(resolvedCodes);

  if ((!formatted || formatted.length === 0) && Array.isArray(hint.keys)) {
    formatted = hint.keys.slice();
  }

  const combinedKeys = dedupeKeys([...(formatted || []), ...manualLabels]);

  if (
    !(typeof hint.label === 'string' && hint.label.trim().length > 0) &&
    combinedKeys.length === 0 &&
    !(typeof hint.note === 'string' && hint.note.trim().length > 0)
  ) {
    return null;
  }

  return {
    label: typeof hint.label === 'string' ? hint.label : null,
    keys: combinedKeys,
    note: typeof hint.note === 'string' ? hint.note : null,
  };
}
