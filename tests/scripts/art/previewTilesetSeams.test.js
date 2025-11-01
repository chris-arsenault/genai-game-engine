import { buildTilesetSeamPreview } from '../../../scripts/art/lib/tilesetSeamPreview.js';

describe('previewTilesetSeams', () => {
  function createManifest(overrides = {}) {
    return {
      tilesetId: 'image-ar-005-tileset-neon-district',
      sourceImage: 'assets/generated/images/ar-005/image-ar-005-tileset-neon-district.png',
      tileSize: 16,
      promotedAt: '2025-10-31T22:54:40.354Z',
      sourceAnalysis: 'reports/art/neon-district-tileset-analysis.json',
      totals: {
        warnings: 5,
        promoted: 5,
      },
      seamAnnotations: [
        {
          tileIndex: 0,
          row: 0,
          column: 0,
          openEdge: 'north',
          orientation: 'vertical',
          collision: 'block',
          tileClassification: 'solid',
          tags: ['doorway', 'vertical'],
          warningType: 'potential-door',
        },
        {
          tileIndex: 1,
          row: 0,
          column: 1,
          openEdge: 'north',
          orientation: 'vertical',
          collision: 'block',
          tileClassification: 'solid',
          tags: ['doorway', 'vertical'],
          warningType: 'potential-door',
        },
        {
          tileIndex: 2,
          row: 0,
          column: 2,
          openEdge: 'north',
          orientation: 'vertical',
          collision: 'block',
          tileClassification: 'solid',
          tags: ['doorway', 'vertical'],
          warningType: 'potential-door',
        },
        {
          tileIndex: 320,
          row: 5,
          column: 3,
          openEdge: 'west',
          orientation: 'horizontal',
          collision: 'walkable',
          tileClassification: 'mixed',
          tags: ['doorway', 'horizontal', 'service-access'],
          warningType: 'potential-door',
        },
        {
          tileIndex: 384,
          row: 6,
          column: 3,
          openEdge: 'west',
          orientation: 'horizontal',
          collision: 'walkable',
          tileClassification: 'mixed',
          tags: ['doorway', 'horizontal', 'service-access'],
          warningType: 'potential-door',
        },
      ],
      ...overrides,
    };
  }

  it('builds a preview summary with orientation/tag stats and clusters', () => {
    const preview = buildTilesetSeamPreview(createManifest(), {
      sampleSize: 3,
      maxClusters: 2,
    });

    expect(preview.tilesetId).toBe('image-ar-005-tileset-neon-district');
    expect(preview.stats.annotations).toBe(5);
    expect(preview.stats.orientation).toEqual({
      vertical: 3,
      horizontal: 2,
    });
    expect(preview.stats.openEdge).toEqual({
      north: 3,
      west: 2,
    });
    expect(preview.stats.tags).toEqual({
      doorway: 5,
      horizontal: 2,
      'service-access': 2,
      vertical: 3,
    });
    expect(preview.stats.collisions).toEqual({
      block: 3,
      walkable: 2,
    });
    expect(preview.stats.clusterCount).toBe(2);
    expect(preview.stats.longestClusterLength).toBe(3);
    expect(preview.samples).toHaveLength(3);
    expect(preview.coverage).toEqual({
      minRow: 0,
      maxRow: 6,
      minColumn: 0,
      maxColumn: 3,
    });
    expect(preview.clusters).toEqual([
      expect.objectContaining({
        length: 3,
        start: { row: 0, column: 0 },
        end: { row: 0, column: 2 },
        orientation: 'vertical',
        openEdges: ['north'],
        tags: ['doorway', 'vertical'],
      }),
      expect.objectContaining({
        length: 2,
        start: { row: 5, column: 3 },
        end: { row: 6, column: 3 },
        orientation: 'horizontal',
        openEdges: ['west'],
        tags: ['doorway', 'horizontal', 'service-access'],
      }),
    ]);
  });

  it('rejects manifests missing seam annotations', () => {
    expect(() => buildTilesetSeamPreview(createManifest({ seamAnnotations: [] }))).toThrow(
      /seamAnnotations/
    );
  });
});
