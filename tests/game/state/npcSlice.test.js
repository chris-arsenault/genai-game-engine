import { npcSlice } from '../../../src/game/state/slices/npcSlice.js';

describe('npcSlice', () => {
  test('initial state provides empty registry', () => {
    const initial = npcSlice.getInitialState();
    expect(initial.byId).toEqual({});
    expect(initial.changeLog).toEqual([]);
    expect(initial.lastUpdatedAt).toBeNull();
  });

  test('records interviews and maintains status', () => {
    const initial = npcSlice.getInitialState();
    const afterInterview = npcSlice.reducer(initial, {
      type: 'NPC_INTERVIEWED',
      domain: 'npc',
      payload: {
        npcId: 'npc_1',
        npcName: 'Witness',
        dialogueId: 'dlg_1',
      },
      timestamp: 1000,
    });

    const record = afterInterview.byId.npc_1;
    expect(record.status).toBe('cooperative');
    expect(record.interactions.interviews).toBe(1);
    expect(record.lastDialogueId).toBe('dlg_1');
    expect(record.history[0].type).toBe('interview');
    expect(afterInterview.changeLog).toHaveLength(1);
  });

  test('updates suspicion and alert states with history', () => {
    let state = npcSlice.getInitialState();
    state = npcSlice.reducer(state, {
      type: 'NPC_BECAME_SUSPICIOUS',
      domain: 'npc',
      payload: {
        npcId: 'npc_2',
        npcName: 'Guard',
        reason: 'disguise',
      },
      timestamp: 2000,
    });

    state = npcSlice.reducer(state, {
      type: 'NPC_ALERTED',
      domain: 'npc',
      payload: {
        npcId: 'npc_2',
        reason: 'disguise_blown',
      },
      timestamp: 2100,
    });

    const record = state.byId.npc_2;
    expect(record.status).toBe('alerted');
    expect(record.suspicion.active).toBe(true);
    expect(record.alert.active).toBe(true);
    expect(record.history.map((entry) => entry.type)).toContain('alerted');
  });

  test('hydrates from snapshot payload', () => {
    const snapshot = {
      byId: {
        npc_3: {
          id: 'npc_3',
          name: 'Analyst',
          status: 'aware',
          interactions: {
            interviews: 2,
            recognitions: 1,
            witnessedCrimes: 0,
          },
          suspicion: {
            active: false,
            reason: null,
            updatedAt: null,
          },
          alert: {
            active: false,
            reason: null,
            updatedAt: null,
          },
          history: [],
        },
      },
      changeLog: [
        { type: 'recognized_player', npcId: 'npc_3', timestamp: 100 },
      ],
      lastUpdatedAt: 100,
    };

    const state = npcSlice.reducer(npcSlice.getInitialState(), {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        npc: snapshot,
      },
    });

    expect(state.byId.npc_3.name).toBe('Analyst');
    expect(state.changeLog).toHaveLength(1);
    expect(state.lastUpdatedAt).toBe(100);
  });
});
