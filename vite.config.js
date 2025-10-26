import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          engine: [
            './src/engine/ecs/Entity.js',
            './src/engine/ecs/Component.js',
            './src/engine/ecs/System.js',
            './src/engine/ecs/EntityManager.js',
            './src/engine/ecs/ComponentRegistry.js',
            './src/engine/ecs/SystemManager.js'
          ],
          renderer: [
            './src/engine/renderer/Renderer.js',
            './src/engine/renderer/Layer.js',
            './src/engine/renderer/Camera.js',
            './src/engine/renderer/ObjectPool.js'
          ],
          physics: [
            './src/engine/physics/SpatialHash.js',
            './src/engine/physics/CollisionSystem.js',
            './src/engine/physics/TriggerSystem.js'
          ]
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
