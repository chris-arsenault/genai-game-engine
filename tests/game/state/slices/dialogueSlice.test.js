import { dialogueSlice } from '../../../../src/game/state/slices/dialogueSlice.js';

describe('dialogueSlice', () => {
  beforeEach(() => {
    dialogueSlice.configure({ historyLimit: 3, transcriptEnabled: true });
  });

  function reduce(state, action) {
    return dialogueSlice.reducer(state, action);
  }

  test('captures active dialogue lifecycle and history', () => {
    const initial = dialogueSlice.getInitialState();

    let state = reduce(initial, {
      type: 'DIALOGUE_STARTED',
      domain: 'dialogue',
      payload: {
        npcId: 'npc_1',
        dialogueId: 'dlg_a',
        nodeId: 'node_1',
        speaker: 'Alex',
        text: 'Hello detective.',
        choices: [{ id: 'c1', text: 'Hi!' }],
        canAdvance: false,
      },
      timestamp: 1000,
    });

    expect(state.active.dialogueId).toBe('dlg_a');
    expect(state.historyByNpc.npc_1).toHaveLength(1);

    state = reduce(state, {
      type: 'DIALOGUE_CHOICE_MADE',
      domain: 'dialogue',
      payload: {
        npcId: 'npc_1',
        dialogueId: 'dlg_a',
        nodeId: 'node_1',
        choiceId: 'c1',
        choiceText: 'Hi!',
      },
      timestamp: 1100,
    });

    expect(state.historyByNpc.npc_1).toHaveLength(2);
    expect(state.historyByNpc.npc_1[1].type).toBe('choice');

    state = reduce(state, {
      type: 'DIALOGUE_COMPLETED',
      domain: 'dialogue',
      payload: {
        npcId: 'npc_1',
        dialogueId: 'dlg_a',
        nodeId: 'node_2',
        choiceId: 'c1',
      },
      timestamp: 1200,
    });

    expect(state.active).toBeNull();
    expect(state.completedByNpc.npc_1.lastDialogueId).toBe('dlg_a');
    expect(state.completedByNpc.npc_1.completedAt).toBe(1200);
  });

  test('hydrates from snapshot and honors history limit', () => {
    dialogueSlice.configure({ historyLimit: 2 });
    const state = dialogueSlice.getInitialState();

    const serialized = dialogueSlice.serialize({
      ...state,
      historyByNpc: {
        npc_1: [
          { type: 'node', dialogueId: 'dlg', nodeId: 'n1', timestamp: 1 },
          { type: 'choice', dialogueId: 'dlg', nodeId: 'n1', choiceId: 'c1', timestamp: 2 },
          { type: 'node', dialogueId: 'dlg', nodeId: 'n2', timestamp: 3 },
        ],
      },
      completedByNpc: {
        npc_1: {
          lastDialogueId: 'dlg',
          lastNodeId: 'n2',
          lastChoiceId: 'c1',
          completedAt: 2000,
        },
      },
      lastActionAt: 3000,
    });

    expect(serialized.historyByNpc.npc_1).toHaveLength(2);

    const hydrated = reduce(undefined, {
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: {
        dialogue: serialized,
      },
    });

    expect(hydrated.historyByNpc.npc_1).toHaveLength(2);
    expect(hydrated.completedByNpc.npc_1.lastDialogueId).toBe('dlg');
  });
});
