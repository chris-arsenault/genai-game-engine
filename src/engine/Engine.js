/**
 * Engine - main game engine coordinator.
 * Orchestrates ECS, rendering, physics, audio, and asset management.
 * Performance target: 60 FPS (16ms frame budget).
 */
import { EntityManager } from './ecs/EntityManager.js';
import { ComponentRegistry } from './ecs/ComponentRegistry.js';
import { SystemManager } from './ecs/SystemManager.js';
import { EventBus } from './events/EventBus.js';
import { Renderer } from './renderer/Renderer.js';
import { AudioManager } from './audio/AudioManager.js';
import { AssetManager } from './assets/AssetManager.js';
import { Logger } from '../utils/Logger.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.logger = new Logger('Engine', Logger.LogLevel.INFO);
    this.running = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;

    // Initialize core systems
    this.eventBus = new EventBus();
    this.entityManager = new EntityManager();
    this.componentRegistry = new ComponentRegistry(this.entityManager);
    this.systemManager = new SystemManager(
      this.entityManager,
      this.componentRegistry,
      this.eventBus
    );

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
    if (this.running) {
      this.logger.warn('Engine already running');
      return;
    }

    this.running = true;
    this.lastTime = performance.now();
    this.logger.info('Engine started');

    // Start game loop
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  stop() {
    this.running = false;
    this.logger.info('Engine stopped');
  }

  gameLoop(currentTime) {
    if (!this.running) {
      return;
    }

    // Calculate delta time
    this.deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    // Update systems
    this.systemManager.update(this.deltaTime);

    // Render
    this.renderer.render(this.componentRegistry);

    // Process event queue
    this.eventBus.processQueue();

    // Continue loop
    requestAnimationFrame((time) => this.gameLoop(time));
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
    return this.fps;
  }

  getDeltaTime() {
    return this.deltaTime;
  }

  cleanup() {
    this.logger.info('Cleaning up engine...');
    this.stop();
    this.systemManager.cleanup();
    this.eventBus.clear();
    this.logger.info('Engine cleaned up');
  }
}
