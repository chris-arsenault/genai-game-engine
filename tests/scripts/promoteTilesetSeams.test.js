import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('promoteTilesetSeams script', () => {
  it('promotes potential door warnings into seam metadata', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'promote-tileset-'));
    const reportsDir = path.join(tmpDir, 'reports', 'art');
    const manifestsDir = path.join(tmpDir, 'assets', 'manifests', 'tilesets');

    await fs.mkdir(reportsDir, { recursive: true });
    await fs.mkdir(manifestsDir, { recursive: true });

    const analysisPath = path.join(reportsDir, 'sample-tileset-analysis.json');
    const metadataPath = path.join(manifestsDir, 'sample-tileset-metadata.json');

    const analysis = {
      tilesetId: 'image-sample-tileset',
      generatedAt: '2025-11-05T00:00:00Z',
      sourceImage: 'assets/generated/images/sample-tileset.png',
      tileSize: 16,
      dimensions: {
        width: 32,
        height: 16,
        tilesPerRow: 2,
        tilesPerColumn: 1,
        totalTiles: 2,
      },
      metrics: {
        classificationBuckets: {
          solid: 1,
          mixed: 0,
          empty: 1,
        },
        collisionBuckets: {
          block: 1,
          walkable: 1,
          manual: 0,
        },
        averageSolidCoverage: 0.5,
      },
      warnings: [
        {
          type: 'potential-door',
          tileIndex: 1,
          message: 'Solid tile contains open edges; likely needs seam metadata for doorway.',
        },
      ],
      tiles: [
        {
          index: 0,
          row: 0,
          column: 0,
          solidCoverage: 0,
          classification: 'empty',
          collisionSuggestion: 'walkable',
          edges: {
            top: { classification: 'open' },
            right: { classification: 'open' },
            bottom: { classification: 'open' },
            left: { classification: 'open' },
          },
        },
        {
          index: 1,
          row: 0,
          column: 1,
          solidCoverage: 0.9,
          classification: 'solid',
          collisionSuggestion: 'block',
          edges: {
            top: { classification: 'blocking' },
            right: { classification: 'open' },
            bottom: { classification: 'blocking' },
            left: { classification: 'blocking' },
          },
        },
      ],
    };

    await fs.writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');

    const scriptPath = path.resolve(process.cwd(), 'scripts/art/promoteTilesetSeams.js');
    const result = spawnSync('node', [scriptPath, `--analysis=${path.relative(tmpDir, analysisPath)}`, `--out=${path.relative(tmpDir, metadataPath)}`], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);

    const metadata = JSON.parse(fsSync.readFileSync(metadataPath, 'utf8'));
    expect(metadata.tilesetId).toBe('image-sample-tileset');
    expect(metadata.tileSize).toBe(16);
    expect(metadata.totals).toEqual({ warnings: 1, promoted: 1 });

    expect(Array.isArray(metadata.seamAnnotations)).toBe(true);
    expect(metadata.seamAnnotations).toHaveLength(1);

    const [entry] = metadata.seamAnnotations;
    expect(entry.tileIndex).toBe(1);
    expect(entry.row).toBe(0);
    expect(entry.column).toBe(1);
    expect(entry.openEdge).toBe('east');
    expect(entry.blockingEdges).toEqual(['north', 'south', 'west']);
    expect(entry.orientation).toBe('horizontal');
    expect(entry.tags).toEqual(['doorway', 'horizontal']);
  });
});
