import { overlayTheme } from './theme/overlayTheme.js';

/**
 * FxOverlay
 *
 * Lightweight screen-space FX layer that listens for fx:overlay_cue events and
 * renders short-lived canvas treatments (screen flashes, edge pulses, quest
 * bursts, forensic scans, etc.).
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
      questPulseTop: options.questPulseTop || 'rgba(255, 220, 130, 0.85)',
      questPulseBottom: options.questPulseBottom || 'rgba(255, 160, 60, 0.0)',
      questPulseRim: options.questPulseRim || palette.highlight,
      questPulseDuration: options.questPulseDuration || 0.8,
      questCompleteInner: options.questCompleteInner || 'rgba(255, 255, 210, 0.9)',
      questCompleteOuter: options.questCompleteOuter || 'rgba(255, 190, 90, 0.0)',
      questCompleteRays: options.questCompleteRays || 'rgba(255, 220, 120, 0.8)',
      questCompleteDuration: options.questCompleteDuration || 1.05,
      forensicPulseInner: options.forensicPulseInner || 'rgba(120, 200, 255, 0.75)',
      forensicPulseOuter: options.forensicPulseOuter || 'rgba(30, 140, 220, 0)',
      forensicPulseDuration: options.forensicPulseDuration || 0.6,
      forensicRevealColor: options.forensicRevealColor || 'rgba(80, 255, 200, 0.8)',
      forensicRevealRim: options.forensicRevealRim || 'rgba(40, 200, 160, 0.4)',
      forensicRevealDuration: options.forensicRevealDuration || 0.75,
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
      case 'questMilestonePulse':
      case 'questUpdatePulse':
        this._spawnQuestMilestoneEffect(payload);
        break;
      case 'questCompleteBurst':
        this._spawnQuestCompleteEffect(payload);
        break;
      case 'forensicPulse':
      case 'forensicScanWave':
        this._spawnForensicPulseEffect(payload);
        break;
      case 'forensicRevealFlash':
        this._spawnForensicRevealEffect(payload);
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

  _spawnQuestMilestoneEffect(payload) {
    const duration = Math.max(0.3, Number(payload.duration) || this.theme.questPulseDuration);
    this.effects.push({
      id: 'questMilestonePulse',
      elapsed: 0,
      duration,
      render: this._renderQuestMilestone.bind(this),
    });
  }

  _spawnQuestCompleteEffect(payload) {
    const duration = Math.max(0.4, Number(payload.duration) || this.theme.questCompleteDuration);
    this.effects.push({
      id: 'questCompleteBurst',
      elapsed: 0,
      duration,
      render: this._renderQuestComplete.bind(this),
    });
  }

  _spawnForensicPulseEffect(payload) {
    const duration = Math.max(0.25, Number(payload.duration) || this.theme.forensicPulseDuration);
    this.effects.push({
      id: 'forensicPulse',
      elapsed: 0,
      duration,
      render: this._renderForensicPulse.bind(this),
    });
  }

  _spawnForensicRevealEffect(payload) {
    const duration = Math.max(0.3, Number(payload.duration) || this.theme.forensicRevealDuration);
    this.effects.push({
      id: 'forensicRevealFlash',
      elapsed: 0,
      duration,
      render: this._renderForensicReveal.bind(this),
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

  _renderQuestMilestone(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const intensity = Math.pow(1 - progress, 1.4);
    const bandHeight = Math.max(canvas.height * 0.28 * intensity, 40);

    ctx.save();
    ctx.globalAlpha = intensity;

    const gradient = ctx.createLinearGradient(0, 0, 0, bandHeight);
    gradient.addColorStop(0, theme.questPulseTop);
    gradient.addColorStop(1, theme.questPulseBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, bandHeight);

    ctx.strokeStyle = theme.questPulseRim;
    ctx.lineWidth = Math.max(3, bandHeight * 0.12);
    ctx.globalAlpha = intensity * 0.85;
    ctx.beginPath();
    ctx.moveTo(0, bandHeight);
    ctx.lineTo(canvas.width, bandHeight);
    ctx.stroke();
    ctx.restore();
  }

  _renderQuestComplete(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.3);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.max(canvas.width, canvas.height) * 0.6;

    ctx.save();
    ctx.globalAlpha = eased;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    gradient.addColorStop(0, theme.questCompleteInner);
    gradient.addColorStop(1, theme.questCompleteOuter);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rayCount = 12;
    ctx.strokeStyle = theme.questCompleteRays;
    ctx.lineWidth = Math.max(2, maxRadius * 0.015);
    ctx.globalAlpha = eased * 0.9;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount;
      const length = maxRadius * (0.65 + 0.35 * Math.sin(i * 1.37));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (maxRadius * 0.2), cy + Math.sin(angle) * (maxRadius * 0.2));
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderForensicPulse(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const fade = 1 - progress;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.15;
    const radius = baseRadius + baseRadius * progress * 2.5;

    ctx.save();
    ctx.globalAlpha = fade;

    const gradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.25, cx, cy, radius);
    gradient.addColorStop(0, theme.forensicPulseInner);
    gradient.addColorStop(1, theme.forensicPulseOuter);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.forensicPulseInner;
    ctx.lineWidth = Math.max(2, radius * 0.05);
    ctx.globalAlpha = fade * 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _renderForensicReveal(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = Math.pow(1 - progress, 1.1);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const outer = Math.max(canvas.width, canvas.height) * 0.45;

    ctx.save();
    ctx.globalAlpha = eased;

    ctx.strokeStyle = theme.forensicRevealRim;
    ctx.lineWidth = Math.max(4, outer * 0.02);
    ctx.beginPath();
    ctx.arc(cx, cy, outer * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = theme.forensicRevealColor;
    ctx.globalAlpha = eased * 0.8;
    ctx.fillRect(0, cy - 1, canvas.width, 2);
    ctx.fillRect(cx - 1, 0, 2, canvas.height);
    ctx.restore();
  }
}
