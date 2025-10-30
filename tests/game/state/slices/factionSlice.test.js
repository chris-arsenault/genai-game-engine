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
        factionName: 'Faction Alpha',
        newAttitude: 'friendly',
        oldAttitude: 'neutral',
      },
    });

    const record = state.byId.faction_alpha;
    expect(record.attitude).toBe('friendly');
    expect(record.attitudeHistory).toHaveLength(1);
    expect(record.lastAttitudeChange.cascade).toBe(false);

    const lastChange = factionSlice.selectors.selectFactionLastAttitudeChange({ faction: state }, 'faction_alpha');
    expect(lastChange.newAttitude).toBe('friendly');

    const history = factionSlice.selectors.selectFactionAttitudeHistory({ faction: state }, 'faction_alpha');
    expect(history).toHaveLength(1);
    expect(history[0].oldAttitude).toBe('neutral');
  });

  test('hydrates snapshot payload', () => {
    const hydrated = reduce(factionSlice.getInitialState(), {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        factions: {
          byId: {
            faction_beta: {
              id: 'faction_beta',
              fame: 70,
              infamy: 10,
              attitude: 'friendly',
              lastDelta: { fame: 5, infamy: -5 },
              lastAttitudeChange: {
                factionId: 'faction_beta',
                newAttitude: 'friendly',
                oldAttitude: 'neutral',
                cascade: true,
                sourceFactionId: 'faction_alpha',
                occurredAt: 999,
              },
              attitudeHistory: [
                {
                  factionId: 'faction_beta',
                  newAttitude: 'friendly',
                  oldAttitude: 'neutral',
                  cascade: true,
                  sourceFactionId: 'faction_alpha',
                  occurredAt: 999,
                },
              ],
              lastCascade: {
                sourceFactionId: 'faction_alpha',
                occurredAt: 999,
                newAttitude: 'friendly',
              },
              cascadeCount: 1,
              cascadeSources: ['faction_alpha'],
            },
          },
          lastResetAt: 777,
          lastResetReason: 'Test reset',
          lastResetInitiatedBy: 'admin',
          lastCascadeEvent: {
            targetFactionId: 'faction_beta',
            sourceFactionId: 'faction_alpha',
            newAttitude: 'friendly',
            occurredAt: 999,
          },
        },
      },
    });

    expect(hydrated.byId.faction_beta.fame).toBe(70);
    expect(hydrated.lastResetAt).toBe(777);
    expect(hydrated.lastResetReason).toBe('Test reset');
    expect(hydrated.lastCascadeEvent.sourceFactionId).toBe('faction_alpha');
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

    expect(state.lastCascadeEvent).toBeNull();
  });

  test('captures cascade metadata on attitude changes', () => {
    let state = factionSlice.getInitialState();

    state = reduce(state, {
      type: 'FACTION_ATTITUDE_CHANGED',
      domain: 'faction',
      payload: {
        factionId: 'faction_delta',
        factionName: 'Faction Delta',
        oldAttitude: 'neutral',
        newAttitude: 'friendly',
        cascade: true,
        source: 'faction_alpha',
        sourceFactionName: 'Faction Alpha',
      },
      timestamp: 1234,
    });

    const record = state.byId.faction_delta;
    expect(record.lastCascade.sourceFactionId).toBe('faction_alpha');
    expect(record.cascadeCount).toBe(1);
    expect(record.cascadeSources).toContain('faction_alpha');

    const summary = factionSlice.selectors.selectFactionCascadeSummary({ faction: state });
    expect(summary.lastCascadeEvent.sourceFactionId).toBe('faction_alpha');
    expect(summary.cascadeTargets[0].factionId).toBe('faction_delta');
  });
});
