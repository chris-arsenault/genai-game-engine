/**
 * Convert a KeyboardEvent code into a human-readable key label for prompts.
 * @param {string} code
 * @returns {string|null}
 */
export function formatKeyLabel(code) {
  if (typeof code !== 'string' || code.length === 0) {
    return null;
  }

  if (code.startsWith('Key') && code.length > 3) {
    return code.slice(3);
  }

  if (code.startsWith('Digit') && code.length > 5) {
    return code.slice(5);
  }

  const map = {
    Escape: 'Esc',
    Space: 'Space',
    Tab: 'Tab',
    Shift: 'Shift',
    Enter: 'Enter',
    Backspace: 'Backspace',
    Backquote: '`',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    MetaLeft: 'Meta',
    MetaRight: 'Meta',
  };

  return map[code] || code;
}

/**
 * Convert an array of key codes into deduplicated, human-readable labels.
 * @param {string[]} codes
 * @returns {string[]}
 */
export function formatKeyLabels(codes) {
  if (!Array.isArray(codes)) {
    return [];
  }

  const seen = new Set();
  const labels = [];
  for (const code of codes) {
    const label = formatKeyLabel(code);
    if (!label || seen.has(label)) {
      continue;
    }
    seen.add(label);
    labels.push(label);
  }
  return labels;
}
