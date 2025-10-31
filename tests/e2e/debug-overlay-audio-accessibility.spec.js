import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { captureTelemetryArtifacts } from './utils/telemetryArtifacts.js';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'skipped') {
    return;
  }
  try {
    await captureTelemetryArtifacts(page, testInfo, { formats: ['json'] });
  } catch (error) {
    if (typeof testInfo.attach === 'function') {
      const message =
        error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      await testInfo.attach('debug-audio-telemetry-capture-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Debug overlay audio accessibility', () => {
  test('keyboard shortcut and focus trap navigate audio controls', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    const sfxSummary = await page.evaluate(() => {
      const entries = window.game?.getSfxCatalogEntries?.() ?? [];
      return {
        count: entries.length,
        firstId: entries[0]?.id ?? null,
      };
    });
    expect(sfxSummary.count).toBeGreaterThan(0);
    expect(sfxSummary.firstId).not.toBeNull();

    await page.keyboard.press('F3');
    await page.waitForSelector('#debug-overlay.visible', { timeout: 4000 });

    await page.keyboard.press('Shift+Alt+A');
    await page.waitForFunction(() => document.activeElement?.id === 'debug-sfx-filter');
    await page.waitForSelector('.debug-sfx-row button', { timeout: 5000 });
    await page.focus('#debug-sfx-filter');

    const focusState = await page.evaluate(() => ({
      overlaySection: document.getElementById('debug-overlay')?.dataset.focusSection ?? null,
      audioActive: document.getElementById('debug-audio')?.dataset.focusActive ?? null,
    }));
    expect(focusState.overlaySection).toBe('audio');
    expect(focusState.audioActive).toBe('true');

    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => Boolean(document.activeElement?.dataset?.sfxId), { timeout: 5000 });
    const firstFocusedId = await page.evaluate(() => document.activeElement?.dataset?.sfxId ?? null);
    expect(firstFocusedId).toBe(sfxSummary.firstId);

    if (sfxSummary.count > 1) {
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => Boolean(document.activeElement?.dataset?.sfxId));
      const secondFocusedId = await page.evaluate(() => document.activeElement?.dataset?.sfxId ?? null);
      expect(secondFocusedId).not.toBeNull();
      expect(secondFocusedId).not.toBe(firstFocusedId);
    }

    await page.keyboard.press('Tab');
    const focusAfterTab = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) {
        return { id: null, tag: null, sfxId: null };
      }
      return {
        id: active.id ?? null,
        tag: active.tagName ?? null,
        sfxId: active.dataset?.sfxId ?? null,
      };
    });
    expect(
      focusAfterTab.id === 'debug-sfx-filter' ||
        focusAfterTab.sfxId != null ||
        focusAfterTab.tag === 'BUTTON',
    ).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.getElementById('debug-audio')?.dataset.focusActive,
    );
    const activeAfterEscape = await page.evaluate(() => {
      const active = document.activeElement;
      const canvas = document.getElementById('game-canvas');
      return {
        isCanvas: active === canvas,
        tag: active?.tagName ?? null,
        id: active?.id ?? null,
      };
    });
    expect(activeAfterEscape.isCanvas).toBe(true);

    expect(consoleErrors).toEqual([]);
  });
});
