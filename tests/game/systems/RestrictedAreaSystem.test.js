import { RestrictedAreaSystem } from '../../../src/game/systems/RestrictedAreaSystem.js';

describe('RestrictedAreaSystem', () => {
  let system;
  let eventBus;
  let componentRegistry;
  let storyFlags;
  let worldStateStore;

  beforeEach(() => {
    const listeners = new Map();

    eventBus = {
      emit: jest.fn(),
      on: jest.fn((eventName, handler) => {
        listeners.set(eventName, handler);
        return () => listeners.delete(eventName);
      }),
    };

    storyFlags = {
      flags: new Set(),
      hasFlag(flagId) {
        return this.flags.has(flagId);
      },
    };

    worldStateStore = {
      getState: jest.fn(() => ({
        inventory: {
          items: [],
        },
      })),
      select: jest.fn(() => false),
    };

    componentRegistry = {
      queryEntities: jest.fn(() => [1]),
      getComponent: jest.fn((entityId, component) => {
        if (component === 'Disguise') {
          return null;
        }
        if (component === 'FactionMember') {
          return {
            currentDisguise: null,
            primaryFaction: 'civilian',
          };
        }
        return null;
      }),
    };

    system = new RestrictedAreaSystem(componentRegistry, eventBus, {
      storyFlagManager: storyFlags,
      worldStateStore,
      factionManager: {
        modifyReputation: jest.fn(),
      },
    });
    system.init();

    // Expose helper to trigger events in tests.
    system.__listeners = listeners;
  });

  afterEach(() => {
    if (system) {
      system.cleanup();
    }
    jest.clearAllMocks();
  });

  function emit(eventName, payload) {
    const handler = system.__listeners.get(eventName);
    if (handler) {
      handler(payload);
    }
  }

  test('emits access_denied when requirements unmet', () => {
    emit('area:entered', {
      areaId: 'memory_parlor_firewall',
      data: { triggerType: 'restricted_area' },
    });

    const accessDeniedCall = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'restricted:access_denied'
    );
    expect(accessDeniedCall).toBeDefined();
    expect(accessDeniedCall[1]).toMatchObject({
      areaId: 'memory_parlor_firewall',
      definitionId: 'memory_parlor_firewall',
      reason: expect.any(String),
    });

    const trespassCall = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'player:trespassing'
    );
    expect(trespassCall).toBeDefined();
    expect(trespassCall[1]).toMatchObject({
      areaId: 'memory_parlor_firewall',
      source: 'restricted_area',
    });
  });

  test('disguise grants access without trespass penalty', () => {
    componentRegistry.getComponent = jest.fn((entityId, component) => {
      if (component === 'Disguise') {
        return {
          equipped: true,
          factionId: 'cipher_collective',
        };
      }
      if (component === 'FactionMember') {
        return {
          currentDisguise: 'cipher_collective',
          primaryFaction: 'civilian',
        };
      }
      return null;
    });

    emit('area:entered', {
      areaId: 'memory_parlor_firewall',
      data: { triggerType: 'restricted_area' },
    });

    const accessGranted = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'restricted:access_granted'
    );
    expect(accessGranted).toBeDefined();
    expect(accessGranted[1]).toMatchObject({
      areaId: 'memory_parlor_firewall',
      definitionId: 'memory_parlor_firewall',
      policyId: 'cipher_disguise',
    });

    const trespassCall = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'player:trespassing'
    );
    expect(trespassCall).toBeUndefined();
  });

  test('scrambler activation unlocks restricted surfaces', () => {
    storyFlags.flags.add('cipher_scrambler_access');
    storyFlags.flags.add('cipher_scrambler_active');

    componentRegistry.getComponent = jest.fn((entityId, component) => {
      if (component === 'Disguise') {
        return {
          equipped: false,
          factionId: 'civilian',
        };
      }
      if (component === 'FactionMember') {
        return {
          currentDisguise: null,
          primaryFaction: 'civilian',
        };
      }
      return null;
    });

    // Trigger recalculation to pick up story flags.
    emit('firewall:scrambler_activated', { areaId: 'memory_parlor_firewall' });

    const unlockTagCall = eventBus.emit.mock.calls.find(
      ([eventName, payload]) =>
        eventName === 'navigation:unlockSurfaceTag' &&
        payload.tag === 'restricted:cipher_collective'
    );
    expect(unlockTagCall).toBeDefined();
    expect(unlockTagCall[1]).toMatchObject({
      entityId: expect.any(Number),
    });

    const unlockIdCall = eventBus.emit.mock.calls.find(
      ([eventName, payload]) =>
        eventName === 'navigation:unlockSurfaceId' &&
        payload.surfaceId === 'memory_parlor_firewall_channel'
    );
    expect(unlockIdCall).toBeDefined();
    expect(unlockIdCall[1]).toMatchObject({
      entityId: expect.any(Number),
    });
  });
});

