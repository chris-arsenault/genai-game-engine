import {
  getTilesetSeamPreviewCatalog,
  getTilesetSeamPreviewById,
  applyTilesetCatalogMetadata,
} from '../../../../src/game/procedural/templates/tilesetSeamPreviewCatalog.js';

describe('tileset seam preview catalog', () => {
  it('exposes attachments for all AR-005 tilesets with expected stats', () => {
    const catalog = getTilesetSeamPreviewCatalog();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog).toHaveLength(4);

    const ids = catalog.map((entry) => entry.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'image-ar-005-tileset-neon-district',
        'image-ar-005-tileset-corporate-spires',
        'image-ar-005-tileset-archive-undercity',
        'image-ar-005-tileset-zenith-sector',
      ])
    );

    const neon = getTilesetSeamPreviewById('image-ar-005-tileset-neon-district');
    expect(neon.label).toBe('Neon District');
    expect(neon.seamPreview.stats.clusterCount).toBe(52);
    expect(neon.seamPreview.stats.longestClusterLength).toBe(19);

    const spires = getTilesetSeamPreviewById('image-ar-005-tileset-corporate-spires');
    expect(spires.label).toBe('Corporate Spires');
    expect(spires.seamPreview.stats.annotations).toBe(196);
    expect(spires.seamPreview.stats.longestClusterLength).toBe(14);

    const undercity = getTilesetSeamPreviewById('image-ar-005-tileset-archive-undercity');
    expect(undercity.label).toBe('Archive Undercity');
    expect(undercity.seamPreview.stats.clusterCount).toBe(30);
    expect(undercity.seamPreview.stats.longestClusterLength).toBe(8);

    const zenith = getTilesetSeamPreviewById('image-ar-005-tileset-zenith-sector');
    expect(zenith.label).toBe('Zenith Sector');
    expect(zenith.seamPreview.stats.clusterCount).toBe(2);
    expect(zenith.seamPreview.stats.longestClusterLength).toBe(41);
  });

  it('provides metadata merging with active tileset override', () => {
    const metadata = applyTilesetCatalogMetadata(
      { hint: 'corridor-preview' },
      { activeTilesetId: 'image-ar-005-tileset-corporate-spires' }
    );

    expect(metadata.hint).toBe('corridor-preview');
    expect(metadata.activeTilesetId).toBe('image-ar-005-tileset-corporate-spires');
    expect(metadata.tileset.id).toBe('image-ar-005-tileset-corporate-spires');
    expect(Array.isArray(metadata.tilesetCatalog)).toBe(true);
    expect(metadata.tilesetCatalog).toHaveLength(4);
    expect(metadata.tilesetCatalogMap['image-ar-005-tileset-archive-undercity'].label).toBe(
      'Archive Undercity'
    );

    const defaultMetadata = applyTilesetCatalogMetadata();
    expect(defaultMetadata.activeTilesetId).toBe('image-ar-005-tileset-neon-district');
    expect(defaultMetadata.tileset.id).toBe('image-ar-005-tileset-neon-district');
  });
});
