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

export class Renderer {
  /**
   * Creates a new renderer.
   * @param {HTMLCanvasElement} canvas - Main rendering canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width;
    this.height = canvas.height;

    // Camera for world-to-screen transformation
    this.camera = new Camera(0, 0, this.width, this.height);

    // Performance tracking
    this.frameTime = 0;
    this.renderTime = 0;
    this.lastFrameStart = 0;

    // Rendering options
    this.clearColor = '#000000';
    this.imageSmoothing = false; // Pixel art friendly

    // Configure context for pixel art
    this.ctx.imageSmoothingEnabled = this.imageSmoothing;

    // Handle canvas resize
    this._setupResizeObserver();
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
   * Handles canvas resize events.
   * Updates internal dimensions and camera viewport.
   */
  handleResize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.camera.width = this.width;
    this.camera.height = this.height;
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
   * Cleanup resources.
   */
  cleanup() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
