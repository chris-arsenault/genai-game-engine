import { System } from '../../engine/ecs/System.js';
import { AssetLoader } from '../../engine/assets/AssetLoader.js';

const DEFAULT_FRAME_DURATION = 1 / 12; // 12 FPS fallback

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function resolveFrameDuration(animation) {
  if (animation && isFiniteNumber(animation.frameDuration) && animation.frameDuration > 0) {
    return animation.frameDuration;
  }
  if (animation && isFiniteNumber(animation.frameRate) && animation.frameRate > 0) {
    return 1 / animation.frameRate;
  }
  return DEFAULT_FRAME_DURATION;
}

function resolveFrame(frame, frameWidth, frameHeight) {
  if (!frame || typeof frame !== 'object') {
    return null;
  }

  const width = isFiniteNumber(frame.width) && frame.width > 0 ? frame.width : frameWidth;
  const height = isFiniteNumber(frame.height) && frame.height > 0 ? frame.height : frameHeight;

  if (isFiniteNumber(frame.x) && isFiniteNumber(frame.y)) {
    return {
      sourceX: frame.x,
      sourceY: frame.y,
      sourceWidth: width,
      sourceHeight: height,
      renderWidth: isFiniteNumber(frame.renderWidth) ? frame.renderWidth : width,
      renderHeight: isFiniteNumber(frame.renderHeight) ? frame.renderHeight : height,
    };
  }

  const col =
    isFiniteNumber(frame.col)
      ? frame.col
      : isFiniteNumber(frame.column)
        ? frame.column
        : 0;
  const row =
    isFiniteNumber(frame.row)
      ? frame.row
      : 0;

  return {
    sourceX: col * frameWidth,
    sourceY: row * frameHeight,
    sourceWidth: width,
    sourceHeight: height,
    renderWidth: isFiniteNumber(frame.renderWidth) ? frame.renderWidth : width,
    renderHeight: isFiniteNumber(frame.renderHeight) ? frame.renderHeight : height,
  };
}

/**
 * SpriteAnimationSystem
 *
 * Advances AnimatedSprite components and updates Sprite source rectangles.
 */
export class SpriteAnimationSystem extends System {
  constructor(componentRegistry, eventBus, options = {}) {
    super(componentRegistry, eventBus, ['AnimatedSprite', 'Sprite']);
    this.priority = options.priority ?? 90;
    this.assetLoader = options.assetLoader || new AssetLoader();
    this._imageCache = new Map(); // url -> { image, promise }
  }

  init() {
    // No-op: animations are updated per-frame
  }

  cleanup() {
    this._imageCache.clear();
  }

  update(deltaTime, entities) {
    if (!Array.isArray(entities) || entities.length === 0) {
      return;
    }

    for (let index = 0; index < entities.length; index++) {
      const entityId = entities[index];
      const animatedSprite = this.getComponent(entityId, 'AnimatedSprite');
      const sprite = this.getComponent(entityId, 'Sprite');

      if (!animatedSprite || !sprite) {
        continue;
      }

      const imageReady = this._ensureImage(animatedSprite, sprite);
      if (!imageReady) {
        // Defer animation updates until the image is available.
        continue;
      }

      this._advanceAnimation(animatedSprite, deltaTime);
      this._applyFrame(animatedSprite, sprite);
    }
  }

  _ensureImage(animatedSprite, sprite) {
    if (animatedSprite.image) {
      if (sprite.image !== animatedSprite.image) {
        sprite.image = animatedSprite.image;
      }
      return true;
    }

    if (typeof animatedSprite.imageUrl !== 'string' || animatedSprite.imageUrl.length === 0) {
      return false;
    }

    const key = animatedSprite.imageUrl;
    const cacheEntry = this._imageCache.get(key);

    if (cacheEntry && cacheEntry.image) {
      animatedSprite.setImage(cacheEntry.image);
      sprite.image = cacheEntry.image;
      return true;
    }

    if (cacheEntry && cacheEntry.promise) {
      cacheEntry.promise.then((image) => {
        if (image) {
          this._imageCache.set(key, { image, promise: null });
          if (!animatedSprite.image) {
            animatedSprite.setImage(image);
            sprite.image = image;
          }
        }
      }).catch((error) => {
        console.warn('[SpriteAnimationSystem] Failed to load sprite image', key, error);
        this._imageCache.delete(key);
      });
      return false;
    }

    const loadPromise = this.assetLoader
      .loadImage(key)
      .then((image) => {
        if (image) {
          this._imageCache.set(key, { image, promise: null });
          if (!animatedSprite.image) {
            animatedSprite.setImage(image);
            sprite.image = image;
          }
        }
        return image;
      })
      .catch((error) => {
        console.warn('[SpriteAnimationSystem] Image load failed', key, error);
        this._imageCache.delete(key);
        return null;
      });

    this._imageCache.set(key, { image: null, promise: loadPromise });
    return false;
  }

  _advanceAnimation(animatedSprite, deltaTime) {
    const animation = animatedSprite.getCurrentAnimation();
    if (!animation || !Array.isArray(animation.frames) || animation.frames.length === 0) {
      return;
    }

    const frameDuration = resolveFrameDuration(animation);
    if (frameDuration <= 0) {
      animatedSprite.currentFrameIndex = 0;
      animatedSprite.accumulator = 0;
      animatedSprite.playing = false;
      return;
    }

    const loop = animation.loop !== undefined ? Boolean(animation.loop) : true;
    const speedMultiplier =
      (isFiniteNumber(animation.speed) && animation.speed > 0 ? animation.speed : 1) *
      (isFiniteNumber(animatedSprite.playbackSpeed) && animatedSprite.playbackSpeed > 0
        ? animatedSprite.playbackSpeed
        : 1);

    let queuedAnimation = null;

    if (animatedSprite.playing) {
      animatedSprite.accumulator += deltaTime * speedMultiplier;

      while (animatedSprite.accumulator >= frameDuration) {
        animatedSprite.accumulator -= frameDuration;
        animatedSprite.currentFrameIndex += 1;

        if (animatedSprite.currentFrameIndex >= animation.frames.length) {
          if (loop) {
            animatedSprite.currentFrameIndex %= animation.frames.length;
          } else {
            animatedSprite.currentFrameIndex = animation.frames.length - 1;
            animatedSprite.playing = false;
            animatedSprite.accumulator = 0;
            if (typeof animation.next === 'string' && animation.next.length > 0) {
              queuedAnimation = animation.next;
            }
            break;
          }

          if (typeof animation.next === 'string' && animation.next.length > 0) {
            animatedSprite.play(animation.next, { force: true });
            return;
          }
        }
      }
    }

    if (queuedAnimation) {
      animatedSprite.play(queuedAnimation, { force: true });
    }
  }

  _applyFrame(animatedSprite, sprite) {
    const animation = animatedSprite.getCurrentAnimation();
    if (!animation || !Array.isArray(animation.frames) || animation.frames.length === 0) {
      return;
    }

    const frameIndex = Math.min(
      animation.frames.length - 1,
      Math.max(0, animatedSprite.currentFrameIndex)
    );
    const frame = animation.frames[frameIndex];
    const resolved = resolveFrame(frame, animatedSprite.frameWidth, animatedSprite.frameHeight);
    if (!resolved) {
      return;
    }

    sprite.sourceX = resolved.sourceX;
    sprite.sourceY = resolved.sourceY;
    sprite.sourceWidth = resolved.sourceWidth;
    sprite.sourceHeight = resolved.sourceHeight;
    sprite.width = resolved.renderWidth;
    sprite.height = resolved.renderHeight;
    animatedSprite.dirty = false;
  }
}
