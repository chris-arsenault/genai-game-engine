import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

test.describe('HUD telemetry overlays', () => {
  test('reputation UI and save inspector surface cascade/tutorial data', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await waitForGameLoad(page);
    const canvas = await page.waitForSelector('#game-canvas');
    await canvas.click({ position: { x: 10, y: 10 } });

    await page.evaluate(() => {
      const store = window.worldStateStore;
      if (!store) {
        throw new Error('WorldStateStore unavailable for HUD telemetry test');
      }
      const now = Date.now();

      store.dispatch({
        type: 'FACTION_ATTITUDE_CHANGED',
        domain: 'faction',
        payload: {
          factionId: 'luminari_syndicate',
          factionName: 'Luminari Syndicate',
          newAttitude: 'friendly',
          oldAttitude: 'neutral',
          cascade: true,
          source: 'vanguard_prime',
          sourceFactionName: 'Vanguard Prime',
        },
        timestamp: now - 1200,
      });

      store.dispatch({
        type: 'TUTORIAL_STARTED',
        domain: 'tutorial',
        payload: { totalSteps: 2 },
        timestamp: now - 4000,
      });

      store.dispatch({
        type: 'TUTORIAL_STEP_STARTED',
        domain: 'tutorial',
        payload: {
          stepId: 'movement',
          stepIndex: 0,
          totalSteps: 2,
          title: 'Move Around',
        },
        timestamp: now - 3000,
      });

      store.dispatch({
        type: 'TUTORIAL_STEP_COMPLETED',
        domain: 'tutorial',
        payload: {
          stepId: 'movement',
          title: 'Move Around',
        },
        timestamp: now - 2000,
      });

      store.dispatch({
        type: 'TUTORIAL_COMPLETED',
        domain: 'tutorial',
        payload: {
          completedSteps: ['movement'],
        },
        timestamp: now - 1500,
      });
    });

    await page.keyboard.press('KeyR');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const ui = window.game?.reputationUI;
      if (ui && !ui.visible && typeof ui.show === 'function') {
        ui.show('e2e-fallback');
      }
    });
    await page.waitForFunction(
      () => Boolean(window.game?.reputationUI?.visible),
      { timeout: 3000 }
    );

    const reputationState = await page.evaluate(() => {
      const ui = window.game?.reputationUI;
      return ui
        ? {
            visible: ui.visible,
            lastCascade: ui.cascadeTelemetry.lastCascadeEvent,
            hotspots: ui.getCascadeHotspots ? ui.getCascadeHotspots(3) : [],
          }
        : null;
    });

    expect(reputationState?.visible).toBe(true);
    expect(reputationState?.lastCascade?.targetFactionId).toBe('luminari_syndicate');
    expect(reputationState?.hotspots?.[0]?.factionId).toBe('luminari_syndicate');

    await page.keyboard.press('KeyO');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const overlay = window.game?.saveInspectorOverlay;
      if (overlay && !overlay.visible && typeof overlay.show === 'function') {
        overlay.show('e2e-fallback');
      }
    });
    await page.waitForFunction(
      () => {
        const overlay = window.game?.saveInspectorOverlay;
        if (!overlay || !overlay.visible) {
          return false;
        }
        const metrics = overlay.summary?.metrics;
        return metrics?.cascadeTargets > 0 && metrics?.tutorialSnapshots > 0;
      },
      { timeout: 4000 }
    );

    const inspectorState = await page.evaluate(() => {
      const overlay = window.game?.saveInspectorOverlay;
      if (!overlay) {
        return null;
      }
      return {
        visible: overlay.visible,
        cascadeTopTarget: overlay.summary.cascade.topTargets[0]?.factionId,
        tutorialLatest: overlay.summary.tutorial.latest?.eventLabel ?? null,
        metrics: overlay.summary.metrics,
      };
    });

    expect(inspectorState?.visible).toBe(true);
    expect(inspectorState?.cascadeTopTarget).toBe('luminari_syndicate');
    expect(inspectorState?.tutorialLatest).toMatch(/Tutorial/i);
    expect(inspectorState?.metrics?.cascadeTargets).toBeGreaterThanOrEqual(1);
    expect(inspectorState?.metrics?.tutorialSnapshots).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });
});
