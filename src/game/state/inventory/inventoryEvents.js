/**
 * Inventory Event Payload Helpers
 *
 * Centralizes construction of inventory payloads emitted through the EventBus.
 * Ensures consistent tagging and metadata across investigation pickups,
 * quest rewards, and currency transactions so the WorldStateStore inventory
 * slice receives normalized data.
 */

/**
 * Normalize a value for inclusion in a tag.
 * @param {*} value
 * @returns {string|null}
 */
function toTag(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9:_-]/g, '');
}

/**
 * Build an inventory payload from an evidence component.
 * @param {Object} evidence
 * @param {Object} options
 * @param {string} [options.source='investigation']
 * @param {number} [options.timestamp]
 * @returns {Object|null}
 */
export function evidenceToInventoryItem(evidence, options = {}) {
  if (!evidence || typeof evidence.id !== 'string' || !evidence.id) {
    return null;
  }

  const source = options.source || 'investigation';
  const tags = [
    'evidence',
    source ? `source:${toTag(source)}` : null,
    evidence.caseId ? `case:${toTag(evidence.caseId)}` : null,
    evidence.category ? `category:${toTag(evidence.category)}` : null,
    evidence.type ? `type:${toTag(evidence.type)}` : null,
  ].filter(Boolean);

  return {
    id: evidence.id,
    name: evidence.title || evidence.name || evidence.id,
    description: evidence.description || '',
    type: evidence.type ? `Evidence:${evidence.type}` : 'Evidence',
    rarity: 'evidence',
    quantity: 1,
    tags,
    metadata: {
      caseId: evidence.caseId || null,
      evidenceType: evidence.type || null,
      category: evidence.category || null,
      derivedClues: Array.isArray(evidence.derivedClues) ? [...evidence.derivedClues] : [],
      source,
      entityId: options.entityId ?? null,
    },
    lastSeenAt: options.timestamp ?? Date.now(),
  };
}

/**
 * Build an inventory payload from quest reward data.
 * @param {Object|string} reward
 * @param {Object} context
 * @param {string} [context.questId]
 * @param {string} [context.questTitle]
 * @param {string} [context.questType]
 * @param {string} [context.source='quest_reward']
 * @returns {Object|null}
 */
export function questRewardToInventoryItem(reward, context = {}) {
  if (!reward) {
    return null;
  }

  const source = context.source || 'quest_reward';
  const questTags = [
    source ? `source:${toTag(source)}` : null,
    context.questId ? `quest:${toTag(context.questId)}` : null,
    context.questType ? `questType:${toTag(context.questType)}` : null,
  ];

  if (typeof reward === 'string') {
    return {
      id: reward,
      name: reward,
      description: context.questTitle
        ? `Reward from quest "${context.questTitle}"`
        : 'Quest reward item',
      type: 'QuestItem',
      rarity: 'common',
      quantity: 1,
      tags: questTags.filter(Boolean),
      metadata: {
        questId: context.questId || null,
        questTitle: context.questTitle || null,
        questType: context.questType || null,
        source,
      },
      lastSeenAt: Date.now(),
    };
  }

  if (typeof reward !== 'object') {
    return null;
  }

  const rewardId = typeof reward.id === 'string' && reward.id ? reward.id : null;
  if (!rewardId) {
    return null;
  }

  const combinedTags = [
    ...questTags,
    ...(Array.isArray(reward.tags) ? reward.tags.map(toTag).filter(Boolean) : []),
  ].filter(Boolean);

  return {
    id: rewardId,
    name: reward.name || rewardId,
    description: reward.description || (context.questTitle
      ? `Reward from quest "${context.questTitle}"`
      : 'Quest reward item'),
    type: reward.type || 'QuestItem',
    rarity: reward.rarity || 'common',
    quantity: Number.isFinite(reward.quantity) ? Math.max(1, Math.floor(reward.quantity)) : 1,
    tags: combinedTags,
    metadata: {
      ...(reward.metadata || {}),
      questId: context.questId || null,
      questTitle: context.questTitle || null,
      questType: context.questType || null,
      source,
    },
    lastSeenAt: Date.now(),
  };
}

/**
 * Build an inventory update payload for currency deltas.
 * @param {Object} config
 * @param {number} config.amount
 * @param {string} [config.currencyId='credits']
 * @param {string} [config.name]
 * @param {string} [config.description]
 * @param {string} [config.source='economy']
 * @param {Array<string>} [config.tags]
 * @param {Object} [config.metadata]
 * @returns {Object|null}
 */
export function currencyDeltaToInventoryUpdate(config = {}) {
  const amount = Number.isFinite(config.amount) ? Math.trunc(config.amount) : 0;
  if (!amount) {
    return null;
  }

  const currencyId = config.currencyId || 'credits';
  const source = config.source || 'economy';
  const baseTags = [
    'currency',
    `currency:${toTag(currencyId)}`,
    source ? `source:${toTag(source)}` : null,
  ];

  if (Array.isArray(config.tags)) {
    for (const tag of config.tags) {
      const normalized = toTag(tag);
      if (normalized) {
        baseTags.push(normalized);
      }
    }
  }

  return {
    id: currencyId,
    name: config.name || (currencyId === 'credits' ? 'Credits' : currencyId),
    description: config.description || 'Spendable currency used for bribes and vendors.',
    type: 'Currency',
    rarity: 'common',
    quantityDelta: amount,
    tags: baseTags.filter(Boolean),
    metadata: {
      ...(config.metadata || {}),
      source,
      currencyId,
    },
    lastSeenAt: Date.now(),
  };
}

