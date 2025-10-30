import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

test.describe('Adaptive audio transitions', () => {
  test('respond to disguise and combat events with telemetry updates', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await waitForGameLoad(page);

    await page.evaluate(async () => {
      if (window.game?.loadMemoryParlorScene) {
        await window.game.loadMemoryParlorScene({ reason: 'playwright_test' });
      }
      if (window.game?.gameSystems?.disguise) {
        window.game.gameSystems.disguise.config.combatResolutionDelayMs = 250;
      }
    });

    await page.waitForFunction(
      () => {
        const game = window.game;
        if (!game || typeof game.getAdaptiveAudioTelemetry !== 'function') {
          return false;
        }
        const snapshot = game.getAdaptiveAudioTelemetry();
        return snapshot && typeof snapshot.currentState === 'string';
      },
      null,
      { timeout: 8000 }
    );

    // Enable debug overlay so audio telemetry renders
    await page.keyboard.press('F3');
    await page.waitForTimeout(600);

    const waitForState = async (state) => {
      await page.waitForFunction(
        (expected) => {
          const game = window.game;
          if (!game || typeof game.getAdaptiveAudioTelemetry !== 'function') {
            return false;
          }
          const snapshot = game.getAdaptiveAudioTelemetry();
          return snapshot && snapshot.currentState === expected;
        },
        state,
        { timeout: 8000 }
      );
    };

    await waitForState('ambient');

    // Stealth engagement via disguise equip
    await page.evaluate(() => {
      const game = window.game;
      if (!game) return;
      const playerId = game.playerEntityId;
      if (playerId != null) {
        const faction = game.componentRegistry?.getComponent(playerId, 'FactionMember');
        if (faction && game.gameSystems?.factionReputation) {
          const system = game.gameSystems.factionReputation;
          system.playerEntityId = playerId;
          system.playerFactionMember = faction;
          system.equipDisguise('cipher_collective');
        }
      }
    });
    await waitForState('stealth');

    // Suspicion spike triggers alert mix
    await page.evaluate(() => {
      const game = window.game;
      game?.gameSystems?.disguise?.onSuspiciousAction('running', 40);
      game?.gameSystems?.disguise?.update?.(0);
    });
    await waitForState('alert');

    // Combat escalation overrides alert by blowing the disguise
    await page.evaluate(() => {
      const game = window.game;
      if (!game) return;
      const playerId = game.playerEntityId;
      const faction = game.componentRegistry?.getComponent(playerId, 'FactionMember');
      const disguise = game.componentRegistry?.getComponent(playerId, 'Disguise');
      if (playerId != null && faction && disguise) {
        disguise.suspicionLevel = 100;
        game.gameSystems.disguise.blowDisguise(playerId, faction, disguise);
      }
    });
    await waitForState('combat');

    // Wait for combat resolution and suspicion clear (delay tuned above)
    await page.waitForTimeout(600);
    await waitForState('ambient');

    // Re-equipping disguise returns to stealth mix
    await page.evaluate(() => {
      const game = window.game;
      game?.gameSystems?.factionReputation?.equipDisguise('cipher_collective');
    });
    await waitForState('stealth');

    expect(errors).toEqual([]);
  });
});
