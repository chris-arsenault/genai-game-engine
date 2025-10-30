import { WorldStateStore } from '../../../src/game/state/WorldStateStore.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { questSlice } from '../../../src/game/state/slices/questSlice.js';
import { storySlice } from '../../../src/game/state/slices/storySlice.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';
import { tutorialSlice } from '../../../src/game/state/slices/tutorialSlice.js';
import { dialogueSlice } from '../../../src/game/state/slices/dialogueSlice.js';
import { inventorySlice } from '../../../src/game/state/slices/inventorySlice.js';

describe('WorldStateStore', () => {
  let eventBus;
  let store;

  beforeEach(() => {
    eventBus = new EventBus();
    store = new WorldStateStore(eventBus, { enableDebug: true });
    store.init();
  });

  afterEach(() => {
    store.destroy();
  });

  test('captures quest lifecycle via EventBus', () => {
    eventBus.emit('quest:registered', {
      questId: 'quest_alpha',
      title: 'Alpha Quest',
      type: 'main',
    });

    eventBus.emit('quest:started', {
      questId: 'quest_alpha',
      title: 'Alpha Quest',
      type: 'main',
    });

    eventBus.emit('objective:progress', {
      questId: 'quest_alpha',
      objectiveId: 'obj_1',
      progress: 1,
      target: 1,
    });

    eventBus.emit('quest:completed', {
      questId: 'quest_alpha',
      title: 'Alpha Quest',
      type: 'main',
    });

    const quest = store.select(questSlice.selectors.selectQuestById, 'quest_alpha');
    expect(quest.status).toBe('completed');
    expect(quest.objectives.obj_1.status).toBe('completed');
  });

  test('tracks story flags, faction reputation, tutorial progress, and dialogue state', () => {
    eventBus.emit('story:flag:changed', {
      flagId: 'act1_started',
      newValue: true,
    });

    eventBus.emit('reputation:changed', {
      factionId: 'faction_alpha',
      newFame: 30,
      newInfamy: 10,
      deltaFame: 5,
      deltaInfamy: -2,
      reason: 'Test change',
    });

    eventBus.emit('tutorial:started', { totalSteps: 3 });
    eventBus.emit('tutorial:step_started', {
      stepId: 'movement',
      stepIndex: 0,
      totalSteps: 3,
      title: 'Move',
      description: 'Move around',
      highlight: { type: 'entity', entityId: 'player' },
      position: { x: 400, y: 120 },
      canSkip: true,
      controlHint: {
        label: 'Movement',
        keys: ['W', 'A', 'S', 'D'],
      },
    });
    eventBus.emit('tutorial:control_hint_updated', {
      stepId: 'movement',
      controlHint: {
        label: 'Movement',
        keys: ['I', 'J', 'K', 'L'],
      },
    });
    eventBus.emit('tutorial:step_completed', { stepId: 'movement', stepIndex: 0 });

    eventBus.emit('dialogue:started', {
      npcId: 'npc_alpha',
      dialogueId: 'dlg_alpha',
      nodeId: 'start',
      speaker: 'NPC Alpha',
      text: 'Welcome.',
      choices: [{ id: 'c1', text: 'Thanks' }],
      canAdvance: false,
    });
    eventBus.emit('dialogue:choice', {
      npcId: 'npc_alpha',
      dialogueId: 'dlg_alpha',
      nodeId: 'start',
      choiceId: 'c1',
      choiceText: 'Thanks',
    });
    eventBus.emit('dialogue:completed', {
      npcId: 'npc_alpha',
      dialogueId: 'dlg_alpha',
      nodeId: 'end',
      choiceId: 'c1',
    });

    const currentAct = store.select(storySlice.selectors.selectCurrentAct);
    expect(currentAct).toBe('act1');

    const faction = store.select(factionSlice.selectors.selectFactionById, 'faction_alpha');
    expect(faction.fame).toBe(30);

    const tutorial = store.select(tutorialSlice.selectors.selectTutorialProgress);
    expect(tutorial.enabled).toBe(true);
    expect(tutorial.completedSteps).toContain('movement');
    const tutorialPrompt = store.select(tutorialSlice.selectors.selectCurrentPrompt);
    expect(tutorialPrompt.controlHint.keys).toEqual(['I', 'J', 'K', 'L']);
    const tutorialSnapshots = store.select(tutorialSlice.selectors.selectPromptHistorySnapshots);
    expect(tutorialSnapshots).toHaveLength(2);
    expect(tutorialSnapshots[0].event).toBe('control_hint_updated');
    expect(tutorialSnapshots[1].event).toBe('step_completed');

    const dialogue = store.select(dialogueSlice.selectors.selectDialogueTranscript, 'npc_alpha');
    expect(dialogue).toHaveLength(2);
    const lastChoice = store.select(dialogueSlice.selectors.selectLastChoiceForNPC, 'npc_alpha');
    expect(lastChoice.dialogueId).toBe('dlg_alpha');
  });

  test('produces and hydrates snapshots', () => {
    eventBus.emit('story:flag:changed', {
      flagId: 'act1_started',
      newValue: true,
    });

    eventBus.emit('dialogue:started', {
      npcId: 'npc_beta',
      dialogueId: 'dlg_beta',
      nodeId: 'start',
      speaker: 'NPC Beta',
      text: 'Howdy',
      choices: [],
      canAdvance: true,
    });

    const snapshot = store.snapshot();
    expect(snapshot.storyFlags.flags.act1_started.value).toBe(true);
    expect(snapshot.dialogue.active.dialogueId).toBe('dlg_beta');
    expect(snapshot.meta).toBeUndefined();

    const secondBus = new EventBus();
    const restoredStore = new WorldStateStore(secondBus, { enableDebug: false });
    restoredStore.init();
    restoredStore.hydrate(snapshot);

    const restoredFlag = restoredStore.select(storySlice.selectors.selectFlag, 'act1_started');
    expect(restoredFlag).toBe(true);

    const restoredDialogue = restoredStore.select(dialogueSlice.selectors.selectActiveDialogue);
    expect(restoredDialogue.dialogueId).toBe('dlg_beta');

    restoredStore.destroy();
  });

  test('captures blocked objectives, inventory selections, and faction resets', () => {
    eventBus.emit('quest:registered', {
      questId: 'quest_obs',
      title: 'Observability Quest',
      type: 'side',
      objectives: [
        { id: 'obj_gate', description: 'Unlock security gate' },
      ],
    });

    eventBus.emit('quest:started', {
      questId: 'quest_obs',
      title: 'Observability Quest',
      type: 'side',
    });

    eventBus.emit('objective:blocked', {
      questId: 'quest_obs',
      questTitle: 'Observability Quest',
      objectiveId: 'obj_gate',
      objectiveDescription: 'Unlock security gate',
      reason: 'missing_keycard',
      requirement: 'keycard_alpha',
    });

    const blockedObjectives = store.select(questSlice.selectors.selectQuestBlockedObjectives, 'quest_obs');
    expect(blockedObjectives).toHaveLength(1);
    expect(blockedObjectives[0].reason).toBe('missing_keycard');

    eventBus.emit('inventory:item_added', {
      id: 'keycard_alpha',
      name: 'Keycard Alpha',
      quantity: 1,
    });

    eventBus.emit('inventory:selection_changed', {
      itemId: 'keycard_alpha',
      index: 0,
      source: 'inventoryOverlay',
    });

    const selectionInfo = store.select(inventorySlice.selectors.getSelectionInfo);
    expect(selectionInfo.itemId).toBe('keycard_alpha');
    expect(selectionInfo.index).toBe(0);
    expect(selectionInfo.source).toBe('inventoryOverlay');

    eventBus.emit('faction:attitude_changed', {
      factionId: 'faction_delta',
      factionName: 'Faction Delta',
      oldAttitude: 'neutral',
      newAttitude: 'friendly',
      cascade: true,
      source: 'faction_alpha',
      sourceFactionName: 'Faction Alpha',
    });

    const lastChange = store.select(factionSlice.selectors.selectFactionLastAttitudeChange, 'faction_delta');
    expect(lastChange.sourceFactionId).toBe('faction_alpha');

    const cascadeSummary = store.select(factionSlice.selectors.selectFactionCascadeSummary);
    expect(cascadeSummary.lastCascadeEvent.targetFactionId).toBe('faction_delta');

    eventBus.emit('faction:reputation_reset', {
      reason: 'QA reset',
      initiatedBy: 'dev_console',
    });

    const factions = store.select(factionSlice.selectors.selectFactionOverview);
    expect(factions).toHaveLength(0);

    const lastReset = store.select(factionSlice.selectors.selectFactionLastReset);
    expect(lastReset.reason).toBe('QA reset');
    expect(lastReset.initiatedBy).toBe('dev_console');
    expect(store.select(factionSlice.selectors.selectFactionCascadeSummary).lastCascadeEvent).toBeNull();

    eventBus.emit('faction:member_removed', {
      factionId: 'faction_delta',
      factionName: 'Faction Delta',
      npcId: 'operative_x',
      entityId: 404,
      tag: 'npc',
      removedAt: Date.now(),
    });

    const removals = store.select(factionSlice.selectors.selectRecentMemberRemovals);
    expect(removals).toHaveLength(1);
    expect(removals[0].npcId).toBe('operative_x');
  });
});
