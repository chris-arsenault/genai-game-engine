import { DIALOGUE_BLACK_MARKET_VENDOR } from '../../../src/game/data/dialogues/Act1Dialogues.js';

describe('Act 1 Black Market Broker dialogue data', () => {
  it('exposes vendor branches with normalized transactions', () => {
    const purchaseNode = DIALOGUE_BLACK_MARKET_VENDOR.getNode('purchase_full_price');
    const discountedNode = DIALOGUE_BLACK_MARKET_VENDOR.getNode('purchase_discounted');

    expect(purchaseNode).toBeDefined();
    expect(purchaseNode.consequences.vendorTransaction).toBeDefined();
    expect(purchaseNode.consequences.vendorTransaction.vendorId).toBe('black_market_broker');
    expect(purchaseNode.consequences.vendorTransaction.cost).toMatchObject({ credits: 80 });
    expect(purchaseNode.consequences.vendorTransaction.items[0].tags).toEqual(
      expect.arrayContaining(['vendor:black_market_broker'])
    );

    expect(discountedNode).toBeDefined();
    expect(discountedNode.consequences.vendorTransaction.cost).toMatchObject({ credits: 40 });
    expect(discountedNode.consequences.removeItem).toMatchObject({
      item: 'intel_vendor_testimony_neon_street',
      amount: 1,
    });
  });

  it('requires credits to proceed through vendor choices', () => {
    const offerNode = DIALOGUE_BLACK_MARKET_VENDOR.getNode('intel_offer');
    const tradeNode = DIALOGUE_BLACK_MARKET_VENDOR.getNode('trade_offer');

    expect(offerNode.choices.find((choice) => choice.nextNode === 'purchase_full_price').conditions).toEqual(
      expect.arrayContaining([{ type: 'hasItem', item: 'credits', amount: 80 }])
    );

    expect(tradeNode.choices.find((choice) => choice.nextNode === 'purchase_discounted').conditions).toEqual(
      expect.arrayContaining([{ type: 'hasItem', item: 'credits', amount: 40 }])
    );
  });
});
