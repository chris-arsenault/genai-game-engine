import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

test.describe('Debug overlay inventory listing', () => {
  test('reflects inventory overlay state transitions', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.inventoryOverlay != null && window.game?.getOverlayStateSnapshot != null,
      { timeout: 5000 }
    );

    await page.keyboard.press('F3');

    await page.waitForFunction(
      () => document.getElementById('debug-overlay')?.classList.contains('visible'),
      { timeout: 2000 }
    );

    await page.waitForTimeout(650);

    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('#debug-ui-overlays .debug-overlay-row'))
        .some((row) => row.textContent?.trim().startsWith('Inventory:')),
      { timeout: 2000 }
    );

    const initialEntries = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#debug-ui-overlays .debug-overlay-row'));
      return rows.map((row) => ({
        text: row.textContent?.trim() ?? '',
        visible: row.dataset.visible,
      }));
    });

    const initialInventory = initialEntries.find((entry) => entry.text.startsWith('Inventory:'));
    expect(initialInventory).toBeDefined();
    expect(initialInventory.text).toContain('items');
    expect(initialInventory.visible).toBe('false');

    await page.evaluate(() => {
      if (!window.game) {
        throw new Error('Game instance not initialized');
      }
      window.game.inputState.handleKeyDown({ code: 'KeyI', preventDefault() {} });
      window.game.update(0.016);
      window.game.inputState.handleKeyUp({ code: 'KeyI' });
    });

    await page.waitForTimeout(600);

    const updatedEntries = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#debug-ui-overlays .debug-overlay-row'));
      return rows.map((row) => ({
        text: row.textContent?.trim() ?? '',
        visible: row.dataset.visible,
      }));
    });

    const updatedInventory = updatedEntries.find((entry) => entry.text.startsWith('Inventory:'));
    expect(updatedInventory).toBeDefined();
    expect(updatedInventory.visible).toBe('true');
    expect(updatedInventory.text).toContain('items');
    expect(updatedInventory.text).toContain('evidence');
    expect(consoleErrors).toEqual([]);
  });
});
