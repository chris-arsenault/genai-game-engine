import { DIALOGUE_CIPHER_QUARTERMASTER } from '../../../src/game/data/dialogues/Act1Dialogues.js';

describe('Act 1 Cipher Quartermaster dialogue data', () => {
  it('defines vendor transactions with Cipher metadata and knowledge hooks', () => {
    const fullPriceNode = DIALOGUE_CIPHER_QUARTERMASTER.getNode('purchase_full_price');
    const discountedNode = DIALOGUE_CIPHER_QUARTERMASTER.getNode('purchase_discounted');

    expect(fullPriceNode).toBeDefined();
    expect(fullPriceNode.consequences.vendorTransaction).toBeDefined();
    expect(fullPriceNode.consequences.vendorTransaction.vendorFaction).toBe('cipher_collective');
    expect(fullPriceNode.consequences.vendorTransaction.cost).toMatchObject({ credits: 120 });

    const [fullPriceItem] = fullPriceNode.consequences.vendorTransaction.items;
    expect(fullPriceItem.id).toBe('gadget_cipher_scrambler_charge');
    expect(fullPriceItem.tags).toEqual(expect.arrayContaining([
      'vendor:cipher_quartermaster',
      'lead:parlor_infiltration'
    ]));
    expect(fullPriceItem.metadata).toMatchObject({
      knowledgeId: 'cipher_scrambler_access',
      gearId: 'cipher_scrambler_charge'
    });

    expect(discountedNode).toBeDefined();
    expect(discountedNode.consequences.vendorTransaction.cost).toMatchObject({ credits: 60 });
    expect(discountedNode.consequences.removeItem).toMatchObject({
      item: 'intel_parlor_transit_routes',
      amount: 1
    });
  });

  it('requires credits or intel to unlock purchase branches', () => {
    const offerNode = DIALOGUE_CIPHER_QUARTERMASTER.getNode('offer');
    const tradeNode = DIALOGUE_CIPHER_QUARTERMASTER.getNode('trade_offer');

    const fullPriceChoice = offerNode.choices.find((choice) => choice.nextNode === 'purchase_full_price');
    expect(fullPriceChoice.conditions).toEqual(
      expect.arrayContaining([{ type: 'hasCurrency', currency: 'credits', amount: 120 }])
    );

    const tradeEntry = offerNode.choices.find((choice) => choice.nextNode === 'trade_offer');
    expect(tradeEntry.conditions).toEqual(
      expect.arrayContaining([{ type: 'hasItem', item: 'intel_parlor_transit_routes', amount: 1 }])
    );

    const discountedChoice = tradeNode.choices.find((choice) => choice.nextNode === 'purchase_discounted');
    expect(discountedChoice.conditions).toEqual(
      expect.arrayContaining([{ type: 'hasCurrency', currency: 'credits', amount: 60 }])
    );
  });
});
