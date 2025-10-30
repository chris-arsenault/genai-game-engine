/**
 * Default per-system budget target in milliseconds for the debug overlay.
 * Kept in a standalone helper so both the overlay and tests share constraints.
 */
export const DEFAULT_SYSTEM_BUDGET_MS = 4;

const MIN_SYSTEM_BUDGET_MS = 0.5;
const MAX_SYSTEM_BUDGET_MS = 50;

/**
 * Normalises arbitrary user input into a valid system budget value.
 *
 * @param {unknown} rawValue - Value supplied by UI or external scripts.
 * @param {number} [fallback=DEFAULT_SYSTEM_BUDGET_MS] - Value to use when input is invalid.
 * @returns {number} Sanitised budget between MIN_SYSTEM_BUDGET_MS and MAX_SYSTEM_BUDGET_MS.
 */
export function resolveDebugSystemBudget(rawValue, fallback = DEFAULT_SYSTEM_BUDGET_MS) {
  const numeric =
    typeof rawValue === 'number'
      ? rawValue
      : Number.parseFloat(typeof rawValue === 'string' ? rawValue.trim() : Number.NaN);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (numeric <= 0) {
    return MIN_SYSTEM_BUDGET_MS;
  }

  if (numeric < MIN_SYSTEM_BUDGET_MS) {
    return MIN_SYSTEM_BUDGET_MS;
  }

  if (numeric > MAX_SYSTEM_BUDGET_MS) {
    return MAX_SYSTEM_BUDGET_MS;
  }

  return numeric;
}

/**
 * Formats a numeric budget for display inside the debug controls input field.
 *
 * @param {unknown} value - Value to render.
 * @param {number} [fallback=DEFAULT_SYSTEM_BUDGET_MS] - Used when value is invalid.
 * @returns {string} Compact string with at most two decimal places.
 */
export function formatDebugSystemBudget(value, fallback = DEFAULT_SYSTEM_BUDGET_MS) {
  const resolved = resolveDebugSystemBudget(value, fallback);
  if (Number.isInteger(resolved)) {
    return String(resolved);
  }
  const fixed = resolved.toFixed(2);
  return fixed.replace(/\.?0+$/, '');
}
