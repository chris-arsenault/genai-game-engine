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
        },
      },
    });

    expect(hydrated.items).toHaveLength(1);
    expect(hydrated.equipped.focus).toBe('evidence_polaroid');
    expect(hydrated.lastUpdatedAt).toBe(999);

    const snapshot = inventorySlice.serialize(hydrated);
    expect(snapshot.items[0].id).toBe('evidence_polaroid');
  });
});

