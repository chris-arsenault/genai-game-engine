/**
 * Main entry point for The Memory Syndicate.
 */
import { Engine } from './engine/Engine.js';
import { Game } from './game/Game.js';

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', async () => {
  console.log('Starting The Memory Syndicate...');

  // Get canvas element
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Create engine
  const engine = new Engine(canvas);

  // Initialize engine
  await engine.init();

  // Create game
  const game = new Game(engine);
  await game.init();

  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }

  // Enable debug overlay (toggle with F3)
  const debugOverlay = document.getElementById('debug-overlay');
  let debugEnabled = false;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      debugEnabled = !debugEnabled;
      if (debugOverlay) {
        debugOverlay.classList.toggle('visible', debugEnabled);
      }
    }
  });

  // Update debug overlay
  setInterval(() => {
    if (!debugEnabled || !debugOverlay) {
      return;
    }

    const fpsElement = document.getElementById('debug-fps');
    const entitiesElement = document.getElementById('debug-entities');
    const memoryElement = document.getElementById('debug-memory');
    const frameTimeElement = document.getElementById('debug-frame-time');

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${engine.getFPS()}`;
    }

    if (entitiesElement) {
      const count = engine.getEntityManager().getActiveEntityCount();
      entitiesElement.textContent = `Entities: ${count}`;
    }

    if (memoryElement && performance.memory) {
      const mb = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      memoryElement.textContent = `Memory: ${mb} MB`;
    }

    if (frameTimeElement) {
      const frameTime = (engine.getDeltaTime() * 1000).toFixed(1);
      frameTimeElement.textContent = `Frame: ${frameTime} ms`;
    }
  }, 500);

  // Start engine
  engine.start();

  console.log('The Memory Syndicate started successfully!');

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    engine.cleanup();
    game.cleanup();
  });
});
