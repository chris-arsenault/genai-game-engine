import { districtSlice } from '../../state/slices/districtSlice.js';
import {
  describeDistrictBlockers,
  evaluateDistrictAccess,
} from '../../progression/DistrictAccessEvaluator.js';
import { getAllDistricts } from '../../data/districts/index.js';

const DEFAULT_TIER_ORDER = {
  foundation: 0,
  lattice: 1,
  ascent: 2,
  pinnacle: 3,
  substructure: 4,
};

function resolveAccessor(storeOrState) {
  if (!storeOrState) {
    return {
      select: () => null,
      state: {},
    };
  }

  if (typeof storeOrState.select === 'function') {
    return {
      select: (selector, ...args) => storeOrState.select(selector, ...args),
      state:
        typeof storeOrState.getState === 'function'
          ? storeOrState.getState()
          : {},
    };
  }

  const rawState =
    (storeOrState && typeof storeOrState === 'object' && storeOrState.state) ||
    storeOrState ||
    {};

  return {
    select: (selector, ...args) => selector(rawState, ...args),
    state: rawState,
  };
}

function dedupeStrings(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function buildRouteSummaries(record) {
  if (!record) {
    return [];
  }
  const routes = Array.isArray(record.infiltrationRoutes)
    ? record.infiltrationRoutes
    : [];

  return routes.map((route) => ({
    id: route.id ?? null,
    type: route.type ?? 'general',
    description: route.description ?? '',
    unlocked: Boolean(route.unlocked),
    defaultUnlocked: Boolean(route.defaultUnlocked),
    unlockedAt: route.unlockedAt ?? null,
  }));
}

function buildFactionRequirements(entries = []) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.map((entry) => ({
    factionId: entry.factionId ?? entry.id ?? null,
    thresholds: { ...(entry.thresholds ?? {}) },
    current: { ...(entry.current ?? {}) },
  }));
}

function buildRequirementsDetail(detail = {}) {
  const knowledge = Array.isArray(detail.knowledge?.missing)
    ? dedupeStrings(detail.knowledge.missing)
    : [];
  const storyFlags = Array.isArray(detail.storyFlags?.missing)
    ? dedupeStrings(detail.storyFlags.missing)
    : [];
  const quests = Array.isArray(detail.quests?.missing)
    ? dedupeStrings(detail.quests.missing)
    : [];
  const abilities = Array.isArray(detail.abilities?.missing)
    ? dedupeStrings(detail.abilities.missing)
    : [];
  const equipment = Array.isArray(detail.equipment?.missing)
    ? dedupeStrings(detail.equipment.missing)
    : [];
  const faction = buildFactionRequirements(detail.faction);

  return {
    knowledge,
    storyFlags,
    quests,
    abilities,
    equipment,
    faction,
  };
}

function collectDistrictRecords(accessor) {
  const records =
    accessor.select(districtSlice.selectors.selectAllDistricts) ?? [];
  if (Array.isArray(records) && records.length) {
    return records;
  }
  return getAllDistricts();
}

function buildRestrictions(record, evaluation) {
  if (Array.isArray(evaluation?.activeRestrictions)) {
    return evaluation.activeRestrictions.map((restriction) => ({
      id: restriction.id ?? null,
      type: restriction.type ?? 'generic',
      description: restriction.description ?? '',
      metadata: restriction.metadata ?? {},
      lastChangedAt: restriction.lastChangedAt ?? null,
    }));
  }

  if (Array.isArray(record?.access?.restrictions)) {
    return record.access.restrictions.map((restriction) => ({
      id: restriction.id ?? null,
      type: restriction.type ?? 'generic',
      description: restriction.description ?? '',
      metadata: restriction.metadata ?? {},
      lastChangedAt: restriction.lastChangedAt ?? null,
    }));
  }

  return [];
}

function summarizeBlockers(storeOrState, districtId, context) {
  const blockers = describeDistrictBlockers(storeOrState, districtId, context);
  return blockers.filter((value, index) => blockers.indexOf(value) === index);
}

function buildStatus(evaluation, restrictions) {
  if (!evaluation) {
    return {
      accessible: false,
      status: 'unknown',
      baseUnlocked: false,
    };
  }

  const accessible = Boolean(evaluation.isUnlocked);
  const baseUnlocked = Boolean(evaluation.baseUnlocked);

  let status = 'locked';
  if (accessible) {
    status = restrictions.length ? 'restricted' : 'accessible';
  } else if (baseUnlocked) {
    status = 'gated';
  }

  return {
    accessible,
    status,
    baseUnlocked,
  };
}

function sortDistricts(entries) {
  return entries.sort((a, b) => {
    const tierA = DEFAULT_TIER_ORDER[a.tier] ?? 99;
    const tierB = DEFAULT_TIER_ORDER[b.tier] ?? 99;
    if (tierA !== tierB) {
      return tierA - tierB;
    }
    return a.name.localeCompare(b.name);
  });
}

export function buildDistrictTravelViewModel(storeOrState, context = {}) {
  const accessor = resolveAccessor(storeOrState);
  const records = collectDistrictRecords(accessor);

  const entries = [];

  for (const record of records) {
    if (!record || !record.id) {
      continue;
    }

    let evaluation;
    try {
      evaluation = evaluateDistrictAccess(storeOrState, record.id, context);
    } catch (error) {
      // Skip invalid district records but continue aggregating the rest.
      // eslint-disable-next-line no-console
      console.warn(
        '[DistrictTravelViewModel] Failed to evaluate district access',
        record.id,
        error
      );
      continue;
    }

    const restrictions = buildRestrictions(record, evaluation);
    const status = buildStatus(evaluation, restrictions);
    const blockers = summarizeBlockers(storeOrState, record.id, context);
    const requirements = buildRequirementsDetail(evaluation.requirementsDetail);
    const routes = buildRouteSummaries(record);
    const unlockedRouteIds = new Set(
      Array.isArray(evaluation.unlockedRoutes) ? evaluation.unlockedRoutes : []
    );

    const unlockedRoutes = routes.filter((route) => route.unlocked);
    const lockedRoutes = routes.filter((route) => !route.unlocked);

    entries.push({
      districtId: record.id,
      name: record.name ?? record.id,
      shortName: record.shortName ?? null,
      tier: record.tier ?? 'unknown',
      controllingFaction:
        evaluation.controllingFaction?.current ??
        evaluation.controllingFaction?.base ??
        record.controllingFaction?.current ??
        record.controllingFaction?.base ??
        null,
      stability: evaluation.stability ?? record.stability ?? null,
      fastTravelEnabled:
        record.access?.fastTravelEnabled ?? evaluation.fastTravelEnabled ?? false,
      status,
      blockers,
      requirements,
      restrictions,
      routes,
      unlockedRoutes,
      lockedRoutes,
      unlockedRouteIds,
      knowledgeComplete: requirements.knowledge.length === 0,
      questRequirementsComplete: requirements.quests.length === 0,
      abilityRequirementsComplete: requirements.abilities.length === 0,
      equipmentRequirementsComplete: requirements.equipment.length === 0,
      factionRequirementsComplete: requirements.faction.length === 0,
      lastUpdatedAt: record?.analytics?.lastLockdownAt ?? null,
    });
  }

  return sortDistricts(entries);
}

export default buildDistrictTravelViewModel;
