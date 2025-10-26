/**
 * Tests for Camera class
 */
import { Camera } from '../../../src/engine/renderer/Camera.js';

describe('Camera', () => {
  let camera;

  beforeEach(() => {
    camera = new Camera(0, 0, 800, 600);
  });

  describe('constructor', () => {
    it('should initialize with position and dimensions', () => {
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.width).toBe(800);
      expect(camera.height).toBe(600);
    });

    it('should initialize zoom to 1.0', () => {
      expect(camera.zoom).toBe(1.0);
    });

    it('should initialize follow properties', () => {
      expect(camera.followTarget).toBeNull();
      expect(camera.followSpeed).toBe(0.1);
      expect(camera.followOffsetX).toBe(0);
      expect(camera.followOffsetY).toBe(0);
    });

    it('should initialize shake properties', () => {
      expect(camera.shakeIntensity).toBe(0);
      expect(camera.shakeDecay).toBe(0.9);
      expect(camera.shakeOffsetX).toBe(0);
      expect(camera.shakeOffsetY).toBe(0);
    });
  });

  describe('follow', () => {
    it('should set follow target', () => {
      camera.follow(5, 0.2);
      expect(camera.followTarget).toBe(5);
      expect(camera.followSpeed).toBe(0.2);
    });

    it('should set follow offsets', () => {
      camera.follow(5, 0.2, 10, 20);
      expect(camera.followOffsetX).toBe(10);
      expect(camera.followOffsetY).toBe(20);
    });

    it('should clamp follow speed to 0-1', () => {
      camera.follow(5, -0.5);
      expect(camera.followSpeed).toBe(0);

      camera.follow(5, 1.5);
      expect(camera.followSpeed).toBe(1);
    });
  });

  describe('stopFollowing', () => {
    it('should clear follow target', () => {
      camera.follow(5);
      camera.stopFollowing();
      expect(camera.followTarget).toBeNull();
    });
  });

  describe('update', () => {
    it('should update following with smooth lerp', () => {
      camera.follow(5, 0.2);
      const getPosition = (entityId) => {
        if (entityId === 5) return { x: 800, y: 600 };
        return null;
      };

      camera.update(0.016, getPosition);

      // Camera should move towards target (centered)
      expect(camera.x).toBeGreaterThan(0);
      expect(camera.y).toBeGreaterThan(0);
    });

    it('should not update if no follow target', () => {
      const originalX = camera.x;
      const originalY = camera.y;

      camera.update(0.016, null);

      expect(camera.x).toBe(originalX);
      expect(camera.y).toBe(originalY);
    });

    it('should update shake and decay', () => {
      camera.shake(10);
      camera.update(0.016, null);

      expect(camera.shakeOffsetX).not.toBe(0);
      expect(camera.shakeOffsetY).not.toBe(0);

      const intensity1 = camera.shakeIntensity;

      camera.update(0.016, null);

      const intensity2 = camera.shakeIntensity;

      expect(intensity2).toBeLessThan(intensity1);
    });

    it('should stop shake when intensity is low', () => {
      camera.shakeIntensity = 0.05;
      camera.update(0.016, null);

      expect(camera.shakeIntensity).toBe(0);
      expect(camera.shakeOffsetX).toBe(0);
      expect(camera.shakeOffsetY).toBe(0);
    });
  });

  describe('shake', () => {
    it('should set shake intensity', () => {
      camera.shake(20);
      expect(camera.shakeIntensity).toBe(20);
    });

    it('should use max intensity if already shaking', () => {
      camera.shake(10);
      camera.shake(5);
      expect(camera.shakeIntensity).toBe(10);

      camera.shake(15);
      expect(camera.shakeIntensity).toBe(15);
    });

    it('should set shake decay', () => {
      camera.shake(10, 0.8);
      expect(camera.shakeDecay).toBe(0.8);
    });
  });

  describe('worldToScreen', () => {
    it('should convert world to screen coordinates', () => {
      camera.setPosition(100, 100);
      const screen = camera.worldToScreen(200, 200);

      expect(screen.x).toBe(100);
      expect(screen.y).toBe(100);
    });

    it('should apply zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2.0);
      const screen = camera.worldToScreen(100, 100);

      expect(screen.x).toBe(200);
      expect(screen.y).toBe(200);
    });

    it('should apply shake offset', () => {
      camera.setPosition(0, 0);
      camera.shakeOffsetX = 5;
      camera.shakeOffsetY = 10;
      const screen = camera.worldToScreen(100, 100);

      expect(screen.x).toBe(105);
      expect(screen.y).toBe(110);
    });
  });

  describe('screenToWorld', () => {
    it('should convert screen to world coordinates', () => {
      camera.setPosition(100, 100);
      const world = camera.screenToWorld(100, 100);

      expect(world.x).toBe(200);
      expect(world.y).toBe(200);
    });

    it('should apply zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2.0);
      const world = camera.screenToWorld(200, 200);

      expect(world.x).toBe(100);
      expect(world.y).toBe(100);
    });

    it('should apply shake offset', () => {
      camera.setPosition(0, 0);
      camera.shakeOffsetX = 5;
      camera.shakeOffsetY = 10;
      const world = camera.screenToWorld(105, 110);

      expect(world.x).toBe(100);
      expect(world.y).toBe(100);
    });
  });

  describe('contains', () => {
    it('should check if point is in viewport', () => {
      camera.setPosition(0, 0);
      expect(camera.contains(400, 300)).toBe(true);
      expect(camera.contains(900, 300)).toBe(false);
      expect(camera.contains(400, 700)).toBe(false);
    });

    it('should use margin', () => {
      camera.setPosition(0, 0);
      expect(camera.contains(850, 300, 100)).toBe(true);
      expect(camera.contains(950, 300, 100)).toBe(false);
    });

    it('should account for zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2.0);
      expect(camera.contains(400, 300)).toBe(true);
      expect(camera.contains(500, 300)).toBe(false);
    });
  });

  describe('containsRect', () => {
    it('should check if rectangle is visible', () => {
      camera.setPosition(0, 0);
      expect(camera.containsRect(400, 300, 32, 32)).toBe(true);
      expect(camera.containsRect(1000, 1000, 32, 32)).toBe(false);
    });

    it('should detect partial visibility', () => {
      camera.setPosition(0, 0);
      expect(camera.containsRect(790, 300, 32, 32)).toBe(true);
      expect(camera.containsRect(-20, 300, 32, 32)).toBe(true);
    });

    it('should account for zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2.0);
      // With 2x zoom, viewport is 400x300 in world space
      expect(camera.containsRect(350, 250, 32, 32)).toBe(true); // Within 400x300
      expect(camera.containsRect(450, 350, 32, 32)).toBe(false); // Outside 400x300
    });
  });

  describe('setPosition', () => {
    it('should set camera position', () => {
      camera.setPosition(100, 200);
      expect(camera.x).toBe(100);
      expect(camera.y).toBe(200);
    });
  });

  describe('move', () => {
    it('should move camera by offset', () => {
      camera.setPosition(100, 200);
      camera.move(50, -50);
      expect(camera.x).toBe(150);
      expect(camera.y).toBe(150);
    });
  });

  describe('setZoom', () => {
    it('should set zoom level', () => {
      camera.setZoom(2.0);
      expect(camera.zoom).toBe(2.0);
    });

    it('should clamp zoom to 0.1-10 range', () => {
      camera.setZoom(0.01);
      expect(camera.zoom).toBe(0.1);

      camera.setZoom(20);
      expect(camera.zoom).toBe(10);
    });
  });

  describe('getBounds', () => {
    it('should return camera bounds', () => {
      camera.setPosition(100, 200);
      const bounds = camera.getBounds();

      expect(bounds.x).toBe(100);
      expect(bounds.y).toBe(200);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
    });

    it('should account for zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2.0);
      const bounds = camera.getBounds();

      expect(bounds.width).toBe(400);
      expect(bounds.height).toBe(300);
    });
  });

  describe('getCenter', () => {
    it('should return camera center', () => {
      camera.setPosition(0, 0);
      const center = camera.getCenter();

      expect(center.x).toBe(400);
      expect(center.y).toBe(300);
    });

    it('should account for zoom', () => {
      camera.setPosition(0, 0);
      camera.setZoom(2.0);
      const center = camera.getCenter();

      expect(center.x).toBe(200);
      expect(center.y).toBe(150);
    });
  });
});
