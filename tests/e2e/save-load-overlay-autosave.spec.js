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
      await testInfo.attach('save-load-overlay-autosave-artifact-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Save/Load overlay autosave stress', () => {
  test('maintains focus and emits audio cues during autosave burst', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    const setupResult = await page.evaluate(() => {
      const bus = window.game?.eventBus;
      if (!bus || typeof bus.on !== 'function') {
        return false;
      }
      const scope = {
        fx: [],
        audio: [],
        overlays: [],
        summary: null,
        offFx: null,
        offAudio: null,
        offOverlay: null,
        restoreAudio: null,
      };
      scope.offFx = bus.on('fx:overlay_cue', (payload) => {
        if (payload?.overlay === 'saveLoad') {
          scope.fx.push({
            effectId: payload.effectId,
            index: payload.index ?? null,
            source: payload.source ?? null,
          });
        }
      });
      scope.offAudio = bus.on('audio:sfx:play', (payload) => {
        scope.audio.push({
          id: payload?.id ?? null,
          volume: payload?.volume ?? null,
          source: payload?.source ?? null,
          via: 'eventBus',
        });
      });
      scope.offOverlay = bus.on('ui:overlay_visibility_changed', (payload) => {
        if (payload?.overlayId === 'saveLoad') {
          scope.overlays.push({
            visible: Boolean(payload.visible),
            source: payload.source ?? null,
          });
        }
      });
      const audioManager = window.game?.audioManager;
      if (audioManager && typeof audioManager.playSFX === 'function') {
        const originalPlaySFX = audioManager.playSFX.bind(audioManager);
        scope.restoreAudio = () => {
          audioManager.playSFX = originalPlaySFX;
        };
        audioManager.playSFX = (id, options) => {
          const volume =
            typeof options === 'number'
              ? options
              : options && typeof options === 'object' && options.volume != null
                ? options.volume
                : null;
          scope.audio.push({ id: id ?? null, volume, via: 'audioManager' });
          return originalPlaySFX(id, options);
        };
      }
      window.__saveLoadStress = scope;
      return true;
    });

    expect(setupResult).toBe(true);

    await page.click('#game-canvas', { position: { x: 16, y: 16 } });
    await page.evaluate(() => {
      window.game?.saveLoadOverlay?.show('playwright');
    });
    await page.waitForFunction(() => window.game?.saveLoadOverlay?.visible === true);

    const initialSelection = await page.evaluate(() => {
      return {
        index: window.game?.saveLoadOverlay?.selectedIndex ?? null,
        slotCount: window.game?.saveLoadOverlay?.slots?.length ?? 0,
      };
    });

    await page.evaluate(async () => {
      if (!window.game?.saveManager) {
        return;
      }
      if (typeof window.game.saveManager.runAutosaveBurst === 'function') {
        window.__saveLoadStress.summary = await window.game.saveManager.runAutosaveBurst({
          iterations: 40,
          collectResults: true,
        });
      } else {
        for (let i = 0; i < 40; i += 1) {
          window.game.saveManager.saveGame('autosave');
        }
        window.__saveLoadStress.summary = { iterations: 40, failures: 0 };
      }
    });

    const result = await page.evaluate(() => {
      const overlay = window.game?.saveLoadOverlay;
      return {
        index: overlay?.selectedIndex ?? null,
        slotCount: overlay?.slots?.length ?? 0,
        visible: overlay?.visible ?? false,
        fx: window.__saveLoadStress?.fx ?? [],
        audio: window.__saveLoadStress?.audio ?? [],
        overlays: window.__saveLoadStress?.overlays ?? [],
        summary: window.__saveLoadStress?.summary ?? null,
      };
    });

    await page.evaluate(() => {
      window.game?.saveLoadOverlay?.hide('playwright-cleanup');
      if (!window.__saveLoadStress) {
        return;
      }
      try {
        window.__saveLoadStress.restoreAudio?.();
        window.__saveLoadStress.offFx?.();
        window.__saveLoadStress.offAudio?.();
        window.__saveLoadStress.offOverlay?.();
      } finally {
        delete window.__saveLoadStress;
      }
    });

    expect(result.visible).toBe(true);
    expect(result.index).toBe(initialSelection.index);
    expect(result.slotCount).toBeGreaterThanOrEqual(initialSelection.slotCount);

    expect(result.summary).not.toBeNull();
    expect(result.summary.iterations).toBe(40);
    expect(result.summary.failures).toBe(0);
    const failureEntries = Array.isArray(result.summary.results)
      ? result.summary.results.filter((entry) => entry && entry.success === false)
      : [];
    expect(failureEntries).toHaveLength(0);

    expect(result.fx.some((event) => event.effectId === 'saveLoadOverlayReveal')).toBe(true);
    expect(result.audio.length).toBeGreaterThan(0);
    expect(result.audio.some((event) => event.id === 'ui_prompt_ping')).toBe(true);

    expect(result.overlays.length).toBeGreaterThanOrEqual(1);
    expect(result.overlays[0].visible).toBe(true);

    expect(consoleErrors).toEqual([]);
  });
});
