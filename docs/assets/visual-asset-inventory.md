# Visual Asset Inventory – Session 106

## Context
- Derived from `docs/plans/backlog.md` asset tracker and `assets/manifests/act2-crossroads-art.json`.
- Synced with `assets/images/requests.json` on 2025-11-12 during AR-050 inventory pass.
- Status values:
  - `pending-sourcing` – requires locating or generating an asset.
  - `reference-selected` – candidate reference gathered, needs conversion or bespoke art.

## Outstanding Requests

| AR ID | Scope | Request IDs | Notes |
| ----- | ----- | ----------- | ----- |
| AR-001 | Deduction board UI | `image-ar-001-deduction-board-bg`, `image-ar-001-clue-node-pack`, `image-ar-001-evidence-icon-set`, `image-ar-001-ui-button-pack` | Prioritise cohesive neon-noir styling; hover/pressed states to support tactile investigation feel. |
| AR-002 | Evidence placeholders | `image-ar-002-generic-marker`, `image-ar-002-fingerprint`, `image-ar-002-document`, `image-ar-002-neural-extractor`, `image-ar-002-blood-spatter` | Pair each sprite with narrative text variants for tutorial tooltips. |
| AR-003 | Player sprite | `image-ar-003-player-kira-sprite` | Requires 4-direction animations; ensure trench-coat silhouette distinct during stealth/combat transitions. |
| AR-004 | NPC sprites | `image-ar-004-npc-civilian-pack`, `image-ar-004-npc-guard-pack` | Civilian palette must hint at faction allegiance; guards need visor glow to visualize detection state. |
| AR-005 | District tilesets | `image-ar-005-tileset-neon-district`, `image-ar-005-tileset-corporate-spires`, `image-ar-005-tileset-archive-undercity`, `image-ar-005-tileset-zenith-sector` | Tilesets must ship with collision metadata once sourced/generated. |
| AR-007 | Particle/overlay FX | `image-ar-007-particles-rain`, `image-ar-007-particles-neon-glow`, `image-ar-007-particles-memory-fragment`, `image-ar-007-screen-effects-pack` | Optimise alpha usage for Canvas blending; test against 60 FPS threshold. |
| AR-050 | Act 2 Crossroads art bundle | All `image-ar-050-*` entries | Map one-to-one with `act2_crossroads_*` assetIds for the bespoke scene lighting revamp. |

## Sourcing Plan
- Phase 1 (today): Complete inventory (done) and shortlist CC0/CC-BY references via `web_search` starting with AR-050 lighting overlays.
- Phase 2: For requests without suitable references, schedule OpenAI image generation prompts with exact framing notes from `notes` fields.
- Phase 3: Update `assets/manifests/` entries with final asset metadata, citing source links and licenses in `usage`.

## Next Actions
1. Gather candidate imagery for `image-ar-050-crossroads-selection-pad` and `image-ar-050-crossroads-checkpoint-plaza` (highest narrative visibility).
2. Prepare generation brief templates covering art style, palette, and lighting for new assets.
3. Once assets selected, update corresponding `source`, `creator`, `license`, and `status` fields, then document sourcing rationale in session handoff.
