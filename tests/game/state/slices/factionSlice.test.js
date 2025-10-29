import { factionSlice } from '../../../../src/game/state/slices/factionSlice.js';

describe('factionSlice', () => {
  function reduce(state, action) {
    return factionSlice.reducer(state, action);
  }

  test('tracks reputation and attitude changes', () => {
    const initial = factionSlice.getInitialState();

    let state = reduce(initial, {
      type: 'FACTION_REPUTATION_CHANGED',
      domain: 'faction',
      payload: {
        factionId: 'faction_alpha',
        newFame: 40,
        newInfamy: 10,
        deltaFame: 5,
        deltaInfamy: -5,
      },
    });

    expect(state.byId.faction_alpha.fame).toBe(40);
    expect(state.byId.faction_alpha.lastDelta.fame).toBe(5);

    state = reduce(state, {
      type: 'FACTION_ATTITUDE_CHANGED',
      domain: 'faction',
      payload: {
        factionId: 'faction_alpha',
        newAttitude: 'friendly',
      },
    });

    expect(state.byId.faction_alpha.attitude).toBe('friendly');
  });

  test('hydrates snapshot payload', () => {
    const hydrated = reduce(factionSlice.getInitialState(), {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        factions: {
          byId: {
            faction_beta: { id: 'faction_beta', fame: 70, infamy: 10 },
          },
          lastResetAt: 777,
          lastResetReason: 'Test reset',
          lastResetInitiatedBy: 'admin',
        },
      },
    });

    expect(hydrated.byId.faction_beta.fame).toBe(70);
    expect(hydrated.lastResetAt).toBe(777);
    expect(hydrated.lastResetReason).toBe('Test reset');
  });

  test('handles reputation reset events', () => {
    let state = factionSlice.getInitialState();

    state = reduce(state, {
      type: 'FACTION_REPUTATION_CHANGED',
      domain: 'faction',
      payload: {
        factionId: 'faction_gamma',
        newFame: 55,
        newInfamy: 10,
        deltaFame: 5,
        deltaInfamy: -2,
        reason: 'Quest reward',
      },
    });

    expect(Object.keys(state.byId)).toContain('faction_gamma');

    state = reduce(state, {
      type: 'FACTION_REPUTATION_RESET',
      domain: 'faction',
      payload: {
        reason: 'Debug command',
        initiatedBy: 'gm_console',
      },
      timestamp: 4321,
    });

    expect(state.byId).toEqual({});
    expect(state.lastResetAt).toBe(4321);
    expect(state.lastResetReason).toBe('Debug command');
    expect(state.lastResetInitiatedBy).toBe('gm_console');

    const lastReset = factionSlice.selectors.selectFactionLastReset({ faction: state });
    expect(lastReset).toEqual({
      at: 4321,
      reason: 'Debug command',
      initiatedBy: 'gm_console',
    });
  });
});
