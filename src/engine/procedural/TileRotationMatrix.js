/**
 * TileRotationMatrix
 *
 * Math helpers for rotating tile coordinates and metadata. Supports 90° increments,
 * normalising arbitrary inputs to the nearest supported orientation.
 */
export class TileRotationMatrix {
  /**
   * Normalise rotation into 0/90/180/270 degrees.
   * @param {number} rotation
   * @returns {number}
   */
  static normalizeRotation(rotation) {
    if (!Number.isFinite(rotation)) {
      return 0;
    }
    const wrapped = ((rotation % 360) + 360) % 360;
    const candidates = [0, 90, 180, 270];
    let closest = 0;
    let smallestDiff = Number.POSITIVE_INFINITY;
    for (const angle of candidates) {
      const diff = Math.abs(angle - wrapped);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closest = angle;
      }
    }
    return closest;
  }

  /**
   * Rotate tile coordinates within a template of width/height.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} rotation
   * @returns {{ x: number, y: number, width: number, height: number, rotation: number }}
   */
  static rotateTileCoords(x, y, width, height, rotation) {
    const w = toPositiveInt(width, 1);
    const h = toPositiveInt(height, 1);
    const nx = Number.isFinite(x) ? x : 0;
    const ny = Number.isFinite(y) ? y : 0;
    const normalised = TileRotationMatrix.normalizeRotation(rotation);

    switch (normalised) {
      case 0:
        return { x: nx, y: ny, width: w, height: h, rotation: 0 };
      case 90:
        return {
          x: h - 1 - ny,
          y: nx,
          width: h,
          height: w,
          rotation: 90,
        };
      case 180:
        return {
          x: w - 1 - nx,
          y: h - 1 - ny,
          width: w,
          height: h,
          rotation: 180,
        };
      case 270:
        return {
          x: ny,
          y: w - 1 - nx,
          width: h,
          height: w,
          rotation: 270,
        };
      default:
        return { x: nx, y: ny, width: w, height: h, rotation: 0 };
    }
  }

  /**
   * Transform a tile descriptor, returning a rotated clone with orientation metadata.
   * Expects tile.templateWidth/templateHeight to describe the bounds used for rotation.
   * @param {object} tile
   * @param {number} rotation
   * @returns {object}
   */
  static transformTile(tile, rotation) {
    if (!tile || typeof tile !== 'object') {
      throw new Error('[TileRotationMatrix] transformTile requires a tile object');
    }
    const templateWidth = toPositiveInt(tile.templateWidth ?? tile.width ?? 1, 1);
    const templateHeight = toPositiveInt(tile.templateHeight ?? tile.height ?? 1, 1);

    const baseRotation = TileRotationMatrix.normalizeRotation(tile.rotation || 0);
    const appliedRotation = TileRotationMatrix.normalizeRotation(rotation);
    const totalRotation = (baseRotation + appliedRotation) % 360;

    const rotated = TileRotationMatrix.rotateTileCoords(
      tile.x ?? 0,
      tile.y ?? 0,
      templateWidth,
      templateHeight,
      appliedRotation
    );

    // Flip handling: swapping axes when rotating 90°/270° swaps flip meaning.
    let flipX = Boolean(tile.flipX);
    let flipY = Boolean(tile.flipY);
    if (appliedRotation === 90 || appliedRotation === 270) {
      const prevFlipX = flipX;
      flipX = flipY;
      flipY = prevFlipX;
    }

    return {
      ...tile,
      x: rotated.x,
      y: rotated.y,
      rotation: totalRotation,
      flipX,
      flipY,
      templateWidth: rotated.width,
      templateHeight: rotated.height,
    };
  }
}

function toPositiveInt(value, fallback) {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

