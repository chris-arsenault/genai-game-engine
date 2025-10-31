import { createSelector } from '../utils/memoize.js';
import { districts as districtDefinitions } from '../../../game/data/districts/index.js';

const STABILITY_MIN = 0;
const STABILITY_MAX = 100;
const CHANGE_LOG_LIMIT = 50;

function clamp(value, min = STABILITY_MIN, max = STABILITY_MAX) {
  return Math.max(min, Math.min(max, value));
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = cloneValue(val);
    }
    return result;
  }
  return value;
}

function cloneRestriction(restriction) {
  if (!restriction) return null;
  return {
    id: restriction.id ?? null,
    type: restriction.type ?? null,
    description: restriction.description ?? '',
    active: Boolean(restriction.active),
    lastChangedAt: restriction.lastChangedAt ?? null,
    metadata: cloneValue(restriction.metadata ?? {}),
  };
}

function cloneRoute(route) {
  if (!route) return null;
  return {
    id: route.id ?? null,
    type: route.type ?? null,
    description: route.description ?? '',
    unlocked: Boolean(route.unlocked),
    defaultUnlocked: Boolean(route.defaultUnlocked),
    unlockedAt: route.unlockedAt ?? null,
    metadata: cloneValue(route.metadata ?? {}),
  };
}

function cloneDistrictRecord(record) {
  if (!record) return null;
  return {
    ...record,
    controllingFaction: {
      base: record.controllingFaction?.base ?? null,
      current: record.controllingFaction?.current ?? null,
      previous: record.controllingFaction?.previous ?? null,
      lastChangedAt: record.controllingFaction?.lastChangedAt ?? null,
    },
    influence: cloneValue(record.influence ?? {}),
    stability: {
      base: record.stability?.base ?? 50,
      current: record.stability?.current ?? 50,
      rating: record.stability?.rating ?? 'stable',
      lastChangedAt: record.stability?.lastChangedAt ?? null,
    },
    security: {
      level: record.security?.level ?? 1,
      description: record.security?.description ?? '',
      surveillanceCoverage: record.security?.surveillanceCoverage ?? null,
    },
    access: {
      defaultUnlocked: Boolean(record.access?.defaultUnlocked),
      fastTravelEnabled: Boolean(record.access?.fastTravelEnabled),
      requirements: cloneValue(record.access?.requirements ?? {}),
      restrictions: Array.isArray(record.access?.restrictions)
        ? record.access.restrictions.map(cloneRestriction)
        : [],
      unlockedRoutes: Array.isArray(record.access?.unlockedRoutes)
        ? [...record.access.unlockedRoutes]
        : [],
      restrictionLog: Array.isArray(record.access?.restrictionLog)
        ? [...record.access.restrictionLog]
        : [],
    },
    infiltrationRoutes: Array.isArray(record.infiltrationRoutes)
      ? record.infiltrationRoutes.map(cloneRoute)
      : [],
    environment: {
      weather: Array.isArray(record.environment?.weather)
        ? [...record.environment.weather]
        : [],
      hazards: Array.isArray(record.environment?.hazards)
        ? [...record.environment.hazards]
        : [],
      traversal: Array.isArray(record.environment?.traversal)
        ? [...record.environment.traversal]
        : [],
    },
    pointsOfInterest: Array.isArray(record.pointsOfInterest)
      ? record.pointsOfInterest.map((poi) => ({
          id: poi.id ?? null,
          name: poi.name ?? '',
          type: poi.type ?? null,
          description: poi.description ?? '',
        }))
      : [],
    narrativeHooks: Array.isArray(record.narrativeHooks)
      ? record.narrativeHooks.map((hook) => ({
          id: hook.id ?? null,
          summary: hook.summary ?? '',
        }))
      : [],
    proceduralModifiers: cloneValue(record.proceduralModifiers ?? {}),
    analytics: {
      lockdownsTriggered: record.analytics?.lockdownsTriggered ?? 0,
      lastLockdownAt: record.analytics?.lastLockdownAt ?? null,
      stabilityHistory: Array.isArray(record.analytics?.stabilityHistory)
        ? [...record.analytics.stabilityHistory]
        : [],
      controlHistory: Array.isArray(record.analytics?.controlHistory)
        ? [...record.analytics.controlHistory]
        : [],
    },
  };
}

function cloneDistrictState(state) {
  const next = {
    byId: {},
    changeLog: Array.isArray(state?.changeLog) ? [...state.changeLog] : [],
    lastUpdatedAt: state?.lastUpdatedAt ?? null,
  };

  for (const [id, record] of Object.entries(state?.byId || {})) {
    next.byId[id] = cloneDistrictRecord(record);
  }

  return next;
}

function normalizeRestriction(definition, index, districtId) {
  if (!definition) {
    return null;
  }

  const id =
    definition.id ??
    `${districtId}_restriction_${definition.type ?? 'generic'}_${index}`;

  return {
    id,
    type: definition.type ?? 'generic',
    description: definition.description ?? '',
    active: Boolean(definition.active ?? false),
    lastChangedAt: null,
    metadata: cloneValue(definition),
  };
}

function normalizeRoute(definition, index, districtId) {
  if (!definition) {
    return null;
  }

  const id =
    definition.id ?? `${districtId}_route_${definition.type ?? 'general'}_${index}`;

  const defaultUnlocked = Boolean(definition.defaultUnlocked ?? false);

  return {
    id,
    type: definition.type ?? 'general',
    description: definition.description ?? '',
    defaultUnlocked,
    unlocked: defaultUnlocked,
    unlockedAt: defaultUnlocked ? Date.now() : null,
    metadata: cloneValue(definition),
  };
}

function createRecordFromDefinition(definition) {
  const restrictions = Array.isArray(definition.access?.restrictions)
    ? definition.access.restrictions
        .map((restriction, index) =>
          normalizeRestriction(restriction, index, definition.id)
        )
        .filter(Boolean)
    : [];

  const routes = Array.isArray(definition.access?.infiltrationRoutes)
    ? definition.access.infiltrationRoutes
        .map((route, index) => normalizeRoute(route, index, definition.id))
        .filter(Boolean)
    : [];

  return {
    id: definition.id,
    name: definition.name,
    shortName: definition.shortName ?? null,
    tier: definition.tier ?? 'foundation',
    controllingFaction: {
      base: definition.controllingFaction ?? null,
      current: definition.controllingFaction ?? null,
      previous: null,
      lastChangedAt: null,
    },
    influence: cloneValue(definition.influence ?? {}),
    stability: {
      base: clamp(definition.stability?.base ?? 50),
      current: clamp(definition.stability?.base ?? 50),
      rating: definition.stability?.rating ?? 'stable',
      lastChangedAt: null,
    },
    security: {
      level: clamp(definition.security?.level ?? 1, 1, 5),
      description: definition.security?.description ?? '',
      surveillanceCoverage: definition.security?.surveillanceCoverage ?? null,
    },
    access: {
      defaultUnlocked: Boolean(definition.access?.defaultUnlocked),
      fastTravelEnabled: Boolean(definition.access?.fastTravelEnabled),
      requirements: cloneValue(definition.access?.requirements ?? {}),
      restrictions,
      unlockedRoutes: routes.filter((route) => route.unlocked).map((route) => route.id),
      restrictionLog: [],
    },
    infiltrationRoutes: routes,
    environment: cloneValue(definition.environment ?? {}),
    pointsOfInterest: Array.isArray(definition.pointsOfInterest)
      ? definition.pointsOfInterest.map((poi) => ({
          id: poi.id ?? null,
          name: poi.name ?? '',
          type: poi.type ?? null,
          description: poi.description ?? '',
        }))
      : [],
    narrativeHooks: Array.isArray(definition.narrativeHooks)
      ? definition.narrativeHooks.map((hook) => ({
          id: hook.id ?? null,
          summary: hook.summary ?? '',
        }))
      : [],
    proceduralModifiers: cloneValue(definition.proceduralModifiers ?? {}),
    analytics: {
      lockdownsTriggered: 0,
      lastLockdownAt: null,
      stabilityHistory: [],
      controlHistory: [],
    },
  };
}

function createInitialState() {
  const records = {};
  for (const definition of Object.values(districtDefinitions)) {
    records[definition.id] = createRecordFromDefinition(definition);
  }
  return {
    byId: records,
    changeLog: [],
    lastUpdatedAt: null,
  };
}

const initialDistrictState = createInitialState();

function appendChangeLog(state, entry) {
  const log = Array.isArray(state.changeLog) ? [...state.changeLog] : [];
  log.push(entry);
  if (log.length > CHANGE_LOG_LIMIT) {
    log.splice(0, log.length - CHANGE_LOG_LIMIT);
  }
  state.changeLog = log;
}

function ensureDistrict(state, districtId, definition) {
  if (!districtId) return null;
  if (!state.byId[districtId]) {
    const fallbackDefinition =
      definition ?? districtDefinitions[districtId] ?? null;
    if (!fallbackDefinition) {
      return null;
    }
    state.byId[districtId] = createRecordFromDefinition(fallbackDefinition);
  }
  return state.byId[districtId];
}

export const districtSlice = {
  key: 'district',

  getInitialState: createInitialState,

  reducer(state = initialDistrictState, action) {
    if (!action) {
      return state;
    }

    if (action.domain !== 'district' && action.type !== 'WORLDSTATE_HYDRATE') {
      return state;
    }

    const next = cloneDistrictState(state);
    const payload = action.payload ?? {};
    let changed = false;
    const timestamp = action.timestamp ?? Date.now();

    switch (action.type) {
      case 'DISTRICT_REGISTERED': {
        const { districtId, definition } = payload;
        if (!districtId) break;
        const record = ensureDistrict(next, districtId, definition);
        if (!record) break;
        appendChangeLog(next, {
          type: 'registered',
          districtId,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'DISTRICT_CONTROL_CHANGED': {
        const { districtId, controllingFaction, source } = payload;
        if (!districtId || !controllingFaction) break;
        const record = ensureDistrict(next, districtId);
        if (!record) break;
        if (record.controllingFaction.current === controllingFaction) {
          break;
        }

        record.controllingFaction = {
          base: record.controllingFaction.base,
          previous: record.controllingFaction.current,
          current: controllingFaction,
          lastChangedAt: timestamp,
        };
        record.analytics.controlHistory = [
          ...(record.analytics.controlHistory || []),
          {
            timestamp,
            previous: record.controllingFaction.previous,
            current: controllingFaction,
            source: source ?? null,
          },
        ].slice(-10);

        appendChangeLog(next, {
          type: 'control_changed',
          districtId,
          controllingFaction,
          source: source ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'DISTRICT_STABILITY_SET': {
        const { districtId, stabilityValue, rating, source } = payload;
        if (!districtId || typeof stabilityValue !== 'number') break;
        const record = ensureDistrict(next, districtId);
        if (!record) break;

        const clamped = clamp(stabilityValue);
        record.stability.current = clamped;
        record.stability.rating = rating ?? record.stability.rating;
        record.stability.lastChangedAt = timestamp;
        record.analytics.stabilityHistory = [
          ...(record.analytics.stabilityHistory || []),
          { timestamp, value: clamped, source: source ?? null },
        ].slice(-25);
        appendChangeLog(next, {
          type: 'stability_set',
          districtId,
          value: clamped,
          rating: record.stability.rating,
          source: source ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'DISTRICT_STABILITY_ADJUSTED': {
        const { districtId, delta, source } = payload;
        if (!districtId || typeof delta !== 'number') break;
        const record = ensureDistrict(next, districtId);
        if (!record) break;
        const nextValue = clamp((record.stability.current ?? record.stability.base) + delta);
        record.stability.current = nextValue;
        record.stability.lastChangedAt = timestamp;
        record.analytics.stabilityHistory = [
          ...(record.analytics.stabilityHistory || []),
          { timestamp, value: nextValue, delta, source: source ?? null },
        ].slice(-25);
        appendChangeLog(next, {
          type: 'stability_adjusted',
          districtId,
          delta,
          value: nextValue,
          source: source ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'DISTRICT_RESTRICTION_SET': {
        const { districtId, restrictionId, active, metadata } = payload;
        if (!districtId || !restrictionId || typeof active !== 'boolean') break;
        const record = ensureDistrict(next, districtId);
        if (!record) break;
        const restrictions = Array.isArray(record.access.restrictions)
          ? record.access.restrictions
          : [];
        const target = restrictions.find((item) => item.id === restrictionId);
        if (!target) {
          restrictions.push(
            cloneRestriction({
              id: restrictionId,
              type: metadata?.type ?? 'generic',
              description: metadata?.description ?? '',
              active,
              metadata,
            })
          );
        } else {
          target.active = active;
          target.lastChangedAt = timestamp;
          if (metadata) {
            target.metadata = cloneValue(metadata);
          }
        }

        record.access.restrictions = restrictions;
        if (Array.isArray(record.access.unlockedRoutes)) {
          record.access.unlockedRoutes = record.access.unlockedRoutes.filter(
            (routeId) => routeId !== restrictionId
          );
        }

        const restrictionLog = Array.isArray(record.access.restrictionLog)
          ? [...record.access.restrictionLog]
          : [];
        restrictionLog.push({
          restrictionId,
          active,
          timestamp,
        });
        if (restrictionLog.length > 20) {
          restrictionLog.splice(0, restrictionLog.length - 20);
        }
        record.access.restrictionLog = restrictionLog;

        if (active) {
          record.analytics.lockdownsTriggered =
            (record.analytics.lockdownsTriggered ?? 0) + 1;
          record.analytics.lastLockdownAt = timestamp;
        }

        appendChangeLog(next, {
          type: 'restriction_set',
          districtId,
          restrictionId,
          active,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'DISTRICT_ROUTE_UNLOCKED': {
        const { districtId, routeId, source } = payload;
        if (!districtId || !routeId) break;
        const record = ensureDistrict(next, districtId);
        if (!record) break;
        const route = record.infiltrationRoutes.find((entry) => entry.id === routeId);
        if (!route) break;
        if (route.unlocked) break;

        route.unlocked = true;
        route.unlockedAt = timestamp;
        record.access.unlockedRoutes = [
          ...(record.access.unlockedRoutes || []),
          routeId,
        ];
        record.access.unlockedRoutes = Array.from(
          new Set(record.access.unlockedRoutes)
        );

        appendChangeLog(next, {
          type: 'route_unlocked',
          districtId,
          routeId,
          source: source ?? null,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'DISTRICT_FAST_TRAVEL_SET': {
        const { districtId, enabled } = payload;
        if (!districtId || typeof enabled !== 'boolean') break;
        const record = ensureDistrict(next, districtId);
        if (!record) break;
        if (record.access.fastTravelEnabled === enabled) break;

        record.access.fastTravelEnabled = enabled;
        appendChangeLog(next, {
          type: 'fast_travel_set',
          districtId,
          enabled,
          timestamp,
        });
        next.lastUpdatedAt = timestamp;
        changed = true;
        break;
      }

      case 'WORLDSTATE_HYDRATE': {
        const snapshot = payload.districts ?? {};
        if (!snapshot || typeof snapshot !== 'object') break;

        const merged = createInitialState();

        if (snapshot.byId && typeof snapshot.byId === 'object') {
          for (const [districtId, record] of Object.entries(snapshot.byId)) {
            merged.byId[districtId] = {
              ...merged.byId[districtId],
              ...cloneDistrictRecord(record),
            };
          }
        }

        merged.changeLog = Array.isArray(snapshot.changeLog)
          ? [...snapshot.changeLog]
          : [];
        merged.lastUpdatedAt = snapshot.lastUpdatedAt ?? null;

        return merged;
      }

      default:
        break;
    }

    if (!changed) {
      return state;
    }

    return next;
  },

  serialize(state) {
    if (!state) {
      return createInitialState();
    }

    const snapshot = {
      byId: {},
      changeLog: Array.isArray(state.changeLog) ? [...state.changeLog] : [],
      lastUpdatedAt: state.lastUpdatedAt ?? null,
    };

    for (const [districtId, record] of Object.entries(state.byId || {})) {
      snapshot.byId[districtId] = cloneDistrictRecord(record);
    }

    return snapshot;
  },

  hydrate(snapshot) {
    if (!snapshot) {
      return createInitialState();
    }

    const next = createInitialState();

    if (snapshot.byId && typeof snapshot.byId === 'object') {
      for (const [districtId, record] of Object.entries(snapshot.byId)) {
        next.byId[districtId] = {
          ...next.byId[districtId],
          ...cloneDistrictRecord(record),
        };
      }
    }

    next.changeLog = Array.isArray(snapshot.changeLog)
      ? [...snapshot.changeLog]
      : [];
    next.lastUpdatedAt = snapshot.lastUpdatedAt ?? null;

    return next;
  },

  selectors: {
    selectRoot: (state) => state?.district ?? initialDistrictState,
    selectAllDistricts: createSelector(
      (state) => state?.district ?? initialDistrictState,
      (districtState) => Object.values(districtState.byId || {})
    ),
    selectDistrictById: createSelector(
      (state) => state?.district ?? initialDistrictState,
      (_, districtId) => districtId,
      (districtState, districtId) => districtState.byId[districtId] ?? null
    ),
    selectDistrictsByTier: createSelector(
      (state) => state?.district ?? initialDistrictState,
      (_, tier) => tier,
      (districtState, tier) =>
        Object.values(districtState.byId || {}).filter(
          (record) => record.tier === tier
        )
    ),
    selectControlSummary: createSelector(
      (state) => state?.district ?? initialDistrictState,
      (districtState) =>
        Object.values(districtState.byId || {}).map((record) => ({
          id: record.id,
          tier: record.tier,
          controllingFaction: record.controllingFaction.current,
          stability: record.stability.current,
          rating: record.stability.rating,
        }))
    ),
  },
};

export default districtSlice;
