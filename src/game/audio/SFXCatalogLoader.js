/**
 * SFXCatalogLoader
 *
 * Loads declarative SFX metadata and primes AudioManager buffers.
 */
export class SFXCatalogLoader {
  /**
   * @param {AudioManager|null} audioManager
   * @param {object} [options]
   * @param {string} [options.catalogUrl='/sfx/catalog.json']
   * @param {Function} [options.fetch]
   * @param {Console} [options.logger]
   */
  constructor(audioManager, options = {}) {
    this.audioManager = audioManager || null;
    this.catalogUrl = options.catalogUrl || '/sfx/catalog.json';
    this.fetchImpl =
      options.fetch ||
      (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (Object.prototype.hasOwnProperty.call(options, 'logger')) {
      this.logger = options.logger;
    } else {
      this.logger = console;
    }

    this._catalog = null;
    this._entriesById = new Map();
    this._loadPromise = null;
  }

  /**
   * Load catalog JSON and prime AudioManager with decoded buffers.
   * @returns {Promise<{loaded: number, failed: number, results: Array}>}
   */
  async load() {
    if (this._catalog) {
      return { loaded: this._entriesById.size, failed: 0, results: [] };
    }

    if (this._loadPromise) {
      return this._loadPromise;
    }

    this._loadPromise = this._loadInternal();
    const summary = await this._loadPromise;
    this._loadPromise = null;
    return summary;
  }

  async _loadInternal() {
    if (!this.fetchImpl) {
      this.logger?.warn?.('[SFXCatalogLoader] fetch unavailable; skipping catalog load');
      return { loaded: 0, failed: 0, results: [] };
    }

    let response;
    try {
      response = await this.fetchImpl(this.catalogUrl, { cache: 'no-cache' });
    } catch (error) {
      throw new Error(`[SFXCatalogLoader] Failed to fetch catalog: ${error.message}`);
    }

    if (!response || !response.ok) {
      throw new Error(`[SFXCatalogLoader] Catalog request failed: ${response?.status} ${response?.statusText}`);
    }

    let catalog;
    try {
      catalog = await response.json();
    } catch (error) {
      throw new Error(`[SFXCatalogLoader] Invalid catalog JSON: ${error.message}`);
    }

    if (!catalog || !Array.isArray(catalog.items)) {
      throw new Error('[SFXCatalogLoader] Catalog missing items array');
    }

    this._catalog = catalog;
    this._entriesById.clear();

    const results = [];
    let loaded = 0;
    let failed = 0;

    if (!this.audioManager || typeof this.audioManager.loadSound !== 'function') {
      this.logger?.warn?.('[SFXCatalogLoader] AudioManager unavailable; catalog entries registered without preloading');
      for (let i = 0; i < catalog.items.length; i++) {
        const entry = catalog.items[i];
        this._entriesById.set(entry.id, entry);
        results.push({ id: entry.id, status: 'skipped', reason: 'audio-manager-unavailable' });
      }
      return { loaded, failed, results };
    }

    await this.audioManager.init();

    for (let i = 0; i < catalog.items.length; i++) {
      const entry = catalog.items[i];
      if (!entry || !entry.id || !entry.file) {
        failed++;
        results.push({ id: entry?.id ?? `index-${i}`, status: 'failed', error: 'missing-id-or-file' });
        continue;
      }

      this._entriesById.set(entry.id, entry);

      const loadOptions = {
        volume: entry.baseVolume ?? entry.volume ?? 1,
      };

      if (entry.routing?.bus) {
        loadOptions.bus = entry.routing.bus;
      }
      if (entry.routing?.type) {
        loadOptions.type = entry.routing.type;
      }
      if (entry.loop === true || typeof entry.loopStart === 'number' || typeof entry.loopEnd === 'number') {
        loadOptions.loop = entry.loop !== false;
        if (typeof entry.loopStart === 'number') {
          loadOptions.loopStart = entry.loopStart;
        }
        if (typeof entry.loopEnd === 'number') {
          loadOptions.loopEnd = entry.loopEnd;
        }
      }
      if (entry.routing?.mixGroup) {
        loadOptions.mixGroup = entry.routing.mixGroup;
      }
      if (entry.routing?.stateGains) {
        loadOptions.stateGains = entry.routing.stateGains;
      }
      if (Array.isArray(entry.tags) && entry.tags.length > 0) {
        loadOptions.tags = entry.tags;
      }
      if (Array.isArray(entry.routing?.recommendedScenes)) {
        loadOptions.recommendedScenes = entry.routing.recommendedScenes;
      }

      try {
        await this.audioManager.loadSound(entry.id, entry.file, loadOptions);
        loaded++;
        results.push({ id: entry.id, status: 'loaded' });
      } catch (error) {
        failed++;
        results.push({ id: entry.id, status: 'failed', error: error.message });
        this.logger?.warn?.(
          '[SFXCatalogLoader] Failed to load sound',
          entry.id,
          error
        );
      }
    }

    return { loaded, failed, results };
  }

  /**
   * Retrieve catalog metadata.
   * @returns {object|null}
   */
  getCatalog() {
    return this._catalog;
  }

  /**
   * Lookup a single entry by id.
   * @param {string} soundId
   * @returns {object|null}
   */
  getEntry(soundId) {
    return this._entriesById.get(soundId) || null;
  }
}
