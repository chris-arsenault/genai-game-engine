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
      await testInfo.attach('detective-vision-fx-telemetry-capture-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Detective vision AR-007 FX coverage', () => {
  test('emits particle presets for detective vision and forensic cues', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () =>
        Boolean(
          window.game?.eventBus &&
            window.game?.gameSystems?.investigation &&
            window.game?.detectiveVisionOverlay
        ),
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const existing = window.__ar007FxCoverage;
      existing?.offComposite?.();
      existing?.offParticle?.();

      const { eventBus } = window.game;
      const composite = [];
      const particles = [];

      const offComposite = eventBus.on('fx:composite_cue', (payload) => {
        composite.push({ ...payload });
      });
      const offParticle = eventBus.on('fx:particle_emit', (payload) => {
        particles.push({ ...payload });
      });

      window.__ar007FxCoverage = { composite, particles, offComposite, offParticle };
    });

    await page.evaluate(() => {
      const { gameSystems } = window.game;
      const investigation = gameSystems?.investigation;
      if (!investigation) {
        throw new Error('Investigation system not available during AR-007 coverage test');
      }
      investigation.unlockAbility('detective_vision');
      investigation.detectiveVisionEnergy = investigation.detectiveVisionEnergyMax;
      investigation.detectiveVisionCooldown = 0;
      investigation.activateDetectiveVision();
    });

    const rainHandle = await page.waitForFunction(() => {
      const list = window.__ar007FxCoverage?.particles ?? [];
      return list.find((payload) => payload?.preset === 'detective-vision-rainfall') ?? undefined;
    }, { timeout: 7000 });
    const rain = await rainHandle.jsonValue();
    expect(rain.preset).toBe('detective-vision-rainfall');

    const neonHandle = await page.waitForFunction(() => {
      const list = window.__ar007FxCoverage?.particles ?? [];
      return list.find((payload) => payload?.preset === 'detective-vision-neon-bloom') ?? undefined;
    }, { timeout: 7000 });
    const neon = await neonHandle.jsonValue();
    expect(neon.preset).toBe('detective-vision-neon-bloom');

    await page.waitForTimeout(900);

    await page.evaluate(() => {
      const { eventBus } = window.game;
      if (!eventBus || typeof eventBus.emit !== 'function') {
        throw new Error('Event bus unavailable for AR-007 memory cue test');
      }
      eventBus.emit('fx:composite_cue', {
        effectId: 'detectiveVisionMemoryFragmentBurst',
        preset: 'detective-vision-memory-fragment',
        durationMs: 820,
        source: 'playwright-ar007',
        context: { highlightCount: 3 },
        concurrency: { effect: 0, global: 0, queued: 0 },
      });
    });

    const memoryHandle = await page.waitForFunction(() => {
      const list = window.__ar007FxCoverage?.particles ?? [];
      return (
        list.find((payload) => payload?.preset === 'detective-vision-memory-fragment') ?? undefined
      );
    }, { timeout: 4000 });
    const memory = await memoryHandle.jsonValue();
    expect(memory.preset).toBe('detective-vision-memory-fragment');

    await page.evaluate(() => {
      const { eventBus } = window.game;
      eventBus.emit('fx:overlay_cue', {
        effectId: 'forensicPulse',
        origin: 'forensic',
        stage: 'queued',
        duration: 0.65,
      });
      eventBus.emit('fx:overlay_cue', {
        effectId: 'forensicRevealFlash',
        origin: 'forensic',
        stage: 'complete',
      });
    });

    const forensicPulseHandle = await page.waitForFunction(() => {
      const list = window.__ar007FxCoverage?.particles ?? [];
      return list.find((payload) => payload?.preset === 'forensic-scan-pulse') ?? undefined;
    }, { timeout: 4000 });
    const forensicPulse = await forensicPulseHandle.jsonValue();
    expect(forensicPulse.preset).toBe('forensic-scan-pulse');

    const forensicRevealHandle = await page.waitForFunction(() => {
      const list = window.__ar007FxCoverage?.particles ?? [];
      return list.find((payload) => payload?.preset === 'forensic-reveal-veil') ?? undefined;
    }, { timeout: 4000 });
    const forensicReveal = await forensicRevealHandle.jsonValue();
    expect(forensicReveal.preset).toBe('forensic-reveal-veil');

    const spriteIds = await page.evaluate(() => {
      const runtime = window.game?.particleEmitterRuntime;
      if (!runtime) {
        return [];
      }
      const ids = new Set();
      for (const emitter of runtime.emitters) {
        if (!emitter?.particles) {
          continue;
        }
        for (const particle of emitter.particles) {
          if (particle?.sprite?.id) {
            ids.add(particle.sprite.id);
          }
        }
      }
      return Array.from(ids);
    });
    expect(spriteIds).toEqual(expect.arrayContaining(['ar007-neon']));

    const presetSpriteIds = await page.evaluate(() => {
      const runtime = window.game?.particleEmitterRuntime;
      if (!runtime) {
        return null;
      }
      return {
        rain: runtime.options.presets['detective-vision-rainfall']?.spriteSheetId ?? null,
        neon: runtime.options.presets['detective-vision-neon-bloom']?.spriteSheetId ?? null,
        memory: runtime.options.presets['detective-vision-memory-fragment']?.spriteSheetId ?? null,
      };
    });
    expect(presetSpriteIds).toEqual({
      rain: 'ar007-rain',
      neon: 'ar007-neon',
      memory: 'ar007-memory',
    });

    const compositeEffects = await page.evaluate(() => {
      return (window.__ar007FxCoverage?.composite ?? []).map((payload) => payload?.effectId);
    });
    expect(compositeEffects).toEqual(
      expect.arrayContaining([
        'detectiveVisionRainfall',
        'detectiveVisionNeonBloom',
        'detectiveVisionMemoryFragmentBurst',
        'forensicPulse',
        'forensicRevealFlash',
      ])
    );

    const overlayStatus = await page.evaluate(() => {
      const overlay = window.game?.detectiveVisionOverlay;
      return overlay?.getStatus?.() ?? null;
    });
    expect(overlayStatus).not.toBeNull();
    expect(overlayStatus.active).toBe(true);
    expect(overlayStatus.energyPercent).toBeGreaterThan(0);

    await page.evaluate(() => {
      const coverage = window.__ar007FxCoverage;
      coverage?.offComposite?.();
      coverage?.offParticle?.();
      delete window.__ar007FxCoverage;
      const { gameSystems } = window.game;
      gameSystems?.investigation?.deactivateDetectiveVision?.({ reason: 'test_cleanup' });
    });

    expect(consoleErrors).toEqual([]);
  });
});
