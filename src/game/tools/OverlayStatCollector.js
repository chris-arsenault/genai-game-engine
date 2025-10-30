import fs from 'node:fs/promises';
import { Jimp } from 'jimp';

/**
 * Compute overlay statistics for a loaded Jimp image.
 * @param {Jimp} image
 * @returns {{
 *   width: number,
 *   height: number,
 *   pixelCount: number,
 *   averageLuma: number,
 *   averageAlpha: number,
 *   peakAlpha: number,
 *   highAlphaRatio: number,
 *   lowAlphaRatio: number
 * }}
 */
export function computeOverlayStats(image) {
  let lumaSum = 0;
  let alphaSum = 0;
  let peakAlpha = 0;
  let highAlpha = 0;
  let lowAlpha = 0;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (_x, _y, idx) => {
    const r = image.bitmap.data[idx];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    const a = image.bitmap.data[idx + 3];

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumaSum += luma;
    alphaSum += a;
    peakAlpha = Math.max(peakAlpha, a);

    if (a >= 220) {
      highAlpha += 1;
    } else if (a <= 64) {
      lowAlpha += 1;
    }
  });

  const pixelCount = image.bitmap.width * image.bitmap.height;
  const averageLuma = pixelCount > 0 ? lumaSum / pixelCount : 0;
  const averageAlpha = pixelCount > 0 ? alphaSum / pixelCount : 0;

  return {
    width: image.bitmap.width,
    height: image.bitmap.height,
    pixelCount,
    averageLuma,
    averageAlpha,
    peakAlpha,
    highAlphaRatio: pixelCount > 0 ? highAlpha / pixelCount : 0,
    lowAlphaRatio: pixelCount > 0 ? lowAlpha / pixelCount : 0,
  };
}

/**
 * Load a PNG overlay from disk and compute its statistics.
 * @param {string} filePath
 * @returns {Promise<ReturnType<typeof computeOverlayStats>>}
 */
export async function collectOverlayStatsFromFile(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('[collectOverlayStatsFromFile] filePath is required');
  }
  const buffer = await fs.readFile(filePath);
  const image = await Jimp.read(buffer);
  return computeOverlayStats(image);
}

/**
 * Convert raw overlay stats into normalized values useful for lighting previews.
 * @param {ReturnType<typeof computeOverlayStats>} stats
 * @returns {{
 *   width: number,
 *   height: number,
 *   pixelCount: number,
 *   averageLuma: number,
 *   averageAlpha: number,
 *   averageLumaNormalized: number,
 *   averageAlphaNormalized: number,
 *   peakAlpha: number,
 *   highAlphaRatio: number,
 *   lowAlphaRatio: number
 * }}
 */
export function normalizeOverlayStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return {
      width: 0,
      height: 0,
      pixelCount: 0,
      averageLuma: 0,
      averageAlpha: 0,
      averageLumaNormalized: 0,
      averageAlphaNormalized: 0,
      peakAlpha: 0,
      highAlphaRatio: 0,
      lowAlphaRatio: 0,
    };
  }
  const averageAlphaNormalized =
    typeof stats.averageAlpha === 'number' && stats.averageAlpha > 0
      ? stats.averageAlpha / 255
      : 0;
  const averageLumaNormalized =
    typeof stats.averageLuma === 'number' && stats.averageLuma > 0
      ? stats.averageLuma / 255
      : 0;
  return {
    ...stats,
    averageAlphaNormalized,
    averageLumaNormalized,
  };
}
