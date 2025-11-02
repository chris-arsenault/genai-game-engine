const DEFAULT_TIME_LIMIT_SECONDS = 90;
const MINIMUM_TIME_LIMIT_SECONDS = 15;
const MINIMUM_DIFFICULTY = 1;
const MAXIMUM_DIFFICULTY = 5;

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const ensureObject = (value) =>
  typeof value === 'object' && value !== null ? value : {};

const normalizePartialPattern = (rawPattern) => {
  if (!Array.isArray(rawPattern)) return [];
  return rawPattern
    .filter((feature) => feature && feature.id)
    .map((feature) => ({
      id: String(feature.id),
      points: Array.isArray(feature.points) ? feature.points.slice() : [],
      ridgeType: feature.ridgeType ?? 'loop',
      intensity: clamp01(feature.intensity ?? 0.75),
    }));
};

const resolveMatchedFeatureIds = (candidate, partialIds) => {
  if (!candidate) return [];
  if (Array.isArray(candidate.matchFeatures) && candidate.matchFeatures.length > 0) {
    return candidate.matchFeatures
      .map((featureId) => String(featureId))
      .filter((featureId) => partialIds.has(featureId));
  }
  if (Array.isArray(candidate.pattern)) {
    return candidate.pattern
      .filter((feature) => feature && feature.id && partialIds.has(String(feature.id)))
      .map((feature) => String(feature.id));
  }
  return [];
};

const resolveFalseFeatureIds = (candidate, partialIds) => {
  if (!candidate || !Array.isArray(candidate.pattern)) return [];
  return candidate.pattern
    .filter((feature) => feature && feature.id && !partialIds.has(String(feature.id)))
    .map((feature) => String(feature.id));
};

const resolveMatchScore = (candidate, matchedFeatureIds, partialIds) => {
  if (typeof candidate.matchScore === 'number') {
    return clamp01(candidate.matchScore);
  }
  const totalPartial = Math.max(1, partialIds.size);
  const coverage = matchedFeatureIds.length / totalPartial;
  if (!Array.isArray(candidate.pattern) || candidate.pattern.length === 0) {
    return clamp01(coverage);
  }
  const falseMatches = candidate.pattern.length - matchedFeatureIds.length;
  const penalty = Math.max(0, falseMatches) / candidate.pattern.length;
  return clamp01(coverage - penalty * 0.35);
};

const normalizeCandidates = (rawCandidates, partialIds) => {
  if (!Array.isArray(rawCandidates)) return [];
  const normalized = rawCandidates
    .filter((candidate) => candidate && candidate.id)
    .map((candidate) => {
      const matchedFeatureIds = resolveMatchedFeatureIds(candidate, partialIds);
      return {
        id: String(candidate.id),
        label: candidate.label ?? candidate.name ?? candidate.id,
        description: candidate.description ?? '',
        matchedFeatureIds,
        falseFeatureIds: resolveFalseFeatureIds(candidate, partialIds),
        matchScore: resolveMatchScore(candidate, matchedFeatureIds, partialIds),
        isCorrect: Boolean(candidate.isCorrect),
        locked: Boolean(candidate.locked),
        metadata: ensureObject(candidate.metadata),
      };
    });

  if (!normalized.some((candidate) => candidate.isCorrect) && normalized.length > 0) {
    console.warn('[FingerprintMatching] Puzzle missing correct candidate; promoting first option.');
    normalized[0].isCorrect = true;
  }

  return normalized;
};

const resolveDifficulty = (value) => {
  if (!Number.isFinite(value)) return MINIMUM_DIFFICULTY;
  const rounded = Math.round(value);
  return Math.min(MAXIMUM_DIFFICULTY, Math.max(MINIMUM_DIFFICULTY, rounded));
};

const resolveTimeLimit = (raw, fallback) => {
  if (raw === null) return null;
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(MINIMUM_TIME_LIMIT_SECONDS, raw);
};

export const FingerprintDefaults = Object.freeze({
  DEFAULT_TIME_LIMIT_SECONDS,
  MINIMUM_TIME_LIMIT_SECONDS,
  MINIMUM_DIFFICULTY,
  MAXIMUM_DIFFICULTY,
});

export const FingerprintPuzzleUtils = Object.freeze({
  clamp01,
  ensureObject,
  normalizePartialPattern,
  normalizeCandidates,
  resolveDifficulty,
  resolveTimeLimit,
});

export const normalizePuzzle = (rawPuzzle, defaults) => {
  const puzzle = ensureObject(rawPuzzle);
  const partialPattern = normalizePartialPattern(puzzle.partialPattern);
  const partialIds = new Set(partialPattern.map((feature) => feature.id));
  return {
    id: puzzle.id ?? `fingerprint-${Date.now()}`,
    difficulty: resolveDifficulty(puzzle.difficulty),
    allowRetries: puzzle.allowRetries !== false,
    partialPattern,
    candidates: normalizeCandidates(puzzle.candidatePrints, partialIds),
    timeLimitSeconds: resolveTimeLimit(
      puzzle.timeLimitSeconds,
      defaults.defaultTimeLimit,
    ),
    metadata: ensureObject(puzzle.metadata),
  };
};
