import { overlayTheme } from './theme/overlayTheme.js';

/**
 * MovementIndicatorOverlay
 *
 * Provides lightweight visual feedback that movement input registered.
 * Draws a short-lived pulse at the player's projected screen position.
 */
export class MovementIndicatorOverlay {
  constructor(canvas, eventBus, camera, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.camera = camera;
    this.indicator = null;
    this.defaultTTL = options.duration || 0.18; // seconds
    const { palette } = overlayTheme;
    this.style = {
      coreRadius: options.coreRadius || 10,
      haloRadius: options.haloRadius || 24,
      pulseColor: options.color || palette.accent,
      haloColor: options.haloColor || 'rgba(91, 201, 255, 0.32)',
      outlineColor: options.outlineColor || palette.outlineSoft,
      arrowColor: options.arrowColor || palette.accentMuted,
    };
    this._unbindMoving = null;
    this._unbindMoved = null;
    this._fxThrottleMs = Math.max(60, Number(options.fxThrottleMs) || 140);
    this._lastFxEmitAt = 0;
  }

  init() {
    this._unbindMoving = this.eventBus.on('player:moving', (data = {}) => {
      this._updateIndicator(data.position, data.direction, 'player:moving', {
        speed: data.speed,
        velocity: data.velocity,
      });
    });

    this._unbindMoved = this.eventBus.on('player:moved', (data = {}) => {
      if (!this.indicator) {
        this._updateIndicator(data.to, data.velocity, 'player:moved', {
          speed: data.speed,
          velocity: data.velocity,
        });
        return;
      }

      this.indicator.worldPosition = {
        x: data.to.x,
        y: data.to.y
      };

      if (data.velocity) {
        this.indicator.direction = this._normalize(data.velocity);
      }
    });
  }

  update(deltaTime) {
    if (!this.indicator) {
      return;
    }

    this.indicator.ttl = Math.max(0, this.indicator.ttl - deltaTime);
    if (this.indicator.ttl === 0) {
      this.indicator = null;
    }
  }

  render(ctx) {
    if (!this.indicator) {
      return;
    }

    const { worldPosition, direction, ttl, maxTTL } = this.indicator;
    const alpha = Math.max(0, Math.min(1, ttl / maxTTL)) * 0.9;
    const screen = this.camera.worldToScreen(worldPosition.x, worldPosition.y);

    ctx.save();
    ctx.globalAlpha = alpha;

    const haloGradient = ctx.createRadialGradient(
      screen.x,
      screen.y,
      this.style.coreRadius * 0.6,
      screen.x,
      screen.y,
      this.style.haloRadius
    );
    haloGradient.addColorStop(0, this.style.pulseColor);
    haloGradient.addColorStop(0.7, this.style.haloColor);
    haloGradient.addColorStop(1, 'rgba(91, 201, 255, 0)');

    // Halo
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.style.haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // Core pulse
    ctx.fillStyle = this.style.pulseColor;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.style.coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.style.outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Direction indicator
    if (direction.x !== 0 || direction.y !== 0) {
      const arrowLength = 22;
      const endX = screen.x + direction.x * arrowLength;
      const endY = screen.y + direction.y * arrowLength;
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = this.style.arrowColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  cleanup() {
    if (typeof this._unbindMoving === 'function') {
      this._unbindMoving();
      this._unbindMoving = null;
    }

    if (typeof this._unbindMoved === 'function') {
      this._unbindMoved();
      this._unbindMoved = null;
    }
  }

  _updateIndicator(position = { x: 0, y: 0 }, direction = { x: 0, y: 0 }, source = 'player:moving', metadata = {}) {
    const norm = this._normalize(direction);
    const previous = this.indicator;
    this.indicator = {
      worldPosition: {
        x: position.x,
        y: position.y
      },
      direction: norm,
      ttl: this.defaultTTL,
      maxTTL: this.defaultTTL
    };

    if (source === 'player:moving') {
      const directionChanged = !previous || !previous.direction || Math.abs(previous.direction.x - norm.x) > 0.05 || Math.abs(previous.direction.y - norm.y) > 0.05;
      if (!previous || directionChanged) {
        this._emitMovementFx({
          source,
          position,
          direction: norm,
          rawDirection: direction,
          speed: metadata?.speed,
          velocity: metadata?.velocity,
        });
      }
    }
  }

  _normalize(vector = { x: 0, y: 0 }) {
    const magnitude = Math.hypot(vector.x || 0, vector.y || 0);
    if (magnitude < 0.001) {
      return { x: 0, y: 0 };
    }
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
  }

  _emitMovementFx(context = {}) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }

    const now = Date.now();
    if (now - this._lastFxEmitAt < this._fxThrottleMs) {
      return;
    }
    this._lastFxEmitAt = now;

    const direction = context.direction ?? { x: 0, y: 0 };
    const hasDirection = Math.abs(direction.x) > 0.01 || Math.abs(direction.y) > 0.01;
    const speed = this._resolveSpeed(context);

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'movementIndicatorPulse',
      source: 'MovementIndicatorOverlay',
      context: {
        source: context.source ?? 'player:moving',
        hasDirection,
        speed,
      },
    });
  }

  _resolveSpeed(context = {}) {
    if (typeof context.speed === 'number' && !Number.isNaN(context.speed)) {
      return context.speed;
    }
    const velocity = context.velocity;
    if (velocity && typeof velocity.x === 'number' && typeof velocity.y === 'number') {
      return Math.hypot(velocity.x, velocity.y);
    }
    const rawDirection = context.rawDirection;
    if (rawDirection && typeof rawDirection.x === 'number' && typeof rawDirection.y === 'number') {
      return Math.hypot(rawDirection.x, rawDirection.y);
    }
    return 0;
  }
}
