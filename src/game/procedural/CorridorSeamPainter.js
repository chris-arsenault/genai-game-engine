import { TileType } from './TileMap.js';

/**
 * CorridorSeamPainter
 *
 * Updates door seams where corridors meet rotated rooms. Seams originate from
 * TemplateVariantResolver metadata and are applied after room tilemaps are
 * stamped into the district tilemap.
 */
export class CorridorSeamPainter {
  /**
   * Apply corridor seam adjustments.
   * @param {import('./TileMap.js').default} tilemap
   * @param {object} [context]
   * @param {Array<object>} [context.corridors]
   * @param {Array<object>} [context.placements] - Room placement summaries
   * @returns {{
   *  applied: boolean,
   *  corridorsConsidered: number,
   *  placementsConsidered: number,
   *  placementsWithSeams: number,
   *  seamsApplied: number,
   *  skippedOutOfBounds: number
   * }}
   */
  apply(tilemap, context = {}) {
    if (!tilemap || typeof tilemap.getTile !== 'function' || typeof tilemap.setTile !== 'function') {
      throw new Error('[CorridorSeamPainter] apply requires a TileMap instance');
    }

    const corridors = Array.isArray(context.corridors) ? context.corridors : [];
    const placements = Array.isArray(context.placements) ? context.placements : [];

    let seamsApplied = 0;
    let placementsWithSeams = 0;
    let skippedOutOfBounds = 0;
    let seamClustersEnumerated = 0;
    let seamClusterTiles = 0;
    const seamClusterOrientations = new Map();

    for (const placement of placements) {
      if (!placement || !Array.isArray(placement.seams) || placement.seams.length === 0) {
        const clusters = resolveSeamClusters(placement);
        if (clusters.length > 0) {
          seamClustersEnumerated += clusters.length;
          for (const cluster of clusters) {
            seamClusterTiles += Array.isArray(cluster.tileIndices) ? cluster.tileIndices.length : 0;
            const key = cluster.orientation ?? 'unknown';
            seamClusterOrientations.set(key, (seamClusterOrientations.get(key) ?? 0) + 1);
          }
        }
        continue;
      }

      const originX = placement.position?.x ?? placement.position?.left ?? placement.position?.posX ?? placement.x ?? 0;
      const originY = placement.position?.y ?? placement.position?.top ?? placement.position?.posY ?? placement.y ?? 0;
      let appliedForPlacement = false;

      for (const seam of placement.seams) {
        if (!seam) {
          continue;
        }
        const localX = Number.isFinite(seam.x) ? seam.x : 0;
        const localY = Number.isFinite(seam.y) ? seam.y : 0;
        const worldX = originX + localX;
        const worldY = originY + localY;

        const tileSuccess = tilemap.setTile(worldX, worldY, seam.tile ?? TileType.DOOR);
        if (tileSuccess) {
          seamsApplied += 1;
          appliedForPlacement = true;
        } else {
          skippedOutOfBounds += 1;
        }
      }

      if (appliedForPlacement) {
        placementsWithSeams += 1;
      }

      const clusters = resolveSeamClusters(placement);
      if (clusters.length > 0) {
        seamClustersEnumerated += clusters.length;
        for (const cluster of clusters) {
          seamClusterTiles += Array.isArray(cluster.tileIndices) ? cluster.tileIndices.length : 0;
          const key = cluster.orientation ?? 'unknown';
          seamClusterOrientations.set(key, (seamClusterOrientations.get(key) ?? 0) + 1);
        }
      }
    }

    return {
      applied: seamsApplied > 0,
      corridorsConsidered: corridors.length,
      placementsConsidered: placements.length,
      placementsWithSeams,
      seamsApplied,
      skippedOutOfBounds,
      seamClustersSeen: seamClustersEnumerated,
      seamClusterTiles,
      seamClusterOrientations: Object.fromEntries(seamClusterOrientations.entries()),
    };
  }
}

export default CorridorSeamPainter;

function resolveSeamClusters(placement) {
  if (!placement) {
    return [];
  }
  if (Array.isArray(placement.seamClusters)) {
    return placement.seamClusters;
  }
  let previewClusters = placement.metadata?.tileset?.seamPreview?.clusters;
  if (!Array.isArray(previewClusters)) {
    const catalog = Array.isArray(placement.metadata?.tilesetCatalog)
      ? placement.metadata.tilesetCatalog
      : null;
    if (catalog && catalog.length) {
      const activeId = placement.metadata?.activeTilesetId ?? null;
      if (activeId) {
        const activeEntry = catalog.find((entry) => entry?.id === activeId);
        if (Array.isArray(activeEntry?.seamPreview?.clusters)) {
          previewClusters = activeEntry.seamPreview.clusters;
        }
      }
      if (!Array.isArray(previewClusters)) {
        const fallbackEntry = catalog[0];
        if (Array.isArray(fallbackEntry?.seamPreview?.clusters)) {
          previewClusters = fallbackEntry.seamPreview.clusters;
        }
      }
    }
  }
  if (Array.isArray(previewClusters)) {
    return previewClusters;
  }
  return [];
}
