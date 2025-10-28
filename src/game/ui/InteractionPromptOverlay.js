/**
 * InteractionPromptOverlay
 *
 * Renders contextual prompts (e.g., "Press E to examine") anchored
 * either to the player's HUD or a world position supplied by gameplay systems.
 */
export class InteractionPromptOverlay {
  constructor(canvas, eventBus, camera, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.camera = camera;
    this.style = {
      backgroundColor: 'rgba(12, 18, 32, 0.88)',
      borderColor: '#4a9eff',
      borderWidth: 2,
      textColor: '#e8f1ff',
      font: '16px Arial',
      paddingX: 16,
      paddingY: 12,
      maxWidth: options.maxWidth || 320,
      cornerRadius: 8
    };

    this.visible = false;
    this.prompt = null;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = options.fadeSpeed || 8;
    this.pointerScreen = null;

    this._unbindShow = null;
    this._unbindHide = null;
  }

  init() {
    this._unbindShow = this.eventBus.on('ui:show_prompt', (data) => {
      this.showPrompt(data);
    });
    this._unbindHide = this.eventBus.on('ui:hide_prompt', () => {
      this.hidePrompt();
    });
  }

  showPrompt(data) {
    if (!data || !data.text) {
      return;
    }

    this.prompt = {
      text: data.text,
      worldPosition: data.position ? { ...data.position } : null
    };

    this.visible = true;
    this.targetAlpha = 1;
  }

  hidePrompt() {
    this.visible = false;
    this.targetAlpha = 0;
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
    const boxHeight = lines.length * 20 + paddingY * 2;

    const halfWidth = boxWidth / 2;
    let boxX = targetX - halfWidth;
    let boxY = targetY - boxHeight / 2;

    // Clamp to canvas bounds
    boxX = Math.max(20, Math.min(canvasWidth - boxWidth - 20, boxX));
    boxY = Math.max(20, Math.min(canvasHeight - boxHeight - 20, boxY));

    ctx.globalAlpha = this.fadeAlpha;

    // Draw background with rounded corners
    this._drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, this.style.cornerRadius);
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fill();
    ctx.lineWidth = this.style.borderWidth;
    ctx.strokeStyle = this.style.borderColor;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = this.style.textColor;
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + paddingX, boxY + paddingY + i * 20);
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
      ctx.strokeStyle = this.style.borderColor;
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
