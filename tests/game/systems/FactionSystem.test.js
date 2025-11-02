import { FactionSystem } from '../../../src/game/systems/FactionSystem.js';
import { Faction } from '../../../src/game/components/Faction.js';
import { NPC } from '../../../src/game/components/NPC.js';

describe('FactionSystem', () => {
  let componentRegistry;
  let eventBus;
  let factionManager;
  let system;
  let listeners;
  let entityId;
  let factionComponent;
  let npcComponent;

  beforeEach(() => {
    entityId = 101;
    factionComponent = new Faction({
      factionId: 'vanguard_prime',
    });
    npcComponent = new NPC({
      npcId: 'npc_guard_alpha',
      faction: 'vanguard_prime',
      dialogue: {
        default: 'npc_guard_dialogue',
        friendly: 'npc_guard_dialogue_friendly',
        neutral: 'npc_guard_dialogue_neutral',
        hostile: 'npc_guard_dialogue_hostile',
      },
    });

    componentRegistry = {
      getComponent: jest.fn((id, type) => {
        if (id !== entityId) {
          return null;
        }
        if (type === 'Faction') {
          return factionComponent;
        }
        if (type === 'NPC') {
          return npcComponent;
        }
        return null;
      }),
      getComponentsOfType: jest.fn((type) => {
        if (type !== 'Faction') {
          return new Map();
        }
        return new Map([[entityId, factionComponent]]);
      }),
    };

    listeners = {};
    eventBus = {
      emit: jest.fn(),
      on: jest.fn((eventName, handler, _ctx, _priority = 50) => {
        if (!listeners[eventName]) {
          listeners[eventName] = [];
        }
        listeners[eventName].push(handler);
        return () => {};
      }),
    };

    factionManager = {
      getFactionAttitude: jest.fn(() => 'friendly'),
      getReputation: jest.fn(() => ({ fame: 60, infamy: 10 })),
    };

    system = new FactionSystem(componentRegistry, eventBus, factionManager);
    system.init();
  });

  afterEach(() => {
    if (system) {
      system.cleanup();
    }
    jest.clearAllMocks();
  });

  test('applies faction attitude to NPCs and emits attitude change events', () => {
    system.update(0.016, [entityId]);

    expect(factionComponent.currentAttitude).toBe('friendly');
    expect(npcComponent.attitude).toBe('friendly');
    expect(npcComponent.dialogueVariant).toBe('friendly');
    expect(factionComponent.activeDialogueId).toBe('npc_guard_dialogue_friendly');

    const emitted = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'npc:attitude_changed'
    );
    expect(emitted).toBeDefined();
    expect(emitted[1]).toMatchObject({
      entityId,
      factionId: 'vanguard_prime',
      newAttitude: 'friendly',
      dialogueId: 'npc_guard_dialogue_friendly',
      dialogueVariant: 'friendly',
    });
  });

  test('refreshes attitude when reputation changes', () => {
    system.update(0.016, [entityId]);
    eventBus.emit.mockClear();

    factionManager.getFactionAttitude.mockReturnValue('hostile');
    listeners['reputation:changed'][0]({
      factionId: 'vanguard_prime',
      deltaFame: -20,
    });

    expect(factionComponent.currentAttitude).toBe('hostile');
    expect(npcComponent.attitude).toBe('hostile');

    const emitted = eventBus.emit.mock.calls.find(
      ([eventName]) => eventName === 'npc:attitude_changed'
    );
    expect(emitted).toBeDefined();
    expect(emitted[1].newAttitude).toBe('hostile');
    expect(emitted[1].dialogueVariant).toBe('hostile');
  });

  test('switches dialogue variants during interactions', () => {
    system.update(0.016, [entityId]);

    const payload = {
      npcId: 'npc_guard_alpha',
      dialogueId: 'npc_guard_dialogue',
    };

    listeners['interaction:dialogue'][0](payload);

    expect(payload.dialogueId).toBe('npc_guard_dialogue_friendly');
    expect(payload.requestedDialogueId).toBe('npc_guard_dialogue');
    expect(payload.factionDialogueVariant).toBe('friendly');
  });

  test('respects explicit attitude overrides', () => {
    factionComponent.setAttitudeOverride('hostile');
    factionManager.getFactionAttitude.mockReturnValue('friendly');

    system.update(0.016, [entityId]);

    expect(factionComponent.currentAttitude).toBe('hostile');
    expect(npcComponent.attitude).toBe('hostile');
    expect(eventBus.emit).toHaveBeenCalledWith(
      'npc:attitude_changed',
      expect.objectContaining({
        newAttitude: 'hostile',
        factionId: 'vanguard_prime',
      })
    );
    expect(factionManager.getFactionAttitude).not.toHaveBeenCalled();
  });
});
