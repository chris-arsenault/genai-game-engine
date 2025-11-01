import { ACT3_FINALE_CINEMATIC_MANIFEST as manifest } from './act3FinaleCinematicManifestData.js';

const heroByStance = new Map();
const beatById = new Map();
const sharedById = new Map();
let defaultSharedPanelId = null;

if (Array.isArray(manifest?.heroPanels)) {
  for (const entry of manifest.heroPanels) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const stanceId =
      typeof entry.stanceId === 'string' && entry.stanceId.trim().length > 0
        ? entry.stanceId.trim()
        : null;
    if (!stanceId) {
      continue;
    }
    heroByStance.set(stanceId, Object.freeze({ ...entry }));
  }
}

if (Array.isArray(manifest?.beatPanels)) {
  for (const entry of manifest.beatPanels) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const beatId =
      typeof entry.beatId === 'string' && entry.beatId.trim().length > 0
        ? entry.beatId.trim()
        : null;
    if (!beatId) {
      continue;
    }
    beatById.set(beatId, Object.freeze({ ...entry }));
  }
}

if (Array.isArray(manifest?.sharedPanels)) {
  for (const entry of manifest.sharedPanels) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const assetId =
      typeof entry.assetId === 'string' && entry.assetId.trim().length > 0
        ? entry.assetId.trim()
        : null;
    if (!assetId) {
      continue;
    }
    if (!defaultSharedPanelId) {
      defaultSharedPanelId = assetId;
    }
    sharedById.set(assetId, Object.freeze({ ...entry }));
  }
}

/**
 * Frozen view of the raw manifest for documentation/debugging.
 */
export const ACT3_FINALE_CINEMATIC_ASSET_MANIFEST = Object.freeze({
  bundleId: manifest?.bundleId ?? null,
  updatedAt: manifest?.updatedAt ?? null,
  notes: Array.isArray(manifest?.notes) ? [...manifest.notes] : [],
  licensing: manifest?.licensing ? { ...manifest.licensing } : null,
  heroPanels: Array.isArray(manifest?.heroPanels) ? [...manifest.heroPanels] : [],
  beatPanels: Array.isArray(manifest?.beatPanels) ? [...manifest.beatPanels] : [],
  sharedPanels: Array.isArray(manifest?.sharedPanels) ? [...manifest.sharedPanels] : [],
});

/**
 * Resolve the hero panel metadata for a given stance.
 * @param {string} stanceId
 * @returns {object|null}
 */
export function getAct3FinaleHeroAsset(stanceId) {
  if (typeof stanceId !== 'string' || stanceId.trim().length === 0) {
    return null;
  }
  return heroByStance.get(stanceId.trim()) ?? null;
}

/**
 * Resolve the beat panel metadata for a given epilogue beat ID.
 * @param {string} beatId
 * @returns {object|null}
 */
export function getAct3FinaleBeatAsset(beatId) {
  if (typeof beatId !== 'string' || beatId.trim().length === 0) {
    return null;
  }
  return beatById.get(beatId.trim()) ?? null;
}

/**
 * Resolve the shared finale overlay panel. Defaults to the first manifest entry
 * when an explicit assetId is not provided.
 * @param {string|null} [assetId]
 * @returns {object|null}
 */
export function getAct3FinaleSharedPanel(assetId = null) {
  if (typeof assetId === 'string' && assetId.trim().length > 0) {
    const entry = sharedById.get(assetId.trim());
    if (entry) {
      return entry;
    }
  }
  if (defaultSharedPanelId) {
    return sharedById.get(defaultSharedPanelId) ?? null;
  }
  return null;
}

/**
 * Resolve beat panel metadata for a list of epilogue beat IDs.
 * @param {string[]} beatIds
 * @returns {Record<string, object>}
 */
export function getAct3FinaleBeatAssets(beatIds = []) {
  const result = {};
  if (!Array.isArray(beatIds)) {
    return result;
  }
  for (const beatId of beatIds) {
    const entry = getAct3FinaleBeatAsset(beatId);
    if (entry) {
      result[beatId] = entry;
    }
  }
  return result;
}

/**
 * Provide the stance IDs that have hero panels available.
 * @returns {string[]}
 */
export function listAct3FinaleHeroStances() {
  return Array.from(heroByStance.keys());
}

/**
 * Provide the beat IDs present in the manifest.
 * @returns {string[]}
 */
export function listAct3FinaleBeatIds() {
  return Array.from(beatById.keys());
}

/**
 * Provide the asset IDs present in the shared panel manifest.
 * @returns {string[]}
 */
export function listAct3FinaleSharedPanelIds() {
  return Array.from(sharedById.keys());
}
