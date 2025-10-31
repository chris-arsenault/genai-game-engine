/**
 * DetectiveVisionOverlay
 *
 * Displays a neon noir overlay when detective vision is active, including:
 * - Screen tint and pulse highlights for hidden evidence
 * - Energy/cooldown gauge for ability management feedback
 */

import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { emitOverlayVisibility } from './helpers/overlayEvents.js';

const DEFAULT_HIGHLIGHT_REFRESH = 0.4;
const DEFAULT_FADE_SPEED = 6;
const ENERGY_LABEL_THRESHOLD = 0.35;
const DETECTIVE_VISION_RAIN_INTERVAL = 0.8;
const DETECTIVE_VISION_NEON_INTERVAL = 1.12;
const DETECTIVE_VISION_MEMORY_INTERVAL_MS = 620;

export class DetectiveVisionOverlay {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {EventBus} eventBus
   * @param {Camera} camera
   * @param {ComponentRegistry} componentRegistry
   * @param {object} [options]
   */
  constructor(canvas, eventBus, camera, componentRegistry, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.camera = camera;
    this.componentRegistry = componentRegistry;

    const { palette, typography, metrics } = overlayTheme;

    this.options = {
      fadeSpeed: options.fadeSpeed ?? DEFAULT_FADE_SPEED,
      highlightRefreshInterval: options.highlightRefreshInterval ?? DEFAULT_HIGHLIGHT_REFRESH,
      gaugeStyle: withOverlayTheme(
        {
          width: 240,
          height: 18,
          x: metrics.overlayMargin,
          y: metrics.overlayMargin,
          background: 'rgba(8, 18, 24, 0.76)',
          border: palette.outlineStrong,
          fill: palette.accentPrimary ?? '#00ffd0',
          cooldownFill: 'rgba(255, 110, 155, 0.86)',
          textColor: palette.textPrimary,
          statusFont: typography.hud,
          valueFont: typography.hud,
          cornerRadius: metrics.overlayCornerRadius,
        },
        options.gaugeStyle ?? {}
      ),
    };

    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.gaugeAlpha = 0;
    this.pulseTime = 0;
    this.highlightRefreshTimer = 0;

    this.highlightTargets = new Map();
    this.energy = 1;
    this.energyMax = 1;
    this.cooldown = 0;
    this.cooldownMax = 0;
    this.canActivate = false;
    this.active = false;

    this.colors = {
      tint: 'rgba(0, 240, 255, 0.23)',
      primaryRing: 'rgba(0, 255, 204, 0.95)',
      primaryFill: 'rgba(0, 255, 204, 0.14)',
      secondaryRing: 'rgba(140, 160, 255, 0.9)',
      secondaryFill: 'rgba(120, 130, 255, 0.12)',
    };

    this._offHandlers = [];
    this._rainFxTimer = 0;
    this._neonFxTimer = 0;
    this._lastMemoryFxAt = 0;
    this._statusSnapshot = {
      active: false,
      energy: this.energy,
      energyMax: this.energyMax,
      energyPercent: 1,
      cooldown: this.cooldown,
      cooldownMax: this.cooldownMax,
      cooldownPercent: 0,
      canActivate: false,
      timestamp: Date.now(),
    };
  }

  init() {
    this._bind(
      this.eventBus.on('detective_vision:status', (payload) => {
        this._handleStatus(payload);
      })
    );

    this._bind(
      this.eventBus.on('detective_vision:activated', (payload) => {
        this._handleActivated(payload);
      })
    );

    this._bind(
      this.eventBus.on('detective_vision:deactivated', (payload) => {
        this._handleDeactivated(payload);
      })
    );

    this._bind(
      this.eventBus.on('evidence:collected', (payload = {}) => {
        if (payload && payload.entityId != null) {
          this.highlightTargets.delete(payload.entityId);
        }
      })
    );
  }

  cleanup() {
    while (this._offHandlers.length) {
      const off = this._offHandlers.pop();
      if (typeof off === 'function') {
        off();
      }
    }
    this.highlightTargets.clear();
    this._rainFxTimer = 0;
    this._neonFxTimer = 0;
    this._lastMemoryFxAt = 0;
  }

  update(deltaTime) {
    if (this.targetAlpha > this.fadeAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.options.fadeSpeed * deltaTime);
    } else if (this.targetAlpha < this.fadeAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.options.fadeSpeed * deltaTime);
    }

    const shouldShowGauge =
      this.active ||
      (this.cooldownMax > 0 && this.cooldown > 0.05) ||
      (this.energyMax > 0 && this.energy < this.energyMax - 0.05);

    if (shouldShowGauge) {
      this.gaugeAlpha = Math.min(1, this.gaugeAlpha + this.options.fadeSpeed * deltaTime * 0.65);
    } else {
      this.gaugeAlpha = Math.max(0, this.gaugeAlpha - this.options.fadeSpeed * deltaTime * 0.65);
    }

    if (this.active) {
      this.pulseTime += deltaTime;
      this.highlightRefreshTimer -= deltaTime;
      if (this.highlightRefreshTimer <= 0) {
        this._refreshHighlightTargets();
        this.highlightRefreshTimer = this.options.highlightRefreshInterval;
      }
      this._rainFxTimer = Math.max(0, this._rainFxTimer - deltaTime);
      if (this._rainFxTimer <= 0) {
        this._rainFxTimer = DETECTIVE_VISION_RAIN_INTERVAL;
        this._emitFxCue('detectiveVisionRainfall', {
          durationMs: 720,
        });
      }
      this._neonFxTimer = Math.max(0, this._neonFxTimer - deltaTime);
      if (this._neonFxTimer <= 0) {
        this._neonFxTimer = DETECTIVE_VISION_NEON_INTERVAL;
        this._emitFxCue('detectiveVisionNeonBloom', {
          durationMs: 640,
        });
      }
    } else {
      this.pulseTime += deltaTime * 0.5;
      if (this.fadeAlpha === 0 && this.highlightTargets.size > 0) {
        this.highlightTargets.clear();
      }
    }
  }

  /**
   * Draw overlay elements onto provided context.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const drawTint = this.fadeAlpha > 0.001;
    const drawGauge = this.gaugeAlpha > 0.001;

    if (!drawTint && !drawGauge) {
      return;
    }

    if (drawTint) {
      this._drawScreenTint(ctx);
      this._drawHighlights(ctx);
    }

    if (drawGauge) {
      this._drawGauge(ctx);
    }
  }

  /**
   * Surface overlay state for debug overlay.
   * @returns {object}
   */
  getStatus() {
    return { ...this._statusSnapshot };
  }

  _handleActivated(payload) {
    this.active = true;
    this.targetAlpha = 1;
    this.highlightRefreshTimer = 0;
    this._rainFxTimer = 0;
    this._neonFxTimer = 0;
    this._refreshHighlightTargets();
    emitOverlayVisibility(this.eventBus, 'detectiveVision', true, {
      duration: payload?.duration ?? null,
      source: 'detectiveVisionOverlay',
      fxCue: 'detectiveVisionActivation',
    });
    this._emitFxCue('detectiveVisionActivation', {
      duration: payload?.duration ?? null,
    });
  }

  _handleDeactivated(payload) {
    this.active = false;
    this.targetAlpha = 0;
    this.highlightRefreshTimer = 0;
    emitOverlayVisibility(this.eventBus, 'detectiveVision', false, {
      cooldown: payload?.cooldown ?? null,
      reason: payload?.reason ?? 'deactivated',
      source: 'detectiveVisionOverlay',
      fxCue: 'detectiveVisionDeactivate',
    });
    this._emitFxCue('detectiveVisionDeactivate', {
      cooldown: payload?.cooldown ?? null,
      reason: payload?.reason ?? 'deactivated',
    });
  }

  _handleStatus(payload = {}) {
    if (typeof payload.active === 'boolean') {
      this.active = payload.active;
      this.targetAlpha = this.active ? 1 : 0;
      if (this.active) {
        this.highlightRefreshTimer = 0;
      }
    }

    if (typeof payload.energy === 'number') {
      this.energy = Math.max(0, payload.energy);
    }
    if (typeof payload.energyMax === 'number' && payload.energyMax > 0) {
      this.energyMax = payload.energyMax;
    }
    if (typeof payload.cooldown === 'number') {
      this.cooldown = Math.max(0, payload.cooldown);
    }
    if (typeof payload.cooldownMax === 'number') {
      this.cooldownMax = Math.max(0, payload.cooldownMax);
    }
    if (typeof payload.canActivate === 'boolean') {
      this.canActivate = payload.canActivate;
    }

    if (payload.reason === 'activated') {
      this._refreshHighlightTargets();
    }

    this._updateStatusSnapshot(payload.timestamp ?? Date.now());
  }

  _refreshHighlightTargets() {
    if (
      !this.componentRegistry ||
      typeof this.componentRegistry.queryEntities !== 'function' ||
      typeof this.componentRegistry.getComponent !== 'function'
    ) {
      return;
    }

    const entityIds = this.componentRegistry.queryEntities(['Evidence', 'Transform']);
    if (!Array.isArray(entityIds)) {
      return;
    }

    const nextTargets = new Map();
    for (const entityId of entityIds) {
      const evidence = this.componentRegistry.getComponent(entityId, 'Evidence');
      if (!evidence || evidence.collected) {
        continue;
      }
      const transform = this.componentRegistry.getComponent(entityId, 'Transform');
      if (!transform) {
        continue;
      }
      const hidden = Boolean(evidence.hidden) || evidence.requires === 'detective_vision';
      if (!hidden) {
        continue;
      }
      const sprite = this.componentRegistry.getComponent(entityId, 'Sprite');
      const baseRadius = sprite
        ? Math.max(sprite.width ?? 24, sprite.height ?? 24) * 0.6
        : 18;
      nextTargets.set(entityId, {
        entityId,
        radius: baseRadius,
        requiresDetectiveVision:
          !evidence.requires || evidence.requires === 'detective_vision',
        seed: Math.random() * Math.PI * 2,
        title: evidence.title || evidence.id || 'hidden evidence',
      });
    }

    this.highlightTargets = nextTargets;
    if (nextTargets.size > 0) {
      const now = Date.now();
      if (!this._lastMemoryFxAt || now - this._lastMemoryFxAt >= DETECTIVE_VISION_MEMORY_INTERVAL_MS) {
        this._lastMemoryFxAt = now;
        this._emitFxCue('detectiveVisionMemoryFragmentBurst', {
          durationMs: 820,
          context: { highlightCount: nextTargets.size },
        });
      }
    }
  }

  _drawScreenTint(ctx) {
    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    ctx.fillStyle = this.colors.tint;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  _drawHighlights(ctx) {
    if (this.highlightTargets.size === 0) {
      return;
    }

    const camera = this.camera;
    if (!camera || typeof camera.worldToScreen !== 'function') {
      return;
    }

    ctx.save();
    for (const target of this.highlightTargets.values()) {
      const evidence = this.componentRegistry.getComponent(target.entityId, 'Evidence');
      if (!evidence || evidence.collected) {
        this.highlightTargets.delete(target.entityId);
        continue;
      }

      if (!evidence.hidden && evidence.requires !== 'detective_vision') {
        this.highlightTargets.delete(target.entityId);
        continue;
      }

      const transform = this.componentRegistry.getComponent(target.entityId, 'Transform');
      if (!transform) {
        this.highlightTargets.delete(target.entityId);
        continue;
      }

      const screen = camera.worldToScreen(transform.x, transform.y);
      if (!this._isOnScreen(screen)) {
        continue;
      }

      const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 4 + target.seed);
      const radius = target.radius * (0.95 + 0.12 * pulse);
      const fillRadius = target.radius * (1.35 + 0.18 * pulse);

      ctx.globalAlpha = this.fadeAlpha * (target.requiresDetectiveVision ? 0.9 : 0.6);

      ctx.fillStyle = target.requiresDetectiveVision ? this.colors.primaryFill : this.colors.secondaryFill;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, fillRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 2.5 + pulse * 1.4;
      ctx.strokeStyle = target.requiresDetectiveVision
        ? this.colors.primaryRing
        : this.colors.secondaryRing;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawGauge(ctx) {
    const style = this.options.gaugeStyle;
    const energyPercent = this.energyMax > 0 ? Math.min(1, this.energy / this.energyMax) : 0;
    const cooldownPercent = this.cooldownMax > 0 ? Math.min(1, this.cooldown / this.cooldownMax) : 0;

    let statusLabel = 'Detective Vision Ready';
    if (this.active) {
      statusLabel = 'Detective Vision Active';
    } else if (cooldownPercent > 0) {
      statusLabel = 'Cooling Down';
    } else if (!this.canActivate || energyPercent < ENERGY_LABEL_THRESHOLD) {
      statusLabel = 'Recharge Detective Vision';
    }

    ctx.save();
    ctx.globalAlpha = this.gaugeAlpha;

    const cornerRadius = style.cornerRadius ?? overlayTheme.metrics.overlayCornerRadius;
    const x = style.x ?? overlayTheme.metrics.overlayMargin;
    const y = style.y ?? overlayTheme.metrics.overlayMargin;
    const width = style.width ?? 240;
    const height = style.height ?? 18;

    ctx.fillStyle = style.background;
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 2;
    this._drawRoundedRect(ctx, x, y, width, height, cornerRadius);
    ctx.fill();
    ctx.stroke();

    const innerX = x + 3;
    const innerY = y + 3;
    const innerWidth = width - 6;
    const innerHeight = height - 6;

    ctx.fillStyle = style.fill;
    ctx.fillRect(innerX, innerY, innerWidth * energyPercent, innerHeight);

    if (cooldownPercent > 0) {
      ctx.fillStyle = style.cooldownFill;
      ctx.fillRect(
        innerX + innerWidth * (1 - cooldownPercent),
        innerY,
        innerWidth * cooldownPercent,
        innerHeight
      );
    }

    ctx.fillStyle = style.textColor;
    ctx.font = style.statusFont || style.valueFont;
    ctx.textBaseline = 'bottom';
    ctx.fillText(statusLabel, x, y - 6);

    ctx.font = style.valueFont;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(energyPercent * 100)}%`, x + width / 2, y + height / 2);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    if (cooldownPercent > 0) {
      ctx.fillText(`CD ${Math.ceil(this.cooldown)}s`, x + width - 4, y - 8);
    } else if (!this.active && !this.canActivate) {
      ctx.fillText('Energy Low', x + width - 4, y - 8);
    }

    ctx.restore();
  }

  _updateStatusSnapshot(timestamp) {
    const energyPercent = this.energyMax > 0 ? Math.min(1, this.energy / this.energyMax) : 0;
    const cooldownPercent = this.cooldownMax > 0 ? Math.min(1, this.cooldown / this.cooldownMax) : 0;

    this._statusSnapshot = {
      active: this.active,
      energy: this.energy,
      energyMax: this.energyMax,
      energyPercent,
      cooldown: this.cooldown,
      cooldownMax: this.cooldownMax,
      cooldownPercent,
      canActivate: this.canActivate,
      timestamp,
    };
  }

  _bind(off) {
    if (typeof off === 'function') {
      this._offHandlers.push(off);
    }
  }

  _isOnScreen(screen) {
    const margin = 40;
    return (
      screen &&
      screen.x >= -margin &&
      screen.y >= -margin &&
      screen.x <= this.canvas.width + margin &&
      screen.y <= this.canvas.height + margin
    );
  }

  _emitFxCue(effectId, context = {}) {
    if (!effectId || !this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }
    this.eventBus.emit('fx:overlay_cue', {
      effectId,
      overlayId: 'detectiveVision',
      source: 'detectiveVisionOverlay',
      timestamp: Date.now(),
      ...context,
    });
  }

  _drawRoundedRect(ctx, x, y, width, height, radius = 6) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
