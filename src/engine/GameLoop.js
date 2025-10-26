/**
 * GameLoop - Core game loop using requestAnimationFrame.
 * Provides fixed timestep targeting 60 FPS with delta time calculation.
 * Orchestrates system updates with pause/resume support.
 *
 * Performance target: 60 FPS (16.6ms frame budget).
 *
 * @class GameLoop
 */
export class GameLoop {
  /**
   * Creates a new game loop.
   * @param {SystemManager} systemManager - System manager to update each frame
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.targetFPS=60] - Target frames per second
   * @param {Function} [options.onFrame] - Optional callback called each frame with metrics
   */
  constructor(systemManager, options = {}) {
    this.systemManager = systemManager;
    this.targetFPS = options.targetFPS || 60;
    this.onFrame = options.onFrame || null;

    // Calculate target frame time in milliseconds
    this.targetFrameTime = 1000 / this.targetFPS;

    // Loop state
    this.running = false;
    this.paused = false;

    // Time tracking
    this.lastFrameTime = 0;
    this.deltaTime = 0;

    // Frame metrics
    this.frameCount = 0;
    this.fps = 0;
    this.fpsFrameCount = 0;
    this.fpsUpdateTime = 0;

    // Frame timing statistics
    this.frameTime = 0;
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.totalFrameTime = 0;

    // RequestAnimationFrame ID for cleanup
    this.rafId = null;
  }

  /**
   * Starts the game loop.
   * Initializes timing and begins frame updates.
   */
  start() {
    if (this.running) {
      console.warn('GameLoop: Already running');
      return;
    }

    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    this.fpsFrameCount = 0;

    // Start the loop
    this.rafId = requestAnimationFrame((time) => this._loop(time));
  }

  /**
   * Stops the game loop.
   * Cancels the current frame request.
   */
  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.paused = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Pauses the game loop.
   * Systems will not update while paused, but the loop continues running.
   * Frame timing continues to track but delta time is not accumulated.
   */
  pause() {
    if (!this.running) {
      console.warn('GameLoop: Cannot pause - not running');
      return;
    }

    if (this.paused) {
      return;
    }

    this.paused = true;
  }

  /**
   * Resumes the game loop from pause.
   * Resets timing to prevent large delta time spike.
   */
  resume() {
    if (!this.running) {
      console.warn('GameLoop: Cannot resume - not running');
      return;
    }

    if (!this.paused) {
      return;
    }

    this.paused = false;
    // Reset last frame time to prevent delta time spike
    this.lastFrameTime = performance.now();
  }

  /**
   * Internal loop method called by requestAnimationFrame.
   * Calculates timing, updates systems, and tracks metrics.
   *
   * @private
   * @param {number} currentTime - Current timestamp from requestAnimationFrame
   */
  _loop(currentTime) {
    if (!this.running) {
      return;
    }

    // Calculate frame time in milliseconds
    this.frameTime = currentTime - this.lastFrameTime;

    // Calculate delta time in seconds
    this.deltaTime = this.frameTime / 1000;

    // Update timing for next frame
    this.lastFrameTime = currentTime;

    // Update frame count
    this.frameCount++;
    this.fpsFrameCount++;

    // Update frame timing statistics (only for active frames)
    if (!this.paused) {
      this.totalFrameTime += this.frameTime;
      this.minFrameTime = Math.min(this.minFrameTime, this.frameTime);
      this.maxFrameTime = Math.max(this.maxFrameTime, this.frameTime);
    }

    // Update FPS counter every second
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    // Update systems if not paused
    if (!this.paused) {
      this.systemManager.update(this.deltaTime);
    }

    // Call frame callback if provided
    if (this.onFrame) {
      this.onFrame({
        frameCount: this.frameCount,
        fps: this.fps,
        deltaTime: this.deltaTime,
        frameTime: this.frameTime,
        paused: this.paused,
      });
    }

    // Schedule next frame
    this.rafId = requestAnimationFrame((time) => this._loop(time));
  }

  /**
   * Gets current frames per second.
   * @returns {number} Current FPS
   */
  getFPS() {
    return this.fps;
  }

  /**
   * Gets delta time for current frame.
   * @returns {number} Delta time in seconds
   */
  getDeltaTime() {
    return this.deltaTime;
  }

  /**
   * Gets total number of frames since start.
   * @returns {number} Frame count
   */
  getFrameCount() {
    return this.frameCount;
  }

  /**
   * Gets current frame time in milliseconds.
   * @returns {number} Frame time in ms
   */
  getFrameTime() {
    return this.frameTime;
  }

  /**
   * Gets average frame time in milliseconds.
   * @returns {number} Average frame time
   */
  getAverageFrameTime() {
    if (this.frameCount === 0) {
      return 0;
    }
    return this.totalFrameTime / this.frameCount;
  }

  /**
   * Gets minimum frame time recorded.
   * @returns {number} Minimum frame time in ms
   */
  getMinFrameTime() {
    return this.minFrameTime === Infinity ? 0 : this.minFrameTime;
  }

  /**
   * Gets maximum frame time recorded.
   * @returns {number} Maximum frame time in ms
   */
  getMaxFrameTime() {
    return this.maxFrameTime;
  }

  /**
   * Checks if loop is running.
   * @returns {boolean} True if running
   */
  isRunning() {
    return this.running;
  }

  /**
   * Checks if loop is paused.
   * @returns {boolean} True if paused
   */
  isPaused() {
    return this.paused;
  }

  /**
   * Resets frame timing statistics.
   * Useful for benchmarking specific sections.
   */
  resetStats() {
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.totalFrameTime = 0;
    this.frameCount = 0;
    this.fpsFrameCount = 0;
  }
}
