import { DisguiseSystem } from '../../../src/game/systems/DisguiseSystem.js';

describe('DisguiseSystem access gating', () => {
  let system;
  let eventBus;
  let componentRegistry;
  let factionManager;
  let listeners;
  const playerId = 101;

  beforeEach(() => {
    listeners = {};

    eventBus = {
      emit: jest.fn(() => {}),
      on: jest.fn((eventType, handler) => {
        listeners[eventType] = handler;
        return () => {};
      }),
    };

    componentRegistry = {
      queryEntities: jest.fn((...types) => {
        if (types.includes('PlayerController') && types.includes('NavigationAgent')) {
          return [playerId];
        }
        if (types.includes('Transform') && types.includes('FactionMember')) {
          return [playerId];
        }
        return [];
      }),
      getComponent: jest.fn(() => null),
    };

    factionManager = {
      getReputation: jest.fn(() => ({ fame: 0, infamy: 0 })),
      modifyReputation: jest.fn(),
    };

    system = new DisguiseSystem(componentRegistry, eventBus, factionManager);
    system.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('equipping a Luminari disguise unlocks restricted navigation surfaces', () => {
    listeners['disguise:equipped']?.({ factionId: 'luminari_syndicate' });

    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceTag', {
      tag: 'restricted',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceTag', {
      tag: 'restricted:luminari_syndicate',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceId', {
      surfaceId: 'security_walkway',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceId', {
      surfaceId: 'encryption_lab_floor',
      entityId: playerId,
    });
  });

  test('unequipping a disguise relocks previously unlocked surfaces', () => {
    listeners['disguise:equipped']?.({ factionId: 'luminari_syndicate' });
    eventBus.emit.mockClear();

    listeners['disguise:removed']?.({ factionId: 'luminari_syndicate' });

    expect(eventBus.emit).toHaveBeenCalledWith('navigation:lockSurfaceTag', {
      tag: 'restricted',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:lockSurfaceTag', {
      tag: 'restricted:luminari_syndicate',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:lockSurfaceId', {
      surfaceId: 'security_walkway',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:lockSurfaceId', {
      surfaceId: 'encryption_lab_floor',
      entityId: playerId,
    });
  });

  test('equipping a Cipher disguise unlocks Memory Parlor restricted surfaces', () => {
    listeners['disguise:equipped']?.({ factionId: 'cipher_collective' });

    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceTag', {
      tag: 'restricted',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceTag', {
      tag: 'restricted:cipher_collective',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceId', {
      surfaceId: 'memory_parlor_firewall_channel',
      entityId: playerId,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('navigation:unlockSurfaceId', {
      surfaceId: 'memory_parlor_interior_floor',
      entityId: playerId,
    });
  });

  test('switching disguises relocks previous access before applying new rules', () => {
    listeners['disguise:equipped']?.({ factionId: 'luminari_syndicate' });
    eventBus.emit.mockClear();

    listeners['disguise:equipped']?.({ factionId: 'cipher_collective' });

    const events = eventBus.emit.mock.calls.map(([event, payload]) => ({ event, payload }));

    const lockLuminari = events.filter(
      (entry) =>
        entry.event === 'navigation:lockSurfaceTag' &&
        entry.payload.tag === 'restricted:luminari_syndicate'
    );
    expect(lockLuminari.length).toBeGreaterThanOrEqual(1);

    const unlockCipher = events.filter(
      (entry) =>
        entry.event === 'navigation:unlockSurfaceTag' &&
        entry.payload.tag === 'restricted:cipher_collective'
    );
    expect(unlockCipher.length).toBeGreaterThanOrEqual(1);

    const cipherSurfaceUnlocks = events.filter(
      (entry) =>
        entry.event === 'navigation:unlockSurfaceId' &&
        (entry.payload.surfaceId === 'memory_parlor_firewall_channel' ||
          entry.payload.surfaceId === 'memory_parlor_interior_floor')
    );
    expect(cipherSurfaceUnlocks.length).toBeGreaterThanOrEqual(2);
  });
});
