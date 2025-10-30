# Visual Asset Inventory – Session 106

## Context
- Derived from `docs/plans/backlog.md` asset tracker and `assets/manifests/act2-crossroads-art.json`.
- Synced with `assets/images/requests.json` on 2025-11-12 during AR-050 inventory pass; refreshed 2025-11-12 Session 111 after packaging prompts and generating new overlays.
- Status values:
  - `pending-sourcing` – requires locating or generating an asset.
  - `reference-selected` – candidate reference gathered, needs conversion or bespoke art.
  - `prompt-packaged` – OpenAI-ready brief packaged into JSON payloads and staged for generation.
  - `derivative-generated` – overlay or processed asset rendered into `assets/overlays/`.

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

## Session 107 Updates
- `image-ar-050-crossroads-selection-conduit` now points to Tanozzo’s **High Energy** plasma arc photography (CC BY 2.0, Flickr). The radial beams provide a strong base for recoloring into the Crossroads conduit glow.
- `image-ar-050-crossroads-checkpoint-glow` references MTAPhotos’ **Reopening of 167 St on the B, D lines** (CC BY 2.0, Flickr), giving us layered strip-light geometry to adapt into the guarded rail shimmer.
- `image-ar-050-crossroads-safehouse-arc` leverages NASA Goddard’s **Alien aurorae spotted on Uranus by Hubble** (CC BY 2.0, Flickr) for translucent aurora strands that map onto the safehouse shielding arc.

## Session 108 Updates
- `image-ar-050-crossroads-selection-pad` now uses The Fun Chronicles’ **30 A Helipad Near The Top (4) - East View** (CC0 1.0, Flickr) to capture concentric landing guidance as an interactive glass pad motif.
- `image-ar-050-crossroads-checkpoint-plaza` references Nestor’s Blurrylife **Dongdaemun Design Plaza & Park** (CC BY 2.0, Flickr) for illuminated plaza ribbing that matches the militarised guard staging brief.
- `image-ar-050-crossroads-boundary-west` adopts Jeremy Levine Design’s **Solar Energy System** panel grid (CC BY 2.0, Flickr) to ground the energy barrier modules.
- `image-ar-050-crossroads-boundary-east` taps spinster cardigan’s **glass brick wall** (CC BY 2.0, Flickr) for fractured translucent signage inserts.
- `image-ar-050-crossroads-boundary-north` selects *rboed*’s **Windows** lattice (CC BY 2.0, Flickr) to frame the walkway ingress structure.
- `image-ar-050-crossroads-boundary-south` incorporates Mr Thinktank’s **perforated steel panel in stairway** (CC BY 2.0, Flickr) for armored venting silhouettes along the southern barricade.

## Session 109 Updates
- `image-ar-050-crossroads-column-safehouse-left` now references David Paul Ohmer’s **Rome - Vatican City/Saint Peter's Basilica "Shower of Light on Woman"** (CC BY 2.0, Flickr via Openverse 7fa5629a-8c5f-4bd2-a247-fe6517d17409) for a diffused cyan-ready beam plate hugging classical stone.
- `image-ar-050-crossroads-column-safehouse-right` leverages Fan.D & Dav.C Photography’s **Infinity** stage capture (CC BY 2.0, Flickr via Openverse 2c443bc9-e3ab-4fff-ba46-a52ef76b7457) to mirror tight dual spotlights for the safehouse ingress pillars.
- `image-ar-050-crossroads-column-checkpoint-north` uses Joyce Andes’ **Proudly Beaming and Standing Tall** (CC BY 2.0, Flickr via Openverse d373ad62-282c-455f-b85a-2e58b2f0fa9f) as the high-intensity checkpoint reference plate.
- `image-ar-050-crossroads-column-checkpoint-south` adopts **NYC World Trade Center Tribute in Light 2012** by www.GlynLowe.com (CC BY 2.0, Wikimedia via Openverse 7baeb847-c6de-4d96-983a-75a130697e06) to keep the southern choke-point glow consistent with the north beam profile.

## Session 110 Updates
- Authored generation briefs for AR-001 through AR-005 in `docs/assets/generation-prompts-ar-001-005.md`; linked each manifest entry to the prompts to unblock OpenAI request drafting.
- Prompt drafting keeps statuses at `pending-sourcing` until final assets are generated, but adds traceability for design intent and negative prompt guidance.
- Patched `overlayPipeline` Jimp integration to support height-only resizing and asynchronous writes, enabling `npm run art:generate-crossroads-overlays` to emit derivatives directly to `assets/overlays/act2-crossroads/`.
- Generated safehouse and checkpoint column overlays (420x1060, 380x1180, 360x1280, 360x1220) and marked the corresponding manifest entries as `derivative-generated`.

### Overlay Processing Pipeline
- Added `scripts/art/generateOverlayDerivatives.js` to convert CC0/CC-BY references into transparent overlays using configurable operations (crop, tint, alpha-from-luma).
- Column overlays are defined in `assets/images/overlay-derivatives-act2-crossroads.json`; the script downloads the Openverse source plates and renders processed PNGs to `assets/overlays/act2-crossroads/`.
- Run `npm run art:generate-crossroads-overlays` (add `--dry-run` to inspect dimensions only). Configuration defaults cover cyan safehouse beams and amber checkpoint beams; tweak per-entry overrides when art direction shifts.

## Session 111 Updates
- Implemented `scripts/art/exportGenerationPrompts.js` to package AR-001 – AR-005 briefs into `assets/images/generation-payloads/ar-001-005.json`, automatically marking manifest entries as `prompt-packaged` with timestamp metadata.
- Extended `assets/images/overlay-derivatives-act2-crossroads.json` to cover selection pad, checkpoint plaza, safehouse arc, selection conduit, checkpoint glow, and all boundary wall references; running `npm run art:generate-crossroads-overlays` now emits 13 overlays into `assets/overlays/act2-crossroads/`.
- Manifest entries for the new overlays are updated to `derivative-generated` with processing provenance (`Session 111`) for traceability.
- Added telemetry acknowledgement tooling (`scripts/telemetry/outboxAcknowledgement.js`) so art/analytics leads can track ingestion status alongside asset packages.

## Session 112 Updates
- Authored `scripts/art/analyzeCrossroadsOverlays.js` to profile luma/alpha density for each derived PNG; the stats drive tint/floor recalibration before re-rendering.
- Retuned `assets/images/overlay-derivatives-act2-crossroads.json` (alpha floors, tint ratios, inverted boundary ceilings) and regenerated the full overlay set so averages now land between 0.12–0.17 (columns/conduits) and ~0.75 for boundary shields.
- Synced `src/game/data/sceneArt/Act2CrossroadsArtConfig.js` with calibrated alpha targets, added `overlayAverageAlpha` metadata for LightingPreset validation, and expanded boundary entries so all four walls load bespoke derivatives by default.

## Session 113 Updates
- Built `scripts/art/previewCrossroadsLighting.js` on top of the new `Act2CrossroadsLightingPreviewer` utility; generated `reports/art/act2-crossroads-lighting-preview.json` to surface segments drifting below preset luminance targets before RenderOps sweeps.
- Executed the AR-001–AR-005 prompt queue via `scripts/art/queueGenerationRequests.js`, emitting `assets/images/generation-queue/2025-10-30T10-28-46-627Z-ar-001-ar-002-ar-003-ar-004-ar-005.jsonl` so art leads can trigger OpenAI batches in a single hand-off.
- Advanced all AR-001–AR-005 manifest entries in `assets/images/requests.json` to `generation-queued`, stamping the queue file path, timestamp, and provisional `AI-generated (review pending)` licensing notes pending final approvals.

## Session 114 Updates
- Recalibrated the Act 2 Crossroads lighting overlays: raised alpha floors for the selection conduit, checkpoint glow, and all column beams, then regenerated the derivatives so average normalized alpha now lands between 0.67–0.78 for the affected assets.
- Updated `Act2CrossroadsArtConfig` colours and alpha weights to match the brighter overlays (conduit now uses warm amber `#ffd27a`, checkpoint columns adopt gold-tinted washes, safehouse columns shift to luminous cyan) and recorded the new `overlayAverageAlpha` metadata for the preview tooling.
- Reran `scripts/art/previewCrossroadsLighting.js`, producing an updated report where all evaluable segments pass the preset thresholds (9 “ok”, 2 “skipped”), clearing the previous under-luminance warnings prior to RenderOps sign-off.

## Session 115 Updates
- Generated neon-noir placeholder atlas set for AR-001 through AR-005 via `python scripts/art/generate_ar_placeholders.py`; outputs reside in `assets/generated/ar-placeholders/` and cover deduction board UI, evidence icons, player/NPC sprites, and the four district tilesets.
- Advanced `assets/images/requests.json` entries to `placeholder-generated`, recording Session 115 provenance so gameplay/UI teams can iterate with internally licensed placeholders while awaiting bespoke art or AI reruns.

## Session 116 Updates
- Built `scripts/art/packageRenderOpsLighting.js` + `RenderOpsPacketBuilder` to bundle lighting previews, summary markdown, and actionable metadata into timestamped share-out packets under `reports/art/renderops-packets/`.
- Added `scripts/art/auditPlaceholderAssets.js` and companion `PlaceholderAudit` utilities to emit JSON/markdown audits (`reports/art/placeholder-audit.*`) highlighting all `placeholder-generated` manifest entries and whether source atlases exist.
- New npm aliases `art:package-renderops` and `art:audit-placeholders` keep RenderOps delivery and bespoke replacement planning on a repeatable cadence with test coverage in place.

## Next Actions
1. Distribute the latest RenderOps packet (`npm run art:package-renderops`) to RenderOps, log follow-up feedback for segments flagged as actionable, and regenerate after any art tweaks.
2. Use `reports/art/placeholder-audit.md` to prioritise bespoke replacements for AR-001 – AR-005, updating `assets/images/requests.json` with final licensing once art is approved.
