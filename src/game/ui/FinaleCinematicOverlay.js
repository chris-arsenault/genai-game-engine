import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { getBindingLabels } from '../utils/controlBindingPrompts.js';

const DEFAULT_LAYOUT = {
  width: 780,
  height: 420,
};

const COLUMN_GAP = 32;
const PANEL_PADDING = 28;

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const corner = Math.max(0, radius ?? 0);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + width - corner, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
  ctx.lineTo(x + width, y + height - corner);
  ctx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  ctx.lineTo(x + corner, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.closePath();
}

function cloneBeat(beat, index) {
  const fallbackTitle = `Beat ${index + 1}`;
  return {
    id:
      typeof beat?.id === 'string' && beat.id.trim().length
        ? beat.id.trim()
        : `beat_${index + 1}`,
    order: Number.isFinite(beat?.order) ? beat.order : index + 1,
    title:
      typeof beat?.title === 'string' && beat.title.trim().length
        ? beat.title.trim()
        : fallbackTitle,
    description:
      typeof beat?.description === 'string' && beat.description.trim().length
        ? beat.description.trim()
        : '',
    narrativeBeat:
      typeof beat?.narrativeBeat === 'string' && beat.narrativeBeat.trim().length
        ? beat.narrativeBeat.trim()
        : null,
    telemetryTag:
      typeof beat?.telemetryTag === 'string' && beat.telemetryTag.trim().length
        ? beat.telemetryTag.trim()
        : null,
  };
}

function formatBinding(action, fallback) {
  const labels = getBindingLabels(action, { fallbackLabel: fallback });
  if (Array.isArray(labels) && labels.length > 0) {
    return labels.join(' / ');
  }
  return fallback;
}

export class FinaleCinematicOverlay {
  constructor(canvas, eventBus, options = {}) {
    if (!canvas) {
      throw new Error('FinaleCinematicOverlay requires a canvas reference');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus ?? null;

    this.visible = false;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = options.fadeSpeed ?? 6;

    const { palette, typography, metrics } = overlayTheme;
    const overrides = options.styleOverrides ?? {};

    this.layout = {
      width: options.width ?? DEFAULT_LAYOUT.width,
      height: options.height ?? DEFAULT_LAYOUT.height,
    };

    this.style = {
      backdrop: overrides.backdrop ?? 'rgba(4, 10, 18, 0.82)',
      panel: withOverlayTheme(
        {
          background: palette.backgroundSurface,
          borderColor: palette.outlineStrong,
          borderWidth: 2,
          cornerRadius: metrics.overlayCornerRadius,
          shadowColor: 'rgba(0, 0, 0, 0.52)',
          shadowBlur: 28,
        },
        overrides.panel
      ),
      title: withOverlayTheme(
        {
          titleFont: typography.hud,
          titleColor: palette.textPrimary,
          subtitleFont: typography.small,
          subtitleColor: palette.textMuted,
          cinematicFont: typography.small,
          cinematicColor: palette.textMuted,
        },
        overrides.title
      ),
      summary: withOverlayTheme(
        {
          font: typography.body,
          color: palette.textSecondary,
          lineHeight: 20,
        },
        overrides.summary
      ),
      beats: withOverlayTheme(
        {
          headingFont: typography.small,
          headingColor: palette.textMuted,
          titleFont: typography.body,
          descriptionFont: typography.small,
          color: palette.textPrimary,
          activeColor: palette.accent,
          completedColor: '#6df7cb',
          lockedColor: 'rgba(140, 164, 190, 0.38)',
          haloColor: 'rgba(91, 201, 255, 0.22)',
          badgeFont: typography.small,
        },
        overrides.beats
      ),
      prompt: withOverlayTheme(
        {
          font: typography.small,
          color: palette.textMuted,
          accent: palette.accent,
        },
        overrides.prompt
      ),
    };

    this.callbacks = {
      onAdvance: typeof options.onAdvance === 'function' ? options.onAdvance : null,
      onSkip: typeof options.onSkip === 'function' ? options.onSkip : null,
    };

    this.cinematic = null;
    this.activeBeatIndex = -1;
    this.revealedBeats = 0;
    this.status = 'idle';
    this.visuals = {
      hero: null,
      beats: {},
    };

    this._offConfirm = null;
    this._offCancel = null;
  }

  _renderHeroPanel(ctx, descriptor, x, y, width, maxHeight) {
    if (!descriptor || !Number.isFinite(width) || width <= 0) {
      return 0;
    }

    const height = Math.max(0, maxHeight ?? 0);
    if (height === 0) {
      return 0;
    }

    const status = typeof descriptor.status === 'string' ? descriptor.status : 'unknown';
    const image = descriptor.image ?? null;
    let drawWidth = width;
    let drawHeight = height;

    if (status === 'ready' && image && image.width > 0 && image.height > 0) {
      const ratio = image.height / image.width;
      drawHeight = Math.min(height, drawWidth * ratio);
      drawWidth = Math.min(width, drawHeight / ratio);
    } else {
      drawHeight = Math.min(height, Math.max(140, Math.min(width * 0.62, height)));
      drawWidth = Math.min(width, drawHeight * 1.6);
    }

    const offsetX = x + Math.max(0, (width - drawWidth) / 2);
    const offsetY = y + Math.max(0, (height - drawHeight) / 2);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    if (status === 'ready' && image && image.width > 0) {
      ctx.globalAlpha = 0.95;
      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = 'rgba(10, 24, 40, 0.72)';
      ctx.fillRect(x, y, width, height);

      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(91, 201, 255, 0.42)';
      ctx.strokeRect(x + 6, y + 6, width - 12, height - 12);
      ctx.setLineDash([]);

      ctx.font = this.style.title.subtitleFont;
      ctx.fillStyle = this.style.title.subtitleColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const message =
        status === 'loading'
          ? 'Loading cinematic artwork…'
          : status === 'unsupported'
            ? 'Cinematic artwork unavailable in this build'
            : 'Cinematic artwork pending';
      ctx.fillText(message, x + width / 2, y + height / 2);
    }

    ctx.restore();
    return height;
  }

  init() {
    if (!this.eventBus) {
      return;
    }

    this._offConfirm = this.eventBus.on('input:confirm:pressed', () => {
      if (this.visible && typeof this.callbacks.onAdvance === 'function') {
        this.callbacks.onAdvance({ source: 'input:confirm' });
      }
    });

    this._offCancel = this.eventBus.on('input:cancel:pressed', () => {
      if (this.visible && typeof this.callbacks.onSkip === 'function') {
        this.callbacks.onSkip({ source: 'input:cancel' });
      }
    });
  }

  cleanup() {
    this.hide('cleanup');
    this.cinematic = null;
    this.activeBeatIndex = -1;
    this.revealedBeats = 0;
    this.status = 'idle';
    this.callbacks = { onAdvance: null, onSkip: null };
    this.visuals = {
      hero: null,
      beats: {},
    };

    if (typeof this._offConfirm === 'function') {
      this._offConfirm();
    }
    if (typeof this._offCancel === 'function') {
      this._offCancel();
    }
    this._offConfirm = null;
    this._offCancel = null;
  }

  setCallbacks(callbacks = {}) {
    if (!callbacks || typeof callbacks !== 'object') {
      this.callbacks = { onAdvance: null, onSkip: null };
      return;
    }

    this.callbacks = {
      onAdvance: typeof callbacks.onAdvance === 'function' ? callbacks.onAdvance : null,
      onSkip: typeof callbacks.onSkip === 'function' ? callbacks.onSkip : null,
    };
  }

  setCinematic(payload = {}, options = {}) {
    this.cinematic = this._sanitizeCinematic(payload);
    this.activeBeatIndex = -1;
    this.revealedBeats = 0;
    this.status = 'queued';
    this.visuals = this._sanitizeVisuals(options.visuals);

    if (options.progress) {
      this.setProgress(options.progress);
    }
  }

  setProgress(progress = {}) {
    if (!this.cinematic) {
      return;
    }

    const beats = Array.isArray(this.cinematic.epilogueBeats)
      ? this.cinematic.epilogueBeats
      : [];
    const maxIndex = beats.length > 0 ? beats.length - 1 : -1;

    if (Number.isFinite(progress.activeIndex)) {
      const normalized = Math.trunc(progress.activeIndex);
      this.activeBeatIndex = Math.max(-1, Math.min(maxIndex, normalized));
    }

    if (Number.isFinite(progress.revealedCount)) {
      const normalized = Math.trunc(progress.revealedCount);
      this.revealedBeats = Math.max(0, Math.min(beats.length, normalized));
    }

    if (this.activeBeatIndex >= 0 && this.revealedBeats <= this.activeBeatIndex) {
      this.revealedBeats = this.activeBeatIndex + 1;
    }

    if (typeof progress.status === 'string') {
      const normalized = progress.status.trim().toLowerCase();
      if (['queued', 'playing', 'complete', 'skipped'].includes(normalized)) {
        this.status = normalized;
      }
    }
  }

  show(source = 'show') {
    if (this.visible) {
      return;
    }
    this.visible = true;
    this.targetAlpha = 1;
    emitOverlayVisibility(this.eventBus, 'finaleCinematic', true, { source });
  }

  hide(source = 'hide') {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    const wasVisible = this.visible;
    this.visible = false;
    this.targetAlpha = 0;

    if (wasVisible) {
      emitOverlayVisibility(this.eventBus, 'finaleCinematic', false, { source });
    }
  }

  update(deltaTime) {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.fadeSpeed * deltaTime);
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.fadeSpeed * deltaTime);
    }
  }

  render(ctx = this.ctx) {
    if ((!this.visible && this.fadeAlpha === 0) || !ctx) {
      return;
    }

    const canvasWidth = this.canvas?.width ?? ctx.canvas?.width ?? 1280;
    const canvasHeight = this.canvas?.height ?? ctx.canvas?.height ?? 720;

    const margin = overlayTheme?.metrics?.overlayMargin ?? 20;
    const panelWidth = Math.min(this.layout.width, canvasWidth - margin * 2);
    const panelHeight = Math.min(this.layout.height, canvasHeight - margin * 2);
    const panelX = Math.round((canvasWidth - panelWidth) / 2);
    const panelY = Math.round((canvasHeight - panelHeight) / 2);

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha * 0.85;
    ctx.fillStyle = this.style.backdrop;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    this._renderPanel(ctx, panelX, panelY, panelWidth, panelHeight);
    ctx.restore();
  }

  getState() {
    return {
      visible: this.visible,
      fadeAlpha: this.fadeAlpha,
      status: this.status,
      activeBeatIndex: this.activeBeatIndex,
      revealedBeats: this.revealedBeats,
      cinematic: this.cinematic ? { ...this.cinematic } : null,
    };
  }

  _renderPanel(ctx, x, y, width, height) {
    drawRoundedRect(ctx, x, y, width, height, this.style.panel.cornerRadius);
    ctx.fillStyle = this.style.panel.background;
    ctx.shadowColor = this.style.panel.shadowColor;
    ctx.shadowBlur = this.style.panel.shadowBlur;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = this.style.panel.borderWidth;
    ctx.strokeStyle = this.style.panel.borderColor;
    ctx.stroke();

    const padding = PANEL_PADDING;
    const contentWidth = width - padding * 2;
    const contentHeight = height - padding * 2;
    const contentX = x + padding;
    const contentY = y + padding;

    this._renderHeader(ctx, contentX, contentY, contentWidth);

    const summaryWidth = Math.floor(contentWidth * 0.48);
    const beatsWidth = contentWidth - summaryWidth - COLUMN_GAP;
    const summaryX = contentX;
    const beatsX = contentX + summaryWidth + COLUMN_GAP;
    const bodyY = contentY + 62;

    this._renderSummary(ctx, summaryX, bodyY, summaryWidth, contentHeight - 62);
    this._renderBeats(ctx, beatsX, bodyY, beatsWidth, contentHeight - 62);
    this._renderPrompts(ctx, contentX, y + height - padding + 6, contentWidth);
  }

  _renderHeader(ctx, x, y, width) {
    const title = this.cinematic?.stanceTitle ?? 'Finale Cinematic Ready';
    const subtitleParts = [];
    if (this.cinematic?.cinematicId) {
      subtitleParts.push(this.cinematic.cinematicId);
    }
    if (this.cinematic?.musicCue) {
      subtitleParts.push(`Cue: ${this.cinematic.musicCue}`);
    }
    if (this.cinematic?.libraryVersion) {
      subtitleParts.push(`Library v${this.cinematic.libraryVersion}`);
    }

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    ctx.font = this.style.title.titleFont;
    ctx.fillStyle = this.style.title.titleColor;
    ctx.fillText(title, x, y);

    const subtitle = subtitleParts.join('  •  ');
    if (subtitle.length) {
      ctx.font = this.style.title.subtitleFont;
      ctx.fillStyle = this.style.title.subtitleColor;
      ctx.fillText(subtitle, x, y + 28);
    }

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(94, 205, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 44);
    ctx.lineTo(x + width, y + 44);
    ctx.stroke();
    ctx.restore();
  }

  _renderSummary(ctx, x, y, width, height) {
    const summary = this.cinematic?.summary ?? '';
    const beats = Array.isArray(this.cinematic?.epilogueBeats)
      ? this.cinematic.epilogueBeats.length
      : 0;
    const statusLine = `${Math.min(this.revealedBeats, beats)}/${beats} beats surfaced`;

    const maxHeight = Math.max(0, height);
    let cursorY = y;

    const heroDescriptor = this.visuals?.hero ?? null;
    if (heroDescriptor && maxHeight > 40) {
      const heroHeight = this._renderHeroPanel(
        ctx,
        heroDescriptor,
        x,
        cursorY,
        width,
        Math.max(120, Math.min(maxHeight * 0.55, width * 0.75))
      );
      cursorY += heroHeight;
      if (heroHeight > 0) {
        cursorY += 16;
      }
    }

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = this.style.summary.font;
    ctx.fillStyle = this.style.summary.color;

    const lines = this._wrapText(
      ctx,
      summary ||
        'The finale cinematic sequence is ready. Press Confirm to advance through each epilogue beat.',
      width
    );
    const lineHeight = this.style.summary.lineHeight;
    const maxY = y + maxHeight - 28;
    for (const line of lines.slice(0, 6)) {
      if (cursorY + lineHeight > maxY) {
        break;
      }
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 12;
    ctx.font = this.style.title.subtitleFont;
    ctx.fillStyle = this.style.title.subtitleColor;
    ctx.fillText(statusLine, x, Math.min(cursorY, y + maxHeight - 16));

    ctx.restore();
  }

  _renderBeats(ctx, x, y, width, height) {
    const beats = Array.isArray(this.cinematic?.epilogueBeats)
      ? this.cinematic.epilogueBeats
      : [];

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let cursorY = y;
    const maxY = y + height;
    const gap = 16;

    for (let index = 0; index < beats.length; index++) {
      if (cursorY > maxY) {
        break;
      }

      const beat = beats[index];
      const revealed = index < this.revealedBeats;
      const active = index === this.activeBeatIndex;
      const completed = revealed && index < this.activeBeatIndex;
      const beatId = typeof beat?.id === 'string' ? beat.id : null;
      const visual =
        beatId && this.visuals?.beats && typeof this.visuals.beats === 'object'
          ? this.visuals.beats[beatId] ?? null
          : null;

      const blockTop = cursorY;
      const blockHeight = this._renderBeat(ctx, {
        x,
        y: cursorY,
        width,
        maxHeight: Math.max(0, maxY - cursorY),
        beat,
        index,
        revealed,
        active,
        completed,
        visual,
      });
      cursorY = blockTop + blockHeight + gap;
    }

    ctx.restore();
  }

  _renderBeat(ctx, { x, y, width, maxHeight, beat, index, revealed, active, completed, visual }) {
    const title = beat?.title ?? `Beat ${index + 1}`;
    const description = beat?.description ?? '';
    const titleColor = active
      ? this.style.beats.activeColor
      : completed
        ? this.style.beats.completedColor
        : revealed
          ? this.style.beats.color
          : this.style.beats.lockedColor;

    const descriptionColor = revealed
      ? this.style.summary.color
      : this.style.beats.lockedColor;

    const { width: thumbWidth, height: thumbHeight, status: thumbStatus } =
      this._measureBeatThumbnail(visual, Math.min(96, width * 0.34), Math.min(88, maxHeight || 88));
    const textOffset = thumbWidth > 0 ? thumbWidth + 14 : 0;
    const textWidth = Math.max(60, width - textOffset);

    ctx.save();
    ctx.font = this.style.beats.descriptionFont;
    const text =
      revealed && description.length ? description : 'Awaiting playback…';
    const lines = this._wrapText(ctx, text, textWidth);
    ctx.restore();

    const lineHeight = 16;
    const renderedLines = Math.min(lines.length, 3);
    const textHeight = 22 + renderedLines * lineHeight;
    const contentHeight = Math.max(textHeight, thumbHeight, 54);
    let constrainedHeight =
      maxHeight && maxHeight > 0 ? Math.min(contentHeight, maxHeight) : contentHeight;
    constrainedHeight = Math.max(32, constrainedHeight);

    if (thumbWidth > 0 && constrainedHeight > 0) {
      const thumbY = y + Math.max(0, (constrainedHeight - thumbHeight) / 2);
      this._drawBeatThumbnail(
        ctx,
        visual,
        x,
        thumbY,
        thumbWidth,
        Math.min(thumbHeight, constrainedHeight),
        thumbStatus
      );
    }

    ctx.save();
    ctx.fillStyle = titleColor;
    ctx.font = this.style.beats.titleFont;
    ctx.fillText(`${index + 1}. ${title}`, x + textOffset, y);

    ctx.font = this.style.beats.descriptionFont;
    ctx.fillStyle = descriptionColor;
    let textY = y + 22;
    for (let i = 0; i < renderedLines; i++) {
      const line = lines[i];
      if (!line) {
        break;
      }
      if (textY + lineHeight > y + constrainedHeight) {
        break;
      }
      ctx.fillText(line, x + textOffset, textY);
      textY += lineHeight;
    }
    ctx.restore();

    if (active) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = this.style.beats.haloColor;
      ctx.fillRect(x - 10, y - 6, width + 20, constrainedHeight + 12);
      ctx.restore();
    }

    return constrainedHeight;
  }

  _measureBeatThumbnail(descriptor, maxWidth, maxHeight) {
    if (!descriptor || !Number.isFinite(maxWidth) || maxWidth <= 0) {
      return { width: 0, height: 0, status: null };
    }

    const status = typeof descriptor.status === 'string' ? descriptor.status : 'unknown';
    const image = descriptor.image ?? null;

    if (status === 'ready' && image && image.width > 0 && image.height > 0) {
      let width = Math.max(56, Math.min(maxWidth, image.width));
      let height = (image.height / image.width) * width;
      const limit = Math.max(48, maxHeight || height);
      if (height > limit) {
        height = limit;
        width = (image.width / image.height) * height;
      }
      return {
        width,
        height,
        status,
      };
    }

    if (status === 'unsupported') {
      return {
        width: 0,
        height: 0,
        status,
      };
    }

    return {
      width: Math.max(0, Math.min(maxWidth, 78)),
      height: Math.max(0, Math.min(maxHeight || 64, 64)),
      status,
    };
  }

  _drawBeatThumbnail(ctx, descriptor, x, y, width, height, status) {
    if (width <= 0 || height <= 0) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, width, height, 10);
    ctx.clip();

    if (status === 'ready' && descriptor?.image) {
      const image = descriptor.image;
      const ratio = image.height / image.width;
      let drawWidth = width;
      let drawHeight = drawWidth * ratio;
      if (drawHeight > height) {
        drawHeight = height;
        drawWidth = drawHeight / ratio;
      }
      const offsetX = x + (width - drawWidth) / 2;
      const offsetY = y + (height - drawHeight) / 2;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = 'rgba(9, 20, 34, 0.8)';
      ctx.fillRect(x, y, width, height);

      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(91, 201, 255, 0.38)';
      ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
      ctx.setLineDash([]);

      if (status === 'loading') {
        ctx.font = this.style.prompt.font;
        ctx.fillStyle = this.style.prompt.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading…', x + width / 2, y + height / 2);
      }
    }

    ctx.restore();
  }

  _renderPrompts(ctx, x, baselineY, width) {
    const confirm = formatBinding('confirm', 'Enter');
    const cancel = formatBinding('cancel', 'Esc');

    const prompts = [];
    if (this.status !== 'complete' && this.status !== 'skipped') {
      prompts.push(`Advance: ${confirm}`);
    } else {
      prompts.push(`Close: ${confirm}`);
    }
    prompts.push(`Skip: ${cancel}`);

    const text = prompts.join('  ·  ');

    ctx.save();
    ctx.font = this.style.prompt.font;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillStyle = this.style.prompt.color;

    const measured = ctx.measureText(text);
    if (measured.width > width) {
      ctx.fillText(prompts[0], x + width, baselineY);
    } else {
      ctx.fillText(text, x + width, baselineY);
    }

    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    if (!text || !ctx) {
      return [''];
    }
    const words = text.split(/\s+/);
    const lines = [];
    let current = words.shift() || '';

    for (const word of words) {
      const candidate = `${current} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current.length) {
      lines.push(current);
    }

    return lines;
  }

  _sanitizeVisuals(input) {
    const result = {
      hero: null,
      beats: {},
    };

    if (!input || typeof input !== 'object') {
      return result;
    }

    if (input.hero && typeof input.hero === 'object') {
      result.hero = input.hero;
    }

    if (input.beats && typeof input.beats === 'object') {
      const beatMap = {};
      for (const [beatId, descriptor] of Object.entries(input.beats)) {
        if (!descriptor || typeof descriptor !== 'object') {
          continue;
        }
        beatMap[beatId] = descriptor;
      }
      result.beats = beatMap;
    }

    return result;
  }

  _sanitizeCinematic(payload = {}) {
    const beats = Array.isArray(payload?.epilogueBeats) ? payload.epilogueBeats : [];

    return {
      cinematicId:
        typeof payload?.cinematicId === 'string' && payload.cinematicId.trim().length
          ? payload.cinematicId.trim()
          : null,
      stanceId:
        typeof payload?.stanceId === 'string' && payload.stanceId.trim().length
          ? payload.stanceId.trim()
          : null,
      stanceFlag:
        typeof payload?.stanceFlag === 'string' && payload.stanceFlag.trim().length
          ? payload.stanceFlag.trim()
          : null,
      stanceTitle:
        typeof payload?.stanceTitle === 'string' && payload.stanceTitle.trim().length
          ? payload.stanceTitle.trim()
          : 'Finale Cinematic',
      summary: typeof payload?.summary === 'string' ? payload.summary : '',
      musicCue:
        typeof payload?.musicCue === 'string' && payload.musicCue.trim().length
          ? payload.musicCue.trim()
          : null,
      libraryVersion:
        typeof payload?.libraryVersion === 'string' && payload.libraryVersion.trim().length
          ? payload.libraryVersion.trim()
          : payload?.libraryVersion ?? null,
      source:
        typeof payload?.source === 'string' && payload.source.trim().length
          ? payload.source.trim()
          : 'Act3FinaleCinematicSequencer',
      dispatchedAt: Number.isFinite(payload?.dispatchedAt) ? payload.dispatchedAt : Date.now(),
      epilogueBeats: beats.map((beat, index) => cloneBeat(beat, index)),
    };
  }
}
