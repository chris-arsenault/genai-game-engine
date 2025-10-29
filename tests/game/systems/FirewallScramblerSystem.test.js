import { FirewallScramblerSystem } from '../../../src/game/systems/FirewallScramblerSystem.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('FirewallScramblerSystem', () => {
  let eventBus;
  let storyFlags;
  let system;

  beforeEach(() => {
    eventBus = new EventBus();
    storyFlags = new StoryFlagManager(eventBus);
    storyFlags.init();
    system = new FirewallScramblerSystem(null, eventBus, storyFlags);
    system.init();
  });

  afterEach(() => {
    system.cleanup();
  });

  test('activates scrambler when knowledge and charge present', () => {
    const activatedSpy = jest.fn();
    const inventoryUpdatedSpy = jest.fn();

    eventBus.on('firewall:scrambler_activated', activatedSpy);
    eventBus.on('inventory:item_updated', inventoryUpdatedSpy);

    eventBus.emit('knowledge:learned', { knowledgeId: 'cipher_scrambler_access' });
    eventBus.emit('inventory:item_added', {
      id: 'gadget_cipher_scrambler_charge',
      quantity: 1
    });

    eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });

    expect(activatedSpy).toHaveBeenCalledTimes(1);
    const payload = activatedSpy.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      durationSeconds: expect.any(Number),
      chargesRemaining: expect.any(Number),
      detectionMultiplier: expect.any(Number)
    }));
    expect(storyFlags.hasFlag('cipher_scrambler_access')).toBe(true);
    expect(storyFlags.hasFlag('cipher_scrambler_active')).toBe(true);
    expect(inventoryUpdatedSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 'gadget_cipher_scrambler_charge',
      quantityDelta: -1
    }));

    // Advance time to expire the effect
    system.update(31);
    expect(storyFlags.hasFlag('cipher_scrambler_active')).toBe(false);
  });

  test('emits unavailable when access or charges missing', () => {
    const unavailableSpy = jest.fn();
    eventBus.on('firewall:scrambler_unavailable', unavailableSpy);

    eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });

    expect(unavailableSpy).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'no_access'
    }));

    unavailableSpy.mockClear();

    eventBus.emit('knowledge:learned', { knowledgeId: 'cipher_scrambler_access' });
    eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });

    expect(unavailableSpy).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'no_charges'
    }));
  });
});
