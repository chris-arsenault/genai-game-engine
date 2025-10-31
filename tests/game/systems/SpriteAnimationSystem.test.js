import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { SpriteAnimationSystem } from '../../../src/game/systems/SpriteAnimationSystem.js';
import { AnimatedSprite } from '../../../src/game/components/AnimatedSprite.js';
import { Sprite } from '../../../src/game/components/Sprite.js';

function createWorld() {
  const eventBus = new EventBus();
  const entityManager = new EntityManager();
  const componentRegistry = new ComponentRegistry(entityManager);
  return { eventBus, entityManager, componentRegistry };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('SpriteAnimationSystem', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let assetLoader;
  let system;
  let entityId;
  let animatedSprite;
  let sprite;
  let fakeImage;

  beforeEach(() => {
    ({ eventBus, entityManager, componentRegistry } = createWorld());
    fakeImage = { complete: true };
    assetLoader = {
      loadImage: jest.fn(() => Promise.resolve(fakeImage)),
    };
    system = new SpriteAnimationSystem(componentRegistry, eventBus, { assetLoader });

    entityId = entityManager.createEntity();
    sprite = new Sprite({ width: 32, height: 32 });
    animatedSprite = new AnimatedSprite({
      frameWidth: 32,
      frameHeight: 32,
      imageUrl: '/test-runner-sprite.png',
      defaultAnimation: 'run',
      animations: {
        run: {
          frames: [
            { col: 0, row: 0 },
            { col: 1, row: 0 },
          ],
          loop: true,
          frameDuration: 0.05,
        },
        dash: {
          frames: [
            { col: 0, row: 1 },
            { col: 1, row: 1 },
          ],
          loop: false,
          frameDuration: 0.05,
          next: 'run',
        },
      },
    });

    componentRegistry.addComponent(entityId, 'AnimatedSprite', animatedSprite);
    componentRegistry.addComponent(entityId, 'Sprite', sprite);
  });

  it('loads sprite sheet and applies source rectangle', async () => {
    system.update(0.016, [entityId]);
    await flushPromises();
    system.update(0.016, [entityId]);

    expect(assetLoader.loadImage).toHaveBeenCalledWith('/test-runner-sprite.png');
    expect(sprite.image).toBe(fakeImage);
    expect(sprite.sourceX).toBe(0);
    expect(sprite.sourceY).toBe(0);
    expect(sprite.sourceWidth).toBe(32);
    expect(sprite.sourceHeight).toBe(32);
  });

  it('advances frames and stops one-shot animations', async () => {
    system.update(0.016, [entityId]);
    await flushPromises();

    // Advance run animation
    system.update(0.06, [entityId]);
    expect(animatedSprite.currentFrameIndex).toBe(1);

    animatedSprite.play('dash', { force: true });
    system.update(0.12, [entityId]);

    expect(animatedSprite.currentAnimation).toBe('run');
    expect(animatedSprite.playing).toBe(true);
    expect(animatedSprite.currentFrameIndex).toBe(0);
  });
});
