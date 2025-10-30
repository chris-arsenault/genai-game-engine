import { TileRotationMatrix } from '../../engine/procedural/TileRotationMatrix.js';

/**
 * TemplateVariantResolver
 *
 * Resolves room template variants for rotated tile placements. Designed to allow
 * bespoke tilemaps per orientation or context while providing a safe fallback to
 * the base template when no variant data is supplied.
 */
export class TemplateVariantResolver {
  /**
   * @param {object|null} manifest - Optional manifest describing available variants.
   */
  constructor(manifest = null) {
    this.setManifest(manifest);
  }

  /**
   * Replace the active variant manifest.
   * @param {object|null} manifest
   */
  setManifest(manifest) {
    this.manifest =
      manifest && typeof manifest === 'object'
        ? manifest
        : {
            variants: {},
          };
  }

  /**
   * Retrieve the current manifest reference.
   * @returns {object}
   */
  getManifest() {
    return this.manifest;
  }

  /**
   * Resolve a variant for the given room/template context.
   * @param {object} context
   * @param {object} context.room - Room instance metadata
   * @param {object} context.template - Template data containing a TileMap
   * @param {number} context.rotation - Desired rotation (degrees)
   * @returns {{ tilemap: import('./TileMap.js').default|null, rotation: number, variantId: string|null, metadata?: object }}
   */
  resolve(context = {}) {
    const { room, template, rotation } = context;
    const normalisedRotation = TileRotationMatrix.normalizeRotation(rotation ?? 0);

    return {
      tilemap: template?.tilemap ?? null,
      rotation: normalisedRotation,
      variantId: null,
      metadata: {
        source: 'base-template',
        roomType: room?.type ?? null,
        requestedRotation: normalisedRotation,
      },
    };
  }
}

export default TemplateVariantResolver;
