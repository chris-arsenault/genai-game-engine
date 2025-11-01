import TileMap, { TileType } from '../TileMap.js';
import { TilemapTransformer } from '../TilemapTransformer.js';
import { TileRotationMatrix } from '../../../engine/procedural/TileRotationMatrix.js';
import {
  NEON_DISTRICT_SEAM_PREVIEW,
  NEON_DISTRICT_SEAM_CLUSTERS_BY_ORIENTATION,
} from './neonDistrictSeamPreview.js';

const transformer = new TilemapTransformer();

const NEON_DISTRICT_TILESET_ATTACHMENT = Object.freeze({
  id: NEON_DISTRICT_SEAM_PREVIEW.tilesetId,
  seamPreview: NEON_DISTRICT_SEAM_PREVIEW,
  clustersByOrientation: NEON_DISTRICT_SEAM_CLUSTERS_BY_ORIENTATION,
});

function withNeonDistrictTilesetMetadata(metadata = {}) {
  return {
    ...metadata,
    tileset: NEON_DISTRICT_TILESET_ATTACHMENT,
  };
}

export const CRIME_SCENE_TEMPLATE_ID = 'act1_crime_scene_signature';
export const VENDOR_STALL_TEMPLATE_ID = 'act1_vendor_corner';
export const DETECTIVE_OFFICE_TEMPLATE_ID = 'act1_detective_office';
export const ALLEY_HUB_TEMPLATE_ID = 'act1_alley_hub';
export const PRECINCT_WAR_ROOM_TEMPLATE_ID = 'act1_precinct_war_room';
export const ALLEY_SPUR_TEMPLATE_ID = 'act1_alley_spur';

const CRIME_SCENE_BASE_TILEMAP = buildCrimeSceneBase();
const VENDOR_BASE_TILEMAP = buildVendorBase();
const DETECTIVE_OFFICE_BASE_TILEMAP = buildDetectiveOfficeBase();
const ALLEY_HUB_BASE_TILEMAP = buildAlleyHubBase();
const PRECINCT_WAR_ROOM_BASE_TILEMAP = buildPrecinctWarRoomBase();
const ALLEY_SPUR_BASE_TILEMAP = buildAlleySpurBase();

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
const DETECTIVE_OFFICE_BASE_SEAMS = [
  {
    x: Math.floor(DETECTIVE_OFFICE_BASE_TILEMAP.width / 2),
    y: DETECTIVE_OFFICE_BASE_TILEMAP.height - 1,
    tile: TileType.DOOR,
    edge: 'south',
    tags: ['primary_entry'],
  },
  {
    x: DETECTIVE_OFFICE_BASE_TILEMAP.width - 1,
    y: Math.floor(DETECTIVE_OFFICE_BASE_TILEMAP.height / 2),
    tile: TileType.DOOR,
    edge: 'east',
    tags: ['secondary_exit'],
  },
];
const ALLEY_HUB_BASE_SEAMS = [
  {
    x: Math.floor(ALLEY_HUB_BASE_TILEMAP.width / 2),
    y: 0,
    tile: TileType.DOOR,
    edge: 'north',
    tags: ['north_branch'],
  },
  {
    x: 0,
    y: Math.floor(ALLEY_HUB_BASE_TILEMAP.height / 2),
    tile: TileType.DOOR,
    edge: 'west',
    tags: ['west_branch'],
  },
  {
    x: ALLEY_HUB_BASE_TILEMAP.width - 1,
    y: Math.floor(ALLEY_HUB_BASE_TILEMAP.height / 2),
    tile: TileType.DOOR,
    edge: 'east',
    tags: ['east_branch'],
  },
  {
    x: Math.floor(ALLEY_HUB_BASE_TILEMAP.width / 2),
    y: ALLEY_HUB_BASE_TILEMAP.height - 1,
    tile: TileType.DOOR,
    edge: 'south',
    tags: ['south_branch'],
  },
];
const PRECINCT_WAR_ROOM_BASE_SEAMS = [
  {
    x: Math.floor(PRECINCT_WAR_ROOM_BASE_TILEMAP.width / 2) - 1,
    y: PRECINCT_WAR_ROOM_BASE_TILEMAP.height - 1,
    tile: TileType.DOOR,
    edge: 'south',
    tags: ['primary_entry', 'briefing_flow'],
  },
  {
    x: Math.floor(PRECINCT_WAR_ROOM_BASE_TILEMAP.width / 2),
    y: PRECINCT_WAR_ROOM_BASE_TILEMAP.height - 1,
    tile: TileType.DOOR,
    edge: 'south',
    tags: ['primary_entry', 'briefing_flow'],
  },
  {
    x: 0,
    y: Math.floor(PRECINCT_WAR_ROOM_BASE_TILEMAP.height / 2),
    tile: TileType.DOOR,
    edge: 'west',
    tags: ['operations_link'],
  },
  {
    x: PRECINCT_WAR_ROOM_BASE_TILEMAP.width - 1,
    y: Math.floor(PRECINCT_WAR_ROOM_BASE_TILEMAP.height / 2),
    tile: TileType.DOOR,
    edge: 'east',
    tags: ['balcony_access'],
  },
];
const ALLEY_SPUR_BASE_SEAMS = [
  {
    x: Math.floor(ALLEY_SPUR_BASE_TILEMAP.width / 2),
    y: ALLEY_SPUR_BASE_TILEMAP.height - 1,
    tile: TileType.DOOR,
    edge: 'south',
    tags: ['hub_connection'],
  },
  {
    x: ALLEY_SPUR_BASE_TILEMAP.width - 1,
    y: Math.floor(ALLEY_SPUR_BASE_TILEMAP.height / 2),
    tile: TileType.DOOR,
    edge: 'east',
    tags: ['side_exit'],
  },
];

const CRIME_SCENE_VARIANTS = buildCrimeSceneVariants();
const VENDOR_VARIANTS = buildVendorVariants();
const DETECTIVE_OFFICE_VARIANTS = buildDetectiveOfficeVariants();
const ALLEY_HUB_VARIANTS = buildAlleyHubVariants();
const PRECINCT_WAR_ROOM_VARIANTS = buildPrecinctWarRoomVariants();
const ALLEY_SPUR_VARIANTS = buildAlleySpurVariants();

/**
 * Default manifest consumed by TemplateVariantResolver / DistrictGenerator.
 */
export const templateVariantManifest = {
  templates: {
    [CRIME_SCENE_TEMPLATE_ID]: {
      metadata: withNeonDistrictTilesetMetadata({
        roomType: 'crime_scene',
        variantFamily: 'act1_signature_crime_scene',
        moodHint: 'investigation_peak',
      }),
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
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 90,
            lighting: 'side-lit',
          }),
        },
        '180': {
          variantId: `${CRIME_SCENE_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: CRIME_SCENE_VARIANTS['180'].tilemap,
          seams: CRIME_SCENE_VARIANTS['180'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 180,
            lighting: 'noir-backlit',
          }),
        },
        '270': {
          variantId: `${CRIME_SCENE_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: CRIME_SCENE_VARIANTS['270'].tilemap,
          seams: CRIME_SCENE_VARIANTS['270'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 270,
            lighting: 'holo-glow',
          }),
        },
      },
    },
    [VENDOR_STALL_TEMPLATE_ID]: {
      metadata: withNeonDistrictTilesetMetadata({
        roomType: 'shop',
        variantFamily: 'act1_vendor_microshop',
        moodHint: 'market_intrigue',
      }),
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
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 90,
            vendorFacing: 'east-alley',
          }),
        },
        '180': {
          variantId: `${VENDOR_STALL_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: VENDOR_VARIANTS['180'].tilemap,
          seams: VENDOR_VARIANTS['180'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 180,
            vendorFacing: 'south-square',
          }),
        },
        '270': {
          variantId: `${VENDOR_STALL_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: VENDOR_VARIANTS['270'].tilemap,
          seams: VENDOR_VARIANTS['270'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 270,
            vendorFacing: 'west-arcade',
          }),
        },
      },
    },
    [DETECTIVE_OFFICE_TEMPLATE_ID]: {
      metadata: withNeonDistrictTilesetMetadata({
        roomType: 'detective_office',
        variantFamily: 'act1_detective_office_suite',
        moodHint: 'investigative_hub',
      }),
      fallbackStrategy: 'rotate',
      seams: {
        base: DETECTIVE_OFFICE_BASE_SEAMS,
      },
      variants: {
        '90': {
          variantId: `${DETECTIVE_OFFICE_TEMPLATE_ID}_r90`,
          rotation: 0,
          tilemap: DETECTIVE_OFFICE_VARIANTS['90'].tilemap,
          seams: DETECTIVE_OFFICE_VARIANTS['90'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 90,
            deskLayout: 'corner_cluster',
          }),
        },
        '180': {
          variantId: `${DETECTIVE_OFFICE_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: DETECTIVE_OFFICE_VARIANTS['180'].tilemap,
          seams: DETECTIVE_OFFICE_VARIANTS['180'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 180,
            deskLayout: 'dual_wall',
          }),
        },
        '270': {
          variantId: `${DETECTIVE_OFFICE_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: DETECTIVE_OFFICE_VARIANTS['270'].tilemap,
          seams: DETECTIVE_OFFICE_VARIANTS['270'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 270,
            deskLayout: 'evidence_circle',
          }),
        },
      },
    },
    [ALLEY_HUB_TEMPLATE_ID]: {
      metadata: withNeonDistrictTilesetMetadata({
        roomType: 'alley',
        variantFamily: 'act1_alley_hub',
        moodHint: 'shadow_network',
      }),
      fallbackStrategy: 'rotate',
      seams: {
        base: ALLEY_HUB_BASE_SEAMS,
      },
      variants: {
        '90': {
          variantId: `${ALLEY_HUB_TEMPLATE_ID}_r90`,
          rotation: 0,
          tilemap: ALLEY_HUB_VARIANTS['90'].tilemap,
          seams: ALLEY_HUB_VARIANTS['90'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 90,
            accessPattern: 'vertical_split',
          }),
        },
        '180': {
          variantId: `${ALLEY_HUB_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: ALLEY_HUB_VARIANTS['180'].tilemap,
          seams: ALLEY_HUB_VARIANTS['180'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 180,
            accessPattern: 'opposite_branches',
          }),
        },
        '270': {
          variantId: `${ALLEY_HUB_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: ALLEY_HUB_VARIANTS['270'].tilemap,
          seams: ALLEY_HUB_VARIANTS['270'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 270,
            accessPattern: 'skewed_cross',
          }),
        },
      },
    },
    [PRECINCT_WAR_ROOM_TEMPLATE_ID]: {
      metadata: withNeonDistrictTilesetMetadata({
        roomType: 'precinct_war_room',
        variantFamily: 'act1_precinct_command',
        moodHint: 'strategic_tension',
      }),
      fallbackStrategy: 'rotate',
      seams: {
        base: PRECINCT_WAR_ROOM_BASE_SEAMS,
      },
      variants: {
        '90': {
          variantId: `${PRECINCT_WAR_ROOM_TEMPLATE_ID}_r90`,
          rotation: 0,
          tilemap: PRECINCT_WAR_ROOM_VARIANTS['90'].tilemap,
          seams: PRECINCT_WAR_ROOM_VARIANTS['90'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 90,
            commandFocus: 'evidence_matrix',
          }),
        },
        '180': {
          variantId: `${PRECINCT_WAR_ROOM_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: PRECINCT_WAR_ROOM_VARIANTS['180'].tilemap,
          seams: PRECINCT_WAR_ROOM_VARIANTS['180'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 180,
            commandFocus: 'surveillance_wall',
          }),
        },
        '270': {
          variantId: `${PRECINCT_WAR_ROOM_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: PRECINCT_WAR_ROOM_VARIANTS['270'].tilemap,
          seams: PRECINCT_WAR_ROOM_VARIANTS['270'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 270,
            commandFocus: 'strategic_projection',
          }),
        },
      },
    },
    [ALLEY_SPUR_TEMPLATE_ID]: {
      metadata: withNeonDistrictTilesetMetadata({
        roomType: 'alley_spur',
        variantFamily: 'act1_side_alley',
        moodHint: 'escape_route',
      }),
      fallbackStrategy: 'rotate',
      seams: {
        base: ALLEY_SPUR_BASE_SEAMS,
      },
      variants: {
        '90': {
          variantId: `${ALLEY_SPUR_TEMPLATE_ID}_r90`,
          rotation: 0,
          tilemap: ALLEY_SPUR_VARIANTS['90'].tilemap,
          seams: ALLEY_SPUR_VARIANTS['90'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 90,
            branch: 'north_escape',
          }),
        },
        '180': {
          variantId: `${ALLEY_SPUR_TEMPLATE_ID}_r180`,
          rotation: 0,
          tilemap: ALLEY_SPUR_VARIANTS['180'].tilemap,
          seams: ALLEY_SPUR_VARIANTS['180'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 180,
            branch: 'west_detour',
          }),
        },
        '270': {
          variantId: `${ALLEY_SPUR_TEMPLATE_ID}_r270`,
          rotation: 0,
          tilemap: ALLEY_SPUR_VARIANTS['270'].tilemap,
          seams: ALLEY_SPUR_VARIANTS['270'].seams,
          metadata: withNeonDistrictTilesetMetadata({
            orientation: 270,
            branch: 'midnight_cache',
          }),
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
        metadata: withNeonDistrictTilesetMetadata({
          lighting: 'neon-alley',
          moodHint: 'investigation_peak',
        }),
      };
    case 'shop':
      return {
        templateId: VENDOR_STALL_TEMPLATE_ID,
        tilemap: VENDOR_BASE_TILEMAP.clone(),
        metadata: withNeonDistrictTilesetMetadata({
          stallType: 'act1_vendor',
          moodHint: 'market_intrigue',
        }),
      };
    case 'detective_office':
      return {
        templateId: DETECTIVE_OFFICE_TEMPLATE_ID,
        tilemap: DETECTIVE_OFFICE_BASE_TILEMAP.clone(),
        metadata: withNeonDistrictTilesetMetadata({
          hubRole: 'case_command',
          moodHint: 'investigative_hub',
        }),
      };
    case 'alley':
      return {
        templateId: ALLEY_HUB_TEMPLATE_ID,
        tilemap: ALLEY_HUB_BASE_TILEMAP.clone(),
        metadata: withNeonDistrictTilesetMetadata({
          hubType: 'crossroads',
          moodHint: 'shadow_network',
        }),
      };
    case 'precinct_war_room':
      return {
        templateId: PRECINCT_WAR_ROOM_TEMPLATE_ID,
        tilemap: PRECINCT_WAR_ROOM_BASE_TILEMAP.clone(),
        metadata: withNeonDistrictTilesetMetadata({
          commandTier: 'act1_precinct',
          moodHint: 'strategic_tension',
        }),
      };
    case 'alley_spur':
      return {
        templateId: ALLEY_SPUR_TEMPLATE_ID,
        tilemap: ALLEY_SPUR_BASE_TILEMAP.clone(),
        metadata: withNeonDistrictTilesetMetadata({
          branchRole: 'side_route',
          moodHint: 'escape_route',
        }),
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

function buildDetectiveOfficeBase() {
  const width = 12;
  const height = 8;
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

  const midX = Math.floor(width / 2);
  tilemap.setTile(midX, height - 1, TileType.DOOR);
  tilemap.setTile(midX - 1, height - 1, TileType.DOOR);
  tilemap.setTile(width - 1, Math.floor(height / 2), TileType.DOOR);

  tilemap.fillRect(2, 2, width - 4, 1, TileType.DEBRIS);
  tilemap.fillRect(3, 4, 2, 2, TileType.EVIDENCE);
  tilemap.setTile(width - 3, 3, TileType.BLOOD);

  return tilemap;
}

function buildAlleyHubBase() {
  const width = 9;
  const height = 9;
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

  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  tilemap.setTile(midX, 0, TileType.DOOR);
  tilemap.setTile(0, midY, TileType.DOOR);
  tilemap.setTile(width - 1, midY, TileType.DOOR);
  tilemap.setTile(midX, height - 1, TileType.DOOR);

  tilemap.fillRect(midX - 1, midY - 1, 3, 3, TileType.DEBRIS);
  tilemap.setTile(midX - 2, midY, TileType.EVIDENCE);
  tilemap.setTile(midX + 2, midY - 1, TileType.BLOOD);

  return tilemap;
}

function buildPrecinctWarRoomBase() {
  const width = 14;
  const height = 10;
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

  const southMid = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  tilemap.setTile(southMid, height - 1, TileType.DOOR);
  tilemap.setTile(southMid - 1, height - 1, TileType.DOOR);
  tilemap.setTile(0, midY, TileType.DOOR);
  tilemap.setTile(width - 1, midY, TileType.DOOR);

  tilemap.fillRect(3, 3, width - 6, 1, TileType.DEBRIS);
  tilemap.fillRect(3, 5, width - 6, 1, TileType.DEBRIS);
  tilemap.fillRect(2, 2, 3, 1, TileType.EVIDENCE);
  tilemap.fillRect(width - 5, 2, 3, 1, TileType.EVIDENCE);
  tilemap.setTile(southMid, midY, TileType.EVIDENCE);

  return tilemap;
}

function buildAlleySpurBase() {
  const width = 7;
  const height = 7;
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

  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  tilemap.setTile(midX, height - 1, TileType.DOOR);
  tilemap.setTile(width - 1, midY, TileType.DOOR);

  tilemap.fillRect(2, 2, 3, 1, TileType.DEBRIS);
  tilemap.setTile(midX + 1, midY - 1, TileType.EVIDENCE);
  tilemap.setTile(midX - 2, midY + 1, TileType.BLOOD);

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

function buildDetectiveOfficeVariants() {
  return {
    '90': makeVariant(DETECTIVE_OFFICE_BASE_TILEMAP, DETECTIVE_OFFICE_BASE_SEAMS, 90, (map) => {
      map.fillRect(2, map.height - 3, 3, 2, TileType.EVIDENCE);
      map.setTile(map.width - 3, Math.floor(map.height / 2), TileType.DEBRIS);
    }),
    '180': makeVariant(DETECTIVE_OFFICE_BASE_TILEMAP, DETECTIVE_OFFICE_BASE_SEAMS, 180, (map) => {
      map.fillRect(3, 2, 2, 2, TileType.DEBRIS);
      map.setTile(map.width - 4, map.height - 3, TileType.EVIDENCE);
    }),
    '270': makeVariant(DETECTIVE_OFFICE_BASE_TILEMAP, DETECTIVE_OFFICE_BASE_SEAMS, 270, (map) => {
      map.setTile(2, Math.floor(map.height / 2), TileType.EVIDENCE);
      map.fillRect(map.width - 5, 2, 2, 2, TileType.DEBRIS);
    }),
  };
}

function buildAlleyHubVariants() {
  return {
    '90': makeVariant(ALLEY_HUB_BASE_TILEMAP, ALLEY_HUB_BASE_SEAMS, 90, (map) => {
      map.fillRect(Math.floor(map.width / 2) - 2, 1, 4, 1, TileType.EVIDENCE);
    }),
    '180': makeVariant(ALLEY_HUB_BASE_TILEMAP, ALLEY_HUB_BASE_SEAMS, 180, (map) => {
      map.fillRect(1, Math.floor(map.height / 2) - 1, 2, 2, TileType.DEBRIS);
      map.fillRect(map.width - 3, Math.floor(map.height / 2) - 1, 2, 2, TileType.DEBRIS);
    }),
    '270': makeVariant(ALLEY_HUB_BASE_TILEMAP, ALLEY_HUB_BASE_SEAMS, 270, (map) => {
      map.setTile(Math.floor(map.width / 2), 1, TileType.BLOOD);
      map.setTile(Math.floor(map.width / 2), map.height - 2, TileType.EVIDENCE);
    }),
  };
}

function buildPrecinctWarRoomVariants() {
  return {
    '90': makeVariant(
      PRECINCT_WAR_ROOM_BASE_TILEMAP,
      PRECINCT_WAR_ROOM_BASE_SEAMS,
      90,
      (map) => {
        map.fillRect(1, Math.floor(map.height / 2) - 1, 1, 2, TileType.EVIDENCE);
        map.setTile(map.width - 3, 2, TileType.DEBRIS);
      }
    ),
    '180': makeVariant(
      PRECINCT_WAR_ROOM_BASE_TILEMAP,
      PRECINCT_WAR_ROOM_BASE_SEAMS,
      180,
      (map) => {
        map.fillRect(Math.floor(map.width / 2) - 2, map.height - 3, 4, 1, TileType.DEBRIS);
        map.setTile(Math.floor(map.width / 2), 2, TileType.EVIDENCE);
      }
    ),
    '270': makeVariant(
      PRECINCT_WAR_ROOM_BASE_TILEMAP,
      PRECINCT_WAR_ROOM_BASE_SEAMS,
      270,
      (map) => {
        map.setTile(2, Math.floor(map.height / 2), TileType.BLOOD);
        map.fillRect(map.width - 4, 3, 2, 2, TileType.EVIDENCE);
      }
    ),
  };
}

function buildAlleySpurVariants() {
  return {
    '90': makeVariant(ALLEY_SPUR_BASE_TILEMAP, ALLEY_SPUR_BASE_SEAMS, 90, (map) => {
      map.setTile(map.width - 2, 1, TileType.EVIDENCE);
      map.setTile(1, Math.floor(map.height / 2), TileType.DEBRIS);
    }),
    '180': makeVariant(ALLEY_SPUR_BASE_TILEMAP, ALLEY_SPUR_BASE_SEAMS, 180, (map) => {
      map.fillRect(1, Math.floor(map.height / 2), 1, 2, TileType.DEBRIS);
      map.setTile(map.width - 2, map.height - 2, TileType.EVIDENCE);
    }),
    '270': makeVariant(ALLEY_SPUR_BASE_TILEMAP, ALLEY_SPUR_BASE_SEAMS, 270, (map) => {
      map.setTile(Math.floor(map.width / 2), 1, TileType.BLOOD);
      map.setTile(1, Math.floor(map.height / 2), TileType.EVIDENCE);
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
