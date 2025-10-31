const DEFAULT_PRESETS = Object.freeze({
  'dialogue-ripple': {
    anchor: { x: 0.5, y: 0.82 },
    color: 'rgba(120, 200, 255, 0.8)',
    speed: [28, 64],
    size: [6, 14],
    lifespanMs: [260, 420],
    spread: [24, 92],
  },
  'dialogue-beat-spark': {
    anchor: { x: 0.5, y: 0.78 },
    color: 'rgba(230, 255, 255, 0.85)',
    speed: [32, 78],
    size: [4, 10],
    lifespanMs: [220, 360],
    spread: [20, 70],
  },
  'dialogue-choice-flare': {
    anchor: { x: 0.5, y: 0.76 },
    color: 'rgba(200, 255, 210, 0.85)',
    speed: [30, 72],
    size: [7, 16],
    lifespanMs: [240, 380],
    spread: [28, 90],
  },
  'dialogue-overlay-reveal': {
    anchor: { x: 0.5, y: 0.79 },
    color: 'rgba(160, 220, 255, 0.82)',
    speed: [26, 64],
    size: [6, 14],
    lifespanMs: [260, 420],
    spread: [22, 84],
  },
  'dialogue-overlay-dismiss': {
    anchor: { x: 0.5, y: 0.79 },
    color: 'rgba(200, 190, 255, 0.7)',
    speed: [24, 58],
    size: [5, 12],
    lifespanMs: [220, 360],
    spread: [20, 76],
  },
  'dialogue-overlay-choice': {
    anchor: { x: 0.5, y: 0.77 },
    color: 'rgba(210, 255, 205, 0.84)',
    speed: [28, 68],
    size: [6, 14],
    lifespanMs: [240, 400],
    spread: [22, 88],
  },
  'dialogue-finale-burst': {
    anchor: { x: 0.5, y: 0.72 },
    color: 'rgba(255, 240, 210, 0.9)',
    speed: [36, 88],
    size: [10, 22],
    lifespanMs: [320, 520],
    spread: [30, 120],
  },
  'case-evidence-glint': {
    anchor: { x: 0.68, y: 0.56 },
    color: 'rgba(140, 210, 255, 0.85)',
    speed: [24, 56],
    size: [5, 12],
    lifespanMs: [260, 420],
    spread: [22, 90],
  },
  'case-clue-shimmer': {
    anchor: { x: 0.66, y: 0.54 },
    color: 'rgba(160, 255, 220, 0.82)',
    speed: [24, 60],
    size: [6, 14],
    lifespanMs: [260, 440],
    spread: [24, 96],
  },
  'case-objective-arc': {
    anchor: { x: 0.63, y: 0.52 },
    color: 'rgba(255, 215, 180, 0.88)',
    speed: [28, 72],
    size: [8, 18],
    lifespanMs: [320, 520],
    spread: [26, 110],
  },
  'case-solved-radiance': {
    anchor: { x: 0.6, y: 0.5 },
    color: 'rgba(255, 255, 220, 0.92)',
    speed: [40, 94],
    size: [10, 24],
    lifespanMs: [360, 600],
    spread: [36, 140],
  },
  'case-overlay-reveal': {
    anchor: { x: 0.62, y: 0.58 },
    color: 'rgba(200, 240, 255, 0.88)',
    speed: [26, 60],
    size: [7, 14],
    lifespanMs: [280, 460],
    spread: [28, 110],
  },
  'case-overlay-dismiss': {
    anchor: { x: 0.6, y: 0.6 },
    color: 'rgba(160, 210, 255, 0.75)',
    speed: [22, 50],
    size: [5, 12],
    lifespanMs: [220, 380],
    spread: [24, 90],
  },
  'quest-milestone-wave': {
    anchor: { x: 0.32, y: 0.28 },
    color: 'rgba(255, 220, 130, 0.9)',
    speed: [30, 74],
    size: [8, 18],
    lifespanMs: [320, 520],
    spread: [30, 110],
  },
  'quest-complete-corona': {
    anchor: { x: 0.3, y: 0.26 },
    color: 'rgba(255, 255, 210, 0.94)',
    speed: [36, 90],
    size: [12, 26],
    lifespanMs: [360, 620],
    spread: [36, 140],
  },
  'quest-overlay-reveal': {
    anchor: { x: 0.34, y: 0.32 },
    color: 'rgba(255, 230, 160, 0.86)',
    speed: [26, 62],
    size: [7, 16],
    lifespanMs: [300, 480],
    spread: [28, 104],
  },
  'quest-overlay-dismiss': {
    anchor: { x: 0.34, y: 0.34 },
    color: 'rgba(255, 200, 140, 0.78)',
    speed: [24, 56],
    size: [6, 14],
    lifespanMs: [240, 420],
    spread: [26, 90],
  },
  'quest-overlay-tab-pulse': {
    anchor: { x: 0.36, y: 0.3 },
    color: 'rgba(255, 225, 150, 0.84)',
    speed: [28, 66],
    size: [7, 15],
    lifespanMs: [260, 440],
    spread: [24, 96],
  },
  'quest-overlay-selection': {
    anchor: { x: 0.36, y: 0.3 },
    color: 'rgba(255, 235, 160, 0.88)',
    speed: [28, 68],
    size: [8, 16],
    lifespanMs: [280, 460],
    spread: [28, 100],
  },
  'inventory-overlay-reveal': {
    anchor: { x: 0.2, y: 0.74 },
    color: 'rgba(180, 225, 255, 0.85)',
    speed: [26, 64],
    size: [7, 16],
    lifespanMs: [280, 460],
    spread: [24, 96],
  },
  'inventory-overlay-dismiss': {
    anchor: { x: 0.2, y: 0.74 },
    color: 'rgba(160, 200, 240, 0.72)',
    speed: [22, 52],
    size: [6, 12],
    lifespanMs: [220, 360],
    spread: [22, 82],
  },
  'inventory-item-focus': {
    anchor: { x: 0.22, y: 0.7 },
    color: 'rgba(200, 255, 190, 0.82)',
    speed: [26, 62],
    size: [6, 14],
    lifespanMs: [240, 420],
    spread: [24, 90],
  },
  'save-inspector-overlay-reveal': {
    anchor: { x: 0.88, y: 0.78 },
    color: 'rgba(205, 255, 235, 0.82)',
    speed: [24, 56],
    size: [6, 14],
    lifespanMs: [260, 440],
    spread: [22, 88],
  },
  'save-inspector-overlay-dismiss': {
    anchor: { x: 0.88, y: 0.78 },
    color: 'rgba(180, 220, 235, 0.72)',
    speed: [20, 48],
    size: [5, 12],
    lifespanMs: [220, 360],
    spread: [20, 82],
  },
  'save-inspector-overlay-refresh': {
    anchor: { x: 0.88, y: 0.78 },
    color: 'rgba(225, 255, 245, 0.86)',
    speed: [26, 64],
    size: [6, 14],
    lifespanMs: [240, 420],
    spread: [24, 92],
  },
  'control-bindings-overlay-reveal': {
    anchor: { x: 0.5, y: 0.52 },
    color: 'rgba(185, 240, 255, 0.84)',
    speed: [28, 68],
    size: [7, 16],
    lifespanMs: [280, 460],
    spread: [26, 100],
  },
  'control-bindings-overlay-dismiss': {
    anchor: { x: 0.5, y: 0.52 },
    color: 'rgba(160, 210, 235, 0.74)',
    speed: [24, 58],
    size: [6, 14],
    lifespanMs: [220, 380],
    spread: [24, 84],
  },
  'control-bindings-selection': {
    anchor: { x: 0.5, y: 0.5 },
    color: 'rgba(205, 255, 225, 0.86)',
    speed: [26, 64],
    size: [6, 14],
    lifespanMs: [240, 420],
    spread: [24, 86],
  },
  'control-bindings-capture-start': {
    anchor: { x: 0.5, y: 0.5 },
    color: 'rgba(255, 235, 185, 0.88)',
    speed: [30, 72],
    size: [8, 18],
    lifespanMs: [320, 520],
    spread: [28, 110],
  },
  'control-bindings-capture-applied': {
    anchor: { x: 0.5, y: 0.5 },
    color: 'rgba(200, 255, 210, 0.9)',
    speed: [32, 76],
    size: [8, 18],
    lifespanMs: [320, 540],
    spread: [30, 120],
  },
  'control-bindings-capture-cancel': {
    anchor: { x: 0.5, y: 0.5 },
    color: 'rgba(255, 210, 170, 0.74)',
    speed: [24, 56],
    size: [6, 14],
    lifespanMs: [240, 400],
    spread: [22, 90],
  },
  'control-bindings-binding-reset': {
    anchor: { x: 0.5, y: 0.5 },
    color: 'rgba(200, 240, 255, 0.82)',
    speed: [26, 60],
    size: [6, 14],
    lifespanMs: [260, 440],
    spread: [24, 92],
  },
  'control-bindings-list-mode': {
    anchor: { x: 0.5, y: 0.52 },
    color: 'rgba(190, 235, 255, 0.82)',
    speed: [24, 58],
    size: [6, 14],
    lifespanMs: [240, 420],
    spread: [24, 88],
  },
  'control-bindings-page-change': {
    anchor: { x: 0.5, y: 0.52 },
    color: 'rgba(175, 225, 255, 0.78)',
    speed: [24, 58],
    size: [6, 14],
    lifespanMs: [240, 420],
    spread: [24, 84],
  },
  'forensic-scan-pulse': {
    anchor: { x: 0.5, y: 0.36 },
    color: 'rgba(120, 200, 255, 0.86)',
    speed: [32, 72],
    size: [6, 14],
    lifespanMs: [300, 520],
    spread: [30, 120],
  },
  'forensic-reveal-veil': {
    anchor: { x: 0.5, y: 0.36 },
    color: 'rgba(80, 255, 200, 0.88)',
    speed: [34, 78],
    size: [8, 18],
    lifespanMs: [320, 540],
    spread: [34, 126],
  },
  'generic-overlay-cue': {
    anchor: { x: 0.5, y: 0.5 },
    color: 'rgba(160, 220, 255, 0.8)',
    speed: [24, 60],
    size: [6, 14],
    lifespanMs: [260, 440],
    spread: [24, 110],
  },
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
  if (min >= max) {
    return min;
  }
  return min + Math.random() * (max - min);
}

export class ParticleEmitterRuntime {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {EventBus} eventBus
   * @param {object} [options]
   */
  constructor(canvas, eventBus, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.ctx = canvas && typeof canvas.getContext === 'function'
      ? canvas.getContext('2d')
      : null;

    this.options = {
      eventName: 'fx:particle_emit',
      maxEmitters: 14,
      maxParticlesPerEmitter: 32,
      globalMaxParticles: 320,
      presets: DEFAULT_PRESETS,
      getNow: () => (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now(),
      ...options,
    };

    this.emitters = [];
    this._emitterPool = [];
    this._particlePool = [];
    this._activeParticleCount = 0;
    this._unsubscribe = null;
    this._throttledSpawns = 0;
    this._suppressedEmitters = 0;
  }

  attach() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function' || this._unsubscribe) {
      return;
    }
    this._unsubscribe = this.eventBus.on(
      this.options.eventName,
      (descriptor) => {
        this._handleDescriptor(descriptor);
      }
    );
  }

  detach() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
    }
    this._unsubscribe = null;
    this._releaseAllEmitters();
  }

  update(deltaTime) {
    if (!this.emitters.length || !Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    const deltaMs = deltaTime * 1000;
    for (let i = this.emitters.length - 1; i >= 0; i -= 1) {
      const emitter = this.emitters[i];
      emitter.elapsedMs += deltaMs;
      if (emitter.elapsedMs >= emitter.durationMs) {
        this._releaseEmitter(i);
        continue;
      }

      const particles = emitter.particles;
      for (let j = particles.length - 1; j >= 0; j -= 1) {
        const particle = particles[j];
        particle.lifeMs += deltaMs;
        if (particle.lifeMs >= particle.ttlMs) {
          this._releaseParticle(particles, j);
          continue;
        }

        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.rotation += particle.rotationSpeed * deltaTime;
      }
    }
  }

  render(ctx = this.ctx) {
    if (!ctx || !this.emitters.length) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.emitters.length; i += 1) {
      const emitter = this.emitters[i];
      const particles = emitter.particles;
      for (let j = 0; j < particles.length; j += 1) {
        const particle = particles[j];
        const remaining = 1 - clamp(particle.lifeMs / particle.ttlMs, 0, 1);
        const alpha = particle.baseAlpha * remaining;
        if (alpha <= 0.01) {
          continue;
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.ellipse(
          particle.x,
          particle.y,
          particle.size,
          particle.size * particle.aspect,
          particle.rotation,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  getStats() {
    return {
      activeEmitters: this.emitters.length,
      pooledEmitters: this._emitterPool.length,
      activeParticles: this._activeParticleCount,
      pooledParticles: this._particlePool.length,
      throttledSpawns: this._throttledSpawns,
      suppressedEmitters: this._suppressedEmitters,
      maxParticlesPerEmitter: this.options.maxParticlesPerEmitter,
      globalMaxParticles: this.options.globalMaxParticles,
    };
  }

  _handleDescriptor(descriptor) {
    if (!descriptor || this.emitters.length >= this.options.maxEmitters) {
      return;
    }

    const preset = this._resolvePreset(descriptor);
    const emitter = this._acquireEmitter(descriptor, preset);
    if (!emitter) {
      return;
    }

    const allocation = this._calculateSpawnAllocation(descriptor);
    if (!allocation || allocation.toSpawn <= 0) {
      this._suppressedEmitters += 1;
      this._emitterPool.push(emitter);
      return;
    }

    if (allocation.throttled) {
      emitter.durationMs = Math.max(120, Math.round(emitter.durationMs * 0.85));
      emitter.intensity = Math.max(0.35, emitter.intensity * 0.88);
      this._throttledSpawns += allocation.throttledAmount;
    }

    this.emitters.push(emitter);
    this._spawnParticles(emitter, descriptor, preset, allocation);
  }

  _calculateSpawnAllocation(descriptor) {
    const spawnBudgetRaw = Number(descriptor?.spawnCount ?? 1);
    const spawnBudget = Math.max(1, Math.round(spawnBudgetRaw));
    const maxPerEmitter = Math.max(1, Number(this.options.maxParticlesPerEmitter));
    const allowed = Math.min(spawnBudget, maxPerEmitter);

    const rawGlobalLimit = Number(this.options.globalMaxParticles);
    const globalLimit = Number.isFinite(rawGlobalLimit) && rawGlobalLimit > 0
      ? Math.max(rawGlobalLimit, allowed)
      : Infinity;

    const availableGlobal = globalLimit === Infinity
      ? allowed
      : Math.max(0, globalLimit - this._activeParticleCount);

    let toSpawn = Math.min(allowed, availableGlobal);
    let throttledAmount = 0;
    let throttled = false;
    let throttleReason = null;

    if (toSpawn <= 0) {
      return {
        spawnBudget,
        allowed,
        toSpawn: 0,
        throttled: true,
        throttledAmount: spawnBudget,
        throttleReason: availableGlobal <= 0 ? 'global_capacity' : 'per_emitter',
        globalLimit,
        availableGlobal,
      };
    }

    if (allowed < spawnBudget) {
      throttled = true;
      throttledAmount += spawnBudget - allowed;
      throttleReason = 'per_emitter';
    }

    if (toSpawn < allowed) {
      throttled = true;
      throttledAmount += allowed - toSpawn;
      throttleReason = 'global_capacity';
    }

    if (globalLimit !== Infinity && globalLimit > 0) {
      const projected = this._activeParticleCount + toSpawn;
      const loadFactor = projected / globalLimit;
      if (loadFactor >= 0.92) {
        const reduced = Math.max(1, Math.floor(toSpawn * 0.5));
        throttledAmount += toSpawn - reduced;
        toSpawn = reduced;
        throttled = true;
        throttleReason = 'load_factor';
      } else if (loadFactor >= 0.8) {
        const reduced = Math.max(1, Math.floor(toSpawn * 0.7));
        throttledAmount += toSpawn - reduced;
        toSpawn = reduced;
        throttled = true;
        throttleReason = 'load_factor';
      }
    }

    return {
      spawnBudget,
      allowed,
      toSpawn,
      throttled,
      throttledAmount,
      throttleReason,
      globalLimit,
      availableGlobal,
    };
  }

  _resolvePreset(descriptor) {
    const presetId = descriptor?.preset || descriptor?.effectId || 'generic-overlay-cue';
    return this.options.presets[presetId] || this.options.presets['generic-overlay-cue'];
  }

  _acquireEmitter(descriptor, preset) {
    const emitter = this._emitterPool.pop() || {
      id: 0,
      durationMs: 0,
      elapsedMs: 0,
      intensity: 1,
      particles: [],
      anchor: { x: 0.5, y: 0.5 },
      seed: 0,
    };

    emitter.id = (emitter.id + 1) % Number.MAX_SAFE_INTEGER;
    emitter.durationMs = Math.max(120, Number(descriptor?.durationMs ?? descriptor?.duration ?? 320));
    emitter.elapsedMs = 0;
    emitter.intensity = clamp(Number(descriptor?.intensity ?? 0.65), 0.05, 2.5);
    emitter.anchor = this._resolveAnchor(preset?.anchor);
    emitter.seed = this.options.getNow();
    emitter.particles.length = 0;
    return emitter;
  }

  _resolveAnchor(anchor) {
    const canvasWidth = this.canvas?.width ?? 1280;
    const canvasHeight = this.canvas?.height ?? 720;
    const normX = clamp(Number(anchor?.x ?? 0.5), 0, 1);
    const normY = clamp(Number(anchor?.y ?? 0.5), 0, 1);
    return {
      x: normX * canvasWidth,
      y: normY * canvasHeight,
    };
  }

  _spawnParticles(emitter, descriptor, preset, allocation) {
    const toSpawn = Math.max(0, Math.round(allocation?.toSpawn ?? 0));
    if (toSpawn <= 0) {
      return;
    }

    const rawSpread = Array.isArray(preset.spread) ? preset.spread : [preset.spread || 48, (preset.spread || 48) * 1.6];
    const spreadMin = Number.isFinite(rawSpread[0]) ? rawSpread[0] : 24;
    const spreadMax = Number.isFinite(rawSpread[1]) ? rawSpread[1] : Math.max(spreadMin * 1.25, 48);
    const rawSpeed = Array.isArray(preset.speed) ? preset.speed : [preset.speed || 32, (preset.speed || 32) * 1.4];
    const speedMin = Number.isFinite(rawSpeed[0]) ? rawSpeed[0] : 20;
    const speedMax = Number.isFinite(rawSpeed[1]) ? rawSpeed[1] : Math.max(speedMin * 1.5, 60);
    const rawSize = Array.isArray(preset.size) ? preset.size : [preset.size || 8, (preset.size || 8) * 1.6];
    const sizeMin = Number.isFinite(rawSize[0]) ? rawSize[0] : 6;
    const sizeMax = Number.isFinite(rawSize[1]) ? rawSize[1] : Math.max(sizeMin * 1.4, 14);
    const rawLifespan = Array.isArray(preset.lifespanMs)
      ? preset.lifespanMs
      : [preset.lifespanMs || 320, (preset.lifespanMs || 320) * 1.6];
    const lifeMin = Number.isFinite(rawLifespan[0]) ? rawLifespan[0] : 240;
    const lifeMax = Number.isFinite(rawLifespan[1]) ? rawLifespan[1] : Math.max(lifeMin * 1.4, 420);
    const baseAlpha = clamp(preset.baseAlpha ?? 1, 0.05, 1);

    for (let i = 0; i < toSpawn; i += 1) {
      const particle = this._acquireParticle();
      particle.x = emitter.anchor.x + randomRange(-spreadMax, spreadMax);
      particle.y = emitter.anchor.y + randomRange(-spreadMax, spreadMax);
      const radius = randomRange(spreadMin, spreadMax) * emitter.intensity;
      const angle = Math.random() * Math.PI * 2;
      const velocity = randomRange(speedMin, speedMax) * emitter.intensity;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.lifeMs = 0;
      particle.ttlMs = randomRange(lifeMin, lifeMax) * emitter.intensity;
      particle.size = randomRange(sizeMin, sizeMax) * (0.6 + Math.random() * 0.5);
      particle.aspect = 0.6 + Math.random() * 0.4;
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = (Math.random() - 0.5) * 1.5;
      particle.baseAlpha = baseAlpha;
      particle.color = preset.color || 'rgba(160, 220, 255, 0.85)';
      emitter.particles.push(particle);
      this._activeParticleCount += 1;

      // Slightly bias spawn outward to create bloom
      particle.x += Math.cos(angle) * radius * 0.2;
      particle.y += Math.sin(angle) * radius * 0.2;
    }
  }

  _acquireParticle() {
    return this._particlePool.pop() || {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifeMs: 0,
      ttlMs: 0,
      size: 4,
      aspect: 1,
      rotation: 0,
      rotationSpeed: 0,
      baseAlpha: 1,
      color: 'rgba(255,255,255,0.8)',
    };
  }

  _releaseParticle(particles, index) {
    const particle = particles[index];
    if (!particle) {
      return;
    }
    particles.splice(index, 1);
    this._particlePool.push(particle);
    this._activeParticleCount = Math.max(0, this._activeParticleCount - 1);
  }

  _releaseEmitter(index) {
    const emitter = this.emitters[index];
    if (!emitter) {
      return;
    }

    const particles = emitter.particles;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particles.pop();
      this._particlePool.push(particle);
      this._activeParticleCount = Math.max(0, this._activeParticleCount - 1);
    }

    this.emitters.splice(index, 1);
    this._emitterPool.push(emitter);
  }

  _releaseAllEmitters() {
    for (let i = this.emitters.length - 1; i >= 0; i -= 1) {
      this._releaseEmitter(i);
    }
    this.emitters.length = 0;
  }
}
