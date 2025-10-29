/**
 * QuestTriggerRegistry
 *
 * Centralised record of quest trigger metadata used by Act 1 scenes. Tracks
 * migration coverage so we can retire legacy `InteractionZone` flows without
 * losing visibility on outstanding work.
 */
const definitions = new Map(); // triggerId -> definition
const questIndex = new Map(); // questId -> Set<triggerId>
const migrated = new Set(); // triggerIds that have been migrated to new schema

export const QuestTriggerRegistry = {
  /**
   * Register a single trigger definition.
   * @param {object} definition
   * @returns {object} Normalised definition
   */
  registerDefinition(definition) {
    const normalised = normaliseDefinition(definition);
    definitions.set(normalised.id, normalised);

    if (!questIndex.has(normalised.questId)) {
      questIndex.set(normalised.questId, new Set());
    }
    questIndex.get(normalised.questId).add(normalised.id);
    if (normalised.migrated) {
      migrated.add(normalised.id);
    } else {
      migrated.delete(normalised.id);
    }
    return cloneDefinition(normalised);
  },

  /**
   * Register many definitions at once.
   * @param {Array<object>} definitionList
   */
  registerDefinitions(definitionList = []) {
    for (const def of definitionList) {
      this.registerDefinition(def);
    }
  },

  /**
   * Retrieve a trigger definition.
   * @param {string} triggerId
   * @returns {object|null}
   */
  getTriggerDefinition(triggerId) {
    if (!triggerId || !definitions.has(triggerId)) {
      return null;
    }
    return cloneDefinition(definitions.get(triggerId));
  },

  /**
   * List trigger definitions for a quest.
   * @param {string} questId
   * @returns {Array<object>}
   */
  listByQuest(questId) {
    if (!questId || !questIndex.has(questId)) {
      return [];
    }
    return Array.from(questIndex.get(questId)).map((id) => cloneDefinition(definitions.get(id)));
  },

  /**
   * Mark trigger as migrated.
   * @param {string} triggerId
   */
  markMigrated(triggerId) {
    if (!triggerId || !definitions.has(triggerId)) {
      return false;
    }
    migrated.add(triggerId);
    const current = definitions.get(triggerId);
    definitions.set(triggerId, { ...current, migrated: true });
    return true;
  },

  /**
   * List definitions that still need migration.
   * @returns {Array<object>}
   */
  listOutstandingMigrations() {
    const outstanding = [];
    for (const [id, def] of definitions.entries()) {
      if (!migrated.has(id)) {
        outstanding.push(cloneDefinition(def));
      }
    }
    return outstanding;
  },

  /**
   * Reset registry (primarily for testing). Optionally seed new definitions.
   * @param {Array<object>} [seed=[]]
   */
  reset(seed = []) {
    definitions.clear();
    questIndex.clear();
    migrated.clear();
    if (Array.isArray(seed) && seed.length > 0) {
      this.registerDefinitions(seed);
    }
  },
};

function normaliseDefinition(definition = {}) {
  const id = sanitiseId(
    definition.id ??
      definition.triggerId ??
      definition.areaId ??
      definition.objectiveId ??
      ''
  );
  if (!id) {
    throw new Error('[QuestTriggerRegistry] Definition requires an id or areaId');
  }

  const questId = sanitiseId(definition.questId ?? definition.quest?.id ?? '');
  if (!questId) {
    throw new Error('[QuestTriggerRegistry] Definition requires a questId');
  }

  const objectiveId = sanitiseId(
    definition.objectiveId ?? definition.objective?.id ?? ''
  );
  if (!objectiveId) {
    throw new Error('[QuestTriggerRegistry] Definition requires an objectiveId');
  }

  const areaId = sanitiseId(definition.areaId ?? id);

  return {
    id,
    questId,
    objectiveId,
    areaId,
    radius: normaliseNumber(definition.radius, 96),
    once: definition.once ?? definition.oneShot ?? true,
    prompt: typeof definition.prompt === 'string' ? definition.prompt : null,
    triggerType: definition.triggerType || 'quest_area',
    metadata: {
      ...(definition.metadata || {}),
    },
    migrated: Boolean(definition.migrated),
  };
}

function cloneDefinition(definition) {
  return {
    ...definition,
    metadata: {
      ...(definition.metadata || {}),
    },
  };
}

function sanitiseId(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normaliseNumber(value, fallback) {
  if (Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

