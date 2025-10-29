import { TileRotationMatrix } from '../../../src/engine/procedural/TileRotationMatrix.js';

describe('TileRotationMatrix', () => {
  it('normalizes rotation angles to nearest ninety degrees', () => {
    expect(TileRotationMatrix.normalizeRotation(5)).toBe(0);
    expect(TileRotationMatrix.normalizeRotation(44)).toBe(0);
    expect(TileRotationMatrix.normalizeRotation(91)).toBe(90);
    expect(TileRotationMatrix.normalizeRotation(179)).toBe(180);
    expect(TileRotationMatrix.normalizeRotation(-90)).toBe(270);
    expect(TileRotationMatrix.normalizeRotation(725)).toBe(0);
  });

  it('rotates tile coordinates correctly for 90/180/270 degrees', () => {
    const rotated90 = TileRotationMatrix.rotateTileCoords(1, 2, 4, 3, 90);
    expect(rotated90).toEqual({ x: 0, y: 1, width: 3, height: 4, rotation: 90 });

    const rotated180 = TileRotationMatrix.rotateTileCoords(1, 2, 4, 3, 180);
    expect(rotated180).toEqual({ x: 2, y: 0, width: 4, height: 3, rotation: 180 });

    const rotated270 = TileRotationMatrix.rotateTileCoords(1, 2, 4, 3, 270);
    expect(rotated270).toEqual({ x: 2, y: 2, width: 3, height: 4, rotation: 270 });
  });

  it('transforms tile metadata while preserving immutability', () => {
    const tile = {
      x: 1,
      y: 0,
      templateWidth: 3,
      templateHeight: 2,
      rotation: 90,
      flipX: true,
      flipY: false,
      data: { tileId: 'door_east' },
    };

    const rotated = TileRotationMatrix.transformTile(tile, 90);

    expect(rotated).not.toBe(tile);
    expect(rotated.x).toBe(1);
    expect(rotated.y).toBe(1);
    expect(rotated.rotation).toBe(180);
    expect(rotated.flipX).toBe(false);
    expect(rotated.flipY).toBe(true);
    expect(rotated.templateWidth).toBe(2);
    expect(rotated.templateHeight).toBe(3);
    expect(rotated.data).toEqual(tile.data);
    // Original object unchanged
    expect(tile).toEqual({
      x: 1,
      y: 0,
      templateWidth: 3,
      templateHeight: 2,
      rotation: 90,
      flipX: true,
      flipY: false,
      data: { tileId: 'door_east' },
    });
  });

  it('throws when transformTile receives invalid input', () => {
    expect(() => TileRotationMatrix.transformTile(null, 90)).toThrow(
      '[TileRotationMatrix] transformTile requires a tile object'
    );
  });
});

