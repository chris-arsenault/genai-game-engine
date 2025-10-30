/**
 * CrossroadsBranchLandingOverlay
 *
 * Temporary overlay shown after the player commits to an Act 2 branch.
 * Summarises the selected thread and nudges the player toward the checkpoint.
 */
export class CrossroadsBranchLandingOverlay {
  constructor(canvas, eventBus, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.displayTime = options.displayTime ?? 7.5; // seconds
    this.fadeTime = options.fadeTime ?? 0.6;
    this.width = options.width ?? 520;
    this.height = options.height ?? 140;
    this.style = {
      backgroundColor: 'rgba(16, 18, 32, 0.88)',
      borderColor: '#4EB8FF',
      titleColor: '#FFFFFF',
      textColor: '#E0F4FF',
      accentColor: '#4EB8FF',
      fontFamily: 'Arial, sans-serif',
      titleFontSize: 20,
      summaryFontSize: 14,
      instructionFontSize: 16,
      padding: 18,
      ...options.style,
    };

    this._unsubscribes = [];
    this.activeMessage = null;
  }

  init() {
    if (!this.eventBus) {
      return;
    }

    this._unsubscribes.push(
      this.eventBus.on('crossroads:branch_landing_ready', (payload) => this._setMessage(payload))
    );

    this._unsubscribes.push(
      this.eventBus.on('crossroads:branch_landing_clear', () => {
        this.activeMessage = null;
      })
    );
  }

  update(deltaTime) {
    if (!this.activeMessage) {
      return;
    }

    this.activeMessage.elapsed += deltaTime;
    const remaining = this.displayTime - this.activeMessage.elapsed;
    if (remaining <= 0) {
      this.activeMessage = null;
    } else {
      this.activeMessage.alpha = this._computeAlpha();
    }
  }

  render(ctx) {
    if (!this.activeMessage || !ctx) {
      return;
    }

    const { branchTitle, summary, instructions, alpha } = this.activeMessage;
    const canvasWidth = this.canvas?.width ?? 1280;
    const canvasHeight = this.canvas?.height ?? 720;
    const x = (canvasWidth - this.width) / 2;
    const y = canvasHeight - this.height - 48;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(x, y, this.width, this.height);

    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.width, this.height);

    const padding = this.style.padding;
    const textX = x + padding;
    let cursorY = y + padding;

    ctx.fillStyle = this.style.accentColor;
    ctx.font = `600 ${this.style.titleFontSize}px ${this.style.fontFamily}`;
    ctx.fillText(branchTitle, textX, cursorY);

    cursorY += this.style.titleFontSize + 10;
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.summaryFontSize}px ${this.style.fontFamily}`;

    const summaryLines = this._wrapText(ctx, summary, this.width - padding * 2);
    for (const line of summaryLines.slice(0, 3)) {
      ctx.fillText(line, textX, cursorY);
      cursorY += this.style.summaryFontSize + 4;
    }

    cursorY += 6;
    ctx.fillStyle = this.style.accentColor;
    ctx.font = `600 ${this.style.instructionFontSize}px ${this.style.fontFamily}`;
    const instructionLines = this._wrapText(ctx, instructions, this.width - padding * 2);
    for (const line of instructionLines.slice(0, 2)) {
      ctx.fillText(line, textX, cursorY);
      cursorY += this.style.instructionFontSize + 4;
    }

    ctx.restore();
  }

  cleanup() {
    for (const off of this._unsubscribes) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._unsubscribes.length = 0;
  }

  _setMessage(payload = {}) {
    const branchTitle = payload?.branchTitle || 'Branch Selected';
    const summary =
      payload?.summary ||
      'Intel package locked. Zara will feed you the rest once you clear the checkpoint.';
    const instructions =
      payload?.instructions ||
      'Proceed to the checkpoint to launch the mission.';

    this.activeMessage = {
      branchTitle,
      summary,
      instructions,
      elapsed: 0,
      alpha: 0,
    };
  }

  _computeAlpha() {
    if (!this.activeMessage) {
      return 0;
    }
    const t = this.activeMessage.elapsed;
    const total = this.displayTime;
    const fade = this.fadeTime;

    if (t < fade) {
      return Math.min(1, t / fade);
    }

    if (t > total - fade) {
      const remaining = total - t;
      return Math.max(0, remaining / fade);
    }

    return 1;
  }

  _wrapText(ctx, text, maxWidth) {
    if (!text) {
      return [''];
    }

    const words = text.split(' ');
    const lines = [];
    let currentLine = words.shift() || '';

    for (const word of words) {
      const testLine = `${currentLine} ${word}`;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    lines.push(currentLine);
    return lines;
  }
}

