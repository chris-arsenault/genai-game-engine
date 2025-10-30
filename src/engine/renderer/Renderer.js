/**
 * Renderer - main rendering coordinator with performance tracking.
 *
 * Manages canvas, camera, and delegates layer rendering to LayeredRenderer.
 * Tracks frame timing to ensure <8ms rendering budget.
 *
 * Performance target: <8ms per frame for rendering.
 *
 * @class Renderer
 */
import { Camera } from './Camera.js';
import { LayeredRenderer } from './LayeredRenderer.js';

export class Renderer {
  /**
   * Creates a new renderer.
   * @param {HTMLCanvasElement} canvas - Main rendering canvas
   * @param {Object} [options]
   * @param {boolean} [options.responsive=true] - Resize canvas with window/client size
   * @param {string} [options.clearColor='#000000'] - Default clear color
   * @param {number} [options.defaultWidth=1280] - Fallback width when no client metrics
   * @param {number} [options.defaultHeight=720] - Fallback height when no client metrics
   */
  constructor(canvas, options = {}) {
    if (!canvas) {
      throw new Error('Renderer requires a canvas element');
    }

    const {
      responsive = true,
      clearColor = '#000000',
      defaultWidth = 1280,
      defaultHeight = 720,
    } = options;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    if (!this.ctx) {
      throw new Error('Renderer failed to acquire 2D rendering context');
    }

    this.options = {
      responsive,
      clearColor,
      defaultWidth,
      defaultHeight,
    };

    const { width: initialWidth, height: initialHeight } =
      this._resolveCanvasDimensions();

    this.canvas.width = initialWidth;
    this.canvas.height = initialHeight;

    this.width = initialWidth;
    this.height = initialHeight;

    // Camera for world-to-screen transformation
    this.camera = new Camera(0, 0, this.width, this.height);

    // Delegate per-layer drawing to the layered renderer
    this.layeredRenderer = new LayeredRenderer(this.width, this.height);

    // Performance tracking
    this.frameTime = 0;
    this.renderTime = 0;
    this.lastFrameStart = 0;

    // Rendering options
    this.clearColor = clearColor;
    this.imageSmoothing = false; // Pixel art friendly

    // Configure context for pixel art
    this.ctx.imageSmoothingEnabled = this.imageSmoothing;

    // Resize bookkeeping
    this._handleWindowResize = this._handleWindowResize.bind(this);

    if (this.options.responsive && typeof window !== 'undefined') {
      window.addEventListener('resize', this._handleWindowResize, {
        passive: true,
      });
    }

    // Handle canvas resize
    this._setupResizeObserver();

    // Ensure initial canvas dimensions match client metrics
    this._resizeCanvasToDisplaySize(true);
  }

  /**
   * Sets up resize observer to handle canvas size changes.
   * @private
   */
  _setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.canvas) {
            this.handleResize();
          }
        }
      });
      this.resizeObserver.observe(this.canvas);
    }
  }

  /**
   * Computes canvas dimensions derived from client metrics or defaults.
   * @returns {{width: number, height: number}}
   * @private
   */
  _resolveCanvasDimensions() {
    const cssWidth =
      typeof this.canvas.clientWidth === 'number' ? this.canvas.clientWidth : 0;
    const cssHeight =
      typeof this.canvas.clientHeight === 'number' ? this.canvas.clientHeight : 0;

    const fallbackWidth =
      cssWidth ||
      this.canvas.width ||
      (typeof window !== 'undefined' ? window.innerWidth : 0) ||
      this.options.defaultWidth;

    const fallbackHeight =
      cssHeight ||
      this.canvas.height ||
      (typeof window !== 'undefined' ? window.innerHeight : 0) ||
      this.options.defaultHeight;

    return {
      width: Math.max(1, Math.floor(fallbackWidth)),
      height: Math.max(1, Math.floor(fallbackHeight)),
    };
  }

  /**
   * Applies client-size derived dimensions to canvas and internal state.
   * @param {boolean} [force=false]
   * @private
   */
  _resizeCanvasToDisplaySize(force = false) {
    const { width, height } = this._resolveCanvasDimensions();
    const needsResize =
      force || this.canvas.width !== width || this.canvas.height !== height;

    if (!needsResize) {
      return;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.handleResize();
  }

  /**
   * Handles debounced window resize events.
   * @private
   */
  _handleWindowResize() {
    if (!this.options.responsive) {
      return;
    }

    this._resizeCanvasToDisplaySize();
  }

  /**
   * Handles canvas resize events.
   * Updates internal dimensions and camera viewport.
   */
  handleResize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.camera.width = this.width;
    this.camera.height = this.height;

    if (this.layeredRenderer) {
      this.layeredRenderer.resize(this.width, this.height);
    }
  }

  /**
   * Clears the main canvas.
   */
  clear() {
    this.ctx.fillStyle = this.clearColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Begins a new frame.
   * Call this at the start of each render cycle.
   * @returns {number} Frame start timestamp
   */
  beginFrame() {
    this.lastFrameStart = performance.now();
    return this.lastFrameStart;
  }

  /**
   * Ends the current frame and updates timing metrics.
   * Call this at the end of each render cycle.
   */
  endFrame() {
    const frameEnd = performance.now();
    this.renderTime = frameEnd - this.lastFrameStart;
    this.frameTime = this.renderTime;
  }

  /**
   * Gets the camera instance.
   * @returns {Camera} Camera instance
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Sets the clear color.
   * @param {string} color - CSS color string (e.g., '#000000')
   */
  setClearColor(color) {
    this.clearColor = color;
  }

  /**
   * Sets image smoothing (for pixel art vs smooth sprites).
   * @param {boolean} enabled - Whether to enable smoothing
   */
  setImageSmoothing(enabled) {
    this.imageSmoothing = enabled;
    this.ctx.imageSmoothingEnabled = enabled;
  }

  /**
   * Gets current frame render time in milliseconds.
   * @returns {number} Render time in ms
   */
  getRenderTime() {
    return this.renderTime;
  }

  /**
   * Converts world coordinates to screen coordinates.
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {{x: number, y: number}} Screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return this.camera.worldToScreen(worldX, worldY);
  }

  /**
   * Converts screen coordinates to world coordinates.
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{x: number, y: number}} World coordinates
   */
  screenToWorld(screenX, screenY) {
    return this.camera.screenToWorld(screenX, screenY);
  }

  /**
   * Checks if a world position is visible in the viewport.
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   * @param {number} margin - Extra margin in pixels
   * @returns {boolean} True if visible
   */
  isVisible(x, y, margin = 0) {
    return this.camera.contains(x, y, margin);
  }

  /**
   * Checks if a rectangle is visible in the viewport.
   * @param {number} x - World X coordinate (top-left)
   * @param {number} y - World Y coordinate (top-left)
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @returns {boolean} True if visible (or partially visible)
   */
  isRectVisible(x, y, width, height) {
    const cam = this.camera;
    return !(
      x + width < cam.x ||
      x > cam.x + cam.width ||
      y + height < cam.y ||
      y > cam.y + cam.height
    );
  }

  /**
   * Updates camera (call once per frame).
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {Function} getPosition - Function to get entity position (for follow target)
   */
  updateCamera(deltaTime, getPosition) {
    this.camera.update(deltaTime, getPosition);
  }

  /**
   * Renders a frame by clearing the back buffer, invoking an optional draw callback,
   * compositing all layers, and updating timing metrics.
   * @param {*} sceneContext - Optional scene/component context handed to draw callback
   * @param {Object} [options]
   * @param {Function} [options.draw] - Callback invoked with { layeredRenderer, ctx, camera, scene }
   * @returns {{frameTime: number, renderTime: number}} Frame timing metrics
   */
  render(sceneContext, options = {}) {
    const { draw } = options;

    this.beginFrame();

    this.clear();

    if (typeof draw === 'function') {
      draw({
        layeredRenderer: this.layeredRenderer,
        ctx: this.ctx,
        camera: this.camera,
        scene: sceneContext,
      });
    }

    this.layeredRenderer.composite(this.ctx);

    this.endFrame();

    return {
      frameTime: this.frameTime,
      renderTime: this.renderTime,
    };
  }

  /**
   * Cleanup resources.
   */
  cleanup() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.options.responsive && typeof window !== 'undefined') {
      window.removeEventListener('resize', this._handleWindowResize);
    }
  }
}
