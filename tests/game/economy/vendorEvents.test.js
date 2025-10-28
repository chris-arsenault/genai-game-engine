import { EventBus } from '../../../src/engine/events/EventBus.js';
import { emitVendorPurchaseEvent } from '../../../src/game/economy/vendorEvents.js';

describe('emitVendorPurchaseEvent', () => {
  it('emits normalized economy purchase payload', () => {
    const eventBus = new EventBus();
    const emitSpy = jest.spyOn(eventBus, 'emit');

    const payload = emitVendorPurchaseEvent(eventBus, {
      vendorId: 'test_vendor',
      vendorName: 'Test Vendor',
      vendorFaction: 'independents',
      cost: { credits: 75, currencies: { chits: 3 } },
      items: [
        { id: 'item_one', name: 'Item One', quantity: 2, tags: ['reward', ' item '] },
        { id: null },
      ],
      metadata: { encounterId: 'dialogue_test' },
    });

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('economy:purchase:completed', payload);

    expect(payload.vendorId).toBe('test_vendor');
    expect(payload.vendorName).toBe('Test Vendor');
    expect(payload.vendorFaction).toBe('independents');
    expect(payload.transactionId).toBeNull();
    expect(payload.timestamp).toBeGreaterThan(0);

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      id: 'item_one',
      name: 'Item One',
      quantity: 2,
      tags: ['reward', 'item'],
    });
    expect(payload.item).toBe(payload.items[0]);

    expect(payload.cost).toMatchObject({
      credits: 75,
      currencies: { chits: 3 },
    });

    expect(payload.metadata).toMatchObject({
      encounterId: 'dialogue_test',
      vendorId: 'test_vendor',
      vendorName: 'Test Vendor',
      vendorFaction: 'independents',
    });
  });

  it('throws if event bus is missing emit', () => {
    expect(() => emitVendorPurchaseEvent(null, {})).toThrow(/requires an EventBus/i);
    expect(() => emitVendorPurchaseEvent({}, {})).toThrow(/requires an EventBus/i);
  });
});
