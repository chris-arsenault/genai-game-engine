/**
 * Canonical lighting preset catalog for Crossroads scene assets.
 * Presets expose luminance targets so RenderOps can detect hotspot risks
 * without needing the full in-engine lighting preview.
 */
export const LightingPresetCatalog = Object.freeze({
  safehouse_idle: Object.freeze({
    id: 'safehouse_idle',
    description:
      'Ambient fill for the safehouse staging bay; should stay dim so holographic overlays and story props remain legible.',
    targetLuminance: 0.1,
    maxDeviation: 0.12,
    maxLuminance: 0.28,
    colorTemperature: 4300,
  }),
  branch_idle: Object.freeze({
    id: 'branch_idle',
    description:
      'Cool walkway wash leading toward branch selection doors. Low glow keeps attention on branch callouts.',
    targetLuminance: 0.02,
    maxDeviation: 0.05,
    maxLuminance: 0.08,
    colorTemperature: 4800,
  }),
  selection_ready: Object.freeze({
    id: 'selection_ready',
    description:
      'Reactive selection pad highlight when threads are ready. Moderate luminance keeps UI readable while signalling urgency.',
    targetLuminance: 0.05,
    maxDeviation: 0.07,
    maxLuminance: 0.12,
    colorTemperature: 5200,
  }),
  checkpoint_idle: Object.freeze({
    id: 'checkpoint_idle',
    description:
      'Idle plaza tone for checkpoint queue. Stays dark so guard columns and guiding lasers pop when active.',
    targetLuminance: 0.015,
    maxDeviation: 0.05,
    maxLuminance: 0.08,
    colorTemperature: 4100,
  }),
  thread_ready: Object.freeze({
    id: 'thread_ready',
    description:
      'Selection conduit flare when a mission thread activates. Peak luminance is intentionally higher but capped to avoid bloom.',
    targetLuminance: 0.46,
    maxDeviation: 0.08,
    maxLuminance: 0.55,
    colorTemperature: 6000,
  }),
  checkpoint_active: Object.freeze({
    id: 'checkpoint_active',
    description:
      'Checkpoint glow when security scanners route a player forward. Balanced to avoid washing nearby signage.',
    targetLuminance: 0.33,
    maxDeviation: 0.07,
    maxLuminance: 0.45,
    colorTemperature: 5600,
  }),
  checkpoint_column_guard: Object.freeze({
    id: 'checkpoint_column_guard',
    description:
      'Guard column spotlight for checkpoint sentry drones. High-intensity but must stay below bloom threshold.',
    targetLuminance: 0.45,
    maxDeviation: 0.08,
    maxLuminance: 0.6,
    colorTemperature: 6200,
  }),
  safehouse_column_soft: Object.freeze({
    id: 'safehouse_column_soft',
    description:
      'Soft volumetric column that frames the safehouse entrance. Warmer column diffused to avoid washing the briefing couch.',
    targetLuminance: 0.1,
    maxDeviation: 0.06,
    maxLuminance: 0.2,
    colorTemperature: 5000,
  }),
  briefing_focus: Object.freeze({
    id: 'briefing_focus',
    description:
      'Tight briefing pad spot used when Zara briefs the crew. Slightly brighter than ambient but still below glare levels.',
    targetLuminance: 0.03,
    maxDeviation: 0.05,
    maxLuminance: 0.12,
    colorTemperature: 5400,
  }),
});

/**
 * Resolve a lighting preset definition by identifier.
 * @param {string} presetId
 * @returns {object|null}
 */
export function getLightingPreset(presetId) {
  if (typeof presetId !== 'string' || presetId.length === 0) {
    return null;
  }
  return LightingPresetCatalog[presetId] ?? null;
}

/**
 * List all known lighting preset identifiers.
 * @returns {string[]}
 */
export function listLightingPresetIds() {
  return Object.keys(LightingPresetCatalog);
}
