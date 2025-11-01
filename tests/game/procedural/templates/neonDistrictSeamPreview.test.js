import {
  NEON_DISTRICT_SEAM_PREVIEW,
  NEON_DISTRICT_SEAM_CLUSTERS_BY_ORIENTATION,
  NEON_DISTRICT_SEAM_TILE_LOOKUP,
  NEON_DISTRICT_TILESET_ATTACHMENT,
} from '../../../../src/game/procedural/templates/neonDistrictSeamPreview.js';

describe('neonDistrictSeamPreview metadata', () => {
  it('exposes seam preview stats and cluster lookups', () => {
    expect(NEON_DISTRICT_SEAM_PREVIEW.tilesetId).toBe('image-ar-005-tileset-neon-district');
    expect(NEON_DISTRICT_SEAM_PREVIEW.stats.clusterCount).toBe(52);
    expect(Array.isArray(NEON_DISTRICT_SEAM_PREVIEW.clusters)).toBe(true);
    expect(NEON_DISTRICT_SEAM_PREVIEW.clusters).toHaveLength(8);

    const verticalClusters = NEON_DISTRICT_SEAM_CLUSTERS_BY_ORIENTATION.vertical;
    expect(Array.isArray(verticalClusters)).toBe(true);
    expect(verticalClusters.length).toBeGreaterThan(0);
    expect(verticalClusters[0]).toEqual(
      expect.objectContaining({ id: 'neon_district_cluster_1', orientation: 'vertical' })
    );

    expect(NEON_DISTRICT_SEAM_TILE_LOOKUP[2144]).toBe('neon_district_cluster_1');
    expect(NEON_DISTRICT_SEAM_TILE_LOOKUP[3742]).toBe('neon_district_cluster_7');

    expect(NEON_DISTRICT_TILESET_ATTACHMENT.label).toBe('Neon District');
    expect(NEON_DISTRICT_TILESET_ATTACHMENT.seamPreview).toBe(NEON_DISTRICT_SEAM_PREVIEW);
  });
});
