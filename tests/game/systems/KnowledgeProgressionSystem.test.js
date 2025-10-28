import { KnowledgeProgressionSystem } from '../../../src/game/systems/KnowledgeProgressionSystem.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('KnowledgeProgressionSystem', () => {
  it('queries gates when triggered by progression events', () => {
    const gate = {
      id: 'gate_1',
      type: 'door',
      unlocked: false,
      checkRequirements: jest.fn(() => true),
      unlock: jest.fn(function unlock() {
        this.unlocked = true;
      }),
    };

    const transform = { x: 10, y: 20 };
    const componentRegistry = {
      queryEntities: jest.fn(() => [42]),
      getComponent: jest.fn((entityId, componentType) => {
        if (entityId !== 42) {
          return null;
        }
        if (componentType === 'KnowledgeGate') {
          return gate;
        }
        if (componentType === 'Transform') {
          return transform;
        }
        return null;
      }),
    };

    const eventBus = new EventBus();
    jest.spyOn(eventBus, 'emit');

    const investigationSystem = {
      getPlayerState: jest.fn(() => ({
        knowledge: new Set(['case_intro']),
      })),
    };

    const system = new KnowledgeProgressionSystem(componentRegistry, eventBus, investigationSystem);
    system.init();

    eventBus.emit('knowledge:learned', { topicId: 'case_intro' });

    expect(componentRegistry.queryEntities).toHaveBeenCalledWith('KnowledgeGate');
    expect(componentRegistry.getComponent).toHaveBeenCalledWith(42, 'KnowledgeGate');
    expect(gate.unlock).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      'gate:unlocked',
      expect.objectContaining({
        gateId: 'gate_1',
        entityId: 42,
      })
    );

    system.cleanup();
  });

  it('uses provided entity list when supplied directly', () => {
    const gate = {
      id: 'gate_direct',
      type: 'memory',
      unlocked: false,
      checkRequirements: jest.fn(() => true),
      unlock: jest.fn(),
    };

    const componentRegistry = {
      queryEntities: jest.fn(() => []),
      getComponent: jest.fn((entityId, componentType) => {
        if (entityId !== 99) {
          return null;
        }
        if (componentType === 'KnowledgeGate') {
          return gate;
        }
        return null;
      }),
    };

    const eventBus = new EventBus();
    jest.spyOn(eventBus, 'emit');

    const system = new KnowledgeProgressionSystem(
      componentRegistry,
      eventBus,
      { getPlayerState: jest.fn(() => ({})) }
    );

    system.checkAllGates([99]);

    expect(componentRegistry.queryEntities).not.toHaveBeenCalled();
    expect(componentRegistry.getComponent).toHaveBeenCalledWith(99, 'KnowledgeGate');
    expect(gate.unlock).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      'gate:unlocked',
      expect.objectContaining({
        gateId: 'gate_direct',
        entityId: 99,
      })
    );
  });
});
