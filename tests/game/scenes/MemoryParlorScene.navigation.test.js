import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadMemoryParlorScene,
  unloadMemoryParlorScene,
} from '../../../src/game/scenes/MemoryParlorScene.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';

describe('MemoryParlorScene navigation mesh', () => {
  let entityManager;
  let componentRegistry;
  let eventBus;
  let sceneData;

  beforeEach(async () => {
    QuestTriggerRegistry.reset();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    sceneData = await loadMemoryParlorScene(entityManager, componentRegistry, eventBus);
  });

  afterEach(() => {
    if (sceneData) {
      unloadMemoryParlorScene(entityManager, componentRegistry, sceneData.sceneEntities);
      sceneData.cleanup?.();
      sceneData = null;
    }
  });

  it('defines restricted cipher surfaces for Memory Parlor infiltration', () => {
    const navigationMesh = sceneData.metadata.navigationMesh;
    expect(navigationMesh).toBeDefined();
    expect(Array.isArray(navigationMesh.walkableSurfaces)).toBe(true);

    const firewallSurface = navigationMesh.walkableSurfaces.find(
      (surface) => surface.id === 'memory_parlor_firewall_channel'
    );
    expect(firewallSurface).toBeDefined();
    expect(firewallSurface.tags).toEqual(
      expect.arrayContaining(['restricted', 'restricted:cipher_collective'])
    );

    const interiorSurface = navigationMesh.walkableSurfaces.find(
      (surface) => surface.id === 'memory_parlor_interior_floor'
    );
    expect(interiorSurface).toBeDefined();
    expect(interiorSurface.tags).toEqual(
      expect.arrayContaining(['restricted', 'restricted:cipher_collective'])
    );
  });

  it('keeps the entry floor approachable without restricted tags', () => {
    const navigationMesh = sceneData.metadata.navigationMesh;
    const entrySurface = navigationMesh.walkableSurfaces.find(
      (surface) => surface.id === 'memory_parlor_entry_floor'
    );

    expect(entrySurface).toBeDefined();
    expect(entrySurface.tags).not.toContain('restricted');
    expect(entrySurface.tags).not.toContain('restricted:cipher_collective');
  });
});
