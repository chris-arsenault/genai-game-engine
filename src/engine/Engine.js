/**
 * Engine - main game engine coordinator.
 * Orchestrates ECS, rendering, physics, audio, and asset management.
 * Performance target: 60 FPS (16ms frame budget).
 */
import { EntityManager } from './ecs/EntityManager.js';
import { ComponentRegistry } from './ecs/ComponentRegistry.js';
import { SystemManager } from './ecs/SystemManager.js';
import { EventBus } from './events/EventBus.js';
import { GameLoop } from './GameLoop.js';
import { Renderer } from './renderer/Renderer.js';
import { AudioManager } from './audio/AudioManager.js';
import { AssetManager } from './assets/AssetManager.js';
import { Logger } from '../utils/Logger.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.logger = new Logger('Engine', Logger.LogLevel.INFO);

    // Initialize core systems
    this.eventBus = new EventBus();
    this.entityManager = new EntityManager();
    this.componentRegistry = new ComponentRegistry(this.entityManager);
    this.systemManager = new SystemManager(
      this.entityManager,
      this.componentRegistry,
      this.eventBus
    );

    // Initialize game loop with frame callback
    this.gameLoop = new GameLoop(this.systemManager, {
      targetFPS: 60,
      onFrame: (metrics) => this._onFrame(metrics),
    });

    // Initialize subsystems
    this.renderer = new Renderer(canvas);
    this.audioManager = new AudioManager();
    this.assetManager = new AssetManager();

    this.logger.info('Engine initialized');
  }

  async init() {
    this.logger.info('Initializing engine...');

    // Initialize audio (requires user gesture)
    await this.audioManager.init();

    // Initialize systems
    this.systemManager.init();

    this.logger.info('Engine ready');
  }

  registerSystem(system, name) {
    this.systemManager.registerSystem(system, name);
    this.logger.debug(`Registered system: ${name}`);
  }

  start() {
    if (this.gameLoop.isRunning()) {
      this.logger.warn('Engine already running');
      return;
    }

    this.logger.info('Engine started');
    this.gameLoop.start();
  }

  stop() {
    this.logger.info('Engine stopped');
    this.gameLoop.stop();
  }

  pause() {
    this.logger.info('Engine paused');
    this.gameLoop.pause();
  }

  resume() {
    this.logger.info('Engine resumed');
    this.gameLoop.resume();
  }

  /**
   * Called each frame by GameLoop.
   * Handles rendering and event processing.
   * @private
   * @param {Object} metrics - Frame timing metrics
   */
  _onFrame(metrics) {
    // Rendering is now handled by RenderSystem via SystemManager
    // This ensures proper ECS integration and layer management

    // Composite layers to main canvas (after RenderSystem has drawn to them)
    this.renderer.beginFrame();
    this.renderer.clear();
    this.renderer.layeredRenderer.composite(this.renderer.ctx);
    this.renderer.endFrame();

    // Process event queue
    this.eventBus.processQueue();
  }

  getEntityManager() {
    return this.entityManager;
  }

  getComponentRegistry() {
    return this.componentRegistry;
  }

  getSystemManager() {
    return this.systemManager;
  }

  getEventBus() {
    return this.eventBus;
  }

  getRenderer() {
    return this.renderer;
  }

  getAudioManager() {
    return this.audioManager;
  }

  getAssetManager() {
    return this.assetManager;
  }

  getFPS() {
    return this.gameLoop.getFPS();
  }

  getDeltaTime() {
    return this.gameLoop.getDeltaTime();
  }

  getGameLoop() {
    return this.gameLoop;
  }

  isRunning() {
    return this.gameLoop.isRunning();
  }

  isPaused() {
    return this.gameLoop.isPaused();
  }

  cleanup() {
    this.logger.info('Cleaning up engine...');
    this.gameLoop.stop();
    this.systemManager.cleanup();
    this.eventBus.clear();
    this.logger.info('Engine cleaned up');
  }
}
