import { createSelector } from '../../state/utils/memoize.js';
import { dialogueSlice } from '../../state/slices/dialogueSlice.js';

const selectActiveDialogue = (state) => dialogueSlice.selectors.selectActiveDialogue(state);
const selectHistoryByNpc = (state) => state.dialogue?.historyByNpc ?? {};
const selectCompletedByNpc = (state) => state.dialogue?.completedByNpc ?? {};

const dialogueOverlaySelector = createSelector(
  selectActiveDialogue,
  selectHistoryByNpc,
  selectCompletedByNpc,
  (active, historyByNpc, completedByNpc) => {
    if (!active) {
      return {
        visible: false,
        npcId: null,
        dialogueId: null,
        nodeId: null,
        speaker: '',
        text: '',
        choices: [],
        canAdvance: false,
        hasChoices: false,
        startedAt: null,
        updatedAt: null,
        transcript: [],
        lastChoice: null,
      };
    }

    const transcript = historyByNpc[active.npcId] ?? [];
    const lastChoiceRecord = completedByNpc[active.npcId] ?? null;

    return {
      visible: true,
      npcId: active.npcId,
      dialogueId: active.dialogueId,
      nodeId: active.nodeId,
      speaker: active.speaker,
      text: active.text,
      choices: Array.isArray(active.choices) ? active.choices : [],
      canAdvance: Boolean(active.canAdvance),
      hasChoices: Boolean(active.hasChoices),
      startedAt: active.startedAt ?? null,
      updatedAt: active.updatedAt ?? null,
      transcript,
      lastChoice: lastChoiceRecord,
    };
  }
);

/**
 * Build a view model for dialogue overlays from the world state.
 * @param {Object} state
 * @returns {Object}
 */
export function buildDialogueViewModel(state) {
  return dialogueOverlaySelector(state);
}

/**
 * Convenience helper to read transcript history for the given NPC.
 * @param {Object} state
 * @param {string} npcId
 * @returns {Array<Object>}
 */
export function selectDialogueTranscript(state, npcId) {
  return dialogueSlice.selectors.selectDialogueTranscript(state, npcId);
}
