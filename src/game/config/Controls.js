/**
 * Controls
 *
 * Input mapping configuration for The Memory Syndicate.
 * Maps keyboard keys to game actions.
 */

import {
  initializeControlBindings,
  getBindingsSnapshot as getControlBindingsSnapshot,
  subscribe as subscribeControlBindings,
  getKeyToActionsSnapshot,
} from '../state/controlBindingsStore.js';

export const Controls = {
  // Movement (WASD)
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],

  // Actions
  interact: ['KeyE'], // Evidence collection, dialogue, interaction
  caseFile: ['Tab'], // Open case file
  deductionBoard: ['KeyB'], // Open deduction board
  inventory: ['KeyI'], // Open inventory
  pause: ['Escape'], // Pause menu
  faction: ['KeyR'], // Open reputation/faction UI
  disguise: ['KeyG'], // Open disguise UI (G for Gear/Garb)
  quest: ['KeyQ'], // Open quest log
  saveInspector: ['KeyO'], // Toggle SaveManager inspector overlay

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

initializeControlBindings(Controls);

function cloneBindings(bindings) {
  const clone = {};
  for (const [action, codes] of Object.entries(bindings || {})) {
    clone[action] = Array.isArray(codes) ? [...codes] : [];
  }
  return clone;
}

function cloneKeyToActions(map) {
  const clone = new Map();
  if (!(map instanceof Map)) {
    return clone;
  }
  for (const [key, actions] of map.entries()) {
    clone.set(key, new Set(actions));
  }
  return clone;
}

/**
 * Input state manager
 * Tracks which keys are currently pressed
 */
export class InputState {
  constructor(eventBus = null) {
    this.keys = new Map();
    this.actions = new Map();
    this.eventBus = eventBus;
    this.previousActions = new Map();
    this.justPressedActions = new Map();
    this.controlBindings = cloneBindings(getControlBindingsSnapshot());
    this.keyToActions = cloneKeyToActions(getKeyToActionsSnapshot());
    this.boundKeys = new Set(this.keyToActions.keys());
    this.unsubscribeControlBindings = subscribeControlBindings(({ bindings, keyToActions }) => {
      this.syncBindings(bindings, keyToActions);
    });

    this.syncActionsFromBindings();
    this.bindEvents();
  }

  syncBindings(bindings, keyToActions) {
    if (bindings && typeof bindings === 'object') {
      this.controlBindings = cloneBindings(bindings);
    }
    if (keyToActions instanceof Map) {
      this.keyToActions = cloneKeyToActions(keyToActions);
      this.boundKeys = new Set(this.keyToActions.keys());
    }
    this.syncActionsFromBindings();
  }

  syncActionsFromBindings() {
    const nextActions = Object.keys(this.controlBindings);
    const existing = new Set(this.actions.keys());

    for (const action of nextActions) {
      if (!this.actions.has(action)) {
        this.actions.set(action, false);
      }
      if (!this.previousActions.has(action)) {
        this.previousActions.set(action, false);
      }
      if (!this.justPressedActions.has(action)) {
        this.justPressedActions.set(action, false);
      }
    }

    for (const action of existing) {
      if (!this.controlBindings[action]) {
        this.actions.delete(action);
        this.previousActions.delete(action);
        this.justPressedActions.delete(action);
      }
    }
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
    for (const [action, keyCodes] of Object.entries(this.controlBindings)) {
      const wasPressed = this.actions.get(action);
      const isPressed = keyCodes.some(code => this.keys.get(code));

      this.previousActions.set(action, wasPressed);
      this.actions.set(action, isPressed);

      const becamePressed = isPressed && !wasPressed;

      // Emit events for action press (edge detection)
      if (becamePressed && this.eventBus) {
        const payload = {
          action,
          timestamp: Date.now()
        };

        // Escape key special handling for tutorial system
        if (action === 'pause' || action === 'cancel') {
          this.eventBus.emit('input:escape', { action });
        }

        this.eventBus.emit('input:action_pressed', payload);
        this.eventBus.emit(`input:${action}:pressed`, payload);
      }

      if (becamePressed) {
        this.justPressedActions.set(action, true);
      } else if (!isPressed) {
        this.justPressedActions.set(action, false);
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
   * Check if action transitioned from not pressed to pressed this frame.
   * @param {string} action - Action name
   * @returns {boolean}
   */
  wasJustPressed(action) {
    const justPressed = this.justPressedActions.get(action) || false;
    if (justPressed) {
      this.justPressedActions.set(action, false);
      return true;
    }
    return false;
  }

  /**
   * Check if key is a game control key
   * @param {string} code - Key code
   * @returns {boolean}
   */
  isGameKey(code) {
    return this.boundKeys.has(code);
  }

  /**
   * Reset all input states
   */
  reset() {
    this.keys.clear();
    this.syncBindings(getControlBindingsSnapshot(), getKeyToActionsSnapshot());
    this.actions.forEach((_, action) => {
      this.actions.set(action, false);
      this.previousActions.set(action, false);
      this.justPressedActions.set(action, false);
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

  dispose() {
    if (typeof this.unsubscribeControlBindings === 'function') {
      this.unsubscribeControlBindings();
      this.unsubscribeControlBindings = null;
    }
  }
}
