import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

const NPC_ID = 'black_market_broker';
const DIALOGUE_ID = 'black_market_broker';
const PURCHASE_CHOICE = 'Here. Transfer the routes.';
const OPENING_CHOICE = 'I need a map through the transit tunnels.';

async function seedCredits(page, amount) {
  await page.evaluate((credits) => {
    const payload = {
      id: 'credits',
      name: 'Credits',
      type: 'Currency',
      quantity: credits,
      tags: ['currency', 'currency:credits', 'source:playwright_seed'],
      metadata: {
        source: 'playwright_seed',
        seededBy: 'vendor-black-market-flow.spec',
      },
    };

    window.game.eventBus.emit('inventory:item_added', payload);
    if (typeof window.game.update === 'function') {
      window.game.update(0.016);
    }
  }, amount);

  await page.waitForFunction((credits) => {
    const state = window.game?.worldStateStore?.getState?.();
    if (!state?.inventory?.items) {
      return false;
    }
    const entry = state.inventory.items.find((item) => item.id === 'credits');
    return Boolean(entry && entry.quantity >= credits);
  }, amount, { timeout: 2000 });
}

test.describe('Black market vendor flow', () => {
  test('vendor purchase populates inventory metadata and spends credits', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.eventBus && window.game?.worldStateStore,
      { timeout: 5000 }
    );

    await seedCredits(page, 120);

    const result = await page.evaluate(
      ({ npcId, dialogueId, openingChoice, purchaseChoice }) => {
        const { game } = window;
        const dialogueSystem = game.gameSystems.dialogue;

        const ensureActive = () => {
          if (!dialogueSystem.activeDialogue) {
            throw new Error('Dialogue is not active');
          }
        };

        const selectChoiceByText = (choiceText) => {
          ensureActive();
          const { currentNode, context, tree } = dialogueSystem.activeDialogue;
          const choices = tree.getAvailableChoices(currentNode, context);
          const index = choices.findIndex((choice) => choice.text === choiceText);

          if (index === -1) {
            const labels = choices.map((choice) => choice.text);
            throw new Error(`Choice "${choiceText}" not found. Available choices: ${labels.join(', ')}`);
          }

          const success = dialogueSystem.selectChoice(index);
          if (!success) {
            throw new Error(`Failed to select choice "${choiceText}"`);
          }

          if (game.dialogueBox?.skipTypewriter) {
            game.dialogueBox.skipTypewriter();
          }
        };

        const advanceIfPossible = () => {
          if (dialogueSystem.isDialogueActive()) {
            dialogueSystem.advanceDialogue();
            if (game.dialogueBox?.skipTypewriter) {
              game.dialogueBox.skipTypewriter();
            }
          }
        };

        if (!dialogueSystem.caseManager || typeof dialogueSystem.caseManager.getActiveCase !== 'function') {
          dialogueSystem.caseManager = { getActiveCase: () => null };
        }

        const started = dialogueSystem.startDialogue(npcId, dialogueId);
        if (!started) {
          return { started: false };
        }

        if (game.dialogueBox?.skipTypewriter) {
          game.dialogueBox.skipTypewriter();
        }

        selectChoiceByText(openingChoice);
        selectChoiceByText(purchaseChoice);

        // Trigger purchase consequences and exit dialogue
        advanceIfPossible(); // purchase node -> wrap up (applies consequences)
        advanceIfPossible(); // wrap up -> end

        const state = game.worldStateStore.getState();
        const inventory = state.inventory ?? { items: [] };
        const intel = inventory.items.find((item) => item.id === 'intel_parlor_transit_routes');
        const credits = inventory.items.find((item) => item.id === 'credits');

        return {
          started,
          dialogueActive: dialogueSystem.isDialogueActive(),
          intel,
          creditsQuantity: credits?.quantity ?? null,
        };
      },
      {
        npcId: NPC_ID,
        dialogueId: DIALOGUE_ID,
        openingChoice: OPENING_CHOICE,
        purchaseChoice: PURCHASE_CHOICE,
      }
    );

    expect(result.started).toBe(true);
    expect(result.dialogueActive).toBe(false);
    expect(result.intel).toBeTruthy();

    expect(result.intel.metadata?.vendorId).toBe('black_market_broker');
    expect(result.intel.metadata?.vendorName).toBe('Black Market Broker');
    expect(result.intel.metadata?.vendorFaction).toBe('smugglers');
    expect(result.intel.metadata?.transactionCost?.credits).toBe(80);
    expect(result.intel.tags).toContain('vendor:black_market_broker');
    expect(result.intel.metadata?.transactionContext?.dialogueId).toBe(DIALOGUE_ID);
    expect(result.creditsQuantity).toBe(40);
    expect(consoleErrors).toEqual([]);
  });
});
