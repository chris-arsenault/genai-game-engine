/**
 * Lightweight memoization utilities for world state selectors.
 * Keeps selectors fast (<1 ms) without external dependencies.
 */

/**
 * Simple strict equality check.
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function defaultEqualityCheck(a, b) {
  return a === b;
}

/**
 * Creates a memoized selector.
 * Adapted from reselect's API but trimmed for local needs.
 *
 * Usage:
 * const selector = createSelector(
 *   state => state.quest,
 *   (state, questId) => questId,
 *   (questSlice, questId) => questSlice.byId[questId]
 * );
 *
 * @param {...Function} funcs - input selectors followed by result function
 * @returns {Function} memoized selector
 */
export function createSelector(...funcs) {
  if (funcs.length < 1) {
    throw new Error('createSelector requires at least one argument');
  }

  const resultFunc = funcs.pop();
  const inputSelectors = funcs;

  let lastArgs = null;
  let lastResult;

  function selector(state, ...extraArgs) {
    const inputs = inputSelectors.length
      ? inputSelectors.map((selectorFn) => selectorFn(state, ...extraArgs))
      : [state];

    if (lastArgs && areArgumentsEqual(lastArgs, inputs)) {
      return lastResult;
    }

    lastArgs = inputs;
    lastResult = resultFunc(...inputs);
    return lastResult;
  }

  selector.reset = function reset() {
    lastArgs = null;
    lastResult = undefined;
  };

  selector.getLastArgs = function getLastArgs() {
    return lastArgs;
  };

  return selector;
}

/**
 * Compare selector argument arrays.
 * @param {Array<*>} prev
 * @param {Array<*>} next
 * @returns {boolean}
 */
function areArgumentsEqual(prev, next) {
  if (!prev || prev.length !== next.length) {
    return false;
  }

  for (let i = 0; i < prev.length; i++) {
    if (!defaultEqualityCheck(prev[i], next[i])) {
      return false;
    }
  }

  return true;
}
