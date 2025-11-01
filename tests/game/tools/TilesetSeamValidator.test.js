import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { validateTilesetSeamManifest } from '../../../src/game/tools/TilesetSeamValidator.js';

describe('TilesetSeamValidator', () => {
  it('flags missing orientation metadata and doorway tags', () => {
    const manifest = {
      tilesetId: 'test-tileset',
      seamAnnotations: [
        {
          tileIndex: 0,
          row: 0,
          column: 0,
          openEdge: 'unknown-edge',
          tags: [],
        },
        {
          tileIndex: 1,
          row: 0,
          column: 1,
          openEdge: 'west',
          orientation: 'vertical',
          tags: ['doorway'],
        },
      ],
    };

    const result = validateTilesetSeamManifest(manifest);

    expect(result.ok).toBe(true);
    expect(result.hasWarnings).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          message: 'Orientation missing; derived orientation will be used',
          tileIndex: 0,
        }),
        expect.objectContaining({
          severity: 'warning',
          message: 'Orientation missing; derived orientation will be used',
          tileIndex: 0,
        }),
        expect.objectContaining({
          severity: 'warning',
          message: 'Doorway tag missing from seam annotation',
          tileIndex: 0,
        }),
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining('does not align'),
          tileIndex: 1,
        }),
        expect.objectContaining({
          severity: 'warning',
          message: 'Orientation tag "vertical" missing from seam annotation',
          tileIndex: 1,
        }),
      ])
    );
    expect(result.stats.annotations).toBe(2);
    expect(result.stats.clusterCount).toBe(1);
    expect(result.clusters[0]).toEqual(
      expect.objectContaining({
        length: 2,
        start: { row: 0, column: 0 },
        end: { row: 0, column: 1 },
      })
    );
  });

  it('approves the Neon District seam manifest without errors', async () => {
    const manifestPath = path.resolve(
      process.cwd(),
      'assets/manifests/tilesets/image-ar-005-tileset-neon-district-metadata.json'
    );
    const raw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);

    const result = validateTilesetSeamManifest(manifest);

    expect(result.ok).toBe(true);
    expect(result.hasWarnings).toBe(false);
    expect(result.issues).toHaveLength(0);
    expect(result.stats.annotations).toBeGreaterThan(100);
    expect(result.stats.orientations.vertical).toBeGreaterThan(0);
    expect(result.stats.openEdges.north).toBeGreaterThan(0);
    expect(result.stats.clusterCount).toBeGreaterThan(0);
    expect(result.stats.longestClusterLength).toBeGreaterThan(1);
  });
});
