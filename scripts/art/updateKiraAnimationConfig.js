#!/usr/bin/env node
/**
 * Update Kira animation configuration based on the normalized dash/slide manifest.
 *
 * This automation keeps gameplay code in sync with the latest normalized atlas so
 * bespoke sprite swaps can reuse the same manifest pipeline without manual edits.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const defaultManifestPath = path.join(
  projectRoot,
  'assets/generated/images/ar-003/image-ar-003-kira-evasion-pack-normalized.json'
);
const defaultOutputPath = path.join(
  projectRoot,
  'src/game/data/animations/kiraAnimationConfig.js'
);

/**
 * Basic argument parsing for `--key=value` pairs.
 * Provides enough flexibility to override manifest or output paths if needed.
 */
function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    if (!arg.startsWith('--')) {
      return acc;
    }
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value ?? true;
    return acc;
  }, {});
}

function formatObject(obj, indentLevel = 2) {
  const indent = ' '.repeat(indentLevel);
  const innerIndent = ' '.repeat(indentLevel + 2);
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return '{}';
  }
  const lines = entries.map(([key, value]) => {
    const formattedValue =
      Array.isArray(value)
        ? formatArray(value, indentLevel + 2)
        : value && typeof value === 'object'
          ? formatObject(value, indentLevel + 2)
          : JSON.stringify(value);
    return `${innerIndent}${key}: ${formattedValue}`;
  });
  return `{\n${lines.join(',\n')}\n${indent}}`;
}

function formatArray(arr, indentLevel = 2) {
  const indent = ' '.repeat(indentLevel);
  const innerIndent = ' '.repeat(indentLevel + 2);
  if (arr.length === 0) {
    return '[]';
  }
  const lines = arr.map((value) => `${innerIndent}${JSON.stringify(value)}`);
  return `[\n${lines.join(',\n')}\n${indent}]`;
}

function buildFileContents({
  manifestRelativePath,
  imageUrl,
  frameSize,
  rows,
  dashColumns,
  slideColumns,
  locomotionFrameCount,
  durations,
}) {
  const generatedAt = new Date().toISOString();
  return `/**
 * Auto-generated file.
 * Source manifest: ${manifestRelativePath}
 * Generated via scripts/art/updateKiraAnimationConfig.js on ${generatedAt}
 *
 * Do not edit manually—run the script after updating the normalized atlas.
 */

export const kiraAnimationConfig = {
  imageUrl: ${JSON.stringify(imageUrl)},
  frameWidth: ${frameSize},
  frameHeight: ${frameSize},
  defaultAnimation: 'idleDown',
  rows: ${formatObject(rows, 2)},
  dashColumns: ${formatArray(dashColumns, 2)},
  slideColumns: ${formatArray(slideColumns, 2)},
  locomotionFrameCount: ${locomotionFrameCount},
  durations: ${formatObject(durations, 2)},
  metadata: ${formatObject(
    {
      manifestPath: manifestRelativePath,
      generatedAt,
    },
    2
  )}
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
`;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest ?? defaultManifestPath);
  const outputPath = path.resolve(args.output ?? defaultOutputPath);
  const locomotionFrameCount = Number(args['locomotion-frames'] ?? 6);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const normalizedCore = manifest?.outputs?.normalizedCore;
  if (!normalizedCore) {
    throw new Error('Manifest missing outputs.normalizedCore data');
  }

  const dashColumns = normalizedCore.dashColumns ?? [];
  const slideColumns = normalizedCore.slideColumns ?? [];
  if (dashColumns.length === 0 || slideColumns.length === 0) {
    throw new Error('Manifest missing dash/slide column data');
  }

  const rows = {
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
    dash: normalizedCore.dashRow ?? 12,
    slide: normalizedCore.slideRow ?? 13,
  };

  const durations = {
    idle: Number(args['duration-idle'] ?? 0.28),
    walk: Number(args['duration-walk'] ?? 0.14),
    run: Number(args['duration-run'] ?? 0.1),
    dash: Number(args['duration-dash'] ?? 0.055),
    dashLoop: Number(args['duration-dash-loop'] ?? 0.06),
    slide: Number(args['duration-slide'] ?? 0.06),
  };

  const fileContents = buildFileContents({
    manifestRelativePath: path.relative(projectRoot, manifestPath).replace(/\\/g, '/'),
    imageUrl: '/generated/images/ar-003/image-ar-003-kira-core-pack-normalized.png',
    frameSize: normalizedCore.frameSize ?? manifest.frameSize ?? 32,
    rows,
    dashColumns,
    slideColumns,
    locomotionFrameCount,
    durations,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fileContents);

  console.log(`Updated kira animation config (${path.relative(projectRoot, outputPath)})`);
}

run();
