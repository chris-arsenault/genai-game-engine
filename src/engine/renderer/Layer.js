/**
 * Layer - represents a rendering layer with offscreen canvas.
 * Layers enable efficient partial redraws (only redraw changed layers).
 */
export class Layer {
  constructor(name, width, height, zIndex = 0) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.zIndex = zIndex;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.dirty = true;
    this.visible = true;
    this.opacity = 1.0;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  markDirty() {
    this.dirty = true;
  }

  markClean() {
    this.dirty = false;
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }
}
