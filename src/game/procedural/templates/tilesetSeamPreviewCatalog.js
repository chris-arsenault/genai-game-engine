import { NEON_DISTRICT_TILESET_ATTACHMENT } from './neonDistrictSeamPreview.js';
import { CORPORATE_SPIRES_TILESET_ATTACHMENT } from './corporateSpiresSeamPreview.js';
import { ARCHIVE_UNDERCITY_TILESET_ATTACHMENT } from './archiveUndercitySeamPreview.js';
import { ZENITH_SECTOR_TILESET_ATTACHMENT } from './zenithSectorSeamPreview.js';

const TILESET_ATTACHMENTS = Object.freeze([
  NEON_DISTRICT_TILESET_ATTACHMENT,
  CORPORATE_SPIRES_TILESET_ATTACHMENT,
  ARCHIVE_UNDERCITY_TILESET_ATTACHMENT,
  ZENITH_SECTOR_TILESET_ATTACHMENT,
]);

const TILESET_ATTACHMENTS_BY_ID = Object.freeze(
  TILESET_ATTACHMENTS.reduce((acc, attachment) => {
    acc[attachment.id] = attachment;
    return acc;
  }, Object.create(null))
);

export function getTilesetSeamPreviewCatalog() {
  return TILESET_ATTACHMENTS;
}

export function getTilesetSeamPreviewById(tilesetId) {
  if (!tilesetId) {
    return null;
  }
  return TILESET_ATTACHMENTS_BY_ID[tilesetId] ?? null;
}

export function applyTilesetCatalogMetadata(metadata = {}, options = {}) {
  const catalog = TILESET_ATTACHMENTS;
  const lookup = TILESET_ATTACHMENTS_BY_ID;
  const requestedId = options?.activeTilesetId;
  const activeAttachment = (requestedId && lookup[requestedId]) || catalog[0];

  return {
    ...metadata,
    activeTilesetId: activeAttachment.id,
    tileset: activeAttachment,
    tilesetCatalog: catalog,
    tilesetCatalogMap: { ...lookup },
  };
}

export {
  NEON_DISTRICT_TILESET_ATTACHMENT,
  CORPORATE_SPIRES_TILESET_ATTACHMENT,
  ARCHIVE_UNDERCITY_TILESET_ATTACHMENT,
  ZENITH_SECTOR_TILESET_ATTACHMENT,
};

