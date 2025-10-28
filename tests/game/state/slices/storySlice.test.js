import { storySlice } from '../../../../src/game/state/slices/storySlice.js';

describe('storySlice', () => {
  function reduce(state, action) {
    return storySlice.reducer(state, action);
  }

  test('sets and removes story flags', () => {
    const initial = storySlice.getInitialState();

    const afterSet = reduce(initial, {
      type: 'STORY_FLAG_SET',
      domain: 'story',
      payload: { flagId: 'act1_started', value: true },
    });

    expect(afterSet.flags.act1_started.value).toBe(true);

    const afterRemove = reduce(afterSet, {
      type: 'STORY_FLAG_REMOVED',
      domain: 'story',
      payload: { flagId: 'act1_started' },
    });

    expect(afterRemove.flags.act1_started).toBeUndefined();
  });

  test('hydrates from snapshot', () => {
    const hydrated = reduce(storySlice.getInitialState(), {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        story: {
          flags: { act2_started: { value: true } },
        },
      },
    });

    expect(hydrated.flags.act2_started.value).toBe(true);
  });
});
