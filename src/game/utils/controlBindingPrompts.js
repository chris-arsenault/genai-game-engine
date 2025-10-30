import { Controls } from '../config/Controls.js';
import { getActionBindings } from '../state/controlBindingsStore.js';
import { formatKeyLabel, formatKeyLabels } from './controlLabels.js';

function getFallbackCodes(action) {
  if (typeof action !== 'string' || !action.length) {
    return [];
  }
  const fallback = Controls?.[action];
  return Array.isArray(fallback) ? [...fallback] : [];
}

export function getBindingCodes(action) {
  if (typeof action !== 'string' || action.length === 0) {
    return [];
  }
  const dynamic = getActionBindings(action);
  if (Array.isArray(dynamic) && dynamic.length) {
    return [...dynamic];
  }
  return getFallbackCodes(action);
}

export function getBindingLabels(action, options = {}) {
  const codes = getBindingCodes(action);
  if (codes.length === 0) {
    const fallbackLabel = options.fallbackLabel ?? null;
    return fallbackLabel ? [fallbackLabel] : [];
  }
  return formatKeyLabels(codes);
}

export function getPrimaryBindingLabel(action, fallbackLabel = null) {
  const codes = getBindingCodes(action);
  if (codes.length > 0) {
    const label = formatKeyLabel(codes[0]);
    if (label) {
      return label;
    }
  }
  if (typeof fallbackLabel === 'string' && fallbackLabel.length) {
    return fallbackLabel;
  }
  if (typeof action === 'string' && action.length) {
    return action;
  }
  return '—';
}

function normalizeActionText(actionText) {
  if (typeof actionText !== 'string' || actionText.trim().length === 0) {
    return 'to interact';
  }
  const trimmed = actionText.trim().replace(/[.?!]+$/, '');
  if (/^to\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `to ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

export function formatActionPrompt(action, actionText, options = {}) {
  const prefix = options.prefix ?? 'Press';
  const label = getPrimaryBindingLabel(action, options.fallbackLabel ?? 'Key');
  const normalized = normalizeActionText(actionText);
  return `${prefix} ${label} ${normalized}`.trim();
}

export function hydratePromptWithBinding(promptText, action, options = {}) {
  const fallbackActionText = options.fallbackActionText ?? 'to interact';
  const label = getPrimaryBindingLabel(action, options.fallbackLabel ?? 'Key');

  if (typeof promptText !== 'string' || promptText.trim().length === 0) {
    return `${options.prefix ?? 'Press'} ${label} ${fallbackActionText}`;
  }

  const regex = /press\s+[^\s]+/i;
  if (regex.test(promptText)) {
    return promptText.replace(regex, `${options.prefix ?? 'Press'} ${label}`);
  }

  return formatActionPrompt(action, promptText, options);
}
