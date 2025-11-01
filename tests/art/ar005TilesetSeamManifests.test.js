import fs from 'node:fs/promises';
import path from 'node:path';

import { validateTilesetSeamManifest } from '../../src/game/tools/TilesetSeamValidator.js';

async function readJson(relativePath) {
  const resolved = path.resolve(process.cwd(), relativePath);
  const raw = await fs.readFile(resolved, 'utf8');
  return JSON.parse(raw);
}

const SEAM_CASES = [
  {
    tilesetId: 'image-ar-005-tileset-corporate-spires',
    manifestPath: 'assets/manifests/tilesets/image-ar-005-tileset-corporate-spires-metadata.json',
    previewPath: 'reports/art/tileset-previews/image-ar-005-tileset-corporate-spires-preview.json',
    annotations: 196,
    clusterCount: 153,
    longestClusterLength: 14,
  },
  {
    tilesetId: 'image-ar-005-tileset-archive-undercity',
    manifestPath: 'assets/manifests/tilesets/image-ar-005-tileset-archive-undercity-metadata.json',
    previewPath: 'reports/art/tileset-previews/image-ar-005-tileset-archive-undercity-preview.json',
    annotations: 61,
    clusterCount: 30,
    longestClusterLength: 8,
  },
  {
    tilesetId: 'image-ar-005-tileset-zenith-sector',
    manifestPath: 'assets/manifests/tilesets/image-ar-005-tileset-zenith-sector-metadata.json',
    previewPath: 'reports/art/tileset-previews/image-ar-005-tileset-zenith-sector-preview.json',
    annotations: 61,
    clusterCount: 2,
    longestClusterLength: 41,
  },
];

describe('AR-005 tileset seam manifests', () => {
  for (const seamCase of SEAM_CASES) {
    it(`validates seam metadata for ${seamCase.tilesetId}`, async () => {
      const manifest = await readJson(seamCase.manifestPath);
      expect(manifest.tilesetId).toBe(seamCase.tilesetId);
      expect(Array.isArray(manifest.seamAnnotations)).toBe(true);
      expect(manifest.seamAnnotations).toHaveLength(seamCase.annotations);

      const result = validateTilesetSeamManifest(manifest);
      expect(result.ok).toBe(true);
      expect(result.hasWarnings).toBe(false);
      expect(result.stats.clusterCount).toBe(seamCase.clusterCount);
      expect(result.stats.longestClusterLength).toBe(seamCase.longestClusterLength);
    });

    it(`matches preview stats for ${seamCase.tilesetId}`, async () => {
      const preview = await readJson(seamCase.previewPath);
      expect(preview.tilesetId).toBe(seamCase.tilesetId);
      expect(preview.stats.annotations).toBe(seamCase.annotations);
      expect(preview.stats.clusterCount).toBe(seamCase.clusterCount);
      expect(preview.stats.longestClusterLength).toBe(seamCase.longestClusterLength);
    });
  }
});
