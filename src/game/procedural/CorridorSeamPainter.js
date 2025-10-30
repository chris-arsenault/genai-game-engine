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

    for (const placement of placements) {
      if (!placement || !Array.isArray(placement.seams) || placement.seams.length === 0) {
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
    }

    return {
      applied: seamsApplied > 0,
      corridorsConsidered: corridors.length,
      placementsConsidered: placements.length,
      placementsWithSeams,
      seamsApplied,
      skippedOutOfBounds,
    };
  }
}

export default CorridorSeamPainter;
