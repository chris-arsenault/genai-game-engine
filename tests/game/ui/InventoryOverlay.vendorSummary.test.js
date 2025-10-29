import { InventoryOverlay } from '../../../src/game/ui/InventoryOverlay.js';

function createOverlay() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.getContext = jest.fn(() => ({}));
  const eventBus = { on: jest.fn() };
  return new InventoryOverlay(canvas, eventBus);
}

describe('InventoryOverlay vendor metadata presentation', () => {
  it('identifies vendor-sourced items', () => {
    const overlay = createOverlay();
    const vendorItem = {
      metadata: {
        source: 'vendor_purchase',
      },
    };

    expect(overlay.isVendorItem(vendorItem)).toBe(true);
    expect(overlay.isVendorItem({ metadata: { source: 'quest_reward' } })).toBe(false);
  });

  it('builds vendor info lines with cost and acquisition context', () => {
    const overlay = createOverlay();
    const item = {
      metadata: {
        source: 'vendor_purchase',
        vendorName: 'Black Market Broker',
        vendorFaction: 'smugglers',
        transactionCost: { credits: 80, currencies: { chits: 3 } },
        acquisition: 'purchase_discounted',
        transactionContext: { dialogueId: 'black_market_broker' },
        transactionTimestamp: Date.now(),
      },
    };

    const lines = overlay.buildVendorInfoLines(item);
    expect(lines[0]).toContain('Black Market Broker');
    expect(lines[0]).toContain('(smugglers)');
    expect(lines[1]).toContain('80');
    expect(lines[1]).toContain('chits');
    expect(lines[2]).toContain('Purchase discounted');
  });

  it('adds vendor marker to list labels', () => {
    const overlay = createOverlay();
    const label = overlay.buildListLabel(
      {
        id: 'intel_parlor_transit_routes',
        name: 'Underground Transit Routes',
        quantity: 1,
        tags: [],
        metadata: { source: 'vendor_purchase' },
      },
      false
    );

    expect(label.startsWith('[VN]')).toBe(true);
  });
});
