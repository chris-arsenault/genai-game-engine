import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { NavigationConstraintSystem } from '../../../src/game/systems/NavigationConstraintSystem.js';
import { NavigationAgent } from '../../../src/game/components/NavigationAgent.js';
import { Transform } from '../../../src/game/components/Transform.js';

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

describe('NavigationConstraintSystem', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let system;

  beforeEach(() => {
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    system = new NavigationConstraintSystem(componentRegistry, eventBus, {
      entityManager,
    });
    system.init();
    system.setNavigationMesh(createNavMesh(), { sceneId: 'act2_crossroads' });
  });

  afterEach(() => {
    system.cleanup();
  });

  it('reverts entities outside nav mesh to their last valid position', () => {
    const entityId = entityManager.createEntity();
    const transform = new Transform(1000, 1000, 0, 1, 1);
    componentRegistry.addComponent(entityId, 'Transform', transform);
    const agent = new NavigationAgent({
      allowedSurfaceTags: ['safehouse'],
      initialPosition: { x: 300, y: 320 },
    });
    componentRegistry.addComponent(entityId, 'NavigationAgent', agent);

    system.update(1 / 60, [entityId]);

    const updatedTransform = componentRegistry.getComponent(entityId, 'Transform');
    expect(updatedTransform.x).toBeCloseTo(300);
    expect(updatedTransform.y).toBeCloseTo(320);
  });

  it('blocks movement onto locked tagged surfaces', () => {
    const entityId = entityManager.createEntity();
    const transform = new Transform(620, 320, 0, 1, 1);
    componentRegistry.addComponent(entityId, 'Transform', transform);
    const agent = new NavigationAgent({
      allowedSurfaceTags: ['safehouse', 'walkway', 'transition'],
      lockedSurfaceTags: ['transition'],
      initialPosition: { x: 300, y: 320 },
    });
    componentRegistry.addComponent(entityId, 'NavigationAgent', agent);

    system.update(1 / 60, [entityId]);

    const updatedTransform = componentRegistry.getComponent(entityId, 'Transform');
    expect(updatedTransform.x).toBeCloseTo(300);
    expect(updatedTransform.y).toBeCloseTo(320);
  });
});

