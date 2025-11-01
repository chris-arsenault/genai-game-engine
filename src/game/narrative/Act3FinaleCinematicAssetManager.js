import {
  getAct3FinaleBeatAsset,
  getAct3FinaleHeroAsset,
} from '../data/narrative/Act3FinaleCinematicAssets.js';

const STATUS_PENDING = 'pending';
const STATUS_LOADING = 'loading';
const STATUS_READY = 'ready';
const STATUS_ERROR = 'error';
const STATUS_UNSUPPORTED = 'unsupported';

function sanitiseMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  return {
    assetId: typeof meta.assetId === 'string' ? meta.assetId : null,
    src: typeof meta.file === 'string' ? meta.file : null,
    alt: typeof meta.alt === 'string' ? meta.alt : '',
    tags: Array.isArray(meta.tags) ? [...meta.tags] : [],
    metadata: meta.metadata && typeof meta.metadata === 'object' ? { ...meta.metadata } : {},
    palette: Array.isArray(meta.palette) ? [...meta.palette] : [],
    stanceId: typeof meta.stanceId === 'string' ? meta.stanceId : null,
    beatId: typeof meta.beatId === 'string' ? meta.beatId : null,
  };
}

/**
 * Lightweight manager that resolves and preloads Act 3 finale cinematic artwork.
 * Falls back gracefully when the runtime cannot load images (e.g. headless tests).
 */
export class Act3FinaleCinematicAssetManager {
  /**
   * @param {object} options
   * @param {{loadImage: Function}|null} [options.loader]
   */
  constructor({ loader } = {}) {
    this.loader = loader ?? null;
    this.cache = new Map();
  }

  /**
   * Resolve hero and beat imagery for the provided cinematic payload.
   * @param {object} payload
   * @returns {{hero: object|null, beats: Record<string, object>}}
   */
  prepareAssets(payload = {}) {
    const stanceId =
      typeof payload?.stanceId === 'string' && payload.stanceId.trim().length > 0
        ? payload.stanceId.trim()
        : null;
    const cinematicId =
      typeof payload?.cinematicId === 'string' && payload.cinematicId.trim().length > 0
        ? payload.cinematicId.trim()
        : null;
    const beatIds = Array.isArray(payload?.epilogueBeats)
      ? payload.epilogueBeats
          .map((beat) =>
            typeof beat?.id === 'string' && beat.id.trim().length > 0 ? beat.id.trim() : null
          )
          .filter(Boolean)
      : [];

    const heroMeta = stanceId ? getAct3FinaleHeroAsset(stanceId) : null;
    const heroDescriptor = heroMeta
      ? this._ensureDescriptor(heroMeta, { type: 'hero', stanceId, cinematicId })
      : null;

    const beatDescriptors = {};
    for (const beatId of beatIds) {
      const meta = getAct3FinaleBeatAsset(beatId);
      if (!meta) {
        continue;
      }
      beatDescriptors[beatId] = this._ensureDescriptor(meta, {
        type: 'beat',
        stanceId,
        cinematicId,
        beatId,
      });
    }

    return {
      hero: heroDescriptor,
      beats: beatDescriptors,
    };
  }

  /**
   * Clear any cached descriptors (used for teardown between sessions).
   */
  dispose() {
    this.cache.clear();
  }

  _ensureDescriptor(meta, context = {}) {
    const sanitised = sanitiseMeta(meta);
    if (!sanitised || !sanitised.src) {
      return null;
    }

    const cacheKey = sanitised.assetId || sanitised.src;
    let descriptor = this.cache.get(cacheKey);

    if (!descriptor) {
      descriptor = {
        assetId: sanitised.assetId,
        src: sanitised.src,
        alt: sanitised.alt,
        tags: sanitised.tags,
        metadata: sanitised.metadata,
        palette: sanitised.palette,
        stanceId: sanitised.stanceId ?? context.stanceId ?? null,
        beatId: sanitised.beatId ?? context.beatId ?? null,
        cinematicId: context.cinematicId ?? null,
        status: STATUS_PENDING,
        image: null,
        error: null,
        promise: null,
      };
      this.cache.set(cacheKey, descriptor);
    } else {
      descriptor.stanceId = descriptor.stanceId || context.stanceId || sanitised.stanceId || null;
      descriptor.beatId = descriptor.beatId || context.beatId || sanitised.beatId || null;
      descriptor.cinematicId = descriptor.cinematicId || context.cinematicId || null;
    }

    this._kickoffLoad(descriptor);
    return descriptor;
  }

  _kickoffLoad(descriptor) {
    if (!descriptor) {
      return;
    }
    if (descriptor.status === STATUS_READY || descriptor.status === STATUS_LOADING) {
      return;
    }

    if (!this._supportsImageLoading()) {
      descriptor.status = STATUS_UNSUPPORTED;
      descriptor.image = null;
      descriptor.promise = null;
      return;
    }

    descriptor.status = STATUS_LOADING;
    descriptor.error = null;
    descriptor.promise = this._loadImage(descriptor.src)
      .then((image) => {
        descriptor.image = image;
        descriptor.status = STATUS_READY;
        return image;
      })
      .catch((error) => {
        descriptor.error = error;
        descriptor.status = STATUS_ERROR;
        return null;
      });
  }

  _supportsImageLoading() {
    if (this.loader && typeof this.loader.loadImage === 'function') {
      return true;
    }
    return typeof Image === 'function';
  }

  async _loadImage(src) {
    if (this.loader && typeof this.loader.loadImage === 'function') {
      return this.loader.loadImage(src);
    }

    if (typeof Image === 'function') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (error) => reject(error);
        img.src = src;
      });
    }

    throw new Error('[Act3FinaleCinematicAssetManager] No image loader available');
  }
}

export const Act3FinaleCinematicAssetStatus = Object.freeze({
  PENDING: STATUS_PENDING,
  LOADING: STATUS_LOADING,
  READY: STATUS_READY,
  ERROR: STATUS_ERROR,
  UNSUPPORTED: STATUS_UNSUPPORTED,
});
