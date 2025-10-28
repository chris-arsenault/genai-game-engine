/**
 * QuestNotification - Displays quest updates and notifications
 *
 * Shows temporary notifications for:
 * - Quest started
 * - Quest completed
 * - Objective completed
 * - Quest failed
 *
 * @class QuestNotification
 */
export class QuestNotification {
  /**
   * Create a QuestNotification
   * @param {number} width - Notification width
   * @param {Object} options - Configuration options
   */
  constructor(width, options = {}) {
    this.width = width;
    this.height = 80;
    this.x = options.x || 20;
    this.y = options.y || 20;

    // Notification queue
    this.notifications = [];
    this.currentNotification = null;
    this.displayTime = 4000; // 4 seconds
    this.fadeTime = 500; // 500ms fade
    this.currentTime = 0;
    this.alpha = 0;

    // Event bus for quest events
    this.eventBus = options.eventBus;

    // Style configuration
    this.style = {
      backgroundColor: '#1a1a2e',
      borderColor: '#6a9cf7',
      titleColor: '#6a9cf7',
      textColor: '#ffffff',
      completedColor: '#4CAF50',
      failedColor: '#f44336',
      fontSize: 14,
      titleFontSize: 16,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      ...options.style
    };

    // Subscribe to quest events
    this._subscribeToEvents();
  }

  /**
   * Initialize notification system
   */
  init() {
    console.log('[QuestNotification] Initialized');
  }

  /**
   * Subscribe to quest events
   * @private
   */
  _subscribeToEvents() {
    if (!this.eventBus) return;

    this.eventBus.subscribe('quest:started', (data) => {
      const questTitle = data?.quest?.title ?? data?.title ?? data?.questTitle ?? 'Unknown Quest';
      this.addNotification('Quest Started', questTitle, 'started');
    });

    this.eventBus.subscribe('quest:completed', (data) => {
      const questTitle = data?.quest?.title ?? data?.title ?? data?.questTitle ?? 'Unknown Quest';
      this.addNotification('Quest Completed', questTitle, 'completed');
    });

    this.eventBus.subscribe('quest:failed', (data) => {
      const questTitle = data?.quest?.title ?? data?.title ?? data?.questTitle ?? 'Unknown Quest';
      const reason = data?.reason ? `${questTitle}: ${data.reason}` : questTitle;
      this.addNotification('Quest Failed', reason, 'failed');
    });

    this.eventBus.subscribe('quest:objective_completed', (data) => {
      const message = data?.objective?.description ?? data?.objective?.title ?? 'Objective complete';
      this.addNotification('Objective Completed', message, 'objective');
    });

    this.eventBus.subscribe('quest:updated', (data) => {
      // Show update for new objectives
      const newObjective = data?.newObjective;
      if (newObjective) {
        const description = newObjective.description ?? newObjective.title ?? 'Objective updated';
        this.addNotification('New Objective', description, 'updated');
      }
    });
  }

  /**
   * Add notification to queue
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (started, completed, failed, objective, updated)
   */
  addNotification(title, message, type = 'started') {
    const notification = {
      title,
      message,
      type,
      timestamp: Date.now()
    };

    this.notifications.push(notification);

    // Start showing immediately if no current notification
    if (!this.currentNotification) {
      this._showNext();
    }
  }

  /**
   * Show next notification in queue
   * @private
   */
  _showNext() {
    if (this.notifications.length === 0) {
      this.currentNotification = null;
      this.alpha = 0;
      return;
    }

    this.currentNotification = this.notifications.shift();
    this.currentTime = 0;
    this.alpha = 0;
  }

  /**
   * Update notification display
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    if (!this.currentNotification) return;

    const deltaMs = deltaTime * 1000;
    this.currentTime += deltaMs;

    // Fade in
    if (this.currentTime < this.fadeTime) {
      this.alpha = this.currentTime / this.fadeTime;
    }
    // Full opacity
    else if (this.currentTime < this.displayTime - this.fadeTime) {
      this.alpha = 1;
    }
    // Fade out
    else if (this.currentTime < this.displayTime) {
      this.alpha = 1 - (this.currentTime - (this.displayTime - this.fadeTime)) / this.fadeTime;
    }
    // Done
    else {
      this._showNext();
    }
  }

  /**
   * Render notification
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.currentNotification || this.alpha === 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Draw background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border with color based on type
    let borderColor = this.style.borderColor;
    if (this.currentNotification.type === 'completed' || this.currentNotification.type === 'objective') {
      borderColor = this.style.completedColor;
    } else if (this.currentNotification.type === 'failed') {
      borderColor = this.style.failedColor;
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw title
    ctx.fillStyle = borderColor;
    ctx.font = `bold ${this.style.titleFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      this.currentNotification.title,
      this.x + this.style.padding,
      this.y + this.style.padding
    );

    // Draw message (word-wrapped)
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    const maxWidth = this.width - this.style.padding * 2;
    const lines = this._wrapText(ctx, this.currentNotification.message, maxWidth);

    let textY = this.y + this.style.padding + this.style.titleFontSize + 8;
    lines.slice(0, 2).forEach((line) => { // Max 2 lines
      ctx.fillText(line, this.x + this.style.padding, textY);
      textY += this.style.fontSize + 4;
    });

    ctx.restore();
  }

  /**
   * Wrap text to fit within width
   * @private
   */
  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;

      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    return lines;
  }

  /**
   * Clear all notifications
   */
  clear() {
    this.notifications = [];
    this.currentNotification = null;
    this.alpha = 0;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.clear();
    console.log('[QuestNotification] Cleaned up');
  }
}
