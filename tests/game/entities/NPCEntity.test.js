import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { createNPCEntity } from '../../../src/game/entities/NPCEntity.js';
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

async function hydrateSprite(componentRegistry, entityId) {
  const sprite = componentRegistry.getComponent(entityId, 'Sprite');
  if (sprite?.assetLoadPromise) {
    await sprite.assetLoadPromise;
  }
  return sprite;
}

describe('NPCEntity', () => {
  let assetManager;

  beforeEach(() => {
    assetManager = createStubAssetManager();
    registerGlobalAssetManager(assetManager);
  });

  afterEach(() => {
    resetGlobalAssetManager();
    clearSpriteAssetCache();
  });

  test('assigns civilian sprite variants', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createNPCEntity(entityManager, componentRegistry, {
      id: 'npc_civilian_alpha',
      name: 'Market Goer',
      faction: 'civilian',
    });

    const sprite = await hydrateSprite(componentRegistry, entityId);
    const npcComponent = componentRegistry.getComponent(entityId, 'NPC');

    expect(sprite.imageSource).toMatch(/civilian-\d{2}\.png$/);
    expect(npcComponent.appearanceId).toMatch(/^ar-004::civilian::\d{2}$/);
  });

  test('maps police faction to guard sprite variants', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createNPCEntity(entityManager, componentRegistry, {
      id: 'npc_guard_beta',
      name: 'Patrol Officer',
      faction: 'police',
    });

    const sprite = await hydrateSprite(componentRegistry, entityId);
    const npcComponent = componentRegistry.getComponent(entityId, 'NPC');

    expect(sprite.imageSource).toMatch(/guard-\d{2}\.png$/);
    expect(npcComponent.appearanceId).toMatch(/^ar-004::guard::\d{2}$/);
  });

  test('applies behavior metadata and dialogue variants when provided', async () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createNPCEntity(entityManager, componentRegistry, {
      id: 'npc_vendor',
      name: 'Vendor',
      faction: 'civilian',
      behaviorProfile: 'vendor',
      archetype: 'civilian',
      tags: ['vendor'],
      factionTags: ['merchant'],
      hasDialogue: true,
      dialogueVariants: {
        default: 'vendor_dialogue',
        friendly: 'vendor_dialogue_friendly'
      },
      interactionPrompt: 'trade with Vendor',
      navigationAgent: {
        allowedSurfaceTags: ['market'],
        metadata: { schedule: 'stall' }
      }
    });

    const factionComponent = componentRegistry.getComponent(entityId, 'Faction');
    const npcComponent = componentRegistry.getComponent(entityId, 'NPC');
    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');
    const navigationAgent = componentRegistry.getComponent(entityId, 'NavigationAgent');

    expect(factionComponent.behaviorProfile).toBe('vendor');
    expect(factionComponent.tags).toEqual(expect.arrayContaining(['merchant']));
    expect(npcComponent.behaviorProfile).toBe('vendor');
    expect(npcComponent.tags).toEqual(expect.arrayContaining(['vendor']));
    expect(npcComponent.dialogue.default).toBe('vendor_dialogue');
    expect(npcComponent.dialogue.friendly).toBe('vendor_dialogue_friendly');
    expect(interactionZone.prompt.toLowerCase()).toContain('trade with vendor');
    expect(navigationAgent.metadata.behaviorProfile).toBe('vendor');
    expect(navigationAgent.metadata.role).toBe('npc');
  });
});
