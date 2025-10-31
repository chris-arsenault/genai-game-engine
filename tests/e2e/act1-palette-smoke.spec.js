import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

test.describe('Act 1 palette smoke', () => {
  test('exposes crime scene palette summary for verification', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await waitForGameLoad(page);

    const palette = await page.evaluate(() => {
      const summary = window.game?.activeScene?.metadata?.paletteSummary;
      if (!summary) {
        return null;
      }
      return {
        groundDecal: summary.groundDecal || null,
        crimeSceneArea: summary.crimeSceneArea || null,
        cautionTape: Array.isArray(summary.cautionTape)
          ? summary.cautionTape.map((entry) => ({
              color: entry.color,
              alpha: entry.alpha,
              layer: entry.layer,
              zIndex: entry.zIndex,
            }))
          : [],
        evidenceMarkers: Array.isArray(summary.evidenceMarkers)
          ? summary.evidenceMarkers.map((entry) => ({
              color: entry.color,
              alpha: entry.alpha,
              layer: entry.layer,
              zIndex: entry.zIndex,
            }))
          : [],
        ambientProps: Array.isArray(summary.ambientProps)
          ? summary.ambientProps.map((entry) => ({
              id: entry.id,
              color: entry.color,
              alpha: entry.alpha,
              layer: entry.layer,
              zIndex: entry.zIndex,
            }))
          : [],
        boundaries: Array.isArray(summary.boundaries)
          ? summary.boundaries.map((entry) => ({
              color: entry.color,
              alpha: entry.alpha,
              layer: entry.layer,
              zIndex: entry.zIndex,
            }))
          : [],
      };
    });

    expect(palette).not.toBeNull();
    expect(palette.groundDecal).toMatchObject({ color: '#141d2c', layer: 'ground' });
    expect(palette.groundDecal?.alpha ?? 0).toBeCloseTo(0.82, 2);

    expect(palette.crimeSceneArea).toMatchObject({ color: '#ff6f61', layer: 'ground' });
    expect(palette.crimeSceneArea?.alpha ?? 0).toBeCloseTo(0.18, 2);

    expect(palette.cautionTape).toHaveLength(2);
    for (const tape of palette.cautionTape) {
      expect(tape.color).toBe('#f9c74f');
    }

    expect(palette.evidenceMarkers).toHaveLength(4);
    for (const marker of palette.evidenceMarkers) {
      expect(marker.color).toBe('#ffd166');
    }

    expect(palette.ambientProps).toHaveLength(4);
    const propIds = palette.ambientProps.map((prop) => prop.id).sort();
    expect(propIds).toEqual([
      'ambient_evidence_table',
      'ambient_floodlight_left',
      'ambient_floodlight_right',
      'ambient_holo_screen',
    ]);

    expect(palette.boundaries).toHaveLength(4);
    for (const boundary of palette.boundaries) {
      expect(boundary.color).toBe('#2f3d5c');
    }

    expect(consoleErrors).toHaveLength(0);
  });
});
