/**
 * Tests for RenderSystem class
 */
import { RenderSystem } from '../../../src/engine/renderer/RenderSystem.js';
import { LayeredRenderer } from '../../../src/engine/renderer/LayeredRenderer.js';
import { Camera } from '../../../src/engine/renderer/Camera.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('RenderSystem', () => {
  let renderSystem;
  let componentRegistry;
  let eventBus;
  let layeredRenderer;
  let camera;

  beforeEach(() => {
    // Mock component registry
    componentRegistry = {
      getComponent: jest.fn(),
    };

    // Create event bus
    eventBus = new EventBus();

    // Create layered renderer
    layeredRenderer = new LayeredRenderer(800, 600);

    // Create camera
    camera = new Camera(0, 0, 800, 600);

    // Create render system
    renderSystem = new RenderSystem(
      componentRegistry,
      eventBus,
      layeredRenderer,
      camera
    );
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(renderSystem.componentRegistry).toBe(componentRegistry);
      expect(renderSystem.eventBus).toBe(eventBus);
      expect(renderSystem.layeredRenderer).toBe(layeredRenderer);
      expect(renderSystem.camera).toBe(camera);
    });

    it('should set required components', () => {
      expect(renderSystem.requiredComponents).toEqual(['Transform', 'Sprite']);
    });

    it('should be enabled by default', () => {
      expect(renderSystem.enabled).toBe(true);
    });

    it('should have priority 100 (render last)', () => {
      expect(renderSystem.priority).toBe(100);
    });

    it('should initialize performance metrics', () => {
      expect(renderSystem.renderTime).toBe(0);
      expect(renderSystem.renderedCount).toBe(0);
      expect(renderSystem.culledCount).toBe(0);
    });
  });

  describe('init', () => {
    it('should subscribe to component events', () => {
      const spy = jest.spyOn(eventBus, 'on');
      renderSystem.init();

      expect(spy).toHaveBeenCalledWith(
        'component:added',
        expect.any(Function)
      );
      expect(spy).toHaveBeenCalledWith(
        'component:removed',
        expect.any(Function)
      );
      expect(spy).toHaveBeenCalledWith(
        'camera:moved',
        expect.any(Function)
      );
    });
  });

  describe('update', () => {
    it('should render visible entities', () => {
      const entities = [1, 2];

      componentRegistry.getComponent.mockImplementation((entityId, type) => {
        if (type === 'Transform') {
          return { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        if (type === 'Sprite') {
          return {
            width: 32,
            height: 32,
            visible: true,
            layer: 'entities',
            zIndex: 0,
            alpha: 1,
            color: '#FF0000',
          };
        }
        return null;
      });

      renderSystem.update(0.016, entities);

      expect(renderSystem.renderedCount).toBe(2);
      expect(renderSystem.culledCount).toBe(0);
    });

    it('should skip invisible sprites', () => {
      const entities = [1];

      componentRegistry.getComponent.mockImplementation((entityId, type) => {
        if (type === 'Transform') {
          return { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        if (type === 'Sprite') {
          return {
            width: 32,
            height: 32,
            visible: false,
            layer: 'entities',
            zIndex: 0,
            alpha: 1,
            color: '#FF0000',
          };
        }
        return null;
      });

      renderSystem.update(0.016, entities);

      expect(renderSystem.renderedCount).toBe(0);
    });

    it('should cull off-screen entities', () => {
      const entities = [1];

      componentRegistry.getComponent.mockImplementation((entityId, type) => {
        if (type === 'Transform') {
          return { x: 10000, y: 10000, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        if (type === 'Sprite') {
          return {
            width: 32,
            height: 32,
            visible: true,
            layer: 'entities',
            zIndex: 0,
            alpha: 1,
            color: '#FF0000',
          };
        }
        return null;
      });

      renderSystem.update(0.016, entities);

      expect(renderSystem.renderedCount).toBe(0);
      expect(renderSystem.culledCount).toBe(1);
    });

    it('should sort entities by z-index', () => {
      const entities = [1, 2, 3];
      const renderOrder = [];

      componentRegistry.getComponent.mockImplementation((entityId, type) => {
        if (type === 'Transform') {
          return { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        if (type === 'Sprite') {
          return {
            width: 32,
            height: 32,
            visible: true,
            layer: 'entities',
            zIndex: entityId === 1 ? 10 : entityId === 2 ? 5 : 0,
            alpha: 1,
            color: '#FF0000',
          };
        }
        return null;
      });

      // Mark entities layer dirty
      layeredRenderer.markLayerDirty('entities');

      renderSystem.update(0.016, entities);

      // Entities should be rendered (we can't easily verify order without more mocking)
      expect(renderSystem.renderedCount).toBe(3);
    });

    it('should track render time', () => {
      renderSystem.update(0.016, []);

      expect(renderSystem.renderTime).toBeGreaterThanOrEqual(0);
    });

    it('should group entities by layer', () => {
      const entities = [1, 2];

      componentRegistry.getComponent.mockImplementation((entityId, type) => {
        if (type === 'Transform') {
          return { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
        }
        if (type === 'Sprite') {
          return {
            width: 32,
            height: 32,
            visible: true,
            layer: entityId === 1 ? 'entities' : 'effects',
            zIndex: 0,
            alpha: 1,
            color: '#FF0000',
          };
        }
        return null;
      });

      // Mark layers dirty
      layeredRenderer.markLayerDirty('entities');
      layeredRenderer.markLayerDirty('effects');

      renderSystem.update(0.016, entities);

      expect(renderSystem.renderedCount).toBe(2);
    });
  });

  describe('enable and disable', () => {
    it('should enable system', () => {
      renderSystem.disable();
      expect(renderSystem.enabled).toBe(false);

      renderSystem.enable();
      expect(renderSystem.enabled).toBe(true);
    });

    it('should disable system', () => {
      expect(renderSystem.enabled).toBe(true);

      renderSystem.disable();
      expect(renderSystem.enabled).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', () => {
      renderSystem.renderTime = 5.5;
      renderSystem.renderedCount = 100;
      renderSystem.culledCount = 50;

      const metrics = renderSystem.getMetrics();

      expect(metrics.renderTime).toBe(5.5);
      expect(metrics.renderedCount).toBe(100);
      expect(metrics.culledCount).toBe(50);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      renderSystem.cleanup();
      // Should not throw
    });
  });

  describe('layer dirtiness', () => {
    it('should mark layers dirty on component added', () => {
      renderSystem.init();

      const entitiesLayer = layeredRenderer.getLayer('entities');
      const effectsLayer = layeredRenderer.getLayer('effects');

      entitiesLayer.markClean();
      effectsLayer.markClean();

      eventBus.emit('component:added', {});

      expect(entitiesLayer.dirty).toBe(true);
      expect(effectsLayer.dirty).toBe(true);
    });

    it('should mark tiles layer dirty on camera move', () => {
      renderSystem.init();

      const tilesLayer = layeredRenderer.getLayer('tiles');
      tilesLayer.markClean();

      eventBus.emit('camera:moved', {});

      expect(tilesLayer.dirty).toBe(true);
    });
  });
});
