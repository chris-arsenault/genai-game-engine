/**
 * DeductionBoardPointerController
 *
 * Routes pointer interactions from the primary game canvas to the deduction board UI.
 * Keeps drag/drop responsive by normalising pointer coordinates against the canvas size
 * and capturing pointer movement while the player holds the mouse button.
 */
export class DeductionBoardPointerController {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object|null} board
   * @param {object} [options]
   */
  constructor(canvas, board = null, options = {}) {
    if (!canvas) {
      throw new Error('DeductionBoardPointerController requires a canvas element');
    }

    this.canvas = canvas;
    this.board = board;
    this.eventTarget = options.eventTarget || canvas;

    this.activePointerId = null;
    this._listenersBound = false;

    this._boundHandlers = {
      pointerdown: (event) => this._handlePointerDown(event),
      pointermove: (event) => this._handlePointerMove(event),
      pointerup: (event) => this._handlePointerUp(event),
      pointercancel: (event) => this._handlePointerCancel(event),
      pointerleave: () => this._handlePointerLeave(),
      contextmenu: (event) => this._handleContextMenu(event)
    };

    this._attach();
  }

  /**
   * Update the deduction board reference.
   * @param {object|null} board
   */
  setBoard(board) {
    this.board = board;
  }

  /**
   * Detach listeners and release resources.
   */
  destroy() {
    this._detach();
    this.board = null;
    this.activePointerId = null;
  }

  _attach() {
    if (this._listenersBound) {
      return;
    }

    const target = this.eventTarget;
    target.addEventListener('pointerdown', this._boundHandlers.pointerdown);
    target.addEventListener('pointermove', this._boundHandlers.pointermove);
    target.addEventListener('pointerup', this._boundHandlers.pointerup);
    target.addEventListener('pointercancel', this._boundHandlers.pointercancel);
    target.addEventListener('pointerleave', this._boundHandlers.pointerleave);
    target.addEventListener('contextmenu', this._boundHandlers.contextmenu);

    this._listenersBound = true;
  }

  _detach() {
    if (!this._listenersBound) {
      return;
    }

    const target = this.eventTarget;
    target.removeEventListener('pointerdown', this._boundHandlers.pointerdown);
    target.removeEventListener('pointermove', this._boundHandlers.pointermove);
    target.removeEventListener('pointerup', this._boundHandlers.pointerup);
    target.removeEventListener('pointercancel', this._boundHandlers.pointercancel);
    target.removeEventListener('pointerleave', this._boundHandlers.pointerleave);
    target.removeEventListener('contextmenu', this._boundHandlers.contextmenu);

    this._listenersBound = false;
  }

  _shouldHandleInput() {
    return Boolean(this.board && this.board.visible);
  }

  _normaliseCoordinates(event) {
    const rect = typeof this.canvas.getBoundingClientRect === 'function'
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: this.canvas.width, height: this.canvas.height };

    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  _handlePointerDown(event) {
    if (!this._shouldHandleInput()) {
      return;
    }

    if (event.button !== 0 && event.button !== 2) {
      return;
    }

    const coords = this._normaliseCoordinates(event);

    try {
      if (typeof this.canvas.setPointerCapture === 'function') {
        this.canvas.setPointerCapture(event.pointerId);
      }
    } catch (error) {
      // Pointer capture may fail in non-browser environments; ignore.
    }

    this.activePointerId = event.pointerId;
    event.preventDefault();

    if (event.button === 2) {
      if (typeof this.board.onRightClick === 'function') {
        this.board.onRightClick(coords.x, coords.y);
      }
      return;
    }

    if (typeof this.board.onMouseDown === 'function') {
      this.board.onMouseDown(coords.x, coords.y);
    }
  }

  _handlePointerMove(event) {
    if (!this._shouldHandleInput()) {
      return;
    }

    const coords = this._normaliseCoordinates(event);

    if (typeof this.board.onMouseMove === 'function') {
      this.board.onMouseMove(coords.x, coords.y);
    }
  }

  _handlePointerUp(event) {
    if (!this.board) {
      return;
    }

    if (this.activePointerId !== null && event.pointerId === this.activePointerId) {
      try {
        if (typeof this.canvas.releasePointerCapture === 'function') {
          this.canvas.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        // Ignore environments without pointer capture support.
      }
      this.activePointerId = null;
    }

    const coords = this._normaliseCoordinates(event);

    if (typeof this.board.onMouseUp === 'function') {
      this.board.onMouseUp(coords.x, coords.y);
    }
  }

  _handlePointerCancel(event) {
    if (this.activePointerId !== null && event.pointerId === this.activePointerId) {
      try {
        if (typeof this.canvas.releasePointerCapture === 'function') {
          this.canvas.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        // Ignore errors from pointer capture release.
      }
      this.activePointerId = null;
    }
    this._handlePointerLeave();
  }

  _handlePointerLeave() {
    if (!this.board) {
      return;
    }

    if (typeof this.board.onMouseLeave === 'function') {
      this.board.onMouseLeave();
    }
  }

  _handleContextMenu(event) {
    if (!this._shouldHandleInput()) {
      return;
    }

    event.preventDefault();

    const coords = this._normaliseCoordinates(event);
    if (typeof this.board.onRightClick === 'function') {
      this.board.onRightClick(coords.x, coords.y);
    }
  }
}

