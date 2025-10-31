import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { GameConfig } from '../../src/game/config/GameConfig.js';

test.describe('Feedback overlays', () => {
  test('render prompts and movement pulses with audio controller active', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.interactionPromptOverlay && window.game?.movementIndicatorOverlay,
      { timeout: 5000 }
    );

    // Trigger an interaction prompt anchored to a world position
    await page.evaluate(() => {
      window.game.eventBus.emit('ui:show_prompt', {
        text: 'Press E to examine evidence',
        position: { x: 512, y: 384 }
      });
    });

    await page.waitForTimeout(100);

    const promptState = await page.evaluate(() => ({
      visible: window.game.interactionPromptOverlay.visible,
      fadeAlpha: window.game.interactionPromptOverlay.fadeAlpha,
      text: window.game.interactionPromptOverlay.prompt?.text ?? null,
      worldPosition: window.game.interactionPromptOverlay.prompt?.worldPosition ?? null,
      targetAlpha: window.game.interactionPromptOverlay.targetAlpha
    }));

    expect(promptState.visible).toBe(true);
    expect(promptState.targetAlpha).toBe(1);
    expect(promptState.fadeAlpha).toBeGreaterThanOrEqual(0);
    expect(promptState.text).toContain('Press E');
    expect(promptState.worldPosition).toEqual({ x: 512, y: 384 });

    // Trigger movement pulse feedback
    await page.evaluate(() => {
      window.game.eventBus.emit('player:moving', {
        position: { x: 520, y: 392 },
        direction: { x: 1, y: 0 }
      });
    });

    await page.waitForTimeout(100);

    const movementState = await page.evaluate(() => {
      const indicator = window.game.movementIndicatorOverlay.indicator;
      return {
        active: indicator != null,
        ttl: indicator?.ttl ?? 0,
        direction: indicator?.direction ?? null
      };
    });

    expect(movementState.active).toBe(true);
    expect(movementState.ttl).toBeGreaterThan(0);
    expect(movementState.direction).toEqual({ x: 1, y: 0 });

    // Audio feedback controller should be initialized and tracking events
    await page.waitForTimeout(100);

    const audioState = await page.evaluate(() => {
      const controller = window.game.audioFeedback;
      return {
        available: Boolean(controller),
        lastMovementStamp: controller?._lastMovementStamp ?? 0,
        lastPromptStamp: controller?._lastPromptStamp ?? 0,
        movementVolume: controller?.options?.movementVolume ?? null,
        promptVolume: controller?.options?.promptVolume ?? null
      };
    });

    expect(audioState.available).toBe(true);
    expect(audioState.lastPromptStamp).toBeGreaterThan(0);
    expect(audioState.lastMovementStamp).toBeGreaterThan(0);
    expect(audioState.movementVolume).toBeCloseTo(GameConfig.audio.sfxVolume * 0.65, 5);
    expect(audioState.promptVolume).toBeCloseTo(GameConfig.audio.sfxVolume * 0.75, 5);
    expect(consoleErrors).toEqual([]);
  });
});
