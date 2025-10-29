/**
 * Performance Benchmark Suite for The Memory Syndicate Engine
 *
 * Profiles core engine systems and establishes baseline metrics:
 * - ECS query performance (target: <1ms for 1000 entities)
 * - Rendering performance (target: <8ms per frame)
 * - Physics performance (target: <4ms per frame)
 * - Entity creation speed (target: 10,000 entities <100ms)
 * - Asset loading times
 * - Memory allocation patterns
 * - GC frequency and pause duration
 *
 * Usage: node benchmark.js
 */

import { EntityManager } from './src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from './src/engine/ecs/ComponentRegistry.js';
import { SystemManager } from './src/engine/ecs/SystemManager.js';
import { GameLoop } from './src/engine/GameLoop.js';
import { AssetLoader } from './src/engine/assets/AssetLoader.js';
import { MovementSystem } from './src/engine/physics/MovementSystem.js';
import { CollisionSystem } from './src/engine/physics/CollisionSystem.js';
import { Transform } from './src/game/components/Transform.js';
import { Velocity } from './src/game/components/Velocity.js';
import { Collider } from './src/game/components/Collider.js';
import { Sprite } from './src/game/components/Sprite.js';
import { EventBus } from './src/engine/events/EventBus.js';
import { AmbientSceneAudioController } from './src/game/audio/AmbientSceneAudioController.js';

/**
 * Memory tracking utilities
 */
class MemoryTracker {
  constructor() {
    this.snapshots = [];
    this.gcEvents = [];
    this.startMemory = null;
  }

  snapshot(label) {
    if (performance.memory) {
      const mem = {
        label,
        timestamp: performance.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
      this.snapshots.push(mem);
      return mem;
    }
    return null;
  }

  start() {
    this.startMemory = this.snapshot('start');
  }

  end() {
    return this.snapshot('end');
  }

  getMemoryDelta() {
    if (this.snapshots.length < 2) return null;
    const start = this.snapshots[0];
    const end = this.snapshots[this.snapshots.length - 1];
    return {
      deltaBytes: end.usedJSHeapSize - start.usedJSHeapSize,
      deltaMB: (end.usedJSHeapSize - start.usedJSHeapSize) / 1024 / 1024,
      startMB: start.usedJSHeapSize / 1024 / 1024,
      endMB: end.usedJSHeapSize / 1024 / 1024,
    };
  }

  clear() {
    this.snapshots = [];
    this.gcEvents = [];
  }
}

class BenchmarkAdaptiveController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentState = 'ambient';
    this.history = [];
  }

  async init() {
    return true;
  }

  setState(state) {
    if (state === this.currentState) {
      return false;
    }
    const previous = this.currentState;
    this.currentState = state;
    const payload = {
      from: previous,
      to: state,
      timestamp: Date.now(),
    };
    this.history.push(payload);
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('audio:adaptive:state_changed', payload);
    }
    return true;
  }

  getState() {
    return this.currentState;
  }

  dispose() {
    this.history = [];
  }
}

/**
 * Performance benchmark runner
 */
class BenchmarkRunner {
  constructor() {
    this.results = {
      metadata: {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      benchmarks: {},
    };
    this.memoryTracker = new MemoryTracker();
  }

  /**
   * Run a benchmark and collect timing + memory metrics
   */
  async runBenchmark(name, fn, options = {}) {
    const iterations = options.iterations || 1;
    const warmup = options.warmup || 0;

    console.log(`\n[${name}] Starting benchmark...`);
    console.log(`  Warmup: ${warmup}, Iterations: ${iterations}`);

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Force GC before measurement if available
    if (global.gc) {
      global.gc();
      await this.sleep(100);
    }

    const times = [];
    this.memoryTracker.clear();
    this.memoryTracker.start();

    // Measured runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);

      if (options.memorySnapshot) {
        this.memoryTracker.snapshot(`iteration-${i}`);
      }
    }

    this.memoryTracker.end();

    // Calculate statistics
    const sorted = times.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const mean = sum / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const memoryDelta = this.memoryTracker.getMemoryDelta();

    const result = {
      iterations,
      timing: { min, max, mean, median, p95, p99 },
      memory: memoryDelta,
    };

    this.results.benchmarks[name] = result;

    console.log(`  ✓ Min: ${min.toFixed(3)}ms`);
    console.log(`  ✓ Mean: ${mean.toFixed(3)}ms`);
    console.log(`  ✓ Median: ${median.toFixed(3)}ms`);
    console.log(`  ✓ P95: ${p95.toFixed(3)}ms`);
    console.log(`  ✓ Max: ${max.toFixed(3)}ms`);

    if (memoryDelta) {
      console.log(`  ✓ Memory: ${memoryDelta.deltaMB.toFixed(2)}MB`);
    }

    return result;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResults() {
    return this.results;
  }
}

/**
 * ECS Benchmarks
 */
async function benchmarkECS(runner) {
  console.log('\n━━━ ECS BENCHMARKS ━━━');

  // Entity creation speed
  await runner.runBenchmark(
    'entity-creation-10000',
    () => {
      const entityManager = new EntityManager();
      for (let i = 0; i < 10000; i++) {
        entityManager.createEntity();
      }
    },
    { iterations: 10, warmup: 2, memorySnapshot: true }
  );

  // Entity creation with components
  await runner.runBenchmark(
    'entity-creation-with-components-1000',
    () => {
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      for (let i = 0; i < 1000; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, 'Transform', new Transform(i, i));
        componentRegistry.addComponent(entity, 'Velocity', new Velocity(0, 0));
      }
    },
    { iterations: 10, warmup: 2, memorySnapshot: true }
  );

  // Query performance with 1000 entities
  await runner.runBenchmark(
    'ecs-query-1000-entities',
    () => {
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      // Create 1000 entities with Transform
      for (let i = 0; i < 1000; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, 'Transform', new Transform(i, i));

        // 70% also have Velocity
        if (i % 10 < 7) {
          componentRegistry.addComponent(entity, 'Velocity', new Velocity(0, 0));
        }

        // 30% also have Collider
        if (i % 10 < 3) {
          componentRegistry.addComponent(entity, 'Collider', new Collider({ width: 32, height: 32 }));
        }
      }

      // Query entities with Transform only
      componentRegistry.queryEntities('Transform');

      // Query entities with Transform + Velocity
      componentRegistry.queryEntities('Transform', 'Velocity');

      // Query entities with all three components
      componentRegistry.queryEntities('Transform', 'Velocity', 'Collider');
    },
    { iterations: 100, warmup: 10 }
  );

  // Query performance with varying entity counts
  for (const count of [100, 500, 1000, 2000]) {
    await runner.runBenchmark(
      `ecs-query-${count}-entities-cached`,
      () => {
        const entityManager = new EntityManager();
        const componentRegistry = new ComponentRegistry(entityManager);

        for (let i = 0; i < count; i++) {
          const entity = entityManager.createEntity();
          componentRegistry.addComponent(entity, 'Transform', new Transform(i, i));
          if (i % 2 === 0) {
            componentRegistry.addComponent(entity, 'Velocity', new Velocity(0, 0));
          }
        }

        // First query (cache miss)
        componentRegistry.queryEntities('Transform', 'Velocity');
        // Second query (cache hit)
        componentRegistry.queryEntities('Transform', 'Velocity');
        // Third query (cache hit)
        componentRegistry.queryEntities('Transform', 'Velocity');
      },
      { iterations: 50, warmup: 5 }
    );
  }

  // Component access performance
  await runner.runBenchmark(
    'component-access-1000-lookups',
    () => {
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      const entities = [];
      for (let i = 0; i < 1000; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, 'Transform', new Transform(i, i));
        entities.push(entity);
      }

      // Access components 1000 times
      for (let i = 0; i < 1000; i++) {
        const entity = entities[i % entities.length];
        componentRegistry.getComponent(entity, 'Transform');
      }
    },
    { iterations: 50, warmup: 5 }
  );
}

/**
 * Physics System Benchmarks
 */
async function benchmarkPhysics(runner) {
  console.log('\n━━━ PHYSICS BENCHMARKS ━━━');

  // Movement system with varying entity counts
  for (const count of [100, 500, 1000]) {
    await runner.runBenchmark(
      `physics-movement-${count}-entities`,
      () => {
        const entityManager = new EntityManager();
        const componentRegistry = new ComponentRegistry(entityManager);
        const eventBus = { on: () => {}, emit: () => {} };
        const movementSystem = new MovementSystem(componentRegistry, eventBus);

        const entities = [];
        for (let i = 0; i < count; i++) {
          const entity = entityManager.createEntity();
          componentRegistry.addComponent(entity, 'Transform', new Transform(i, i));
          componentRegistry.addComponent(entity, 'Velocity', new Velocity(10, 10));
          entities.push(entity);
        }

        // Simulate 10 frames
        for (let frame = 0; frame < 10; frame++) {
          movementSystem.update(0.016, entities);
        }
      },
      { iterations: 20, warmup: 3 }
    );
  }

  // Collision detection with spatial hashing
  for (const count of [50, 100, 200, 500]) {
    await runner.runBenchmark(
      `physics-collision-${count}-entities`,
      () => {
        const entityManager = new EntityManager();
        const componentRegistry = new ComponentRegistry(entityManager);
        const eventBus = { on: () => {}, emit: () => {} };
        const collisionSystem = new CollisionSystem(componentRegistry, eventBus, {
          cellSize: 64,
          resolveCollisions: true,
        });

        const entities = [];
        // Create grid of entities
        const gridSize = Math.ceil(Math.sqrt(count));
        for (let i = 0; i < count; i++) {
          const x = (i % gridSize) * 40;
          const y = Math.floor(i / gridSize) * 40;

          const entity = entityManager.createEntity();
          componentRegistry.addComponent(entity, 'Transform', new Transform(x, y));
          componentRegistry.addComponent(entity, 'Collider', new Collider({
            width: 32,
            height: 32,
            isStatic: i % 5 === 0, // 20% static
          }));
          entities.push(entity);
        }

        // Simulate collision detection for 5 frames
        for (let frame = 0; frame < 5; frame++) {
          collisionSystem.update(0.016, entities);
        }
      },
      { iterations: 20, warmup: 3 }
    );
  }
}

async function benchmarkAdaptiveAudio(runner) {
  console.log('\n━━━ ADAPTIVE AUDIO BENCHMARKS ━━━');

  const audioManagerStub = {
    loadMusic: async () => {},
    playMusic: () => {},
    setMusicVolume: () => {},
    stopMusic: () => {},
  };

  const eventBus = new EventBus();
  const transitions = [];
  eventBus.on('audio:adaptive:state_changed', (payload) => {
    transitions.push({
      from: payload.from,
      to: payload.to,
      timestamp: payload.timestamp,
    });
  });

  const controller = new AmbientSceneAudioController(audioManagerStub, eventBus, {
    createAdaptiveController: () => new BenchmarkAdaptiveController(eventBus),
  });

  await controller.init();

  let lastTransitionSummary = [];

  await runner.runBenchmark(
    'adaptive-audio-infiltration',
    () => {
      transitions.length = 0;

      eventBus.emit('disguise:equipped', { factionId: 'cipher_collective' });
      eventBus.emit('disguise:suspicion_raised', { suspicionLevel: 65 });
      eventBus.emit('combat:initiated', { source: 'benchmark' });
      eventBus.emit('combat:resolved', { source: 'benchmark' });
      eventBus.emit('disguise:suspicion_cleared', { suspicionLevel: 0 });
      eventBus.emit('disguise:removed', { factionId: 'cipher_collective' });

      lastTransitionSummary = transitions.map((entry) => ({ ...entry }));
    },
    { iterations: 100, warmup: 10 }
  );

  controller.dispose();

  const bench = runner.getResults().benchmarks['adaptive-audio-infiltration'];
  bench.transitionSample = lastTransitionSummary;
  bench.transitionCount = lastTransitionSummary.length;
  bench.context = {
    stateSequence: lastTransitionSummary.map((entry) => entry.to),
  };
}

/**
 * Render System Benchmarks (without actual Canvas)
 */
async function benchmarkRendering(runner) {
  console.log('\n━━━ RENDERING BENCHMARKS ━━━');

  // Sprite sorting and culling simulation
  for (const count of [100, 500, 1000, 2000]) {
    await runner.runBenchmark(
      `rendering-sort-cull-${count}-sprites`,
      () => {
        // Simulate sprite sorting and culling operations
        const sprites = [];

        for (let i = 0; i < count; i++) {
          sprites.push({
            id: i,
            x: Math.random() * 1920,
            y: Math.random() * 1080,
            z: Math.floor(Math.random() * 10),
            width: 32,
            height: 32,
            visible: true,
          });
        }

        // Sort by z-index (typical rendering operation)
        sprites.sort((a, b) => a.z - b.z);

        // Viewport culling (typical rendering operation)
        const viewport = { x: 0, y: 0, width: 1920, height: 1080 };
        const visible = sprites.filter(sprite => {
          return sprite.x + sprite.width > viewport.x &&
                 sprite.x < viewport.x + viewport.width &&
                 sprite.y + sprite.height > viewport.y &&
                 sprite.y < viewport.y + viewport.height;
        });

        return visible.length;
      },
      { iterations: 50, warmup: 5 }
    );
  }

  // Layer management operations
  await runner.runBenchmark(
    'rendering-layer-operations',
    () => {
      // Simulate layer dirty tracking and clearing
      const layers = new Map();

      for (let i = 0; i < 5; i++) {
        layers.set(`layer-${i}`, {
          dirty: false,
          sprites: [],
        });
      }

      // Mark layers dirty
      for (const [name, layer] of layers) {
        layer.dirty = true;
      }

      // Add sprites to layers
      for (let i = 0; i < 1000; i++) {
        const layerIdx = i % 5;
        const layer = layers.get(`layer-${layerIdx}`);
        layer.sprites.push({ id: i, x: i, y: i });
      }

      // Clear layers
      for (const [name, layer] of layers) {
        layer.sprites = [];
        layer.dirty = false;
      }
    },
    { iterations: 100, warmup: 10 }
  );
}

/**
 * Asset Loading Benchmarks
 */
async function benchmarkAssetLoading(runner) {
  console.log('\n━━━ ASSET LOADING BENCHMARKS ━━━');

  // JSON parsing (simulate asset data loading)
  await runner.runBenchmark(
    'asset-loading-json-parse-small',
    () => {
      const data = {
        entities: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          components: {
            transform: { x: i, y: i },
            sprite: { image: 'test.png', width: 32, height: 32 },
          },
        })),
      };

      const json = JSON.stringify(data);
      JSON.parse(json);
    },
    { iterations: 100, warmup: 10 }
  );

  await runner.runBenchmark(
    'asset-loading-json-parse-large',
    () => {
      const data = {
        entities: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          components: {
            transform: { x: i, y: i },
            sprite: { image: 'test.png', width: 32, height: 32 },
            velocity: { vx: 0, vy: 0 },
            collider: { width: 32, height: 32 },
          },
        })),
      };

      const json = JSON.stringify(data);
      JSON.parse(json);
    },
    { iterations: 50, warmup: 5 }
  );
}

/**
 * Game Loop Benchmarks
 */
async function benchmarkGameLoop(runner) {
  console.log('\n━━━ GAME LOOP BENCHMARKS ━━━');

  // Full update cycle with multiple systems
  for (const entityCount of [100, 500, 1000]) {
    await runner.runBenchmark(
      `gameloop-full-update-${entityCount}-entities`,
      () => {
        const entityManager = new EntityManager();
        const componentRegistry = new ComponentRegistry(entityManager);
        const eventBus = { on: () => {}, emit: () => {} };
        const systemManager = new SystemManager(entityManager, componentRegistry, eventBus);

        // Add systems
        systemManager.registerSystem(new MovementSystem(componentRegistry, eventBus));
        systemManager.registerSystem(new CollisionSystem(componentRegistry, eventBus, {
          cellSize: 64,
          resolveCollisions: true,
        }));

        // Create entities
        const gridSize = Math.ceil(Math.sqrt(entityCount));
        for (let i = 0; i < entityCount; i++) {
          const x = (i % gridSize) * 40;
          const y = Math.floor(i / gridSize) * 40;

          const entity = entityManager.createEntity();
          componentRegistry.addComponent(entity, 'Transform', new Transform(x, y));
          componentRegistry.addComponent(entity, 'Velocity', new Velocity(10, 10));

          // 50% have colliders
          if (i % 2 === 0) {
            componentRegistry.addComponent(entity, 'Collider', new Collider({
              width: 32,
              height: 32,
            }));
          }
        }

        // Simulate 60 frames (1 second)
        for (let frame = 0; frame < 60; frame++) {
          systemManager.update(0.016);
        }
      },
      { iterations: 10, warmup: 2, memorySnapshot: true }
    );
  }
}

/**
 * Memory Stress Tests
 */
async function benchmarkMemory(runner) {
  console.log('\n━━━ MEMORY BENCHMARKS ━━━');

  // Entity churn (create/destroy cycle)
  await runner.runBenchmark(
    'memory-entity-churn-1000-cycles',
    () => {
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      for (let cycle = 0; cycle < 1000; cycle++) {
        // Create entity
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, 'Transform', new Transform(0, 0));
        componentRegistry.addComponent(entity, 'Velocity', new Velocity(0, 0));

        // Destroy entity
        componentRegistry.removeAllComponents(entity);
        entityManager.destroyEntity(entity);
      }
    },
    { iterations: 10, warmup: 2, memorySnapshot: true }
  );

  // Large entity pool allocation
  await runner.runBenchmark(
    'memory-allocation-10000-entities',
    () => {
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      const entities = [];
      for (let i = 0; i < 10000; i++) {
        const entity = entityManager.createEntity();
        componentRegistry.addComponent(entity, 'Transform', new Transform(i, i));
        componentRegistry.addComponent(entity, 'Velocity', new Velocity(i % 10, i % 10));
        entities.push(entity);
      }

      // Clean up
      for (const entity of entities) {
        componentRegistry.removeAllComponents(entity);
        entityManager.destroyEntity(entity);
      }
    },
    { iterations: 5, warmup: 1, memorySnapshot: true }
  );
}

/**
 * Main benchmark suite
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  The Memory Syndicate - Engine Performance Profile');
  console.log('  Sprint 1 (M1-025) - Baseline Metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const runner = new BenchmarkRunner();

  try {
    await benchmarkECS(runner);
    await benchmarkPhysics(runner);
    await benchmarkAdaptiveAudio(runner);
    await benchmarkRendering(runner);
    await benchmarkAssetLoading(runner);
    await benchmarkGameLoop(runner);
    await benchmarkMemory(runner);

    // Save results
    const results = runner.getResults();
    const fs = await import('fs/promises');

    // Ensure directory exists
    await fs.mkdir('./benchmark-results', { recursive: true });

    const filename = `./benchmark-results/m1-profile-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(results, null, 2));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Benchmark Complete!');
    console.log(`  Results saved to: ${filename}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Print summary
    printSummary(results);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

/**
 * Print summary of results
 */
function printSummary(results) {
  console.log('\n📊 PERFORMANCE SUMMARY\n');

  const benchmarks = results.benchmarks;

  // ECS Summary
  console.log('🔹 ECS Performance:');
  const entityCreation = benchmarks['entity-creation-10000'];
  console.log(`  • 10,000 entities: ${entityCreation.timing.mean.toFixed(2)}ms (target: <100ms)`);

  const query1000 = benchmarks['ecs-query-1000-entities'];
  console.log(`  • Query 1000 entities: ${query1000.timing.mean.toFixed(3)}ms (target: <1ms)`);

  // Physics Summary
  console.log('\n🔹 Physics Performance:');
  const movement1000 = benchmarks['physics-movement-1000-entities'];
  console.log(`  • Movement (1000 entities, 10 frames): ${movement1000.timing.mean.toFixed(2)}ms (target: <4ms/frame)`);

  const collision500 = benchmarks['physics-collision-500-entities'];
  console.log(`  • Collision (500 entities, 5 frames): ${collision500.timing.mean.toFixed(2)}ms (target: <4ms/frame)`);

  // Adaptive Audio Summary
  const adaptiveAudio = benchmarks['adaptive-audio-infiltration'];
  if (adaptiveAudio) {
    console.log('\n🔹 Adaptive Audio:');
    console.log(
      `  • Infiltration transition batch: ${adaptiveAudio.timing.mean.toFixed(3)}ms (target: track <2ms batch)`
    );
    if (adaptiveAudio.context?.stateSequence?.length) {
      console.log(
        `  • State sequence sample: ${adaptiveAudio.context.stateSequence.join(' → ')}`
      );
    }
  }

  // Rendering Summary
  console.log('\n🔹 Rendering Performance:');
  const render1000 = benchmarks['rendering-sort-cull-1000-sprites'];
  console.log(`  • Sort/Cull 1000 sprites: ${render1000.timing.mean.toFixed(3)}ms (target: <8ms)`);

  // Game Loop Summary
  console.log('\n🔹 Game Loop Performance:');
  const gameLoop500 = benchmarks['gameloop-full-update-500-entities'];
  const avgPerFrame = gameLoop500.timing.mean / 60;
  console.log(`  • Full update (500 entities, 60 frames): ${gameLoop500.timing.mean.toFixed(2)}ms total`);
  console.log(`  • Average per frame: ${avgPerFrame.toFixed(3)}ms (target: <16ms)`);

  // Memory Summary
  console.log('\n🔹 Memory Performance:');
  const memAlloc = benchmarks['memory-allocation-10000-entities'];
  if (memAlloc.memory) {
    console.log(`  • 10,000 entity allocation: ${memAlloc.memory.deltaMB.toFixed(2)}MB`);
  }

  console.log('');
}

// Run benchmarks
main();
