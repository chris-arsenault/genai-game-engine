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
      await testInfo.attach('debug-fx-telemetry-capture-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Debug overlay FX metrics panel', () => {
  test('updates metrics view responsively without stealing focus', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    const activeBefore = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(activeBefore).toBe('BODY');

    await page.keyboard.press('F3');
    await page.waitForSelector('#debug-overlay.visible', { timeout: 4000 });

    const activeAfter = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(activeAfter).toBe('BODY');

    await page.waitForFunction(() => {
      const activeEl = document.getElementById('debug-fx-active');
      if (activeEl && activeEl.textContent?.trim() === '6') {
        return true;
      }
      const bus = window.game?.eventBus;
      if (bus && typeof bus.emit === 'function') {
        const nowSeconds = performance.now() / 1000;
        bus.emit('fx:metrics_sample', {
          timestamp: nowSeconds,
          intervalSeconds: 0.25,
          throughputPerSecond: 18,
          active: 6,
          queued: 3,
          averages: { throughput: 12, active: 4, queued: 2 },
          peaks: { active: 8, throughput: 22 },
          totals: { accepted: 120, deferred: 8, dropped: 1, replayed: 2 },
        });
      }
      return false;
    });

    const throughputText = await page.textContent('#debug-fx-throughput');
    expect(throughputText).toContain('18.0');

    await page.waitForFunction(() => {
      const warning = document.getElementById('debug-fx-warning');
      if (warning?.dataset.state === 'warning') {
        return true;
      }
      const bus = window.game?.eventBus;
      if (bus && typeof bus.emit === 'function') {
        const nowSeconds = performance.now() / 1000;
        bus.emit('fx:metrics_warning', {
          timestamp: nowSeconds,
          throughputPerSecond: 28,
          active: 9,
          queued: 5,
          totals: { accepted: 140, deferred: 10, dropped: 2 },
          reasons: { throughput: true, active: true, queued: false },
        });
      }
      return false;
    });
    const warningText = await page.textContent('#debug-fx-warning');
    expect(warningText).toMatch(/Warning/);

    await page.evaluate(() => {
      const overlay = document.getElementById('debug-overlay');
      if (!overlay) {
        throw new Error('Debug overlay not found for layout test');
      }
      overlay.style.width = '320px';
      overlay.style.maxWidth = '320px';
    });

    const columnsWideHandle = await page.waitForFunction(() => {
      const grid = document.getElementById('debug-fx-grid');
      if (!grid) {
        return undefined;
      }
      const count = window
        .getComputedStyle(grid)
        .gridTemplateColumns.split(/\s+/)
        .filter(Boolean).length;
      return count >= 2 ? count : undefined;
    });
    const columnsWide = await columnsWideHandle.jsonValue();
    expect(columnsWide).toBeGreaterThanOrEqual(2);

    await page.evaluate(() => {
      const overlay = document.getElementById('debug-overlay');
      if (!overlay) {
        throw new Error('Debug overlay not found for narrow layout test');
      }
      overlay.style.width = '200px';
      overlay.style.maxWidth = '200px';
    });

    const columnsNarrowHandle = await page.waitForFunction(() => {
      const grid = document.getElementById('debug-fx-grid');
      if (!grid) {
        return undefined;
      }
      const count = window
        .getComputedStyle(grid)
        .gridTemplateColumns.split(/\s+/)
        .filter(Boolean).length;
      return count === 1 ? count : undefined;
    });
    const columnsNarrow = await columnsNarrowHandle.jsonValue();
    expect(columnsNarrow).toBe(1);

    expect(consoleErrors).toEqual([]);
  });
});
