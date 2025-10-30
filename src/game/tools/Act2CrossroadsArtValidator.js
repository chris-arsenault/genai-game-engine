import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { Act2CrossroadsArtConfig } from '../data/sceneArt/Act2CrossroadsArtConfig.js';

const REQUIRED_SEGMENT_IDS = Object.freeze({
  floors: Object.freeze([
    'crossroads_floor_safehouse',
    'crossroads_briefing_pad',
    'crossroads_branch_walkway',
    'crossroads_selection_pad',
    'crossroads_checkpoint_plaza',
  ]),
  accents: Object.freeze([
    'crossroads_safehouse_light_arc',
    'crossroads_selection_conduit',
    'crossroads_checkpoint_glow',
  ]),
  lightColumns: Object.freeze([
    'crossroads_column_safehouse_left',
    'crossroads_column_safehouse_right',
    'crossroads_column_checkpoint_north',
    'crossroads_column_checkpoint_south',
  ]),
  boundaries: Object.freeze([
    'crossroads_boundary_west',
    'crossroads_boundary_east',
    'crossroads_boundary_north',
    'crossroads_boundary_south',
  ]),
});

const LIGHTING_CATEGORIES = Object.freeze(new Set(['floors', 'accents', 'lightColumns']));
const COLLISION_CATEGORIES = Object.freeze(new Set(['boundaries']));

/**
 * Load a Crossroads art manifest from disk.
 * @param {string} manifestPath
 * @returns {Promise<object>}
 */
export async function loadAct2CrossroadsArtManifest(manifestPath) {
  if (typeof manifestPath !== 'string' || manifestPath.length === 0) {
    throw new Error('[loadAct2CrossroadsArtManifest] manifestPath is required');
  }
  const resolved = path.resolve(manifestPath);
  const raw = await readFile(resolved, 'utf8');
  return JSON.parse(raw);
}

/**
 * Validate Art2 Crossroads art data (config + manifest) to catch broken bundles before runtime.
 * @param {{ config?: object, manifest?: object }} [options]
 * @returns {{ ok: boolean, issues: Array<object>, coverage: Record<string, object>, stats: object, readiness: object }}
 */
export function validateAct2CrossroadsArtBundle(options = {}) {
  const config = options.config && typeof options.config === 'object' ? options.config : Act2CrossroadsArtConfig;
  const manifest = options.manifest && typeof options.manifest === 'object' ? options.manifest : null;

  const configMaps = buildCategoryMaps(config);
  const manifestMaps = buildCategoryMaps(manifest);

  const issues = [];
  const coverage = {};
  const stats = {
    requiredSegments: 0,
    configSegments: totalSegments(configMaps),
    manifestSegments: totalSegments(manifestMaps),
  };
  const readiness = {
    lighting: {
      total: 0,
      ready: 0,
      missing: [],
    },
    collision: {
      total: 0,
      ready: 0,
      missing: [],
    },
  };

  for (const [category, requiredIds] of Object.entries(REQUIRED_SEGMENT_IDS)) {
    const categoryCoverage = {
      category,
      required: requiredIds.length,
      missing: [],
      present: 0,
      warnings: [],
    };

    stats.requiredSegments += requiredIds.length;

    for (const segmentId of requiredIds) {
      const configSegment = configMaps[category].get(segmentId);
      const manifestSegment = manifestMaps[category].get(segmentId);
      const mergedSegment = mergeSegments(manifestSegment, configSegment);

      if (!mergedSegment) {
        categoryCoverage.missing.push(segmentId);
        issues.push({
          severity: 'error',
          category,
          segmentId,
          message: `Missing required ${category} segment "${segmentId}" in art config/manifest`,
        });
        continue;
      }

      categoryCoverage.present += 1;

      validateColour(mergedSegment, category, issues);
      validateAlpha(mergedSegment, category, issues);
      validateAssetId(mergedSegment, category, issues);
      validateMetadata(mergedSegment, category, issues);
      evaluateReadiness(mergedSegment, category, readiness, issues);
    }

    coverage[category] = categoryCoverage;
  }

  const ok = issues.every((issue) => issue.severity !== 'error');

  return {
    ok,
    issues: issues.sort(severityComparator),
    coverage,
    stats,
    readiness,
  };
}

/**
 * Produce a shorthand summary for logging/reporting pipelines.
 * @param {{ issues: Array<object>, coverage: Record<string, object>, readiness?: object }} result
 * @returns {{ status: 'pass'|'fail', missing: Record<string, string[]>, warnings: Array<object>, readiness: object }}
 */
export function summarizeAct2CrossroadsArtValidation(result) {
  if (!result || typeof result !== 'object') {
    return {
      status: 'fail',
      missing: {},
      warnings: [{ severity: 'error', message: 'No validation result supplied' }],
      readiness: {
        lighting: { total: 0, ready: 0, missing: [] },
        collision: { total: 0, ready: 0, missing: [] },
      },
    };
  }

  const missing = {};
  for (const [category, categoryCoverage] of Object.entries(result.coverage ?? {})) {
    if (Array.isArray(categoryCoverage.missing) && categoryCoverage.missing.length > 0) {
      missing[category] = [...categoryCoverage.missing];
    }
  }

  const warnings = (result.issues ?? []).filter((issue) => issue.severity === 'warning');

  return {
    status: result.ok ? 'pass' : 'fail',
    missing,
    warnings,
    readiness: summarizeReadiness(result.readiness),
  };
}

function buildCategoryMaps(source) {
  if (!source || typeof source !== 'object') {
    return {
      floors: new Map(),
      accents: new Map(),
      lightColumns: new Map(),
      boundaries: new Map(),
    };
  }

  return {
    floors: toSegmentMap(source.floors),
    accents: toSegmentMap(source.accents),
    lightColumns: toSegmentMap(source.lightColumns),
    boundaries: toSegmentMap(source.boundaries),
  };
}

function toSegmentMap(segments) {
  const map = new Map();
  if (!Array.isArray(segments)) {
    return map;
  }
  for (const segment of segments) {
    if (!segment || typeof segment !== 'object') {
      continue;
    }
    const segmentId = typeof segment.id === 'string' ? segment.id : null;
    if (!segmentId || map.has(segmentId)) {
      continue;
    }
    map.set(segmentId, { ...segment });
  }
  return map;
}

function mergeSegments(primary, secondary) {
  if (primary && secondary) {
    return { ...primary, ...secondary, metadata: mergeMetadata(primary.metadata, secondary.metadata) };
  }
  if (secondary) {
    return { ...secondary, metadata: mergeMetadata(null, secondary.metadata) };
  }
  if (primary) {
    return { ...primary, metadata: mergeMetadata(primary.metadata, null) };
  }
  return null;
}

function mergeMetadata(base, override) {
  const baseMeta = base && typeof base === 'object' ? base : {};
  const overrideMeta = override && typeof override === 'object' ? override : {};
  return { ...baseMeta, ...overrideMeta };
}

function validateColour(segment, category, issues) {
  if (!segment) {
    return;
  }
  const { color } = segment;
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    issues.push({
      severity: 'error',
      category,
      segmentId: segment.id,
      message: `Segment "${segment.id}" has invalid colour "${color}" (expected #RRGGBB)`,
    });
  }
}

function validateAlpha(segment, category, issues) {
  if (!segment) {
    return;
  }
  const { alpha } = segment;
  if (typeof alpha !== 'number' || Number.isNaN(alpha) || alpha < 0 || alpha > 1) {
    issues.push({
      severity: 'error',
      category,
      segmentId: segment.id,
      message: `Segment "${segment.id}" alpha ${alpha} outside [0,1]`,
    });
  }
}

function validateAssetId(segment, category, issues) {
  if (!segment) {
    return;
  }
  const assetId =
    typeof segment.assetId === 'string' && segment.assetId.length > 0
      ? segment.assetId
      : null;
  if (!assetId) {
    issues.push({
      severity: 'warning',
      category,
      segmentId: segment.id,
      message: `Segment "${segment.id}" is missing an assetId; designers cannot hot-swap art without it`,
    });
  }
}

function validateMetadata(segment, category, issues) {
  if (!segment) {
    return;
  }
  const metadata = segment.metadata;
  if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
    return;
  }
  issues.push({
    severity: 'warning',
    category,
    segmentId: segment.id,
    message: `Segment "${segment.id}" lacks metadata object; narrative hooks may not trigger correctly`,
  });
}

function totalSegments(maps) {
  let count = 0;
  for (const map of Object.values(maps)) {
    count += map.size;
  }
  return count;
}

function severityComparator(a, b) {
  const weight = (issue) => (issue.severity === 'error' ? 0 : 1);
  return weight(a) - weight(b);
}

function evaluateReadiness(segment, category, readiness, issues) {
  if (!segment || !category) {
    return;
  }

  if (LIGHTING_CATEGORIES.has(category)) {
    readiness.lighting.total += 1;
    const lightingPreset =
      typeof segment?.metadata?.lightingPreset === 'string' && segment.metadata.lightingPreset.length > 0
        ? segment.metadata.lightingPreset
        : null;
    if (lightingPreset) {
      readiness.lighting.ready += 1;
    } else {
      readiness.lighting.missing.push(segment.id);
      issues.push({
        severity: 'warning',
        category,
        segmentId: segment.id,
        message: `Segment "${segment.id}" is missing a lightingPreset; lighting sweep cannot validate narrative cues`,
      });
    }
  }

  if (COLLISION_CATEGORIES.has(category)) {
    readiness.collision.total += 1;
    const metadataCollision =
      typeof segment?.metadata?.collisionProfile === 'string' && segment.metadata.collisionProfile.length > 0;
    const tagCollision = Array.isArray(segment?.tags)
      ? segment.tags.some((tag) => tag === 'nav_blocker' || tag === 'collision')
      : false;
    if (metadataCollision || tagCollision) {
      readiness.collision.ready += 1;
    } else {
      readiness.collision.missing.push(segment.id);
      issues.push({
        severity: 'warning',
        category,
        segmentId: segment.id,
        message: `Segment "${segment.id}" lacks collision metadata; navigation blockers may fail in-engine`,
      });
    }
  }
}

function summarizeReadiness(source) {
  const initial = {
    lighting: { total: 0, ready: 0, missing: [] },
    collision: { total: 0, ready: 0, missing: [] },
  };
  const readiness = source && typeof source === 'object' ? source : initial;
  return {
    lighting: normalizeReadinessBucket(readiness.lighting),
    collision: normalizeReadinessBucket(readiness.collision),
  };
}

function normalizeReadinessBucket(bucket) {
  const safeBucket = bucket && typeof bucket === 'object' ? bucket : {};
  const total = Number.isFinite(safeBucket.total) ? safeBucket.total : 0;
  const ready = Number.isFinite(safeBucket.ready) ? safeBucket.ready : 0;
  const missing = Array.isArray(safeBucket.missing) ? [...safeBucket.missing] : [];
  return {
    total,
    ready,
    missing,
  };
}
