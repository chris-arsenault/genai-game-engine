import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { PlayerAnimationSystem } from '../../../src/game/systems/PlayerAnimationSystem.js';
import { PlayerController } from '../../../src/game/components/PlayerController.js';
import { AnimatedSprite } from '../../../src/game/components/AnimatedSprite.js';
import { Sprite } from '../../../src/game/components/Sprite.js';

function createTestWorld() {
  const eventBus = new EventBus();
  const entityManager = new EntityManager();
  const componentRegistry = new ComponentRegistry(entityManager);
  return { eventBus, entityManager, componentRegistry };
}

describe('PlayerAnimationSystem', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let inputState;
  let system;
  let entityId;
  let controller;
  let animatedSprite;

  beforeEach(() => {
    ({ eventBus, entityManager, componentRegistry } = createTestWorld());

    const pressedQueue = [];
    let moveDownPressed = false;
    let movementPressed = false;

    inputState = {
      wasJustPressed: jest.fn((action) => {
        if (action !== 'dodge') {
          return false;
        }
        return pressedQueue.shift() === true;
      }),
      isPressed: jest.fn((action) => {
        if (action === 'moveDown') {
          return moveDownPressed;
        }
        if (action === 'moveLeft' || action === 'moveRight' || action === 'moveUp' || action === 'moveDown') {
          return movementPressed;
        }
        return false;
      }),
      __pressDodge() {
        pressedQueue.push(true);
      },
      __clearDodge() {
        pressedQueue.length = 0;
      },
      __setMoveDown(value) {
        moveDownPressed = value;
      },
      __setMovement(value) {
        movementPressed = value;
      },
    };

    system = new PlayerAnimationSystem(componentRegistry, eventBus, inputState);

    entityId = entityManager.createEntity();

    controller = new PlayerController();
    componentRegistry.addComponent(entityId, 'PlayerController', controller);
    componentRegistry.addComponent(entityId, 'Sprite', new Sprite({ width: 32, height: 32 }));

    animatedSprite = new AnimatedSprite({
      frameWidth: 32,
      frameHeight: 32,
      defaultAnimation: 'idleDown',
      animations: {
        idleDown: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 0 })),
          loop: true,
        },
        walkDown: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 1 })),
          loop: true,
          frameDuration: 0.12,
        },
        runDown: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 2 })),
          loop: true,
          frameDuration: 0.08,
        },
        idleRight: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 3 })),
          loop: true,
        },
        walkRight: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 4 })),
          loop: true,
        },
        runRight: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 5 })),
          loop: true,
        },
        dash: {
          frames: Array.from({ length: 8 }, (_, index) => ({ col: index, row: 6 })),
          loop: false,
          frameDuration: 0.05,
          next: 'idleDown',
        },
        dashLoop: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 6 })),
          loop: true,
          frameDuration: 0.05,
        },
        slide: {
          frames: Array.from({ length: 8 }, (_, index) => ({ col: index, row: 7 })),
          loop: false,
          frameDuration: 0.05,
          next: 'idleDown',
        },
        idle: {
          frames: Array.from({ length: 6 }, (_, index) => ({ col: index, row: 0 })),
          loop: true,
        },
      },
    });

    componentRegistry.addComponent(entityId, 'AnimatedSprite', animatedSprite);

    // Expose helpers on test context
    system.__inputHelpers = inputState;
  });

  it('plays slide animation when dodge is pressed while moving down', () => {
    system.__inputHelpers.__setMoveDown(true);
    system.__inputHelpers.__pressDodge();

    system.update(0.016, [entityId]);

    expect(animatedSprite.currentAnimation).toBe('slide');
    expect(animatedSprite.playing).toBe(true);
  });

  it('returns to idle after slide animation completes', () => {
    system.__inputHelpers.__setMoveDown(true);
    system.__inputHelpers.__pressDodge();
    system.update(0.016, [entityId]);

    // Simulate animation completing.
    animatedSprite.playing = false;

    system.update(0.016, [entityId]);

    expect(animatedSprite.currentAnimation).toBe('idleDown');
    expect(animatedSprite.playing).toBe(false);
  });

  it('plays run animation when player velocity exceeds run threshold', () => {
    controller.velocityX = controller.moveSpeed;
    controller.velocityY = 0;
    controller.facingDirection = 'right';

    system.update(0.016, [entityId]);

    expect(animatedSprite.currentAnimation).toBe('runRight');
    expect(animatedSprite.playing).toBe(true);
  });

  it('plays idle animation when player is stationary', () => {
    controller.velocityX = 0;
    controller.velocityY = 0;
    controller.facingDirection = 'down';

    system.update(0.016, [entityId]);

    expect(animatedSprite.currentAnimation).toBe('idleDown');
    expect(animatedSprite.playing).toBe(false);
  });
});
