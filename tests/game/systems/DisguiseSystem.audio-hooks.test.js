import { DisguiseSystem } from '../../../src/game/systems/DisguiseSystem.js';
import { Disguise } from '../../../src/game/components/Disguise.js';

class MockEventBus {
  constructor() {
    this.listeners = new Map();
    this.emitted = [];
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const handlers = this.listeners.get(event);
    handlers.push(handler);
    return () => {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    };
  }

  emit(event, payload) {
    this.emitted.push({ event, payload });
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.slice().forEach((handler) => handler(payload));
  }
}

describe('DisguiseSystem audio and telemetry hooks', () => {
  let system;
  let eventBus;
  let componentRegistry;
  let factionManager;
  let disguise;
  let playerFaction;
  const playerId = 1;

  beforeEach(() => {
    eventBus = new MockEventBus();
    disguise = new Disguise({
      factionId: 'cipher_collective',
      equipped: true,
    });
    playerFaction = {
      currentDisguise: 'cipher_collective',
      equipDisguise: jest.fn(function equipDisguise(factionId) {
        this.currentDisguise = factionId;
      }),
      removeDisguise: jest.fn(function removeDisguise() {
        this.currentDisguise = null;
      }),
      isKnownBy: jest.fn(() => false),
    };

    componentRegistry = {
      queryEntities: jest.fn((...types) => {
        const query = types.length === 1 && Array.isArray(types[0]) ? types[0] : types;
        if (query.includes('Transform') && query.includes('FactionMember')) {
          return [playerId];
        }
        if (query.length === 1 && query[0] === 'Disguise') {
          return [playerId];
        }
        if (query.includes('Transform') && query.includes('NPC')) {
          return [];
        }
        return [];
      }),
      getComponent: jest.fn((entity, type) => {
        if (entity !== playerId) {
          return null;
        }
        if (type === 'FactionMember') {
          return playerFaction;
        }
        if (type === 'Transform') {
          return { x: 0, y: 0 };
        }
        if (type === 'Disguise') {
          return disguise;
        }
        if (type === 'NPC') {
          return { npcId: 'npc_1', name: 'Guard' };
        }
        return null;
      }),
      removeAllComponents: jest.fn(),
    };

    factionManager = {
      getReputation: jest.fn(() => ({ fame: 0, infamy: 0 })),
      modifyReputation: jest.fn(),
    };

    system = new DisguiseSystem(componentRegistry, eventBus, factionManager);
    system.config.alertSuspicionThreshold = 20;
    system.config.combatResolutionDelayMs = 0;
    system.init();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('emits alert, clears suspicion, and resolves combat hooks', () => {
    eventBus.emit('disguise:equipped', { factionId: 'cipher_collective' });
    system.onSuspiciousAction('running', 30);

    const alertEvent = eventBus.emitted.find((entry) => entry.event === 'disguise:alert_started');
    expect(alertEvent).toBeTruthy();
    expect(alertEvent.payload).toEqual(
      expect.objectContaining({ factionId: 'cipher_collective', suspicionLevel: expect.any(Number) })
    );

    system.update(0);
    const suspiciousActionEvent = eventBus.emitted.some((entry) => entry.event === 'disguise:suspicious_action');
    expect(suspiciousActionEvent).toBe(true);

    // Calm the area
    disguise.resetSuspicion();
    system.update(0);
    const clearedEvent = eventBus.emitted.find((entry) => entry.event === 'disguise:suspicion_cleared');
    expect(clearedEvent).toBeTruthy();

    eventBus.emitted = [];
    disguise.equipped = true;
    disguise.suspicionLevel = 100;
    system.blowDisguise(playerId, playerFaction, disguise);
    const combatStart = eventBus.emitted.find((entry) => entry.event === 'combat:initiated');
    expect(combatStart).toBeTruthy();

    // After disguise removal and update loop combat should resolve (delay forced to 0)
    system.update(0);
    const combatResolved = eventBus.emitted.find((entry) => entry.event === 'combat:resolved');
    expect(combatResolved).toBeTruthy();
    expect(combatResolved.payload).toEqual(
      expect.objectContaining({ reason: expect.any(String) })
    );
  });
});
