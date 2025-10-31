import { test, expect } from '@playwright/test';
import { waitForGameLoad } from './setup.js';

test.describe('District travel overlay traversal gating', () => {
  test('opens overlay and surfaces blockers when traversal is denied', async ({ page }) => {
    await waitForGameLoad(page);

    const initialState = await page.evaluate(() => ({
      visible: Boolean(window.game?.districtTravelOverlay?.visible),
    }));
    expect(initialState.visible).toBe(false);

    await page.evaluate(() => {
      const game = window.game;
      if (!game) {
        throw new Error('Game instance not available');
      }
      const playerId = game.playerEntityId;
      if (!Number.isFinite(playerId)) {
        throw new Error('Player entity not initialised');
      }

      game.eventBus.emit('navigation:movement_blocked', {
        entityId: playerId,
        reason: 'locked_surface',
        surfaceId: 'branch_walkway',
        surfaceTags: ['transition', 'checkpoint'],
        sceneId: game.activeScene?.id ?? null,
      });
    });

    await page.waitForFunction(
      () => Boolean(window.game?.districtTravelOverlay?.visible === true),
      { timeout: 5000 }
    );

    const overlayState = await page.evaluate(() => {
      const overlay = window.game?.districtTravelOverlay;
      if (!overlay) {
        return null;
      }
      const selected = typeof overlay.getSelectedEntry === 'function'
        ? overlay.getSelectedEntry()
        : null;
      return {
        visible: Boolean(overlay.visible),
        notice: overlay.lastTraversalNotice ?? null,
        selectedStatus: selected?.status ?? null,
        selectedDistrict: selected?.districtId ?? null,
      };
    });

    expect(overlayState).not.toBeNull();
    expect(overlayState.visible).toBe(true);
    expect(overlayState.notice).not.toBeNull();
    expect(overlayState.notice.reason).toBe('locked_surface');
    expect(overlayState.notice.surfaceTags).toEqual(
      expect.arrayContaining(['transition'])
    );
    expect(overlayState.selectedStatus).not.toBeNull();
    expect(overlayState.selectedStatus.accessible).toBe(false);
  });
});
