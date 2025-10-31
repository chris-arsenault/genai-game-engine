/**
 * Sprite Component
 *
 * Visual representation component for rendering entities.
 *
 * @property {string|HTMLImageElement} image - Image reference or placeholder color
 * @property {number} width - Sprite width in pixels
 * @property {number} height - Sprite height in pixels
 * @property {string} layer - Render layer (background, tiles, entities, effects, ui_world, ui_screen)
 * @property {number} zIndex - Sort order within layer (higher = drawn later)
 * @property {boolean} visible - Whether sprite should be rendered
 * @property {number} alpha - Opacity (0.0 to 1.0)
 * @property {string} color - Fallback color if no image (e.g., "#FF0000")
 * @property {?number} sourceX - Source X coordinate within the sprite image (pixels)
 * @property {?number} sourceY - Source Y coordinate within the sprite image (pixels)
 * @property {?number} sourceWidth - Source width within the sprite image (pixels)
 * @property {?number} sourceHeight - Source height within the sprite image (pixels)
 */
export class Sprite {
  constructor({
    image = null,
    width = 32,
    height = 32,
    layer = 'entities',
    zIndex = 0,
    visible = true,
    alpha = 1.0,
    color = '#FFFFFF',
    sourceX = null,
    sourceY = null,
    sourceWidth = null,
    sourceHeight = null,
  } = {}) {
    this.image = image;
    this.width = width;
    this.height = height;
    this.layer = layer;
    this.zIndex = zIndex;
    this.visible = visible;
    this.alpha = alpha;
    this.color = color;
    this.sourceX = sourceX;
    this.sourceY = sourceY;
    this.sourceWidth = sourceWidth;
    this.sourceHeight = sourceHeight;
  }

  /**
   * Show sprite
   */
  show() {
    this.visible = true;
  }

  /**
   * Hide sprite
   */
  hide() {
    this.visible = false;
  }

  /**
   * Set opacity
   * @param {number} alpha - Opacity (0.0 to 1.0)
   */
  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}
