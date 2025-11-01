/**
 * finaleAdaptiveMix.js
 *
 * Defines bespoke adaptive music mixes for the Act 3 finale cinematic stances.
 * Each definition maps to the shared adaptive layer identifiers used by
 * AmbientSceneAudioController (ambient_base, tension_layer, combat_layer).
 *
 * Values represent relative weights (0-1) applied to each layer's base volume.
 */
const DEFAULT_FADE_SECONDS = 4;
const DEFAULT_REVERT_FADE_SECONDS = 3.5;

export const FINALE_ADAPTIVE_MOODS = Object.freeze({
  'track-ending-opposition': Object.freeze({
    weights: Object.freeze({
      ambient_base: 0.3,
      tension_layer: 0.92,
      combat_layer: 0.98,
    }),
    fadeSeconds: 4.5,
    revertTo: 'ambient',
    revertFadeSeconds: 5,
    durationSeconds: 75,
  }),
  'track-ending-support': Object.freeze({
    weights: Object.freeze({
      ambient_base: 0.72,
      tension_layer: 0.66,
      combat_layer: 0.35,
    }),
    fadeSeconds: 3.5,
    revertTo: 'ambient',
    revertFadeSeconds: 4.5,
    durationSeconds: 90,
  }),
  'track-ending-alternative': Object.freeze({
    weights: Object.freeze({
      ambient_base: 0.68,
      tension_layer: 0.58,
      combat_layer: 0.28,
    }),
    fadeSeconds: 3.8,
    revertTo: 'ambient',
    revertFadeSeconds: 4.2,
    durationSeconds: 90,
  }),
});

/**
 * Retrieve finale adaptive mix definition by mood id.
 * @param {string} moodId
 * @returns {{weights: Record<string, number>, fadeSeconds?: number, revertTo?: string, revertFadeSeconds?: number, durationSeconds?: number}|null}
 */
export function getFinaleAdaptiveDefinition(moodId) {
  if (!moodId || typeof moodId !== 'string') {
    return null;
  }
  const definition = FINALE_ADAPTIVE_MOODS[moodId];
  return definition || null;
}

export function getFinaleDefaultFadeSeconds() {
  return DEFAULT_FADE_SECONDS;
}

export function getFinaleDefaultRevertFadeSeconds() {
  return DEFAULT_REVERT_FADE_SECONDS;
}
