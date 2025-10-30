import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { captureTelemetryArtifacts } from './utils/telemetryArtifacts.js';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'skipped') {
    return;
  }
  try {
    await captureTelemetryArtifacts(page, testInfo, { formats: ['json', 'csv'] });
  } catch (error) {
    if (typeof testInfo.attach === 'function') {
      const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      await testInfo.attach('debug-inventory-telemetry-capture-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

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
      window.game.eventBus.emit('inventory:item_added', {
        id: 'evidence_playwright_probe',
        name: 'Playwright Probe Evidence',
        type: 'Evidence',
        quantity: 1,
        tags: ['evidence', 'source:playwright'],
        metadata: { seededBy: 'debug-overlay-inventory.spec' }
      });
      if (typeof window.game.update === 'function') {
        window.game.update(0.016);
      }
    });

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
    expect(updatedInventory.text).toMatch(/item/i);
    expect(updatedInventory.text).toContain('evidence');
    expect(consoleErrors).toEqual([]);
  });
});
