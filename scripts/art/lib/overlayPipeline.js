import fs from "node:fs/promises";
import path from "node:path";
import { Jimp } from "jimp";

const DEFAULT_OUTPUT_DIR = "assets/overlays/output";

const clone = typeof structuredClone === "function"
  ? structuredClone
  : (value) => JSON.parse(JSON.stringify(value));

function hexToRgb(color) {
  if (typeof color !== "string") {
    throw new Error("Tint color must be a string");
  }

  const normalized = color.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Invalid hex color "${color}"`);
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/**
 * Downloads an image from a URL or reads it from disk if the scheme is "file".
 * @param {string} sourceUrl
 * @returns {Promise<Buffer>}
 */
export async function loadSourceBuffer(sourceUrl) {
  if (!sourceUrl) {
    throw new Error("Source URL is required to load an overlay reference");
  }

  if (sourceUrl.startsWith("file://")) {
    const filePath = sourceUrl.replace("file://", "");
    return fs.readFile(filePath);
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image from ${sourceUrl}: ${response.status} ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Applies an alpha curve based on pixel luma.
 * @param {Jimp} image
 * @param {{threshold?: number, softness?: number, invert?: boolean, floor?: number, ceiling?: number}} options
 */
export function applyAlphaFromLuma(image, options = {}) {
  const {
    threshold = 128,
    softness = 64,
    invert = false,
    floor = 0,
    ceiling = 255,
  } = options;

  const spread = Math.max(softness, 1);
  const floorClamped = Math.max(0, Math.min(floor, 255));
  const ceilingClamped = Math.max(floorClamped, Math.min(ceiling, 255));

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (_x, _y, idx) => {
    const r = image.bitmap.data[idx];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    let alpha = (luma - threshold) / spread;
    alpha = Math.max(0, Math.min(1, alpha));
    if (invert) {
      alpha = 1 - alpha;
    }

    const computedAlpha =
      floorClamped + alpha * (ceilingClamped - floorClamped);
    image.bitmap.data[idx + 3] = Math.round(computedAlpha);
  });

  return image;
}

/**
 * Performs a shallow merge of default operations with entry-level overrides.
 * Nested objects (e.g. alphaFromLuma) are merged.
 * @param {Record<string, any>} defaults
 * @param {Record<string, any>} overrides
 * @returns {Record<string, any>}
 */
export function mergeOperations(defaults = {}, overrides = {}) {
  const result = clone(defaults);

  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = {
        ...result[key],
        ...value,
      };
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Applies overlay operations to a Jimp image instance.
 * @param {Jimp} image
 * @param {Record<string, any>} operations
 * @returns {Promise<Jimp>}
 */
export async function applyOperations(image, operations = {}) {
  if (!operations || Object.keys(operations).length === 0) {
    return image;
  }

  if (operations.resize) {
    const { width, height, mode = Jimp.RESIZE_BICUBIC } = operations.resize;
    const resizeOptions = {};

    if (typeof width === "number" && Number.isFinite(width) && width > 0) {
      resizeOptions.w = width;
    }
    if (typeof height === "number" && Number.isFinite(height) && height > 0) {
      resizeOptions.h = height;
    }

    if (Object.keys(resizeOptions).length > 0) {
      if (mode) {
        resizeOptions.mode = mode;
      }
      image.resize(resizeOptions);
    }
  }

  if (operations.centerCropWidth) {
    const sliceWidth = Math.min(
      operations.centerCropWidth,
      image.bitmap.width,
    );
    const x = Math.max(0, Math.round((image.bitmap.width - sliceWidth) / 2));
    image.crop({ x, y: 0, w: sliceWidth, h: image.bitmap.height });
  }

  if (operations.trimTop) {
    const trim = Math.min(operations.trimTop, image.bitmap.height - 1);
    image.crop({
      x: 0,
      y: trim,
      w: image.bitmap.width,
      h: image.bitmap.height - trim,
    });
  }

  if (operations.trimBottom) {
    const trim = Math.min(operations.trimBottom, image.bitmap.height - 1);
    image.crop({
      x: 0,
      y: 0,
      w: image.bitmap.width,
      h: image.bitmap.height - trim,
    });
  }

  if (operations.autocrop) {
    image.autocrop(operations.autocrop);
  }

  if (typeof operations.brightness === "number") {
    image.brightness(operations.brightness);
  }

  if (typeof operations.contrast === "number") {
    image.contrast(operations.contrast);
  }

  if (operations.normalize) {
    image.normalize();
  }

  if (typeof operations.desaturate === "number") {
    image.color([{ apply: "desaturate", params: [operations.desaturate] }]);
  }

  if (operations.tint) {
    const { color = "#ffffff", amount = 50 } = operations.tint;
    const rgb = hexToRgb(color);
    const params =
      typeof amount === "number" ? [rgb, amount] : [rgb];
    image.color([{ apply: "mix", params }]);
  }

  if (typeof operations.blur === "number") {
    image.blur(operations.blur);
  }

  if (typeof operations.gaussian === "number") {
    image.gaussian(operations.gaussian);
  }

  if (typeof operations.opacity === "number") {
    image.opacity(Math.max(0, Math.min(1, operations.opacity)));
  }

  if (operations.alphaFromLuma) {
    applyAlphaFromLuma(image, operations.alphaFromLuma);
  }

  if (operations.postBlur) {
    image.blur(operations.postBlur);
  }

  return image;
}

/**
 * Processes a single overlay entry.
 * @param {{ id: string, sourceUrl: string, output?: string, operations?: Record<string, any> }} entry
 * @param {{ outputDir?: string, defaults?: Record<string, any>, dryRun?: boolean }} options
 */
export async function processEntry(entry, options = {}) {
  if (!entry?.id) {
    throw new Error("Overlay entry requires an id");
  }

  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const operations = mergeOperations(options.defaults, entry.operations);
  const buffer = await loadSourceBuffer(entry.sourceUrl);
  const image = await Jimp.read(buffer);

  await applyOperations(image, operations);

  const filename = entry.output ?? `${entry.id}.png`;
  const outputPath = path.join(outputDir, filename);

  if (options.dryRun) {
    return { outputPath, width: image.bitmap.width, height: image.bitmap.height };
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await image.write(outputPath);

  return { outputPath, width: image.bitmap.width, height: image.bitmap.height };
}

/**
 * Processes a JSON configuration file describing overlay derivatives.
 * @param {string} configPath
 * @param {{ dryRun?: boolean, filter?: string[] }} options
 */
export async function processConfig(configPath, options = {}) {
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw);

  const outputDir = options.outputDir ?? config.outputDir ?? DEFAULT_OUTPUT_DIR;
  const defaults = config.defaults?.operations ?? {};
  const filterSet = options.filter ? new Set(options.filter) : null;

  const results = [];
  for (const entry of config.entries ?? []) {
    if (filterSet && !filterSet.has(entry.id)) {
      continue;
    }

    const result = await processEntry(entry, {
      outputDir,
      defaults,
      dryRun: options.dryRun,
    });
    results.push({ id: entry.id, ...result });
  }

  return results;
}
