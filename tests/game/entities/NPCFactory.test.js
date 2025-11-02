import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { NPCFactory } from '../../../src/game/entities/NPCFactory.js';
import {
  registerGlobalAssetManager,
  resetGlobalAssetManager,
  clearSpriteAssetCache,
} from '../../../src/game/assets/assetResolver.js';

function createStubAssetManager() {
  const loader = {
    loadImage: jest.fn(async (url) => ({
      src: url,
      width: 32,
      height: 48,
      complete: true,
    })),
  };

  return {
    loader,
    loadAsset: jest.fn(async (assetId) => ({
      src: assetId,
      width: 32,
      height: 48,
      complete: true,
    })),
  };
}

describe('NPCFactory', () => {
  let assetManager;
  let entityManager;
  let componentRegistry;

  beforeEach(() => {
    assetManager = createStubAssetManager();
    registerGlobalAssetManager(assetManager);
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
  });

  afterEach(() => {
    resetGlobalAssetManager();
    clearSpriteAssetCache();
  });

  it('creates guard archetype with default metadata', () => {
    const factory = new NPCFactory({
      entityManager,
      componentRegistry,
      random: () => 0, // deterministic name selection
    });

    const { entityId } = factory.create('guard', {
      position: { x: 48, y: 96 },
    });

    const factionComponent = componentRegistry.getComponent(entityId, 'Faction');
    const npcComponent = componentRegistry.getComponent(entityId, 'NPC');
    const navigationAgent = componentRegistry.getComponent(entityId, 'NavigationAgent');
    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');

    expect(factionComponent.factionId).toBe('vanguard_prime');
    expect(factionComponent.behaviorProfile).toBe('guard');
    expect(factionComponent.tags).toEqual(expect.arrayContaining(['security', 'enforcer']));
    expect(npcComponent.behaviorProfile).toBe('guard');
    expect(npcComponent.archetype).toBe('guard');
    expect(npcComponent.tags).toEqual(expect.arrayContaining(['guard']));
    expect(navigationAgent.allowedSurfaceTags).toEqual(
      expect.arrayContaining(['security', 'patrol', 'restricted'])
    );
    expect(navigationAgent.metadata.behaviorProfile).toBe('guard');
    expect(interactionZone.prompt.toLowerCase()).toContain('request clearance');
  });

  it('honours override options when creating civilians', () => {
    const factory = new NPCFactory({
      entityManager,
      componentRegistry,
      random: () => 0.5,
    });

    const { entityId } = factory.create('civilian', {
      position: { x: 10, y: 20 },
      id: 'custom_npc',
      name: 'Custom Citizen',
      faction: 'memory_keepers',
      dialogueId: 'custom_dialogue',
      tags: ['vendor'],
      factionTags: ['documentarian'],
      navigationAgent: {
        allowedSurfaceTags: ['archives'],
        metadata: { shift: 'evening' },
      },
      attitudeOverride: 'friendly',
      spriteVariant: 2,
      interactionPrompt: (name) => `review records with ${name}`,
      interactionAction: 'inspect',
    });

    const npcComponent = componentRegistry.getComponent(entityId, 'NPC');
    const factionComponent = componentRegistry.getComponent(entityId, 'Faction');
    const navigationAgent = componentRegistry.getComponent(entityId, 'NavigationAgent');
    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');

    expect(npcComponent.name).toBe('Custom Citizen');
    expect(npcComponent.dialogue.default).toBe('custom_dialogue');
    expect(npcComponent.tags).toEqual(expect.arrayContaining(['vendor']));
    expect(factionComponent.factionId).toBe('memory_keepers');
    expect(factionComponent.tags).toEqual(expect.arrayContaining(['documentarian']));
    expect(navigationAgent.allowedSurfaceTags).toEqual(expect.arrayContaining(['archives']));
    expect(navigationAgent.metadata.shift).toBe('evening');
    expect(interactionZone.promptAction).toBe('inspect');
    expect(interactionZone.prompt.toLowerCase()).toContain('review records');
  });

  it('throws for unknown archetype', () => {
    const factory = new NPCFactory({
      entityManager,
      componentRegistry,
    });

    expect(() => factory.create('unknown-template', { position: { x: 0, y: 0 } })).toThrow(
      /Unknown archetype/
    );
  });
});

