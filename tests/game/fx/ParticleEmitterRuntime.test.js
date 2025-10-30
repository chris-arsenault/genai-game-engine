import { ParticleEmitterRuntime } from '../../../src/game/fx/ParticleEmitterRuntime.js';

function createStubCanvas(width = 1280, height = 720) {
  const ctx = {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    ellipse: jest.fn(),
    fill: jest.fn(),
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
});
