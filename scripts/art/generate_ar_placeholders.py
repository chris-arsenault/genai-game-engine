#!/usr/bin/env python3
"""
Generate neon-noir placeholder assets for AR-001 through AR-005 requests.

These placeholders unblock UI wiring and gameplay iteration until bespoke art
arrives. All assets are generated procedurally using Pillow so licensing stays
internal to the project.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Tuple

from PIL import Image, ImageDraw, ImageFont


OUTPUT_DIR = Path("assets/generated/ar-placeholders")
DEFAULT_BG = "#0b0f1e"
PRIMARY_COLOURS = ["#2ddcff", "#ff4fd8", "#f6c657", "#6ce1b8"]


@dataclass(frozen=True)
class AssetDefinition:
    request_id: str
    size: Tuple[int, int]
    generator: Callable[[Image.Image, ImageDraw.ImageDraw], None]


def ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_font(point_size: int = 12) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", point_size)
    except OSError:
        return ImageFont.load_default()


def draw_node_graph(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    width, height = canvas.size
    nodes = [
        (width * 0.25, height * 0.25),
        (width * 0.75, height * 0.23),
        (width * 0.7, height * 0.62),
        (width * 0.3, height * 0.65),
        (width * 0.5, height * 0.45),
    ]
    connections = [
        (0, 4),
        (1, 4),
        (2, 4),
        (3, 4),
        (0, 3),
        (1, 2),
    ]
    for start_index, end_index in connections:
        start = nodes[start_index]
        end = nodes[end_index]
        draw.line(
            [start, end],
            fill="#1e90ff",
            width=4,
            joint="curve",
        )
    for idx, (x_pos, y_pos) in enumerate(nodes):
        radius = 28
        colour = PRIMARY_COLOURS[idx % len(PRIMARY_COLOURS)]
        draw.ellipse(
            [(x_pos - radius, y_pos - radius), (x_pos + radius, y_pos + radius)],
            outline="#101c3d",
            fill=colour,
        )
        draw.ellipse(
            [(x_pos - radius + 12, y_pos - radius + 12), (x_pos + radius - 12, y_pos + radius - 12)],
            outline="#0d1324",
            fill="#081020",
        )


def generate_deduction_board(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([(0, 0), canvas.size], fill=DEFAULT_BG)
    width, height = canvas.size
    grid_spacing = 64
    for offset in range(0, width + grid_spacing, grid_spacing):
        draw.line([(offset, 0), (offset, height)], fill="#122034", width=2)
    for offset in range(0, height + grid_spacing, grid_spacing):
        draw.line([(0, offset), (width, offset)], fill="#122034", width=2)
    draw_node_graph(canvas, draw)
    font = load_font(32)
    draw.text(
        (36, height - 96),
        "Crossroads Deduction Overlay",
        font=font,
        fill="#2ddcff",
    )


def draw_sprite_grid(
    draw: ImageDraw.ImageDraw,
    origin: Tuple[int, int],
    size: Tuple[int, int],
    colours: Tuple[str, str],
    accent: str,
) -> None:
    x_start, y_start = origin
    width, height = size
    draw.rectangle(
        [(x_start, y_start), (x_start + width, y_start + height)],
        outline=colours[0],
        fill=colours[1],
        width=2,
    )
    draw.ellipse(
        [
            (x_start + width * 0.2, y_start + height * 0.2),
            (x_start + width * 0.8, y_start + height * 0.8),
        ],
        outline=accent,
        width=3,
    )
    draw.ellipse(
        [
            (x_start + width * 0.35, y_start + height * 0.35),
            (x_start + width * 0.65, y_start + height * 0.65),
        ],
        fill=accent,
    )


def generate_clue_nodes(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    width, height = canvas.size
    states = ["active", "solved", "locked"]
    colours = [("#1c395a", "#0e1529"), ("#20403b", "#102420"), ("#3d1f3b", "#1b0d1a")]
    centre_y = height // 2 - 32
    for idx, state in enumerate(states):
        origin_x = idx * 64
        draw_sprite_grid(
            draw,
            (origin_x + 8, centre_y + 8),
            (48, 48),
            colours[idx],
            PRIMARY_COLOURS[idx],
        )
        draw.text(
            (origin_x + 12, height - 14),
            state,
            font=load_font(10),
            fill="#7f9dd6",
        )


def generate_evidence_icons(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    icons = [
        ("physical", PRIMARY_COLOURS[0]),
        ("digital", PRIMARY_COLOURS[1]),
        ("testimonial", PRIMARY_COLOURS[2]),
        ("forensic", PRIMARY_COLOURS[3]),
    ]
    width, height = canvas.size
    cell_width = width // len(icons)
    for idx, (label, colour) in enumerate(icons):
        x_start = idx * cell_width
        draw.rectangle(
            [(x_start, 0), (x_start + cell_width, height)],
            fill="#0e1529",
            outline="#192748",
            width=1,
        )
        draw.polygon(
            [
                (x_start + cell_width * 0.2, height * 0.75),
                (x_start + cell_width * 0.5, height * 0.25),
                (x_start + cell_width * 0.8, height * 0.75),
            ],
            outline=colour,
            fill=colour,
        )
        draw.text(
            (x_start + 4, height - 11),
            label[:7],
            font=load_font(10),
            fill="#a7b9ff",
        )


def generate_button_pack(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    buttons = [
        ("play", "#2ddcff"),
        ("pause", "#58ff9a"),
        ("settings", "#2c9bff"),
        ("confirm", "#f6c657"),
        ("cancel", "#ff4f6f"),
    ]
    button_width = canvas.width // len(buttons)
    normal_height = canvas.height // 2
    for idx, (label, colour) in enumerate(buttons):
        x_start = idx * button_width
        draw.rounded_rectangle(
            [(x_start + 6, 6), (x_start + button_width - 6, normal_height - 4)],
            radius=12,
            fill=colour,
            outline="#081020",
            width=3,
        )
        draw.rounded_rectangle(
            [
                (x_start + 6, normal_height + 4),
                (x_start + button_width - 6, canvas.height - 6),
            ],
            radius=12,
            fill="#0b162f",
            outline=colour,
            width=2,
        )
        draw.text(
            (x_start + 12, 12),
            label,
            font=load_font(11),
            fill="#041024",
        )
        draw.text(
            (x_start + 12, normal_height + 8),
            "pressed",
            font=load_font(9),
            fill=colour,
        )


def generate_marker(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.polygon(
        [(16, 30), (4, 30), (8, 20)],
        outline="#2ddcff",
        fill="#132238",
        width=2,
    )
    draw.rectangle([(12, 4), (20, 16)], outline="#2ddcff", fill="#0b162f", width=2)


def generate_fingerprint(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    centre = (canvas.width // 2, canvas.height // 2)
    for radius in range(6, 15, 2):
        draw.ellipse(
            [
                (centre[0] - radius, centre[1] - radius),
                (centre[0] + radius, centre[1] + radius),
            ],
            outline="#2ddcff",
            width=1,
        )
    draw.arc(
        [
            (centre[0] - 11, centre[1] - 11),
            (centre[0] + 11, centre[1] + 11),
        ],
        start=210,
        end=330,
        fill="#ff4fd8",
        width=2,
    )


def generate_document(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([(4, 4), (28, 28)], fill="#141f33", outline="#58ff9a", width=2)
    draw.line([(8, 12), (24, 12)], fill="#58ff9a", width=2)
    draw.line([(8, 18), (22, 18)], fill="#58ff9a", width=2)
    draw.rectangle([(8, 22), (18, 24)], fill="#2ddcff")


def generate_extractor(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle([(6, 8), (26, 24)], radius=6, fill="#1a2744", outline="#2ddcff", width=2)
    draw.polygon([(16, 4), (20, 12), (12, 12)], fill="#ff4fd8")
    draw.rectangle([(14, 12), (18, 20)], fill="#2ddcff")


def generate_blood_spatter(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse([(12, 10), (24, 22)], fill="#ff4f6f")
    draw.ellipse([(6, 12), (14, 20)], fill="#b80d36")
    draw.ellipse([(20, 6), (26, 12)], fill="#d41d4d")


def generate_player_sprite(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([(0, 0), canvas.size], fill="#141f33")
    cell_width = canvas.width // 4
    cell_height = canvas.height // 3
    directions = ["N", "E", "S", "W"]
    for col, direction in enumerate(directions):
        for row in range(3):
            x_start = col * cell_width
            y_start = row * cell_height
            draw.rectangle(
                [(x_start + 1, y_start + 1), (x_start + cell_width - 2, y_start + cell_height - 2)],
                outline="#0e1624",
                fill="#0e1529",
            )
            draw.ellipse(
                [
                    (x_start + cell_width // 2 - 6, y_start + 6),
                    (x_start + cell_width // 2 + 6, y_start + 18),
                ],
                fill="#f1d0a8",
            )
            draw.rectangle(
                [
                    (x_start + cell_width // 2 - 10, y_start + 18),
                    (x_start + cell_width // 2 + 10, y_start + cell_height - 4),
                ],
                fill="#1a2a44",
            )
            draw.text(
                (x_start + 4, y_start + cell_height - 14),
                direction,
                font=load_font(10),
                fill="#7f9dd6",
            )


def generate_npc_pack(canvas: Image.Image, draw: ImageDraw.ImageDraw, palette: Tuple[str, str, str]) -> None:
    draw.rectangle([(0, 0), canvas.size], fill="#111a2d")
    columns = 3
    cell_width = canvas.width // columns
    for idx in range(columns):
        x_start = idx * cell_width
        visor_colour = palette[idx % len(palette)]
        draw.rectangle(
            [
                (x_start + 4, 4),
                (x_start + cell_width - 4, canvas.height - 4),
            ],
            fill="#1a243b",
            outline="#0d1324",
            width=1,
        )
        draw.rectangle(
            [
                (x_start + 8, 8),
                (x_start + cell_width - 8, 18),
            ],
            fill=visor_colour,
        )
        draw.rectangle(
            [
                (x_start + 10, 20),
                (x_start + cell_width - 10, 28),
            ],
            fill="#101c30",
        )


def generate_tileset(canvas: Image.Image, draw: ImageDraw.ImageDraw, palette: Tuple[str, ...]) -> None:
    tile_size = 16
    cols = canvas.width // tile_size
    rows = canvas.height // tile_size
    for row in range(rows):
        for col in range(cols):
            x_start = col * tile_size
            y_start = row * tile_size
            colour = palette[(row + col) % len(palette)]
            draw.rectangle(
                [
                    (x_start, y_start),
                    (x_start + tile_size - 1, y_start + tile_size - 1),
                ],
                fill=colour,
                outline="#070b16",
            )
            if (row + col) % 3 == 0:
                draw.line(
                    [
                        (x_start, y_start + tile_size - 3),
                        (x_start + tile_size - 1, y_start + tile_size - 3),
                    ],
                    fill="#0d1324",
                )


def build_asset_definitions() -> Dict[str, AssetDefinition]:
    return {
        "image-ar-001-deduction-board-bg": AssetDefinition(
            "image-ar-001-deduction-board-bg",
            (1024, 768),
            generate_deduction_board,
        ),
        "image-ar-001-clue-node-pack": AssetDefinition(
            "image-ar-001-clue-node-pack",
            (64 * 3, 80),
            generate_clue_nodes,
        ),
        "image-ar-001-evidence-icon-set": AssetDefinition(
            "image-ar-001-evidence-icon-set",
            (32 * 4, 40),
            generate_evidence_icons,
        ),
        "image-ar-001-ui-button-pack": AssetDefinition(
            "image-ar-001-ui-button-pack",
            (64 * 5, 64),
            generate_button_pack,
        ),
        "image-ar-002-generic-marker": AssetDefinition(
            "image-ar-002-generic-marker",
            (32, 32),
            generate_marker,
        ),
        "image-ar-002-fingerprint": AssetDefinition(
            "image-ar-002-fingerprint",
            (32, 32),
            generate_fingerprint,
        ),
        "image-ar-002-document": AssetDefinition(
            "image-ar-002-document",
            (32, 32),
            generate_document,
        ),
        "image-ar-002-neural-extractor": AssetDefinition(
            "image-ar-002-neural-extractor",
            (32, 32),
            generate_extractor,
        ),
        "image-ar-002-blood-spatter": AssetDefinition(
            "image-ar-002-blood-spatter",
            (32, 32),
            generate_blood_spatter,
        ),
        "image-ar-003-player-kira-sprite": AssetDefinition(
            "image-ar-003-player-kira-sprite",
            (32 * 4, 32 * 3),
            generate_player_sprite,
        ),
        "image-ar-004-npc-civilian-pack": AssetDefinition(
            "image-ar-004-npc-civilian-pack",
            (32 * 3, 32),
            lambda canvas, draw: generate_npc_pack(canvas, draw, ("#58ff9a", "#f6c657", "#2ddcff")),
        ),
        "image-ar-004-npc-guard-pack": AssetDefinition(
            "image-ar-004-npc-guard-pack",
            (32 * 3, 32),
            lambda canvas, draw: generate_npc_pack(canvas, draw, ("#ff4f6f", "#ff953f", "#ff4fd8")),
        ),
        "image-ar-005-tileset-neon-district": AssetDefinition(
            "image-ar-005-tileset-neon-district",
            (16 * 12, 16 * 12),
            lambda canvas, draw: generate_tileset(canvas, draw, ("#111a2d", "#1c385b", "#ff4fd8", "#2ddcff")),
        ),
        "image-ar-005-tileset-corporate-spires": AssetDefinition(
            "image-ar-005-tileset-corporate-spires",
            (16 * 12, 16 * 12),
            lambda canvas, draw: generate_tileset(canvas, draw, ("#101b2d", "#1f2f46", "#58ff9a", "#2c9bff")),
        ),
        "image-ar-005-tileset-archive-undercity": AssetDefinition(
            "image-ar-005-tileset-archive-undercity",
            (16 * 12, 16 * 12),
            lambda canvas, draw: generate_tileset(canvas, draw, ("#221b1b", "#3b2a1f", "#b87b2f", "#58ff9a")),
        ),
        "image-ar-005-tileset-zenith-sector": AssetDefinition(
            "image-ar-005-tileset-zenith-sector",
            (16 * 12, 16 * 12),
            lambda canvas, draw: generate_tileset(canvas, draw, ("#121b33", "#1b2a49", "#f6c657", "#2ddcff")),
        ),
    }


def save_asset(definition: AssetDefinition) -> Path:
    width, height = definition.size
    canvas = Image.new("RGBA", (width, height), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    definition.generator(canvas, draw)
    output_path = OUTPUT_DIR / f"{definition.request_id}.png"
    canvas.save(output_path)
    return output_path


def main() -> None:
    ensure_output_dir()
    definitions = build_asset_definitions()
    generated_paths = []
    for definition in definitions.values():
        generated_paths.append(save_asset(definition))

    print("Generated placeholder assets:")
    for path in generated_paths:
        print(f" - {path}")


if __name__ == "__main__":
    main()
