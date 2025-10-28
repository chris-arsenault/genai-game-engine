import { questSlice } from '../../state/slices/questSlice.js';

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
