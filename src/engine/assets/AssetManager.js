/**
 * AssetManager - lazy loading with reference counting.
 * Performance: <3s initial load, <1s per level.
 */
export class AssetManager {
  constructor() {
    this.assets = new Map();
    this.loading = new Map();
    this.manifest = null;
  }

  async loadManifest(url) {
    const response = await fetch(url);
    this.manifest = await response.json();
  }

  async loadAsset(assetId) {
    if (this.assets.has(assetId)) {
      const asset = this.assets.get(assetId);
      asset.refCount++;
      return asset.data;
    }

    if (this.loading.has(assetId)) {
      return this.loading.get(assetId);
    }

    const promise = this._loadAssetData(assetId);
    this.loading.set(assetId, promise);

    const data = await promise;
    this.loading.delete(assetId);

    this.assets.set(assetId, { data, refCount: 1 });
    return data;
  }

  async _loadAssetData(assetId) {
    // TODO: Implement actual asset loading based on type
    return null;
  }

  unloadAsset(assetId) {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.refCount--;
      if (asset.refCount <= 0) {
        this.assets.delete(assetId);
      }
    }
  }

  getAsset(assetId) {
    const asset = this.assets.get(assetId);
    return asset ? asset.data : null;
  }
}
