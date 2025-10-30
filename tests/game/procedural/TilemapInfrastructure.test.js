import TileMap, { TileType } from '../../../src/game/procedural/TileMap.js';
import { TemplateVariantResolver } from '../../../src/game/procedural/TemplateVariantResolver.js';
import { TilemapTransformer } from '../../../src/game/procedural/TilemapTransformer.js';
import { CorridorSeamPainter } from '../../../src/game/procedural/CorridorSeamPainter.js';

describe('Procedural tilemap infrastructure', () => {
  describe('TemplateVariantResolver', () => {
    it('returns base template when no variants are registered', () => {
      const resolver = new TemplateVariantResolver();
      const tilemap = new TileMap(4, 4);
      const result = resolver.resolve({
        room: { id: 'room-1', type: 'crime_scene' },
        template: { id: 'crime_scene_template', tilemap },
        rotation: 450,
      });

      expect(result.tilemap).toBe(tilemap);
      expect(result.rotation).toBe(90);
      expect(result.variantId).toBeNull();
      expect(result.metadata).toEqual(
        expect.objectContaining({
          source: 'base-template',
          roomType: 'crime_scene',
          strategy: 'rotate',
        })
      );
      expect(result.strategy).toBe('rotate');
      expect(result.seams).toEqual([]);
    });

    it('selects variant tilemap with bespoke seam metadata when manifest defines rotation override', () => {
      const baseTilemap = new TileMap(4, 4);
      const variantTilemap = new TileMap(4, 4);
      variantTilemap.setTile(2, 1, TileType.DOOR);

      const manifest = {
        templates: {
          crime_scene_template: {
            metadata: { templateFamily: 'crime_scene' },
            variants: {
              '90': {
                variantId: 'crime_scene_r90',
                tilemap: variantTilemap,
                seams: [{ x: 2, y: 1, tile: TileType.DOOR, edge: 'east' }],
              },
            },
          },
        },
      };

      const resolver = new TemplateVariantResolver(manifest);
      const result = resolver.resolve({
        room: { id: 'room-9', type: 'crime_scene' },
        template: { id: 'crime_scene_template', tilemap: baseTilemap },
        rotation: 90,
      });

      expect(result.tilemap).toBe(variantTilemap);
      expect(result.rotation).toBe(0);
      expect(result.variantId).toBe('crime_scene_r90');
      expect(result.strategy).toBe('variant');
      expect(result.metadata).toEqual(
        expect.objectContaining({
          source: 'variant',
          templateId: 'crime_scene_template',
          requestedRotation: 90,
          appliedRotation: 0,
          strategy: 'variant',
        })
      );
      expect(result.seams).toEqual([
        expect.objectContaining({ x: 2, y: 1, tile: TileType.DOOR, edge: 'east' }),
      ]);
    });

    it('rotates seam metadata when falling back to base template rotation', () => {
      const tilemap = new TileMap(3, 2);
      tilemap.setTile(1, 0, TileType.FLOOR);

      const manifest = {
        templates: {
          rotated_lab: {
            seams: {
              base: [{ x: 1, y: 0, tile: TileType.DOOR, edge: 'north' }],
            },
          },
        },
      };

      const resolver = new TemplateVariantResolver(manifest);
      const result = resolver.resolve({
        room: { id: 'lab-1', type: 'laboratory' },
        template: { id: 'rotated_lab', tilemap },
        rotation: 180,
      });

      expect(result.strategy).toBe('rotate');
      expect(result.rotation).toBe(180);
      expect(result.seams).toEqual([
        expect.objectContaining({ x: 1, y: 1, tile: TileType.DOOR, edge: 'south' }),
      ]);
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
          placementsWithSeams: 0,
          seamsApplied: 0,
          skippedOutOfBounds: 0,
        })
      );
      expect(tilemap.getTile(1, 1)).toBe(TileType.FLOOR);
    });

    it('paints door seams based on placement seam metadata', () => {
      const seamPainter = new CorridorSeamPainter();
      const tilemap = new TileMap(6, 6);
      tilemap.fill(TileType.WALL);
      tilemap.setTile(3, 2, TileType.FLOOR);

      const summary = seamPainter.apply(tilemap, {
        corridors: [],
        placements: [
          {
            roomId: 'room-42',
            position: { x: 2, y: 2 },
            seams: [{ x: 1, y: 0, tile: TileType.DOOR }],
          },
        ],
      });

      expect(summary.applied).toBe(true);
      expect(summary.seamsApplied).toBe(1);
      expect(tilemap.getTile(3, 2)).toBe(TileType.DOOR);
    });
  });
});
