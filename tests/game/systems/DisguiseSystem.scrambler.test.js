import { DisguiseSystem } from '../../../src/game/systems/DisguiseSystem.js';

describe('DisguiseSystem scrambler integration', () => {
  let system;
  let mockComponentRegistry;
  let mockEventBus;
  let mockFactionManager;
  let listeners;

  beforeEach(() => {
    listeners = {};
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn((eventType, handler) => {
        listeners[eventType] = handler;
        return jest.fn();
      })
    };

    mockComponentRegistry = {
      queryEntities: jest.fn(() => []),
      getComponent: jest.fn()
    };

    mockFactionManager = {
      getReputation: jest.fn(() => ({ fame: 0, infamy: 0 }))
    };

    system = new DisguiseSystem(
      mockComponentRegistry,
      mockEventBus,
      mockFactionManager
    );
    system.init();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('scrambler activation lowers detection success', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);

    system.recentSuspiciousActions = [{}, {}];
    const detectedWithoutScrambler = system.rollDetection(0.5);
    expect(detectedWithoutScrambler).toBe(true);

    listeners['firewall:scrambler_activated']({
      detectionMultiplier: 0.25,
      suspicionDecayBonusPerSecond: 10
    });

    system.recentSuspiciousActions = [{}, {}];
    const detectedWithScrambler = system.rollDetection(0.5);
    expect(detectedWithScrambler).toBe(false);

    randomSpy.mockRestore();
  });

  test('scrambler activation updates decay bonus and resets on expiration', () => {
    listeners['firewall:scrambler_activated']({
      detectionMultiplier: 0.3,
      suspicionDecayBonusPerSecond: 6
    });

    expect(system.scramblerEffect.active).toBe(true);
    expect(system.scramblerEffect.suspicionDecayBonusPerSecond).toBe(6);

    listeners['firewall:scrambler_expired']();

    expect(system.scramblerEffect.active).toBe(false);
    expect(system.scramblerEffect.suspicionDecayBonusPerSecond).toBe(0);
  });
});
