/**
 * DirtyRectManager - tracks and optimizes dirty rectangle rendering.
 *
 * Tracks dirty regions per frame and merges overlapping rectangles to minimize
 * redraw operations. Can reduce redraws by >60% for static/semi-static content.
 *
 * Usage:
 * 1. Call reset() at start of frame
 * 2. Call addDirtyRect() for each changed region
 * 3. Call getOptimizedRects() to get merged rectangles
 * 4. Clear and redraw only those regions
 *
 * Performance target: <0.5ms overhead per frame.
 *
 * @class DirtyRectManager
 */
export class DirtyRectManager {
  /**
   * Creates a new dirty rectangle manager.
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @param {number} mergeThreshold - Merge rects if distance < threshold (default 50px)
   */
  constructor(canvasWidth, canvasHeight, mergeThreshold = 50) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.mergeThreshold = mergeThreshold;
    this.dirtyRects = [];
    this.fullRedraw = false;
  }

  /**
   * Resets dirty rectangles for a new frame.
   */
  reset() {
    this.dirtyRects = [];
    this.fullRedraw = false;
  }

  /**
   * Adds a dirty rectangle.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   */
  addDirtyRect(x, y, width, height) {
    // Clamp to canvas bounds
    x = Math.max(0, Math.min(x, this.canvasWidth));
    y = Math.max(0, Math.min(y, this.canvasHeight));
    width = Math.max(0, Math.min(width, this.canvasWidth - x));
    height = Math.max(0, Math.min(height, this.canvasHeight - y));

    // Skip zero-area rects
    if (width <= 0 || height <= 0) {
      return;
    }

    this.dirtyRects.push({ x, y, width, height });

    // If too many dirty rects, just do full redraw
    if (this.dirtyRects.length > 100) {
      this.markFullRedraw();
    }
  }

  /**
   * Marks entire canvas as dirty (full redraw).
   */
  markFullRedraw() {
    this.fullRedraw = true;
    this.dirtyRects = [
      { x: 0, y: 0, width: this.canvasWidth, height: this.canvasHeight },
    ];
  }

  /**
   * Checks if full redraw is needed.
   * @returns {boolean} True if full redraw
   */
  isFullRedraw() {
    return this.fullRedraw;
  }

  /**
   * Gets optimized dirty rectangles (merged overlapping rects).
   * @returns {Array<{x, y, width, height}>} Optimized rectangles
   */
  getOptimizedRects() {
    if (this.dirtyRects.length === 0) {
      return [];
    }

    if (this.fullRedraw) {
      return this.dirtyRects;
    }

    // Merge overlapping/nearby rectangles
    let merged = [...this.dirtyRects];
    let didMerge = true;

    while (didMerge && merged.length > 1) {
      didMerge = false;
      const newMerged = [];

      for (let i = 0; i < merged.length; i++) {
        let rect = merged[i];
        let wasMerged = false;

        // Try to merge with subsequent rects
        for (let j = i + 1; j < merged.length; j++) {
          if (this._shouldMerge(rect, merged[j])) {
            rect = this._mergeRects(rect, merged[j]);
            merged.splice(j, 1);
            j--;
            wasMerged = true;
            didMerge = true;
          }
        }

        newMerged.push(rect);
      }

      merged = newMerged;
    }

    return merged;
  }

  /**
   * Checks if two rectangles should be merged.
   * @param {object} a - First rectangle
   * @param {object} b - Second rectangle
   * @returns {boolean} True if should merge
   * @private
   */
  _shouldMerge(a, b) {
    // Check if rectangles overlap or are within merge threshold
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;
    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    const horizontalGap =
      Math.max(0, Math.max(a.x, b.x) - Math.min(aRight, bRight));
    const verticalGap =
      Math.max(0, Math.max(a.y, b.y) - Math.min(aBottom, bBottom));

    return (
      horizontalGap <= this.mergeThreshold &&
      verticalGap <= this.mergeThreshold
    );
  }

  /**
   * Merges two rectangles into a bounding rectangle.
   * @param {object} a - First rectangle
   * @param {object} b - Second rectangle
   * @returns {object} Merged rectangle
   * @private
   */
  _mergeRects(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const right = Math.max(a.x + a.width, b.x + b.width);
    const bottom = Math.max(a.y + a.height, b.y + b.height);

    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
    };
  }

  /**
   * Gets count of dirty rectangles.
   * @returns {number} Dirty rect count
   */
  getDirtyRectCount() {
    return this.dirtyRects.length;
  }

  /**
   * Gets count of optimized rectangles.
   * @returns {number} Optimized rect count
   */
  getOptimizedRectCount() {
    return this.getOptimizedRects().length;
  }

  /**
   * Calculates reduction percentage from optimization.
   * @returns {number} Reduction percentage (0-100)
   */
  getReductionPercentage() {
    const original = this.dirtyRects.length;
    const optimized = this.getOptimizedRects().length;

    if (original === 0) {
      return 0;
    }

    return Math.round(((original - optimized) / original) * 100);
  }

  /**
   * Resizes the canvas dimensions.
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.markFullRedraw();
  }
}
