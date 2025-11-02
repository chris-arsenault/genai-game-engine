import { DisguiseSystem } from '../../../src/game/systems/DisguiseSystem.js';

describe('DisguiseSystem attitude reactions', () => {
  let system;
  let eventBus;
  let componentRegistry;
  let factionManager;
  let listeners;
  let disguiseComponent;
  let factionMemberComponent;
  const playerId = 42;

  beforeEach(() => {
    listeners = {};

    eventBus = {
      emit: jest.fn(() => {}),
      on: jest.fn((eventType, handler) => {
        listeners[eventType] = handler;
        return () => {};
      }),
    };

    disguiseComponent = {
      equipped: true,
      factionId: 'cipher_collective',
      suspicionLevel: 0,
      addSuspicion: jest.fn(function addSuspicion(amount) {
        const applied = Number.isFinite(amount) ? amount : 0;
        this.suspicionLevel = Math.min(100, this.suspicionLevel + applied);
      }),
      reduceSuspicion: jest.fn(function reduceSuspicion(amount) {
        const applied = Number.isFinite(amount) ? amount : 0;
        this.suspicionLevel = Math.max(0, this.suspicionLevel - applied);
      }),
      isBlown: jest.fn(() => false),
    };

    factionMemberComponent = {
      currentDisguise: 'cipher_collective',
      primaryFaction: 'civilian',
      isKnownBy: jest.fn(() => false),
      removeDisguise: jest.fn(() => {
        factionMemberComponent.currentDisguise = null;
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
        if (types.length === 1 && types[0] === 'Disguise') {
          return [playerId];
        }
        return [];
      }),
      getComponent: jest.fn((entityId, componentType) => {
        if (entityId !== playerId) {
          return null;
        }
        if (componentType === 'Disguise') {
          return disguiseComponent;
        }
        if (componentType === 'FactionMember') {
          return factionMemberComponent;
        }
        if (componentType === 'Transform') {
          return { x: 0, y: 0 };
        }
        if (componentType === 'NPC') {
          return null;
        }
        return null;
      }),
    };

    factionManager = {
      getReputation: jest.fn(() => ({ fame: 0, infamy: 0 })),
      modifyReputation: jest.fn(),
    };

    system = new DisguiseSystem(componentRegistry, eventBus, factionManager);
    system.init();
    listeners['disguise:equipped']?.({ factionId: 'cipher_collective' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('hostile attitude amplifies suspicion penalties and detection pressure', () => {
    eventBus.emit.mockClear();
    disguiseComponent.suspicionLevel = 0;

    listeners['npc:attitude_changed']?.({
      factionId: 'cipher_collective',
      newAttitude: 'hostile',
    });

    const profileUpdate = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'disguise:attitude_reaction_updated'
    );
    expect(profileUpdate).toBeDefined();
    expect(profileUpdate[1]).toMatchObject({
      attitude: 'hostile',
      factionId: 'cipher_collective',
    });

    disguiseComponent.addSuspicion.mockClear();
    system.onSuspiciousAction('running', 10);

    expect(disguiseComponent.addSuspicion).toHaveBeenCalled();
    const [appliedAmount] = disguiseComponent.addSuspicion.mock.calls.pop();
    expect(appliedAmount).toBeGreaterThan(10);
    expect(system.attitudeState.detectionMultiplier).toBeGreaterThan(1);
  });

  test('friendly attitude relaxes suspicion and raises alert thresholds', () => {
    disguiseComponent.suspicionLevel = 25;

    listeners['npc:attitude_changed']?.({
      factionId: 'cipher_collective',
      newAttitude: 'friendly',
    });

    const decayRate = system._resolveSuspicionDecayRate();
    expect(decayRate).toBeGreaterThan(system.config.suspicionDecayRate);
    expect(system.attitudeState.alertThreshold).toBeGreaterThanOrEqual(
      system._baseAlertThreshold
    );

    disguiseComponent.addSuspicion.mockClear();
    system.onSuspiciousAction('running', 10);
    const [appliedAmount] = disguiseComponent.addSuspicion.mock.calls.pop();
    expect(appliedAmount).toBeLessThanOrEqual(10);
  });
});
