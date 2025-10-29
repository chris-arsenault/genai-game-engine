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

    const stateSelector = '#debug-audio-state';

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
      await page.waitForFunction(
        ({ selector, expected }) => {
          const el = document.querySelector(selector);
          return (
            el &&
            typeof el.textContent === 'string' &&
            el.textContent.toLowerCase().includes(expected.toLowerCase())
          );
        },
        { selector: stateSelector, expected: state },
        { timeout: 3000 }
      );
    };

    await waitForState('ambient');

    // Stealth engagement via disguise equip
    await page.evaluate(() => {
      window.game?.eventBus?.emit('disguise:equipped', { factionId: 'cipher_collective' });
    });
    await waitForState('stealth');

    // Combat escalation overrides stealth
    await page.evaluate(() => {
      window.game?.eventBus?.emit('combat:initiated', { source: 'test' });
    });
    await waitForState('combat');

    // Combat resolution falls back to stealth since disguise persists
    await page.evaluate(() => {
      window.game?.eventBus?.emit('combat:resolved', { source: 'test' });
    });
    await waitForState('stealth');

    // Removing disguise clears stealth state back to ambient mix
    await page.evaluate(() => {
      window.game?.eventBus?.emit('disguise:removed', { factionId: 'cipher_collective' });
    });
    await waitForState('ambient');

    expect(errors).toEqual([]);
  });
});
