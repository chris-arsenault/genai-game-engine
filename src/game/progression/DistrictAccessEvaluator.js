import { districts as districtDefinitions, getDistrict } from '../data/districts/index.js';
import { storySlice } from '../state/slices/storySlice.js';
import { questSlice } from '../state/slices/questSlice.js';
import { factionSlice } from '../state/slices/factionSlice.js';
import { inventorySlice } from '../state/slices/inventorySlice.js';
import { districtSlice } from '../state/slices/districtSlice.js';

function toSet(values) {
  if (!values) return new Set();
  if (values instanceof Set) return values;
  if (Array.isArray(values)) return new Set(values);
  return new Set(Object.keys(values));
}

function hasInCollection(collection, itemId) {
  if (!itemId) return false;
  if (!collection) return false;
  if (collection instanceof Set) {
    return collection.has(itemId);
  }
  if (Array.isArray(collection)) {
    return collection.includes(itemId);
  }
  if (typeof collection === 'object') {
    return Boolean(collection[itemId]);
  }
  return false;
}

function resolveStateAccessor(storeOrState) {
  if (storeOrState && typeof storeOrState.select === 'function') {
    const rawState =
      typeof storeOrState.getState === 'function'
        ? storeOrState.getState()
        : null;
    return {
      select: (selector, ...args) => storeOrState.select(selector, ...args),
      state: rawState ?? {},
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

function evaluateKnowledge(select, knowledgeList = [], context) {
  const knowledgeSet = toSet(context?.knowledge);
  const missing = [];

  for (const knowledgeId of knowledgeList) {
    if (knowledgeSet.size && knowledgeSet.has(knowledgeId)) {
      continue;
    }
    const hasKnowledge = Boolean(
      select(storySlice.selectors.selectFlag, knowledgeId, false)
    );
    if (!hasKnowledge) {
      missing.push(knowledgeId);
    }
  }

  return missing;
}

function evaluateStoryFlags(select, flags = [], context) {
  const overrides = context?.storyFlags || {};
  const missing = [];

  for (const flagId of flags) {
    if (Object.prototype.hasOwnProperty.call(overrides, flagId)) {
      if (!overrides[flagId]) {
        missing.push(flagId);
      }
      continue;
    }

    const value = Boolean(select(storySlice.selectors.selectFlag, flagId, false));
    if (!value) {
      missing.push(flagId);
    }
  }

  return missing;
}

function evaluateQuests(select, quests = [], context) {
  const completed = toSet(context?.completedQuests);
  const missing = [];

  for (const questId of quests) {
    if (completed.size && completed.has(questId)) {
      continue;
    }

    const questRecord = select(questSlice.selectors.selectQuestById, questId);
    if (!questRecord || questRecord.status !== 'completed') {
      missing.push(questId);
    }
  }

  return missing;
}

function evaluateAbilities(select, abilities = [], context) {
  const knownAbilities = toSet(context?.abilities);
  const missing = [];

  for (const abilityId of abilities) {
    if (knownAbilities.size && knownAbilities.has(abilityId)) {
      continue;
    }
    const isFlagged = Boolean(select(storySlice.selectors.selectFlag, abilityId, false));
    if (!isFlagged) {
      missing.push(abilityId);
    }
  }

  return missing;
}

function evaluateEquipment(select, equipment = [], context, state) {
  const ownedItems = toSet(context?.items);
  const missing = [];

  for (const itemId of equipment) {
    if (ownedItems.size && ownedItems.has(itemId)) {
      continue;
    }

    const items = inventorySlice.selectors.getItems(state);
    const found = items.some((item) => item.id === itemId);
    if (!found) {
      missing.push(itemId);
    }
  }

  return missing;
}

function evaluateFactionRequirement(select, requirement = {}, context) {
  const missing = [];

  for (const [factionId, thresholds] of Object.entries(requirement)) {
    const override = context?.factionReputation?.[factionId] ?? null;
    const factionRecord =
      override ??
      select(factionSlice.selectors.selectFactionById, factionId) ??
      {};

    const fame = factionRecord.fame ?? 0;
    const infamy = factionRecord.infamy ?? 0;

    const minFame = thresholds.minFame ?? thresholds.min ?? null;
    const maxFame = thresholds.maxFame ?? null;
    const minInfamy = thresholds.minInfamy ?? null;
    const maxInfamy = thresholds.maxInfamy ?? thresholds.max ?? null;

    let satisfied = true;
    if (minFame !== null && fame < minFame) {
      satisfied = false;
    }
    if (maxFame !== null && fame > maxFame) {
      satisfied = false;
    }
    if (minInfamy !== null && infamy < minInfamy) {
      satisfied = false;
    }
    if (maxInfamy !== null && infamy > maxInfamy) {
      satisfied = false;
    }

    if (!satisfied) {
      missing.push({
        factionId,
        thresholds,
        current: { fame, infamy },
      });
    }
  }

  return missing;
}

function collectActiveRestrictions(districtRecord) {
  if (!districtRecord || !districtRecord.access) {
    return [];
  }

  const restrictions = Array.isArray(districtRecord.access.restrictions)
    ? districtRecord.access.restrictions
    : [];

  return restrictions
    .filter((restriction) => restriction && restriction.active)
    .map((restriction) => ({
      id: restriction.id,
      type: restriction.type ?? 'generic',
      description: restriction.description ?? '',
      metadata: restriction.metadata ?? {},
      lastChangedAt: restriction.lastChangedAt ?? null,
    }));
}

function normalizeRequirements(requirements = {}) {
  return {
    knowledge: Array.isArray(requirements.knowledge) ? [...new Set(requirements.knowledge)] : [],
    storyFlags: Array.isArray(requirements.storyFlags) ? [...new Set(requirements.storyFlags)] : [],
    quests: Array.isArray(requirements.quests) ? [...new Set(requirements.quests)] : [],
    abilities: Array.isArray(requirements.abilities) ? [...new Set(requirements.abilities)] : [],
    equipment: Array.isArray(requirements.equipment) ? [...new Set(requirements.equipment)] : [],
    faction: requirements.faction ? { ...requirements.faction } : {},
    reputation: requirements.reputation ? { ...requirements.reputation } : {},
  };
}

export function evaluateDistrictAccess(storeOrState, districtId, context = {}) {
  if (!districtId) {
    throw new Error('evaluateDistrictAccess requires a districtId');
  }

  const { select, state } = resolveStateAccessor(storeOrState);
  const districtRecord = select(districtSlice.selectors.selectDistrictById, districtId);
  const definition = districtRecord ?? getDistrict(districtId) ?? districtDefinitions[districtId] ?? null;

  if (!definition) {
    throw new Error(`Unknown district: ${districtId}`);
  }

  const requirements = normalizeRequirements(
    districtRecord?.access?.requirements ?? definition?.access?.requirements ?? {}
  );

  const knowledgeMissing = evaluateKnowledge(select, requirements.knowledge, context);
  const storyFlagsMissing = evaluateStoryFlags(select, requirements.storyFlags, context);
  const questsMissing = evaluateQuests(select, requirements.quests, context);
  const abilitiesMissing = evaluateAbilities(select, requirements.abilities, context);
  const equipmentMissing = evaluateEquipment(select, requirements.equipment, context, state);

  const factionMissing = [
    ...evaluateFactionRequirement(select, requirements.faction, context),
    ...evaluateFactionRequirement(select, requirements.reputation, context),
  ];

  const unmetRequirements = [
    ...knowledgeMissing.map((id) => ({ type: 'knowledge', id })),
    ...storyFlagsMissing.map((id) => ({ type: 'storyFlag', id })),
    ...questsMissing.map((id) => ({ type: 'quest', id })),
    ...abilitiesMissing.map((id) => ({ type: 'ability', id })),
    ...equipmentMissing.map((id) => ({ type: 'equipment', id })),
    ...factionMissing.map((entry) => ({
      type: 'faction',
      id: entry.factionId,
      thresholds: entry.thresholds,
      current: entry.current,
    })),
  ];

  const activeRestrictions = collectActiveRestrictions(districtRecord);
  const unlockedRoutes = Array.isArray(districtRecord?.access?.unlockedRoutes)
    ? [...districtRecord.access.unlockedRoutes]
    : [];

  const baseUnlocked =
    Boolean(districtRecord?.access?.defaultUnlocked ?? definition?.access?.defaultUnlocked) ||
    unmetRequirements.length === 0;

  const isUnlocked = baseUnlocked && activeRestrictions.length === 0;

  return {
    districtId,
    name: districtRecord?.name ?? definition?.name ?? districtId,
    tier: districtRecord?.tier ?? definition?.tier ?? 'foundation',
    baseUnlocked,
    isUnlocked,
    unmetRequirements,
    requirementsDetail: {
      knowledge: { required: requirements.knowledge, missing: knowledgeMissing },
      storyFlags: { required: requirements.storyFlags, missing: storyFlagsMissing },
      quests: { required: requirements.quests, missing: questsMissing },
      abilities: { required: requirements.abilities, missing: abilitiesMissing },
      equipment: { required: requirements.equipment, missing: equipmentMissing },
      faction: factionMissing,
    },
    activeRestrictions,
    unlockedRoutes,
    stability: districtRecord?.stability ?? null,
    controllingFaction: districtRecord?.controllingFaction ?? null,
  };
}

export function isDistrictAccessible(storeOrState, districtId, context = {}) {
  const evaluation = evaluateDistrictAccess(storeOrState, districtId, context);
  return evaluation.isUnlocked;
}

export function describeDistrictBlockers(storeOrState, districtId, context = {}) {
  const evaluation = evaluateDistrictAccess(storeOrState, districtId, context);
  const blockers = [];

  for (const requirement of evaluation.unmetRequirements) {
    switch (requirement.type) {
      case 'knowledge':
        blockers.push(`Missing knowledge: ${requirement.id}`);
        break;
      case 'storyFlag':
        blockers.push(`Required story flag inactive: ${requirement.id}`);
        break;
      case 'quest':
        blockers.push(`Quest incomplete: ${requirement.id}`);
        break;
      case 'ability':
        blockers.push(`Ability locked: ${requirement.id}`);
        break;
      case 'equipment':
        blockers.push(`Equipment not owned: ${requirement.id}`);
        break;
      case 'faction': {
        const thresholds = requirement.thresholds ?? {};
        const parts = [];
        if (thresholds.minFame !== undefined) {
          parts.push(`fame ≥ ${thresholds.minFame}`);
        }
        if (thresholds.maxFame !== undefined) {
          parts.push(`fame ≤ ${thresholds.maxFame}`);
        }
        if (thresholds.minInfamy !== undefined) {
          parts.push(`infamy ≥ ${thresholds.minInfamy}`);
        }
        if (thresholds.maxInfamy !== undefined) {
          parts.push(`infamy ≤ ${thresholds.maxInfamy}`);
        }
        blockers.push(
          `Faction reputation mismatch (${requirement.id} requires ${parts.join(', ') || 'adjustment'})`
        );
        break;
      }
      default:
        blockers.push(`Requirement unmet: ${requirement.id}`);
    }
  }

  for (const restriction of evaluation.activeRestrictions) {
    blockers.push(
      restriction.description
        ? `Restriction active: ${restriction.description}`
        : `Restriction active (${restriction.id})`
    );
  }

  return blockers;
}

export default {
  evaluateDistrictAccess,
  isDistrictAccessible,
  describeDistrictBlockers,
};
