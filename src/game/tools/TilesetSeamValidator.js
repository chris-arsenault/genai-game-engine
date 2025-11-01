/**
 * Validate tileset seam metadata for corridor readiness.
 *
 * Ensures seam annotations include required doorway metadata, flags orientation/tag
 * mismatches, and extracts cluster summaries so corridor tooling can reason about
 * doorway spans before sampling the atlas.
 */

/**
 * Validate a seam manifest.
 * @param {object} manifest
 * @param {{ requireDoorwayTag?: boolean }} [options]
 * @returns {{
 *  ok: boolean,
 *  issues: Array<{ severity: 'error'|'warning', message: string, tileIndex?: number }>,
 *  stats: {
 *    annotations: number,
 *    orientations: Record<string, number>,
 *    openEdges: Record<string, number>,
 *    tags: Record<string, number>,
 *    collisions: Record<string, number>,
 *    clusterCount: number,
 *    longestClusterLength: number
 *  },
 *  clusters: Array<{ length: number, orientation: string|null, start: { row: number|null, column: number|null }, end: { row: number|null, column: number|null } }>
 * }}
 */
export function validateTilesetSeamManifest(manifest, options = {}) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('[validateTilesetSeamManifest] Manifest object is required');
  }

  const seamAnnotations = Array.isArray(manifest.seamAnnotations)
    ? manifest.seamAnnotations.filter(Boolean)
    : [];

  if (seamAnnotations.length === 0) {
    throw new Error('[validateTilesetSeamManifest] seamAnnotations array is required');
  }

  const requireDoorwayTag = options.requireDoorwayTag !== false;

  const issues = [];
  const orientations = new Map();
  const openEdges = new Map();
  const tags = new Map();
  const collisions = new Map();

  for (const entry of seamAnnotations) {
    if (!Number.isFinite(entry.tileIndex)) {
      issues.push({
        severity: 'error',
        message: 'Missing tileIndex on seam annotation',
        tileIndex: entry.tileIndex ?? null,
      });
    }

    if (!Number.isFinite(entry.row) || !Number.isFinite(entry.column)) {
      issues.push({
        severity: 'error',
        message: 'Missing row/column for seam annotation',
        tileIndex: entry.tileIndex ?? null,
      });
    }

    if (!entry.openEdge || typeof entry.openEdge !== 'string') {
      issues.push({
        severity: 'error',
        message: 'Missing openEdge on seam annotation',
        tileIndex: entry.tileIndex ?? null,
      });
    }

    const normalizedEdge = normalizeEdge(entry.openEdge);
    const derivedOrientation = orientationFromEdge(normalizedEdge);
    const orientation = resolveOrientation(entry);

    if (!orientation) {
      issues.push({
        severity: 'warning',
        message: 'Orientation missing; derived orientation will be used',
        tileIndex: entry.tileIndex ?? null,
      });
    } else if (derivedOrientation && orientation !== derivedOrientation) {
      issues.push({
        severity: 'warning',
        message: `Orientation "${orientation}" does not align with openEdge "${normalizedEdge}"`,
        tileIndex: entry.tileIndex ?? null,
      });
    }

    if (requireDoorwayTag && !hasTag(entry, 'doorway')) {
      issues.push({
        severity: 'warning',
        message: 'Doorway tag missing from seam annotation',
        tileIndex: entry.tileIndex ?? null,
      });
    }

    if (orientation && !hasTag(entry, orientation)) {
      issues.push({
        severity: 'warning',
        message: `Orientation tag "${orientation}" missing from seam annotation`,
        tileIndex: entry.tileIndex ?? null,
      });
    }

    increment(orientations, orientation);
    increment(openEdges, normalizedEdge);
    increment(collisions, entry.collision);
    aggregateTags(tags, entry.tags);
  }

  const clusters = buildClusters(seamAnnotations);
  const longestCluster = clusters.reduce((best, entry) => {
    if (!best || entry.length > best.length) {
      return entry;
    }
    return best;
  }, null);

  const stats = {
    annotations: seamAnnotations.length,
    orientations: toSortedObject(orientations),
    openEdges: toSortedObject(openEdges),
    tags: toSortedObject(tags),
    collisions: toSortedObject(collisions),
    clusterCount: clusters.length,
    longestClusterLength: longestCluster ? longestCluster.length : 0,
  };

  const hasErrors = issues.some((issue) => issue.severity === 'error');
  const hasWarnings = issues.some((issue) => issue.severity === 'warning');

  return {
    ok: !hasErrors,
    hasWarnings,
    issues: issues.sort(sortIssues),
    stats,
    clusters,
  };
}

function buildClusters(entries) {
  const sorted = entries
    .map((entry) => ({
      tileIndex: entry.tileIndex ?? null,
      row: Number.isFinite(entry.row) ? entry.row : null,
      column: Number.isFinite(entry.column) ? entry.column : null,
      orientation: resolveOrientation(entry),
      openEdge: normalizeEdge(entry.openEdge),
    }))
    .filter((entry) => entry.row != null && entry.column != null)
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
    const previous = current.entries[current.entries.length - 1];
    if (areAdjacent(previous, entry)) {
      current.entries.push(entry);
      current.end = { row: entry.row, column: entry.column };
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
    start: { row: entry.row, column: entry.column },
    end: { row: entry.row, column: entry.column },
  };
}

function finalizeCluster(cluster) {
  const orientationCounts = new Map();
  const openEdgeCounts = new Map();

  for (const entry of cluster.entries) {
    increment(orientationCounts, entry.orientation);
    increment(openEdgeCounts, entry.openEdge);
  }

  return {
    length: cluster.entries.length,
    start: cluster.start,
    end: cluster.end,
    orientation: dominantKey(orientationCounts),
    openEdges: Object.keys(toSortedObject(openEdgeCounts)),
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
  if (!entry) {
    return null;
  }

  if (entry.orientation && typeof entry.orientation === 'string') {
    return entry.orientation;
  }

  if (entry.tags && Array.isArray(entry.tags)) {
    if (entry.tags.includes('vertical')) {
      return 'vertical';
    }
    if (entry.tags.includes('horizontal')) {
      return 'horizontal';
    }
  }

  const normalizedEdge = normalizeEdge(entry.openEdge);
  return orientationFromEdge(normalizedEdge);
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

function orientationFromEdge(edge) {
  if (edge === 'north' || edge === 'south') {
    return 'vertical';
  }
  if (edge === 'east' || edge === 'west') {
    return 'horizontal';
  }
  return null;
}

function hasTag(entry, targetTag) {
  if (!targetTag) {
    return false;
  }
  if (!entry || !Array.isArray(entry.tags)) {
    return false;
  }
  return entry.tags.includes(targetTag);
}

function increment(map, key) {
  if (!key) {
    return;
  }
  map.set(key, (map.get(key) ?? 0) + 1);
}

function aggregateTags(map, tags) {
  if (!Array.isArray(tags)) {
    return;
  }
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.length === 0) {
      continue;
    }
    increment(map, tag);
  }
}

function dominantKey(map) {
  const entries = [...map.entries()];
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

function toSortedObject(map) {
  return Object.fromEntries(
    [...map.entries()].sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      }
      return b[1] - a[1];
    })
  );
}

function sortIssues(a, b) {
  if (a.severity !== b.severity) {
    return a.severity === 'error' ? -1 : 1;
  }
  if (a.tileIndex != null && b.tileIndex != null) {
    return a.tileIndex - b.tileIndex;
  }
  return 0;
}
