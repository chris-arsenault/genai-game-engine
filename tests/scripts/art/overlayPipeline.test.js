import { Jimp } from "jimp";
import {
  applyAlphaFromLuma,
  applyOperations,
  mergeOperations,
} from "../../../scripts/art/lib/overlayPipeline.js";

describe("overlayPipeline utilities", () => {
  test("mergeOperations merges nested configuration objects", () => {
    const defaults = {
      resize: { height: 1024 },
      alphaFromLuma: { threshold: 100, softness: 80 },
    };

    const overrides = {
      alphaFromLuma: { softness: 40, floor: 10 },
      tint: { color: "#ffffff", amount: 20 },
    };

    expect(mergeOperations(defaults, overrides)).toEqual({
      resize: { height: 1024 },
      alphaFromLuma: { threshold: 100, softness: 40, floor: 10 },
      tint: { color: "#ffffff", amount: 20 },
    });
  });

  test("applyAlphaFromLuma maps luma to transparency", async () => {
    const image = new Jimp({
      width: 2,
      height: 1,
      color: 0x000000ff,
    });

    image.setPixelColor(0xffffffff, 0, 0);
    image.setPixelColor(0x000000ff, 1, 0);

    applyAlphaFromLuma(image, { threshold: 100, softness: 80 });

    const firstAlpha = image.bitmap.data[3];
    const secondAlpha = image.bitmap.data[7];

    expect(firstAlpha).toBe(255);
    expect(secondAlpha).toBe(0);
  });

  test("applyOperations crops, tints, and applies alpha mapping", async () => {
    const image = new Jimp({
      width: 6,
      height: 4,
      color: 0xffffffff,
    });

    const operations = {
      centerCropWidth: 4,
      trimTop: 1,
      trimBottom: 1,
      tint: { color: "#00ffff", amount: 30 },
      alphaFromLuma: { threshold: 90, softness: 60 },
    };

    await applyOperations(image, operations);

    expect(image.bitmap.width).toBe(4);
    expect(image.bitmap.height).toBe(2);

    const alphaValues = [];
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (_x, _y, idx) => {
      alphaValues.push(image.bitmap.data[idx + 3]);
    });

    expect(Math.max(...alphaValues)).toBe(255);
    expect(Math.min(...alphaValues)).toBeGreaterThanOrEqual(0);
  });

  test("applyOperations resizes images when only height is provided", async () => {
    const image = new Jimp({
      width: 800,
      height: 600,
      color: 0xffffffff,
    });

    await applyOperations(image, {
      resize: { height: 200 },
    });

    expect(image.bitmap.height).toBe(200);
    expect(image.bitmap.width).toBeGreaterThan(0);
  });
});
