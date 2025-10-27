/**
 * Controls
 *
 * Input mapping configuration for The Memory Syndicate.
 * Maps keyboard keys to game actions.
 */

export const Controls = {
  // Movement (WASD)
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],

  // Actions
  interact: ['KeyE'], // Evidence collection, dialogue, interaction
  deductionBoard: ['Tab'], // Open deduction board
  inventory: ['KeyI'], // Open inventory
  pause: ['Escape'], // Pause menu
  faction: ['KeyR'], // Open reputation/faction UI
  disguise: ['KeyG'], // Open disguise UI (G for Gear/Garb)
  quest: ['KeyQ'], // Open quest log

  // Detective abilities
  detectiveVision: ['KeyV'], // Activate detective vision
  forensicAnalysis: ['KeyF'], // Analyze evidence

  // Combat (future)
  attack: ['Space'],
  dodge: ['Shift'],

  // UI navigation
  confirm: ['Enter', 'Space'],
  cancel: ['Escape'],

  // Debug
  debugToggle: ['Backquote'], // Toggle debug overlay (`)
};

/**
 * Input state manager
 * Tracks which keys are currently pressed
 */
export class InputState {
  constructor(eventBus = null) {
    this.keys = new Map();
    this.actions = new Map();
    this.eventBus = eventBus;

    // Track previous action states for edge detection
    this.previousActions = new Map();

    // Initialize action states
    Object.keys(Controls).forEach(action => {
      this.actions.set(action, false);
      this.previousActions.set(action, false);
    });

    // Bind keyboard events
    this.bindEvents();
  }

  /**
   * Bind keyboard event listeners
   */
  bindEvents() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Handle key down event
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    // Prevent default for game keys
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }

    this.keys.set(event.code, true);
    this.updateActions();
  }

  /**
   * Handle key up event
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    this.keys.set(event.code, false);
    this.updateActions();
  }

  /**
   * Update action states based on key mappings
   */
  updateActions() {
    for (const [action, keyCodes] of Object.entries(Controls)) {
      const wasPressed = this.actions.get(action);
      const isPressed = keyCodes.some(code => this.keys.get(code));

      this.previousActions.set(action, wasPressed);
      this.actions.set(action, isPressed);

      // Emit events for action press (edge detection)
      if (isPressed && !wasPressed && this.eventBus) {
        // Escape key special handling for tutorial system
        if (action === 'pause' || action === 'cancel') {
          this.eventBus.emit('input:escape', { action });
        }
      }
    }
  }

  /**
   * Check if action is currently pressed
   * @param {string} action - Action name
   * @returns {boolean}
   */
  isPressed(action) {
    return this.actions.get(action) || false;
  }

  /**
   * Check if key is a game control key
   * @param {string} code - Key code
   * @returns {boolean}
   */
  isGameKey(code) {
    return Object.values(Controls).flat().includes(code);
  }

  /**
   * Reset all input states
   */
  reset() {
    this.keys.clear();
    this.actions.forEach((_, action) => {
      this.actions.set(action, false);
    });
  }

  /**
   * Get movement vector from input
   * @returns {Object} {x, y} normalized direction vector
   */
  getMovementVector() {
    let x = 0;
    let y = 0;

    if (this.isPressed('moveLeft')) x -= 1;
    if (this.isPressed('moveRight')) x += 1;
    if (this.isPressed('moveUp')) y -= 1;
    if (this.isPressed('moveDown')) y += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }
}
