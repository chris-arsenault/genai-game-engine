import { SocialStealthSystem } from '../../../src/game/systems/SocialStealthSystem.js';

describe('SocialStealthSystem', () => {
  let system;
  let eventBus;
  let componentRegistry;
  let factionManager;
  let listeners;
  let disguiseComponent;
  const playerId = 77;

  beforeEach(() => {
    listeners = {};

    eventBus = {
      emit: jest.fn(() => {}),
      on: jest.fn((eventName, handler) => {
        listeners[eventName] = handler;
        return () => {};
      }),
    };

    disguiseComponent = {
      suspicionLevel: 0,
      equipped: true,
      factionId: 'cipher_collective',
      addSuspicion: jest.fn(function addSuspicion(amount) {
        const applied = Number.isFinite(amount) ? amount : 0;
        this.suspicionLevel = Math.min(100, this.suspicionLevel + applied);
      }),
    };

    componentRegistry = {
      queryEntities: jest.fn((...types) => {
        if (types.includes('PlayerController') && types.includes('Disguise')) {
          return [playerId];
        }
        if (types.length === 1 && types[0] === 'Disguise') {
          return [playerId];
        }
        if (types.includes('PlayerController') && types.includes('FactionMember')) {
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
          return {
            currentDisguise: 'cipher_collective',
            primaryFaction: 'civilian',
          };
        }
        return null;
      }),
    };

    factionManager = {
      modifyReputation: jest.fn(),
    };

    system = new SocialStealthSystem(componentRegistry, eventBus, factionManager);
    system.init();
  });

  afterEach(() => {
    if (system) {
      system.cleanup();
    }
    jest.clearAllMocks();
  });

  test('restricted area entry increases suspicion and transitions to suspicious state', () => {
    listeners['area:entered']?.({
      areaId: 'memory_parlor_firewall',
      data: { triggerType: 'restricted_area' },
    });

    system.update(1);

    expect(disguiseComponent.addSuspicion).toHaveBeenCalled();

    const suspicionCall = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'socialStealth:suspicion_applied'
    );
    expect(suspicionCall).toBeDefined();
    expect(suspicionCall[1].suspicionLevel).toBeGreaterThan(0);

    const stateChangeCall = eventBus.emit.mock.calls
      .filter(([eventName]) => eventName === 'socialStealth:state_changed')
      .pop();
    expect(stateChangeCall).toBeDefined();
    expect(stateChangeCall[1].nextState).toBe('suspicious');
  });

  test('alert state applies infamy penalty once', () => {
    disguiseComponent.suspicionLevel = 70;

    eventBus.emit.mockClear();
    system.update(0.016);

    expect(factionManager.modifyReputation).toHaveBeenCalledWith(
      'cipher_collective',
      0,
      system.config.alertInfamyPenalty,
      expect.stringContaining('alert')
    );

    const stateChangeCall = eventBus.emit.mock.calls
      .filter(([eventName]) => eventName === 'socialStealth:state_changed')
      .pop();
    expect(stateChangeCall).toBeDefined();
    expect(stateChangeCall[1].nextState).toBe('alerted');
  });

  test('combat escalation emits combat event and infamy penalty', () => {
    system.update(0);

    listeners['combat:initiated']?.({
      factionId: 'cipher_collective',
      reason: 'forced_test',
    });

    const combatEvent = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'socialStealth:combat_engaged'
    );
    expect(combatEvent).toBeDefined();
    expect(combatEvent[1]).toMatchObject({
      factionId: 'cipher_collective',
      reason: 'forced_test',
    });

    const stateChangeCall = eventBus.emit.mock.calls
      .filter(([eventName]) => eventName === 'socialStealth:state_changed')
      .pop();
    expect(stateChangeCall).toBeDefined();
    expect(stateChangeCall[1].nextState).toBe('combat');

    expect(factionManager.modifyReputation).toHaveBeenCalledWith(
      'cipher_collective',
      0,
      system.config.combatInfamyPenalty,
      expect.stringContaining('combat')
    );
  });
});
