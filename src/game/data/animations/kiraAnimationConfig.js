/**
 * Auto-generated file.
 * Source manifest: assets/generated/images/ar-003/image-ar-003-kira-evasion-pack-normalized.json
 * Generated via scripts/art/updateKiraAnimationConfig.js on 2025-10-31T18:28:38.028Z
 *
 * Do not edit manually—run the script after updating the normalized atlas.
 */

export const kiraAnimationConfig = {
  imageUrl: "/generated/images/ar-003/image-ar-003-kira-core-pack-normalized.png",
  frameWidth: 32,
  frameHeight: 32,
  defaultAnimation: 'idleDown',
  rows: {
    idleDown: 0,
    walkDown: 1,
    runDown: 2,
    idleLeft: 3,
    walkLeft: 4,
    runLeft: 5,
    idleRight: 6,
    walkRight: 7,
    runRight: 8,
    idleUp: 9,
    walkUp: 10,
    runUp: 11,
    dash: 12,
    slide: 13
  },
  dashColumns: [
    0,
    1,
    2,
    3,
    4,
    5
  ],
  slideColumns: [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9
  ],
  locomotionFrameCount: 6,
  durations: {
    idle: 0.28,
    walk: 0.14,
    run: 0.1,
    dash: 0.055,
    dashLoop: 0.06,
    slide: 0.06
  },
  metadata: {
    manifestPath: "assets/generated/images/ar-003/image-ar-003-kira-evasion-pack-normalized.json",
    generatedAt: "2025-10-31T18:28:38.028Z"
  }
};

/**
 * Construct the AnimatedSprite definitions for the player using the config above.
 * Keeps frame maps centralized so gameplay code stays in sync with manifest data.
 */
export function buildKiraAnimationDefinitions() {
  const rows = kiraAnimationConfig.rows;
  const locomotionFrames = kiraAnimationConfig.locomotionFrameCount;

  const linearFrames = (row, count) =>
    Array.from({ length: count }, (_, index) => ({ col: index, row }));
  const mappedFrames = (row, columns) =>
    columns.map((column) => ({ col: column, row }));

  return {
    idleDown: {
      frames: linearFrames(rows.idleDown, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.idle,
    },
    walkDown: {
      frames: linearFrames(rows.walkDown, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.walk,
    },
    runDown: {
      frames: linearFrames(rows.runDown, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.run,
    },
    idleLeft: {
      frames: linearFrames(rows.idleLeft, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.idle,
    },
    walkLeft: {
      frames: linearFrames(rows.walkLeft, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.walk,
    },
    runLeft: {
      frames: linearFrames(rows.runLeft, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.run,
    },
    idleRight: {
      frames: linearFrames(rows.idleRight, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.idle,
    },
    walkRight: {
      frames: linearFrames(rows.walkRight, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.walk,
    },
    runRight: {
      frames: linearFrames(rows.runRight, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.run,
    },
    idleUp: {
      frames: linearFrames(rows.idleUp, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.idle,
    },
    walkUp: {
      frames: linearFrames(rows.walkUp, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.walk,
    },
    runUp: {
      frames: linearFrames(rows.runUp, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.run,
    },
    dash: {
      frames: mappedFrames(rows.dash, kiraAnimationConfig.dashColumns),
      loop: false,
      frameDuration: kiraAnimationConfig.durations.dash,
      next: 'idleDown',
    },
    dashLoop: {
      frames: mappedFrames(rows.dash, kiraAnimationConfig.dashColumns),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.dashLoop,
    },
    slide: {
      frames: mappedFrames(rows.slide, kiraAnimationConfig.slideColumns),
      loop: false,
      frameDuration: kiraAnimationConfig.durations.slide,
      next: 'idleDown',
    },
    idle: {
      frames: linearFrames(rows.idleDown, locomotionFrames),
      loop: true,
      frameDuration: kiraAnimationConfig.durations.idle,
    },
  };
}
