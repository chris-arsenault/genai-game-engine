/**
 * Vendor economy helpers
 *
 * Utilities to normalize vendor transactions and emit EventBus payloads that
 * integrate with the inventory event bridge inside Game.js.
 */

const DEFAULT_VENDOR_NAME = 'vendor';

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
}

function normalizeItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const id = sanitizeString(rawItem.id);
  if (!id) {
    return null;
  }

  const quantity = Number.isFinite(rawItem.quantity)
    ? Math.max(1, Math.floor(rawItem.quantity))
    : 1;

  const tags = Array.isArray(rawItem.tags)
    ? rawItem.tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : null))
        .filter(Boolean)
    : [];

  const metadata = rawItem.metadata && typeof rawItem.metadata === 'object'
    ? { ...rawItem.metadata }
    : {};

  return {
    id,
    name: sanitizeString(rawItem.name) || id,
    description: sanitizeString(rawItem.description),
    type: sanitizeString(rawItem.type) || 'VendorItem',
    rarity: sanitizeString(rawItem.rarity) || 'common',
    quantity,
    tags,
    metadata,
  };
}

function normalizeItems(transaction) {
  const items = [];

  if (Array.isArray(transaction.items)) {
    for (const raw of transaction.items) {
      const normalized = normalizeItem(raw);
      if (normalized) {
        items.push(normalized);
      }
    }
  }

  if (items.length === 0 && transaction.item) {
    const single = normalizeItem(transaction.item);
    if (single) {
      items.push(single);
    }
  }

  return items;
}

function normalizeCost(rawCost) {
  if (!rawCost || typeof rawCost !== 'object') {
    return null;
  }

  const credits = Number.isFinite(rawCost.credits) ? Math.trunc(rawCost.credits) : 0;
  const currencies = {};

  if (credits !== 0) {
    currencies.credits = credits;
  }

  if (rawCost.currencies && typeof rawCost.currencies === 'object') {
    for (const [currencyId, value] of Object.entries(rawCost.currencies)) {
      if (Number.isFinite(value) && value !== 0) {
        currencies[currencyId] = Math.trunc(value);
      }
    }
  }

  if (!Object.keys(currencies).length) {
    return null;
  }

  return currencies;
}

function buildVendorMetadata(transaction, fallbackVendorId, fallbackVendorName, fallbackFaction) {
  const metadata = transaction.metadata && typeof transaction.metadata === 'object'
    ? { ...transaction.metadata }
    : {};

  if (!metadata.vendorId && fallbackVendorId) {
    metadata.vendorId = fallbackVendorId;
  }

  if (!metadata.vendorName && fallbackVendorName) {
    metadata.vendorName = fallbackVendorName;
  }

  if (!metadata.vendorFaction && fallbackFaction) {
    metadata.vendorFaction = fallbackFaction;
  }

  return metadata;
}

/**
 * Emit a normalized economy:purchase:completed event.
 * @param {EventBus} eventBus
 * @param {Object} transaction
 * @returns {Object} Payload emitted to the bus
 */
export function emitVendorPurchaseEvent(eventBus, transaction = {}) {
  if (!eventBus || typeof eventBus.emit !== 'function') {
    throw new Error('emitVendorPurchaseEvent requires an EventBus with emit()');
  }

  const vendorId = sanitizeString(transaction.vendorId) || null;
  const vendorName =
    sanitizeString(transaction.vendorName) || vendorId || DEFAULT_VENDOR_NAME;
  const vendorFaction = sanitizeString(transaction.vendorFaction) || null;
  const items = normalizeItems(transaction);
  const cost = normalizeCost(transaction.cost);
  const transactionId = sanitizeString(transaction.transactionId) || null;
  const timestamp = Number.isFinite(transaction.timestamp)
    ? Math.trunc(transaction.timestamp)
    : Date.now();
  const context =
    transaction.context && typeof transaction.context === 'object'
      ? { ...transaction.context }
      : {};

  const payload = {
    vendorId,
    vendorName,
    vendorFaction,
    items,
    item: items.length === 1 ? items[0] : undefined,
    cost: null,
    metadata: buildVendorMetadata(transaction, vendorId, vendorName, vendorFaction),
    context,
    transactionId,
    timestamp,
  };

  if (cost) {
    const normalizedCost = {};
    if (typeof cost.credits === 'number') {
      normalizedCost.credits = cost.credits;
    }

    const extraCurrencies = Object.entries(cost)
      .filter(([key]) => key !== 'credits')
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    if (Object.keys(extraCurrencies).length) {
      normalizedCost.currencies = extraCurrencies;
    }

    payload.cost = normalizedCost;
  }

  eventBus.emit('economy:purchase:completed', payload);
  return payload;
}

export default emitVendorPurchaseEvent;
