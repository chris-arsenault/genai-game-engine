/**
 * Shared overlay theme and palette values used across canvas HUD elements.
 * Centralizing the styling ensures overlays follow the same palette that QA
 * validated during CORE-302 (midnight neon noir motif).
 */
export const overlayTheme = {
  palette: {
    backgroundPrimary: 'rgba(14, 20, 36, 0.92)',
    backgroundSurface: 'rgba(20, 28, 44, 0.94)',
    outlineStrong: 'rgba(94, 205, 255, 0.85)',
    outlineSoft: 'rgba(94, 205, 255, 0.55)',
    accent: '#5bc9ff',
    accentMuted: '#2d8ad8',
    textPrimary: '#f0f6ff',
    textSecondary: '#9fb8d8',
    textMuted: 'rgba(208, 224, 247, 0.72)',
    warning: '#ffa86c',
    highlight: 'rgba(94, 205, 255, 0.3)'
  },
  typography: {
    title: '600 18px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    body: '400 14px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    small: '500 12px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    hud: '500 16px "Segoe UI", "Helvetica Neue", Arial, sans-serif'
  },
  metrics: {
    promptPadding: 24,
    promptMaxWidth: 540,
    overlayCornerRadius: 10,
    hudPaddingX: 18,
    hudPaddingY: 12,
    hudMaxWidth: 360,
    progressHeight: 10,
    progressWidth: 360,
    overlayMargin: 20
  }
};

/**
 * Apply theme defaults to a style object without mutating the source theme.
 * @template T
 * @param {T} defaults
 * @param {Partial<T>} overrides
 * @returns {T}
 */
export function withOverlayTheme(defaults, overrides = {}) {
  return Object.assign({}, defaults, overrides);
}

