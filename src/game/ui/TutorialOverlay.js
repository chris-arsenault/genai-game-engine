/**
 * TutorialOverlay
 *
 * Canvas-based UI overlay for displaying tutorial prompts,
 * highlights, and progress indicators.
 */

export class TutorialOverlay {
  constructor(canvas, eventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.events = eventBus;

    // Overlay state
    this.visible = false;
    this.currentPrompt = null;
    this.fadeAlpha = 0;
    this.targetAlpha = 1;
    this.fadeSpeed = 3; // Alpha per second

    // Default styling
    this.style = {
      promptBox: {
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        borderColor: '#4a9eff',
        borderWidth: 2,
        padding: 20,
        maxWidth: 500,
        borderRadius: 8,
      },
      text: {
        titleColor: '#4a9eff',
        descriptionColor: '#e0e0e0',
        titleFont: 'bold 18px Arial',
        descriptionFont: '14px Arial',
        lineHeight: 22,
      },
      progress: {
        backgroundColor: 'rgba(60, 60, 70, 0.8)',
        fillColor: '#4a9eff',
        height: 8,
        borderRadius: 4,
      },
      skipButton: {
        text: '[ESC] Skip Tutorial',
        color: '#888888',
        font: '12px Arial',
      },
      highlight: {
        color: 'rgba(74, 158, 255, 0.3)',
        borderColor: '#4a9eff',
        borderWidth: 3,
        pulseSpeed: 2, // Hz
      },
    };

    // Animation state
    this.pulseTime = 0;
    this.highlightEntities = [];
  }

  /**
   * Initialize overlay
   */
  init() {
    // Subscribe to tutorial events
    this.events.subscribe('tutorial:started', () => {
      this.show();
    });

    this.events.subscribe('tutorial:step_started', (data) => {
      this.showPrompt(data);
    });

    this.events.subscribe('tutorial:step_completed', () => {
      // Brief fade before next step
      this.targetAlpha = 0.5;
    });

    this.events.subscribe('tutorial:completed', () => {
      this.hide();
    });

    this.events.subscribe('tutorial:skipped', () => {
      this.hide();
    });
  }

  /**
   * Show the overlay
   */
  show() {
    this.visible = true;
    this.targetAlpha = 1;
  }

  /**
   * Hide the overlay
   */
  hide() {
    this.visible = false;
    this.targetAlpha = 0;
    this.currentPrompt = null;
  }

  /**
   * Show tutorial prompt
   * @param {Object} promptData
   */
  showPrompt(promptData) {
    this.currentPrompt = promptData;
    this.targetAlpha = 1;
    this.highlightEntities = promptData.highlight?.entityTag ? [promptData.highlight.entityTag] : [];
  }

  /**
   * Update overlay
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    if (!this.visible && this.fadeAlpha === 0) return;

    // Fade animation
    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.fadeSpeed * deltaTime);
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.fadeSpeed * deltaTime);
    }

    // Pulse animation for highlights
    this.pulseTime += deltaTime;
  }

  /**
   * Render overlay
   */
  render() {
    if (!this.visible && this.fadeAlpha === 0) return;
    if (!this.currentPrompt) return;

    const ctx = this.ctx;
    const alpha = this.fadeAlpha;

    ctx.save();

    // Apply global alpha
    ctx.globalAlpha = alpha;

    // Render prompt box
    this.renderPromptBox(this.currentPrompt);

    // Render progress bar
    this.renderProgress(this.currentPrompt);

    // Render skip button if allowed
    if (this.currentPrompt.canSkip) {
      this.renderSkipButton();
    }

    ctx.restore();
  }

  /**
   * Render prompt box with title and description
   * @param {Object} prompt
   */
  renderPromptBox(prompt) {
    const ctx = this.ctx;
    const style = this.style.promptBox;

    // Calculate position
    const x = prompt.position?.x || this.canvas.width / 2;
    const y = prompt.position?.y || 100;

    // Measure text
    ctx.font = this.style.text.descriptionFont;
    const lines = this.wrapText(prompt.description, style.maxWidth - style.padding * 2);
    const textHeight = lines.length * this.style.text.lineHeight;

    // Calculate box dimensions
    const boxWidth = style.maxWidth;
    const boxHeight = style.padding * 2 + 30 + textHeight; // 30 for title
    const boxX = x - boxWidth / 2;
    const boxY = y;

    // Draw box background
    ctx.fillStyle = style.backgroundColor;
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, style.borderRadius);
    ctx.fill();

    // Draw box border
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, style.borderRadius);
    ctx.stroke();

    // Draw title
    ctx.font = this.style.text.titleFont;
    ctx.fillStyle = this.style.text.titleColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(prompt.title, boxX + style.padding, boxY + style.padding);

    // Draw description
    ctx.font = this.style.text.descriptionFont;
    ctx.fillStyle = this.style.text.descriptionColor;
    let lineY = boxY + style.padding + 30;
    for (const line of lines) {
      ctx.fillText(line, boxX + style.padding, lineY);
      lineY += this.style.text.lineHeight;
    }
  }

  /**
   * Render progress bar
   * @param {Object} prompt
   */
  renderProgress(prompt) {
    const ctx = this.ctx;
    const style = this.style.progress;

    const progressPercent = (prompt.stepIndex + 1) / prompt.totalSteps;

    // Position at bottom of screen
    const barWidth = 300;
    const barX = this.canvas.width / 2 - barWidth / 2;
    const barY = this.canvas.height - 50;

    // Draw background
    ctx.fillStyle = style.backgroundColor;
    this.roundRect(ctx, barX, barY, barWidth, style.height, style.borderRadius);
    ctx.fill();

    // Draw fill
    ctx.fillStyle = style.fillColor;
    this.roundRect(ctx, barX, barY, barWidth * progressPercent, style.height, style.borderRadius);
    ctx.fill();

    // Draw progress text
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Step ${prompt.stepIndex + 1} of ${prompt.totalSteps}`,
      this.canvas.width / 2,
      barY + style.height + 8
    );
  }

  /**
   * Render skip button
   */
  renderSkipButton() {
    const ctx = this.ctx;
    const style = this.style.skipButton;

    ctx.font = style.font;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(style.text, this.canvas.width / 2, this.canvas.height - 10);
  }

  /**
   * Wrap text to fit within maxWidth
   * @param {string} text
   * @param {number} maxWidth
   * @returns {string[]}
   */
  wrapText(text, maxWidth) {
    const ctx = this.ctx;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
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

  /**
   * Draw rounded rectangle
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} radius
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.visible = false;
    this.currentPrompt = null;
  }
}
