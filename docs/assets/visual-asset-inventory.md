# Visual Asset Inventory – Session 106

## Context
- Derived from `docs/plans/backlog.md` asset tracker and `assets/manifests/act2-crossroads-art.json`.
- Synced with `assets/images/requests.json` on 2025-11-12 during AR-050 inventory pass; refreshed 2025-11-12 Session 111 after packaging prompts and generating new overlays.
- Status values:
  - `ai-generated` – internally generated via GPT-Image tooling; stored under `assets/generated/` with project-only licensing.
  - `pending-sourcing` – requires locating or generating an asset.
  - `reference-selected` – candidate reference gathered, needs conversion or bespoke art.
  - `prompt-packaged` – OpenAI-ready brief packaged into JSON payloads and staged for generation.
  - `derivative-generated` – overlay or processed asset rendered into `assets/overlays/`.
  - `bespoke-scheduled` – **legacy**; replaced by automated `mcp__generate-image__generate_image` runs.
  - `bespoke-in-progress` – **legacy**; do not use (automation handles iteration).
  - `bespoke-in-review` – **legacy**; automation delivers ready-to-use assets.
  - `bespoke-approved` – **legacy**; manifests now flip directly from `ai-generated` to `shipped`.
  - `bespoke-pending` – **legacy**; remove from manifests as automation eliminates vendor queues.
- **Automation Update (2025-10-31)**: All new or outstanding asset work must be executed through `mcp__generate-image__generate_image` or derivative scripts. External vendors, manual review loops, and approval meetings are removed from the pipeline.

## Outstanding Requests

| AR ID | Scope | Request IDs | Notes |
| ----- | ----- | ----------- | ----- |
| AR-001 | Deduction board UI | `image-ar-001-deduction-board-bg`, `image-ar-001-clue-node-pack`, `image-ar-001-evidence-icon-set`, `image-ar-001-ui-button-pack` | Prioritise cohesive neon-noir styling; hover/pressed states to support tactile investigation feel. |
| AR-002 | Evidence placeholders | `image-ar-002-generic-marker`, `image-ar-002-fingerprint`, `image-ar-002-document`, `image-ar-002-neural-extractor`, `image-ar-002-blood-spatter` | Pair each sprite with narrative text variants for tutorial tooltips. |
| AR-003 | Player sprite | `image-ar-003-player-kira-sprite`, `image-ar-003-kira-evasion-pack` | Directional placeholder (`image-ar-003-kira-core-pack`) now powers idle/walk/run; bespoke swap still needed to lock trench-coat silhouette while dash/slide pack covers autosave stress beats. |
| AR-004 | NPC sprites | `image-ar-004-npc-civilian-pack`, `image-ar-004-npc-guard-pack` | Civilian palette must hint at faction allegiance; guards need visor glow to visualize detection state. |
| AR-005 | District tilesets | `image-ar-005-tileset-neon-district`, `image-ar-005-tileset-corporate-spires`, `image-ar-005-tileset-archive-undercity`, `image-ar-005-tileset-zenith-sector` | Tilesets must ship with collision metadata once sourced/generated. |
| AR-007 | Particle/overlay FX | `image-ar-007-particles-rain` (ai-generated), `image-ar-007-particles-neon-glow` (ai-generated), `image-ar-007-particles-memory-fragment` (ai-generated), `image-ar-007-screen-effects-pack` (ai-generated) | Sprite sheets integrated into ParticleEmitterRuntime with detective vision cue emissions; automated Jest harness keeps composite bursts within 60 FPS budgets (Playwright coverage still pending). |
| AR-050 | Act 2 Crossroads art bundle | All `image-ar-050-*` entries | Map one-to-one with `act2_crossroads_*` assetIds for the bespoke scene lighting revamp. Session 172 generated the safehouse floor texture, briefing pad overlay, and branch walkway strip (all ai-generated). |

- Integrated the safehouse floor, briefing pad, and branch walkway derivatives into `assets/overlays/act2-crossroads/` via `node scripts/art/generateOverlayDerivatives.js --filter image-ar-050-crossroads-floor-safehouse,image-ar-050-crossroads-branch-walkway,image-ar-050-crossroads-briefing-pad`, then reran `node scripts/art/previewCrossroadsLighting.js --tolerance=0.03 --out=reports/art/act2-crossroads-lighting-preview.json` to confirm all 12 tracked segments land within tolerance.

## Sourcing Plan
- Phase 1 (today): Complete inventory (done) and shortlist inspirational references via `web_search` starting with AR-050 lighting overlays (for prompt guidance only).
- Phase 2: Execute `mcp__generate-image__generate_image` runs for every outstanding visual request, wiring prompt metadata directly from the `notes` fields.
- Phase 3: Update `assets/manifests/` entries with generated asset metadata, background selections, and automation provenance—no external licensing required.

## Session 162 Updates
- Generated new AR-007 particle sprite sheets (rain, neon glow, memory fragment) via GPT-Image-1 and staged them under `assets/generated/ar-007/` with transparent backgrounds for additive blending.
- Updated `assets/images/requests.json` statuses for the new sheets to `ai-generated`, capturing generation metadata and licensing notes.
- Flagged `image-ar-007-screen-effects-pack` as the remaining pending-sourcing deliverable for the AR-007 bundle; future work should focus on that overlay set and runtime validation of the new particles.

## Session 166 Updates
- Re-routed `image-ar-003-kira-evasion-pack` through `mcp__generate-image__generate_image`, saving the transparent dash/slide sprite sheet to `assets/generated/images/ar-003/image-ar-003-kira-evasion-pack.png` and updating manifests to `ai-generated` with GPT-Image-1 provenance so autosave stress encounters can consume the new frames immediately.
- Session 167 wired the dash/slide pack into the new AnimatedSprite/PlayerAnimation runtime layer so player dash/slide states render from `image-ar-003-kira-evasion-pack` with Jest validation.
- Cleared RenderOps approval queue job `c2d9170c-9d13-4e3b-941c-e1ee89d8bb68` by importing narrative-approved feedback (`reports/art/renderops-feedback.json`) and updating `reports/telemetry/renderops-approvals/...` to mark safehouse floor and branch walkway segments as `approved`.

## Session 172 Updates
- Generated `image-ar-007-screen-effects-pack` via GPT-Image-1 (three stacked overlay frames: flash, scanline, glitch) and marked the manifest entry `ai-generated` with transparent overlay metadata.
- Produced `image-ar-050-crossroads-floor-safehouse`, `image-ar-050-crossroads-briefing-pad`, and `image-ar-050-crossroads-branch-walkway` through GPT-Image-1, updated their manifest entries to `ai-generated`, and stored the assets under `assets/generated/ar-050/` for lighting pipeline integration.

## Session 175 Updates
- Wired the AR-007 rain/neon/memory sprite sheets into `src/game/fx/ParticleEmitterRuntime.js`, refreshed detective vision cue emissions (`src/game/ui/DetectiveVisionOverlay.js`), and broadened Jest coverage (`tests/game/fx/ParticleEmitterRuntime.test.js`, `tests/game/ui/DetectiveVisionOverlay.test.js`) to lock in particle budgets ahead of Playwright coverage.
- Reran `scripts/art/packageRenderOpsLighting.js`, generating `reports/art/renderops-packets/act2-crossroads-2025-10-31T16-03-38-011Z` (ZIP + manifests) and staging a ready_for_ack queue entry under `reports/telemetry/renderops-approvals/` so Crossroads lighting packets stay aligned with the refreshed overlays.

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
- Session 176 generated a narrative-facing luminance snapshot via `npm run art:export-crossroads-luminance`, publishing Markdown + JSON outputs to `reports/art/luminance-snapshots/act2-crossroads/` so the narrative team can spot drift before approving the refreshed briefing-pad luminance.

## Session 115 Updates
- Generated neon-noir placeholder atlas set for AR-001 through AR-005 via `python scripts/art/generate_ar_placeholders.py`; outputs reside in `assets/generated/ar-placeholders/` and cover deduction board UI, evidence icons, player/NPC sprites, and the four district tilesets.
- Advanced `assets/images/requests.json` entries to `placeholder-generated`, recording Session 115 provenance so gameplay/UI teams can iterate with internally licensed placeholders while awaiting bespoke art or AI reruns.

## Session 116 Updates
- Built `scripts/art/packageRenderOpsLighting.js` + `RenderOpsPacketBuilder` to bundle lighting previews, summary markdown, and actionable metadata into timestamped share-out packets under `reports/art/renderops-packets/`.
- Extended `RenderOpsPacketBuilder` in Session 117 to emit share-ready ZIP archives alongside per-packet delivery manifests (`metadata.json`, `share-manifest.json`, and `<label>-delivery.json`) so RenderOps hand-offs include checksum and bundle details out of the box.
- Added `scripts/art/auditPlaceholderAssets.js` and companion `PlaceholderAudit` utilities to emit JSON/markdown audits (`reports/art/placeholder-audit.*`) highlighting all `placeholder-generated` manifest entries and whether source atlases exist.
- Session 117 augments the placeholder audit with a prioritized replacement plan (`reports/art/placeholder-replacement-plan.json|md`) that ranks AR-001 – AR-005 bespoke work based on missing files, asset age, and manifest notes.
- New npm aliases `art:package-renderops` and `art:audit-placeholders` keep RenderOps delivery and bespoke replacement planning on a repeatable cadence with test coverage in place.

## Session 118 Updates
- Introduced `scripts/art/planPlaceholderReplacements.js` to translate the replacement plan into four weeks of focused art sprints (default outputs: `reports/art/placeholder-replacement-schedule.json|md`) with five assets scheduled per week starting 2025-11-03.
- Week 1 covers AR-001 deduction UI plus the neon district tileset; Weeks 2–4 rotate through evidence props, NPC packs, and remaining district tilesets so narrative beats keep pace with art production.
- 2025-11-13: Week 1 sprint kicked off — AR-001, AR-002, and AR-005 entries now flagged `bespoke-scheduled` with briefs dispatched to art.
- Assign owners straight from the schedule and update `assets/images/requests.json` notes when each bespoke asset is approved to keep the plan and manifest in sync.
- Added `scripts/art/stageRenderOpsDelivery.js` to mirror the latest packet (ZIP, manifests, summaries) into `deliveries/renderops/<label>/<timestamp>/` complete with staging-manifest and handoff README for immediate share-out.

## Session 121 Updates
- Automated bespoke sprint tracking via `scripts/art/trackBespokeDeliverables.js`; run `npm run art:track-bespoke -- --week=1` to merge `reports/art/bespoke-week1-tracking.json` into `assets/images/requests.json` and emit `reports/art/week1-bespoke-progress.json`.
- Week 1 deliverable snapshot:
  - `image-ar-001-deduction-board-bg` → `bespoke-approved` (Helena Voss, Internal Commission – Full Rights). Final PSD mirrored at `assets/bespoke/week1/image-ar-001-deduction-board-bg.png`.
  - `image-ar-001-evidence-icon-set` → `bespoke-approved` (Helena Voss, Internal Commission – UI Iconography Pack) with monochrome + color exports.
  - `image-ar-001-clue-node-pack` → `bespoke-approved` (glow loop revision delivered 2025-11-16; Art Lead M. Cortez sign-off, full UI rights).
  - `image-ar-002-generic-marker` → `bespoke-pending` (awaiting vendor thumbnails; ETA 2025-11-16).
  - `image-ar-005-tileset-neon-district` → `bespoke-in-review` (Axiom Studio reflection polish received 2025-11-15; signage glow under narrative review, Internal Commission – Environment Tiles).
- Approved entries now record commission licenses, reviewers, and approval timestamps; see new `statusHistory`, `bespokeApprovedOn`, and `bespokeNotes` fields in the manifest for compliance/audit trails.
- Added `assets/bespoke/week1/README.md` to log vendor hand-offs and repository-visible exports while original source files remain in the studio vault.

## Session 124 Updates
- Narratives flagged neon signage approvals via Session 124 summary; pending follow-up for act-wide lighting pass.

## Session 125 Updates
- Narrative signed off on `image-ar-005-tileset-neon-district`, advancing the manifest entry to `bespoke-approved` with updated licensing notes and neon signage cues locked for Act 2 branch gating. Neon glow approval reports are now bundled automatically with RenderOps packets via `scripts/art/packageRenderOpsLighting.js` attachments support.
- Authored `scripts/art/summarizeNeonGlowApprovals.js` and npm alias `art:summarize-neon-glow` to consolidate every neon signage/glow asset (AR-050 overlays, Memory Parlor lighting, neon district tileset) into `reports/art/neon-glow-approval-status.(json|md)`, highlighting pending narrative/RenderOps approvals and latest status contexts ahead of the glow pass sign-off push.
- The markdown summary surfaces the lone Week 1 bespoke item (`image-ar-005-tileset-neon-district`) still awaiting narrative approval and inventories all derivative overlays, keeping RenderOps and narrative leads aligned on outstanding glow validations.

## Session 126 Updates
- Introduced `scripts/art/importRenderOpsFeedback.js` to ingest structured RenderOps review payloads and append them to a canonical feedback log. Run `node scripts/art/importRenderOpsFeedback.js --input <feedback.json>` after each packet review to normalize segment notes, requested revisions, and reviewer metadata.
- New artifacts `reports/art/renderops-feedback.json` and `reports/art/renderops-feedback.md` capture the aggregated history, per-segment status, and reviewer notes so art, lighting, and narrative can coordinate revisions without parsing email threads or ad-hoc docs.
- When feedback lands, import it, regenerate the RenderOps packet if required (`npm run art:package-renderops`), and link the feedback entry in `assets/images/requests.json` notes for any segments that shift back to `needs_revision`.

## Session 165 Updates
- Shipping `scripts/audio/generateAr008AdaptiveStems.js` procedurally renders the AR-008 downtown tension/combat stems into `assets/generated/audio/ar-008/`, records loop metadata in `assets/generated/audio/ar-008/metadata.json`, and auto-updates `assets/music/requests.json` so adaptive music sourcing stays automation-only with seeded checksums.
- Enhancing `scripts/art/packageRenderOpsLighting.js` now pushes every packet into the telemetry approval queue (`reports/telemetry/renderops-approvals/`) via `RenderOpsApprovalQueue`, mirroring actionable segment metadata so RenderOps approvals proceed without manual meetings or ad-hoc status pings.

## Session 168 Updates
- Generated a directional placeholder core sheet for Kira (`assets/generated/images/ar-003/image-ar-003-kira-core-pack.png`) via scripted automation (GPT concept archived at `image-ar-003-kira-core-pack-source.png`), updating manifests and runtime locomotion loops to cover idle/walk/run across all facings.
- `scripts/art/monitorRenderOpsApprovals.js` now aggregates job status, queue totals, and actionable segment counts into `reports/art/renderops-approval-summary.json`; add `--markdown` to emit a partner summary at `reports/art/renderops-approval-summary.md` for quick ingest into art reviews, and run with `--verbose` for aggregated dashboards or `--quiet` inside cron sweeps.

## Session 169 Updates
- Authored `scripts/art/capturePlayerLocomotionFrames.js` plus npm hook `npm run art:capture-locomotion` to export Kira's idle/walk/run facings into `reports/art/player-locomotion-reference/`, producing both per-animation crops and facing contact sheets with a JSON manifest for documentation crosslinking.
- Captured the latest placeholder-driven reference set (`reports/art/player-locomotion-reference/manifest.json`) so autosave overlay authors and bespoke swap reviews can reference exact frames until the final `image-ar-003-player-kira-sprite` sheet lands.

## Next Actions
1. Distribute the latest RenderOps packet (`npm run art:package-renderops` then `npm run art:stage-renderops`) and attach the staged ZIP (`deliveries/renderops/.../*.zip`) plus `*-delivery.json` manifest when sharing with RenderOps; log feedback on actionable segments and regenerate after art tweaks.
2. Follow `reports/art/placeholder-replacement-schedule.md` to drive weekly bespoke assignments and annotate `assets/images/requests.json` with source/licensing updates upon completion.
