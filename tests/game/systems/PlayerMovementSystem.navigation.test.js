import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { PlayerMovementSystem } from '../../../src/game/systems/PlayerMovementSystem.js';
import { PlayerController } from '../../../src/game/components/PlayerController.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { NavigationAgent } from '../../../src/game/components/NavigationAgent.js';

class StubInputState {
  constructor() {
    this.vector = { x: 0, y: 0 };
  }

  setVector(x, y) {
    this.vector = { x, y };
  }

  getMovementVector() {
    return { ...this.vector };
  }

  isPressed() {
    return false;
  }
}

function createNavMesh() {
  return {
    walkableSurfaces: [
      {
        id: 'safehouse_floor',
        polygon: [
          { x: 180, y: 220 },
          { x: 600, y: 220 },
          { x: 600, y: 580 },
          { x: 180, y: 580 },
        ],
        tags: ['safehouse', 'indoor'],
      },
      {
        id: 'branch_walkway',
        polygon: [
          { x: 470, y: 240 },
          { x: 890, y: 240 },
          { x: 890, y: 460 },
          { x: 470, y: 460 },
        ],
        tags: ['walkway', 'transition'],
      },
    ],
  };
}

describe('PlayerMovementSystem navigation constraints', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let inputState;
  let system;
  let entityId;

  beforeEach(() => {
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    inputState = new StubInputState();
    system = new PlayerMovementSystem(componentRegistry, eventBus, inputState);
    system.init();
    system.setNavigationMesh(createNavMesh(), { sceneId: 'act2_crossroads' });

    entityId = entityManager.createEntity();
    const transform = new Transform(550, 320, 0, 1, 1);
    const controller = new PlayerController({
      moveSpeed: 200,
      acceleration: 1200,
      friction: 0.85,
    });
    const navigationAgent = new NavigationAgent({
      allowedSurfaceTags: ['safehouse', 'walkway', 'transition'],
      lockedSurfaceTags: ['transition'],
      initialPosition: { x: 550, y: 320 },
    });

    componentRegistry.addComponent(entityId, 'Transform', transform);
    componentRegistry.addComponent(entityId, 'PlayerController', controller);
    componentRegistry.addComponent(entityId, 'NavigationAgent', navigationAgent);
  });

  afterEach(() => {
    system.cleanup();
  });

  it('prevents player from entering locked navigation surfaces', () => {
    inputState.setVector(1, 0);

    system.update(1, [entityId]);

    const transform = componentRegistry.getComponent(entityId, 'Transform');
    expect(transform.x).toBeCloseTo(550);
    expect(transform.y).toBeCloseTo(320);
  });

  it('allows movement once navigation surface tag unlocked', () => {
    eventBus.emit('navigation:unlockSurfaceTag', { tag: 'transition' });
    inputState.setVector(1, 0);

    system.update(1, [entityId]);

    const transform = componentRegistry.getComponent(entityId, 'Transform');
    expect(transform.x).toBeGreaterThan(600);
  });
});

