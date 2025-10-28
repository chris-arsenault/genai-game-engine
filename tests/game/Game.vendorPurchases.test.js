import { Game } from '../../src/game/Game.js';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../src/game/state/WorldStateStore.js';
import { emitVendorPurchaseEvent } from '../../src/game/economy/vendorEvents.js';

function createEngineStub(eventBus) {
  const renderer = {
    getCamera: jest.fn(() => ({
      worldToScreen: jest.fn(() => ({ x: 0, y: 0 })),
      containsRect: jest.fn(() => true),
    })),
  };

  return {
    eventBus,
    entityManager: {},
    componentRegistry: {},
    systemManager: {
      registerSystem: jest.fn(),
      init: jest.fn(),
      update: jest.fn(),
      cleanup: jest.fn(),
    },
    renderer,
  };
}

describe('Game vendor purchase pipeline', () => {
  it('routes vendor purchases into inventory state', () => {
    const eventBus = new EventBus();
    const engine = createEngineStub(eventBus);
    const game = new Game(engine);

    const worldStateStore = new WorldStateStore(eventBus);
    worldStateStore.init();
    game.worldStateStore = worldStateStore;

    game.subscribeToGameEvents();

    eventBus.emit('inventory:item_added', {
      id: 'credits',
      name: 'Credits',
      type: 'Currency',
      rarity: 'common',
      quantity: 120,
      tags: ['currency'],
    });

    emitVendorPurchaseEvent(eventBus, {
      vendorId: 'black_market_vendor',
      vendorName: 'Black Market Broker',
      vendorFaction: 'smugglers',
      cost: { credits: 70 },
      items: [
        {
          id: 'intel_black_market_map',
          name: 'Black Market Transit Map',
          description: 'Smuggler routes pointing toward underground memory parlors.',
          type: 'Intel',
          rarity: 'rare',
          quantity: 1,
          tags: ['intel', 'vendor:black_market_vendor'],
        },
      ],
      metadata: {
        transactionType: 'map_purchase',
      },
    });

    const inventoryState = game.worldStateStore.getState().inventory;
    const creditsEntry = inventoryState.items.find((item) => item.id === 'credits');
    const intelEntry = inventoryState.items.find((item) => item.id === 'intel_black_market_map');

    expect(creditsEntry).toBeDefined();
    expect(creditsEntry.quantity).toBe(50);
    expect(intelEntry).toBeDefined();
    expect(intelEntry.metadata.vendorId).toBe('black_market_vendor');
    expect(intelEntry.tags).toEqual(expect.arrayContaining(['vendor:black_market_vendor']));
  });
});
