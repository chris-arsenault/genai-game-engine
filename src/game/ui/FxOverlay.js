import { overlayTheme } from './theme/overlayTheme.js';

/**
 * FxOverlay
 *
 * Lightweight screen-space FX layer that listens for fx:overlay_cue events and
 * renders short-lived canvas treatments (screen flashes, edge pulses, etc.).
 */
export class FxOverlay {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {EventBus} eventBus
   * @param {object} [options]
   */
  constructor(canvas, eventBus, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.effects = [];
    this._unbindFx = null;

    const { palette } = overlayTheme;

    this.theme = {
      activationInner: options.activationInner || 'rgba(80, 255, 225, 0.75)',
      activationOuter: options.activationOuter || 'rgba(40, 180, 200, 0)',
      activationRim: options.activationRim || palette.accent,
      activationDuration: options.activationDuration || 0.45,
      deactivateColor: options.deactivateColor || 'rgba(255, 120, 120, 0.6)',
      deactivateOuter: options.deactivateOuter || 'rgba(255, 0, 80, 0)',
      deactivateDuration: options.deactivateDuration || 0.35,
      deactivateRimColor: options.deactivateRimColor || 'rgba(255, 160, 160, 0.7)',
    };
  }

  init() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function') {
      return;
    }
    this._unbindFx = this.eventBus.on('fx:overlay_cue', (payload) => {
      this._handleFxCue(payload);
    });
  }

  update(deltaTime) {
    if (!this.effects.length) {
      return;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.elapsed += deltaTime;
      if (effect.elapsed >= effect.duration) {
        this.effects.splice(i, 1);
      }
    }
  }

  render(ctx) {
    if (!this.effects.length) {
      return;
    }
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i];
      if (typeof effect.render === 'function') {
        effect.render(ctx, effect, this.canvas, this.theme);
      }
    }
  }

  cleanup() {
    if (typeof this._unbindFx === 'function') {
      this._unbindFx();
    }
    this._unbindFx = null;
    this.effects.length = 0;
  }

  _handleFxCue(payload = {}) {
    if (!payload || !payload.effectId) {
      return;
    }

    switch (payload.effectId) {
      case 'detectiveVisionActivation':
        this._spawnActivationEffect(payload);
        break;
      case 'detectiveVisionDeactivate':
      case 'detectiveVisionDeactivation':
        this._spawnDeactivationEffect(payload);
        break;
      default:
        break;
    }
  }

  _spawnActivationEffect(payload) {
    const duration = Math.max(0.18, Number(payload.duration) || this.theme.activationDuration);
    this.effects.push({
      id: 'detectiveVisionActivation',
      elapsed: 0,
      duration,
      render: this._renderActivation.bind(this),
    });
  }

  _spawnDeactivationEffect(payload) {
    const duration = Math.max(0.16, Number(payload.cooldown) ? Math.min(Number(payload.cooldown), 1) : this.theme.deactivateDuration);
    this.effects.push({
      id: 'detectiveVisionDeactivate',
      elapsed: 0,
      duration,
      render: this._renderDeactivation.bind(this),
    });
  }

  _renderActivation(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.2);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const rimThickness = Math.max(4, maxRadius * 0.015);

    ctx.save();
    ctx.globalAlpha = eased;

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0, maxRadius * 0.15 * progress), cx, cy, maxRadius);
    gradient.addColorStop(0, theme.activationInner);
    gradient.addColorStop(0.6, theme.activationOuter);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = theme.activationRim;
    ctx.lineWidth = rimThickness;
    ctx.globalAlpha = eased * 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(canvas.width, canvas.height), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _renderDeactivation(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const fade = Math.pow(1 - progress, 1.5);
    const rimFade = fade * 0.9;

    ctx.save();
    ctx.globalAlpha = fade;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme.deactivateColor);
    gradient.addColorStop(1, theme.deactivateOuter);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rimThickness = Math.max(6, Math.min(canvas.width, canvas.height) * 0.02);
    ctx.strokeStyle = theme.deactivateRimColor;
    ctx.globalAlpha = rimFade;
    ctx.lineWidth = rimThickness;
    ctx.strokeRect(
      rimThickness / 2,
      rimThickness / 2,
      canvas.width - rimThickness,
      canvas.height - rimThickness
    );
    ctx.restore();
  }
}
