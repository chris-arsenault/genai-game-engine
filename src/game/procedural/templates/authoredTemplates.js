import TileMap, { TileType } from '../TileMap.js';
import { TilemapTransformer } from '../TilemapTransformer.js';
import { TileRotationMatrix } from '../../../engine/procedural/TileRotationMatrix.js';

const transformer = new TilemapTransformer();

export const CRIME_SCENE_TEMPLATE_ID = 'act1_crime_scene_signature';
export const VENDOR_STALL_TEMPLATE_ID = 'act1_vendor_corner';

const CRIME_SCENE_BASE_TILEMAP = buildCrimeSceneBase();
const VENDOR_BASE_TILEMAP = buildVendorBase();

const CRIME_SCENE_BASE_SEAMS = [
  {
    x: Math.floor(CRIME_SCENE_BASE_TILEMAP.width / 2),
    y: 0,
    tile: TileType.DOOR,
    edge: 'north',
  },
];

const VENDOR_BASE_SEAMS = [
  {
    x: Math.floor(VENDOR_BASE_TILEMAP.width / 2),
    y: VENDOR_BASE_TILEMAP.height - 1,
    tile: TileType.DOOR,
    edge: 'south',
  },
];

const CRIME_SCENE_VARIANTS = buildCrimeSceneVariants();
const VENDOR_VARIANTS = buildVendorVariants();

/**
 * Default manifest consumed by TemplateVariantResolver / DistrictGenerator.
 */
export const templateVariantManifest = {
  templates: {
    [CRIME_SCENE_TEMPLATE_ID]: {
      metadata: {
        roomType: 'crime_scene',
        variantFamily: 'act1_signature_crime_scene',
        moodHint: 'investigation_peak',
      },
      fallbackStrategy: 'rotate',
      seams: {
        base: CRIME_SCENE_BASE_SEAMS,
      },
      variants: {
        '90': {
          variantId: `${CRIME_SCENE_TEMPLATE_ID}_r90`,
          rotation: 0,
          tilemap: CRIME_SCENE_VARIANTS['90'].tilemap,
          seams: CRIME_SCENE_VARIANTS['90'].seams,
          metadata: {
            orientation: 90,
            lighting: 'side-lit',
          },
        },
        '180': {
          variantId: `${CRIME_SCENE_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: CRIME_SCENE_VARIANTS['180'].tilemap,
          seams: CRIME_SCENE_VARIANTS['180'].seams,
          metadata: {
            orientation: 180,
            lighting: 'noir-backlit',
          },
        },
        '270': {
          variantId: `${CRIME_SCENE_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: CRIME_SCENE_VARIANTS['270'].tilemap,
          seams: CRIME_SCENE_VARIANTS['270'].seams,
          metadata: {
            orientation: 270,
            lighting: 'holo-glow',
          },
        },
      },
    },
    [VENDOR_STALL_TEMPLATE_ID]: {
      metadata: {
        roomType: 'shop',
        variantFamily: 'act1_vendor_microshop',
        moodHint: 'market_intrigue',
      },
      fallbackStrategy: 'rotate',
      seams: {
        base: VENDOR_BASE_SEAMS,
      },
      variants: {
        '90': {
          variantId: `${VENDOR_STALL_TEMPLATE_ID}_r90`,
          rotation: 0,
          tilemap: VENDOR_VARIANTS['90'].tilemap,
          seams: VENDOR_VARIANTS['90'].seams,
          metadata: {
            orientation: 90,
            vendorFacing: 'east-alley',
          },
        },
        '180': {
          variantId: `${VENDOR_STALL_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: VENDOR_VARIANTS['180'].tilemap,
          seams: VENDOR_VARIANTS['180'].seams,
          metadata: {
            orientation: 180,
            vendorFacing: 'south-square',
          },
        },
        '270': {
          variantId: `${VENDOR_STALL_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: VENDOR_VARIANTS['270'].tilemap,
          seams: VENDOR_VARIANTS['270'].seams,
          metadata: {
            orientation: 270,
            vendorFacing: 'west-arcade',
          },
        },
      },
    },
  },
};

/**
 * Factory returning an authored template setup for supported room types.
 * @param {string} roomType
 * @returns {{templateId: string, tilemap: TileMap, metadata: object}|null}
 */
export function createAuthoredTemplateForRoomType(roomType) {
  switch (roomType) {
    case 'crime_scene':
      return {
        templateId: CRIME_SCENE_TEMPLATE_ID,
        tilemap: CRIME_SCENE_BASE_TILEMAP.clone(),
        metadata: {
          lighting: 'neon-alley',
          moodHint: 'investigation_peak',
        },
      };
    case 'shop':
      return {
        templateId: VENDOR_STALL_TEMPLATE_ID,
        tilemap: VENDOR_BASE_TILEMAP.clone(),
        metadata: {
          stallType: 'act1_vendor',
          moodHint: 'market_intrigue',
        },
      };
    default:
      return null;
  }
}

function buildCrimeSceneBase() {
  const width = 10;
  const height = 8;
  const tilemap = new TileMap(width, height);
  tilemap.fill(TileType.FLOOR);

  // Outer walls
  for (let x = 0; x < width; x++) {
    tilemap.setTile(x, 0, TileType.WALL);
    tilemap.setTile(x, height - 1, TileType.WALL);
  }
  for (let y = 0; y < height; y++) {
    tilemap.setTile(0, y, TileType.WALL);
    tilemap.setTile(width - 1, y, TileType.WALL);
  }

  // Double door on the north edge
  const mid = Math.floor(width / 2);
  tilemap.setTile(mid, 0, TileType.DOOR);
  tilemap.setTile(mid - 1, 0, TileType.DOOR);

  // Scatter forensic clutter
  tilemap.setTile(2, 2, TileType.DEBRIS);
  tilemap.setTile(width - 3, 3, TileType.EVIDENCE);
  tilemap.setTile(mid, Math.floor(height / 2), TileType.BLOOD);

  return tilemap;
}

function buildVendorBase() {
  const width = 8;
  const height = 6;
  const tilemap = new TileMap(width, height);
  tilemap.fill(TileType.FLOOR);

  for (let x = 0; x < width; x++) {
    tilemap.setTile(x, 0, TileType.WALL);
    tilemap.setTile(x, height - 1, TileType.WALL);
  }
  for (let y = 0; y < height; y++) {
    tilemap.setTile(0, y, TileType.WALL);
    tilemap.setTile(width - 1, y, TileType.WALL);
  }

  // Entrance on south edge
  const mid = Math.floor(width / 2);
  tilemap.setTile(mid, height - 1, TileType.DOOR);

  // Counter and stock highlights
  tilemap.setTile(2, 1, TileType.DEBRIS);
  tilemap.setTile(5, 2, TileType.EVIDENCE);

  return tilemap;
}

function buildCrimeSceneVariants() {
  return {
    '90': makeVariant(CRIME_SCENE_BASE_TILEMAP, CRIME_SCENE_BASE_SEAMS, 90, (map) => {
      map.setTile(1, 1, TileType.BLOOD);
      map.setTile(Math.max(0, map.width - 3), map.height - 3, TileType.EVIDENCE);
    }),
    '180': makeVariant(CRIME_SCENE_BASE_TILEMAP, CRIME_SCENE_BASE_SEAMS, 180, (map) => {
      map.setTile(Math.floor(map.width / 2), map.height - 2, TileType.BLOOD);
    }),
    '270': makeVariant(CRIME_SCENE_BASE_TILEMAP, CRIME_SCENE_BASE_SEAMS, 270, (map) => {
      map.setTile(1, map.height - 2, TileType.DEBRIS);
    }),
  };
}

function buildVendorVariants() {
  return {
    '90': makeVariant(VENDOR_BASE_TILEMAP, VENDOR_BASE_SEAMS, 90, (map) => {
      map.setTile(1, Math.floor(map.height / 2), TileType.EVIDENCE);
    }),
    '180': makeVariant(VENDOR_BASE_TILEMAP, VENDOR_BASE_SEAMS, 180, (map) => {
      map.setTile(Math.floor(map.width / 2), 1, TileType.DEBRIS);
    }),
    '270': makeVariant(VENDOR_BASE_TILEMAP, VENDOR_BASE_SEAMS, 270, (map) => {
      map.setTile(map.width - 2, Math.floor(map.height / 2), TileType.EVIDENCE);
    }),
  };
}

function makeVariant(baseTilemap, baseSeams, rotation, mutateFn) {
  const rotated = rotateTilemap(baseTilemap, rotation);
  if (typeof mutateFn === 'function') {
    mutateFn(rotated);
  }
  return {
    tilemap: rotated,
    seams: rotateSeams(baseSeams, baseTilemap, rotation),
  };
}

function rotateTilemap(tilemap, rotation) {
  const result = transformer.transform(tilemap, { rotation });
  const rotated = new TileMap(result.width, result.height, tilemap.tileSize);
  for (const entry of result.tiles) {
    rotated.setTile(entry.x, entry.y, entry.tile);
  }
  return rotated;
}

function rotateSeams(seams, tilemap, rotation) {
  return seams.map((seam) => {
    const coords = TileRotationMatrix.rotateTileCoords(
      seam.x,
      seam.y,
      tilemap.width,
      tilemap.height,
      rotation
    );
    return {
      ...seam,
      x: coords.x,
      y: coords.y,
      edge: rotateEdge(seam.edge, rotation),
      rotation: TileRotationMatrix.normalizeRotation((seam.rotation || 0) + rotation),
    };
  });
}

function rotateEdge(edge, rotation) {
  if (!edge) {
    return edge ?? null;
  }
  const order = ['north', 'east', 'south', 'west'];
  const steps = Math.floor((TileRotationMatrix.normalizeRotation(rotation) / 90) % 4);
  const index = order.indexOf(edge);
  if (index === -1) {
    return edge;
  }
  return order[(index + steps) % order.length];
}

