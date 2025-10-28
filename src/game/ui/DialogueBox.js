import { buildDialogueViewModel } from './helpers/dialogueViewModel.js';
import { emitOverlayVisibility } from './helpers/overlayEvents.js';

/**
 * DialogueBox
 *
 * Visual dialogue UI component with Canvas rendering.
 * Displays NPC dialogue, player choices, and handles input.
 *
 * @class DialogueBox
 */
export class DialogueBox {
  /**
   * Create a DialogueBox
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {EventBus} eventBus - Event system
   * @param {Object} config - UI configuration
   */
  constructor(ctx, eventBus, config = {}) {
    this.ctx = ctx;
    this.eventBus = eventBus;

    const { store = null, ...uiConfig } = config;
    this.store = store;

    // UI configuration
    this.config = {
      width: uiConfig.width || 800,
      height: uiConfig.height || 200,
      padding: uiConfig.padding || 20,
      fontSize: uiConfig.fontSize || 16,
      choiceFontSize: uiConfig.choiceFontSize || 14,
      lineHeight: uiConfig.lineHeight || 24,
      backgroundColor: uiConfig.backgroundColor || 'rgba(0, 0, 0, 0.85)',
      borderColor: uiConfig.borderColor || '#4A90E2',
      textColor: uiConfig.textColor || '#FFFFFF',
      choiceColor: uiConfig.choiceColor || '#AADDFF',
      choiceHoverColor: uiConfig.choiceHoverColor || '#FFDD44',
      speakerColor: uiConfig.speakerColor || '#4A90E2',
      typewriterSpeed: uiConfig.typewriterSpeed || 50, // ms per character
      enableTypewriter: uiConfig.enableTypewriter !== false
    };

    // State
    this.visible = false;
    this.speaker = '';
    this.text = '';
    this.displayedText = '';
    this.choices = [];
    this.canAdvance = false;
    this.hasChoices = false;
    this.selectedChoiceIndex = 0;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = false;
    this.npcId = null;
    this.dialogueId = null;
    this.nodeId = null;
    this.transcript = [];
    this.viewModel = null;

    // Input handling
    this.keyHandlers = new Map();
    this.eventSubscriptions = [];
    this.storeUnsubscribe = null;
    this.setupInputHandlers();

    // Subscribe to dialogue events
    if (this.store) {
      this.setupStoreSubscription();
    } else {
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.eventSubscriptions.push(
      this.eventBus.on('dialogue:started', (data) => {
        this.show(data);
      })
    );

    this.eventSubscriptions.push(
      this.eventBus.on('dialogue:node_changed', (data) => {
        this.show(data);
      })
    );

    this.eventSubscriptions.push(
      this.eventBus.on('dialogue:ended', () => {
        this.hide();
      })
    );
  }

  setupStoreSubscription() {
    this.storeUnsubscribe = this.store.onUpdate((state) => {
      this.handleStoreUpdate(state);
    });
    this.handleStoreUpdate(this.store.getState());
  }

  handleStoreUpdate(state) {
    const viewModel = buildDialogueViewModel(state);
    this.viewModel = viewModel;
    this.transcript = Array.isArray(viewModel.transcript) ? [...viewModel.transcript] : [];

    if (!viewModel.visible) {
      if (this.visible) {
        this.hide();
      }
      this.npcId = null;
      this.dialogueId = null;
      this.nodeId = null;
      return;
    }

    const nodeChanged =
      viewModel.dialogueId !== this.dialogueId ||
      viewModel.nodeId !== this.nodeId ||
      viewModel.text !== this.text;

    if (nodeChanged) {
      this.npcId = viewModel.npcId;
      this.dialogueId = viewModel.dialogueId;
      this.nodeId = viewModel.nodeId;
      this.show(viewModel);
    } else {
      this.choices = Array.isArray(viewModel.choices) ? viewModel.choices : [];
      this.hasChoices = Boolean(viewModel.hasChoices);
      this.canAdvance = Boolean(viewModel.canAdvance);
      if (this.selectedChoiceIndex >= this.choices.length) {
        this.selectedChoiceIndex = Math.max(0, this.choices.length - 1);
      }
    }
  }

  /**
   * Setup input handlers
   */
  setupInputHandlers() {
    // Number keys for choices
    for (let i = 1; i <= 4; i++) {
      this.keyHandlers.set(`Digit${i}`, () => {
        if (this.visible && this.hasChoices && !this.isTyping) {
          const choiceIndex = i - 1;
          if (choiceIndex < this.choices.length) {
            this.selectChoice(choiceIndex);
          }
        }
      });

      this.keyHandlers.set(`Numpad${i}`, () => {
        if (this.visible && this.hasChoices && !this.isTyping) {
          const choiceIndex = i - 1;
          if (choiceIndex < this.choices.length) {
            this.selectChoice(choiceIndex);
          }
        }
      });
    }

    // Space/Enter to advance
    this.keyHandlers.set('Space', () => {
      if (this.visible) {
        this.handleAdvance();
      }
    });

    this.keyHandlers.set('Enter', () => {
      if (this.visible) {
        this.handleAdvance();
      }
    });

    // Arrow keys to navigate choices
    this.keyHandlers.set('ArrowUp', () => {
      if (this.visible && this.hasChoices && !this.isTyping) {
        this.selectedChoiceIndex = Math.max(0, this.selectedChoiceIndex - 1);
      }
    });

    this.keyHandlers.set('ArrowDown', () => {
      if (this.visible && this.hasChoices && !this.isTyping) {
        this.selectedChoiceIndex = Math.min(
          this.choices.length - 1,
          this.selectedChoiceIndex + 1
        );
      }
    });

    // Escape to close
    this.keyHandlers.set('Escape', () => {
      if (this.visible) {
        this.eventBus.emit('dialogue:close_requested', {});
      }
    });
  }

  /**
   * Handle keyboard input
   * @param {string} key - Key code
   */
  handleInput(key) {
    const handler = this.keyHandlers.get(key);
    if (handler) {
      handler();
    }
  }

  /**
   * Handle advance action
   */
  handleAdvance() {
    // Skip typewriter effect
    if (this.isTyping) {
      this.skipTypewriter();
      return;
    }

    // Select highlighted choice or advance
    if (this.hasChoices) {
      this.selectChoice(this.selectedChoiceIndex);
    } else if (this.canAdvance) {
      this.eventBus.emit('dialogue:advance_requested', {});
    }
  }

  /**
   * Show dialogue box
   * @param {Object} data - Dialogue data
   */
  show(data) {
    const wasVisible = this.visible;
    this.visible = true;
    this.npcId = data.npcId ?? this.npcId;
    this.dialogueId = data.dialogueId ?? this.dialogueId;
    this.nodeId = data.nodeId ?? this.nodeId;
    this.speaker = data.speaker || 'NPC';
    this.text = data.text || '';
    this.choices = Array.isArray(data.choices) ? data.choices : [];
    this.canAdvance = Boolean(data.canAdvance);
    this.hasChoices = Boolean(data.hasChoices || (this.choices.length > 0));
    this.selectedChoiceIndex = 0;

    // Start typewriter effect
    if (this.config.enableTypewriter) {
      this.startTypewriter();
    } else {
      this.displayedText = this.text;
      this.isTyping = false;
    }

    if (!wasVisible) {
      emitOverlayVisibility(this.eventBus, 'dialogue', true, {
        source: data?.source ?? 'show',
        nodeId: this.nodeId,
        dialogueId: this.dialogueId,
      });
    }
  }

  /**
   * Hide dialogue box
   */
  hide(source = 'hide') {
    const wasVisible = this.visible;
    this.visible = false;
    this.isTyping = false;
    this.typewriterIndex = 0;
    this.displayedText = '';
    this.text = '';
    this.choices = [];
    this.npcId = null;
    this.dialogueId = null;
    this.nodeId = null;

    if (wasVisible) {
      emitOverlayVisibility(this.eventBus, 'dialogue', false, {
        source,
      });
    }
  }

  /**
   * Start typewriter effect
   */
  startTypewriter() {
    this.displayedText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.isTyping = true;
  }

  /**
   * Skip typewriter effect
   */
  skipTypewriter() {
    this.displayedText = this.text;
    this.typewriterIndex = this.text.length;
    this.isTyping = false;
  }

  /**
   * Select a dialogue choice
   * @param {number} index - Choice index
   */
  selectChoice(index) {
    if (index < 0 || index >= this.choices.length) return;

    this.eventBus.emit('dialogue:choice_requested', {
      choiceIndex: index
    });
  }

  /**
   * Update dialogue box
   * @param {number} deltaTime - Time since last frame (ms)
   */
  update(deltaTime) {
    if (!this.visible || !this.isTyping) return;

    // Update typewriter effect
    this.typewriterTimer += deltaTime;

    while (this.typewriterTimer >= this.config.typewriterSpeed) {
      this.typewriterTimer -= this.config.typewriterSpeed;

      if (this.typewriterIndex < this.text.length) {
        this.typewriterIndex++;
        this.displayedText = this.text.substring(0, this.typewriterIndex);
      } else {
        this.isTyping = false;
        break;
      }
    }
  }

  /**
   * Render dialogue box
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   */
  render(canvasWidth, canvasHeight) {
    if (!this.visible) return;

    const ctx = this.ctx;

    // Calculate position (centered bottom)
    const boxX = (canvasWidth - this.config.width) / 2;
    const boxY = canvasHeight - this.config.height - 40;

    // Draw background
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(boxX, boxY, this.config.width, this.config.height);

    // Draw border
    ctx.strokeStyle = this.config.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, this.config.width, this.config.height);

    // Draw speaker name
    ctx.font = `bold ${this.config.fontSize + 2}px Arial`;
    ctx.fillStyle = this.config.speakerColor;
    ctx.fillText(
      this.speaker,
      boxX + this.config.padding,
      boxY + this.config.padding + this.config.fontSize
    );

    // Draw dialogue text
    ctx.font = `${this.config.fontSize}px Arial`;
    ctx.fillStyle = this.config.textColor;

    const textY = boxY + this.config.padding + this.config.fontSize + this.config.lineHeight;
    const textWidth = this.config.width - this.config.padding * 2;
    const lines = this.wrapText(this.displayedText, textWidth);

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(
        lines[i],
        boxX + this.config.padding,
        textY + i * this.config.lineHeight
      );
    }

    // Draw choices
    if (this.hasChoices && !this.isTyping) {
      const choiceY = boxY + this.config.height - this.config.padding - (this.choices.length * this.config.lineHeight);

      ctx.font = `${this.config.choiceFontSize}px Arial`;

      for (let i = 0; i < this.choices.length; i++) {
        const choice = this.choices[i];
        const y = choiceY + i * this.config.lineHeight;
        const isSelected = i === this.selectedChoiceIndex;

        ctx.fillStyle = isSelected ? this.config.choiceHoverColor : this.config.choiceColor;
        ctx.fillText(
          `${i + 1}. ${choice.text}`,
          boxX + this.config.padding + 10,
          y
        );

        // Draw selection indicator
        if (isSelected) {
          ctx.fillStyle = this.config.choiceHoverColor;
          ctx.fillText('>', boxX + this.config.padding, y);
        }
      }
    }

    // Draw prompt
    if (!this.isTyping) {
      ctx.font = `${this.config.choiceFontSize}px Arial`;
      ctx.fillStyle = this.config.textColor;

      if (this.hasChoices) {
        ctx.fillText(
          '[1-4] Select | [Space/Enter] Confirm | [Esc] Close',
          boxX + this.config.padding,
          boxY + this.config.height - 8
        );
      } else if (this.canAdvance) {
        ctx.fillText(
          '[Space/Enter] Continue | [Esc] Close',
          boxX + this.config.padding,
          boxY + this.config.height - 8
        );
      }
    } else {
      // Typewriter indicator
      ctx.font = `${this.config.choiceFontSize}px Arial`;
      ctx.fillStyle = this.config.textColor;
      ctx.fillText(
        '[Space/Enter] Skip',
        boxX + this.config.padding,
        boxY + this.config.height - 8
      );
    }
  }

  /**
   * Wrap text to fit width
   * @param {string} text - Text to wrap
   * @param {number} maxWidth - Maximum width in pixels
   * @returns {Array} Array of text lines
   */
  wrapText(text, maxWidth) {
    if (!text) {
      return [''];
    }

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = this.ctx.measureText(testLine);

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
   * Check if dialogue box is visible
   * @returns {boolean} True if visible
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.visible = false;
    this.keyHandlers.clear();
    if (typeof this.storeUnsubscribe === 'function') {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }
    if (Array.isArray(this.eventSubscriptions) && this.eventSubscriptions.length) {
      for (const unsubscribe of this.eventSubscriptions) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }
      this.eventSubscriptions = [];
    }
  }
}
