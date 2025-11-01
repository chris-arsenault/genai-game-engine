import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Load a tileset seam manifest from disk.
 * @param {string} manifestPath
 * @returns {Promise<object>}
 */
export async function loadTilesetSeamManifest(manifestPath) {
  if (typeof manifestPath !== 'string' || manifestPath.length === 0) {
    throw new Error('[loadTilesetSeamManifest] manifestPath is required');
  }
  const resolved = path.resolve(process.cwd(), manifestPath);
  const raw = await fs.readFile(resolved, 'utf8');
  return JSON.parse(raw);
}

/**
 * Build a preview summary for seam annotations.
 * @param {object} manifest
 * @param {{ sampleSize?: number, maxClusters?: number }} [options]
 * @returns {object}
 */
export function buildTilesetSeamPreview(manifest, options = {}) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('[buildTilesetSeamPreview] Manifest object is required');
  }

  const seamAnnotations = Array.isArray(manifest.seamAnnotations)
    ? manifest.seamAnnotations.filter(Boolean)
    : [];

  if (seamAnnotations.length === 0) {
    throw new Error('[buildTilesetSeamPreview] seamAnnotations array is required');
  }

  const sampleSize = Number.isInteger(options.sampleSize) && options.sampleSize > 0 ? options.sampleSize : 5;
  const maxClusters =
    Number.isInteger(options.maxClusters) && options.maxClusters > 0 ? options.maxClusters : 12;

  const orientationCounts = countBy(seamAnnotations, (entry) => resolveOrientation(entry));
  const edgeCounts = countBy(seamAnnotations, (entry) => normalizeEdge(entry.openEdge));
  const collisionCounts = countBy(seamAnnotations, (entry) => entry.collision || null);
  const classificationCounts = countBy(seamAnnotations, (entry) => entry.tileClassification || null);
  const tagCounts = countTags(seamAnnotations);

  const rowSet = new Set();
  const columnSet = new Set();
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minColumn = Number.POSITIVE_INFINITY;
  let maxColumn = Number.NEGATIVE_INFINITY;

  for (const entry of seamAnnotations) {
    if (Number.isFinite(entry.row)) {
      rowSet.add(entry.row);
      minRow = Math.min(minRow, entry.row);
      maxRow = Math.max(maxRow, entry.row);
    }
    if (Number.isFinite(entry.column)) {
      columnSet.add(entry.column);
      minColumn = Math.min(minColumn, entry.column);
      maxColumn = Math.max(maxColumn, entry.column);
    }
  }

  const clusters = buildClusters(seamAnnotations);
  const longestCluster = clusters.reduce((best, cluster) => {
    if (!best || cluster.length > best.length) {
      return cluster;
    }
    return best;
  }, null);

  const stats = {
    annotations: seamAnnotations.length,
    rowsCovered: rowSet.size,
    columnsCovered: columnSet.size,
    orientation: orientationCounts,
    openEdge: edgeCounts,
    tags: tagCounts,
    collisions: collisionCounts,
    classifications: classificationCounts,
    clusterCount: clusters.length,
    averageClusterLength:
      clusters.length > 0 ? Number((seamAnnotations.length / clusters.length).toFixed(2)) : 0,
    longestClusterLength: longestCluster ? longestCluster.length : 0,
  };

  const coverage = {
    minRow: isFinite(minRow) ? minRow : null,
    maxRow: isFinite(maxRow) ? maxRow : null,
    minColumn: isFinite(minColumn) ? minColumn : null,
    maxColumn: isFinite(maxColumn) ? maxColumn : null,
  };

  return {
    tilesetId: manifest.tilesetId ?? null,
    sourceImage: manifest.sourceImage ?? null,
    tileSize: manifest.tileSize ?? null,
    promotedAt: manifest.promotedAt ?? null,
    sourceAnalysis: manifest.sourceAnalysis ?? null,
    totals: manifest.totals ?? null,
    stats,
    coverage,
    clusters: clusters.slice(0, maxClusters),
    samples: seamAnnotations.slice(0, sampleSize).map(extractSample),
  };
}

function buildClusters(annotations) {
  const sorted = [...annotations]
    .filter((entry) => Number.isFinite(entry.row) && Number.isFinite(entry.column))
    .sort((a, b) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.column - b.column;
    });

  if (sorted.length === 0) {
    return [];
  }

  const clusters = [];
  let current = createCluster(sorted[0]);

  for (let i = 1; i < sorted.length; i += 1) {
    const entry = sorted[i];
    const last = current.entries[current.entries.length - 1];
    if (areAdjacent(last, entry)) {
      current.entries.push(entry);
      current.end = { row: entry.row, column: entry.column };
      current.tileIndices.push(entry.tileIndex ?? null);
      continue;
    }

    clusters.push(finalizeCluster(current));
    current = createCluster(entry);
  }

  clusters.push(finalizeCluster(current));
  return clusters.sort((a, b) => b.length - a.length);
}

function createCluster(entry) {
  return {
    entries: [entry],
    start: { row: entry.row ?? null, column: entry.column ?? null },
    end: { row: entry.row ?? null, column: entry.column ?? null },
    tileIndices: [entry.tileIndex ?? null],
  };
}

function finalizeCluster(cluster) {
  const orientationCount = countBy(cluster.entries, (entry) => resolveOrientation(entry));
  const openEdgeCount = countBy(cluster.entries, (entry) => normalizeEdge(entry.openEdge));
  const tagCount = countTags(cluster.entries);

  return {
    length: cluster.entries.length,
    start: cluster.start,
    end: cluster.end,
    tileIndices: cluster.tileIndices.filter((value) => value != null),
    orientation: dominantKey(orientationCount) ?? null,
    openEdges: Object.keys(openEdgeCount),
    tags: Object.keys(tagCount),
  };
}

function areAdjacent(a, b) {
  if (!a || !b) {
    return false;
  }

  const rowDiff = Math.abs((a.row ?? 0) - (b.row ?? 0));
  const columnDiff = Math.abs((a.column ?? 0) - (b.column ?? 0));

  if (rowDiff === 0 && columnDiff === 1) {
    return true;
  }

  if (columnDiff === 0 && rowDiff === 1) {
    return true;
  }

  return false;
}

function resolveOrientation(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  if (entry.orientation && typeof entry.orientation === 'string') {
    return entry.orientation;
  }

  const normalizedEdge = normalizeEdge(entry.openEdge);
  if (normalizedEdge === 'north' || normalizedEdge === 'south') {
    return 'vertical';
  }
  if (normalizedEdge === 'east' || normalizedEdge === 'west') {
    return 'horizontal';
  }

  return null;
}

function normalizeEdge(edge) {
  if (typeof edge !== 'string' || edge.length === 0) {
    return null;
  }

  switch (edge) {
    case 'top':
      return 'north';
    case 'bottom':
      return 'south';
    case 'left':
      return 'west';
    case 'right':
      return 'east';
    default:
      return edge;
  }
}

function countBy(items, selector) {
  const counter = new Map();
  for (const item of items) {
    const key = selector(item);
    if (!key) {
      continue;
    }
    counter.set(key, (counter.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counter.entries()].sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      }
      return b[1] - a[1];
    })
  );
}

function countTags(items) {
  const counter = new Map();
  for (const item of items) {
    if (!Array.isArray(item.tags)) {
      continue;
    }
    for (const tag of item.tags) {
      if (typeof tag !== 'string' || tag.length === 0) {
        continue;
      }
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counter.entries()].sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      }
      return b[1] - a[1];
    })
  );
}

function dominantKey(counts) {
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) {
    return null;
  }

  entries.sort((a, b) => {
    if (b[1] === a[1]) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    }
    return b[1] - a[1];
  });

  return entries[0][0];
}

function extractSample(entry) {
  return {
    tileIndex: entry.tileIndex ?? null,
    row: entry.row ?? null,
    column: entry.column ?? null,
    openEdge: normalizeEdge(entry.openEdge),
    orientation: resolveOrientation(entry),
    tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
    collision: entry.collision ?? null,
    warningType: entry.warningType ?? null,
  };
}

export function serializePreview(preview) {
  return `${JSON.stringify(preview, null, 2)}\n`;
}
