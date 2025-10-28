/**
 * Tests for LayeredRenderer class
 */
import { LayeredRenderer } from '../../../src/engine/renderer/LayeredRenderer.js';
import { Layer } from '../../../src/engine/renderer/Layer.js';

describe('LayeredRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new LayeredRenderer(800, 600);
  });

  describe('constructor', () => {
    it('should initialize with dimensions', () => {
      expect(renderer.width).toBe(800);
      expect(renderer.height).toBe(600);
    });

    it('should create standard layers', () => {
      expect(renderer.getLayer('background')).toBeInstanceOf(Layer);
      expect(renderer.getLayer('ground')).toBeInstanceOf(Layer);
      expect(renderer.getLayer('tiles')).toBeInstanceOf(Layer);
      expect(renderer.getLayer('environment')).toBeInstanceOf(Layer);
      expect(renderer.getLayer('entities')).toBeInstanceOf(Layer);
      expect(renderer.getLayer('effects')).toBeInstanceOf(Layer);
      expect(renderer.getLayer('ui')).toBeInstanceOf(Layer);
    });

    it('should create layers with correct z-index', () => {
      expect(renderer.getLayer('background').zIndex).toBe(0);
      expect(renderer.getLayer('ground').zIndex).toBe(1);
      expect(renderer.getLayer('tiles').zIndex).toBe(2);
      expect(renderer.getLayer('environment').zIndex).toBe(3);
      expect(renderer.getLayer('entities').zIndex).toBe(4);
      expect(renderer.getLayer('effects').zIndex).toBe(5);
      expect(renderer.getLayer('ui').zIndex).toBe(6);
    });
  });

  describe('getLayer', () => {
    it('should return layer by name', () => {
      const layer = renderer.getLayer('entities');
      expect(layer).toBeInstanceOf(Layer);
      expect(layer.name).toBe('entities');
    });

    it('should return undefined for non-existent layer', () => {
      expect(renderer.getLayer('nonexistent')).toBeUndefined();
    });
  });

  describe('addLayer', () => {
    it('should add custom layer', () => {
      const layer = renderer.addLayer('custom', 10);
      expect(layer).toBeInstanceOf(Layer);
      expect(layer.name).toBe('custom');
      expect(layer.zIndex).toBe(10);
      expect(renderer.getLayer('custom')).toBe(layer);
    });

    it('should throw if layer already exists', () => {
      expect(() => {
        renderer.addLayer('entities', 5);
      }).toThrow('Layer "entities" already exists');
    });
  });

  describe('removeLayer', () => {
    it('should remove layer', () => {
      expect(renderer.removeLayer('effects')).toBe(true);
      expect(renderer.getLayer('effects')).toBeUndefined();
    });

    it('should return false if layer does not exist', () => {
      expect(renderer.removeLayer('nonexistent')).toBe(false);
    });
  });

  describe('markLayerDirty', () => {
    it('should mark layer as dirty', () => {
      const layer = renderer.getLayer('entities');
      layer.markClean();
      expect(layer.dirty).toBe(false);

      renderer.markLayerDirty('entities');
      expect(layer.dirty).toBe(true);
    });

    it('should do nothing for non-existent layer', () => {
      renderer.markLayerDirty('nonexistent');
      // Should not throw
    });
  });

  describe('markAllLayersDirty', () => {
    it('should mark all layers as dirty', () => {
      // Mark all clean first
      for (const layer of renderer.layers.values()) {
        layer.markClean();
      }

      renderer.markAllLayersDirty();

      for (const layer of renderer.layers.values()) {
        expect(layer.dirty).toBe(true);
      }
    });
  });

  describe('clearLayer', () => {
    it('should clear specific layer', () => {
      const layer = renderer.getLayer('entities');
      const spy = jest.spyOn(layer, 'clear');

      renderer.clearLayer('entities');

      expect(spy).toHaveBeenCalled();
    });

    it('should do nothing for non-existent layer', () => {
      renderer.clearLayer('nonexistent');
      // Should not throw
    });
  });

  describe('clearAllLayers', () => {
    it('should clear all layers', () => {
      const spies = [];
      for (const layer of renderer.layers.values()) {
        spies.push(jest.spyOn(layer, 'clear'));
      }

      renderer.clearAllLayers();

      for (const spy of spies) {
        expect(spy).toHaveBeenCalled();
      }
    });
  });

  describe('composite', () => {
    it('should composite all visible layers in z-order', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      const spy = jest.spyOn(ctx, 'drawImage');

      renderer.composite(ctx);

      // Should draw 7 layers in order
      expect(spy).toHaveBeenCalledTimes(7);
    });

    it('should skip invisible layers', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      renderer.getLayer('entities').visible = false;

      const spy = jest.spyOn(ctx, 'drawImage');

      renderer.composite(ctx);

      // Should draw 6 layers (skipping entities)
      expect(spy).toHaveBeenCalledTimes(6);
    });

    it('should apply layer opacity', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      renderer.getLayer('entities').setOpacity(0.5);

      renderer.composite(ctx);

      // globalAlpha should be reset to 1.0 after each layer
      expect(ctx.globalAlpha).toBe(1.0);
    });
  });

  describe('renderToLayer', () => {
    it('should render to layer with callback', () => {
      const callback = jest.fn();
      const layer = renderer.getLayer('entities');
      layer.markDirty();

      renderer.renderToLayer('entities', callback);

      expect(callback).toHaveBeenCalledWith(layer.ctx, layer);
      expect(layer.dirty).toBe(false);
    });

    it('should clear layer if dirty', () => {
      const layer = renderer.getLayer('entities');
      layer.markDirty();

      const spy = jest.spyOn(layer, 'clear');

      renderer.renderToLayer('entities', () => {});

      expect(spy).toHaveBeenCalled();
    });

    it('should not render to invisible layer', () => {
      const callback = jest.fn();
      renderer.getLayer('entities').visible = false;

      renderer.renderToLayer('entities', callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not render to non-existent layer', () => {
      const callback = jest.fn();
      renderer.renderToLayer('nonexistent', callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('resize', () => {
    it('should resize all layers', () => {
      renderer.resize(1024, 768);

      expect(renderer.width).toBe(1024);
      expect(renderer.height).toBe(768);

      for (const layer of renderer.layers.values()) {
        expect(layer.width).toBe(1024);
        expect(layer.height).toBe(768);
        expect(layer.canvas.width).toBe(1024);
        expect(layer.canvas.height).toBe(768);
      }
    });

    it('should mark all layers as dirty', () => {
      // Mark all clean
      for (const layer of renderer.layers.values()) {
        layer.markClean();
      }

      renderer.resize(1024, 768);

      for (const layer of renderer.layers.values()) {
        expect(layer.dirty).toBe(true);
      }
    });
  });

  describe('getLayerNames', () => {
    it('should return all layer names', () => {
      const names = renderer.getLayerNames();
      expect(names).toContain('background');
      expect(names).toContain('ground');
      expect(names).toContain('tiles');
      expect(names).toContain('environment');
      expect(names).toContain('entities');
      expect(names).toContain('effects');
      expect(names).toContain('ui');
    });
  });

  describe('getSortedLayers', () => {
    it('should return layers sorted by z-index', () => {
      const sorted = renderer.getSortedLayers();
      expect(sorted[0].name).toBe('background');
      expect(sorted[1].name).toBe('ground');
      expect(sorted[2].name).toBe('tiles');
      expect(sorted[3].name).toBe('environment');
      expect(sorted[4].name).toBe('entities');
      expect(sorted[5].name).toBe('effects');
      expect(sorted[6].name).toBe('ui');
    });
  });

  describe('getDirtyLayerCount', () => {
    it('should count dirty layers', () => {
      // All layers start dirty
      expect(renderer.getDirtyLayerCount()).toBe(7);

      // Mark some clean
      renderer.getLayer('background').markClean();
      renderer.getLayer('ground').markClean();
      renderer.getLayer('tiles').markClean();

      expect(renderer.getDirtyLayerCount()).toBe(4);
    });
  });

  describe('getLayerCount', () => {
    it('should return total layer count', () => {
      expect(renderer.getLayerCount()).toBe(7);

      renderer.addLayer('custom', 10);
      expect(renderer.getLayerCount()).toBe(8);

      renderer.removeLayer('custom');
      expect(renderer.getLayerCount()).toBe(7);
    });
  });
});
