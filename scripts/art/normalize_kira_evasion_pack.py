#!/usr/bin/env python3
"""
Normalize the generated dash/slide atlas for Kira and merge it into the core sprite sheet.

Outputs:
1. Normalized dash/slide atlas (image + manifest) under assets/generated/images/ar-003/.
2. Updated core sprite sheet with normalized dash/slide rows.

Usage:
    python scripts/art/normalize_kira_evasion_pack.py
"""

from __future__ import annotations

import json
import math
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]

SOURCE_PATH = PROJECT_ROOT / 'assets/generated/images/ar-003/image-ar-003-kira-evasion-pack.png'
CORE_SOURCE_PATH = PROJECT_ROOT / 'assets/generated/images/ar-003/image-ar-003-kira-core-pack.png'
NORMALIZED_PACK_PATH = PROJECT_ROOT / 'assets/generated/images/ar-003/image-ar-003-kira-evasion-pack-normalized.png'
NORMALIZED_CORE_PATH = PROJECT_ROOT / 'assets/generated/images/ar-003/image-ar-003-kira-core-pack-normalized.png'
MANIFEST_PATH = PROJECT_ROOT / 'assets/generated/images/ar-003/image-ar-003-kira-evasion-pack-normalized.json'

FRAME_SIZE = 32
ALPHA_THRESHOLD = 80
MIN_COMPONENT_PIXELS = 500
MIN_COMPONENT_HEIGHT = 100
MARGIN = 12
TARGET_HEIGHT = 28
TARGET_WIDTH = 28


@dataclass(frozen=True)
class ComponentBox:
  min_x: int
  min_y: int
  max_x: int
  max_y: int

  @property
  def width(self) -> int:
    return self.max_x - self.min_x + 1

  @property
  def height(self) -> int:
    return self.max_y - self.min_y + 1

  def expand(self, bounds: Tuple[int, int], margin: int) -> 'ComponentBox':
    max_x_bound, max_y_bound = bounds
    return ComponentBox(
      max(self.min_x - margin, 0),
      max(self.min_y - margin, 0),
      min(self.max_x + margin, max_x_bound - 1),
      min(self.max_y + margin, max_y_bound - 1),
    )


def find_components(image: Image.Image) -> List[ComponentBox]:
  width, height = image.size
  pixels = image.load()
  visited = [[False] * width for _ in range(height)]
  components: List[ComponentBox] = []

  for y in range(height):
    for x in range(width):
      if visited[y][x]:
        continue
      if pixels[x, y][3] < ALPHA_THRESHOLD:
        continue

      queue: deque[Tuple[int, int]] = deque([(x, y)])
      visited[y][x] = True

      min_x = max_x = x
      min_y = max_y = y
      count = 0

      while queue:
        cx, cy = queue.popleft()
        count += 1
        min_x = min(min_x, cx)
        max_x = max(max_x, cx)
        min_y = min(min_y, cy)
        max_y = max(max_y, cy)

        for nx in (cx - 1, cx, cx + 1):
          if nx < 0 or nx >= width:
            continue
          for ny in (cy - 1, cy, cy + 1):
            if ny < 0 or ny >= height:
              continue
            if visited[ny][nx]:
              continue
            if pixels[nx, ny][3] < ALPHA_THRESHOLD:
              continue
            visited[ny][nx] = True
            queue.append((nx, ny))

      if count < MIN_COMPONENT_PIXELS or (max_y - min_y + 1) < MIN_COMPONENT_HEIGHT:
        continue

      components.append(ComponentBox(min_x, min_y, max_x, max_y))

  components.sort(key=lambda box: (box.min_y, box.min_x))
  return components


def normalize_frame(image: Image.Image, box: ComponentBox) -> Image.Image:
  width, height = image.size
  expanded = box.expand((width, height), MARGIN)
  crop = image.crop((expanded.min_x, expanded.min_y, expanded.max_x + 1, expanded.max_y + 1))

  original_width, original_height = crop.size
  scale = min(
    TARGET_WIDTH / original_width,
    TARGET_HEIGHT / original_height,
    1.0,
  )
  if scale <= 0:
    scale = 1.0

  resized_width = max(1, int(math.ceil(original_width * scale)))
  resized_height = max(1, int(math.ceil(original_height * scale)))
  resized = crop.resize((resized_width, resized_height), Image.LANCZOS)

  canvas = Image.new('RGBA', (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
  offset_x = (FRAME_SIZE - resized_width) // 2
  offset_y = FRAME_SIZE - resized_height
  canvas.paste(resized, (offset_x, offset_y), resized)
  return canvas


def write_normalized_pack(dash_frames: Sequence[Image.Image], slide_frames: Sequence[Image.Image]) -> dict:
  max_columns = max(len(dash_frames), len(slide_frames))
  atlas = Image.new('RGBA', (FRAME_SIZE * max_columns, FRAME_SIZE * 2), (0, 0, 0, 0))

  for index, frame in enumerate(dash_frames):
    atlas.paste(frame, (index * FRAME_SIZE, 0), frame)
  for index, frame in enumerate(slide_frames):
    atlas.paste(frame, (index * FRAME_SIZE, FRAME_SIZE), frame)

  atlas.save(NORMALIZED_PACK_PATH)

  return {
    'normalizedAtlas': str(NORMALIZED_PACK_PATH.relative_to(PROJECT_ROOT)).replace('\\', '/'),
    'dash': [{'column': index, 'row': 0} for index in range(len(dash_frames))],
    'slide': [{'column': index, 'row': 1} for index in range(len(slide_frames))],
    'frameSize': FRAME_SIZE,
    'columns': max_columns,
    'rows': 2,
  }


def merge_with_core_pack(
  dash_frames: Sequence[Image.Image],
  slide_frames: Sequence[Image.Image],
) -> dict:
  core = Image.open(CORE_SOURCE_PATH).convert('RGBA')
  original_columns = core.size[0] // FRAME_SIZE
  rows = core.size[1] // FRAME_SIZE

  max_columns = max(original_columns, len(slide_frames), len(dash_frames))
  merged = Image.new('RGBA', (FRAME_SIZE * max_columns, FRAME_SIZE * rows), (0, 0, 0, 0))
  merged.paste(core, (0, 0))

  dash_row = 12
  slide_row = 13

  blank_row = Image.new('RGBA', (FRAME_SIZE * max_columns, FRAME_SIZE), (0, 0, 0, 0))
  merged.paste(blank_row, (0, dash_row * FRAME_SIZE))
  merged.paste(blank_row, (0, slide_row * FRAME_SIZE))

  for index, frame in enumerate(dash_frames):
    merged.paste(frame, (index * FRAME_SIZE, dash_row * FRAME_SIZE), frame)
  for index, frame in enumerate(slide_frames):
    merged.paste(frame, (index * FRAME_SIZE, slide_row * FRAME_SIZE), frame)

  merged.save(NORMALIZED_CORE_PATH)

  return {
    'normalizedCore': str(NORMALIZED_CORE_PATH.relative_to(PROJECT_ROOT)).replace('\\', '/'),
    'rows': rows,
    'columns': max_columns,
    'dashRow': dash_row,
    'slideRow': slide_row,
    'dashColumns': list(range(len(dash_frames))),
    'slideColumns': list(range(len(slide_frames))),
  }


def main() -> None:
  if not SOURCE_PATH.exists():
    raise FileNotFoundError(f'Source atlas not found: {SOURCE_PATH}')
  if not CORE_SOURCE_PATH.exists():
    raise FileNotFoundError(f'Core sprite sheet not found: {CORE_SOURCE_PATH}')

  image = Image.open(SOURCE_PATH).convert('RGBA')
  components = find_components(image)
  if len(components) != 16:
    raise RuntimeError(f'Expected 16 frame blobs, found {len(components)}')

  dash_components = components[:6]
  slide_components = components[6:]

  dash_frames = [normalize_frame(image, box) for box in dash_components]
  slide_frames = [normalize_frame(image, box) for box in slide_components]

  atlas_info = write_normalized_pack(dash_frames, slide_frames)
  core_info = merge_with_core_pack(dash_frames, slide_frames)

  manifest = {
    'source': str(SOURCE_PATH.relative_to(PROJECT_ROOT)).replace('\\', '/'),
    'generatedAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    'frameSize': FRAME_SIZE,
    'dashFrames': [
      {
        'bounds': {
          'minX': box.min_x,
          'minY': box.min_y,
          'maxX': box.max_x,
          'maxY': box.max_y,
        },
        'normalizedColumn': index,
        'normalizedRow': 0,
      }
      for index, box in enumerate(dash_components)
    ],
    'slideFrames': [
      {
        'bounds': {
          'minX': box.min_x,
          'minY': box.min_y,
          'maxX': box.max_x,
          'maxY': box.max_y,
        },
        'normalizedColumn': index,
        'normalizedRow': 1,
      }
      for index, box in enumerate(slide_components)
    ],
    'outputs': {
      'normalizedAtlas': atlas_info,
      'normalizedCore': core_info,
    },
  }

  with MANIFEST_PATH.open('w', encoding='utf8') as handle:
    json.dump(manifest, handle, indent=2)

  print(f'Wrote normalized atlas to {atlas_info["normalizedAtlas"]}')
  print(f'Updated core sprite sheet at {core_info["normalizedCore"]}')
  print(f'Manifest written to {MANIFEST_PATH.relative_to(PROJECT_ROOT)}')


if __name__ == '__main__':
  main()
