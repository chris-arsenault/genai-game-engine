/**
 * CorridorSeamPainter
 *
 * Placeholder seam painter that will eventually adjust corridor tiles when room
 * templates rotate. Current implementation is a stub that records invocation
 * context to support telemetry and future development.
 */
export class CorridorSeamPainter {
  /**
   * Apply corridor seam adjustments.
   * @param {import('./TileMap.js').default} tilemap
   * @param {object} [context]
   * @param {Array<object>} [context.corridors]
   * @param {Array<object>} [context.placements] - Room placement summaries
   * @returns {{ applied: boolean, corridorsConsidered: number, placementsConsidered: number }}
   */
  apply(tilemap, context = {}) {
    if (!tilemap || typeof tilemap.getTile !== 'function') {
      throw new Error('[CorridorSeamPainter] apply requires a TileMap instance');
    }

    const corridorsConsidered = Array.isArray(context.corridors)
      ? context.corridors.length
      : 0;
    const placementsConsidered = Array.isArray(context.placements)
      ? context.placements.length
      : 0;

    return {
      applied: false,
      corridorsConsidered,
      placementsConsidered,
    };
  }
}

export default CorridorSeamPainter;
