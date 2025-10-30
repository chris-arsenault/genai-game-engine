/**
 * InteractionPromptOverlay
 *
 * Renders contextual prompts (e.g., "Press E to examine") anchored
 * either to the player's HUD or a world position supplied by gameplay systems.
 */
import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { hydratePromptWithBinding } from '../utils/controlBindingPrompts.js';
import { subscribe as subscribeControlBindings } from '../state/controlBindingsStore.js';
export class InteractionPromptOverlay {
  constructor(canvas, eventBus, camera, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.camera = camera;
    const styleOverrides = options.styleOverrides ?? {};
    const { palette, typography, metrics } = overlayTheme;
    this.style = withOverlayTheme({
      backgroundColor: palette.backgroundPrimary,
      borderColor: palette.outlineStrong,
      borderWidth: 2,
      textColor: palette.textPrimary,
      font: typography.hud,
      paddingX: metrics.hudPaddingX,
      paddingY: metrics.hudPaddingY,
      maxWidth: options.maxWidth || metrics.hudMaxWidth,
      cornerRadius: metrics.overlayCornerRadius,
      shadowColor: 'rgba(0, 0, 0, 0.6)',
      shadowBlur: 18,
      lineHeight: 22
    }, styleOverrides);

    this.visible = false;
    this.prompt = null;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = options.fadeSpeed || 8;
    this.pointerScreen = null;

    this._unbindShow = null;
    this._unbindHide = null;
    this._unsubscribeBindings = null;
    this.bindingAction = null;
    this.bindingFallback = 'interact';
    this.basePrompt = '';
  }

  init() {
    this._unbindShow = this.eventBus.on('ui:show_prompt', (data) => {
      this.showPrompt(data);
    });
    this._unbindHide = this.eventBus.on('ui:hide_prompt', () => {
      this.hidePrompt();
    });
    this._unsubscribeBindings = subscribeControlBindings(() => {
      if (this.visible && this.bindingAction) {
        this._refreshPromptBinding();
      }
    });
  }

  showPrompt(data) {
    if (!data || !data.text) {
      return;
    }

    const wasVisible = this.visible;

    this.basePrompt = typeof data.text === 'string' ? data.text : '';
    this.bindingAction = typeof data.bindingAction === 'string' && data.bindingAction.length
      ? data.bindingAction
      : null;
    this.bindingFallback = typeof data.bindingFallback === 'string' && data.bindingFallback.length
      ? data.bindingFallback
      : 'interact';

    this.prompt = {
      text: this._resolvePromptText(),
      worldPosition: data.position ? { ...data.position } : null
    };

    this.visible = true;
    this.targetAlpha = 1;

    if (!wasVisible) {
      emitOverlayVisibility(this.eventBus, 'interactionPrompt', true, {
        source: data?.source ?? 'showPrompt',
        text: this.prompt.text,
      });
    }
  }

  hidePrompt() {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }

    const wasVisible = this.visible;
    this.visible = false;
    this.targetAlpha = 0;
    this.bindingAction = null;
    this.bindingFallback = 'interact';
    this.basePrompt = '';

    if (wasVisible) {
      emitOverlayVisibility(this.eventBus, 'interactionPrompt', false, {
        source: 'hidePrompt',
      });
    }
  }

  update(deltaTime) {
    if (!this.prompt && this.fadeAlpha === 0) {
      return;
    }

    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.fadeSpeed * deltaTime);
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.fadeSpeed * deltaTime);
    }
  }

  render(ctx) {
    if ((!this.prompt || !this.visible) && this.fadeAlpha === 0) {
      return;
    }

    const prompt = this.prompt;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Determine desired screen position
    let targetX = canvasWidth / 2;
    let targetY = canvasHeight - 120;
    this.pointerScreen = null;

    if (prompt?.worldPosition) {
      const projected = this.camera.worldToScreen(prompt.worldPosition.x, prompt.worldPosition.y);
      this.pointerScreen = {
        x: projected.x,
        y: projected.y
      };
      targetX = projected.x;
      targetY = projected.y - 60;
    }

    const paddingX = this.style.paddingX;
    const paddingY = this.style.paddingY;
    const maxWidth = this.style.maxWidth;

    ctx.save();
    ctx.font = this.style.font;

    const lines = this._wrapText(ctx, prompt?.text || '', maxWidth - paddingX * 2);
    const measuredWidth = lines.length > 0
      ? Math.max(...lines.map((line) => ctx.measureText(line).width))
      : 0;
    const textWidth = Math.min(maxWidth - paddingX * 2, measuredWidth);
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = lines.length * this.style.lineHeight + paddingY * 2;

    const halfWidth = boxWidth / 2;
    let boxX = targetX - halfWidth;
    let boxY = targetY - boxHeight / 2;

    // Clamp to canvas bounds
    const margin = overlayTheme.metrics.overlayMargin;
    boxX = Math.max(margin, Math.min(canvasWidth - boxWidth - margin, boxX));
    boxY = Math.max(margin, Math.min(canvasHeight - boxHeight - margin, boxY));

    ctx.globalAlpha = this.fadeAlpha;
    ctx.shadowColor = this.style.shadowColor;
    ctx.shadowBlur = this.style.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // Draw background with rounded corners
    this._drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, this.style.cornerRadius);
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fill();
    ctx.lineWidth = this.style.borderWidth;
    ctx.strokeStyle = this.style.borderColor;
    ctx.stroke();

    // Draw text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = this.style.textColor;
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + paddingX, boxY + paddingY + i * this.style.lineHeight);
    }

    // Draw pointer connector if anchored to world
    if (this.pointerScreen) {
      ctx.beginPath();
      ctx.moveTo(
        this.pointerScreen.x,
        this.pointerScreen.y - 8
      );
      const boxCenterX = boxX + boxWidth / 2;
      const boxTop = boxY + boxHeight;
      ctx.lineTo(boxCenterX, boxTop);
      ctx.strokeStyle = overlayTheme.palette.outlineSoft;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  cleanup() {
    if (typeof this._unbindShow === 'function') {
      this._unbindShow();
      this._unbindShow = null;
    }
    if (typeof this._unbindHide === 'function') {
      this._unbindHide();
      this._unbindHide = null;
    }
    if (typeof this._unsubscribeBindings === 'function') {
      this._unsubscribeBindings();
      this._unsubscribeBindings = null;
    }
  }

  _resolvePromptText() {
    if (!this.bindingAction) {
      return this.basePrompt;
    }
    return hydratePromptWithBinding(this.basePrompt, this.bindingAction, {
      fallbackActionText: this.bindingFallback,
    });
  }

  _refreshPromptBinding() {
    if (!this.prompt) {
      return;
    }
    this.prompt.text = this._resolvePromptText();
  }

  _wrapText(ctx, text, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  _drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
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
