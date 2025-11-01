import { Act2CrossroadsArtConfig } from '../data/sceneArt/Act2CrossroadsArtConfig.js';
import { getLightingPreset } from '../data/sceneArt/LightingPresetCatalog.js';
import {
  computeRelativeLuminance,
  normalizeHexColour,
  formatDecimal,
} from './Act2CrossroadsArtValidator.js';

const DEFAULT_OVERLAY_ALPHA_TOLERANCE = 0.02;
const LIGHTING_CATEGORIES = ['floors', 'accents', 'lightColumns', 'questHighlights'];

/**
 * Generate a lighting preview report for Act 2 Crossroads overlays.
 * @param {{
 *   config?: object,
 *   overlayStats?: Map<string, object>|Record<string, object>,
 *   overlayAlphaTolerance?: number,
 *   categories?: string[]
 * }} [options]
 * @returns {{ entries: Array<object>, summary: object }}
 */
export function generateCrossroadsLightingReport(options = {}) {
  const {
    config = Act2CrossroadsArtConfig,
    overlayStats = new Map(),
    overlayAlphaTolerance = DEFAULT_OVERLAY_ALPHA_TOLERANCE,
    categories = LIGHTING_CATEGORIES,
  } = options;

  const statsResolver = buildOverlayStatsResolver(overlayStats);

  const entries = [];
  for (const category of categories) {
    const segments = Array.isArray(config?.[category]) ? config[category] : [];
    for (const segment of segments) {
      entries.push(
        evaluateSegmentLighting({
          segment,
          category,
          resolveOverlayStats: statsResolver,
          overlayAlphaTolerance,
        })
      );
    }
  }

  return {
    entries,
    summary: summarizeLightingEntries(entries),
  };
}

function buildOverlayStatsResolver(overlayStats) {
  if (overlayStats instanceof Map) {
    return (assetId) => {
      const key = toOverlayKey(assetId);
      if (!key) {
        return null;
      }
      return overlayStats.get(key) ?? null;
    };
  }
  if (overlayStats && typeof overlayStats === 'object') {
    return (assetId) => {
      const key = toOverlayKey(assetId);
      if (!key) {
        return null;
      }
      return overlayStats[key] ?? null;
    };
  }
  return () => null;
}

function evaluateSegmentLighting({
  segment,
  category,
  resolveOverlayStats,
  overlayAlphaTolerance,
}) {
  const issues = [];
  const assetId =
    typeof segment?.assetId === 'string' && segment.assetId.length > 0
      ? segment.assetId
      : null;
  const presetId =
    typeof segment?.metadata?.lightingPreset === 'string' &&
    segment.metadata.lightingPreset.length > 0
      ? segment.metadata.lightingPreset
      : null;
  const configAlpha =
    typeof segment?.alpha === 'number' && Number.isFinite(segment.alpha)
      ? clamp(segment.alpha, 0, 1)
      : 1;

  const overlayStats = assetId ? resolveOverlayStats(assetId) : null;
  const metadataAverageAlpha =
    typeof segment?.metadata?.overlayAverageAlpha === 'number'
      ? segment.metadata.overlayAverageAlpha
      : null;
  const expectsOverlay =
    metadataAverageAlpha !== null ||
    category === 'accents' ||
    category === 'lightColumns' ||
    category === 'questHighlights';

  const entry = {
    segmentId: segment?.id ?? null,
    category,
    assetId,
    presetId,
    configAlpha,
    colour: segment?.color ?? null,
    overlay: {
      averageAlpha:
        typeof overlayStats?.averageAlphaNormalized === 'number'
          ? overlayStats.averageAlphaNormalized
          : null,
      metadataAverageAlpha,
      delta:
        metadataAverageAlpha !== null &&
        typeof overlayStats?.averageAlphaNormalized === 'number'
          ? metadataAverageAlpha - overlayStats.averageAlphaNormalized
          : null,
    },
    projected: {
      alpha: null,
      luminance: null,
      trend: null,
      deviation: null,
      allowedDeviation: null,
      maxLuminance: null,
      targetLuminance: null,
    },
    issues,
    status: 'ok',
  };

  if (!assetId) {
    issues.push({
      severity: 'warning',
      code: 'missing-asset-id',
      message:
        'Segment is missing an assetId; unable to resolve overlay statistics',
    });
    entry.status = 'missing-asset-id';
    return entry;
  }

  if (!overlayStats) {
    if (!expectsOverlay) {
      entry.status = 'skipped';
      return entry;
    }
    issues.push({
      severity: 'error',
      code: 'missing-overlay',
      message: `Overlay PNG "${assetId}" was not found in the provided stats map`,
    });
    entry.status = 'missing-overlay';
    return entry;
  }

  if (!presetId) {
    issues.push({
      severity: 'warning',
      code: 'missing-preset',
      message: 'Segment metadata is missing lightingPreset; cannot compare targets',
    });
    entry.status = 'missing-preset';
    return entry;
  }

  const preset = getLightingPreset(presetId);
  if (!preset) {
    issues.push({
      severity: 'error',
      code: 'unknown-preset',
      message: `Lighting preset "${presetId}" is not defined in the catalog`,
    });
    entry.status = 'unknown-preset';
    return entry;
  }

  const normColour = normalizeHexColour(segment?.color ?? null);
  if (!normColour) {
    issues.push({
      severity: 'error',
      code: 'invalid-colour',
      message: `Colour "${segment?.color}" is not a valid #RRGGBB hex value`,
    });
    entry.status = 'invalid-colour';
    return entry;
  }

  if (
    metadataAverageAlpha !== null &&
    Number.isFinite(metadataAverageAlpha) &&
    metadataAverageAlpha >= 0 &&
    metadataAverageAlpha <= 1 &&
    typeof overlayStats.averageAlphaNormalized === 'number'
  ) {
    const alphaDelta = Math.abs(
      metadataAverageAlpha - overlayStats.averageAlphaNormalized
    );
    if (alphaDelta > overlayAlphaTolerance) {
      issues.push({
        severity: 'warning',
        code: 'metadata-drift',
        message: `overlayAverageAlpha metadata deviates by ${formatDecimal(
          alphaDelta
        )} (tolerance ${formatDecimal(overlayAlphaTolerance)})`,
      });
    }
  }

  const overlayAlpha =
    typeof overlayStats.averageAlphaNormalized === 'number'
      ? overlayStats.averageAlphaNormalized
      : 0;
  const projectedAlpha = clamp(configAlpha * overlayAlpha, 0, 1);
  const colourLuminance = computeRelativeLuminance(normColour);
  const projectedLuminance = colourLuminance * projectedAlpha;
  const targetLuminance =
    typeof preset.targetLuminance === 'number' ? preset.targetLuminance : null;
  const maxDeviation =
    typeof preset.maxDeviation === 'number' ? preset.maxDeviation : null;
  const maxLuminance =
    typeof preset.maxLuminance === 'number' ? preset.maxLuminance : null;
  const deviation =
    targetLuminance !== null ? projectedLuminance - targetLuminance : null;
  const absoluteDeviation =
    deviation !== null ? Math.abs(deviation) : Number.NaN;
  const trend =
    deviation === null ? 'unknown' : deviation >= 0 ? 'over' : 'under';

  entry.projected.alpha = projectedAlpha;
  entry.projected.luminance = projectedLuminance;
  entry.projected.deviation = deviation;
  entry.projected.allowedDeviation = maxDeviation;
  entry.projected.maxLuminance = maxLuminance;
  entry.projected.targetLuminance = targetLuminance;
  entry.projected.trend = trend;

  let status = 'ok';

  if (maxLuminance !== null && projectedLuminance > maxLuminance) {
    issues.push({
      severity: 'warning',
      code: 'hotspot',
      message: `Projected luminance ${formatDecimal(
        projectedLuminance
      )} exceeds hotspot threshold ${formatDecimal(maxLuminance)}`,
    });
    status = 'hotspot';
  } else if (
    maxDeviation !== null &&
    Number.isFinite(absoluteDeviation) &&
    absoluteDeviation > maxDeviation
  ) {
    issues.push({
      severity: 'warning',
      code: trend === 'over' ? 'deviation-over' : 'deviation-under',
      message: `Projected luminance deviates from target by ${formatDecimal(
        absoluteDeviation
      )} (allowed ${formatDecimal(maxDeviation)})`,
    });
    status = trend === 'over' ? 'deviation-over' : 'deviation-under';
  }

  const hasMetadataDrift = issues.some(
    (issue) => issue.code === 'metadata-drift'
  );
  if (status === 'ok' && hasMetadataDrift) {
    status = 'metadata-drift';
  }

  entry.status = status;
  return entry;
}

function summarizeLightingEntries(entries) {
  const summary = {
    total: entries.length,
    statusCounts: {},
    hotspots: [],
    deviations: [],
    metadataDrift: [],
    missingOverlays: [],
    missingPresets: [],
    unknownPresets: [],
    invalidColours: [],
  };

  for (const entry of entries) {
    summary.statusCounts[entry.status] =
      (summary.statusCounts[entry.status] ?? 0) + 1;

    switch (entry.status) {
      case 'hotspot':
        summary.hotspots.push(entry);
        break;
      case 'deviation-over':
      case 'deviation-under':
        summary.deviations.push(entry);
        break;
      case 'metadata-drift':
        summary.metadataDrift.push(entry);
        break;
      case 'missing-overlay':
        summary.missingOverlays.push(entry);
        break;
      case 'missing-preset':
        summary.missingPresets.push(entry);
        break;
      case 'unknown-preset':
        summary.unknownPresets.push(entry);
        break;
      case 'invalid-colour':
        summary.invalidColours.push(entry);
        break;
      case 'skipped':
        break;
      default:
        break;
    }
  }

  return summary;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function toOverlayKey(assetId) {
  if (typeof assetId !== 'string' || assetId.length === 0) {
    return null;
  }
  return assetId.replace(/_v[0-9]+$/i, '');
}
