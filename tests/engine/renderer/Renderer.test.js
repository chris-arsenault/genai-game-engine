/**
 * Tests for Renderer class
 */
import { Renderer } from '../../../src/engine/renderer/Renderer.js';
import { Camera } from '../../../src/engine/renderer/Camera.js';
import {describe} from "@jest/globals";
import {ComponentRegistry} from "../../../src/engine/ecs/ComponentRegistry.js";

describe('Renderer', () => {
  let canvas;
  let renderer;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    renderer = new Renderer(canvas);
  });

  afterEach(() => {
    if (renderer.resizeObserver) {
      renderer.cleanup();
    }
  });

  describe('constructor', () => {
    it('should initialize with canvas dimensions', () => {
      expect(renderer.width).toBe(800);
      expect(renderer.height).toBe(600);
      expect(renderer.canvas).toBe(canvas);
    });

    it('should create a camera with canvas dimensions', () => {
      expect(renderer.camera).toBeInstanceOf(Camera);
      expect(renderer.camera.width).toBe(800);
      expect(renderer.camera.height).toBe(600);
    });

    it('should disable image smoothing by default', () => {
      expect(renderer.imageSmoothing).toBe(false);
      expect(renderer.ctx.imageSmoothingEnabled).toBe(false);
    });

    it('should set default clear color', () => {
      expect(renderer.clearColor).toBe('#000000');
    });

    it('should initialize performance metrics', () => {
      expect(renderer.frameTime).toBe(0);
      expect(renderer.renderTime).toBe(0);
      expect(renderer.lastFrameStart).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear canvas with clear color', () => {
      const spy = jest.spyOn(renderer.ctx, 'fillRect');
      renderer.clear();
      expect(spy).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(renderer.ctx.fillStyle).toBe('#000000');
    });
  });

  describe('beginFrame and endFrame', () => {
    it('should track frame timing', () => {
      const startTime = renderer.beginFrame();
      expect(startTime).toBeGreaterThan(0);
      expect(renderer.lastFrameStart).toBe(startTime);

      // Simulate some work
      const wait = Date.now() + 5;
      while (Date.now() < wait) {}

      renderer.endFrame();
      expect(renderer.renderTime).toBeGreaterThan(0);
      expect(renderer.frameTime).toBe(renderer.renderTime);
    });
  });

  describe('getCamera', () => {
    it('should return camera instance', () => {
      const camera = renderer.getCamera();
      expect(camera).toBe(renderer.camera);
    });
  });

  describe('setClearColor', () => {
    it('should update clear color', () => {
      renderer.setClearColor('#FF0000');
      expect(renderer.clearColor).toBe('#FF0000');
    });
  });

  describe('setImageSmoothing', () => {
    it('should enable image smoothing', () => {
      renderer.setImageSmoothing(true);
      expect(renderer.imageSmoothing).toBe(true);
      expect(renderer.ctx.imageSmoothingEnabled).toBe(true);
    });

    it('should disable image smoothing', () => {
      renderer.setImageSmoothing(false);
      expect(renderer.imageSmoothing).toBe(false);
      expect(renderer.ctx.imageSmoothingEnabled).toBe(false);
    });
  });

  describe('getRenderTime', () => {
    it('should return render time', () => {
      renderer.renderTime = 5.5;
      expect(renderer.getRenderTime()).toBe(5.5);
    });
  });

  describe('worldToScreen', () => {
    it('should delegate to camera', () => {
      const spy = jest.spyOn(renderer.camera, 'worldToScreen');
      renderer.worldToScreen(100, 200);
      expect(spy).toHaveBeenCalledWith(100, 200);
    });
  });

  describe('screenToWorld', () => {
    it('should delegate to camera', () => {
      const spy = jest.spyOn(renderer.camera, 'screenToWorld');
      renderer.screenToWorld(100, 200);
      expect(spy).toHaveBeenCalledWith(100, 200);
    });
  });

  describe('isVisible', () => {
    it('should check if position is visible', () => {
      renderer.camera.setPosition(0, 0);
      expect(renderer.isVisible(400, 300)).toBe(true);
      expect(renderer.isVisible(1000, 1000)).toBe(false);
    });

    it('should use margin parameter', () => {
      renderer.camera.setPosition(0, 0);
      expect(renderer.isVisible(850, 300, 100)).toBe(true);
      expect(renderer.isVisible(950, 300, 100)).toBe(false);
    });
  });

  describe('isRectVisible', () => {
    it('should check if rectangle is visible', () => {
      renderer.camera.setPosition(0, 0);
      expect(renderer.isRectVisible(400, 300, 32, 32)).toBe(true);
      expect(renderer.isRectVisible(1000, 1000, 32, 32)).toBe(false);
    });

    it('should detect partial visibility', () => {
      renderer.camera.setPosition(0, 0);
      // Rectangle partially outside viewport
      expect(renderer.isRectVisible(790, 300, 32, 32)).toBe(true);
    });
  });

  describe('updateCamera', () => {
    it('should update camera', () => {
      const spy = jest.spyOn(renderer.camera, 'update');
      const getPosition = jest.fn();
      renderer.updateCamera(0.016, getPosition);
      expect(spy).toHaveBeenCalledWith(0.016, getPosition);
    });
  });

  describe('handleResize', () => {
    it('should update dimensions on resize', () => {
      canvas.width = 1024;
      canvas.height = 768;
      renderer.handleResize();

      expect(renderer.width).toBe(1024);
      expect(renderer.height).toBe(768);
      expect(renderer.camera.width).toBe(1024);
      expect(renderer.camera.height).toBe(768);
    });
  });

  describe('render', () => {
    it('should render the scene', () => {
      const scene = renderer.render(null);
      expect(scene).toBeDefined();
    })
  });

  describe('cleanup', () => {
    it('should disconnect resize observer', () => {
      if (renderer.resizeObserver) {
        const spy = jest.spyOn(renderer.resizeObserver, 'disconnect');
        renderer.cleanup();
        expect(spy).toHaveBeenCalled();
      }
    });
  });
});
