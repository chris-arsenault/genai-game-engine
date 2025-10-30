import { TileRotationMatrix } from '../../engine/procedural/TileRotationMatrix.js';

/**
 * TemplateVariantResolver
 *
 * Resolves room template variants for rotated tile placements. Supports manifest-driven
 * overrides, rotation fallbacks, and seam metadata generation so corridor painters can
 * align door tiles with rotated rooms.
 */
export class TemplateVariantResolver {
  /**
   * @param {object|null} manifest - Optional manifest describing available variants.
   */
  constructor(manifest = null) {
    this.setManifest(manifest);
    this._cache = new Map();
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
            templates: {},
            roomTypes: {},
          };
    this._cache?.clear?.();
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
   * @returns {{
   *   tilemap: import('./TileMap.js').default|null,
   *   rotation: number,
   *   variantId: string|null,
   *   metadata: object,
   *   seams: Array<object>,
   *   strategy: 'variant'|'rotate'
   * }}
   */
  resolve(context = {}) {
    const { room = {}, template = {}, rotation = 0 } = context;
    const normalizedRotation = TileRotationMatrix.normalizeRotation(rotation ?? 0);
    const templateId = this._resolveTemplateId(context);
    const cacheKey = `${templateId || 'unknown'}::${room.type || 'unknown'}::${normalizedRotation}`;
    if (this._cache.has(cacheKey)) {
      return this._cloneResult(this._cache.get(cacheKey));
    }

    const manifestEntry = this._lookupManifestEntry(room, templateId);
    const baseTilemap = template?.tilemap ?? null;

    let resolution;
    if (manifestEntry) {
      resolution = this._resolveFromManifestEntry(
        manifestEntry,
        {
          room,
          template,
          templateId,
        },
        normalizedRotation,
        baseTilemap
      );
    }

    if (!resolution) {
      resolution = this._fallbackToRotation({
        room,
        template,
        templateId,
        requestedRotation: normalizedRotation,
        baseTilemap,
      });
    }

    this._cache.set(cacheKey, resolution);
    return this._cloneResult(resolution);
  }

  _resolveFromManifestEntry(entry, context, rotation, baseTilemap) {
    const rotationKey = String(rotation);
    const variant = entry.variants?.[rotationKey] ?? null;

    if (variant) {
      return this._buildVariantResult(entry, variant, {
        rotation,
        room: context.room,
        templateId: context.templateId,
        baseTilemap,
      });
    }

    const fallbackStrategy = entry.strategy || entry.fallbackStrategy || 'rotate';
    if (fallbackStrategy !== 'rotate') {
      return null;
    }

    return this._buildRotationResult(entry, {
      rotation,
      room: context.room,
      templateId: context.templateId,
      baseTilemap,
    });
  }

  _buildVariantResult(entry, variant, { rotation, room, templateId, baseTilemap }) {
    const appliedRotation = TileRotationMatrix.normalizeRotation(
      variant.rotation != null ? variant.rotation : 0
    );
    const tilemap = variant.tilemap ?? baseTilemap ?? null;

    const seams = this._resolveSeams({
      entry,
      variant,
      requestedRotation: rotation,
      appliedRotation,
      tilemap,
    });

    return {
      tilemap,
      rotation: appliedRotation,
      variantId: variant.variantId || variant.id || this._fallbackVariantId(templateId, rotation),
      metadata: this._composeMetadata({
        source: 'variant',
        entry,
        variant,
        room,
        requestedRotation: rotation,
        appliedRotation,
        templateId,
      }),
      seams,
      strategy: 'variant',
    };
  }

  _buildRotationResult(entry, { rotation, room, templateId, baseTilemap }) {
    const tilemap = baseTilemap ?? null;
    return {
      tilemap,
      rotation,
      variantId: null,
      metadata: this._composeMetadata({
        source: 'base-template',
        entry,
        variant: null,
        room,
        requestedRotation: rotation,
        appliedRotation: rotation,
        templateId,
      }),
      seams: this._resolveSeams({
        entry,
        variant: null,
        requestedRotation: rotation,
        appliedRotation: rotation,
        tilemap,
      }),
      strategy: 'rotate',
    };
  }

  _fallbackToRotation({ room, template, templateId, requestedRotation, baseTilemap }) {
    return {
      tilemap: baseTilemap,
      rotation: requestedRotation,
      variantId: null,
      metadata: {
        source: 'base-template',
        templateId: templateId ?? null,
        roomType: room?.type ?? null,
        requestedRotation,
        appliedRotation: requestedRotation,
        strategy: 'rotate',
      },
      seams: [],
      strategy: 'rotate',
    };
  }

  _composeMetadata({ source, entry, variant, room, requestedRotation, appliedRotation, templateId }) {
    const baseMetadata = {
      source,
      templateId: templateId ?? entry?.id ?? null,
      roomType: room?.type ?? null,
      requestedRotation,
      appliedRotation,
      strategy: source === 'variant' ? 'variant' : 'rotate',
    };

    const entryMetadata = this._clone(entry?.metadata);
    const variantMetadata = this._clone(variant?.metadata);
    return {
      ...entryMetadata,
      ...variantMetadata,
      ...baseMetadata,
    };
  }

  _resolveSeams({ entry, variant, requestedRotation, appliedRotation, tilemap }) {
    const rotationKey = String(requestedRotation);
    if (variant && Array.isArray(variant.seams)) {
      if (!variant.inheritBaseSeams) {
        return variant.seams.map((seam) => this._cloneSeam(seam));
      }
    }

    const seamSource =
      entry?.seams?.rotations?.[rotationKey] ??
      variant?.seams ??
      entry?.seams?.default ??
      entry?.seams?.base ??
      [];

    const seams = seamSource.map((seam) => this._cloneSeam(seam));
    const shouldRotate =
      tilemap &&
      requestedRotation !== 0 &&
      TileRotationMatrix.normalizeRotation(appliedRotation) ===
        TileRotationMatrix.normalizeRotation(requestedRotation);
    if (!shouldRotate) {
      return seams;
    }

    return seams.map((seam) => this._rotateSeam(seam, tilemap, requestedRotation));
  }

  _rotateSeam(seam, tilemap, rotation) {
    const coords = TileRotationMatrix.rotateTileCoords(
      seam.x ?? 0,
      seam.y ?? 0,
      tilemap?.width ?? 1,
      tilemap?.height ?? 1,
      rotation
    );
    return {
      ...seam,
      x: coords.x,
      y: coords.y,
      edge: rotateEdge(seam.edge, rotation),
      rotation: TileRotationMatrix.normalizeRotation((seam.rotation || 0) + rotation),
    };
  }

  _resolveTemplateId(context) {
    if (context.template?.id) {
      return context.template.id;
    }
    if (context.template?.templateId) {
      return context.template.templateId;
    }
    if (typeof context.template?.getId === 'function') {
      try {
        return context.template.getId();
      } catch (error) {
        // no-op
      }
    }
    if (context.room?.templateId) {
      return context.room.templateId;
    }
    return null;
  }

  _lookupManifestEntry(room, templateId) {
    const manifest = this.manifest || {};
    if (templateId && manifest.templates && manifest.templates[templateId]) {
      return manifest.templates[templateId];
    }
    if (room?.type && manifest.roomTypes && manifest.roomTypes[room.type]) {
      return manifest.roomTypes[room.type];
    }
    return null;
  }

  _fallbackVariantId(templateId, rotation) {
    const rotationKey = String(rotation);
    return templateId ? `${templateId}_${rotationKey}` : `variant_${rotationKey}`;
  }

  _clone(value) {
    if (!value || typeof value !== 'object') {
      return value ?? null;
    }
    if (Array.isArray(value)) {
      return value.map((entry) => this._clone(entry));
    }
    return { ...value };
  }

  _cloneSeam(seam) {
    if (!seam || typeof seam !== 'object') {
      return { x: 0, y: 0 };
    }
    return {
      ...seam,
      metadata: this._clone(seam.metadata),
    };
  }

  _cloneResult(result) {
    if (!result || typeof result !== 'object') {
      return result;
    }
    return {
      tilemap: result.tilemap ?? null,
      rotation: result.rotation,
      variantId: result.variantId ?? null,
      metadata: this._clone(result.metadata),
      seams: Array.isArray(result.seams) ? result.seams.map((seam) => this._cloneSeam(seam)) : [],
      strategy: result.strategy || 'rotate',
    };
  }
}

function rotateEdge(edge, rotation) {
  if (!edge) {
    return edge ?? null;
  }
  const order = ['north', 'east', 'south', 'west'];
  const index = order.indexOf(edge);
  if (index === -1) {
    return edge;
  }
  const steps = TileRotationMatrix.normalizeRotation(rotation) / 90;
  return order[(index + steps) % order.length];
}

export default TemplateVariantResolver;
