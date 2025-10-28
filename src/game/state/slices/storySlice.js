import { createSelector } from '../utils/memoize.js';

const initialStoryState = {
  flags: {},
  lastActionAt: null,
};

function cloneState(state) {
  return {
    flags: { ...state.flags },
    lastActionAt: state.lastActionAt,
  };
}

export const storySlice = {
  key: 'story',

  getInitialState() {
    return cloneState(initialStoryState);
  },

  reducer(state = initialStoryState, action) {
    if (!action) {
      return state;
    }

    if (action.domain !== 'story' && action.type !== 'WORLDSTATE_HYDRATE') {
      return state;
    }

    const next = cloneState(state);
    const payload = action.payload || {};
    let hasChange = false;

    switch (action.type) {
      case 'STORY_FLAG_SET': {
        if (!payload.flagId) break;
        next.flags[payload.flagId] = {
          value: payload.value,
          metadata: payload.metadata ?? {},
          updatedAt: payload.timestamp ?? Date.now(),
        };
        hasChange = true;
        break;
      }

      case 'STORY_FLAG_REMOVED': {
        if (!payload.flagId) break;
        if (next.flags[payload.flagId]) {
          delete next.flags[payload.flagId];
          hasChange = true;
        }
        break;
      }

      case 'WORLDSTATE_HYDRATE': {
        if (!payload?.story) break;
        return cloneState({
          flags: payload.story.flags ?? {},
          lastActionAt: payload.story.lastActionAt ?? null,
        });
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
    return {
      flags: state.flags,
    };
  },

  selectors: {
    selectSlice(state) {
      return state.story;
    },
    selectFlag: createSelector(
      (state) => state.story.flags,
      (state, flagId, defaultValue = null) => ({ flagId, defaultValue }),
      (flags, { flagId, defaultValue }) => (flags[flagId] ? flags[flagId].value : defaultValue)
    ),
    selectFlagsByPrefix: createSelector(
      (state) => state.story.flags,
      (state, prefix) => prefix,
      (flags, prefix) => {
        if (!prefix) return flags;
        return Object.fromEntries(
          Object.entries(flags).filter(([key]) => key.startsWith(prefix))
        );
      }
    ),
    selectCurrentAct: createSelector(
      (state) => state.story.flags,
      (flags) => {
        if (flags.act3_started?.value) return 'act3';
        if (flags.act2_started?.value) return 'act2';
        if (flags.act1_started?.value) return 'act1';
        return null;
      }
    ),
  },
};

export default storySlice;
