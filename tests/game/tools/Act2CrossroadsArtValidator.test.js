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

    const summary = summarizeAct2CrossroadsArtValidation(result);
    expect(summary.status).toBe('pass');
    expect(summary.readiness.lighting.total).toBeGreaterThan(0);
    expect(summary.readiness.lighting.missing).toEqual([]);
    expect(summary.readiness.lighting.ready).toBe(summary.readiness.lighting.total);
    expect(summary.readiness.collision.ready).toBe(summary.readiness.collision.total);
    expect(summary.lighting.hotspots).toEqual([]);
    expect(summary.lighting.deviations).toEqual([]);
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
    expect(summary.readiness.lighting.missing).toEqual(
      expect.arrayContaining(['crossroads_floor_safehouse'])
    );
  });

  it('highlights collision readiness gaps for boundary segments missing blockers', async () => {
    const manifest = await loadAct2CrossroadsArtManifest(manifestPath);
    const mutatedManifest = {
      ...manifest,
      boundaries: manifest.boundaries.map((entry) =>
        entry?.id === 'crossroads_boundary_west'
          ? {
              ...entry,
              metadata: {},
              tags: [],
            }
          : { ...entry }
      ),
    };
    const result = validateAct2CrossroadsArtBundle({
      config: Act2CrossroadsArtConfig,
      manifest: mutatedManifest,
    });

    expect(result.ok).toBe(true);
    expect(result.readiness.collision.missing).toContain('crossroads_boundary_west');

    const summary = summarizeAct2CrossroadsArtValidation(result);
    expect(summary.readiness.collision.missing).toContain('crossroads_boundary_west');
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          segmentId: 'crossroads_boundary_west',
          message: expect.stringContaining('lacks collision metadata'),
        }),
      ])
    );
  });

  it('raises an error when a lighting preset cannot be resolved', () => {
    const config = {
      floors: [
        {
          id: 'crossroads_floor_safehouse',
          color: '#123456',
          alpha: 0.9,
          metadata: {
            lightingPreset: 'unknown_preset',
          },
        },
      ],
      accents: [],
      lightColumns: [],
      boundaries: [],
    };

    const result = validateAct2CrossroadsArtBundle({
      config,
      manifest: {},
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          message: expect.stringContaining('unknown lightingPreset'),
        }),
      ])
    );
  });

  it('warns when luminance exceeds the preset hotspot threshold', async () => {
    const manifest = await loadAct2CrossroadsArtManifest(manifestPath);
    const manifestClone = JSON.parse(JSON.stringify(manifest));
    manifestClone.accents = manifestClone.accents.map((accent) =>
      accent?.id === 'crossroads_selection_conduit'
        ? {
            ...accent,
            color: '#ffffff',
            metadata: {
              ...(accent.metadata ?? {}),
              lightingPreset: 'briefing_focus',
            },
          }
        : { ...accent }
    );

    const configClone = JSON.parse(JSON.stringify(Act2CrossroadsArtConfig));
    configClone.accents = configClone.accents.map((accent) =>
      accent?.id === 'crossroads_selection_conduit'
        ? {
            ...accent,
            color: '#ffffff',
            metadata: {
              ...(accent.metadata ?? {}),
              lightingPreset: 'briefing_focus',
            },
          }
        : { ...accent }
    );

    const result = validateAct2CrossroadsArtBundle({
      config: configClone,
      manifest: manifestClone,
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          segmentId: 'crossroads_selection_conduit',
          message: expect.stringContaining('exceeds hotspot threshold'),
        }),
      ])
    );

    const summary = summarizeAct2CrossroadsArtValidation(result);
    expect(summary.lighting.hotspots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          segmentId: 'crossroads_selection_conduit',
          status: 'hotspot',
        }),
      ])
    );
  });
});
