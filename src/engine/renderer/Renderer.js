/**
 * Renderer - main rendering coordinator with layered rendering.
 * Performance: Target <8ms per frame.
 * TODO: Add dirty rectangle optimization for static layers.
 */
import { Layer } from './Layer.js';
import { Camera } from './Camera.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.camera = new Camera(0, 0, this.width, this.height);
    this.layers = new Map();
    this._initLayers();
  }

  _initLayers() {
    const layerConfigs = [
      { name: 'background', zIndex: 0 },
      { name: 'tiles', zIndex: 1 },
      { name: 'entities', zIndex: 2 },
      { name: 'effects', zIndex: 3 },
      { name: 'ui', zIndex: 4 }
    ];

    layerConfigs.forEach(config => {
      const layer = new Layer(config.name, this.width, this.height, config.zIndex);
      this.layers.set(config.name, layer);
    });
  }

  getLayer(name) {
    return this.layers.get(name);
  }

  render(componentRegistry) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const sortedLayers = Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (!layer.visible) {
        continue;
      }

      this.ctx.globalAlpha = layer.opacity;
      this.ctx.drawImage(layer.canvas, 0, 0);
      this.ctx.globalAlpha = 1.0;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const layer of this.layers.values()) {
      layer.clear();
    }
  }
}
