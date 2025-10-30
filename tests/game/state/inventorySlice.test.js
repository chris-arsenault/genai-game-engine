import { inventorySlice } from '../../../src/game/state/slices/inventorySlice.js';

describe('inventorySlice', () => {
  it('returns fresh state via getInitialState', () => {
    const stateA = inventorySlice.getInitialState();
    const stateB = inventorySlice.getInitialState();

    expect(stateA).not.toBe(stateB);
    expect(stateA.items).toEqual([]);
    expect(stateA.equipped).toEqual({});
  });

  it('adds and updates inventory items', () => {
    const baseState = inventorySlice.getInitialState();
    const added = inventorySlice.reducer(baseState, {
      type: 'INVENTORY_ITEM_ADDED',
      timestamp: 1234,
      payload: {
        id: 'intel_cipher_shard',
        name: 'Cipher Memory Shard',
        rarity: 'epic',
        quantity: 1,
        tags: ['evidence'],
      },
    });

    expect(added.items).toHaveLength(1);
    expect(added.items[0]).toMatchObject({
      id: 'intel_cipher_shard',
      rarity: 'epic',
      quantity: 1,
    });

    const updated = inventorySlice.reducer(added, {
      type: 'INVENTORY_ITEM_UPDATED',
      timestamp: 2234,
      payload: {
        id: 'intel_cipher_shard',
        quantity: 2,
        metadata: { priority: 5 },
      },
    });

    expect(updated.items[0].quantity).toBe(2);
    expect(updated.items[0].metadata.priority).toBe(5);
    expect(updated.lastUpdatedAt).toBe(2234);
  });

  it('equips and removes inventory items', () => {
    const baseState = inventorySlice.getInitialState();
    const added = inventorySlice.reducer(baseState, {
      type: 'INVENTORY_ITEM_ADDED',
      payload: { id: 'gadget_siphon_glove' },
    });

    const equipped = inventorySlice.reducer(added, {
      type: 'INVENTORY_EQUIPPED',
      payload: { slot: 'gadget', itemId: 'gadget_siphon_glove' },
    });

    expect(equipped.equipped.gadget).toBe('gadget_siphon_glove');

    const cleared = inventorySlice.reducer(equipped, {
      type: 'INVENTORY_ITEM_REMOVED',
      payload: { id: 'gadget_siphon_glove' },
    });

    expect(cleared.items).toHaveLength(0);
    expect(cleared.equipped.gadget).toBeUndefined();
  });

  it('hydrates from snapshot payload', () => {
    const hydrated = inventorySlice.reducer(undefined, {
      type: 'WORLDSTATE_HYDRATE',
      payload: {
        inventory: {
          items: [
            {
              id: 'evidence_polaroid',
              name: 'Polaroid',
              rarity: 'evidence',
              quantity: 1,
            },
          ],
          equipped: {
            focus: 'evidence_polaroid',
          },
          lastUpdatedAt: 999,
          selectedItemId: 'evidence_polaroid',
          selectedIndex: 0,
          lastSelectionAt: 1000,
          selectionSource: 'inventoryOverlay',
        },
      },
    });

    expect(hydrated.items).toHaveLength(1);
    expect(hydrated.equipped.focus).toBe('evidence_polaroid');
    expect(hydrated.lastUpdatedAt).toBe(999);
    expect(hydrated.selectedItemId).toBe('evidence_polaroid');
    expect(hydrated.selectedIndex).toBe(0);
    expect(hydrated.lastSelectionAt).toBe(1000);
    expect(hydrated.selectionSource).toBe('inventoryOverlay');

    const snapshot = inventorySlice.serialize(hydrated);
    expect(snapshot.items[0].id).toBe('evidence_polaroid');
    expect(snapshot.selectedItemId).toBe('evidence_polaroid');
    expect(snapshot.selectedIndex).toBe(0);
    expect(snapshot.selectionSource).toBe('inventoryOverlay');
  });

  it('applies quantity deltas and removes items when quantity reaches zero', () => {
    const baseState = inventorySlice.getInitialState();

    const afterCreditGain = inventorySlice.reducer(baseState, {
      type: 'INVENTORY_ITEM_UPDATED',
      timestamp: 1000,
      payload: {
        id: 'credits',
        name: 'Credits',
        type: 'Currency',
        quantityDelta: 500,
        tags: ['currency'],
      },
    });

    expect(afterCreditGain.items).toHaveLength(1);
    expect(afterCreditGain.items[0].quantity).toBe(500);

    const afterPurchase = inventorySlice.reducer(afterCreditGain, {
      type: 'INVENTORY_ITEM_UPDATED',
      timestamp: 1100,
      payload: {
        id: 'credits',
        quantityDelta: -125,
      },
    });

    expect(afterPurchase.items[0].quantity).toBe(375);

    const afterFullSpend = inventorySlice.reducer(afterPurchase, {
      type: 'INVENTORY_ITEM_UPDATED',
      timestamp: 1200,
      payload: {
        id: 'credits',
        quantityDelta: -400,
      },
    });

    expect(afterFullSpend.items).toHaveLength(0);
  });

  it('records inventory selection changes', () => {
    const baseState = inventorySlice.getInitialState();
    const withItem = inventorySlice.reducer(baseState, {
      type: 'INVENTORY_ITEM_ADDED',
      payload: {
        id: 'tool_decoder_ring',
        name: 'Decoder Ring',
      },
    });

    const selectionChanged = inventorySlice.reducer(withItem, {
      type: 'INVENTORY_SELECTION_CHANGED',
      timestamp: 2000,
      payload: {
        itemId: 'tool_decoder_ring',
        index: 0,
        source: 'inventoryOverlay',
      },
    });

    expect(selectionChanged.selectedItemId).toBe('tool_decoder_ring');
    expect(selectionChanged.selectedIndex).toBe(0);
    expect(selectionChanged.lastSelectionAt).toBe(2000);
    expect(selectionChanged.selectionSource).toBe('inventoryOverlay');

    const redundant = inventorySlice.reducer(selectionChanged, {
      type: 'INVENTORY_SELECTION_CHANGED',
      timestamp: 2100,
      payload: {
        itemId: 'tool_decoder_ring',
        index: 0,
        source: 'inventoryOverlay',
      },
    });

    // No change because selection identical
    expect(redundant).toBe(selectionChanged);

    const selectionInfo = inventorySlice.selectors.getSelectionInfo(selectionChanged);
    expect(selectionInfo.itemId).toBe('tool_decoder_ring');
    expect(selectionInfo.index).toBe(0);
    expect(selectionInfo.lastSelectionAt).toBe(2000);
  });
});
