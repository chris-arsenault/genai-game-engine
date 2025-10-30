import { generateCrossroadsLightingReport } from '../../../src/game/tools/Act2CrossroadsLightingPreviewer.js';

describe('Act2CrossroadsLightingPreviewer', () => {
  it('classifies segments as ok when projected luminance stays within thresholds', () => {
    const config = {
      accents: [
        {
          id: 'crossroads_selection_conduit',
          color: '#2c6df0',
          alpha: 0.2,
          assetId: 'crossroads_selection_conduit_v1',
          metadata: {
            lightingPreset: 'safehouse_idle',
            overlayAverageAlpha: 0.2,
          },
        },
      ],
    };
    const overlayStats = new Map([
      [
        'crossroads_selection_conduit',
        {
          averageAlphaNormalized: 0.2,
        },
      ],
    ]);

    const { entries, summary } = generateCrossroadsLightingReport({
      config,
      overlayStats,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('ok');
    expect(summary.statusCounts.ok).toBe(1);
  });

  it('flags hotspots when projected luminance exceeds preset maximum', () => {
    const config = {
      accents: [
        {
          id: 'crossroads_safehouse_light_arc',
          color: '#ffffff',
          alpha: 1,
          assetId: 'crossroads_safehouse_light_arc_v1',
          metadata: {
            lightingPreset: 'safehouse_idle',
            overlayAverageAlpha: 0.9,
          },
        },
      ],
    };
    const overlayStats = new Map([
      [
        'crossroads_safehouse_light_arc',
        {
          averageAlphaNormalized: 0.9,
        },
      ],
    ]);

    const { entries, summary } = generateCrossroadsLightingReport({
      config,
      overlayStats,
    });

    expect(entries[0].status).toBe('hotspot');
    expect(entries[0].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'hotspot',
        }),
      ])
    );
    expect(summary.hotspots).toHaveLength(1);
  });

  it('marks metadata drift when overlayAverageAlpha diverges from overlay stats', () => {
    const config = {
      lightColumns: [
        {
          id: 'crossroads_column_safehouse_left',
          color: '#ffffff',
          alpha: 0.2,
          assetId: 'crossroads_column_safehouse_left_v1',
          metadata: {
            lightingPreset: 'selection_ready',
            overlayAverageAlpha: 0.15,
          },
        },
      ],
    };
    const overlayStats = new Map([
      [
        'crossroads_column_safehouse_left',
        {
          averageAlphaNormalized: 0.2,
        },
      ],
    ]);

    const { entries, summary } = generateCrossroadsLightingReport({
      config,
      overlayStats,
      overlayAlphaTolerance: 0.01,
    });

    expect(entries[0].status).toBe('metadata-drift');
    expect(summary.metadataDrift).toHaveLength(1);
    expect(entries[0].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'metadata-drift',
        }),
      ])
    );
  });

  it('returns missing-overlay status when overlay stats are unavailable', () => {
    const config = {
      accents: [
        {
          id: 'crossroads_checkpoint_glow',
          color: '#33a1ff',
          alpha: 0.5,
          assetId: 'crossroads_checkpoint_glow_v1',
          metadata: {
            lightingPreset: 'checkpoint_active',
          },
        },
      ],
    };

    const { entries, summary } = generateCrossroadsLightingReport({
      config,
      overlayStats: new Map(),
    });

    expect(entries[0].status).toBe('missing-overlay');
    expect(entries[0].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-overlay',
        }),
      ])
    );
    expect(summary.missingOverlays).toHaveLength(1);
  });

  it('reports missing-preset when lightingPreset metadata is absent', () => {
    const config = {
      accents: [
        {
          id: 'crossroads_checkpoint_glow',
          color: '#33a1ff',
          alpha: 0.5,
          assetId: 'crossroads_checkpoint_glow_v1',
          metadata: {},
        },
      ],
    };
    const overlayStats = new Map([
      [
        'crossroads_checkpoint_glow',
        {
          averageAlphaNormalized: 0.2,
        },
      ],
    ]);

    const { entries, summary } = generateCrossroadsLightingReport({
      config,
      overlayStats,
    });

    expect(entries[0].status).toBe('missing-preset');
    expect(summary.missingPresets).toHaveLength(1);
  });
});
