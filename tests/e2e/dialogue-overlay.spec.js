import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

const DIALOGUE_ID = 'reese_briefing_001';
const NPC_ID = 'captain_reese';
const EXPECTED_NEXT_NODE = 'explain_hollow';

test.describe('Dialogue overlay', () => {
  test('mirrors WorldStateStore updates via store-backed overlay', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);
    await page.waitForFunction(
      () => window.game?.dialogueBox != null,
      { timeout: 5000 }
    );

    await page.evaluate(
      ({ npcId, dialogueId }) => {
        const { dialogue } = window.game.gameSystems;
        if (!dialogue.caseManager || typeof dialogue.caseManager.getActiveCase !== 'function') {
          dialogue.caseManager = { getActiveCase: () => null };
        }
        const started = dialogue.startDialogue(npcId, dialogueId);
        if (!started) {
          throw new Error('Failed to start dialogue for test');
        }
        window.game.dialogueBox.skipTypewriter();
      },
      { npcId: NPC_ID, dialogueId: DIALOGUE_ID }
    );

    await page.waitForFunction(
      () => window.game.dialogueBox?.visible === true,
      { timeout: 5000 }
    );

    const startState = await page.evaluate(({ npcId }) => {
      const snapshot = window.game.worldStateStore.snapshot();
      return {
        active: snapshot.dialogue.active,
        transcript: snapshot.dialogue.historyByNpc[npcId] ?? [],
        box: {
          text: window.game.dialogueBox.text,
          hasChoices: window.game.dialogueBox.hasChoices,
          choices: window.game.dialogueBox.choices.map((choice) => ({
            id: choice.id,
            text: choice.text,
          })),
        },
      };
    }, { npcId: NPC_ID });

    expect(startState.active).toBeTruthy();
    expect(startState.active.dialogueId).toBe(DIALOGUE_ID);
    expect(startState.box.text.length).toBeGreaterThan(0);
    expect(startState.box.hasChoices).toBe(true);
    expect(startState.box.choices.length).toBeGreaterThan(0);
    expect(startState.transcript[0]?.type).toBe('node');

    const afterChoiceState = await page.evaluate(({ npcId }) => {
      window.game.dialogueBox.skipTypewriter();
      const choiceResult = window.game.gameSystems.dialogue.selectChoice(0);
      const activeNode = window.game.gameSystems.dialogue.activeDialogue?.currentNode ?? null;
      const snapshot = window.game.worldStateStore.snapshot();
      return {
        choiceResult,
        activeNode,
        nodeId: snapshot.dialogue.active?.nodeId,
        transcript: snapshot.dialogue.historyByNpc[npcId] ?? [],
      };
    }, { npcId: NPC_ID });

    expect(afterChoiceState.choiceResult).toBe(true);
    expect(afterChoiceState.activeNode).toBe(EXPECTED_NEXT_NODE);
    expect(afterChoiceState.nodeId).toBe(EXPECTED_NEXT_NODE);
    expect(afterChoiceState.transcript.some((entry) => entry.type === 'choice')).toBe(true);
    expect(consoleErrors).toEqual([]);
  });
});
