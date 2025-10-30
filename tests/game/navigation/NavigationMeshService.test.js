import { EventBus } from '../../../src/engine/events/EventBus.js';
import { NavigationMeshService } from '../../../src/game/navigation/NavigationMeshService.js';

function createMesh() {
  return {
    nodes: [
      { id: 'safehouse', x: 120, y: 160, links: ['briefing'] },
      { id: 'briefing', x: 300, y: 280, links: ['safehouse', 'selection'] },
    ],
  };
}

describe('NavigationMeshService', () => {
  let eventBus;
  let service;

  beforeEach(() => {
    eventBus = new EventBus();
    service = new NavigationMeshService(eventBus);
    service.init();
  });

  test('stores scene navigation mesh and clones data', () => {
    const mesh = createMesh();
    service.handleSceneLoaded({
      sceneId: 'act2_crossroads',
      navigationMesh: mesh,
    });

    const stored = service.getActiveNavigationMesh();
    expect(stored).toEqual(mesh);

    mesh.nodes[0].id = 'mutated';
    const afterMutation = service.getActiveNavigationMesh();
    expect(afterMutation.nodes[0].id).toBe('safehouse');
  });

  test('notifies consumers when mesh updates', () => {
    const calls = [];
    service.addConsumer((navMesh, info) => {
      calls.push({ navMesh, info });
    });

    service.handleSceneLoaded({
      sceneId: 'act2_crossroads',
      navigationMesh: createMesh(),
    });

    expect(calls.length).toBe(1);
    expect(calls[0].info.sceneId).toBe('act2_crossroads');
    expect(calls[0].navMesh.nodes.length).toBe(2);
  });
});
