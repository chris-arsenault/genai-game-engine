import { questSlice } from '../../state/slices/questSlice.js';

function normalizeBlockedEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const recordedAt = Number.isFinite(entry.recordedAt) ? entry.recordedAt : null;
  const availableValue =
    entry.available === true
      ? true
      : entry.available === false
        ? false
        : null;

  const normalized = {
    questId: entry.questId ?? null,
    questTitle: entry.questTitle ?? null,
    questType: entry.questType ?? null,
    objectiveId: entry.objectiveId ?? entry.id ?? null,
    objectiveTitle: entry.objectiveTitle ?? entry.title ?? null,
    npcId: entry.npcId ?? null,
    npcName: entry.npcName ?? null,
    factionId: entry.factionId ?? null,
    tag: entry.tag ?? null,
    reason: entry.reason ?? null,
    requirement: entry.requirement ?? null,
    requirements: Array.isArray(entry.requirements) ? [...entry.requirements] : null,
    message: entry.message ?? null,
    recordedAt,
    status: typeof entry.status === 'string' ? entry.status : null,
    available: availableValue,
  };

  if (normalized.status === null) {
    normalized.status = normalized.available === true ? 'available' : 'blocked';
  }

  return normalized;
}

function mergeBlockedEntries(primary, fallback) {
  if (!primary && !fallback) {
    return null;
  }

  const merged = {
    questId: primary?.questId ?? fallback?.questId ?? null,
    questTitle: primary?.questTitle ?? fallback?.questTitle ?? null,
    questType: primary?.questType ?? fallback?.questType ?? null,
    objectiveId: primary?.objectiveId ?? fallback?.objectiveId ?? null,
    objectiveTitle: primary?.objectiveTitle ?? fallback?.objectiveTitle ?? null,
    npcId: primary?.npcId ?? fallback?.npcId ?? null,
    npcName: primary?.npcName ?? fallback?.npcName ?? null,
    factionId: primary?.factionId ?? fallback?.factionId ?? null,
    tag: primary?.tag ?? fallback?.tag ?? null,
    reason: primary?.reason ?? fallback?.reason ?? null,
    requirement: primary?.requirement ?? fallback?.requirement ?? null,
    requirements: primary?.requirements ?? fallback?.requirements ?? null,
    message: primary?.message ?? fallback?.message ?? null,
    recordedAt: primary?.recordedAt ?? fallback?.recordedAt ?? null,
    available: null,
    status: primary?.status ?? fallback?.status ?? null,
  };

  if (primary?.available === true || fallback?.available === true) {
    merged.available = true;
  } else if (primary?.available === false || fallback?.available === false) {
    merged.available = false;
  }

  if (merged.status === null) {
    merged.status = merged.available === true ? 'available' : 'blocked';
  }

  return merged;
}

function collectBlockedEntries(questRecord) {
  if (!questRecord || typeof questRecord !== 'object') {
    return [];
  }

  const blocked = questRecord.blockedObjectives;
  if (!blocked || typeof blocked !== 'object') {
    return [];
  }

  return Object.values(blocked)
    .map((entry) =>
      normalizeBlockedEntry({
        ...entry,
        questId: entry.questId ?? questRecord.id ?? null,
        questTitle: entry.questTitle ?? questRecord.title ?? entry.questId ?? null,
        questType: entry.questType ?? questRecord.type ?? null,
      })
    )
    .filter((entry) => entry && entry.objectiveId);
}

function mergeObjectiveDetails(existing, availabilityObjectives, questId) {
  if (!Array.isArray(availabilityObjectives) || availabilityObjectives.length === 0) {
    return existing;
  }

  const results = Array.isArray(existing) ? [...existing] : [];
  const indexById = new Map();

  results.forEach((entry, index) => {
    const key = entry?.id ?? `index-${index}`;
    indexById.set(key, index);
  });

  for (const availabilityEntry of availabilityObjectives) {
    if (!availabilityEntry || typeof availabilityEntry !== 'object') {
      continue;
    }
    if (questId && availabilityEntry.questId && availabilityEntry.questId !== questId) {
      continue;
    }

    const id = availabilityEntry.objectiveId ?? availabilityEntry.id ?? null;
    if (!id) {
      continue;
    }

    if (indexById.has(id)) {
      const existingEntry = results[indexById.get(id)];
      if (availabilityEntry.objectiveTitle && !existingEntry.title) {
        existingEntry.title = availabilityEntry.objectiveTitle;
      }
      if (availabilityEntry.reason && !existingEntry.reason) {
        existingEntry.reason = availabilityEntry.reason;
      }
      if (availabilityEntry.requirement && !existingEntry.requirement) {
        existingEntry.requirement = availabilityEntry.requirement;
      }
      if (availabilityEntry.message && !existingEntry.message) {
        existingEntry.message = availabilityEntry.message;
      }
      if (Number.isFinite(availabilityEntry.recordedAt) && !existingEntry.recordedAt) {
        existingEntry.recordedAt = availabilityEntry.recordedAt;
      }
      continue;
    }

    results.push({
      id,
      title: availabilityEntry.objectiveTitle ?? availabilityEntry.objectiveId ?? id,
      reason: availabilityEntry.reason ?? null,
      requirement: availabilityEntry.requirement ?? null,
      message: availabilityEntry.message ?? null,
      recordedAt: Number.isFinite(availabilityEntry.recordedAt)
        ? availabilityEntry.recordedAt
        : null,
    });
    indexById.set(id, results.length - 1);
  }

  return results;
}

function deriveNpcAvailability(questId, blockedEntries, objectives, availabilityState) {
  if (!Array.isArray(blockedEntries) || blockedEntries.length === 0) {
    return [];
  }

  const grouped = new Map();

  blockedEntries.forEach((entry) => {
    if (!entry) {
      return;
    }
    const key = entry.npcId ?? `objective:${entry.objectiveId ?? entry.questId ?? ''}`;
    const bucket = grouped.get(key) ?? {
      npcId: entry.npcId ?? null,
      npcName: entry.npcName ?? null,
      factionId: entry.factionId ?? null,
      tag: entry.tag ?? null,
      available: entry.available ?? false,
      status: entry.status ?? (entry.available === true ? 'available' : 'blocked'),
      reason: entry.reason ?? null,
      requirement: entry.requirement ?? null,
      message: entry.message ?? null,
      updatedAt: entry.recordedAt ?? null,
      objectives: [],
    };

    bucket.objectives.push({
      id: entry.objectiveId ?? null,
      title: entry.objectiveTitle ?? entry.objectiveId ?? null,
      reason: entry.reason ?? null,
      requirement: entry.requirement ?? null,
      message: entry.message ?? null,
      recordedAt: entry.recordedAt ?? null,
    });

    if (!bucket.reason && entry.reason) {
      bucket.reason = entry.reason;
    }
    if (!bucket.requirement && entry.requirement) {
      bucket.requirement = entry.requirement;
    }
    if (!bucket.message && entry.message) {
      bucket.message = entry.message;
    }
    if (!bucket.factionId && entry.factionId) {
      bucket.factionId = entry.factionId;
    }
    if (!bucket.tag && entry.tag) {
      bucket.tag = entry.tag;
    }
    if (!bucket.updatedAt && entry.recordedAt) {
      bucket.updatedAt = entry.recordedAt;
    }
    if (entry.available === false) {
      bucket.available = false;
      bucket.status = 'blocked';
    }
    grouped.set(key, bucket);
  });

  const availabilityRecords =
    availabilityState && typeof availabilityState === 'object'
      ? Object.values(availabilityState)
      : [];

  for (const record of availabilityRecords) {
    if (!record || typeof record !== 'object' || !record.npcId) {
      continue;
    }

    if (!grouped.has(record.npcId)) {
      const hasQuestMatch = Array.isArray(record.objectives)
        ? record.objectives.some((entry) => entry?.questId === questId)
        : false;
      if (!hasQuestMatch) {
        continue;
      }
      grouped.set(record.npcId, {
        npcId: record.npcId,
        npcName: record.npcName ?? null,
        factionId: record.factionId ?? null,
        tag: record.tag ?? null,
        available: Boolean(record.available),
        status: record.available ? 'available' : 'blocked',
        reason: record.reason ?? null,
        requirement: null,
        message: null,
        updatedAt: record.updatedAt ?? null,
        objectives: [],
      });
    }

    const bucket = grouped.get(record.npcId);
    if (!bucket) {
      continue;
    }

    if (record.npcName && !bucket.npcName) {
      bucket.npcName = record.npcName;
    }
    if (record.factionId) {
      bucket.factionId = record.factionId;
    }
    if (record.tag && !bucket.tag) {
      bucket.tag = record.tag;
    }
    if (record.reason && !bucket.reason) {
      bucket.reason = record.reason;
    }
    if (record.updatedAt) {
      bucket.updatedAt = bucket.updatedAt
        ? Math.max(bucket.updatedAt, record.updatedAt)
        : record.updatedAt;
    }

    const recordAvailable = Boolean(record.available);
    if (recordAvailable === false) {
      bucket.available = false;
      bucket.status = 'blocked';
    } else if (recordAvailable === true && bucket.available !== false) {
      bucket.available = true;
      bucket.status = 'available';
    }

    if (Array.isArray(record.objectives) && record.objectives.length > 0) {
      bucket.objectives = mergeObjectiveDetails(bucket.objectives, record.objectives, questId);
    }
  }

  if (Array.isArray(objectives)) {
    const objectiveTitleMap = new Map();
    objectives.forEach((objective) => {
      if (!objective) {
        return;
      }
      objectiveTitleMap.set(objective.id, objective.title ?? objective.id);
    });

    for (const bucket of grouped.values()) {
      bucket.objectives = bucket.objectives.map((objective) => {
        if (!objective) {
          return objective;
        }
        const title = objective.title ?? objectiveTitleMap.get(objective.id) ?? objective.id;
        return {
          ...objective,
          title,
        };
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? 1 : -1;
    }
    const timeA = Number.isFinite(a.updatedAt) ? a.updatedAt : 0;
    const timeB = Number.isFinite(b.updatedAt) ? b.updatedAt : 0;
    return timeB - timeA;
  });
}

/**
 * Retrieve quest record from world state.
 * @param {WorldStateStore} worldStateStore
 * @param {string} questId
 * @returns {Object|null}
 */
function getQuestRecord(worldStateStore, questId) {
  if (!worldStateStore || !questId) {
    return null;
  }

  return worldStateStore.select(questSlice.selectors.selectQuestById, questId) ?? null;
}

/**
 * Retrieve quest objective states from world state.
 * @param {WorldStateStore} worldStateStore
 * @param {string} questId
 * @returns {Array<Object>}
 */
function getQuestObjectives(worldStateStore, questId) {
  if (!worldStateStore || !questId) {
    return [];
  }

  return worldStateStore.select(questSlice.selectors.selectQuestObjectives, questId) ?? [];
}

/**
 * Build a normalized quest view model combining store state and quest definition.
 * @param {WorldStateStore} worldStateStore
 * @param {QuestManager} questManager
 * @param {string} questId
 * @param {Object} [questRecordOverride]
 * @returns {Object|null}
 */
export function buildQuestViewModel(worldStateStore, questManager, questId, questRecordOverride) {
  const questRecord = questRecordOverride ?? getQuestRecord(worldStateStore, questId);
  if (!questRecord) {
    return null;
  }

  const questDefinition = questManager?.getQuest?.(questId) ?? null;
  const objectiveStates = getQuestObjectives(worldStateStore, questId);
  const questBlockedEntries = collectBlockedEntries(questRecord);
  const blockedEntryMap = new Map(
    questBlockedEntries.map((entry) => [entry.objectiveId, entry])
  );
  const availabilityState = worldStateStore?.select
    ? worldStateStore.select(questSlice.selectors.selectNpcAvailabilityState)
    : null;

  const definitionObjectiveMap = new Map(
    (questDefinition?.objectives ?? []).map((objective) => [objective.id, objective])
  );

  const objectives = objectiveStates.map((objectiveState) => {
    const definition = definitionObjectiveMap.get(objectiveState.id);
    return {
      id: objectiveState.id,
      title: definition?.title ?? objectiveState.title ?? objectiveState.id,
      description: definition?.description ?? objectiveState.description ?? '',
      optional: Boolean(definition?.optional ?? objectiveState.optional),
      hidden: Boolean(definition?.hidden ?? objectiveState.hidden),
      status: objectiveState.status ?? 'pending',
      progress: objectiveState.progress ?? 0,
      target: objectiveState.target ?? definition?.trigger?.count ?? 1,
      metadata: {
        trigger: definition?.trigger ?? objectiveState.metadata?.trigger ?? null,
        tags: definition?.tags ?? objectiveState.metadata?.tags ?? [],
      },
      blocked: mergeBlockedEntries(
        blockedEntryMap.get(objectiveState.id),
        objectiveState.blocked
          ? normalizeBlockedEntry({
              ...objectiveState.blocked,
              questId: questRecord.id ?? questId,
              questTitle: questRecord.title ?? questDefinition?.title ?? questId,
              questType: questRecord.type ?? questDefinition?.type ?? null,
              objectiveId: objectiveState.id,
              objectiveTitle: definition?.title ?? objectiveState.title ?? objectiveState.id,
            })
          : null
      ),
    };
  });

  const questTitle = questRecord.title ?? questDefinition?.title ?? questId;
  const questDescription = questRecord.description ?? questDefinition?.description ?? '';

  const metadata = {
    ...(questDefinition?.metadata ?? {}),
    ...(questRecord.metadata ?? {}),
  };

  if (questDefinition?.act && !metadata.act) {
    metadata.act = questDefinition.act;
  }

  return {
    id: questRecord.id,
    title: questTitle,
    type: questRecord.type ?? questDefinition?.type ?? 'side',
    status: questRecord.status ?? 'not_started',
    description: questDescription,
    objectives,
    lastActionAt: questRecord.lastActionAt ?? null,
    rewards: questRecord.rewards ?? questDefinition?.rewards ?? null,
    metadata,
    act: questRecord.act ?? questDefinition?.act ?? metadata.act ?? null,
    blockedObjectives: questBlockedEntries,
    npcAvailability: deriveNpcAvailability(
      questRecord.id,
      questBlockedEntries,
      objectives,
      availabilityState
    ),
  };
}

/**
 * Build quest view models for a specific status category.
 * @param {WorldStateStore} worldStateStore
 * @param {QuestManager} questManager
 * @param {'active'|'completed'|'failed'} status
 * @returns {Array<Object>}
 */
export function buildQuestListByStatus(worldStateStore, questManager, status) {
  if (!worldStateStore) {
    return [];
  }

  const selectorMap = {
    active: questSlice.selectors.selectActiveQuests,
    completed: questSlice.selectors.selectCompletedQuests,
    failed: questSlice.selectors.selectFailedQuests,
  };

  const selector = selectorMap[status];
  if (!selector) {
    return [];
  }

  const questRecords = worldStateStore.select(selector) ?? [];
  return questRecords
    .map((record) => buildQuestViewModel(worldStateStore, questManager, record.id, record))
    .filter(Boolean);
}

/**
 * Calculate quest progress summary.
 * @param {Object} questViewModel
 * @returns {{completed: number, total: number}}
 */
export function summarizeQuestProgress(questViewModel) {
  if (!questViewModel || !Array.isArray(questViewModel.objectives)) {
    return { completed: 0, total: 0 };
  }

  const total = questViewModel.objectives.filter((obj) => !obj.hidden).length;
  const completed = questViewModel.objectives.filter(
    (obj) => !obj.hidden && obj.status === 'completed'
  ).length;

  return { completed, total };
}

/**
 * Return active objectives (non-hidden, not completed) for HUD display.
 * @param {Object} questViewModel
 * @returns {Array<Object>}
 */
export function getActiveObjectives(questViewModel) {
  if (!questViewModel || !Array.isArray(questViewModel.objectives)) {
    return [];
  }

  return questViewModel.objectives.filter(
    (objective) => !objective.hidden && objective.status !== 'completed'
  );
}
