import variantManifest from '../../../assets/generated/images/ar-004/variant-manifest.json';

/**
 * @typedef {Object} NpcSpriteVariant
 * @property {string} id
 * @property {string} faction
 * @property {number} variant
 * @property {string} path
 * @property {number} width
 * @property {number} height
 */

const manifestEntries = Array.isArray(variantManifest?.generated)
  ? variantManifest.generated
  : [];

/** @type {Record<string, NpcSpriteVariant[]>} */
const variantsByFaction = manifestEntries.reduce((acc, entry) => {
  if (!entry?.faction) {
    return acc;
  }
  if (!Array.isArray(acc[entry.faction])) {
    acc[entry.faction] = [];
  }
  acc[entry.faction].push(entry);
  return acc;
}, {});

Object.values(variantsByFaction).forEach((variants) => {
  variants.sort((a, b) => a.variant - b.variant);
});

const factionAliases = {
  police: 'guard',
  security: 'guard',
  guards: 'guard',
};

function resolveFactionKey(factionId) {
  if (typeof factionId !== 'string' || factionId.length === 0) {
    return null;
  }
  const lower = factionId.toLowerCase();
  if (variantsByFaction[lower]) {
    return lower;
  }
  if (factionAliases[lower] && variantsByFaction[factionAliases[lower]]) {
    return factionAliases[lower];
  }
  return lower;
}

/**
 * Return the list of sprite variants configured for the requested faction.
 * Falls back to an empty array when no variants are defined.
 * @param {string} factionId
 * @returns {NpcSpriteVariant[]}
 */
export function getNpcSpriteVariants(factionId) {
  const key = resolveFactionKey(factionId);
  if (key && variantsByFaction[key]) {
    return variantsByFaction[key];
  }
  if (key !== 'civilian' && variantsByFaction.civilian) {
    return variantsByFaction.civilian;
  }
  return [];
}

/**
 * Select a sprite variant for the given faction.
 * Accepts either an explicit variant index (1-based) or a random seed source.
 *
 * @param {string} factionId
 * @param {object} [options]
 * @param {number} [options.variant] - 1-based variant index
 * @param {() => number} [options.randomFn] - RNG function for random selection
 * @returns {NpcSpriteVariant|null}
 */
export function pickNpcSpriteVariant(factionId, options = {}) {
  const { variant, randomFn = Math.random } = options;
  const variants = getNpcSpriteVariants(factionId);

  if (variants.length === 0) {
    return null;
  }

  if (typeof variant === 'number' && variant >= 1 && variant <= variants.length) {
    return variants[variant - 1];
  }

  const index = Math.floor(randomFn() * variants.length) % variants.length;
  return variants[index];
}
