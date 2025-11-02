import { AssetLoadError } from '../../engine/assets/AssetLoader.js';

/**
 * Global AssetManager registry and sprite asset hydration helpers.
 *
 * Provides lightweight caching for direct image loads when assets are not
 * declared in the manifest while still preferring AssetManager APIs whenever
 * available.
 */

let globalAssetManager = null;
const imageCache = new Map();
const pendingLoads = new Map();

/**
 * Register the AssetManager instance to be used by sprite/component factories.
 * @param {import('../../engine/assets/AssetManager.js').AssetManager|null} manager
 */
export function registerGlobalAssetManager(manager) {
  globalAssetManager = manager ?? null;
}

/**
 * Retrieve the globally registered AssetManager.
 * @returns {import('../../engine/assets/AssetManager.js').AssetManager|null}
 */
export function getGlobalAssetManager() {
  return globalAssetManager;
}

/**
 * Clear the global AssetManager reference and any cached assets.
 * Primarily useful for test isolation.
 */
export function resetGlobalAssetManager() {
  globalAssetManager = null;
  clearSpriteAssetCache();
}

/**
 * Reset the sprite asset cache (cached images and pending promises).
 */
export function clearSpriteAssetCache() {
  imageCache.clear();
  pendingLoads.clear();
}

/**
 * Request an image asset by ID or URL. Attempts to use the AssetManager if
 * present, falling back to direct loader access before resorting to manual
 * Image loading.
 *
 * @param {string} assetRef - Asset identifier or URL.
 * @returns {Promise<HTMLImageElement|any>} Resolved image asset.
 */
export function requestImageAsset(assetRef) {
  if (typeof assetRef !== 'string' || assetRef.length === 0) {
    return Promise.resolve(null);
  }

  if (imageCache.has(assetRef)) {
    return Promise.resolve(imageCache.get(assetRef));
  }

  if (pendingLoads.has(assetRef)) {
    return pendingLoads.get(assetRef);
  }

  const loadPromise = (async () => {
    const manager = globalAssetManager;

    if (manager && typeof manager.loadAsset === 'function') {
      try {
        const asset = await manager.loadAsset(assetRef);
        imageCache.set(assetRef, asset);
        return asset;
      } catch (error) {
        const message = typeof error?.message === 'string' ? error.message : '';
        const missingFromManifest = message.includes('Asset not found in manifest');
        if (!missingFromManifest) {
          const telemetry = AssetLoadError.buildTelemetryContext(error, {
            consumer: 'SpriteAssetResolver.requestImageAsset.manifest',
            assetRef
          });
          console.warn(`[SpriteAssetResolver] Failed to load asset "${assetRef}" via manifest`, error, telemetry);
        }
        // Fall through to loader fallback when manifest entry is missing.
      }

      if (manager.loader && typeof manager.loader.loadImage === 'function') {
        try {
          const asset = await manager.loader.loadImage(assetRef);
          imageCache.set(assetRef, asset);
          return asset;
        } catch (error) {
          const telemetry = AssetLoadError.buildTelemetryContext(error, {
            consumer: 'SpriteAssetResolver.requestImageAsset.loader',
            assetRef
          });
          console.warn(`[SpriteAssetResolver] Loader failed for "${assetRef}"`, error, telemetry);
          throw error;
        }
      }
    }

    // Final fallback: direct Image loading.
    const asset = await loadImageDirect(assetRef);
    imageCache.set(assetRef, asset);
    return asset;
  })()
    .finally(() => {
      pendingLoads.delete(assetRef);
    });

  pendingLoads.set(assetRef, loadPromise);
  return loadPromise;
}

/**
 * Directly load an image using the browser Image API.
 * @private
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageDirect(url) {
  return new Promise((resolve, reject) => {
    if (typeof Image !== 'function') {
      reject(new Error('Global Image constructor is not available.'));
      return;
    }

    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${url} (${error?.message ?? 'unknown error'})`));

    img.src = url;
  });
}
