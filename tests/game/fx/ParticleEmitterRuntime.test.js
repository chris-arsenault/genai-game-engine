import { ParticleEmitterRuntime } from '../../../src/game/fx/ParticleEmitterRuntime.js';

function createStubCanvas(width = 1280, height = 720) {
  const ctx = {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    ellipse: jest.fn(),
    fill: jest.fn(),
    drawImage: jest.fn(),
    set globalAlpha(value) {
      this._globalAlpha = value;
    },
    get globalAlpha() {
      return this._globalAlpha || 1;
    },
    set globalCompositeOperation(value) {
      this._globalCompositeOperation = value;
    },
    get globalCompositeOperation() {
      return this._globalCompositeOperation;
    },
  };
  return {
    width,
    height,
    getContext: jest.fn(() => ctx),
    _ctx: ctx,
  };
}

function createEventBus() {
  const listeners = new Map();
  return {
    on(event, handler) {
      const list = listeners.get(event) || [];
      list.push(handler);
      listeners.set(event, list);
      return () => {
        const current = listeners.get(event) || [];
        const index = current.indexOf(handler);
        if (index >= 0) {
          current.splice(index, 1);
        }
      };
    },
    emit(event, payload) {
      const list = listeners.get(event);
      if (!list) {
        return;
      }
      for (let i = 0; i < list.length; i += 1) {
        list[i](payload);
      }
    },
  };
}

describe('ParticleEmitterRuntime', () => {
  it('registers particle emit descriptors and spawns pooled emitters', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 2,
      maxParticlesPerEmitter: 6,
      globalMaxParticles: 12,
      getNow: () => 0,
    });

    runtime.attach();

    eventBus.emit('fx:particle_emit', {
      effectId: 'dialogueStartPulse',
      preset: 'dialogue-ripple',
      spawnCount: 5,
      durationMs: 180,
      intensity: 0.8,
    });

    const stats = runtime.getStats();
    expect(stats.activeEmitters).toBe(1);
    expect(stats.activeParticles).toBeGreaterThan(0);
  });

  it('releases emitters to the pool after their lifetime', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 2,
      maxParticlesPerEmitter: 4,
      globalMaxParticles: 10,
      getNow: () => 0,
    });

    runtime.attach();

    eventBus.emit('fx:particle_emit', {
      preset: 'quest-milestone-wave',
      spawnCount: 3,
      durationMs: 120,
      intensity: 1,
    });

    runtime.update(0.2);
    runtime.update(0.6); // advance beyond lifetime

    const stats = runtime.getStats();
    expect(stats.activeEmitters).toBe(0);
    expect(stats.pooledEmitters).toBeGreaterThanOrEqual(1);
    expect(stats.activeParticles).toBe(0);
  });

  it('reuses pooled emitters and particles on subsequent events', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 2,
      maxParticlesPerEmitter: 5,
      globalMaxParticles: 12,
      getNow: () => 0,
    });

    runtime.attach();

    eventBus.emit('fx:particle_emit', {
      preset: 'case-evidence-glint',
      spawnCount: 4,
      durationMs: 100,
      intensity: 0.9,
    });
    runtime.update(0.4); // expire

    const afterFirst = runtime.getStats();
    expect(afterFirst.activeEmitters).toBe(0);
    expect(afterFirst.pooledEmitters).toBeGreaterThanOrEqual(1);
    const pooledParticlesAfterFirst = afterFirst.pooledParticles;

    eventBus.emit('fx:particle_emit', {
      preset: 'case-evidence-glint',
      spawnCount: 4,
      durationMs: 140,
      intensity: 0.9,
    });

    const afterSecond = runtime.getStats();
    expect(afterSecond.activeEmitters).toBe(1);
    expect(afterSecond.pooledEmitters).toBeLessThan(afterFirst.pooledEmitters);
    expect(afterSecond.pooledParticles).toBeLessThanOrEqual(pooledParticlesAfterFirst);
  });

  it('renders without throwing when a context is available', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 1,
      maxParticlesPerEmitter: 3,
      globalMaxParticles: 6,
      getNow: () => 0,
    });

    runtime.attach();

    eventBus.emit('fx:particle_emit', {
      preset: 'generic-overlay-cue',
      spawnCount: 3,
      durationMs: 300,
      intensity: 1,
    });

    expect(() => runtime.render()).not.toThrow();
  });

  it('throttles spawn when global particle capacity is saturated', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 3,
      maxParticlesPerEmitter: 16,
      globalMaxParticles: 32,
      getNow: () => 0,
    });

    runtime.attach();

    eventBus.emit('fx:particle_emit', {
      preset: 'quest-milestone-wave',
      spawnCount: 18,
      durationMs: 480,
      intensity: 1,
    });
    eventBus.emit('fx:particle_emit', {
      preset: 'quest-milestone-wave',
      spawnCount: 18,
      durationMs: 480,
      intensity: 1,
    });

    const midStats = runtime.getStats();
    expect(midStats.activeEmitters).toBe(2);
    expect(midStats.activeParticles).toBeLessThanOrEqual(32);
    expect(midStats.throttledSpawns).toBeGreaterThanOrEqual(0);

    eventBus.emit('fx:particle_emit', {
      preset: 'quest-milestone-wave',
      spawnCount: 18,
      durationMs: 480,
      intensity: 1,
    });

    const finalStats = runtime.getStats();
    expect(finalStats.activeEmitters).toBeLessThanOrEqual(3);
    expect(finalStats.activeParticles).toBeLessThanOrEqual(32);
    expect(finalStats.throttledSpawns).toBeGreaterThan(0);
  });

  it('renders sprite-based particles when sprite sheets are configured', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const spriteImage = { width: 256, height: 256 };
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 1,
      maxParticlesPerEmitter: 4,
      globalMaxParticles: 12,
      getNow: () => 0,
      presets: {
        'test-sprite': {
          spriteSheetId: 'test',
          spread: [0, 0],
          speed: [0, 0],
          size: [20, 20],
          lifespanMs: [260, 260],
          baseAlpha: 1,
          color: 'rgba(255, 255, 255, 1)',
        },
      },
      spriteSheets: {
        test: {
          image: spriteImage,
          frameWidth: 128,
          frameHeight: 128,
          frameCount: 4,
          frameRate: 12,
          scale: [0.3, 0.3],
        },
      },
    });

    runtime.attach();
    eventBus.emit('fx:particle_emit', {
      preset: 'test-sprite',
      spawnCount: 2,
      durationMs: 260,
      intensity: 1,
    });

    runtime.render();
    expect(canvas._ctx.drawImage).toHaveBeenCalled();
  });

  it('maintains particle budgets under AR-007 stress scenarios', () => {
    const canvas = createStubCanvas();
    const eventBus = createEventBus();
    const spriteImage = { width: 1024, height: 1024 };
    const runtime = new ParticleEmitterRuntime(canvas, eventBus, {
      maxEmitters: 20,
      maxParticlesPerEmitter: 42,
      globalMaxParticles: 420,
      getNow: () => 0,
      spriteSheetLoader: () => spriteImage,
    });

    runtime.attach();

    for (let frame = 0; frame < 18; frame += 1) {
      eventBus.emit('fx:particle_emit', {
        preset: 'detective-vision-rainfall',
        spawnCount: 26,
        durationMs: 720,
        intensity: 0.95,
      });
      eventBus.emit('fx:particle_emit', {
        preset: 'detective-vision-neon-bloom',
        spawnCount: 18,
        durationMs: 640,
        intensity: 0.9,
      });
      eventBus.emit('fx:particle_emit', {
        preset: 'detective-vision-memory-fragment',
        spawnCount: 16,
        durationMs: 820,
        intensity: 1,
      });
      runtime.update(1 / 60);
      runtime.render();
    }

    const stats = runtime.getStats();
    expect(stats.activeParticles).toBeLessThanOrEqual(420);
    expect(stats.maxParticlesPerEmitter).toBe(42);
    expect(stats.globalMaxParticles).toBe(420);
  });
});
