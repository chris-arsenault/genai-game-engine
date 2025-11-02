"""
Derive NPC sprite variants from AR-004 generation outputs.

This utility crops each civilian/guard variant from the large generation sheet,
scales it to the standard 32x48 footprint, and exports transparent PNGs that the
runtime can consume directly. The script also emits a manifest describing each
variant so gameplay code can reference faction-specific sprite pools.

Usage:
    python scripts/art/deriveNpcSpriteVariants.py

Outputs:
    assets/generated/images/ar-004/variants/civilian-01.png
    assets/generated/images/ar-004/variants/guard-01.png
    assets/generated/images/ar-004/variant-manifest.json
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from random import sample
from typing import Iterable, List, Sequence, Tuple

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
AR004_DIR = ROOT / "assets" / "generated" / "images" / "ar-004"
OUTPUT_DIR = AR004_DIR / "variants"
MANIFEST_PATH = AR004_DIR / "variant-manifest.json"

TARGET_WIDTH = 32
TARGET_HEIGHT = 48
ALPHA_THRESHOLD = 200


@dataclass
class BoundingBox:
  """Simple bounding box container using inclusive coordinates."""

  x0: int
  y0: int
  x1: int
  y1: int

  @property
  def width(self) -> int:
    return self.x1 - self.x0 + 1

  @property
  def height(self) -> int:
    return self.y1 - self.y0 + 1

  def normalize(self, width: int, height: int) -> "BoundingBox":
    """Clamp the box to the specified canvas dimensions."""
    return BoundingBox(
        max(0, self.x0),
        max(0, self.y0),
        min(width - 1, self.x1),
        min(height - 1, self.y1),
    )


def cluster_pixels(image: Image.Image, k: int) -> List[BoundingBox]:
  """Cluster high-alpha pixels along the X axis to discover character regions."""
  width, height = image.size
  opaque_pixels = [(x, y) for y in range(height) for x in range(width)
                   if image.getpixel((x, y))[3] > ALPHA_THRESHOLD]

  if len(opaque_pixels) < k:
    raise ValueError(f"Not enough opaque pixels to cluster into {k} groups.")

  # Initialise centroids using a stratified sample of X positions.
  seed_centroids = sorted(sample([x for x, _ in opaque_pixels], k))
  centroids = seed_centroids[:]

  for _ in range(25):
    clusters: List[List[Tuple[int, int]]] = [[] for _ in range(k)]
    for x, y in opaque_pixels:
      idx = min(range(k), key=lambda i: abs(x - centroids[i]))
      clusters[idx].append((x, y))

    new_centroids: List[float] = []
    converged = True

    for idx, cluster in enumerate(clusters):
      if not cluster:
        # Retain the previous centroid to avoid collapsing the cluster.
        new_centroids.append(centroids[idx])
        continue

      average = sum(x for x, _ in cluster) / len(cluster)
      if abs(average - centroids[idx]) > 0.05:
        converged = False
      new_centroids.append(average)

    centroids = new_centroids
    if converged:
      break

  boxes: List[BoundingBox] = []
  for cluster in clusters:
    if not cluster:
      continue
    xs = [x for x, _ in cluster]
    ys = [y for _, y in cluster]
    boxes.append(BoundingBox(min(xs), min(ys), max(xs), max(ys)))

  if len(boxes) != k:
    raise ValueError(f"Expected {k} clusters, found {len(boxes)}.")

  return boxes


def ensure_output_dir() -> None:
  OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def crop_and_scale(image: Image.Image, box: BoundingBox) -> Image.Image:
  """Crop the provided bounding box and scale to the 32x48 footprint."""
  clamped = box.normalize(*image.size)
  crop = image.crop((clamped.x0, clamped.y0, clamped.x1 + 1, clamped.y1 + 1))
  crop = crop.convert("RGBA")

  scale_factor = min(TARGET_WIDTH / crop.width, TARGET_HEIGHT / crop.height)
  if scale_factor <= 0:
    raise ValueError("Invalid scale factor derived from bounding box.")

  scaled_width = max(1, int(round(crop.width * scale_factor)))
  scaled_height = max(1, int(round(crop.height * scale_factor)))

  resized = crop.resize((scaled_width, scaled_height), Image.NEAREST)

  canvas = Image.new("RGBA", (TARGET_WIDTH, TARGET_HEIGHT), (0, 0, 0, 0))
  offset_x = (TARGET_WIDTH - scaled_width) // 2
  offset_y = (TARGET_HEIGHT - scaled_height)
  canvas.paste(resized, (offset_x, offset_y), resized)
  return canvas


def build_manifest_entry(kind: str, variant_index: int, filename: str) -> dict:
  return {
      "id": f"ar-004::{kind}::{variant_index:02d}",
      "faction": kind,
      "variant": variant_index,
      "path": f"assets/generated/images/ar-004/variants/{filename}",
      "width": TARGET_WIDTH,
      "height": TARGET_HEIGHT,
  }


def process_sheet(sheet_name: str, kind: str, expected_variants: int,
                  manifest: List[dict]) -> None:
  image_path = AR004_DIR / sheet_name
  if not image_path.exists():
    raise FileNotFoundError(f"Missing AR-004 sheet: {image_path}")

  with Image.open(image_path).convert("RGBA") as image:
    boxes = cluster_pixels(image, expected_variants)
    boxes.sort(key=lambda b: b.x0)

    for variant_idx, box in enumerate(boxes, start=1):
      sprite = crop_and_scale(image, box)
      filename = f"{kind}-{variant_idx:02d}.png"
      output_path = OUTPUT_DIR / filename
      sprite.save(output_path)

      manifest.append(build_manifest_entry(kind, variant_idx, filename))


def write_manifest(entries: Sequence[dict]) -> None:
  data = {
      "version": 1,
      "source": "deriveNpcSpriteVariants.py",
      "generated": entries,
  }
  with MANIFEST_PATH.open("w", encoding="utf-8") as handle:
    json.dump(data, handle, indent=2)
    handle.write("\n")


def main() -> None:
  ensure_output_dir()
  manifest_entries: List[dict] = []

  process_sheet("image-ar-004-npc-civilian-pack.png", "civilian", 5, manifest_entries)
  process_sheet("image-ar-004-npc-guard-pack.png", "guard", 3, manifest_entries)

  write_manifest(manifest_entries)
  print(f"Generated {len(manifest_entries)} NPC variants into {OUTPUT_DIR}")
  print(f"Manifest written to {MANIFEST_PATH}")


if __name__ == "__main__":
  main()
