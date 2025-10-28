import { WorldStateStore } from '../../../src/game/state/WorldStateStore.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { dialogueSlice } from '../../../src/game/state/slices/dialogueSlice.js';

describe('WorldStateStore dialogue parity', () => {
  let eventBus;
  let store;

  beforeEach(() => {
    eventBus = new EventBus();
    store = new WorldStateStore(eventBus, { enableDebug: false });
    store.init();
  });

  afterEach(() => {
    store.destroy();
  });

  it('mirrors dialogue lifecycle emitted via EventBus', () => {
    const npcId = 'npc_test';
    const dialogueId = 'dlg_test';

    eventBus.emit('dialogue:started', {
      npcId,
      dialogueId,
      nodeId: 'node_start',
      speaker: 'NPC Test',
      text: 'Greetings detective.',
      choices: [{ id: 'choice_a', text: 'Hello' }],
      hasChoices: true,
      canAdvance: true,
    });

    let active = store.select(dialogueSlice.selectors.selectActiveDialogue);
    expect(active.dialogueId).toBe(dialogueId);
    expect(active.nodeId).toBe('node_start');
    expect(active.choices).toHaveLength(1);

    eventBus.emit('dialogue:choice', {
      npcId,
      dialogueId,
      nodeId: 'node_start',
      choiceIndex: 0,
      choiceText: 'Hello',
    });

    eventBus.emit('dialogue:node_changed', {
      npcId,
      dialogueId,
      nodeId: 'node_followup',
      speaker: 'NPC Test',
      text: 'Let us continue.',
      choices: [],
      hasChoices: false,
      canAdvance: false,
    });

    active = store.select(dialogueSlice.selectors.selectActiveDialogue);
    expect(active.nodeId).toBe('node_followup');
    expect(active.text).toBe('Let us continue.');

    eventBus.emit('dialogue:completed', {
      npcId,
      dialogueId,
      nodeId: 'node_followup',
      choiceId: 'choice_a',
    });

    active = store.select(dialogueSlice.selectors.selectActiveDialogue);
    expect(active).toBeNull();

    const transcript = store.select(dialogueSlice.selectors.selectDialogueTranscript, npcId);
    expect(transcript).toHaveLength(3);
    expect(transcript[0].type).toBe('node');
    expect(transcript[1].type).toBe('choice');

    const lastChoice = store.select(dialogueSlice.selectors.selectLastChoiceForNPC, npcId);
    expect(lastChoice.dialogueId).toBe(dialogueId);
    expect(lastChoice.choiceId).toBe('choice_a');
  });
});
