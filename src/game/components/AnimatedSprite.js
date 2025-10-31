/**
 * AnimatedSprite Component
 *
 * Stores animation definitions for sprite sheets and tracks playback state.
 * Designed to pair with the Sprite component — the SpriteAnimationSystem
 * reads this component and updates the Sprite's source rectangle each frame.
 */
export class AnimatedSprite {
  constructor({
    image = null,
    imageUrl = null,
    frameWidth = 32,
    frameHeight = 32,
    animations = {},
    defaultAnimation = 'idle',
    playbackSpeed = 1,
  } = {}) {
    this.image = image;
    this.imageUrl = imageUrl;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.animations = { ...animations };
    this.defaultAnimation = defaultAnimation;
    this.playbackSpeed = playbackSpeed;

    this.currentAnimation = defaultAnimation;
    this.currentFrameIndex = 0;
    this.accumulator = 0;
    this.playing = true;
    this.loop = true;
    this.dirty = true;
    this.lastUpdateTimestamp = 0;
  }

  /**
   * Get animation definition by name.
   * @param {string} name
   * @returns {?object}
   */
  getAnimation(name) {
    if (!name) {
      return null;
    }
    return this.animations?.[name] ?? null;
  }

  /**
   * Update the animations map. Re-applies default when necessary.
   * @param {Record<string, object>} animations
   */
  setAnimations(animations = {}) {
    this.animations = { ...animations };
    if (!this.animations[this.currentAnimation]) {
      this.play(this.defaultAnimation, { force: true });
    }
  }

  /**
   * Change playback animation.
   * @param {string} name - Animation identifier
   * @param {object} [options]
   * @param {boolean} [options.force=false] - Force restart even if already active
   * @param {boolean} [options.keepFrame=false] - Preserve frame index when switching
   * @param {boolean} [options.play=true] - Whether to resume playback automatically
   */
  play(name, { force = false, keepFrame = false, play = true } = {}) {
    if (!name || !this.animations[name]) {
      return false;
    }

    if (!force && this.currentAnimation === name) {
      return false;
    }

    this.currentAnimation = name;
    if (!keepFrame) {
      this.currentFrameIndex = 0;
      this.accumulator = 0;
    }
    this.playing = play;
    this.dirty = true;
    return true;
  }

  /**
   * Stop playback (retain current frame).
   */
  stop() {
    this.playing = false;
  }

  /**
   * Resume playback if stopped.
   */
  resume() {
    this.playing = true;
  }

  /**
   * Returns the current animation definition.
   * @returns {?object}
   */
  getCurrentAnimation() {
    return this.getAnimation(this.currentAnimation);
  }

  /**
   * Returns the current frame descriptor { col, row } or null.
   * @returns {?object}
   */
  getCurrentFrame() {
    const animation = this.getCurrentAnimation();
    if (!animation || !Array.isArray(animation.frames) || animation.frames.length === 0) {
      return null;
    }
    const frame = animation.frames[this.currentFrameIndex % animation.frames.length];
    return frame || null;
  }

  /**
   * Assign loaded image to component.
   * @param {HTMLImageElement} image
   */
  setImage(image) {
    this.image = image;
  }
}
