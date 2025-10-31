#!/usr/bin/env node
/**
 * Tileset seam and collision analyzer.
 *
 * Scans a tileset atlas (e.g., 16x16 tiles arranged on a uniform grid) and
 * extracts heuristic metrics to guide collision + seam metadata authoring.
 * Outputs a JSON report capturing per-tile coverage, edge classifications,
 * and warnings where the heuristics detect likely seams or collision needs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Jimp, intToRGBA } from 'jimp';

const DEFAULT_TILE_SIZE = 16;
const ALPHA_THRESHOLD = 32;
const EDGE_BLOCK_THRESHOLD = 0.75;
const EDGE_OPEN_THRESHOLD = 0.25;

function parseArgs(argv) {
  const options = {
    imagePath: null,
    tileSize: DEFAULT_TILE_SIZE,
    tilesetId: null,
    outputPath: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--image=')) {
      options.imagePath = arg.slice('--image='.length);
    } else if (arg.startsWith('--tile-size=')) {
      const parsed = Number.parseInt(arg.slice('--tile-size='.length), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.tileSize = parsed;
      }
    } else if (arg.startsWith('--id=')) {
      options.tilesetId = arg.slice('--id='.length);
    } else if (arg.startsWith('--out=')) {
      options.outputPath = arg.slice('--out='.length);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(`Usage: node scripts/art/analyzeTilesetSeams.js --image=<path> [options]

Options:
  --image=<path>       Tileset atlas image (required)
  --tile-size=<px>     Tile size in pixels (default ${DEFAULT_TILE_SIZE})
  --id=<tileset-id>    Identifier recorded in the report (defaults to file name)
  --out=<path>         Output path for JSON report (default reports/art/<id>-analysis-<timestamp>.json)
  --help               Show this message
`);
}

function createEdgeAccumulator() {
  return {
    solidPixels: 0,
    transparentPixels: 0,
    sumR: 0,
    sumG: 0,
    sumB: 0,
    sumA: 0,
  };
}

function finalizeEdgeStats(accumulator, totalPixels) {
  const count = Math.max(totalPixels, 1);
  const solidRatio = accumulator.solidPixels / count;

  let classification = 'mixed';
  if (solidRatio >= EDGE_BLOCK_THRESHOLD) {
    classification = 'blocking';
  } else if (solidRatio <= EDGE_OPEN_THRESHOLD) {
    classification = 'open';
  }

  return {
    solidPixels: accumulator.solidPixels,
    transparentPixels: accumulator.transparentPixels,
    solidRatio,
    classification,
    averageColor: {
      r: accumulator.sumR / count,
      g: accumulator.sumG / count,
      b: accumulator.sumB / count,
      a: accumulator.sumA / count,
    },
  };
}

function classifyTile(solidCoverage, edgeStats) {
  if (solidCoverage >= 0.85) {
    return 'solid';
  }
  if (solidCoverage <= 0.1) {
    return 'empty';
  }

  const blockingEdges = Object.values(edgeStats).filter(
    (edge) => edge.classification === 'blocking'
  ).length;
  const openEdges = Object.values(edgeStats).filter(
    (edge) => edge.classification === 'open'
  ).length;

  if (blockingEdges >= 3 && solidCoverage >= 0.6) {
    return 'solid';
  }
  if (openEdges >= 3 && solidCoverage <= 0.4) {
    return 'empty';
  }
  return 'mixed';
}

function collisionSuggestion(tileClass, solidCoverage) {
  if (tileClass === 'solid') {
    return 'block';
  }
  if (tileClass === 'empty') {
    return 'walkable';
  }
  if (solidCoverage >= 0.6) {
    return 'block';
  }
  if (solidCoverage <= 0.2) {
    return 'walkable';
  }
  return 'manual';
}

async function analyzeTileset(options) {
  if (!options.imagePath) {
    throw new Error('[analyzeTilesetSeams] --image is required');
  }

  const resolvedImagePath = path.resolve(options.imagePath);
  const image = await Jimp.read(resolvedImagePath);
  const { width, height } = image.bitmap;

  if (width % options.tileSize !== 0 || height % options.tileSize !== 0) {
    throw new Error(
      `[analyzeTilesetSeams] Image dimensions (${width}x${height}) are not divisible by tile size ${options.tileSize}`
    );
  }

  const tilesPerRow = width / options.tileSize;
  const tilesPerColumn = height / options.tileSize;
  const totalTiles = tilesPerRow * tilesPerColumn;

  const analysis = [];
  const warnings = [];
  const collisionBuckets = {
    block: 0,
    walkable: 0,
    manual: 0,
  };
  const classificationBuckets = {
    solid: 0,
    mixed: 0,
    empty: 0,
  };

  for (let row = 0; row < tilesPerColumn; row++) {
    for (let col = 0; col < tilesPerRow; col++) {
      const tileIndex = row * tilesPerRow + col;
      const startX = col * options.tileSize;
      const startY = row * options.tileSize;
      const edgeAccumulators = {
        top: createEdgeAccumulator(),
        right: createEdgeAccumulator(),
        bottom: createEdgeAccumulator(),
        left: createEdgeAccumulator(),
      };
      let solidPixels = 0;
      const totalPixels = options.tileSize * options.tileSize;

      for (let y = 0; y < options.tileSize; y++) {
        for (let x = 0; x < options.tileSize; x++) {
          const pixelX = startX + x;
          const pixelY = startY + y;
          const color = image.getPixelColor(pixelX, pixelY);
          const { r, g, b, a } = intToRGBA(color);
          const isSolid = a >= ALPHA_THRESHOLD;
          if (isSolid) {
            solidPixels += 1;
          }

          if (y === 0) {
            accumulateEdge(edgeAccumulators.top, { r, g, b, a }, isSolid);
          }
          if (y === options.tileSize - 1) {
            accumulateEdge(edgeAccumulators.bottom, { r, g, b, a }, isSolid);
          }
          if (x === 0) {
            accumulateEdge(edgeAccumulators.left, { r, g, b, a }, isSolid);
          }
          if (x === options.tileSize - 1) {
            accumulateEdge(edgeAccumulators.right, { r, g, b, a }, isSolid);
          }
        }
      }

      const solidCoverage = solidPixels / totalPixels;
      const edges = {
        top: finalizeEdgeStats(edgeAccumulators.top, options.tileSize),
        right: finalizeEdgeStats(edgeAccumulators.right, options.tileSize),
        bottom: finalizeEdgeStats(edgeAccumulators.bottom, options.tileSize),
        left: finalizeEdgeStats(edgeAccumulators.left, options.tileSize),
      };

      const tileClass = classifyTile(solidCoverage, edges);
      const collision = collisionSuggestion(tileClass, solidCoverage);

      classificationBuckets[tileClass] += 1;
      collisionBuckets[collision] += 1;

      const tileInfo = {
        index: tileIndex,
        row,
        column: col,
        solidCoverage,
        classification: tileClass,
        collisionSuggestion: collision,
        edges,
      };

      const seamEdgeCount = Object.values(edges).filter(
        (edge) => edge.classification === 'open'
      ).length;
      if (tileClass === 'solid' && seamEdgeCount > 0) {
        warnings.push({
          type: 'potential-door',
          tileIndex,
          message:
            'Solid tile contains open edges; likely needs seam metadata for doorway or transition.',
        });
      }
      if (tileClass === 'empty' && seamEdgeCount < 2 && solidCoverage > 0) {
        warnings.push({
          type: 'unusual-coverage',
          tileIndex,
          message:
            'Mostly empty tile with limited open edges; review for collision accuracy.',
        });
      }

      analysis.push(tileInfo);
    }
  }

  const now = new Date().toISOString();
  const tilesetId =
    options.tilesetId ??
    path.basename(options.imagePath, path.extname(options.imagePath));

  return {
    tilesetId,
    generatedAt: now,
    sourceImage: path.relative(process.cwd(), path.resolve(options.imagePath)),
    tileSize: options.tileSize,
    dimensions: {
      width,
      height,
      tilesPerRow,
      tilesPerColumn,
      totalTiles,
    },
    metrics: {
      classificationBuckets,
      collisionBuckets,
      averageSolidCoverage:
        analysis.reduce((sum, tile) => sum + tile.solidCoverage, 0) /
        Math.max(analysis.length, 1),
    },
    warnings,
    tiles: analysis,
  };
}

function accumulateEdge(accumulator, color, isSolid) {
  accumulator.sumR += color.r;
  accumulator.sumG += color.g;
  accumulator.sumB += color.b;
  accumulator.sumA += color.a;
  accumulator.solidPixels += isSolid ? 1 : 0;
  accumulator.transparentPixels += isSolid ? 0 : 1;
}

async function writeReport(report, options) {
  const outputPath =
    options.outputPath ??
    path.join(
      'reports',
      'art',
      `${report.tilesetId}-analysis-${report.generatedAt.replace(/[:.]/g, '-')}.json`
    );

  const resolved = path.resolve(outputPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(report, null, 2), 'utf8');
  return resolved;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  if (!options.imagePath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  try {
    const report = await analyzeTileset(options);
    const outputPath = await writeReport(report, options);
    console.log(
      `[analyzeTilesetSeams] Analysis complete: ${path.relative(process.cwd(), outputPath)}`
    );
    console.log(
      `[analyzeTilesetSeams] Tiles: ${report.dimensions.totalTiles} | Solid: ${report.metrics.classificationBuckets.solid} | Mixed: ${report.metrics.classificationBuckets.mixed} | Empty: ${report.metrics.classificationBuckets.empty}`
    );
    if (report.warnings.length > 0) {
      console.warn(
        `[analyzeTilesetSeams] Warnings detected (${report.warnings.length}) – review report for details.`
      );
    }
  } catch (error) {
    console.error('[analyzeTilesetSeams] Failed to analyze tileset:', error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].includes('analyzeTilesetSeams.js')) {
  main();
}
