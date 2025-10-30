import { TileRotationMatrix } from '../../engine/procedural/TileRotationMatrix.js';

/**
 * TilemapTransformer
 *
 * Applies geometric transformations (currently rotation) to tilemaps and returns
 * placement-ready tile coordinates. Designed to centralise rotation math so future
 * seam painters and variant systems can share consistent data.
 */
export class TilemapTransformer {
  /**
   * Transform the provided tilemap.
   * @param {import('./TileMap.js').default} tilemap
   * @param {object} [options]
   * @param {number} [options.rotation=0] - Rotation to apply, degrees (normalised internally).
   * @param {object} [options.metadata] - Optional metadata preserved in the result.
   * @returns {{width: number, height: number, rotation: number, tiles: Array<{x: number, y: number, tile: number}>, metadata: object|null}}
   */
  transform(tilemap, options = {}) {
    if (!tilemap || typeof tilemap.getTile !== 'function') {
      throw new Error('[TilemapTransformer] transform requires a TileMap instance');
    }

    const rotation = TileRotationMatrix.normalizeRotation(options.rotation ?? 0);
    const width = tilemap.width;
    const height = tilemap.height;

    let transformedWidth = width;
    let transformedHeight = height;
    if (rotation !== 0) {
      const dims = TileRotationMatrix.rotateTileCoords(0, 0, width, height, rotation);
      transformedWidth = dims.width;
      transformedHeight = dims.height;
    }

    const tiles = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tilemap.getTile(x, y);
        if (rotation === 0) {
          tiles.push({ x, y, tile });
        } else {
          const coords = TileRotationMatrix.rotateTileCoords(x, y, width, height, rotation);
          tiles.push({
            x: coords.x,
            y: coords.y,
            tile,
          });
        }
      }
    }

    return {
      width: transformedWidth,
      height: transformedHeight,
      rotation,
      tiles,
      metadata: options.metadata ?? null,
    };
  }
}

export default TilemapTransformer;
