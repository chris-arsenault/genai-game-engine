import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { Camera } from '../../../src/engine/renderer/Camera.js';
import { CameraFollowSystem } from '../../../src/game/systems/CameraFollowSystem.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { PlayerController } from '../../../src/game/components/PlayerController.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';

function createWorld() {
  const eventBus = new EventBus();
  const entityManager = new EntityManager();
  const componentRegistry = new ComponentRegistry(entityManager);

  return { eventBus, entityManager, componentRegistry };
}

describe('CameraFollowSystem', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let camera;
  let system;
  let entityId;
  let transform;
  let controller;
  let emitSpy;
  let originalCameraConfig;

  beforeEach(() => {
    ({ eventBus, entityManager, componentRegistry } = createWorld());
    emitSpy = jest.spyOn(eventBus, 'emit');

    camera = new Camera(0, 0, 320, 180);
    system = new CameraFollowSystem(componentRegistry, eventBus, camera);

    entityId = entityManager.createEntity();
    transform = new Transform(0, 0);
    controller = new PlayerController();
    componentRegistry.addComponent(entityId, 'Transform', transform);
    componentRegistry.addComponent(entityId, 'PlayerController', controller);

    originalCameraConfig = { ...GameConfig.camera };
  });

  afterEach(() => {
    Object.assign(GameConfig.camera, originalCameraConfig);
    emitSpy.mockRestore();
  });

  it('centers on the player position with look-ahead when movement velocity is present', () => {
    Object.assign(GameConfig.camera, {
      followSpeed: 1,
      lookAheadDistance: 120,
      deadzone: 0,
    });

    transform.x = 512;
    transform.y = 384;
    controller.velocityX = 100;
    controller.velocityY = 0;

    system.update(1 / 60, [entityId]);

    expect(camera.x).toBe(472);
    expect(camera.y).toBe(294);
    expect(emitSpy).toHaveBeenCalledWith('camera:moved', {
      x: 472,
      y: 294,
    });
  });

  it('does not shift camera when player remains inside the configured deadzone', () => {
    Object.assign(GameConfig.camera, {
      followSpeed: 0.75,
      lookAheadDistance: 0,
      deadzone: 50,
    });

    camera.x = 90;
    camera.y = 200;
    transform.x = camera.x + camera.width / 2 + 10;
    transform.y = camera.y + camera.height / 2;

    system.update(1 / 60, [entityId]);

    expect(camera.x).toBe(90);
    expect(camera.y).toBe(200);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('applies follow speed smoothing based on GameConfig.camera.followSpeed', () => {
    Object.assign(GameConfig.camera, {
      followSpeed: 0.25,
      lookAheadDistance: 0,
      deadzone: 0,
    });

    transform.x = 320;
    transform.y = 180;

    system.update(1 / 60, [entityId]);

    expect(camera.x).toBe(40);
    expect(camera.y).toBe(23);
    expect(emitSpy).toHaveBeenCalledWith('camera:moved', {
      x: 40,
      y: 23,
    });
  });
});
