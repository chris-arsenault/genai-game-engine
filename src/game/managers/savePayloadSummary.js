/**
 * Builds a QA-friendly summary of the current save payload schema so
 * downstream telemetry and validation teams can confirm structural changes.
 */

function summarizeObjectKeys(value) {
  if (!value || typeof value !== 'object') {
    return {
      keys: [],
      count: 0,
    };
  }

  const keys = Object.keys(value);
  return {
    keys,
    count: keys.length,
  };
}

function summarizeQuests(quests) {
  return {
    keys: Object.keys(quests ?? {}),
    activeCount: Array.isArray(quests?.active) ? quests.active.length : 0,
    completedCount: Array.isArray(quests?.completed) ? quests.completed.length : 0,
  };
}

function summarizeFactions(factionData) {
  const reputations = factionData?.reputation ?? {};
  const factionIds = Object.keys(reputations);
  return {
    factionCount: factionIds.length,
    factionIds,
    timestamp: factionData?.timestamp ?? null,
  };
}

function summarizeTutorial(tutorial) {
  return {
    completed: Boolean(tutorial?.completed ?? tutorial?.tutorialComplete),
    totalSteps: tutorial?.totalSteps ?? 0,
    currentStep: tutorial?.currentStep ?? null,
  };
}

function summarizeInventory(inventory) {
  const items = Array.isArray(inventory?.items) ? inventory.items : [];
  const equipped = inventory?.equipped ?? {};
  return {
    itemCount: items.length,
    equippedSlots: Object.keys(equipped),
    lastUpdatedAt: inventory?.lastUpdatedAt ?? null,
    sampleItemKeys: items.length ? Object.keys(items[0]) : [],
  };
}

function summarizeDialogue(dialogue) {
  return {
    transcriptEnabled: Boolean(dialogue?.transcriptEnabled),
    historyBuckets: Object.keys(dialogue?.historyByNpc ?? {}),
    completedBuckets: Object.keys(dialogue?.completedByNpc ?? {}),
  };
}

function summarizeEntityMap(entityMap) {
  if (!entityMap || typeof entityMap !== 'object') {
    return {
      count: 0,
      keys: [],
    };
  }

  const keys = Object.keys(entityMap);
  return {
    count: keys.length,
    keys,
  };
}

/**
 * Build a summary of the active save payload.
 * @param {SaveManager} saveManager
 * @param {Object} [options]
 * @param {string} [options.slotName='summary-slot']
 * @param {boolean} [options.cleanupSlot=true]
 * @returns {Object}
 */
export function buildSavePayloadSummary(saveManager, options = {}) {
  if (!saveManager || typeof saveManager.saveGame !== 'function') {
    throw new Error('buildSavePayloadSummary requires a SaveManager instance');
  }

  const slotName = typeof options.slotName === 'string' && options.slotName.length
    ? options.slotName
    : 'summary-slot';
  const cleanupSlot = options.cleanupSlot !== false;

  const storage = saveManager.storage;
  if (!storage || typeof storage.getItem !== 'function') {
    throw new Error('buildSavePayloadSummary requires SaveManager storage access');
  }

  const saved = saveManager.saveGame(slotName);
  if (!saved) {
    throw new Error('Failed to write save payload summary snapshot');
  }

  const storageKey = `${saveManager.config.storageKeyPrefix}${slotName}`;
  const rawSave = storage.getItem(storageKey);
  if (!rawSave) {
    throw new Error('Unable to read saved payload from storage');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawSave);
  } catch (error) {
    throw new Error(`Failed to parse saved payload: ${error.message}`);
  }

  const gameData = parsed?.gameData ?? {};
  const summary = {
    slot: slotName,
    version: parsed?.version ?? saveManager.config.version,
    timestamp: parsed?.timestamp ?? Date.now(),
    playtime: parsed?.playtime ?? 0,
    meta: parsed?.meta ?? {},
    sections: {
      storyFlags: summarizeObjectKeys(gameData.storyFlags),
      quests: summarizeQuests(gameData.quests),
      factions: summarizeFactions(gameData.factions),
      tutorial: summarizeTutorial(gameData.tutorial),
      inventory: summarizeInventory(gameData.inventory),
      dialogue: summarizeDialogue(gameData.dialogue),
      district: summarizeEntityMap(gameData.district?.byId ?? gameData.district),
      npc: summarizeEntityMap(gameData.npc?.byId ?? gameData.npc),
    },
  };

  if (cleanupSlot && typeof saveManager.deleteSave === 'function') {
    saveManager.deleteSave(slotName);
  }

  return summary;
}
