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
      const message =
        error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      await testInfo.attach('debug-spatial-telemetry-capture-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Debug overlay spatial metrics', () => {
  test('surfaces rolling averages when metrics window is adjusted', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);
    await page.keyboard.press('F3');
    await page.waitForSelector('#debug-overlay.visible', { timeout: 4000 });

    await page.evaluate(() => {
      const engine = window.game?.engine ?? null;
      const systemManager =
        (engine && typeof engine.getSystemManager === 'function'
          ? engine.getSystemManager()
          : engine?.systemManager) ?? null;
      const collisionSystem =
        systemManager?.getSystem?.('collision') ?? window.game?.gameSystems?.collision ?? null;
      if (!collisionSystem?.spatialHash) {
        throw new Error('Collision system spatial hash unavailable');
      }
      const spatialHash = collisionSystem.spatialHash;
      spatialHash.resetMetricsHistory();
      spatialHash.setMetricsWindow(8);
      if (spatialHash.stats) {
        spatialHash.stats.insertions = 0;
        spatialHash.stats.updates = 0;
        spatialHash.stats.removals = 0;
      }

      const seedSample = (count) => {
        spatialHash.clear();
        if (spatialHash.stats) {
          spatialHash.stats.insertions = 0;
          spatialHash.stats.updates = 0;
          spatialHash.stats.removals = 0;
        }
        const size = 12;
        for (let i = 0; i < count; i++) {
          const x = (i % 3) * size * 1.5;
          const y = Math.floor(i / 3) * size * 1.5;
          spatialHash.insert(6000 + i, x, y, size, size);
        }
        spatialHash.getMetrics();
      };

      seedSample(1);
      seedSample(3);
      seedSample(5);
      seedSample(2);
    });

    await page.waitForFunction(() => {
      const meta = document.getElementById('debug-spatial-meta');
      return meta != null && /Avg max \(\d+\/8\)/.test(meta.textContent || '');
    });

    const metaText = await page.textContent('#debug-spatial-meta');
    expect(metaText).toMatch(/Cells:/);
    expect(metaText).toMatch(/Avg max \(\d+\/8\):/);

    const rollingRow = page.locator('#debug-spatial-list .debug-world-row', {
      hasText: 'Rolling avg cells',
    });
    await expect(rollingRow.first()).toBeVisible();
    await expect(rollingRow.first()).toContainText(/samples \d+\/8/);

    expect(consoleErrors).toEqual([]);
  });
});
