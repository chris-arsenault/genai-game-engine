/**
 * Build debug summary data for quest slice.
 * @param {Object} questState
 * @returns {{stats: {total:number, active:number, completed:number, failed:number}, entries: Array}}
 */
export function buildQuestDebugSummary(questState) {
  const stats = {
    total: 0,
    active: 0,
    completed: 0,
    failed: 0,
  };

  if (!questState || typeof questState !== 'object') {
    return { stats, entries: [] };
  }

  const entries = [];
  const byId = questState.byId || {};
  const activeIds = Array.isArray(questState.activeIds) ? questState.activeIds : [];
  const completedIds = Array.isArray(questState.completedIds) ? questState.completedIds : [];
  const failedIds = Array.isArray(questState.failedIds) ? questState.failedIds : [];

  stats.total = Object.keys(byId).length;
  stats.active = activeIds.length;
  stats.completed = completedIds.length;
  stats.failed = failedIds.length;

  const getCurrentObjective = (quest) => {
    if (!quest || !Array.isArray(quest.objectivesOrder)) {
      return null;
    }
    for (const objectiveId of quest.objectivesOrder) {
      const objective = quest.objectives?.[objectiveId];
      if (!objective) {
        continue;
      }
      if (objective.status === 'completed') {
        continue;
      }
      return objective;
    }
    return null;
  };

  for (const questId of activeIds) {
    const quest = byId[questId];
    if (!quest) {
      continue;
    }
    const currentObjective = getCurrentObjective(quest);
    let summary = 'Awaiting next objective';
    if (currentObjective) {
      const progress = Number.isFinite(currentObjective.progress) ? currentObjective.progress : 0;
      const target = Number.isFinite(currentObjective.target) && currentObjective.target > 0
        ? currentObjective.target
        : 1;
      summary = `${currentObjective.title ?? currentObjective.id}: ${progress}/${target}`;
    }
    entries.push({
      questId,
      title: quest.title ?? questId,
      status: quest.status ?? 'active',
      summary,
      updatedAt: quest.updatedAt ?? quest.lastActionAt ?? quest.startedAt ?? null,
      tone: 'active',
    });
    if (entries.length >= 3) {
      break;
    }
  }

  const recentCompleted = completedIds.slice(-2).reverse();
  for (const questId of recentCompleted) {
    const quest = byId[questId];
    if (!quest) {
      continue;
    }
    entries.push({
      questId,
      title: quest.title ?? questId,
      status: 'completed',
      summary: 'Quest completed',
      updatedAt: quest.completedAt ?? quest.updatedAt ?? null,
      tone: 'completed',
    });
  }

  const recentFailed = failedIds.slice(-1);
  for (const questId of recentFailed) {
    const quest = byId[questId];
    if (!quest) {
      continue;
    }
    entries.push({
      questId,
      title: quest.title ?? questId,
      status: 'failed',
      summary: quest.failureReason ?? 'Quest failed',
      updatedAt: quest.failedAt ?? quest.updatedAt ?? null,
      tone: 'failed',
    });
  }

  return { stats, entries };
}

/**
 * Build debug summary data for story slice.
 * @param {Object} storyState
 * @returns {{stats: {total:number}, entries: Array}}
 */
export function buildStoryDebugSummary(storyState) {
  const stats = {
    total: 0,
  };

  if (!storyState || typeof storyState !== 'object' || !storyState.flags) {
    return { stats, entries: [] };
  }

  const entries = Object.entries(storyState.flags)
    .map(([flagId, record]) => ({
      flagId,
      value: record?.value ?? null,
      updatedAt: record?.updatedAt ?? null,
      tone: record?.value ? 'flag-active' : 'flag-inactive',
    }))
    .sort((a, b) => {
      const timeA = Number.isFinite(a.updatedAt) ? a.updatedAt : 0;
      const timeB = Number.isFinite(b.updatedAt) ? b.updatedAt : 0;
      return timeB - timeA;
    })
    .slice(0, 6);

  stats.total = Object.keys(storyState.flags).length;

  return { stats, entries };
}

/**
 * Build debug summary data for quest-linked NPC availability.
 * @param {Object} questState
 * @returns {{stats: {tracked:number, unavailable:number, blockedObjectives:number}, entries: Array, history: Array}}
 */
export function buildNpcAvailabilityDebugSummary(questState) {
  const stats = {
    tracked: 0,
    unavailable: 0,
    blockedObjectives: 0,
  };

  if (!questState || typeof questState !== 'object') {
    return { stats, entries: [], history: [] };
  }

  const availability = questState.npcAvailability || {};
  const records = Object.values(availability)
    .map((record) => {
      const objectives = Array.isArray(record?.objectives)
        ? record.objectives.map((objective) => ({
            questId: objective?.questId ?? null,
            questTitle: objective?.questTitle ?? null,
            questType: objective?.questType ?? null,
            objectiveId: objective?.objectiveId ?? null,
            objectiveTitle: objective?.objectiveTitle ?? null,
            reason: objective?.reason ?? null,
            requirement: objective?.requirement ?? null,
            message: objective?.message ?? null,
            recordedAt: objective?.recordedAt ?? null,
          }))
        : [];

      return {
        npcId: record?.npcId ?? null,
        npcName: record?.npcName ?? null,
        factionId: record?.factionId ?? null,
        tag: record?.tag ?? null,
        entityId: record?.entityId ?? null,
        available: Boolean(record?.available),
        updatedAt: record?.updatedAt ?? null,
        reason: record?.reason ?? null,
        objectives,
      };
    })
    .sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? 1 : -1;
      }
      const timeA = a.updatedAt ?? 0;
      const timeB = b.updatedAt ?? 0;
      return timeB - timeA;
    });

  stats.tracked = records.length;
  stats.unavailable = records.filter((record) => record.available === false).length;
  stats.blockedObjectives = records.reduce(
    (total, record) => total + (Array.isArray(record.objectives) ? record.objectives.length : 0),
    0
  );

  const history = Array.isArray(questState.npcAvailabilityHistory)
    ? questState.npcAvailabilityHistory.map((entry) => ({
        npcId: entry?.npcId ?? null,
        npcName: entry?.npcName ?? null,
        factionId: entry?.factionId ?? null,
        available: Boolean(entry?.available),
        recordedAt: entry?.recordedAt ?? null,
        reason: entry?.reason ?? null,
        tag: entry?.tag ?? null,
        objectiveCount: Number.isFinite(entry?.objectiveCount) ? entry.objectiveCount : null,
      }))
    : [];

  return { stats, entries: records, history };
}
