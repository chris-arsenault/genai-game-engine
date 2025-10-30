import path from 'node:path';
import {
  loadAct2CrossroadsArtManifest,
  summarizeAct2CrossroadsArtValidation,
  validateAct2CrossroadsArtBundle,
} from '../../../src/game/tools/Act2CrossroadsArtValidator.js';
import { Act2CrossroadsArtConfig } from '../../../src/game/data/sceneArt/Act2CrossroadsArtConfig.js';

describe('Act2CrossroadsArtValidator', () => {
  const manifestPath = path.resolve(
    process.cwd(),
    'assets/manifests/act2-crossroads-art.json'
  );

  it('passes when config and manifest cover all required segments', async () => {
    const manifest = await loadAct2CrossroadsArtManifest(manifestPath);

    const result = validateAct2CrossroadsArtBundle({
      config: Act2CrossroadsArtConfig,
      manifest,
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.coverage.floors.missing).toEqual([]);
    expect(result.coverage.boundaries.present).toBeGreaterThanOrEqual(4);
  });

  it('flags missing required segments as errors', () => {
    const bareConfig = {
      floors: [],
      accents: [],
      lightColumns: [],
      boundaries: [],
    };

    const result = validateAct2CrossroadsArtBundle({
      config: bareConfig,
      manifest: {},
    });

    expect(result.ok).toBe(false);
    expect(result.coverage.floors.missing).toContain('crossroads_floor_safehouse');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          segmentId: 'crossroads_floor_safehouse',
        }),
      ])
    );
  });

  it('reports warnings when art lacks assetId or metadata', async () => {
    const manifest = await loadAct2CrossroadsArtManifest(manifestPath);
    const manifestSafehouse = manifest.floors.find(
      (entry) => entry?.id === 'crossroads_floor_safehouse'
    );
    if (manifestSafehouse) {
      manifestSafehouse.assetId = '';
      manifestSafehouse.metadata = {};
    }
    const customConfig = {
      floors: [
        {
          id: 'crossroads_floor_safehouse',
          color: '#123456',
          alpha: 0.9,
          assetId: '',
          metadata: null,
        },
      ],
      accents: [],
      lightColumns: [],
      boundaries: [],
    };

    const result = validateAct2CrossroadsArtBundle({
      config: customConfig,
      manifest,
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          segmentId: 'crossroads_floor_safehouse',
        }),
      ])
    );

    const summary = summarizeAct2CrossroadsArtValidation(result);
    expect(summary.status).toBe('pass');
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          segmentId: 'crossroads_floor_safehouse',
          message: expect.stringContaining('missing an assetId'),
        }),
        expect.objectContaining({
          segmentId: 'crossroads_floor_safehouse',
          message: expect.stringContaining('lacks metadata object'),
        }),
      ])
    );
  });
});
