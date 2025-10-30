import TileMap, { TileType } from '../../../src/game/procedural/TileMap.js';
import { TemplateVariantResolver } from '../../../src/game/procedural/TemplateVariantResolver.js';
import { TilemapTransformer } from '../../../src/game/procedural/TilemapTransformer.js';
import { CorridorSeamPainter } from '../../../src/game/procedural/CorridorSeamPainter.js';

describe('Procedural tilemap infrastructure stubs', () => {
  describe('TemplateVariantResolver', () => {
    it('returns base template when no variants are registered', () => {
      const resolver = new TemplateVariantResolver();
      const tilemap = new TileMap(4, 4);
      const result = resolver.resolve({
        room: { id: 'room-1', type: 'crime_scene' },
        template: { tilemap },
        rotation: 450,
      });

      expect(result.tilemap).toBe(tilemap);
      expect(result.rotation).toBe(90);
      expect(result.variantId).toBeNull();
      expect(result.metadata).toEqual(
        expect.objectContaining({
          source: 'base-template',
          roomType: 'crime_scene',
        })
      );
    });
  });

  describe('TilemapTransformer', () => {
    it('rotates tile coordinates for quarter turns', () => {
      const tilemap = new TileMap(2, 3);
      tilemap.setTile(0, 0, TileType.WALL);
      tilemap.setTile(1, 2, TileType.DOOR);

      const transformer = new TilemapTransformer();
      const result = transformer.transform(tilemap, { rotation: 90 });

      expect(result.width).toBe(3);
      expect(result.height).toBe(2);
      expect(result.rotation).toBe(90);
      expect(result.tiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ x: 2, y: 0, tile: TileType.WALL }),
          expect.objectContaining({ x: 0, y: 1, tile: TileType.DOOR }),
        ])
      );
    });
  });

  describe('CorridorSeamPainter', () => {
    it('returns invocation summary without mutating the tilemap', () => {
      const seamPainter = new CorridorSeamPainter();
      const tilemap = new TileMap(4, 4);
      tilemap.setTile(1, 1, TileType.FLOOR);

      const summary = seamPainter.apply(tilemap, {
        corridors: [{ id: 'corridor-1', tiles: [] }],
        placements: [{ roomId: 'room-1' }],
      });

      expect(summary).toEqual(
        expect.objectContaining({
          applied: false,
          corridorsConsidered: 1,
          placementsConsidered: 1,
        })
      );
      expect(tilemap.getTile(1, 1)).toBe(TileType.FLOOR);
    });
  });
});
