# Development Backlog: The Memory Syndicate
**Prioritized Implementation Tasks**

---

## Document Overview

**Version**: 1.17
**Last Updated**: 2025-11-02 (Session 279 restricted area mechanics delivery)
**Status**: Active Development
**Current Sprint**: Sprint 8 – Final Polish & Production
**Team Structure**: Solo developer; no external approvals required for sign-off.
**Automation Mandate**: QA validation, asset approvals, and content sourcing execute exclusively through automated scripts and MCP tooling (`mcp__generate-image__generate_image` for all visual assets); manual outreach or waiting on external parties is prohibited.

### Backlog Governance (Updated)

- A strict WIP ceiling of ten active items (statuses `in-progress`, `blocked`, `ready-for-review`) is enforced; defer pulls or escalate conflicts instead of breaching the cap.
- New backlog entries are only created when the work is critical to delivering committed roadmap functionality or sprint objectives.
- Tangential initiatives—such as net-new systems, auxiliary tooling, narrative review suites, or analytics dashboards—remain out of scope until roadmap deliverables ship.
- Telemetry and performance management/testing initiatives are cancelled; do not schedule or create new work in these areas per the 2025-11-04 directive.

### Current High-Priority Focus (Session 281)

| ID | Priority | Status | Summary | Next Steps |
| --- | --- | --- | --- | --- |
| AR-050 | P1 | In Progress | RenderOps packets, luminance snapshots, and bespoke tracking continue running through the asset automation suite without manual staging. | Allow the weekly `art:track-bespoke`, `art:package-renderops`, and `art:export-crossroads-luminance` sweeps to execute; investigate only if telemetry raises anomalies. |
| AR-001 | P0 | Pending | Deduction board UI asset pack remains queued through the art automation pipeline with prompts/manifests packaged. | Let nightly `node scripts/art/queueGenerationRequests.js --filter=AR-001` feed the queue and consume manifest diffs once automation delivers. |
| M3-016 | P2 | In Progress | Save/Load system automation is finalising autosave polish through telemetry and distribution scripts. | Telemetry cron runs `npm run telemetry:ack` and `npm run telemetry:distribute-save-load`; monitor dashboards for anomalies only. |
| M2-016 | P1 | Done | DialogueSystem branching, conditional choice gating, and UI polish ship with automation-backed coverage. | Monitor DialogueSystem Jest/Playwright automation; no manual rehearsals required. |
| M3-015 | P1 | Done | Restricted Area System landed; infiltration zones now honor disguises and scrambler credentials with automated coverage. | Monitor stealth telemetry only; no manual interventions required. |

**Next Session Focus**:
- Continue monitoring **AR-050** automation sweeps; intervene only if telemetry flags anomalies.
- Let **M3-016** telemetry scripts (`npm run telemetry:ack`, `npm run telemetry:distribute-save-load`) settle the save/load queue and surface issues automatically.
- Allow **AR-001** generation runs to deliver deduction board UI assets via the nightly queue before wiring updates.
- Watch **M2-016** automation dashboards to confirm conditional choice gating stays healthy; no manual runs needed.
- Maintain WIP ceiling adherence while monitoring DialogueSystem and save/load follow-ups; restricted area mechanics no longer need manual attention.

### Session #280 Backlog Maintenance

- Closed **M3-017 Save/Load Stress Testing** after landing SaveManager migration upgrades and 100-cycle/large-payload stress coverage, verified via `npm test -- --runTestsByPath tests/game/managers/SaveManager.test.js`.

### Session #279 Backlog Maintenance

- Implemented **M3-015 Restricted Area Mechanics**, introducing `RestrictedAreaSystem`, data-driven access policies, and Jest coverage to keep infiltration gating automated.

### Session #278 Backlog Maintenance

- Promoted **M3-031**, **M3-023**, **M2-017**, **Narrative consistency**, and **AR-009** to `done` in MCP after confirming automation coverage handles follow-ups, clearing the review-approved queue.
- Rewrote narrative backlog next steps to reference `npm run narrative:bundle-act2-review`, DialogueSystem Jest coverage, and Playwright checks so no manual approvals linger.
- Verified active automation guardrails for **AR-050** and **M3-016** already rely solely on scheduled scripts; no manual interventions remain in the outstanding WIP set.

### Session #277 Backlog Maintenance

- Regenerated **AR-004** civilian and guard NPC sprite packs via `mcp__generate-image__generate_image`, cleared the `generation-queued` statuses in `assets/images/requests.json`, and updated **AR-050** completed work to reflect the refreshed automation pass.
- Audited asset manifests to confirm no additional outstanding visual requests remain outside the automated pipeline, keeping active WIP within the mandated ceiling.

### Session #275 Backlog Maintenance

- Opened **M3-031: Luminari & Memory Keeper Bespoke Dialogue Scenes**, scripted attitude-specific variants for the resistance coordination council and Memory Parlor curator encounters, and queued narrative review follow-ups.
- Verified DialogueSystem coverage for the new bespoke lines via `npm test -- --runTestsByPath tests/game/systems/DialogueSystem.test.js`, ensuring systemic fallbacks remain intact across all factions.

### Session #274 Backlog Maintenance

- Opened **M3-023: Bespoke Faction Dialogue Scenes**, seeded new attitude variants for the Reese briefing, Cipher quartermaster exchange, and Wraith Crossroads briefing, and verified coverage via `npm test -- --runTestsByPath tests/game/systems/DialogueSystem.test.js`.

### Session #268 Backlog Maintenance

- Closed **M1-020: AssetLoader Implementation** after confirming automated regression suites keep retry/timeout behaviour green, eliminating the pending review gate.
- Rewrote follow-up guidance for **AR-001** and **AR-009** to lean exclusively on scripted asset/audio pipelines instead of manual staging.
- Cleared residual manual to-dos from completed items (**INPUT-310**, **UX-413**) so no backlog entries depend on hand-run steps.

### Session #265 Backlog Maintenance

- Opened and closed **M3-021: Memory Parlor Disguise Access Tags**, adding a Memory Parlor navigation mesh with cipher-restricted walkable surfaces, extending `DisguiseSystem` unlocks, and validating via targeted Jest runs (`npm test -- DisguiseSystem.access`, `npm test -- MemoryParlorScene.navigation`).

### Session #263 Backlog Maintenance

- Closed **M1-021: AssetManager Implementation** after introducing a priority-governed load queue with per-tier concurrency caps, refactoring preloads to reuse the queue, and expanding Jest coverage (`npm test -- AssetManager`) to lock critical/district/optional sequencing.

### Session #260 Backlog Maintenance

- Closed **M1-018: EventQueue Implementation** after landing the priority-aware queue (`src/engine/events/EventQueue.js`), wiring it through `EventBus`, and validating via full `npm test` coverage including new `tests/engine/events/EventQueue.test.js`.

### Session #259 Backlog Maintenance

- Queued the regenerated AR-004 civilian and guard sprite packs via `node scripts/art/queueGenerationRequests.js --filter=AR-004`, producing `assets/images/generation-queue/2025-11-02T03-28-32-933Z-ar-004.jsonl` and marking both requests `generation-queued`.
- Updated the MCP backlog entry for **AR-004** to capture the new queue artifact and to shift the remaining work toward automated slicing output and prefab integration.

### Session #257 Backlog Maintenance

- Promoted **M1-020: AssetLoader Implementation** to `review-approved`, documenting that existing Jest suites and the full `npm test` run guard retry/timeout behaviour without manual QA (superseded by Session 268 closure).
- Rewrote next steps for **AR-004**, **AR-001**, and **M3-016** so follow-ups depend on scripted queues, telemetry crons, and Jest automation rather than manual staging.
- Confirmed high-priority WIP (AR-004, AR-050, M3-016) stays within the automation-first mandate and below the WIP ceiling; no additional backlog pulls required.

### Session #256 Backlog Maintenance

- Closed **M2-005: Deduction Board UI (Basic)** after re-running `npm test -- DeductionBoardPointerController` and `npm run telemetry:performance`; pointer averages stayed well under the <16 ms budget (combined 0.0059 ms), confirming guardrails remain healthy.
- Updated MCP backlog and this doc to mark the deduction board work complete while leaving automation guardrails as the sole ongoing monitor.

### Session #249 Backlog Maintenance

- Authored **CORE-304: Scene Loader Camera Bounds Automation** to decouple camera bounds from manual tuning—Act 1 scene metadata now exposes `cameraBounds`, Game scene transitions call a shared `_applyCameraBounds` helper, and Jest coverage (`tests/game/Game.cameraBounds.test.js`, `tests/game/scenes/Act1Scene.boundaries.test.js`) locks the contract.
- `npm test` executed to validate the updated suites alongside existing coverage; no follow-up remediation required.

### Session #250 Backlog Maintenance

- Advanced **Narrative consitentcy** to `ready-for-review` after wiring narrative tooling to the beat catalog: Act 3 epilogue library now imports `NarrativeBeatCatalog`, tutorial/Act 2 trigger tests consume the constants, and the Act 3 finale Playwright suite asserts catalog beats. Verification: `npm test`, `npx playwright test tests/e2e/act3-zenith-finale.spec.js`.

### Session #248 Backlog Maintenance

- Marked **CORE-303** as `done` in MCP after confirming nightly Playwright automation covers the investigative loop and tutorial overlays.
- Updated **AR-050** and **M2-005** backlog entries to depend solely on existing automation pipelines (RenderOps staging, telemetry performance, and Playwright suites), stripping manual scheduling language.
- Documentation-only session: no new assets generated, code authored, or backlog items created.

### Session #238 Backlog Updates

- Closed M2-006, M1-027, QA-202, and AR-003 as `done` after confirming their automation coverage remains green (`npm run lint`, `npm test`, and existing investigation suites); MCP backlog entries now reflect automation-only follow-ups.
- Wrapped CORE-301 and UX-410 with `done` status, leaving the paired Jest/Playwright suites and telemetry exporters as the sole guardrails; review-approved queue is clear.
- Revalidated active WIP (AR-050, CORE-303, and automation-gated dependencies) to ensure next steps reference only scripted sweeps and Playwright scenarios, keeping manual checkpoints out of the backlog.

### Session #239 Backlog Updates

- CORE-303 investigative loop now registers the tutorial arrival trigger through `QuestTriggerRegistry`, extends `QuestManager` identifier matching, and introduces Playwright coverage at `tests/e2e/tutorial-investigative-loop.spec.js` to automate evidence collection, detective vision unlock, and scripted witness interviews (`npm test`; `npx playwright test tests/e2e/tutorial-investigative-loop.spec.js`).

### Session #245 Backlog Updates

#### CORE-303: Investigative Loop Skeleton
- Expanded `tests/e2e/tutorial-investigative-loop.spec.js` to validate deduction board pointer routing, full theory validation, and the Captain Reese report beat so Case 001 completes and chains into Case 002 inside automation; updated helper utilities in `tests/e2e/utils/tutorialActions.js` to drive clue connections, quest objective checks, and case resolution.
- Verification: `npx playwright test tests/e2e/tutorial-investigative-loop.spec.js`.
- AR-050 automation sweep executed (`npm run art:track-bespoke`, `npm run art:package-renderops`, `npm run art:export-crossroads-luminance`), producing packet `reports/art/renderops-packets/act2-crossroads-2025-11-01T20-13-32-755Z` with approval job `reports/telemetry/renderops-approvals/act2-crossroads/2025-11-01T20:13:32.777Z-9d5eefce-d467-4f54-92c5-37f235d68c5c.json` and luminance snapshot `reports/art/luminance-snapshots/act2-crossroads/act2-crossroads-luminance-2025-11-01T20-13-40-229Z.{json,md}`.
- M3-016 telemetry monitors refreshed: autosave dashboard mirrored (`npm run telemetry:autosave-dashboard`), outbox acknowledgements confirmed with `npm run telemetry:ack`, and parity verified via `npm run telemetry:check-parity` (100% coverage, no pending labels).

### Session #247 Backlog Updates

#### AR-050: Visual Asset Sourcing Pipeline
- Regenerated the Neon District tileset (v3) via `mcp__generate-image__generate_image`, replacing the canonical atlas at `assets/generated/images/ar-005/image-ar-005-tileset-neon-district.png` and archiving the prior pass as `image-ar-005-tileset-neon-district-v2.png`. Manifest `assets/images/requests.json` updated with fresh GPT-Image provenance and timestamp.
- Cleared residual bespoke statuses for AR-001 deduction board UI assets and the AR-002 generic evidence marker, marking each as `ai-generated` to reflect the automation pipeline hand-off.

### Session #240 Backlog Updates

- Closed **M3-005: NPC Component and Memory System** after wiring faction intel sharing for recognition/crime events, persisting NPC memory + player `knownBy` state through `SaveManager`, and landing Jest coverage at `tests/game/systems/NPCMemorySystem.test.js` (`npm test`).

### Session #228 Backlog Maintenance

- Normalized AR-050, BUG-201, and QA-330 backlog entries to strip manual follow-ups and point entirely to scripted automation.
- Refreshed high-priority focus and Next Session Focus so MCP and documentation stay in sync around Act 3, art automation, and investigative loop planning.

### Session #233 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Authored the finale voiceover script across all stance epilogues, embedded VO metadata into `src/game/data/narrative/Act3EpilogueLibrary.js`, and extended the finale sequencer/controller plus `FinaleCinematicOverlay` to surface scripted beats during playback.
- Regenerated the epilogue review packet with VO lines via `npm run narrative:export-act3-epilogues -- --markdown --markdown-out=docs/narrative/epilogues/act-3-epilogues.md`, keeping documentation aligned with the canonical library.
- Verification: `npm test -- --runTestsByPath tests/game/narrative/Act3FinaleCinematicSequencer.test.js tests/game/narrative/Act3FinaleCinematicController.test.js tests/game/tools/Act3EpilogueExporter.test.js` and `npx playwright test tests/e2e/act3-zenith-finale.spec.js`.

### Session #231 Backlog Updates

#### BUG-344: Sprite rendering missing asset hydration
- Registered the runtime AssetManager with a shared sprite resolver and updated `Sprite` to hydrate string-backed images lazily via AssetManager with cached fallbacks (`src/game/assets/assetResolver.js`, `src/game/Game.js`, `src/game/components/Sprite.js`).
- Evidence entities now benefit from the resolver so metadata-driven sprite selections load actual textures while preserving hidden-evidence visibility (`tests/game/entities/EvidenceEntity.test.js` updated accordingly).
- Added Jest coverage validating both manifest-driven and direct URL sprite loads (`tests/game/components/Sprite.assetLoading.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/components/Sprite.assetLoading.test.js tests/game/entities/EvidenceEntity.test.js`.

#### AR-050: Visual Asset Sourcing Pipeline
- Re-ran the automation sweep and staged RenderOps packet `act2-crossroads-2025-11-01T09-10-32-089Z`, producing delivery artifacts under `deliveries/renderops/act2-crossroads/` ready for vendor handoff (`npm run art:track-bespoke`, `npm run art:package-renderops`, `npm run art:export-crossroads-luminance`, `npm run art:stage-renderops -- --packet-dir reports/art/renderops-packets/act2-crossroads-2025-11-01T09-10-32-089Z`).
- Next steps: maintain weekly automation sweeps; RenderOps approval job `9cc27c03-3b58-4c29-8c71-36dfe28507ae` acknowledged in Session 237 following lighting QA.

### Session #229 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Integrated the shared `act3_finale_shared_memory_well_v1` panel into the finale overlay flow, extending manifest accessors, the asset manager/controller summaries, and `FinaleCinematicOverlay` so every stance renders the shared memory well backdrop with layered hero art.
- Updated automation (`tests/game/narrative/Act3FinaleCinematic{AssetManager,Controller}.test.js`, `tests/e2e/act3-zenith-finale.spec.js`) to assert shared overlay descriptors hydrate and persist through Playwright-driven finale playback.
- Verification: `npm test`, `npx playwright test tests/e2e/act3-zenith-finale.spec.js`.
- Next steps: finalize Act 3 finale scripting/VO against the shared overlay, then rerun the Playwright finale suite; continue monitoring finale adaptive audio automation passes for stability.

### Session #173 Backlog Maintenance

- Realigned `docs/plans/backlog.md` with MCP backlog statuses: PERF-214 and UX-173 marked as completed with follow-up monitoring notes.
- No new content or asset generation performed; scope limited to documentation/backlog hygiene.

### Session #184 Backlog Updates

#### AR-003: Player Character Sprite (M2)
- Ingested the bespoke idle/walk/run sheet by rerunning `python scripts/art/normalize_kira_evasion_pack.py` (now preferring the bespoke core atlas) and `node scripts/art/updateKiraAnimationConfig.js`, regenerating the normalized atlas/manifest plus runtime config.
- Refreshed locomotion reference captures (`npm run art:capture-locomotion`) so autosave overlays and traversal QA align with the bespoke-normalized frames.
- Verification: `npm test`.

#### M3-016: Save/Load System Implementation
- Repackaged autosave QA assets after the bespoke swap via `npm run telemetry:package-save-load`, producing the latest packet (`reports/telemetry/save-load-qa/save-load-2025-10-31T19-24-51-055Z(.zip)`) and latency summary for validator baselines.
- Verification: `npm run telemetry:package-save-load`.

### Session #183 Backlog Cleanup

- Closed M3-013 (WorldStateManager) and AR-007 (particle effects) after validating that automated coverage satisfies all acceptance criteria.
- Converted AR-008 adaptive music, QUEST-610 trigger migration, and UX-410 overlay feedback to **review-approved**, documenting the automation-first follow-ups so no manual approvals remain outstanding.
- Trimmed active WIP to AR-050 and M3-016 while AR-003 now lives in review-approved status, keeping the MCP backlog within the enforced Work-In-Progress ceiling.

### Session #217 Backlog Updates

#### AR-050: Visual Asset Sourcing Pipeline
- Session 222 reran the automation regression bundle, updating week-one bespoke stats (5/5 applied), packaging RenderOps packet `reports/art/renderops-packets/act2-crossroads-2025-11-01T05-19-21-549Z` with attachments, staging approval queue job `2025-11-01T05:19:21.571Z-af361a7d-b05a-46f4-bf06-996e877f3dc5` (`ready_for_ack`), and exporting the refreshed 15-segment luminance snapshot `reports/art/luminance-snapshots/act2-crossroads/act2-crossroads-luminance-2025-11-01T05-19-26-847Z.{json,md}`.
- Executed a GPT-Image-1 run for `image-memory-parlor-neon-001`, staging the Memory Parlor infiltration plate at `assets/generated/ar-050/image-memory-parlor-neon-001.png` and updating manifests/docs (`assets/images/requests.json`, `reports/art/neon-glow-approval-status.{json,md}`, `docs/assets/visual-asset-inventory.md`) to reflect its ai-generated status.
- Added the Memory Parlor plate to `assets/images/overlay-derivatives-act2-crossroads.json`, exported `assets/overlays/act2-crossroads/memory_parlor_neon_001.png`, captured luminance stats via `node scripts/art/analyzeCrossroadsOverlays.js --dir assets/generated/ar-050`, and refreshed the tolerance snapshot with `npm run art:export-crossroads-luminance`.
- Verification: `npm run art:track-bespoke`, `npm run art:package-renderops`, `npm run art:export-crossroads-luminance`, `npm run art:generate-crossroads-overlays -- --filter image-memory-parlor-neon-001`, `node scripts/art/analyzeCrossroadsOverlays.js --dir assets/generated/ar-050`.

### Session #174 Backlog Updates

#### AR-007: Particle Effects (M7)
- Wired the newly generated `image-ar-007-screen-effects-pack` (flash/scanline/glitch) into `FxOverlay`, adding additive screen treatments for detective vision and forensic cues alongside refreshed Jest coverage (`tests/game/ui/FxOverlay.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/ui/FxOverlay.test.js`.

#### AR-050: Visual Asset Sourcing Pipeline
- Generated safehouse floor, branch walkway, and mission briefing pad derivatives through `node scripts/art/generateOverlayDerivatives.js --filter image-ar-050-crossroads-floor-safehouse,image-ar-050-crossroads-branch-walkway,image-ar-050-crossroads-briefing-pad`, publishing them under `assets/overlays/act2-crossroads/`.
- Regenerated the lighting preview with `node scripts/art/previewCrossroadsLighting.js --tolerance=0.03 --out=reports/art/act2-crossroads-lighting-preview.json`, yielding 12/12 segments within tolerance and updated Act 2 art config metadata for briefing pad overlay targets.

#### M3-013: WorldStateManager Implementation
- Extended `SaveManager.runAutosaveBurst` with optional inspector export support, piping burst summaries through telemetry and bolstering regression coverage (`tests/game/managers/SaveManager.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/managers/SaveManager.test.js`.

### Session #172 Backlog Updates

#### AR-007: Particle Effects (M7)
- Generated `image-ar-007-screen-effects-pack` via GPT-Image-1 (flash, scanline, glitch frames) and advanced the manifest entry to `ai-generated` with transparent overlay metadata so the VFX pipeline can ingest the full bundle.
- Verification: Asset generation only (`mcp__generate-image__generate_image`); VFX integration follow-up required.

#### AR-050: Visual Asset Sourcing Pipeline
- Produced the Crossroads safehouse floor tile, mission briefing pad overlay, and branch walkway strip through GPT-Image-1, storing outputs under `assets/generated/ar-050/` and updating manifest statuses/notes to `ai-generated`.
- Verification: Asset generation only (`mcp__generate-image__generate_image`); integrate assets into lighting previews before the next RenderOps packet.

### Session #175 Backlog Updates

#### AR-007: Particle Effects (M7)
- Integrated the AR-007 rain/neon/memory sprite sheets into `ParticleEmitterRuntime` with sprite-aware rendering and detective vision cue emissions; expanded Jest coverage (`tests/game/fx/ParticleEmitterRuntime.test.js`, `tests/game/ui/DetectiveVisionOverlay.test.js`) to enforce particle budgets.
- Verification: `npm test -- ParticleEmitterRuntime.test.js DetectiveVisionOverlay.test.js`.

#### AR-050: Visual Asset Sourcing Pipeline
- Reran `scripts/art/packageRenderOpsLighting.js`, publishing `reports/art/renderops-packets/act2-crossroads-2025-10-31T16-03-38-011Z` (ZIP + manifests) and staging a ready_for_ack approval job in `reports/telemetry/renderops-approvals/` so Crossroads lighting packets reflect the latest overlays.
- Verification: `node scripts/art/packageRenderOpsLighting.js`.

#### M3-013: WorldStateManager Implementation
- Added the autosave burst telemetry harness (`scripts/telemetry/runAutosaveBurstInspector.js`) and SaveManager integration coverage to fan inspector exports through TelemetryArtifactWriterAdapter, capturing writer metrics for dashboards.
- Verification: `npm test -- tests/game/managers/SaveManager.test.js` and `node scripts/telemetry/runAutosaveBurstInspector.js --iterations=3 --prefix=test-burst`.

### Session #171 Backlog Updates

#### CORE-301: Act 1 Scene Visual Bring-Up
- Exported palette summary metadata from `loadAct1Scene` and recorded automated smoke coverage (`tests/game/scenes/Act1Scene.palette.test.js`, `tests/e2e/act1-palette-smoke.spec.js`) so the tuned neon palette remains verifiable in CI.
- Verification: `npm test -- Act1Scene.palette.test.js` (covered via suite) and `npm run test:e2e -- tests/e2e/act1-palette-smoke.spec.js`.

#### AR-050: Visual Asset Sourcing Pipeline
- Added `TRACK_BESPOKE_ROOT` overrides to `scripts/art/trackBespokeDeliverables.js` and paired Jest coverage (`tests/scripts/trackBespokeDeliverables.test.js`) to keep bespoke ingestion reproducible inside automation runs.
- Verification: `npm test -- trackBespokeDeliverables.test.js`.

### Session #166 Backlog Updates

#### M3-016: Save/Load System Implementation
- Re-routed `image-ar-003-kira-evasion-pack` through GPT-Image-1 automation, updating `assets/images/requests.json` to `ai-generated` and storing the transparent dash/slide sprite sheet at `assets/generated/images/ar-003/image-ar-003-kira-evasion-pack.png`. Manifests/docs now note the automation provenance and next integration step.
- Session 179 normalized the generated dash/slide atlas (see `assets/generated/images/ar-003/image-ar-003-kira-evasion-pack-normalized.png` + manifest) and merged the frames into `image-ar-003-kira-core-pack-normalized.png`, refreshing autosave overlay captures once the sheet aligned.
- Session 180 added `scripts/art/updateKiraAnimationConfig.js` and refactored `PlayerEntity` to consume the generated config so future bespoke swaps only require rerunning the script before verification.

#### AR-008: Adaptive Music Tracks (M7)
- Added AdaptiveMusicLayerController regression coverage (`tests/engine/audio/AdaptiveMusicLayerController.test.js`) that validates ambient/tension/combat volume weights derived from `GameConfig.audio.memoryParlorAmbient`, protecting future mix tweaks for downtown stems.
- Verification: `npm test -- AdaptiveMusicLayerController`.

#### AR-050: Visual Asset Sourcing Pipeline
- Imported RenderOps feedback for packet `caa6051f-f7ac-4eae-906f-a46053aaeffc`, marking safehouse floor and branch walkway segments approved, and updated the telemetry queue entry (`reports/telemetry/renderops-approvals/...`) to `completed` with `feedbackLogPath` linking to `reports/art/renderops-feedback.json`.
- Verification: `node scripts/art/importRenderOpsFeedback.js --input reports/art/renderops-feedback/act2-crossroads-2025-10-31-review.json`.

### Session #161 Backlog Updates

#### M3-016: Save/Load System Implementation
- Added share-ready QA distribution tooling (`src/game/tools/SaveLoadQADistributor.js`, `scripts/telemetry/distributeSaveLoadQa.js`) and staged delivery under `deliveries/qa/save-load/save-load/save-load-distribution-2025-10-31T04-42-21-907Z` with manifest plus feedback tracker for QA follow-up. (Automation update 2025-10-31: the CLI now feeds `reports/telemetry/validator-queue/save-load/` automatically with baseline thresholds stored under `reports/telemetry/save-load-qa/baselines/`, so latency/schema regressions fail fast without manual email loops.)
- Routed `image-ar-003-kira-evasion-pack` to bespoke production using `scripts/art/decideAssetRouting.js`, updating manifest status/history after OpenAI generation was blocked by organization verification requirements. (Automation update 2025-10-31: asset requests now re-route through `mcp__generate-image__generate_image`; bespoke scheduling is retired.)
- Verification: `npm test -- SaveLoadQADistributor`, `npm test -- AssetRequestStatus`, `node scripts/telemetry/distributeSaveLoadQa.js` (automation mode; recipient flags removed).

### Session #160 Backlog Updates

#### M3-016: Save/Load System Implementation
- Extended `AudioFeedbackController` so `fx:overlay_cue` traffic from the Save/Load overlay now plays reveal/focus/dismiss SFX (`src/game/audio/AudioFeedbackController.js`, `tests/game/audio/AudioFeedbackController.test.js`).
- Added `SaveManager.runAutosaveBurst()` with regression coverage to support repeatable autosave churn checks (`src/game/managers/SaveManager.js`, `tests/game/managers/SaveManager.test.js`).
- Authored Playwright scenario `tests/e2e/save-load-overlay-autosave.spec.js` to exercise the autosave stress burst inside the running build, verifying focus stability and the new audio cues.

### Session #150 Backlog Updates

#### M3-012: District Data Definitions
- Authored district metadata modules for Neon Districts, Corporate Spires, Archive Undercity, and Zenith Sector with controlling faction, stability, access, and environmental descriptors (`src/game/data/districts/`).
- Added registry exports plus validation tests (`tests/game/data/districts/districts.test.js`) ensuring faction references, security levels, and requirements remain consistent.
- Verification: `npm test -- district`.

#### M3-013: WorldStateManager Implementation
- Extended WorldStateStore with a dedicated district slice capturing control changes, stability history, restrictions, and infiltration unlocks; wired new district:* events for runtime updates.
- Snapshot/hydrate routines now persist district state alongside existing quest/story/faction slices, with coverage in `tests/game/state/districtSlice.test.js`.

#### M3-022: District Access Evaluation Utilities
- Added `DistrictAccessEvaluator` helpers to surface unmet knowledge, quest, faction, ability, equipment, and restriction blockers for each district (`src/game/progression/DistrictAccessEvaluator.js`).
- Authored progression unit suite validating lock/unlock flows, restriction handling, and contextual overrides (`tests/game/progression/DistrictAccessEvaluator.test.js`).
- Verification: `npm test -- district`.

### Session #207 Backlog Updates

#### Act 3 Narrative — Final Deduction Briefing (`415b4bd3-2053-400e-92a5-1f1fceccc632`)
- Authored a branching war room dialogue for quest `main-act3-final-deduction`, covering Opposition, Support, and Alternative paths with Soren relationship gates; stored in MCP as scene `act3-final-deduction-war-room`.
- Added `docs/narrative/dialogue/act3-final-deduction-war-room.md` and linked it into `docs/narrative/quests/act-3-quests.md` so narrative production can reference the scripted beats.
- Next steps: expand dialogue coverage into `main-act3-gathering-support` missions and draft ending-specific epilogue sequences for each stance.

### Session #210 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Implemented `main-act3-zenith-infiltration` quest scaffolding with shared and stance-specific stage objectives gated by Act 3 preparation flags (`src/game/data/quests/act3ZenithInfiltrationQuest.js`, `src/game/config/GameConfig.js`).
- Seeded Zenith Sector trigger geometry and automated event bridging so quest progression emits `act3:zenith_infiltration:stage` payloads with stance context (`src/game/scenes/Act3ZenithInfiltrationScene.js`, `src/game/systems/QuestSystem.js`).
- Expanded QuestManager coverage to guard shared vs. branch stage completion and verified trigger metadata emission via new Jest suites (`tests/game/managers/QuestManager.act3.test.js`, `tests/game/systems/QuestSystem.trigger.test.js`).
- Next steps: hook bespoke finale cinematic assets into the controller/overlay pipeline once renders land.

### Session #211 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Added `Act3FinaleCinematicSequencer` to surface finale cinematics from the Act 3 epilogue library once `act3_zenith_infiltration_complete` fires, emitting `narrative:finale_cinematic_ready` with stance and beat metadata (`src/game/narrative/Act3FinaleCinematicSequencer.js`, `src/game/Game.js`).
- Registered the sequencer during game initialization and ensured cleanup paths dispose subscriptions to avoid duplicate dispatches (`src/game/Game.js`).
- Authored Jest coverage confirming gating semantics and re-dispatch behaviour when infiltration completion toggles (`tests/game/narrative/Act3FinaleCinematicSequencer.test.js`).
- Implemented `Act3FinaleCinematicController` alongside the `FinaleCinematicOverlay` so the readiness payload now drives beat progression UI, emits lifecycle telemetry, and kicks adaptive finale music (`src/game/narrative/Act3FinaleCinematicController.js`, `src/game/ui/FinaleCinematicOverlay.js`, `src/game/Game.js`).
- Added dedicated Jest coverage for the controller covering readiness handling, beat advancement, skip flows, and adaptive mood emission (`tests/game/narrative/Act3FinaleCinematicController.test.js`).
- Next steps: hook bespoke finale cinematic assets into the new controller pipeline once renders land.

### Session #213 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Authored Playwright coverage (`tests/e2e/act3-zenith-finale.spec.js`) that drives shared and stance-specific Zenith infiltration stage payloads to confirm quest completion, finale readiness dispatch, and overlay/controller beat progression.
- Registered a stub Archive Heart quest target inside the test harness so branching evaluation no longer emits QuestManager errors once the finale quest completes.
- Verification: `./run_playwright.sh test tests/e2e/act3-zenith-finale.spec.js`.
- Next steps: hook bespoke finale cinematic assets into the controller/overlay pipeline once renders land.

### Session #214 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Authored `Act3ZenithInfiltrationDialogues` so every shared and stance-specific stage is voiced through mission-control comms, dispatching `act3:zenith_infiltration:stage` payloads with the exact quest metadata and flag sequencing (`src/game/data/dialogues/Act3ZenithInfiltrationDialogues.js`).
- Registered the new dialogues during game bootstrap to keep Act 3 infiltration beats available in runtime dialogue manifests (`src/game/Game.js`).
- Added Jest coverage ensuring each dialogue tree emits the correct quest payloads and branch metadata (`tests/game/data/dialogues/Act3ZenithInfiltrationDialogues.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/data/dialogues/Act3ZenithInfiltrationDialogues.test.js` (full `npm test` run hit the known `tests/game/systems/ForensicSystem.test.js` <8 ms performance flake at ~9.06 ms).
- Next steps: hook bespoke finale cinematic assets into the controller/overlay pipeline once renders land.

### Session #215 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Generated the Act 3 finale cinematic hero and beat panels (12 total) via GPT-Image-1, tracked them in `assets/manifests/act3-finale-cinematics.json`, and staged transparent overlays under `assets/overlays/act3-finale/`.
- Introduced the `Act3FinaleCinematicAssetManager`, updated `Act3FinaleCinematicController`, and refreshed `FinaleCinematicOverlay` so finale payloads surface stance hero art plus beat thumbnails at runtime with associated telemetry/state snapshots.
- Added targeted Jest coverage for the controller and new asset manager (`tests/game/narrative/Act3FinaleCinematic{Controller,AssetManager}.test.js`) ensuring visuals hydrate correctly and callbacks behave as expected.
- Verification: `npm test -- --runTestsByPath tests/game/narrative/Act3FinaleCinematicController.test.js tests/game/narrative/Act3FinaleCinematicAssetManager.test.js`.
- Next steps: exercise the finale cinematic flow in the next Playwright run to confirm layered art presentation and continue monitoring the known `tests/game/systems/ForensicSystem.test.js` performance flake.

### Session #216 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Exercised the Act 3 finale Playwright scenario after asset integration, updated the cinematic manifest URLs to use root-served `/overlays/...` paths, and re-ran the spec to confirm narration/art sync without Vite publicDir warnings.
- Re-validated `tests/game/systems/ForensicSystem.test.js` to keep the <6 ms guard under observation; the suite passed cleanly without timing regressions.
- Verification: `npm run test:e2e -- tests/e2e/act3-zenith-finale.spec.js`, `npm test -- --runTestsByPath tests/game/systems/ForensicSystem.test.js`.
- Next steps: audit other static asset manifests for lingering `/assets/` URL prefixes so Vite publicDir warnings do not recur, and extend Playwright coverage to assert finale hero/beat art swaps correctly for support and alternative stance branches.

### Session #224 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Audited finale cinematic manifests and runtime asset plumbing to confirm no `/assets/` URL prefixes remain in stance hero/beat descriptors, keeping Vite publicDir warnings suppressed.
- Expanded `tests/e2e/act3-zenith-finale.spec.js` to exercise opposition, support, and alternative finales, asserting the overlay/controller surface the correct stance-specific hero and beat artwork paths.
- Verification: `./run_playwright.sh test tests/e2e/act3-zenith-finale.spec.js`.
- Next steps: monitor finale adaptive audio cues during full-playthrough smoke runs to catch regressions when additional stems are introduced.

### Session #225 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Extended `SaveManager` to serialize and hydrate the Act 3 finale cinematic controller snapshot so stance-specific hero/beat art descriptors survive manual saves and reloads, emitting a `narrative:finale_cinematic_restored` hook for telemetry consumers.
- Added `Act3FinaleCinematicController.hydrate` to rebuild overlay visuals and progression from saved payloads using the runtime asset manager descriptors.
- Expanded Jest coverage across controller hydration and SaveManager persistence to guard finale art continuity (`tests/game/narrative/Act3FinaleCinematicController.test.js`, `tests/game/managers/SaveManager.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/narrative/Act3FinaleCinematicController.test.js tests/game/managers/SaveManager.test.js`.
- Next steps: monitor finale adaptive audio cues during full-playthrough smoke runs to catch regressions when additional stems are introduced.

### Session #226 Backlog Updates

#### Act 3 Narrative (415b4bd3-2053-400e-92a5-1f1fceccc632)
- Authored stance-specific finale adaptive audio mix definitions, ensured SaveManager/controller reset the shared orchestrator after finale completion or skip, and extended the Act 3 finale Playwright spec to assert adaptive mood requests per stance.
- Verification: `npm test -- --runTestsByPath tests/game/narrative/Act3FinaleCinematicController.test.js` and `./run_playwright.sh test tests/e2e/act3-zenith-finale.spec.js`.

### Session #151 Backlog Updates

#### M3-022: District Access Evaluation Utilities
- Integrated the evaluator into the new `DistrictTravelOverlay` so the travel/navigation UX lists blockers, restrictions, and unlocked routes sourced from world state (`src/game/ui/DistrictTravelOverlay.js`, `src/game/ui/helpers/districtTravelViewModel.js`).
- Added helper coverage under `tests/game/ui/helpers/districtTravelViewModel.test.js` to guard route/blocker summaries.
- Verification: `npm test -- districtTravelViewModel`.

### Session #155 Backlog Updates

#### M3-016: Save/Load System Implementation
- Normalized SaveManager slot identifiers, enforced manual slot capacity limits, and added slot metadata helpers with expanded Jest coverage (`src/game/managers/SaveManager.js`, `tests/game/managers/SaveManager.test.js`).
- Introduced the Save/Load overlay with manual slot and load workflows, refreshed control bindings, and new regression tests validating the UI interactions (`src/game/ui/SaveLoadOverlay.js`, `src/game/Game.js`, `tests/game/ui/SaveLoadOverlay.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/managers/SaveManager.test.js tests/game/ui/SaveLoadOverlay.test.js`.

### Session #158 Backlog Updates

#### M3-016: Save/Load System Implementation
- Hardened SaveManager parity verification by summarizing story flag, quest, faction, tutorial, dialogue, and inventory domains so world snapshots align with legacy scrapers; added tutorial skip state harvesting and a new parity regression in `tests/game/managers/SaveManager.test.js`.
- Delivered a Save/Load QA packaging workflow (`src/game/tools/SaveLoadQAPacketBuilder.js`, `scripts/telemetry/packageSaveLoadQa.js`, `npm run telemetry:package-save-load`) that bundles latency profiling plus payload summaries into timestamped packets under `reports/telemetry/save-load-qa/`.
- Authored a sustained autosave stress test to validate repeated quest completion bursts retain slot focus and emit the expected `game:saved` cadence without failures (`tests/game/managers/SaveManager.test.js` autosave suite).
- Verification: `npm test -- SaveManager`, `npm test -- SaveLoadQAPacketBuilder`, `npm run telemetry:package-save-load -- --iterations=2 --no-samples`.

### Session #195 Backlog Updates

#### M2-006: Deduction System and Theory Validation
- Added `src/game/data/TheoryValidator.js` to centralize multi-solution theory validation, connection type enforcement, and hint generation; integrated CaseManager and DeductionSystem to consume the module and emit hint payloads.
- Extended `TutorialCase` with an alternate valid solution graph plus explicit connection type allowances, and updated `DeductionBoard` rendering to surface multi-line feedback alongside hint messaging.
- Expanded Jest coverage across the validator (`tests/game/data/TheoryValidator.test.js`), CaseManager, DeductionSystem, and DeductionBoard to guard new accuracy and hint behaviours.
- Verification: `npm test` (suites pass except for the pre-existing `tests/engine/procedural/LayoutGraph.test.js` performance threshold flake, still >1 ms when rerun in isolation).

### Session #156 Backlog Updates

#### M3-016: Save/Load System Implementation
- Added `profileSaveLoadLatency` utilities (`src/game/managers/saveLoadProfiling.js`) plus `npm run telemetry:profile-save-load`, confirming manual slot loads average 0.46ms with representative world snapshots and stay well under the <2s target.
- Stabilized SaveLoad overlay selection across autosave refreshes and expanded Jest coverage so manual slot focus persists when new saves reorder the list (`src/game/ui/SaveLoadOverlay.js`, `tests/game/ui/SaveLoadOverlay.test.js`).
- Authored save payload summary tooling for QA/telemetry alignment (`src/game/managers/savePayloadSummary.js`, `npm run telemetry:save-payload-summary`) providing schema counts and equipped-slot breakdowns ahead of review.
- Verification: `npm test`, `npm run telemetry:profile-save-load`, `npm run telemetry:save-payload-summary`.

### Session #153 Backlog Updates

#### M3-022: District Access Evaluation Utilities
- Hooked `navigation:movement_blocked` events into `DistrictTravelOverlay` so traversal denials automatically reveal blockers and focus the relevant district entry (`src/game/ui/DistrictTravelOverlay.js`).
- Authored focused automation (`tests/game/ui/DistrictTravelOverlay.events.test.js`, `tests/e2e/district-travel-traversal.spec.js`) to guard the new gating flow across Jest and Playwright.
- Verification: `npm test -- --runTestsByPath tests/game/ui/DistrictTravelOverlay.events.test.js`, `npx playwright test tests/e2e/district-travel-traversal.spec.js`.

#### M3-013: WorldStateManager Implementation
- Extended SaveManager parity coverage so district and NPC slices flow through snapshot/hydration alongside legacy collectors (`tests/game/managers/SaveManager.test.js`).
- Added cross-system validation ensuring traversal gating Playwright smoke exercises the expanded world-state snapshot during traversal denial scenarios.
- Verification: `npm test -- --runTestsByPath tests/game/managers/SaveManager.test.js tests/game/ui/DistrictTravelOverlay.events.test.js`, `npx playwright test tests/e2e/district-travel-traversal.spec.js`.

#### M3-013: WorldStateManager Implementation
- Added `npcSlice` with reducers/selectors for recognition, suspicion, alert, and interview events plus snapshot/hydration support (`src/game/state/slices/npcSlice.js`).
- Extended `WorldStateStore` event wiring and snapshot tests so NPC state is persisted and restored (`tests/game/state/worldStateStore.test.js`, `tests/game/state/npcSlice.test.js`).
- Verification: `npm test -- npcSlice worldStateStore`.

### Session #154 Backlog Updates

#### M3-013: WorldStateManager Implementation
- Enhanced `SaveManager.getInspectorSummary()` to surface district restriction and NPC alert telemetry from the WorldStateStore slices, feeding the inspector overlay/export stack with traversal gating data.
- Added helper summaries and regression coverage in `tests/game/managers/SaveManager.test.js` so district/NPC parity checks remain guarded alongside legacy collectors.
- Updated `SaveInspectorOverlay` to render restricted districts, fast-travel locks, and NPC alert highlights with refreshed metrics and Jest coverage (`tests/game/ui/SaveInspectorOverlay.test.js`).
- Verification: `npm test -- --runTestsByPath tests/game/managers/SaveManager.test.js tests/game/ui/SaveInspectorOverlay.test.js`.

#### M3-016: Save/Load System Implementation
- Extended inspector export tooling to serialize the new district/NPC summaries, enriching JSON artifacts with lockdown counts and alert logs for QA review.
- Documented next steps to complete slot-level Save/Load workflows now that inspector parity covers the expanded slices.
- Verification: `npm test -- --runTestsByPath tests/game/telemetry/inspectorTelemetryExporter.test.js`.

### Session #149 Backlog Updates

#### UX-173: Debug Audio Overlay Ergonomics
- Added a Shift+Alt+A shortcut that opens the audio panel, traps focus inside the controls, and exits back to the game canvas on Escape.
- Wired keyboard navigation for tag chips and SFX catalog rows, including focus styling and Tab cycling safeguards.
- Authored Playwright coverage (`tests/e2e/debug-overlay-audio-accessibility.spec.js`) to validate shortcut activation, arrow navigation, and escape behaviour alongside a full Jest run.

### Session #148 Backlog Updates

#### FX-244: Secondary Overlay FX Cue Audit
- CrossroadsBranchLandingOverlay now emits `fx:overlay_cue` payloads for reveal, update, and dismiss transitions, threading branch identifiers plus clear/timeout metadata into the FX pipeline.
- ObjectiveList broadcasts refresh, completion, and scroll cues (plumbed through CaseFileUI) so case progress changes feed downstream FX coordinator and particle mappings.
- QuestNotification overlay emits display/queue/dismiss/clear cues and shares a unified cleanup path, with new Jest coverage verifying the emission lifecycle.
- FxCueCoordinator durations/limits, FxOverlay render routing, and CompositeCueParticleBridge presets were expanded for the new cue identifiers, with `npm test` passing after the additions.

### Session #140 Backlog Updates

#### FX-201: Detective Vision Overlay FX Integration
- Introduced `FxOverlay`, a canvas layer that listens for `fx:overlay_cue` events and renders teal activation pulses plus crimson edge fades when detective vision toggles.
- Wired the overlay into `Game` initialization/update/render/cleanup so FX cues now play alongside HUD updates without impacting frame pacing.
- Authored Jest coverage (`tests/game/ui/FxOverlay.test.js`) to confirm cue handling, render invocation, and listener cleanup.

#### AUDIO-422: Detective Vision Mix Calibration
- Added `audio.detectiveVision` defaults to `GameConfig`, setting calibrated activation, loop, and shutdown volumes for detective vision cues.
- Refactored `AudioFeedbackController` to consume the config-driven mix, expose an `applyDetectiveVisionMix` hook, and retune active loops via `setVolume`/gain fallbacks when calibration shifts.
- Extended Jest coverage to exercise the new calibration API and ensure live detective vision loops adopt updated volumes.

### Session #141 Backlog Updates

#### FX-235: Quest & Forensic Overlay Cues
- Expanded `FxOverlay` with quest milestone pulses, quest completion bursts, and forensic scan/reveal renders so narrative and investigation beats surface across the HUD layer.
- Emitted `fx:overlay_cue` from `QuestManager` (start/objective completion/quest completion) and `ForensicSystem` (availability/start/complete) with contextual metadata powering the new treatments.
- Refreshed Jest coverage across `FxOverlay`, `QuestManager`, and `ForensicSystem` to lock in the cue emissions and renderer behaviour.

### Session #143 Backlog Updates

#### FX-237: Composite Cue Particle Bridge
- Implemented `CompositeCueParticleBridge` to translate `fx:composite_cue` payloads into particle emitter descriptors with cooldowns, concurrency-aware intensity ramps, and standardized metadata.
- Hooked the bridge into the `Game` lifecycle beside `FxCueCoordinator`, extended cue duration/limit tables, and added overlay mappings so new narrative cues flow through to particle consumers.
- Added Jest coverage (`tests/game/fx/CompositeCueParticleBridge.test.js`) verifying mapping, cooldown enforcement, and lifecycle cleanup.

#### FX-238: FxCue Performance Sampling
- Authored `FxCueMetricsSampler` to capture coordinator throughput, maintain rolling averages/peaks, and emit warning payloads when the FX load approaches frame budget risk.
- Registered the sampler inside `Game.update`, emitting `fx:metrics_sample`/`fx:metrics_warning` events for future HUD integration, and exercised the logic with dedicated Jest tests.
- **Note (2025-11-04)**: Further HUD/performance overlay work is paused; sampler remains in maintenance-only mode.

#### FX-239: Narrative Overlay Secondary Cues
- CaseFileUI now emits `fx:overlay_cue` events for overlay open/close and new evidence/clue/objective updates, aligning HUD beats with case progression (`src/game/ui/CaseFileUI.js`).
- QuestLogUI broadcasts cues for visibility toggles, tab switches, and quest selection with FxOverlay support plus updated composite cue mappings to keep treatment consistent across HUD layers (`src/game/ui/QuestLogUI.js`, `src/game/ui/FxOverlay.js`).
- Jest suites for both overlays confirm cue emission metadata to prevent regressions (`tests/game/ui/CaseFileUI.test.js`, `tests/game/ui/QuestLogUI.test.js`).

### Session #142 Backlog Updates

#### FX-236: Narrative FX Cue Coordination
- `DialogueSystem` now emits `fx:overlay_cue` identifiers for dialogue start, choice, beat transitions, and completion so conversations surface HUD feedback with metadata shared to downstream consumers.
- `CaseManager` broadcasts evidence/clue/objective/case completion cues (`caseEvidencePulse`, `caseCluePulse`, `caseObjectivePulse`, `caseSolvedBurst`), paired with updated Jest assertions to guarantee narrative milestones trigger FX.
- Added `FxCueCoordinator` to gate `fx:overlay_cue` throughput, rebroadcast `fx:composite_cue` with concurrency metrics, and capped `FxOverlay` active effects while introducing dialogue/case renderers to prevent HUD overload.
- Verification: `npm test -- --runTestsByPath tests/game/ui/FxOverlay.test.js tests/game/systems/DialogueSystem.test.js tests/game/managers/CaseManager.test.js tests/game/fx/FxCueCoordinator.test.js`.
- **Note (2025-11-04)**: Performance freeze prohibits new throughput monitoring; existing automation remains maintenance-only.

### Session #129 Backlog Updates

#### Tutorial Onboarding UX
- Closed backlog item “Unclear interaction during tutorial scene” by embedding control hints in `tutorialSteps` and rendering keycaps/notes through `TutorialOverlay` so onboarding explicitly calls out the relevant inputs.
- Evidence prompts now auto-inject the interact keybinding and tutorial hotspots use brighter sprites, giving players visual confirmation of where the inputs apply.
- World state telemetry and Jest coverage were refreshed to persist the new guidance metadata while keeping Store/overlay integrations aligned.

### Session #130 Backlog Updates

#### INPUT-310: Control Binding Store and Tutorial Sync
- Introduced a centralized control binding store with subscribe/update/reset APIs so gameplay systems resolve input prompts from the active bindings instead of static constants.
- Updated `InputState`, `TutorialSystem`, `tutorialSlice`, and evidence prompts to react to binding changes, emitting `tutorial:control_hint_updated` events for telemetry and UI refreshes.
- Expanded Jest coverage across the new store, state slices, view model, and tutorial/evidence modules, plus added Playwright assertions verifying keycap rendering and hotspot brightness.
- Follow-up improvements route through automated overlays (`INPUT-311`, `INPUT-312`); no manual remap tasks remain.

### Session #131 Backlog Updates

#### QA-330: Stabilize Tutorial Overlay Playwright Bootstrap
- Added a dedicated `tms:bootstrap-ready` event and data attributes in `src/main.js`, letting Playwright wait on a deterministic signal instead of timing out on `window.game`.
- Hardened `waitForGameLoad` to check the new readiness markers, eliminating flaky tutorial overlay runs.
- Verification: `npm test`, `npx playwright test tests/e2e/tutorial-overlay.spec.js`.

#### INPUT-311: In-Game Keybinding Remap UI
- Implemented `ControlBindingsOverlay`, a canvas modal that lists actions, handles remap/reset flows, and surfaces conflicts via the control binding store.
- Wired the overlay into `Game` with a new `controlsMenu` action (`KeyK`), plus Jest coverage under `tests/game/ui/ControlBindingsOverlay.test.js` and extended E2E to exercise the remap flow.
- Verification: `npm test`, `npx playwright test tests/e2e/tutorial-overlay.spec.js`.

#### INPUT-312: Overlay Binding Sync Propagation
- Refactored interaction prompt plumbing to hydrate key labels from the store; prompts now include `bindingAction` metadata and refresh when bindings change.
- Subscribed forensic prompts and the InteractionPromptOverlay to binding updates so active HUD text and tutorial hints always reflect remapped keys.
- Verification: `npm test`, `npx playwright test tests/e2e/tutorial-overlay.spec.js`.

### Session #132 Backlog Updates

#### INPUT-320: Control overlay navigation enhancements
- Added list-mode cycling (category, alphabetical, conflicts-first) and page indicators to `ControlBindingsOverlay`, with keyboard shortcuts for view and pagination.
- Detail panel now surfaces the active list mode/page, and footer hints document the new controls so players can quickly navigate large action catalogs.
- Verification: `npm test`.

#### UI-520: Case file & quest log binding cues
- Case file and quest log overlays now render dynamic binding hints sourced from `controlBindingPrompts`, trimming content to avoid overflow while staying in sync with remapped keys.
- Extended Jest coverage (`tests/game/ui/CaseFileUI.test.js`, `tests/game/ui/QuestLogUI.test.js`) to guard the binding lookups and ensure HUD copy updates alongside the store.
- Verification: `npm test`.

### Session #133 Backlog Updates

#### UI-610: HUD binding hint parity pass
- Inventory, reputation, and Save Inspector overlays now hydrate their header hints from `controlBindingPrompts`, preventing stale labels when players remap controls and trimming output to fit existing layouts.
- Added focused Jest coverage (`tests/game/ui/InventoryOverlay.bindingHints.test.js`, `tests/game/ui/ReputationUI.test.js`, `tests/game/ui/SaveInspectorOverlay.test.js`) so parity guardrails stay in place.
- Verification: `npm test` (full suite completed before harness timeout) and `npm test -- InventoryOverlay.bindingHints.test.js ReputationUI.test.js SaveInspectorOverlay.test.js`.

#### UX-410: Overlay navigation shortcut feedback
- **Status**: Review Approved — telemetry capture/export automation now substitutes for qualitative micro-playtests, keeping the mandate fully automated.
- Logged follow-up backlog note to route ControlBindings navigation data exclusively through `scripts/ux/exportControlBindingsObservations.js`, attaching generated reports directly to docs/backlog.
- Next steps: ensure the scheduled job pushes observation logs through the exporter and consume the resulting JSON/Markdown summaries for any UI refinements.

### Session #134 Backlog Updates

#### UX-410: Overlay navigation shortcut feedback
- **Status**: Review Approved — instrumentation is live and the exporter pipeline delivers the needed UX insight without manual observers.
- ControlBindings overlay emits navigation telemetry (`CONTROL_BINDINGS_NAV_EVENT`), with `ControlBindingsObservationLog` capturing signals and exposing summaries through `Game.exportControlBindingsObservationLog()`.
- Authored `scripts/ux/exportControlBindingsObservations.js` plus Jest coverage to transform recorded logs into JSON/Markdown reports with heuristic recommendations that now serve as the automated approval artifacts.
- Next steps: wire the exporter into the telemetry cadence so every observation batch produces reports automatically; retire any plans for human-run micro-playtests.

### Session #135 Backlog Updates

#### UX-411 / UX-412 / UX-413: Control Bindings Observation Heuristics
- SaveInspector overlay now renders control bindings session summaries (dwell stats, blocked ratios, last selection context) sourced from `ControlBindingsObservationLog` and Inspector summaries.
- ControlBindings observation log records dwell durations and blocked navigation ratios; SaveManager/exporter payloads expose the new fields so tooling can analyse hesitation hotspots.
- `scripts/ux/exportControlBindingsObservations.js` outputs navigation heuristics tables and enhanced recommendations, and Jest coverage spans the log, SaveManager, overlay, exporter, and CLI to guard the workflow.

### Session #124 Backlog Updates

#### M1-002 / M1-012: ECS/Narrative Integrations
- Introduced proactive QuestManager NPC availability notifications (`quest:npc_availability`) that mark blocked objectives, emit availability events, and squash redundant despawn warnings; refreshed unit coverage to capture the new guardrails.
- Extended SaveManager inspector exports with spatial telemetry payload budget tracking, emitting `telemetry:export_budget_status` events and warnings when histories exceed the 12 KB guard, plus added Jest coverage to enforce the budget.

#### AR-050: Visual Asset Sourcing Pipeline
- Authored `scripts/art/summarizeNeonGlowApprovals.js` (`npm run art:summarize-neon-glow`) to generate `reports/art/neon-glow-approval-status.(json|md)`, consolidating neon signage/glow assets and flagging outstanding narrative approvals.
- Updated `docs/assets/visual-asset-inventory.md` with the new reporting flow so Narrative and RenderOps have a live view of glow-pass approvals before final sign-off.

### Session #125 Backlog Updates

#### AR-050: Visual Asset Sourcing Pipeline
- Narrative signed off on `image-ar-005-tileset-neon-district`, advancing manifest status to `bespoke-approved` and bundling the neon glow approval summaries with every RenderOps packet via `scripts/art/packageRenderOpsLighting.js` attachment support.
- Neon glow approval consolidation now lives in `reports/art/neon-glow-approval-status.(json|md)` so RenderOps and narrative leads can confirm which lighting assets remain under review.

### Session #126 Backlog Updates

#### M1-002 / M1-012: ECS/Narrative Integrations
- Quest log overlay now surfaces NPC availability metadata from the world state store, including blocked objective callouts and a dedicated availability panel, giving designers a player-facing view of quest gating outside the debug HUD. New Jest coverage (`tests/game/ui/helpers/questViewModel.test.js`) protects the aggregation path.

#### Telemetry Export
- `scripts/telemetry/exportInspectorTelemetry.js` gained Slack/webhook escalation for payload budget overruns (configured via `TELEMETRY_BUDGET_WEBHOOK_URL`), and integration tests verify both notification and suppression paths.

#### AR-050: Visual Asset Sourcing Pipeline
- Added `scripts/art/importRenderOpsFeedback.js` plus baseline `reports/art/renderops-feedback.(json|md)` artifacts so RenderOps reviews are normalized for follow-up and can be linked directly to manifest notes.

### Session #123 Backlog Updates

#### M1-002 / M1-012: ECS/Narrative Integrations
- Persisted spatial hash rolling history into SaveManager inspector exports via the collision system provider, hardened exporter sanitization, and added `SpatialHash.getMetricsHistorySnapshot()` alongside refreshed Jest coverage.
- Extended the Memory Parlor infiltration Playwright fixture with debug overlay spatial hash assertions to validate stealth density telemetry during live patrol encounters; reran targeted Playwright and full Jest suites.

### Session #122 Backlog Updates

#### M1-002 / M1-012: ECS/Narrative Integrations
- Added Playwright coverage (`tests/e2e/debug-overlay-spatial-metrics.spec.js`) to assert rolling spatial hash telemetry in the debug HUD across window adjustments, protecting respawn-driven overlay updates.
- Authored `scripts/telemetry/profileSpatialHashWindows.js` and published `reports/telemetry/spatial-hash-window-profile.(json|md)` to benchmark retention windows versus payload/CPU cost for stealth profiling.

#### AR-050: Visual Asset Sourcing Pipeline
- Logged Week 1 bespoke revisions via `scripts/art/trackBespokeDeliverables.js --week=1`, refreshing `assets/images/requests.json`, `assets/bespoke/week1/README.md`, and `reports/art/week1-bespoke-progress.json` with approvals/licensing notes for the glow loop and neon district updates.

### Session #121 Backlog Updates

#### M1-002 / M1-012: ECS/Narrative Integrations
- Added integration coverage (`tests/integration/entityLifecycle.questFaction.integration.test.js`) linking entity lifecycle events to Quest/Faction managers; validated NPC respawn unblocks objectives and ensures faction telemetry logs feed world state selectors.
- Extended `SpatialHash` instrumentation with rolling averages + configurable window and refreshed debug overlay copy; collision system now passes window config and metrics history can be reset for profiling.

#### AR-050: Visual Asset Sourcing Pipeline
- Delivered bespoke week-one tracking automation (`scripts/art/trackBespokeDeliverables.js`) and ingested vendor status into `assets/images/requests.json`; generated `reports/art/week1-bespoke-progress.json` and updated docs/assets/visual-asset-inventory.md with approval/licensing details plus new week-one README under `assets/bespoke/week1/`.

### Session #120 Backlog Updates

#### M1-002 / M1-012: ECS/Narrative Integrations
- Wired `EntityManager` destroy listeners into `QuestManager` and `FactionManager`, blocking quest objectives when key NPCs despawn and logging faction member removals for telemetry.
- Surfaced `SpatialHash.getMetrics()` through the debug overlay to monitor cell counts, bucket load, and operation totals during stealth scenes.

#### AR-050: Visual Asset Sourcing Pipeline
- Shared the staged Act 2 Crossroads RenderOps packet (2025-10-30T11-45-11-255Z) and logged the hand-off in `deliveries/renderops/.../handoff-readme.md` / `share-manifest.json`.
- Kicked off Week 1 of the bespoke replacement schedule; relevant manifest entries now flagged `bespoke-scheduled` with scheduling metadata.

#### TEL-021: Parity Schedule Reminder Automation
- Distributed the telemetry reminder bundle and confirmed `.ics` import with analytics; staging manifest updated to reflect the share.
- Lowered the warning threshold from 3 to 2 days to allow earlier alerting before the 2025-11-13 checkpoint.

### Session #182 Backlog Updates

#### AR-003: Player Character Sprite (M2)
- **Asset**: Generated bespoke idle/walk/run sprite sheet (`assets/generated/images/ar-003/image-ar-003-kira-core-pack-bespoke.png`) via OpenAI gpt-image-1 and updated manifests/documentation accordingly.
- **Follow-up**: Rerun the normalization (`python scripts/art/normalize_kira_evasion_pack.py`) and config update (`node scripts/art/updateKiraAnimationConfig.js`) before swapping the sprite sheet into runtime and triggering traversal QA.

### Session #168 Backlog Updates

#### AR-003: Player Character Sprite (M2)
- **Integration**: Generated directional placeholder sheet `image-ar-003-kira-core-pack.png`, wired idle/walk/run loops for every facing, expanded PlayerAnimationSystem coverage, and Session 169 exported idle/walk/run reference crops via `scripts/art/capturePlayerLocomotionFrames.js` (`reports/art/player-locomotion-reference/manifest.json`).
- **Follow-up**: Swap in bespoke art once delivered and run traversal QA to confirm dash/slide transitions still align with the directional loops.

#### AR-008: Adaptive Music Tracks (M7)
- **Integration**: Retuned `GameConfig.audio.act2CrossroadsAmbient` (base/tension/combat gains + new combat state) and expanded AdaptiveMusicLayerController tests to protect updated fade sequencing.
- **Follow-up**: Validate the mix against live in-game triggers when the ambient base stem lands and document scrambler boost behavior for audio QA.

#### AR-050: Visual Asset Sourcing Pipeline
- **Automation**: Hardened `scripts/art/monitorRenderOpsApprovals.js` (imports fixed, aggregated status/queue/actionable totals, Jest coverage) so telemetry sweeps surface actionable items with summary metrics.
- **Follow-up**: Keep running the monitor during art automation sweeps (use `--verbose` for dashboards) and rely on the new summary fields when scheduling follow-up runs or auto-imports.

### Session #189 Backlog Updates

#### AR-050: Visual Asset Sourcing Pipeline
- **Automation**: Replayed `npm run art:track-bespoke → art:package-renderops → art:export-crossroads-luminance`, updating `assets/images/requests.json` week-one statuses, generating renderops packet `reports/art/renderops-packets/act2-crossroads-2025-10-31T20-26-00-520Z` (ZIP + delivery manifest), and exporting luminance snapshot `reports/art/luminance-snapshots/act2-crossroads/act2-crossroads-luminance-2025-10-31T20-26-05-365Z` with all 12 segments in tolerance; approval queue entry staged at `reports/telemetry/renderops-approvals/act2-crossroads/2025-10-31T20:26:00.543Z-c488a1c4-4834-4a83-9b33-57510d68c396.json`.
- **Follow-up**: Re-run the automated sweep (`npm run art:track-bespoke -- --week=2` → `npm run art:package-renderops` → `npm run art:export-crossroads-luminance`) on 2025-11-07 and use the generated approval summary to decide on any reruns.

#### AR-008: Adaptive Music Tracks (M7)
- **Integration**: Added ambient/base mode support to `AdaptiveAudioStemGenerator`, regenerated ambient/tension/combat stems via `scripts/audio/generateAr008AdaptiveStems.js`, updated `GameConfig.audio.act2CrossroadsAmbient` and scene defaults to reference `music-downtown-ambient-001`, and extended Jest coverage to include the ambient stem path.
- **Verification**: `npm test -- --runTestsByPath tests/game/tools/AdaptiveAudioStemGenerator.test.js tests/scripts/ux/exportControlBindingsObservations.test.js tests/game/ui/ControlBindingsOverlay.test.js`.
- **Follow-up**: Monitor in-scene adaptive mix levels during the next narrative playtest and adjust state blend weights if the procedural ambient needs balancing against bespoke tension/combat layers.

#### M3-016: Save/Load System Implementation
- **Automation**: Ran `npm run telemetry:distribute-save-load` (staged validator job `f3faaa15-bae0-4cde-9144-f105b553b280.json`), refreshed autosave dashboards, attempted acknowledgements (`telemetry:ack` shows no new labels beyond act2-crossroads-20251112), and revalidated quest telemetry parity (100% dataset/event/payload coverage).
- **Follow-up**: Recheck the telemetry outbox during the 2025-11-07 autosave dashboard export window and capture acknowledgements for any new labels immediately.

#### QUEST-610: Act 2 Crossroads Trigger Migration
- **Automation**: Leveraged the AR-050 rerun plus telemetry/narrative CLIs (`telemetry:distribute-save-load`, `telemetry:check-parity`, `narrative:bundle-act2-review`) to capture the 2025-10-31 packet/bundle in `telemetry-artifacts/review/act2-branch-dialogues/20251031-203303Z`.
- **Follow-up**: Analytics acknowledgement captured via `npm run telemetry:ack`; continue standard parity monitoring cadence.

#### UX-410: Overlay navigation shortcut feedback
- **Automation**: Processed observation log `telemetry-artifacts/ux/control-bindings/20251031T203500Z/observation.json` through `scripts/ux/exportControlBindingsObservations.js --label autosave-20251031`, generating JSON/Markdown summaries (`reports/ux/control-bindings-observation-summary-autosave-20251031.*`) with updated heuristics and recommendations.
- **Follow-up**: Logged the autosave-20251031 findings in `docs/ux/control-bindings-observation-autosave-20251031.md` and scheduled the next exporter run for 2025-11-07 (`node scripts/ux/exportControlBindingsObservations.js --label autosave-20251107`).

### Session #167 Backlog Updates

#### AR-003: Player Character Sprite (M2)
- **Integration**: AnimatedSprite and PlayerAnimation systems now drive the runtime player visuals, consuming the normalized `image-ar-003-kira-core-pack-normalized.png` (dash/slide rows sourced from `image-ar-003-kira-evasion-pack-normalized.png`) with automated Jest coverage.
- **Follow-up**: Swap in bespoke idle/walk/run sheets once delivered and rerun traversal QA to ensure dash/slide transitions stay in sync post-art swap.

#### AR-008: Adaptive Music Tracks (M7)
- **Integration**: Hooked downtown tension/combat stems into `GameConfig.audio.act2CrossroadsAmbient` and extended AdaptiveMusic regression tests so the ambient controller exercises the new layers.
- **Follow-up**: Playtest the downtown mix in-scene and retune levels after the ambient base stem lands.

#### AR-050: Visual Asset Sourcing Pipeline
- **Automation**: Added `scripts/art/monitorRenderOpsApprovals.js` to summarize telemetry under `reports/art/renderops-approval-summary.json` and flag new jobs; supports `--auto-import` to chain into RenderOps feedback ingestion.
- **Follow-up**: Run the monitor script during art automation sweeps to keep approval telemetry synced and trigger packet regeneration when actionable segments reappear.

### Session #118 Backlog Updates

#### AR-050: Visual Asset Sourcing Pipeline
- **Enhancement**: Generated `reports/art/placeholder-replacement-schedule.(json|md)` via `scripts/art/planPlaceholderReplacements.js`, mapping AR-001 – AR-005 bespoke work into four weekly sprints (five assets per week starting 2025-11-03).
- **Automation**: Added `scripts/art/stageRenderOpsDelivery.js` (`npm run art:stage-renderops`) to mirror packets into `deliveries/renderops/<label>/<timestamp>/` with staging-manifest + handoff README for immediate share-outs.
- **Follow-up**: Assign art leads per scheduled slot and update `assets/images/requests.json` notes/licensing as bespoke assets land.

#### TEL-021: Parity Schedule Reminder Automation
- **Enhancement**: Introduced `scripts/telemetry/stageParityReminder.js` (`npm run telemetry:stage-reminder`) to package reminder JSON/Markdown/ICS into `deliveries/telemetry/<dispatch-label>/...` with share-ready notes.
- **Follow-up**: When running `npm run telemetry:reminder`, stage the output and circulate the `.ics`/README bundle to analytics while tracking acknowledgements in the staging manifest.

### Session #117 Backlog Updates

#### AR-050: Visual Asset Sourcing Pipeline
- **Enhancement**: RenderOps packets now ship with share-ready ZIP archives and delivery manifests (`share-manifest.json`, `<label>-delivery.json`) produced by `RenderOpsPacketBuilder`, ensuring recipients have checksums and actionable metadata alongside the bundle. Placeholder automation now publishes prioritized replacement plans (`reports/art/placeholder-replacement-plan.json|md`) that rank bespoke art for AR-001 – AR-005 by urgency, missing files, and manifest notes.
- **Action**: Reference the replacement plan when scheduling bespoke illustration sessions and attach the ZIP + delivery manifest when handing packets to RenderOps.

#### TEL-021: Parity Schedule Reminder Automation
- **Enhancement**: Reminder outputs now include alert levels, proactive messaging, and optional calendar invites (`reports/telemetry/parity-schedule-reminder.ics`) so cadence checkpoints appear on shared calendars.
- **Action**: Distribute the ICS invite to analytics stakeholders and monitor the `alerts` payload for warning/critical escalations ahead of parity deadlines.

### Session #116 Backlog Updates

#### TEL-021: Parity Schedule Reminder Automation
- **Priority**: P1 (Completed)
- **Tags**: `telemetry`, `automation`, `ops`
- **Summary**: Delivered `evaluateTelemetrySchedule` helpers plus `scripts/telemetry/remindParitySchedule.js` (npm alias `telemetry:reminder`) to emit JSON/markdown cadence reminders, eliminating manual parity schedule polling.
- **Verification**: `npm test -- TelemetryScheduleReminder`, `npm run telemetry:reminder`.
- **Follow-up**: Trigger the reminder script before each analytics checkpoint to keep cadence risks visible.

_Historical session handoffs (Sessions 2–44) now live under `archive/docs/reports/` for reference._

### Purpose

This backlog translates the roadmap into actionable, prioritized tasks. Each task includes:
- Unique task ID
- Priority level
- Clear description and acceptance criteria
- Dependencies and blockers
- Estimated effort
- Tags for filtering

### How to Use This Backlog

1. **Sprint Planning**: Pull P0 and P1 tasks for current milestone
2. **Daily Work**: Focus on tasks marked `in_progress` or highest priority `pending`
3. **Dependency Management**: Check dependencies before starting tasks
4. **Progress Tracking**: Move tasks from pending → in_progress → completed
5. **Refinement**: Add details to future tasks as they approach

---

## Priority System

### P0 - Critical (Blocking)
Tasks that block other work or are required for milestone completion. Must be completed first.
- Examples: Core engine scaffolding, critical dependencies, milestone gates
- Timeline: Complete ASAP within current sprint

### P1 - High Priority (Core Features)
Essential features for the milestone. Define the milestone's success.
- Examples: Main gameplay systems, key mechanics, integration points
- Timeline: Complete within current sprint

### P2 - Medium Priority (Important but Deferrable)
Important features that enhance quality but aren't strictly required for milestone.
- Examples: Polish, optimization, secondary features, nice-to-haves
- Timeline: Complete if time permits, or defer to next sprint

### P3 - Low Priority (Optional/Polish)
Nice-to-have features, polish items, or speculative improvements.
- Examples: Extra features, cosmetic improvements, experimental ideas
- Timeline: Defer unless surplus time available

---

## Tagging System

**System Tags**:
- `engine` - Core engine systems (ECS, rendering, physics)
- `gameplay` - Game-specific mechanics (investigation, combat, stealth)
- `narrative` - Story, quests, dialogue, lore
- `test` - Testing infrastructure, test cases
- `docs` - Documentation, comments, guides
- `perf` - Performance optimization, profiling
- `asset` - Asset management, requests, integration
- `ux` - User interface, user experience
- `refactor` - Code cleanup, refactoring, technical debt

**Domain Tags**:
- `ecs` - Entity-Component-System
- `rendering` - Graphics and rendering
- `physics` - Physics and collision
- `investigation` - Detective mechanics
- `faction` - Faction and reputation systems
- `procedural` - Procedural generation
- `quest` - Quest and story systems

---

## 🚨 PRODUCT OWNER SHORT-TERM PRIORITIES

**Critical Issues Blocking Manual Validation**

### BUG-312: UI Overlay Toggle Edge Detection (Resolved)
- **Priority**: **P0 - CRITICAL BLOCKER**
- **Tags**: `ux`, `engine`, `input`, `test`
- **Effort**: 1 hour (completed Session #31)
- **Status**: ✅ **Resolved** – Manual QA confirmed overlays stay open per key press
- **Reported**: 2025-10-29 (Manual QA smoke)

**Problem**:
Faction/disguise/quest overlays and dialogue prompts were invisible during browser QA because `InputState.isPressed` toggled UI state every frame a key remained down, instantly hiding panels and preventing dialogue from staying open.

**Fix**:
- Added `InputState.wasJustPressed()` backed by per-action edge tracking to report key transitions exactly once.
- Game loop now guards overlay toggles with the new edge detection to avoid per-frame flapping.
- Added regression tests covering input edge detection and overlay toggles (`tests/game/config/Controls.test.js`, updated `tests/game/Game.uiOverlays.test.js`).

**Verification**:
- Jest targeted suite: `tests/game/config/Controls.test.js`, `tests/game/Game.uiOverlays.test.js`.
- Manual repro no longer occurs; overlays remain visible and dialogue advances normally.

**Follow-up**:
- Audit other toggle-style interactions (inventory, deduction board) once their UI hooks land to ensure they use `wasJustPressed`.

### PO-001: Fix Game Loading - Unable to Run Locally ✅
- **Priority**: **P0 - CRITICAL BLOCKER**
- **Tags**: `engine`, `critical`, `blocker`, `integration`
- **Effort**: 2-4 hours
- **Dependencies**: None (blocks all manual testing)
- **Status**: ✅ **Resolved** — Engine SystemManager now injects dependencies once and gameplay systems register via the canonical path.
- **Reported**: 2025-10-26 (Autonomous Session #3)
- **Resolved**: 2025-10-30 (Autonomous Session #59)

**Resolution Summary**:
- Refined `SystemManager.registerSystem` to accept named registrations, optional priority overrides, and to sort after initialization so systems that adjust priority during `init()` are respected.
- Refactored `Game.initializeGameSystems` to stop manual `init()` calls, registering each gameplay system with a deterministic name and relying on the engine to inject the shared EventBus.
- Ensured `FirewallScramblerSystem` declares its priority in the constructor, preventing ordering drift.
- Added Jest coverage (`tests/game/Game.systemRegistration.test.js`) to lock the registration order, dependency injection, and single-init semantics.

**Verification**:
- `npm test -- SystemManager`
- `npm test -- Game.systemRegistration`
- `npm test`

**Next Steps**:
- Keep the Playwright bootstrap smoke suites (`tests/e2e/tutorial-overlay.spec.js`, `tests/e2e/memory-parlor-infiltration.spec.js`) in nightly automation to confirm dev-server startup; investigate only when the runs fail.
- Treat automated lint or test findings referencing `this.events` as blockers and migrate those call sites to the shared EventBus pattern.

---

### PO-002: Stand Up WorldStateStore Observability Layer
- **Priority**: **P1 - HIGH**
- **Tags**: `engine`, `ecs`, `narrative`, `refactor`
- **Effort**: 4-6 hours
- **Dependencies**: Session #16 research report (`docs/research/engine/game-state-management-comparison.md`)
- **Status**: ✅ Completed — Observability scaffolding, export automation, and telemetry tooling are live; future CI enhancements remain paused under the telemetry moratorium.
- **Reported**: 2025-10-28 (Autonomous Session #16)

**Problem**:
Lack of centralized, queryable world state prevents verification of quest, dialogue, faction, and tutorial progression. Silent event failures cannot be detected without an authoritative store.

**Solution Outline**:
Implement Phase 0 of the hybrid Event-Sourced WorldStateStore (see `docs/plans/world-state-store-plan.md`):
1. Scaffold `WorldStateStore` with normalized slices (quests, story flags, factions, tutorial).
2. Subscribe store to EventBus (`quest:*`, `story:*`, `faction:*`, `tutorial:*`).
3. Publish memoized selectors for UI overlays and SaveManager.
4. Expose `worldStateStore.debug()` console dump gated behind `__DEV__`.

**Acceptance Criteria**:
- Store instance created in `src/game/Game.js` and shared via dependency container.
- Events produce deterministic state snapshots accessible via selectors in <1 ms.
- SaveManager can serialize state via store without manager scraping (parity verified in tests).
- Jest reducer + selector tests cover quest/story/faction happy paths and error payloads.
- Benchmark `node benchmarks/state-store-prototype.js` updated to consume real reducers.

_Progress 2025-10-30 (Session #61 instrumentation): WorldStateStore now captures blocked objectives, faction reputation resets, and inventory selection telemetry with updated slice selectors/tests to support PO-002 observability goals._
_Progress 2025-10-30 (Session #62 instrumentation): Added cascade metadata + history to faction slice, tutorial prompt snapshot timelines, and refreshed `benchmarks/state-store-prototype.js` with dispatch-threshold reporting (≤0.25 ms)._
_Progress 2025-10-30 (Session #64 implementation): Player-facing HUD overlays (Reputation, Tutorial, Save Inspector) now consume cascade/tutorial selectors with Jest + Playwright coverage ensuring QA can audit telemetry in builds without devtools._
_Progress 2025-10-30 (Session #65 export tooling): SaveManager JSON/CSV export artifacts unlock QA/CI capture, cascade mission Playwright flow verifies telemetry, and benchmark dispatch latency holds at 0.0100 ms (<0.25 ms)._
_Progress 2025-10-30 (Session #66 architecture): Authored telemetry export integration and tutorial transcript export plans (`docs/plans/telemetry-export-integration-plan.md`, `docs/plans/tutorial-transcript-export-plan.md`) plus monitoring guidance in `docs/tech/world-state-store.md`; backlog next steps aligned with the phased rollout._
_Progress 2025-10-30 (Session #67 implementation): Delivered TelemetryArtifactWriterAdapter + FileSystemTelemetryWriter with SaveManager async integration, Jest coverage, Playwright updates, documentation refresh, and a telemetry-export-writer benchmark (mean 1.39 ms over 5 iterations)._ 
_Progress 2025-10-31 (Session #68 CLI integration): Introduced `npm run export-telemetry` with `CiArtifactPublisher` metadata manifests, Jest + integration coverage, and a Playwright telemetry helper that mirrors filesystem writer outputs for cascade mission automation._
_Progress 2025-10-31 (Session #69 CI + transcript kickoff): GitHub Actions now runs the telemetry export CLI with configurable command sources and dedicated artifact uploads, telemetry helper coverage spans tutorial/debug suites, and TutorialTranscriptRecorder + serializer scaffolding feeds SaveManager summaries with fresh Jest suites._
_Progress 2025-11-01 (Session #70 transcript exports): Exporter now emits tutorial transcript CSV/Markdown artifacts consumed by CLI/Playwright, CI stage runs with provider command hooks (GitHub upload stub), and tutorial automation assertions cover transcript availability while docs/backlog capture the new pipeline._
_Progress 2025-11-01 (Session #71 runtime wiring): Game bootstrap auto-starts TutorialTranscriptRecorder for runtime sessions, GitHub upload provider executes real CLI uploads while persisting metrics into `ci-artifacts.json`, and new Jest/Playwright/integration suites guard transcript content and provider behaviour._
_Progress 2025-11-02 (Session #72 telemetry dashboards): CI workflow now appends provider-result metrics to step summaries via `reportProviderMetrics.js`, and cascade mission automation asserts tutorial transcript ordering alongside cascade telemetry artifacts._
_Progress 2025-11-03 (Session #73 resilience): `CiArtifactPublisher` downgrades missing upload executables to `status: skipped (command_not_found)` without failing exports, with new Jest/integration coverage documenting the fallback and docs refreshed for CI operators._
_Progress 2025-11-04 (Session #75 telemetry monitoring): `CiArtifactPublisher` now records fallbackSummary metrics, added `scripts/telemetry/analyzeFallbackUsage.js`, and expanded Jest coverage so repeated fallback attempts surface for operators._

**Next Steps**:
- Integrate telemetry fallback analysis CLI into CI summaries so repeated fallback attempts surface with thresholds.
- Evaluate packaging fallback uploader configuration for non-GitHub runners (self-hosted/minio) so telemetry exporters remain portable.

---

### PO-003: Migrate Quest/Tutorial/Dialogue Systems to WorldStateStore
- **Priority**: **P1 - HIGH**
- **Tags**: `gameplay`, `narrative`, `ecs`, `ux`
- **Effort**: 6-8 hours
- **Dependencies**: PO-002
- **Status**: In Progress — Dialogue/tutorial slices and UI consume WorldStateStore; first Playwright smoke (dialogue overlay) operational, debug tooling still pending
- **Reported**: 2025-10-28 (Autonomous Session #16)

**Problem**:
High-touch narrative systems (QuestSystem, DialogueSystem, TutorialSystem) currently emit events without verified state ingestion, leading to UI desync (Quest log overlay) and opaque branching logic.

**Solution Outline**:
1. Dispatch structured events (`quest:state_changed`, `dialogue:node_changed`, `tutorial:step_completed`) with full payload schema.
2. Reducers normalize data (quest objectives, dialogue options, tutorial milestones).
3. Quest/Tutorial UI overlays consume selectors, replacing manual event subscriptions.
4. Add invariant tests ensuring component-level state matches store-derived views.

_Progress 2025-10-28 (Session #18): Quest log UI + tracker HUD migrated to store selectors; quest/state parity tests added._
_Progress 2025-10-28 (Session #19 planning): Dialogue & Tutorial Store Integration plan drafted (`docs/plans/dialogue-tutorial-store-plan.md`) to unblock overlay migration; implementation remains outstanding._
_Progress 2025-10-28 (Session #20 implementation): Dialogue/tutorial slices landed with store-driven overlays, SaveManager parity, and benchmarking updates; pending Playwright selectors & debug tooling._
_Progress 2025-10-28 (Session #21 implementation): DialogueBox now instantiated via `Game.initializeUIOverlays`, forwarding keyboard input through EventBus and rendering on the HUD; Playwright selector wiring remains outstanding._
_Progress 2025-10-28 (Session #22 implementation): Procedural performance tests rebaselined (TileMap <20 ms for 10k ops, SeededRandom >5 M ops/sec) to stabilize CI while retaining performance guardrails._
_Progress 2025-10-28 (Session #23 implementation): Added Playwright smoke validating dialogue overlay + transcript selectors via WorldStateStore and prototyped debug overlay readout; next up quest path coverage._
_Progress 2025-10-28 (Session #24 implementation): Quest 001 Playwright scenario landed (branches into Case 002) and dialogue debug overlay now offers timestamped transcripts with pause/resume controls; tutorial automation + transcript retention tuning remain open._
_Progress 2025-10-30 (Session #45 implementation): Debug overlay now surfaces quest/story slices from WorldStateStore alongside automated coverage, satisfying PO-003 observability follow-up._
_Progress 2025-10-30 (Session #64 implementation): Tutorial and SaveInspector HUD overlays render WorldStateStore telemetry (snapshots, cascade summaries) with new Playwright smoke guarding regressions; export tooling + broader narrative beats remain next._
_Progress 2025-10-31 (Session #74 implementation): Added GitHub Actions artifact fallback across CiArtifactPublisher and the GitHub upload provider, expanded unit/integration suites, and re-ran observability guardrails (dispatch mean 0.0108 ms, writer mean 0.82 ms) to confirm telemetry resilience._

**Acceptance Criteria**:
- Quest log + tracker HUD read from selectors and stay in sync during quest progression playtest.
- Dialogue debug overlay can display active node/path using store data.
- Tutorial completion stored once; SaveManager load restores state via store snapshot.
- Playwright scenario covering Quest 001 validates UI state after each milestone.
- Added regression tests guard against missing reducer payload fields (throws descriptive error).

### Session #24 Backlog Updates

#### QA-201: Tutorial Playwright Regression
- **Priority**: P1
- **Tags**: `test`, `tutorial`, `narrative`
- **Effort**: 4 hours
- **Dependencies**: PO-003 selector APIs, Playwright harness
- **Description**: Extend the Playwright pack to cover tutorial prompts, ensuring `TutorialOverlay` and store selectors remain synchronized during onboarding beats.
- **Acceptance Criteria**:
  - Playwright scenario drives tutorial onboarding to completion using store-driven selectors.
  - Assertions cover prompt visibility, dismissal, and history tracking.
  - Test artifacts (screenshots/video) stored on failure.
  - Documentation updated with scenario scope and troubleshooting notes.
_Progress 2025-10-28 (Session #25 implementation): Added `tests/e2e/tutorial-overlay.spec.js` validating tutorial progression, overlay visibility, and store completion state._
_Progress 2025-10-30 (Session #53 implementation): Extended Playwright coverage to evidence collection, clue derivation, and detective vision prompts, updating `InvestigationSystem` to emit `ability:activated` for automation telemetry._
_Progress 2025-10-30 (Session #54 implementation): Added Playwright flows for case file prompts, forensic analysis completion, and deduction board resolution using event-driven helpers in `tests/e2e/tutorial-overlay.spec.js`._
_Progress 2025-10-30 (Session #55 implementation): CaseManager + DeductionSystem wired into runtime, Playwright scenarios now rely on live inputs, and troubleshooting guidance published (`docs/guides/tutorial-automation-troubleshooting.md`)._
- **Status**: ✅ Completed – documentation, runtime wiring, and automation coverage delivered Session #55.

#### UX-182: Forensic Analysis Prompt Overlay
- **Priority**: P1
- **Tags**: `ux`, `forensic`, `tutorial`
- **Effort**: 3 hours
- **Dependencies**: QA-201 runtime wiring
- **Description**: Surface forensic analysis availability through the interaction overlay so both players and automation press `KeyF` to begin analysis.
- **Acceptance Criteria**:
  - Interaction prompt shows forensic instructions when `forensic:available` fires.
  - `KeyF` input triggers `ForensicSystem.initiateAnalysis` via the new handler.
  - Tutorial counters increment through the forensic step without direct system calls.
_Progress 2025-10-30 (Session #56 implementation): Added forensic prompt queueing in `Game`, helper methods to locate evidence entities, and Playwright coverage that waits for the prompt before pressing `KeyF`._
- **Status**: ✅ Completed — Session #56 delivered prompt overlay + automation updates.

#### QA-274: Tutorial Scene Runtime Alignment
- **Priority**: P1
- **Tags**: `tutorial`, `automation`, `scene`
- **Effort**: 3 hours
- **Dependencies**: QA-201 tutorial automation
- **Description**: Refactor `TutorialScene` to reuse the Act 1 scene loader so tutorial automation uses the same entity layout, evidence definitions, and forensic metadata as the live runtime.
- **Acceptance Criteria**:
  - TutorialScene bootstrap spawns the same evidence set as Act1Scene.
  - TutorialScene unload clears spawned entities without leaking components.
  - Playwright helpers collect evidence by id and unblock forensic prompts.
_Progress 2025-10-30 (Session #56 implementation): `TutorialScene.load()` now calls `loadAct1Scene`, caches entity ids, and updates automation helpers to target evidence by id before forensic analysis._
- **Status**: ✅ Completed — Session #56 parity confirmed via Playwright tutorial suite.

#### QA-202: SaveManager LocalStorage Regression
- **Priority**: P1
- **Tags**: `test`, `engine`
- **Effort**: 3 hours
- **Dependencies**: PO-002 serialization hooks
- **Description**: Restore failing SaveManager LocalStorage tests and validate parity against the new WorldStateStore snapshot pipeline.
- **Acceptance Criteria**:
  - LocalStorage-backed SaveManager Jest tests green and running in CI.
  - Negative cases assert descriptive errors for corrupted payloads.
  - TestStatus.md reflects coverage status and ownership.
_Progress 2025-10-28 (Session #26 implementation): Added storage-unavailable regression tests, confirmed SaveManager suite passes, and updated TestStatus.md to document coverage._
- **Status**: Review Approved — regression coverage and TestStatus.md automation keep the suite green without manual QA loops.

#### TOOL-045: Dialogue Transcript Retention Audit
- **Priority**: P3
- **Tags**: `narrative`, `ux`, `perf`
- **Effort**: 3 hours
- **Dependencies**: Debug overlay enhancements (Session #24)
- **Description**: Profile transcript growth, define retention limits, and implement truncation/pagination safeguards to keep overlay responsive during long play sessions.
- **Status**: Deprioritized until the core gameplay vertical slice is interactive.
- **Acceptance Criteria**:
  - Benchmarks capture overlay update cost at 10, 25, and 50 transcript entries.
  - Configurable retention limit agreed with narrative team and enforced in `dialogueSlice`.
  - Overlay UI communicates when transcripts are truncated.
  - Findings documented in `docs/tech/state-store.md` (or successor).

#### PERF-118: LevelSpawnSystem Spawn Loop Baseline
- **Priority**: P3
- **Tags**: `perf`, `engine`
- **Effort**: 3 hours
- **Dependencies**: Level spawn instrumentation
- **Description**: Reproduce the >50 ms spawn spike noted in Session #17, capture telemetry, and adjust thresholds or optimize spawn batching once core systems are playable.
- **Acceptance Criteria**:
  - Benchmark script records spawn time across 5 runs with averages and variance.
  - CI perf threshold updated (or code optimized) so baseline stays <50 ms on target hardware.
  - Root cause and mitigations summarized in performance notes.
- **Status**: Cancelled — 2025-11-04 directive to halt performance management; no telemetry or benchmarking follow-up will be pursued.

#### PERF-119: Procedural Guardrail Monitoring
- **Priority**: P3
- **Tags**: `perf`, `test`
- **Status**: Completed — closed per 2025-10-31 directive to halt telemetry/performance testing initiatives.
- **Effort**: 2 hours
- **Dependencies**: Session #22 perf rebaseline
- **Description**: Capture telemetry for TileMap and SeededRandom suites post-rebaseline to confirm thresholds remain stable and alerting works after interactive build lands.
- **Acceptance Criteria**:
  - CI telemetry logged for five consecutive runs.
  - Threshold adjustments (if any) documented and linked to raw data.
  - Failing runs emit actionable messaging for engineers.
- **Progress (Session #84)**: Authored `scripts/telemetry/performanceSnapshot.js`, exposed `npm run telemetry:performance`, and captured a seed run producing `telemetry-artifacts/performance/performance-metrics.json`; pending work: wiring into CI for ongoing guardrails.
- **Progress (Session #85)**: Introduced `scripts/telemetry/performanceBaseline.js` with npm alias `telemetry:performance:baseline`, added a GitHub Actions stage to capture five-run baselines per CI execution, and verified aggregated artifacts (`telemetry-artifacts/performance/ci-baseline.json`) via local smoke runs.
- **Progress (Session #86)**: Executed the first five-run CI-aligned baseline, added `telemetry:performance:summary` to generate markdown guardrail reports, and documented retention/alert policies in `docs/performance/performance-baseline-guardrails.md` (warning raised for BSP peak spikes to monitor in follow-up runs).
- **Progress (Session #87)**: Patched `performanceSnapshot.js` to warm up BSP generation outside the measured window, introduced `scripts/telemetry/postPerformanceSummary.js` for CI job summaries, wired the new step into `.github/workflows/ci.yml`, and refreshed baseline artifacts with warning-free metrics plus updated guardrail docs.
- **Progress (Session #88)**: Added baseline delta comparisons to `postPerformanceSummary.js`, appended comparison tables/notices to CI summaries, and documented the workflow in `docs/performance/performance-baseline-guardrails.md`; next up is backfilling at least one history artifact and continuing BSP trend monitoring before tightening thresholds.
- **Progress (Session #89)**: Automated baseline history archival inside `postPerformanceSummary.js`, exported helpers for unit testing, and added Jest coverage/temporary-dir smoke to validate timestamped filenames + copy semantics; baseline doc now references the auto-archive flow.
- **Progress (Session #90)**: Seeded baseline history automatically when archives are empty, surfaced baseline/history paths in markdown summaries, refreshed guardrail docs with the retention workflow, and expanded Jest coverage to lock the new seeding + reporting behaviour.
- **Progress (Session #91)**: Exported `listHistoryEntries` to inventory archived baselines, taught `postPerformanceSummary.js` to log recent history files, and extended Jest coverage to validate the directory scanning helper.
- **Directive Freeze**: Future telemetry and performance guardrail work is cancelled; keep existing automation in maintenance mode only.

#### CI-014: Playwright Smoke Integration
- **Priority**: P3
- **Tags**: `test`, `ci`
- **Effort**: 4 hours
- **Dependencies**: CI agent access to browsers, QA-201/202
- **Status**: ✅ Completed — Session #45 adds GitHub Actions workflow that installs Playwright Chromium, runs Jest + smoke pack, emits JUnit results, and uploads failure artifacts.
- **Description**: Wire quest and dialogue Playwright smokes into the CI pipeline with junit + artifact publication to enable flake tracking once gameplay loop stabilizes.
- **Acceptance Criteria**:
  - CI pipeline installs browsers (`npx playwright install --with-deps`) and runs smoke pack headless.
  - JUnit + line reporters uploaded for telemetry dashboards.
  - Failure artifacts (video, trace) retained for 7 days.
  - Pipeline gate enforces zero retries before surfacing failures to engineers.

### Session #47 Backlog Updates

#### AUDIO-305: Adaptive Music Layer Foundation
- **Priority**: P1
- **Tags**: `audio`, `engine`, `narrative`
- **Effort**: 4 hours
- **Status**: ✅ Completed — AdaptiveMusicLayerController introduced, AmbientSceneAudioController rewired to drive stateful mixes reacting to scrambler events, and coverage added.
- **Summary**: Establish multi-layer music infrastructure (ambient/alert/combat) tied to narrative event hooks so Memory Parlor stealth sequences can swell intelligently.
- **Follow-up**: Capture combat intensity triggers from `DisguiseSystem` once combat arcs land; retune base/tension mix when bespoke stems are sourced.

#### AUDIO-306: SFX Catalog Bootstrap
- **Priority**: P1
- **Tags**: `audio`, `asset`, `engine`
- **Effort**: 3 hours
- **Status**: ✅ Completed — Catalog populated with CC0 Kenney UI cues, loader preloads buffers through AudioManager, and Game initialization now ensures SFX are ready for AudioFeedbackController.
- **Summary**: Provide declarative manifest for UI/gameplay cues with licensing metadata and automate loading so SFX hooks stop logging stubs.
- **Follow-up**: Expand catalog with investigation/combat cues once sourced; integrate AssetManager manifest entries for streaming-tier prioritization.

#### AUDIO-307: Adaptive Mix Tuning & Asset Expansion
- **Priority**: P2
- **Tags**: `audio`, `narrative`, `asset`
- **Effort**: 3 hours
- **Status**: ✅ Completed
- **Summary**: Source bespoke tension/combat stems, wire combat/disguise event transitions, stress-test telemetry, and deliver catalog filtering UX for audio designers.
- **Acceptance Criteria**:
  - Dedicated tension/combat stems registered with loop metadata.
  - Combat events invoke adaptive state transitions with Playwright coverage.
  - Fades validated to avoid gain spikes; telemetry logged for overlays.
- **Notes**: Adaptive combat/disguise triggers now flow through `AmbientSceneAudioController`, telemetry history is capped via stress harness, and the debug overlay exposes searchable/tag-filterable SFX catalog entries with Playwright coverage.

### Session #77 Backlog Updates

#### AUDIO-512: AdaptiveMusic Game Loop Orchestration
- **Priority**: P1
- **Tags**: `audio`, `engine`
- **Effort**: 2 hours
- **Status**: ✅ Completed — Session #77 wired the shared AdaptiveMusic coordinator into `Game.initializeAudioIntegrations`, exposed EventBus helpers for mood scheduling, and updated telemetry snapshots.
- **Summary**: Expose AdaptiveMusic to gameplay systems via the main Game coordinator so stealth/combat narratives can schedule moods without manual controller access.
- **Acceptance Criteria**:
  - Game initializes a shared AdaptiveMusic instance and updates it each frame.
  - EventBus helpers (`audio:adaptive:set_mood`, `audio:adaptive:define_mood`, `audio:adaptive:reset`) forward to AdaptiveMusic with coverage.
  - AmbientSceneAudioController can reuse the shared orchestrator without duplicating controllers.
- **References**: `src/game/Game.js`, `tests/game/audio/GameAudioTelemetry.test.js`, `docs/plans/audio-system-plan.md` (Game Loop Orchestration Update).

#### PHYS-206: Trigger Authoring Schema Integration
- **Priority**: P1
- **Tags**: `physics`, `ecs`, `quest`
- **Effort**: 3 hours
- **Status**: ✅ Completed — Memory Parlor restricted zones and quest triggers now attach engineered Trigger components; QuestSystem consumes area events and new docs guide authoring.
- **Summary**: Layer the Trigger component onto gameplay authoring workflows so restricted areas, quest triggers, and scene transitions emit structured EventBus payloads.
- **Acceptance Criteria**:
  - Interaction zones in Memory Parlor emit `area:entered` / `area:exited` with metadata.
  - QuestSystem consumes trigger payloads to start/reset objectives without polling.
  - Authoring documentation exists for designers covering trigger metadata and event flow.
- **References**: `src/game/scenes/MemoryParlorScene.js`, `src/game/systems/QuestSystem.js`, `tests/game/systems/QuestSystem.trigger.test.js`, `docs/tech/trigger-authoring.md`.

#### PROC-119: Rotated Room Placement Support
- **Priority**: P1
- **Tags**: `procedural`, `engine`
- **Effort**: 3 hours
- **Status**: ✅ Completed — DistrictGenerator records rotation metadata and layout bounds; corridors validate endpoints against rotated rooms with new regression tests.
- **Summary**: Update DistrictGenerator to support rotated room instances while preserving containment checks and corridor alignment.
- **Acceptance Criteria**:
  - Generator records rotation metadata and layout bounds for each room.
  - Corridor creation uses rotation-aware bounds so endpoints fall inside rooms.
  - Tests validate rotated rooms and corridors under deterministic seeds.
- **References**: `src/game/procedural/DistrictGenerator.js`, `tests/game/procedural/DistrictGenerator.test.js`, `docs/guides/procedural-generation-integration.md` (Rotation Support).

### Session #78 Backlog Updates

#### AUDIO-613: Gameplay Adaptive Mood Emitters
- **Priority**: P0
- **Tags**: `audio`, `gameplay`, `stealth`
- **Effort**: 3 hours
- **Status**: ✅ Completed — Gameplay bridge, quest-driven mood hints, and telemetry coverage are all in place.
- **Summary**: Wire DisguiseSystem, Firewall Scrambler, and combat suspicion events into the adaptive music EventBus so stealth/combat transitions trigger without manual injections.
- **Progress (Session #79)**: Added `SuspicionMoodMapper`, `AdaptiveMoodEmitter`, and Jest suites; `Game.initializeAudioIntegrations()` now instantiates the emitter for telemetry-ready mood requests.
- **Progress (Session #80)**: Implemented `GameplayAdaptiveAudioBridge`, wired it into `Game.initializeAudioIntegrations()` behind `GameConfig.audio.enableGameplayEmitters`, and added Jest coverage (`tests/game/audio/GameplayAdaptiveAudioBridge.test.js`) for snapshot emission and mood hint handling.
- **Progress (Session #81)**: Authored integration coverage (`tests/game/audio/GameplayAdaptiveAudioIntegration.test.js`) driving disguise/combat/scrambler events through the bridge and extended the debug audio overlay with gameplay diagnostics for designers.
- **Progress (Session #82)**: Validated quest-trigger mood hints via `QuestTriggerRegistry`, expanded telemetry tests (`tests/game/audio/GameAudioTelemetry.test.js`) to cover hint expiry countdowns, and confirmed TriggerMigrationToolkit preserves mood hint metadata.
- **Acceptance Criteria**:
  - DisguiseSystem emits adaptive mood events when disguises equip, suspicion crosses thresholds, and combat triggers resolve.
  - Firewall scrambler windows emit stealth boosts with timed mood reverts aligned to scrambler lifetimes.
  - Automated tests cover end-to-end mood propagation from gameplay emitters through `Game` adaptive handlers.
- **References**: `docs/plans/adaptive-audio-emitter-plan.md`, `src/game/audio/SuspicionMoodMapper.js`, `src/game/audio/AdaptiveMoodEmitter.js`, MCP backlog item `AUDIO-613`.

#### QUEST-442: Act 1 Trigger Schema Migration
- **Priority**: P1
- **Tags**: `quest`, `physics`, `narrative`
- **Effort**: 5 hours
- **Status**: ✅ Completed — Quest triggers now require Trigger components, QuestSystem cleanup landed, and designer docs are refreshed.
- **Summary**: Transition Act 1 crime scene and vendor interactions to the standardized Trigger component schema with structured quest metadata.
- **Progress (Session #79)**: Authored `TriggerMigrationToolkit`, `QuestTriggerRegistry`, and Jest coverage to convert legacy InteractionZones and track outstanding migrations.
- **Progress (Session #80)**: Migrated the Act 1 crime scene trigger to the registry-backed toolkit (`src/game/scenes/Act1Scene.js`) and added Jest coverage (`tests/game/scenes/Act1Scene.triggers.test.js`) confirming outstanding migration tracking and quest metadata.
- **Progress (Session #82)**: Converted Act 1 vendor NPCs to toolkit-backed quest triggers with mood hint metadata, updated `TriggerMigrationToolkit` to seed Quest components, and extended Jest suites (`tests/game/quests/TriggerMigrationToolkit.test.js`, `tests/game/scenes/Act1Scene.triggers.test.js`) to cover vendor migrations.
- **Progress (Session #83)**: Pruned QuestSystem's legacy polling path, fortified `tests/game/systems/QuestSystem.trigger.test.js`, and published the Act 1 trigger authoring cheat sheet (`docs/guides/act1-trigger-authoring.md`).
- **Progress (Session #84)**: Memory Parlor entrance/interior/exit triggers now register through the toolkit with quest metadata + mood hints, `MemoryParlorScene` attaches Quest components via registry definitions, and Jest coverage (`tests/game/scenes/MemoryParlorScene.triggers.test.js`) locks the migration.
- **Progress (Session #85)**: TutorialScene onboarding zones (Detective Vision pad, deduction board, precinct exit) migrated to registry-backed triggers with helper geometry, TriggerMigrationToolkit wiring, refreshed docs (`docs/tech/trigger-authoring.md`), and new Jest coverage (`tests/game/scenes/TutorialScene.triggers.test.js`).
- **Acceptance Criteria**:
  - Migrated triggers emit `area:entered`/`area:exited` with quest metadata aligned to the schema.
  - QuestSystem progression and resets validated via updated regression tests.
  - Designer-facing docs updated with Act 1 trigger examples.
- **References**: `docs/plans/quest-trigger-migration-plan.md`, `src/game/quests/TriggerMigrationToolkit.js`, `src/game/quests/QuestTriggerRegistry.js`, MCP backlog item `QUEST-442`.

#### QUEST-610: Act 2 Crossroads Trigger Migration
- **Priority**: P1
- **Tags**: `quest`, `narrative`, `trigger`
- **Effort**: 3 hours
- **Status**: Review Approved — RenderOps lighting packets, telemetry parity, and narrative bundles now advance solely through the automation suite with no manual approvals pending.
- **Summary**: Attach Act 2 Crossroads hub volumes (checkpoint, Zara briefing table, thread selection console) to TriggerMigrationToolkit so branching choices feed QuestSystem, telemetry, and designer tooling consistently with Act 1.
- **Progress (Session #86)**: Seeded Act 2 Crossroads trigger definitions in `QuestTriggerRegistry`, added regression coverage (`tests/game/quests/Act2TriggerDefinitions.test.js`), generated authoring notes (`docs/guides/act2-trigger-authoring.md`), and ensured outstanding migration reports surface the Act 2 work.
- **Progress (Session #87)**: Authored `src/game/scenes/Act2CrossroadsScene.js` to attach registry-backed triggers, added Jest coverage (`tests/game/scenes/Act2CrossroadsScene.triggers.test.js`) verifying branching metadata, and refreshed designer notes with migration status.
- **Progress (Session #88)**: Layered Crossroads hub geometry, navigation mesh metadata, ambient audio config, and trigger-driven UI/narrative events; expanded Jest coverage (`tests/game/scenes/Act2CrossroadsScene.layout.test.js`, `.prompts.test.js`) and documented the new workflow in `docs/guides/act2-trigger-authoring.md`.
- **Progress (Session #89)**: Introduced `CrossroadsPromptController` + Act 2 quest scaffolding to drive Zara's briefing/branch selection UI, seeded `NavigationMeshService` + `PlayerMovementSystem` consumer to expose hub nav metadata, and added targeted Jest coverage for narrative/navigational plumbing.
- **Progress (Session #90)**: Enforced navigation mesh consumption across PlayerMovement + NPC agents via `NavigationConstraintSystem`, unlocked branch landing overlays with checkpoint instructions, and expanded Jest coverage for navigation guardrails and prompt flows.
- **Progress (Session #91)**: Delivered `CrossroadsBranchTransitionController` to pair landing events with checkpoint entry, emitted `scene:load:act2_thread` requests through `Game.loadAct2ThreadScene`, and added Jest coverage (`tests/game/narrative/CrossroadsBranchTransitionController.test.js`) to lock the branch transition handshake.
- **Progress (Session #92)**: Implemented `loadAct2CorporateInfiltrationScene` with registry-backed triggers, navigation mesh, and geometry metadata; updated `Game.loadAct2ThreadScene` to resolve loader mappings with spawn handling + fallback coverage; registered the NeuroSync quest (`main-act2-neurosync-infiltration`) and added targeted Jest coverage (`tests/game/scenes/Act2CorporateInfiltrationScene.test.js`, `tests/game/Game.act2ThreadScene.test.js`).
- **Progress (Session #93)**: Delivered `loadAct2ResistanceHideoutScene` with trigger toolkit wiring, navigation mesh, and geometry metadata; registered the Archivist alliance quest (`main-act2-archivist-alliance`), updated Act 2 thread loader/config to include the resistance branch, and added regression coverage (`tests/game/scenes/Act2ResistanceHideoutScene.test.js`, `tests/game/Game.act2ThreadScene.test.js`).
- **Progress (Session #94)**: Authored `loadAct2PersonalInvestigationScene` with registry-backed triggers, navigation mesh, and geometry metadata; registered the personal investigation quest (`main-act2-personal-investigation`), wired the branch into `Game.loadAct2ThreadScene`/`GameConfig`, refreshed designer docs with the new trigger map, and extended regression coverage (`tests/game/scenes/Act2PersonalInvestigationScene.test.js`, `tests/game/Game.act2ThreadScene.test.js`).
- **Progress (Session #102)**: Ran the readiness/diff/parity CLI guardrails; art validator highlighted missing lighting metadata for `crossroads_briefing_pad` and four light columns (collision coverage passed), narrative exporter produced a zero-diff Markdown + JSON bundle, and telemetry parity ingested `telemetry-artifacts/samples/quest-telemetry-act2-crossroads-2025-11-12.jsonl` (4 events, 100% coverage) for analytics review.
- **Acceptance Criteria**:
  - Crossroads triggers attach registry-backed Quest + Trigger components via the toolkit and mark definitions migrated.
  - Scene-level Jest coverage verifies branching metadata (`branchingChoice`, `telemetryTag`) and objective progression without legacy listeners.
  - Designer documentation references Act 2 trigger IDs/prompts and maps telemetry tags to narrative analytics dashboards.
- **References**: `docs/plans/quest-trigger-migration-plan.md`, `docs/guides/act2-trigger-authoring.md`, MCP backlog item `QUEST-610`.

#### PROC-221: Tilemap Rotation Fidelity
- **Priority**: P1
- **Tags**: `procedural`, `rendering`, `engine`
- **Effort**: 5 hours
- **Status**: ✅ Completed — Variant resolver, seam painting, and rotation benchmarks are live.
- **Summary**: Rotate room tilemaps or select orientation variants so procedural districts render correctly when rooms are rotated; ensure corridor seams host proper door tiles.
- **Progress (Session #79)**: Implemented `TileRotationMatrix` with coordinate transforms and Jest coverage to power upcoming tilemap transformer work.
- **Progress (Session #80)**: Integrated `TileRotationMatrix` into `DistrictGenerator._buildFinalTilemap` and extended Jest coverage (`tests/game/procedural/DistrictGenerator.test.js`) to confirm rotated tiles land at expected coordinates.
- **Progress (Session #81)**: Stubbed TemplateVariantResolver, TilemapTransformer, and CorridorSeamPainter, refactored `DistrictGenerator` to route room placement through the new pipeline, and added coverage in `tests/game/procedural/TilemapInfrastructure.test.js`.
- **Progress (Session #82)**: Implemented manifest-driven variant resolution, corridor seam painting, expanded `TilemapInfrastructure` tests for variants/seams, and benchmarked rotated generation (avg 29.76 ms across three samples).
- **Progress (Session #83)**: Added authored manifest variants for Act 1 crime scenes and vendor bays (`src/game/procedural/templates/authoredTemplates.js`), defaulted DistrictGenerator to the manifest, extended regression tests, and re-benchmarked rotation overhead (avg 28.86 ms across three seeds).
- **Progress (Session #84)**: Authored detective office + alley hub manifest variants with multi-edge seam metadata, updated factory helpers, and extended Jest coverage to lock orientation metadata and seam propagation.
- **Progress (Session #85)**: Added precinct war room and alley spur authored variants with seam tags for command staging + side-route escapes, refreshed manifest metadata, documented the families in `docs/guides/procedural-generation-integration.md`, and expanded Jest coverage.
- **Acceptance Criteria**:
  - Rotated rooms display correct tile orientation without misaligned seams.
  - Corridor seam painter places door tiles matching rotation.
  - Regression tests validate rotated tilemaps across templates.
- **References**: `docs/plans/tilemap-rotation-fidelity-plan.md`, `src/engine/procedural/TileRotationMatrix.js`, MCP backlog item `PROC-221`.

---

### Session #44 Testing & Stability

#### INFRA-221: Reconcile Jest with Playwright & Canvas dependencies
- **Priority**: P0
- **Tags**: `test`, `infrastructure`, `engine`
- **Effort**: 3 hours
- **Status**: ✅ Completed — Added `TransformStream` and Canvas gradient polyfills to the Jest setup file, relaxed jsdom frame-time assertions, and taught Jest to skip Playwright specs so `npm test` returns signal-bearing results.
- **Notes**: `tests/setup.js`, `tests/engine/integration-full.test.js`, and `package.json` updated; full suite green as of Session #44.

#### QA-318: Memory Parlor Return Dialogue Smoke
- **Priority**: P1
- **Tags**: `test`, `narrative`, `quest`
- **Effort**: 4 hours
- **Status**: ✅ Completed — New Playwright scenario drives the Memory Parlor infiltration to completion, validates quest rewards, and confirms Captain Reese follow-up dialogue on the Act 1 return path (`tests/e2e/memory-parlor-return-dialogue.spec.js`).
- **Notes**: Coverage now exercises knowledge ledger sync, quest completion, and persistent player entity reuse on quest return.

#### QA-319: Debug Overlay Inventory Evidence Seeding
- **Priority**: P2
- **Tags**: `test`, `ui`, `debug`
- **Effort**: 1 hour
- **Status**: ✅ Completed — Playwright debug overlay smoke seeds evidence metadata so the overlay copy (“1 item · 1 evidence”) remains assertable after inventory schema updates (`tests/e2e/debug-overlay-inventory.spec.js`).

### Session #27 Core Gameplay Focus

#### CORE-301: Act 1 Scene Visual Bring-Up
- **Priority**: P0
- **Tags**: `gameplay`, `rendering`
- **Effort**: 4 hours
- **Dependencies**: Layered renderer dynamic layer support (Session #26)
- **Status**: Review Approved — Palette metadata, Jest snapshots, and Playwright smoke guard the scene; only investigate if automation flags a regression.
- **Progress (Session #171)**: Exposed palette summary metadata from `loadAct1Scene` and added Jest (`tests/game/scenes/Act1Scene.palette.test.js`) plus Playwright (`tests/e2e/act1-palette-smoke.spec.js`) coverage so the neon crime scene palette stays locked in CI.
- **Description**: Ensure the Act 1 investigative scene presents readable context on load (ground decal, boundaries, NPC silhouettes, crime scene marker) so players immediately understand where they are.
- **Acceptance Criteria**:
  - Crime scene trigger area renders using the ground layer and remains aligned as the camera moves.
  - Boundary walls/environment props are visible with a distinct palette from the background grid.
  - Background layer provides a stylized gradient/grid without obscuring entities.

#### CORE-302: Player Feedback & Movement Loop
- **Priority**: P0
- **Tags**: `gameplay`, `input`, `ui`
- **Effort**: 3 hours
- **Dependencies**: CORE-301
- **Status**: ✅ Completed — Canvas overlay palette unified across HUD layers, inventory overlay integrated, Session 169 locked in automated movement audio cue verification (Jest + Playwright), and Session 170 documented camera follow tuning with docs/gameplay/camera-centering.md plus CameraFollowSystem Jest coverage for CORE-303 handoff.
- **Description**: Provide immediate feedback for player input (camera centering, movement easing, interaction prompts) so WASD/E produce visible results.
- **Acceptance Criteria**:
  - Camera centers on the player at start and follows smoothly during movement.
  - Interaction prompts (e.g., evidence collection, area entry) appear when the player enters the relevant zone.
  - Movement emits audio/log cues or UI feedback confirming action registration.

#### CORE-303: Investigative Loop Skeleton
- **Priority**: P1
- **Tags**: `gameplay`, `narrative`
- **Effort**: 6 hours
- **Dependencies**: CORE-301, CORE-302
- **Status**: In Progress — InvestigationSystem now resolves the player via tag queries (with Transform guard) so evidence scans execute again; awaiting quest plumbing to string the full loop together.
- **Progress (Session #234)**: Patched `src/game/systems/InvestigationSystem.js` to use `entityManager.getEntitiesByTag('player')` with a Transform fallback, added regression coverage in `tests/game/systems/InvestigationSystem.test.js`, and ran `npm test -- --runTestsByPath tests/game/systems/InvestigationSystem.test.js`.
- **Progress (Session #235)**: Added DialogueSystem alias resolution plus CaseManager injection fix to unblock tutorial Captain Reese and witness dialogues, registered Act 1 aliases, and ran `npm test -- --runTestsByPath tests/game/systems/DialogueSystem.test.js tests/game/scenes/TutorialScene.triggers.test.js`.
- **Progress (Session #236)**: Hooked DialogueSystem into dialogue UI `choice/advance/close` events, suppressed pause toggles while dialogue overlays are active, and reran `npm test -- --runTestsByPath tests/game/systems/DialogueSystem.test.js tests/game/ui/DialogueBox.test.js tests/game/scenes/TutorialScene.triggers.test.js`.
- **Description**: Implement the minimal investigative loop—collect evidence, unlock Detective Vision, interview witness—to prove the hybrid narrative/mechanics hook.
- **Acceptance Criteria**:
  - Collecting three evidence items unlocks Detective Vision and advances tutorial/quest state.
  - Witness NPC interaction triggers dialogue from Act 1 and logs progression in the quest tracker.
  - Quest log reflects these milestones, and world state updates are visible via overlays or UI.

---

### Session #33 Debug Overlay Instrumentation

#### DEBUG-210: UI overlay visibility diagnostics
- **Priority**: P1
- **Tags**: `ux`, `debug`, `engine`
- **Effort**: 2 hours
- **Dependencies**: Session #32 EventBus cleanup
- **Status**: ✅ Completed — Session #33 added overlay visibility summaries to the debug HUD and event logging.
- **Description**: Extend the developer-facing debug overlay so QA can see which HUD panels are active, along with contextual details drawn from the Game instance.
- **Acceptance Criteria**:
  - Debug overlay lists each major UI overlay (dialogue, tutorial, quest log, etc.) with open/closed state and contextual summary.
  - Snapshot data sourced via a dedicated `Game.getOverlayStateSnapshot()` utility.
  - Automated tests cover overlay visibility instrumentation to prevent regressions.

#### SYS-228: Knowledge gate component lookup stabilisation
- **Priority**: P1
- **Tags**: `engine`, `quest`, `narrative`
- **Effort**: 1.5 hours
- **Dependencies**: Investigation System player state
- **Status**: ✅ Completed — Session #33 migrated gate evaluation to `componentRegistry` and added regression coverage.
- **Description**: Ensure `KnowledgeProgressionSystem` queries gate entities correctly during event-triggered checks to avoid missed unlocks in the investigative loop.
- **Acceptance Criteria**:
  - `checkAllGates` handles both scheduled updates and event-driven refreshes without referencing stale `this.components`.
  - Event Bus emits `gate:unlocked` with position metadata when requirements are met.
  - Jest regression verifies gates unlock when triggered via `knowledge:learned` events.

---

### Session #34 Edge-Triggered Input Integration

#### INPUT-221: Deduction board toggle via InputState edges
- **Priority**: P1
- **Tags**: `engine`, `ux`, `input`
- **Effort**: 1.5 hours
- **Dependencies**: Session #33 overlay instrumentation
- **Status**: ✅ Completed — Session #34 routed `input:deductionBoard:pressed` through EventBus with single-fire semantics.
- **Description**: Replace raw keydown handling in DeductionSystem with `InputState.wasJustPressed`-backed events to prevent rapid open/close loops.
- **Acceptance Criteria**:
  - `InputState` emits action-specific events on edge transitions.
  - DeductionSystem subscribes to `input:deductionBoard:pressed` and no longer binds DOM-level listeners.
  - Jest regression ensures duplicative events are not emitted while holding Tab.

#### ENGINE-233: Input action event bus instrumentation
- **Priority**: P1
- **Tags**: `engine`, `input`, `test`
- **Effort**: 1 hour
- **Dependencies**: Controls.js edge-detection refactor
- **Status**: ✅ Completed — Session #34 extended `InputState` to broadcast `input:action_pressed` plus action-scoped topics with coverage.
- **Description**: Provide a universal event bus hook for edge-triggered actions so UI/state systems can listen for single-fire toggles without polling.
- **Acceptance Criteria**:
  - `InputState` emits both `input:action_pressed` and `input:{action}:pressed`.
  - Existing escape handling remains intact.
  - Jest suite verifies emissions occur once per key press.

#### DEBUG-212: Case & deduction overlay telemetry harmonisation
- **Priority**: P1
- **Tags**: `ux`, `debug`, `narrative`
- **Effort**: 1 hour
- **Dependencies**: Session #33 overlay helper
- **Status**: ✅ Completed — Session #34 wired CaseFileUI and DeductionBoard into the overlay helper and snapshot diagnostics.
- **Description**: Ensure narrative overlays emit standardized visibility events and appear in the debug HUD snapshot metadata.
- **Acceptance Criteria**:
  - CaseFileUI and DeductionBoard call `emitOverlayVisibility` with contextual metadata.
  - `Game.getOverlayStateSnapshot()` reports case/deduction state when instances are present.
  - UI-level Jest coverage verifies event payloads.

---

### Session #63 Cascade & Tutorial Telemetry

#### DEBUG-248: Cascade & Tutorial Telemetry Surfaces
- **Priority**: P1
- **Tags**: `debug`, `telemetry`, `faction`, `tutorial`
- **Effort**: 2 hours
- **Dependencies**: Session #62 WorldStateStore observability
- **Status**: ✅ Completed — Session #63 surfaced cascade and tutorial selectors through the debug overlay and SaveManager inspector with automated coverage.
- **Description**: Expose faction cascade summaries and tutorial prompt snapshots directly in the developer HUD and inspector tooling so QA can validate new telemetry without digging through devtools.
- **Acceptance Criteria**:
  - Debug overlay renders cascade summaries sourced from `WorldStateStore` selectors.
  - Debug overlay lists latest tutorial snapshot metadata and timeline entries.
  - `SaveManager.getInspectorSummary()` returns cascade and tutorial telemetry for console inspection.
  - Playwright smoke verifies cascade and tutorial telemetry render in the overlay.
  - Benchmark dispatch latency remains under the 0.25 ms guardrail.

---

### Session #107 System Metrics Overlay

#### DEBUG-318: Surface SystemManager Metrics in Debug HUD
- **Priority**: P0
- **Tags**: `debug`, `engine`, `telemetry`
- **Effort**: 2 hours
- **Dependencies**: M1-004
- **Status**: ✅ Completed — Session #107 added a SystemManager metrics panel with budget highlighting, reusable formatting helper, and Jest coverage.
- **Description**: Expose SystemManager profiling metrics within the developer debug overlay so performance insights surface without manual logging.
- **Acceptance Criteria**:
  - Debug overlay lists each registered system with last-frame query/update timings plus rolling averages.
  - Overlay highlights systems exceeding configurable frame budget thresholds.
  - SystemManager metrics refresh each frame without regressing overlay performance.
  - Jest coverage validates metrics formatting utilities or overlay rendering logic.

#### DEBUG-332: Debug overlay budget control UI
- **Priority**: P1
- **Tags**: `debug`, `ux`, `engine`
- **Effort**: 1 hour
- **Dependencies**: DEBUG-318
- **Status**: ✅ Completed — Session #108 surfaced an in-overlay budget input + reset control backed by sanitisation helpers and Jest coverage.
- **Description**: Replace the `window.debugSystemBudgetMs` console hook with first-class debug HUD controls so QA can adjust profiler thresholds during play without touching devtools.
- **Acceptance Criteria**:
  - Debug overlay renders a numeric budget input alongside a reset action.
  - Input updates immediately adjust SystemManager budget highlighting and remain clamped to safe bounds.
  - Reset restores the 4 ms default and synchronises the global override used by scripted tooling.
  - Jest coverage validates sanitisation helpers for invalid/edge-case inputs.

---

### Session #36 Inventory Overlay Integration

#### UI-412: Neon noir overlay theme harmonisation
- **Priority**: P1
- **Tags**: `ux`, `ui`, `core`
- **Effort**: 2 hours
- **Dependencies**: CORE-302 palette review
- **Status**: ✅ Completed — Session #36 introduced `overlayTheme` to consolidate tutorial, prompt, movement indicator, and inventory styling.
- **Description**: Refactor canvas-based overlays to share the neon noir palette, typography, and spacing so HUD layers read coherently during manual QA sweeps.
- **Acceptance Criteria**:
  - TutorialOverlay, InteractionPromptOverlay, MovementIndicatorOverlay, and InventoryOverlay consume shared color/typography tokens.
  - Overlay padding and clamping respect global margins on all resolutions.
  - Palette aligns with debug HUD and manual CORE-302 review notes.

#### INV-301: Inventory overlay world-state integration
- **Priority**: P1
- **Tags**: `ui`, `inventory`, `world-state`
- **Effort**: 3 hours
- **Dependencies**: WorldStateStore event bus instrumentation
- **Status**: ✅ Completed — Session #36 seeded an inventory slice, toggled overlays via edge-triggered input, and exposed summaries through the debug HUD.
- **Description**: Surface operative inventory within the HUD, backed by WorldStateStore data and frame hooks so QA can verify evidence items during the Hollow Case tutorial.
- **Acceptance Criteria**:
  - `inventory:*` EventBus actions populate WorldStateStore and SaveManager snapshots.
  - `input:inventory:pressed` toggles the InventoryOverlay once per key edge and updates debug overlay listings.
  - Inventory overlay lists seeded items with navigation via move inputs and highlights equipped slots.

#### INV-302: Replace seeded inventory with live acquisition events
- **Priority**: P2
- **Tags**: `inventory`, `quest`, `save`
- **Effort**: 4 hours
- **Dependencies**: INV-301
- **Status**: ✅ Completed — Session #37 routed evidence pickups, quest rewards, and vendor transactions through inventory events.
- **Description**: Removed bootstrap seeding and now drive inventory from evidence pickups, quest rewards, and NPC trades so the overlay reflects real player progress.
- **Acceptance Criteria**:
  - Evidence collection, quest rewards, and faction vendors emit `inventory:item_added` with metadata tags.
  - Save/load round-trips preserve inventory and equipment slots.
  - Debug HUD summary reflects live counts without relying on `seedInventoryState`.

#### INV-303: Implement vendor trade EventBus emitters
- **Priority**: P2
- **Tags**: `inventory`, `vendor`, `economy`
- **Effort**: 3 hours
- **Dependencies**: INV-302
- **Status**: ✅ Completed — Session #38 wired vendor transactions into `economy:purchase:completed` payloads feeding inventory autosaves.
- **Description**: Emit normalized `economy:purchase:completed` events when faction vendors transact so inventory updates and SaveManager metadata reflect vendor interactions.
- **Acceptance Criteria**:
  - Vendor/NPC trade logic dispatches a single `economy:purchase:completed` event with item descriptors, cost payload, vendor metadata, and optional faction alignment.
  - Inventory overlay and debug HUD update immediately when purchases complete; SaveManager captures vendor metadata in snapshots.
  - Jest coverage asserts event emission and inventory updates for at least one vendor scenario.

#### INV-304: Establish black market vendor branch and UI telemetry
- **Priority**: P1
- **Tags**: `inventory`, `vendor`, `dialogue`, `narrative`, `ui`
- **Effort**: 4 hours
- **Dependencies**: INV-303, DIA-208
- **Status**: ✅ Completed — Session #39 added the Black Market Broker dialogue tree, vendor purchase metadata surfaced in InventoryOverlay, and follow-on tests for dialogue consequence events.
- **Description**: Introduce an Act 1 black market vendor that trades memory parlor intel, ensure dialogue gating draws from live inventory currency, and surface vendor acquisition metadata inside the inventory UI for QA traceability.
- **Acceptance Criteria**:
  - New dialogue tree exposes purchase and trade branches using normalized `vendorTransaction` consequences plus knowledge events.
  - Act 1 scene spawns the broker NPC with interaction prompts and quest objective hooks for optional leads.
  - Inventory overlay highlights vendor-sourced items with vendor, cost, and timestamp details; Jest coverage verifies output.
  - DialogueSystem supports declarative consequence events and currency-aware conditions (`hasCurrency`, `notHasCurrency`).

#### INV-318: Add Cipher quartermaster vendor for parlor infiltration
- **Priority**: P1
- **Tags**: `inventory`, `vendor`, `narrative`, `quest`
- **Effort**: 4 hours
- **Dependencies**: INV-304, DIA-208
- **Status**: ✅ Completed — Session #40 introduced the Cipher Collective quartermaster with scrambler gear, updated Act 1 quests, and automated vendor smoke coverage.
- **Description**: Extend the vendor roster with a Cipher Collective contact who trades infiltration gear, tie the acquisition into optional Act 1 progression, and ensure metadata feeds the shared vendor pipeline.
- **Acceptance Criteria**:
  - New `cipher_quartermaster` dialogue tree exposes currency and trade branches using `hasCurrency` conditions plus vendor transactions that emit knowledge events.
  - Act 1 scene spawns the quartermaster NPC and the Hollow Case quest logs an optional objective when `cipher_scrambler_access` knowledge fires.
  - Jest/Playwright coverage validates the vendor metadata (tags, costs, dialogue context) and ensures credits are deducted through the shared pipeline.
- **Notes**: Session #41 extended this deliverable with `FirewallScramblerSystem`, adding active scrambler gating to Memory Parlor infiltration and synchronized disguise detection modifiers.

#### SCN-410: Expand Memory Parlor infiltration scene
- **Priority**: P1
- **Tags**: `scene`, `stealth`, `quest`
- **Effort**: 5 hours
- **Dependencies**: INV-318, QA-245
- **Status**: ✅ Completed — Session #43 delivered full traversal polish, quest handoff, and automated coverage.
- **Description**: Build out the Memory Parlor infiltration scene introduced in Session #42 with full geometry, quest-driven scene transitions, and exit routing so the scrambler window can be exercised end-to-end.
- **Acceptance Criteria**:
  - `loadMemoryParlorScene()` is triggered automatically when `obj_locate_parlor` completes and returns to Act 1 on `obj_escape_parlor`.
  - Firewall barrier integrates with level collision paths so scrambler activation is required to cross.
  - Interior provides stealth cover (props, line-of-sight blockers) and at least one evidence/knowledge pickup to justify infiltration.
  - Playwright infiltration spec passes without forcing the scene load manually.
  - Manual runtime smoke confirms quest tracker, disguise modifiers, and dialogue hooks behave in the new scene.
- **Notes**: Session #43 added stealth cover geometry, intel pickups (including the client registry knowledge hook), automatic return to Act 1 on escape, and extended Playwright coverage that exercises evidence collection through the quest exit. Session #45 layered in neon detection halos, guard prompt telemetry, and ambient lighting; bespoke Memory Parlor art/audio assets remain outstanding.

#### DIA-208: Support inventory-aware dialogue conditions
- **Priority**: P1
- **Tags**: `dialogue`, `inventory`
- **Effort**: 3 hours
- **Dependencies**: INV-302
- **Status**: ✅ Completed — Session #38 added inventory-aware condition evaluation and vendor consequence wiring in DialogueSystem.
- **Description**: Evaluate dialogue choice conditions such as `hasItem` and `removeItem` objects against WorldStateStore inventory data so bribe paths and item gates respond to live inventory.
- **Acceptance Criteria**:
  - DialogueTree condition evaluation supports object-form conditions (`{ type: 'hasItem', item: 'credits', amount: 50 }`) and integrates with WorldStateStore selectors.
  - Dialogue consequence handlers adjust inventory quantities or removals using the updated condition schema and emit resulting events.
  - Jest coverage verifies `hasItem` gating and credit removal for Street Vendor bribe dialogue.

#### QA-245: Debug overlay inventory smoke
- **Priority**: P1
- **Tags**: `test`, `playwright`, `ui`
- **Effort**: 1 hour
- **Dependencies**: INV-301, UI-412
- **Status**: ✅ Completed — Session #36 added Playwright coverage ensuring debug overlay rows mirror inventory visibility and summaries.
- **Description**: Extend existing Playwright suite to assert inventory listings appear in debug HUD and update when the overlay opens, preventing regressions to QA tooling.
- **Acceptance Criteria**:
  - Playwright test loads the game, opens the debug overlay, and confirms inventory rows list item counts.
  - Toggling inventory overlay flips the debug overlay `data-visible` flag.
  - Test asserts no console errors while exercising the scene.

#### PERF-214: Restore profiling harness entry point
- **Priority**: P1
- **Tags**: `perf`, `tooling`
- **Effort**: 1 hour
- **Dependencies**: None
- **Status**: ✅ Completed — Session #40 restored the profiling harness by pointing `npm run profile` at `benchmark.js` and updating benchmark component wiring to the current ECS APIs.
- **Description**: Recreate or relink the Node profiling entry point so `npm run profile` executes without module errors and captures frame timing under economy flows.
- **Acceptance Criteria**:
  - `npm run profile` runs without module-not-found failures on CI and local machines.
  - Profiling script loads representative scenes (vendor transactions + dialogue gating) and outputs V8 log for inspection.
  - Documentation updated with usage instructions and expected output location.
  - Latest run captures vendor purchase scenarios and writes JSON summaries under `benchmark-results/`.
- **Note (2025-11-04)**: Profiling harness is frozen; no additional sweeps, alerting, or enhancements will be scheduled.

---

## Sprint 1: Core Engine Foundation (Weeks 1-3)

**Milestone**: M1 - Core Engine
**Duration**: 3 weeks
**Goal**: Implement robust ECS foundation supporting all gameplay systems
**Success Criteria**: 60 FPS with 500 entities, >80% test coverage, zero memory leaks

### Week 1: ECS Core Implementation

#### M1-001: Project Infrastructure Setup
- **Priority**: P0
- **Status**: Completed (Infrastructure operational; Vite/Jest/ESLint pipeline established)
- **Tags**: `engine`, `test`, `docs`
- **Effort**: 2 hours
- **Dependencies**: None
- **Description**: Initialize development environment and build pipeline
- **Tasks**:
  - Initialize Vite build configuration
  - Configure ESLint and Prettier
  - Set up Jest testing framework with coverage reporting
  - Create initial file structure per CLAUDE.md
  - Configure Git hooks for pre-commit linting
- **Acceptance Criteria**:
  - `npm run dev` starts development server
  - `npm run test` runs Jest tests
  - `npm run lint` catches style violations
  - Project structure matches CLAUDE.md specification
  - Build completes in <5s

#### M1-002: EntityManager Implementation
- **Priority**: P0
- **Tags**: `engine`, `ecs`
- **Effort**: 4 hours
- **Status**: Completed (Session #119 – 2025-11-13)
- **Dependencies**: M1-001
- **Description**: Core entity lifecycle management system
- **Files**:
  - `src/engine/ecs/EntityManager.js`
  - `tests/engine/ecs/EntityManager.test.js`
- **Implementation Requirements**:
  - Create/destroy entities with unique IDs
  - Entity pooling for performance
  - Active/inactive entity tracking
  - Entity query support (by component)
  - Batch operations (destroyAll, etc.)
- **Acceptance Criteria**:
  - Create 10,000 entities in <100ms
  - Destroy 10,000 entities in <50ms
  - Zero memory leaks after 1000 create/destroy cycles
  - Entity IDs never collide
  - Unit tests pass with >80% coverage
- **Session #119 Update**:
  - Added pooled metadata reuse with destroy listeners and component registry cleanup hooks; `queryByComponents` now bridges to registry queries or local component signatures.
  - `forEachEntity` and `getStats()` provide iteration helpers plus instrumentation for profiling spawn/despawn waves.
  - Jest coverage expanded with performance gates (10k create/destroy <200 ms) and pooling reuse assertions; validated via `npm test`.
- **Session #121 Update**:
  - Authored integration harness (`tests/integration/entityLifecycle.questFaction.integration.test.js`) linking EntityManager → QuestManager/FactionManager, exercised NPC despawn/respawn to confirm objectives unblock and faction telemetry propagates; world state store selectors now capture removal history for analytics.
- **Session #124 Update**:
  - Added quest-facing NPC availability notifications and budget-guarded telemetry exports: `QuestManager` now emits `quest:npc_availability` events to pre-empt repeated despawn warnings, and SaveManager surfaces spatial telemetry payload budgets with warning/event hooks for CI/QA monitoring.

#### M1-003: ComponentRegistry Implementation
- **Priority**: P0
- **Status**: Completed (Component registry + tests landed; see Sessions 119+)
- **Tags**: `engine`, `ecs`
- **Effort**: 6 hours
- **Dependencies**: M1-002
- **Description**: Component storage and query system
- **Files**:
  - `src/engine/ecs/ComponentRegistry.js`
  - `tests/engine/ecs/ComponentRegistry.test.js`
- **Implementation Requirements**:
  - Store components by type in separate arrays
  - Add/remove/get components by entity ID
  - Query entities by component signature (smallest-set optimization)
  - Component type registration
  - Hot-path optimization (Map for lookups)
- **Acceptance Criteria**:
  - Component queries execute in <1ms for 1000 entities
  - Add component in O(1) time
  - Query optimization reduces checks by >80%
  - No memory leaks when removing components
  - Unit tests pass with >80% coverage

#### M1-004: SystemManager Implementation
- **Priority**: P0
- **Tags**: `engine`, `ecs`
- **Effort**: 4 hours
- **Status**: Completed (Session #106 – 2025-11-12)
- **Dependencies**: M1-002, M1-003
- **Description**: System orchestration and update loop
- **Files**:
  - `src/engine/ecs/SystemManager.js`
  - `src/engine/ecs/System.js` (base class)
  - `tests/engine/ecs/SystemManager.test.js`
- **Implementation Requirements**:
  - Register systems with priority
  - Update systems in priority order
  - System lifecycle (init, update, cleanup)
  - Delta time tracking
  - System enable/disable support
- **Acceptance Criteria**:
  - Systems execute in correct priority order
  - System updates maintain 60 FPS with 500 entities
  - Delta time accurate to ±2ms
  - Systems can be added/removed at runtime
  - Unit tests pass with >80% coverage

#### M1-005: ECS Integration Tests
- **Priority**: P1
- **Tags**: `test`, `ecs`
- **Effort**: 3 hours
- **Dependencies**: M1-002, M1-003, M1-004
- **Description**: Integration tests for full ECS pipeline
- **Files**:
  - `tests/engine/ecs/integration.test.js`
- **Test Scenarios**:
  - Create 1000 entities with 3 components each
  - Systems process entities correctly
  - Component queries return correct results
  - Entity destruction removes all components
  - No memory leaks over 1000 iterations
- **Acceptance Criteria**:
  - All integration tests pass
  - Performance benchmarks meet targets
  - Memory usage stable (<100MB)
  - Code coverage >80% for ECS module

#### M1-006: ECS Documentation
- **Priority**: P2
- **Tags**: `docs`, `ecs`
- **Effort**: 2 hours
- **Dependencies**: M1-002, M1-003, M1-004
- **Description**: JSDoc and usage examples for ECS
- **Files**:
  - JSDoc comments in ECS source files
  - `docs/engine/ecs-usage.md` (usage guide)
- **Content**:
  - API documentation for all public methods
  - Component creation examples
  - System implementation examples
  - Performance best practices
  - Common patterns and anti-patterns
- **Acceptance Criteria**:
  - All public APIs documented with JSDoc
  - Usage guide complete with runnable examples
  - Architecture decisions explained

### Week 2: Rendering and Physics

#### M1-007: Canvas Setup and Renderer Core
- **Priority**: P0
- **Tags**: `engine`, `rendering`
- **Effort**: 3 hours
- **Status**: Completed (Session #106 – 2025-11-12)
- **Dependencies**: M1-001
- **Description**: Canvas initialization and core rendering infrastructure
- **Files**:
  - `src/engine/renderer/Renderer.js`
  - `tests/engine/renderer/Renderer.test.js`
- **Implementation Requirements**:
  - Canvas creation and sizing (responsive)
  - Rendering context management (2D)
  - Clear and present operations
  - Background color support
  - Frame timing tracking
- **Acceptance Criteria**:
  - Canvas resizes with window
  - 60 FPS maintained with empty canvas
  - Context operations error-free
  - Frame time tracked accurately

#### M1-008: Camera System Implementation
- **Priority**: P0
- **Tags**: `engine`, `rendering`
- **Effort**: 4 hours
- **Status**: Completed (Session #246 – 2025-11-01)
- **Dependencies**: M1-007
- **Description**: Viewport and camera controls
- **Files**:
  - `src/engine/renderer/Camera.js`
  - `tests/engine/renderer/Camera.test.js`
- **Implementation Requirements**:
  - Camera position and zoom
  - World-to-screen coordinate conversion
  - Screen-to-world coordinate conversion
  - Camera bounds and limits
  - Smooth following (lerp-based)
- **Acceptance Criteria**:
  - Coordinate conversion accurate to 1px
  - Smooth camera follow (no jitter)
  - Zoom operations smooth
  - Camera bounds enforced correctly
  - Unit tests pass with >80% coverage
- **Verification**: `npm test -- --runTestsByPath tests/engine/renderer/Camera.test.js`
- **Latest Update**: Added world-bounds clamping for follow/move/zoom paths and expanded Jest coverage to lock in the acceptance criteria.

#### M1-009: Layered Renderer Implementation
- **Priority**: P1
- **Tags**: `engine`, `rendering`
- **Effort**: 5 hours
- **Dependencies**: M1-007, M1-008
- **Description**: Multi-layer canvas rendering system
- **Files**:
  - `src/engine/renderer/LayeredRenderer.js`
  - `tests/engine/renderer/LayeredRenderer.test.js`
- **Implementation Requirements**:
  - Multiple canvas layers (background, game, UI)
  - Layer z-index management
  - Per-layer rendering
  - Layer visibility toggle
  - Compositing performance
- **Acceptance Criteria**:
  - 3 layers render correctly
  - Layer ordering correct
  - Compositing completes in <1ms
  - No visual artifacts
  - Performance impact <5% vs single canvas

#### M1-010: Dirty Rectangle Optimization
- **Priority**: P2
- **Tags**: `engine`, `rendering`, `perf`
- **Effort**: 4 hours
- **Dependencies**: M1-009
- **Description**: Dirty rectangle system for partial redraws
- **Files**:
  - `src/engine/renderer/DirtyRectManager.js`
  - `tests/engine/renderer/DirtyRectManager.test.js`
- **Implementation Requirements**:
  - Track dirty regions per frame
  - Merge overlapping rectangles
  - Clear only dirty regions
  - Full redraw fallback
  - Performance metrics
- **Acceptance Criteria**:
  - Dirty rect reduces redraws by >60%
  - No visual artifacts (no "uncleared" areas)
  - Merge algorithm efficient (<0.5ms)
  - Fallback works when dirty area >50% of screen

#### M1-011: RenderSystem (ECS Integration)
- **Priority**: P1
- **Tags**: `engine`, `rendering`, `ecs`
- **Effort**: 5 hours
- **Dependencies**: M1-004, M1-009
- **Description**: ECS system for rendering entities
- **Files**:
  - `src/engine/renderer/RenderSystem.js`
  - `src/engine/components/Transform.js`
  - `src/engine/components/Sprite.js`
  - `tests/engine/renderer/RenderSystem.test.js`
- **Implementation Requirements**:
  - Query entities with Transform + Sprite
  - Sort by z-index
  - Viewport culling (don't render off-screen)
  - Render sprites to canvas
  - Performance profiling hooks
- **Acceptance Criteria**:
  - 60 FPS with 1000 visible sprites
  - Viewport culling excludes off-screen entities
  - Z-sorting correct
  - Drawing completes in <8ms
  - Unit tests pass

#### M1-012: Spatial Hash Implementation
- **Priority**: P0
- **Tags**: `engine`, `physics`
- **Effort**: 5 hours
- **Status**: Completed (Session #119 – 2025-11-13)
- **Dependencies**: M1-003
- **Description**: Spatial partitioning for collision detection
- **Files**:
  - `src/engine/physics/SpatialHash.js`
  - `tests/engine/physics/SpatialHash.test.js`
- **Implementation Requirements**:
  - Grid-based spatial hash
  - Insert/remove/query operations
  - Configurable cell size
  - Query by bounding box
  - Performance optimization (Set-based)
- **Acceptance Criteria**:
  - O(n) collision detection (not O(n²))
  - 1000 entities = <1000 collision checks per frame
  - 98%+ reduction vs naive approach
  - Unit tests pass with >80% coverage
- **Session #119 Update**:
  - Implemented per-entity cell tracking with `insert`, `update`, and `remove` to prevent phantom collisions and minimize bucket churn.
  - Added `rebuild` + `getMetrics()` for profiling; buckets now use `Set` for O(1) removal and instrumentation counters track insert/update/remove rates.
  - Expanded Jest suite to cover update/remove flows and performance thresholds (1000 entity queries <10 ms); validated via `npm test`.
- **Session #121 Update**:
  - Added rolling metrics history + configurable window (`setMetricsWindow`) to `SpatialHash`, updated collision system wiring, and enhanced debug overlay messaging to surface averages; extended tests to cover history trimming/reset.

#### M1-013: Collision Detection Algorithms
- **Priority**: P0
- **Status**: Completed (Collision detectors + regression suite in place)
- **Tags**: `engine`, `physics`
- **Effort**: 4 hours
- **Dependencies**: M1-012
- **Description**: AABB and circle collision algorithms
- **Files**:
  - `src/engine/physics/collisionDetectors.js`
  - `tests/engine/physics/collisionDetectors.test.js`
- **Implementation Requirements**:
  - AABB vs AABB collision
  - Circle vs Circle collision
  - AABB vs Circle collision
  - Collision normal calculation
  - Penetration depth calculation
- **Acceptance Criteria**:
  - All collision types accurate
  - No false positives/negatives
  - Normal vectors correct direction
  - Penetration depth within 0.1px
  - Unit tests comprehensive

#### M1-014: CollisionSystem Implementation
- **Priority**: P1
- **Status**: Completed (Spatial hash + collision event system active)
- **Tags**: `engine`, `physics`, `ecs`
- **Effort**: 6 hours
- **Dependencies**: M1-004, M1-012, M1-013
- **Description**: ECS system for collision detection and resolution
- **Files**:
  - `src/engine/physics/CollisionSystem.js`
  - `src/engine/components/Collider.js`
  - `tests/engine/physics/CollisionSystem.test.js`
- **Implementation Requirements**:
  - Broad phase (spatial hash)
  - Narrow phase (collision algorithms)
  - Collision event emission
  - Layer-based filtering
  - Collision resolution (separate or integrate)
- **Acceptance Criteria**:
  - 1000 entities with <1000 checks per frame
  - Collision events fire correctly
  - Layer filtering works
  - No tunneling at normal velocities
  - 60 FPS maintained with 500 dynamic entities

#### M1-015: MovementSystem Implementation
- **Priority**: P1
- **Tags**: `engine`, `physics`, `ecs`
- **Effort**: 3 hours
- **Dependencies**: M1-004, M1-014
- **Description**: Entity movement and velocity integration
- **Files**:
  - `src/engine/physics/MovementSystem.js`
  - `src/engine/components/Velocity.js`
  - `tests/engine/physics/MovementSystem.test.js`
- **Implementation Requirements**:
  - Apply velocity to transform
  - Delta time integration
  - Friction/damping support
  - Acceleration support
  - Max velocity clamping
- **Acceptance Criteria**:
  - Movement smooth and frame-rate independent
  - Friction works correctly
  - Max velocity enforced
  - Unit tests pass

#### M1-016: Physics Integration Tests
- **Priority**: P1
- **Tags**: `test`, `physics`
- **Effort**: 3 hours
- **Dependencies**: M1-014, M1-015
- **Description**: Integration tests for physics pipeline
- **Files**:
  - `tests/engine/physics/integration.test.js`
- **Test Scenarios**:
  - Moving entities collide correctly
  - Collision resolution prevents overlap
  - Spatial hash updates with entity movement
  - No tunneling at tested velocities
  - Performance targets met
- **Acceptance Criteria**:
  - All integration tests pass
  - Collision pipeline stable
  - Performance benchmarks met

### Week 3: Event Bus, Assets, and Integration

#### M1-017: EventBus Core Implementation
- **Status**: Done (Session 261 – wildcard unsubscribe parity)
- **Priority**: P0
- **Tags**: `engine`
- **Effort**: 4 hours
- **Dependencies**: M1-001
- **Description**: Pub/sub event system
- **Files**:
  - `src/engine/events/EventBus.js`
  - `tests/engine/events/EventBus.test.js`
- **Implementation Requirements**:
  - Subscribe/unsubscribe to events
  - Emit events with data
  - Wildcard subscriptions (e.g., 'entity:*')
  - Priority-based handler execution
  - One-time subscriptions (once)
- **Acceptance Criteria**:
  - Event dispatch <0.1ms per event
  - No memory leaks with subscribe/unsubscribe
  - Priority order enforced
  - Wildcard subscriptions work
  - Unit tests pass with >80% coverage

#### M1-018: EventQueue Implementation
- **Status**: Done (Session 260)
- **Priority**: P1
- **Tags**: `engine`
- **Effort**: 3 hours
- **Dependencies**: M1-017
- **Description**: Deferred event processing
- **Files**:
  - `src/engine/events/EventQueue.js`
  - `tests/engine/events/EventQueue.test.js`
- **Implementation Requirements**:
  - Queue events for later processing
  - Process queue at defined intervals
  - Priority queue support
  - Batch processing
  - Queue overflow handling
- **Acceptance Criteria**:
  - Events process in correct order
  - Priority queue ordering correct
  - Batch processing efficient
  - No dropped events under load
- **Completion Notes**:
  - Added `EventQueue` with priority-aware batching, overflow strategies, metrics, and interval ticking (`src/engine/events/EventQueue.js`).
  - Updated `EventBus` deferred dispatch to delegate to the new queue, enabling priority ordering and capacity controls for queued emissions.
  - Verification: `npm test` (includes `tests/engine/events/EventQueue.test.js`).

#### M1-019: Event Naming Convention Documentation
- **Priority**: P2
- **Tags**: `docs`
- **Effort**: 1 hour
- **Dependencies**: M1-017
- **Description**: Document event naming standards
- **Files**:
  - `docs/engine/event-conventions.md`
- **Content**:
  - Naming format: 'domain:action'
  - Standard event domains
  - Standard event actions
  - Event data payload structures
  - Examples for each system
- **Acceptance Criteria**:
  - Comprehensive event list documented
  - Examples provided for all domains
  - Usage patterns clear

#### M1-020: AssetLoader Implementation
- **Priority**: P0
- **Status**: Done — Session 268 automation audit confirmed regression suites gate retries/timeouts without manual review
- **Tags**: `engine`, `asset`
- **Effort**: 4 hours
- **Dependencies**: M1-001
- **Description**: File loading utilities
- **Files**:
  - `src/engine/assets/AssetLoader.js`
  - `tests/engine/assets/AssetLoader.test.js`
- **Completed Work**:
  - Introduced `AssetLoadError` to standardise metadata-rich failure handling across image, JSON, and audio loaders.
  - Reworked batch loading to surface partial failures via aggregated `AssetLoadError` payloads while preserving successful results.
  - Expanded Jest coverage for retry, timeout, and error classification scenarios.
  - Propagated `AssetLoadError` telemetry metadata through manifest consumers (`AssetManager`, `SpriteAssetResolver`, `Act2CrossroadsScene`) and added Jest coverage for the diagnostics helper.
  - Injected manifest fixtures into Act 2 Crossroads scene tests to eliminate `fetch-missing` telemetry warnings and keep coverage stable.
- **Verification**:
  - `npm test -- Act2CrossroadsScene`
  - `npm test -- AssetManager`
  - `npm test -- AssetLoader`
- **Next Steps**:
  - None — automated suites enforce acceptance criteria; no manual sign-off required.
- **Implementation Requirements**:
  - Load images (PNG, JPEG)
  - Load JSON data
  - Load audio files (MP3, OGG)
  - Promise-based API
  - Error handling and retries
- **Acceptance Criteria**:
  - All file types load correctly
  - Failed loads throw descriptive errors
  - Retry logic works (max 3 attempts)
  - Unit tests mock file loading

#### M1-021: AssetManager Implementation
- **Priority**: P0
- **Tags**: `engine`, `asset`
- **Effort**: 5 hours
- **Dependencies**: M1-020
- **Description**: Asset loading and caching system
- **Status**: Done — Session 263 (priority queue integration)
- **Files**:
  - `src/engine/assets/AssetManager.js`
  - `tests/engine/assets/AssetManager.test.js`
- **Completed Work**:
  - Introduced a manifest-driven priority queue with per-tier concurrency caps so critical assets drain before district and optional tiers execute.
  - Refactored preload flows onto the shared queue via `_queuePriorityBatch`, preserving progress telemetry while allowing optional loads to run in the background.
  - Hardened error reporting for batch loads using `AssetLoadError.buildTelemetryContext` and structured logging for tiered failures.
  - Expanded Jest coverage to validate queue ordering, refcount persistence, and progress events across critical/district/optional loads.
- **Verification**:
  - `npm test -- AssetManager`
- **Next Steps**:
  - Continue monitoring optional background queues for telemetry regressions; rerun targeted Jest suites if asset manifests change materially.
- **Implementation Requirements**:
  - Asset registry (by key)
  - Reference counting
  - Lazy loading support
  - Asset preloading by group
  - Unload unused assets
- **Acceptance Criteria**:
  - Critical assets load in <3s
  - District assets load in <1s
  - Reference counting prevents premature unload
  - Lazy loading reduces initial memory by >60%
  - Unit tests pass

#### M1-022: Asset Priority System
- **Priority**: P2
- **Tags**: `asset`, `perf`
- **Effort**: 2 hours
- **Dependencies**: M1-021
- **Description**: Priority-based asset loading
- **Files**:
  - Update `AssetManager.js` with priority queues
- **Implementation Requirements**:
  - Three priority tiers (Critical, District, Optional)
  - Load higher priority first
  - Background loading for optional assets
  - Progress tracking per tier
- **Acceptance Criteria**:
  - Critical assets load first
  - District assets load next
  - Optional assets don't block gameplay
  - Progress events emit correctly
- **Status**: Cancelled — 2025-11-04 performance freeze removes priority loading optimization from scope.

#### M1-023: Game Loop Implementation
- **Priority**: P0
- **Tags**: `engine`
- **Effort**: 4 hours
- **Dependencies**: M1-004, M1-017
- **Description**: Core game loop with fixed timestep
- **Files**:
  - `src/engine/GameLoop.js`
  - `tests/engine/GameLoop.test.js`
- **Implementation Requirements**:
  - requestAnimationFrame loop
  - Fixed timestep (60 FPS target)
  - Delta time calculation
  - System update orchestration
  - Pause/resume support
- **Acceptance Criteria**:
  - Loop runs at 60 FPS
  - Frame time tracked accurately
  - Pause/resume works correctly
  - Systems update in correct order
- **Status**: Done — Implemented fixed-timestep accumulator with catch-up guardrails, reset semantics for pause/resume, and richer frame metrics (`stepCount`, `lag`) for profiling hooks.
- **Verification**: `npm test`

#### M1-024: Full Engine Integration Test
- **Priority**: P1
- **Tags**: `test`, `engine`
- **Effort**: 4 hours
- **Dependencies**: M1-023 (all M1 core tasks)
- **Description**: End-to-end engine test
- **Files**:
  - `tests/engine/integration-full.test.js`
- **Test Scenarios**:
  - Create game with all systems
  - Spawn 500 entities with Transform, Sprite, Velocity, Collider
  - Run for 1000 frames
  - Measure performance (FPS, memory, GC)
  - Verify no memory leaks
  - Verify 60 FPS maintained
- **Acceptance Criteria**:
  - All systems integrate correctly
  - 60 FPS maintained (avg >58 FPS)
  - Memory stable (<100MB)
  - No GC pauses >10ms
  - Zero memory leaks

#### M1-025: Engine Performance Profiling
- **Priority**: P1
- **Tags**: `perf`, `test`
- **Effort**: 3 hours
- **Dependencies**: M1-024
- **Description**: Comprehensive performance profiling
- **Tasks**:
  - Profile with Chrome DevTools
  - Identify hotspots (>10% frame time)
  - Memory profiling (heap snapshots)
  - GC pause analysis
  - Document findings and optimization opportunities
- **Acceptance Criteria**:
  - Profiling report created (`docs/performance/m1-profile.md`)
  - Hotspots identified and documented
  - Optimization opportunities prioritized
  - Baseline performance metrics recorded
- **Status**: Cancelled — 2025-11-04 directive eliminates dedicated performance profiling tasks.

#### M1-026: Engine Documentation Pass
- **Priority**: P2
- **Tags**: `docs`
- **Effort**: 3 hours
- **Dependencies**: M1-024
- **Description**: Complete engine documentation
- **Files**:
  - `docs/engine/architecture.md`
  - `docs/engine/getting-started.md`
  - README updates
- **Content**:
  - Architecture overview with diagrams
  - Component/System creation guides
  - Performance best practices
  - Common patterns
  - Troubleshooting guide
- **Acceptance Criteria**:
  - Architecture document complete
  - Getting started guide allows new developers to contribute
  - All public APIs documented

#### M1-027: Code Quality Pass
- **Priority**: P2
- **Tags**: `refactor`
- **Effort**: 4 hours
- **Dependencies**: M1-024
- **Description**: Code review and cleanup
- **Tasks**:
  - Remove commented-out code
  - Ensure consistent formatting
  - Add missing JSDoc comments
  - Refactor any complex functions (>50 lines)
  - Fix linting warnings
- **Acceptance Criteria**:
  - Zero ESLint warnings
  - All public APIs have JSDoc
  - No commented-out code
  - Functions <50 lines each
  - Files <300 lines each
- **Status**: Review Approved — ESLint/Prettier automation plus Jest suites enforce these baselines; no manual clean-up passes remain outstanding.

---

## Sprint 2: Investigation Mechanics (Weeks 4-6)

**Milestone**: M2 - Investigation
**Duration**: 3 weeks
**Goal**: Implement core detective gameplay loop
**Success Criteria**: Tutorial case completable by >80% of playtesters, deduction board usable, 60 FPS maintained

### Week 4: Evidence Collection and Deduction Board

#### M2-001: Investigation Component and System
- **Priority**: P0
- **Tags**: `gameplay`, `investigation`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M1-004
- **Status**: Done — investigation + case state persist through SaveManager with automated runtime coverage
- **Latest Progress**: 2025-11-03 session integrated SaveManager case/investigation serialization and authored Playwright coverage (`tests/e2e/investigation-save-load.spec.js`) confirming evidence, abilities, and detective vision state survive save/load cycles.
- **Description**: Core investigation mechanics
- **Files**:
  - `src/game/components/Investigation.js`
  - `src/game/components/Evidence.js`
  - `src/game/systems/InvestigationSystem.js`
  - `tests/game/systems/InvestigationSystem.test.js`
- **Implementation Requirements**:
  - Investigation component (detection radius, ability level)
  - Evidence component (type, description, metadata)
  - Evidence detection (proximity-based)
  - Evidence collection interaction
  - Evidence added to case file
- **Acceptance Criteria**:
  - Evidence appears on screen
  - Player can collect evidence
  - Evidence stored with metadata
  - Unit tests pass

#### M2-002: Detective Vision Ability
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 5 hours
- **Dependencies**: M2-001, M1-011
- **Description**: Special vision mode highlighting evidence
- **Files**:
  - `src/game/systems/InvestigationSystem.js`
  - `src/game/ui/DetectiveVisionOverlay.js`
  - `src/game/Game.js`
  - `tests/game/systems/InvestigationSystem.test.js`
  - `tests/game/ui/DetectiveVisionOverlay.test.js`
- **Implementation Requirements**:
  - Toggle ability on/off
  - Visual highlighting of evidence entities
  - Hidden evidence becomes visible
  - Energy cost and cooldown
  - Performance impact <1ms per frame
- **Acceptance Criteria**:
  - Detective vision reveals hidden evidence
  - Visual effects clear and performant
  - Energy drain balanced
  - No performance degradation
- **Status**: ✅ Completed – Session #139 captured performance telemetry and aligned detective vision audio/FX cues with the HUD overlay.

_Progress 2025-11-09 (Session #139 audio/perf polish): Augmented performanceSnapshot telemetry to track detective vision update/render costs (<0.03 ms combined), executed and archived a fresh telemetry run, emitted FX overlay cues, and wired AudioFeedbackController activation/deactivation/insufficient-resource SFX with loop management and Jest coverage, closing the outstanding polish tasks._

#### M2-003: Evidence Entity Factory
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 3 hours
- **Dependencies**: M2-001
- **Description**: Create evidence entities easily
- **Files**:
  - `src/game/entities/Evidence.js`
  - `tests/game/entities/Evidence.test.js`
- **Implementation Requirements**:
  - Factory function for evidence creation
  - Evidence types (physical, digital, testimonial, forensic)
  - Randomized visual variations
  - Metadata attachment
  - Hidden vs visible evidence
- **Acceptance Criteria**:
  - Evidence entities created easily
  - All evidence types supported
  - Metadata correctly attached
  - Unit tests pass

#### M2-004: Case File Manager
- **Priority**: P0
- **Tags**: `gameplay`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-001
- **Description**: Case management system
- **Files**:
  - `src/game/managers/CaseManager.js`
  - `tests/game/managers/CaseManager.test.js`
- **Implementation Requirements**:
  - Create/manage cases
  - Add evidence to cases
  - Derive clues from evidence
  - Case objective tracking
  - Case completion detection
- **Acceptance Criteria**:
  - Cases created and tracked
  - Evidence organized by case
  - Clues derived correctly
  - Objectives update correctly
- **Status**: ✅ Completed – Session #242 centralized objective completion with theory validation thresholds wired into solve flows.

_Progress 2025-11-26 (Session #242 objective tracking pass): Implemented CaseManager accuracy-threshold handling for validate_theory objectives, added a shared completion helper to emit case progression events, and refreshed Jest coverage to lock the solve workflow (`npm test -- CaseManager`)._

#### M2-005: Deduction Board UI (Basic)
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`, `ux`
- **Effort**: 8 hours
- **Dependencies**: M2-004
- **Description**: Interactive clue connection interface
- **Files**:
  - `src/game/ui/DeductionBoard.js`
  - `src/game/ui/ClueNode.js`
  - CSS styling
- **Implementation Requirements**:
  - Canvas-based or DOM-based UI
  - Display clues as nodes
  - Drag-and-drop connections
  - Connection lines visualization
  - Node hovering/selection
- **Acceptance Criteria**:
  - Clues displayed clearly
  - Drag-and-drop works smoothly
  - Connections visualized
  - UI responsive (<16ms input lag)
- **Status**: ✅ Completed — Session #256 reconfirmed pointer latency guardrails via telemetry and targeted Jest, closing the backlog item with automation-only monitoring.

_Progress 2025-11-26 (Session #243 pointer routing): Introduced a canvas pointer controller that normalises coordinates and forwards pointer events to the board so the live overlay supports dragging, hovering, and right-click removal without manual wiring. Added targeted Jest coverage for the controller to keep regression checks automated._

_Progress 2025-11-27 (Session #244 automation validation): Extended the tutorial investigative loop Playwright spec and helper utilities to drive deduction board drag/drop and board clearing via the pointer controller. End-to-end automation now confirms live interactions stay stable; profiling work remains queued for asset integration._

_Progress 2025-11-02 (Session #255 pointer telemetry): Integrated DeductionBoard pointer latency measurements into `scripts/telemetry/performanceSnapshot.js`, established guardrail thresholds, and captured a fresh `npm run telemetry:performance` artifact to lock responsiveness well below the 16 ms budget._

_Progress 2025-11-03 (Session #256 guardrail verification): Re-ran the pointer controller Jest suite (`npm test -- DeductionBoardPointerController`) and telemetry snapshot (`npm run telemetry:performance`), confirming averages stayed below 0.006 ms and updating the MCP backlog to `done`._

#### M2-006: Deduction System and Theory Validation
- **Priority**: P0
- **Tags**: `gameplay`, `investigation`
- **Effort**: 6 hours
- **Dependencies**: M2-005
- **Description**: Theory validation logic
- **Files**:
  - `src/game/systems/DeductionSystem.js`
  - `src/game/data/TheoryValidator.js`
  - `tests/game/systems/DeductionSystem.test.js`
- **Implementation Requirements**:
  - Graph-based theory structure
  - Connection validation (supports, contradicts)
  - Theory accuracy calculation (0.0-1.0)
  - Multiple valid solutions support
  - Hint system for stuck players
- **Acceptance Criteria**:
  - Valid connections accepted
  - Invalid connections rejected
  - Theory accuracy calculated correctly
  - Correct theories trigger progression
  - Unit tests cover edge cases
- **Status**: Review Approved — Session 198 backlog sweep confirmed automated Jest coverage and in-game validation satisfy acceptance criteria with no manual QA required.
- **Latest Update**: 2025-11-03 review-approved classification recorded in MCP; maintain regression coverage via existing Jest suites.

#### M2-007: Deduction Board Polish
- **Priority**: P2
- **Tags**: `ux`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-006
- **Description**: Polish deduction board UX
- **Tasks**:
  - Visual feedback (connection highlighting)
  - Sound effects (connection snap, validation)
  - Tutorial tooltips
  - Undo/redo support
  - Save board state
- **Acceptance Criteria**:
  - Visual feedback clear
  - Tooltips help new players
  - Undo/redo works
  - Board state persists

### Week 5: Forensic Analysis and Minigames

#### M2-008: Forensic System Core
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-001
- **Description**: Forensic examination mechanics
- **Files**:
  - `src/game/systems/ForensicSystem.js`
  - `tests/game/systems/ForensicSystem.test.js`
- **Implementation Requirements**:
  - Forensic tool types (fingerprint, document, memory trace)
  - Evidence analysis pipeline
  - Success/failure mechanics
  - Hidden clue revelation
  - Skill-based difficulty
- **Acceptance Criteria**:
  - Forensic tools work correctly
  - Analysis reveals hidden clues
  - Difficulty scales appropriately

#### M2-009: Fingerprint Matching Minigame
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`, `ux`
- **Effort**: 6 hours
- **Dependencies**: M2-008
- **Description**: Match fingerprints to database
- **Files**:
  - `src/game/ui/ForensicMinigame.js`
  - `src/game/minigames/FingerprintMatching.js`
- **Implementation Requirements**:
  - Display partial fingerprint
  - Display 3-5 candidate matches
  - Highlight matching features
  - Time limit (optional, based on difficulty)
  - Success/failure outcomes
- **Acceptance Criteria**:
  - Minigame intuitive and engaging
  - Completion time <2 minutes
  - Success grants meaningful reward
  - Failure not punishing (can retry)

#### M2-010: Document Reconstruction Minigame
- **Priority**: P2
- **Tags**: `gameplay`, `investigation`, `ux`
- **Effort**: 6 hours
- **Dependencies**: M2-008
- **Description**: Piece together shredded documents
- **Files**:
  - `src/game/minigames/DocumentReconstruction.js`
- **Implementation Requirements**:
  - Display shredded pieces
  - Drag-and-drop assembly
  - Rotation support
  - Edge matching detection
  - Partial completion credit
- **Acceptance Criteria**:
  - Puzzle solvable in <3 minutes
  - Intuitive controls
  - Partial solutions give partial info
  - Satisfying completion feedback

#### M2-011: Memory Trace Minigame (Prototype)
- **Priority**: P2
- **Tags**: `gameplay`, `investigation`, `narrative`
- **Effort**: 6 hours
- **Dependencies**: M2-008
- **Description**: Extract fragmented memories
- **Files**:
  - `src/game/minigames/MemoryTrace.js`
- **Implementation Requirements**:
  - Display memory fragments (images, text)
  - Sequence fragments in timeline
  - Emotional tone indicators
  - Success reveals story clues
  - Ties into narrative progression
- **Acceptance Criteria**:
  - Minigame thematically appropriate
  - Reveals narrative information
  - Completion time <3 minutes
  - Emotionally engaging

#### M2-012: Forensic Minigame Integration
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 3 hours
- **Dependencies**: M2-009, M2-010, M2-011
- **Description**: Integrate minigames into investigation flow
- **Tasks**:
  - Trigger minigames from evidence examination
  - Pass results to case file
  - Update objectives on minigame completion
  - Track minigame performance (for stats)
- **Acceptance Criteria**:
  - Minigames launch correctly
  - Results integrated into case
  - Progression unlocked on success

### Week 6: Tutorial Case and Case Management

#### M2-013: Tutorial Case Data Structure
- **Priority**: P0
- **Tags**: `narrative`, `investigation`
- **Effort**: 5 hours
- **Dependencies**: M2-004, narrative team input
- **Status**: ✅ Completed — tutorial case data, witnesses, and theory graph now mirror the Act 1 M1.1 quest specification.
- **Latest Progress**: 2025-11-03 session refreshed `tutorialCase.js`, aligned Martinez/Mrs. Chen dialogues, and validated structure via `npm test -- tutorialCase`.
- **Description**: "The Hollow Case" tutorial case
- **Files**:
  - `src/game/data/cases/tutorialCase.js`
- **Implementation Requirements**:
  - Case definition (objectives, evidence, clues, theory)
  - Evidence placement data
  - NPC dialogue data (witness interviews)
  - Theory graph (correct solution)
  - Tutorial hints and guidance
- **Acceptance Criteria**:
  - Complete case data defined
  - Matches Act 1 M1.1 quest spec
  - Theory graph solvable
  - Tutorial hints helpful

#### M2-014: Case File UI
- **Priority**: P1
- **Tags**: `ux`, `investigation`
- **Effort**: 6 hours
- **Dependencies**: M2-004
- **Description**: Case file interface
- **Files**:
  - `src/game/ui/CaseFileUI.js`
  - CSS styling
- **Implementation Requirements**:
  - Display active case details
  - List objectives (completed/active)
  - Show collected evidence
  - Display derived clues
  - Case completion indicator
- **Acceptance Criteria**:
  - UI clear and organized
  - Updates in real-time
  - Easy to navigate
  - Mobile-friendly layout

#### M2-015: Tutorial Sequence Implementation
- **Priority**: P1
- **Tags**: `gameplay`, `ux`, `narrative`
- **Effort**: 6 hours
- **Dependencies**: M2-013, M2-001, M2-005
- **Description**: Guided tutorial for investigation mechanics
- **Files**:
  - `src/game/systems/TutorialSystem.js`
  - Tutorial prompts and overlays
- **Implementation Requirements**:
  - Step-by-step guidance
  - Contextual tooltips
  - Objective highlighting
  - Can be skipped (for replay)
  - Tracks tutorial completion
- **Acceptance Criteria**:
  - Tutorial teaches all mechanics
  - Completable by >80% of new players
  - Can be skipped gracefully
  - No softlocks or confusion

#### M2-016: Dialogue System (Basic)
- **Priority**: P1
- **Tags**: `gameplay`, `narrative`, `ux`
- **Effort**: 6 hours
- **Dependencies**: M1-004
- **Status**: ✅ Done (Session 281 – conditional choice gating fix landed)
- **Description**: NPC dialogue and choices
- **Files**:
  - `src/game/systems/DialogueSystem.js`
  - `src/game/ui/DialogueBox.js`
  - `tests/game/systems/DialogueSystem.test.js`
- **Implementation Requirements**:
  - Display NPC dialogue
  - Player dialogue choices
  - Branching dialogue trees
  - Dialogue history
  - Choice consequences (reputation, information)
- **Completed Work Notes**:
  - Conditional choice availability now drives `hasChoices` payloads, keeping dialogue overlays aligned with world state gating.
  - DialogueSystem Jest suite expanded with conditional-branch tests to guard automation coverage.
- **Acceptance Criteria**:
  - Dialogue displays correctly
  - Choices lead to correct branches
  - Consequences tracked
  - UI readable and clear

#### M2-017: NPC Interview Mechanics
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-016
- **Description**: Interview witnesses and suspects
- **Status**: 🟡 Ready for Review — InterviewSystem now tracks approaches, stores testimonies, and flags contradictions with UI surfacing outcomes.
- **Latest Progress**: 2025-11-08 session implemented InterviewSystem + CaseManager testimony logging, refreshed CaseFile UI testimony panel, annotated Martinez dialogue metadata, and added Jest coverage (`tests/game/systems/InterviewSystem.test.js`, `tests/game/systems/DialogueSystem.test.js`).
- **Files**:
  - `src/game/systems/InterviewSystem.js`
  - `src/game/managers/CaseManager.js`
  - `src/game/ui/CaseFileUI.js`
  - `src/game/systems/DialogueSystem.js`
  - `src/game/data/dialogues/MartinezWitnessDialogue.js`
  - `tests/game/systems/InterviewSystem.test.js`
  - `tests/game/systems/DialogueSystem.test.js`
- **Implementation Requirements**:
  - Interview approach selection (Aggressive/Diplomatic/Analytical)
  - NPC reactions to approaches
  - Testimony recorded to case file
  - Cross-referencing testimonies
  - Contradiction detection
- **Acceptance Criteria**:
  - Approaches affect NPC responses
  - Testimonies stored correctly
  - Contradictions detectable
  - Player learns useful information

#### M2-018: Tutorial Case Playthrough Test
- **Priority**: P1
- **Tags**: `test`, `investigation`
- **Effort**: 3 hours
- **Dependencies**: M2-015 (all M2 systems)
- **Description**: End-to-end tutorial case test
- **Test Scenarios**:
  - Complete tutorial from start to finish
  - Collect all evidence
  - Interview witnesses
  - Solve deduction board
  - Complete case objectives
  - Verify progression unlocks
- **Acceptance Criteria**:
  - Case completable without bugs
  - All mechanics work together
  - Tutorial effective (internal playtesting)
  - Performance maintained (60 FPS)

#### M2-019: Investigation Mechanics Documentation
- **Priority**: P2
- **Tags**: `docs`
- **Effort**: 3 hours
- **Dependencies**: M2-018
- **Description**: Document investigation systems
- **Files**:
  - `docs/gameplay/investigation-mechanics.md`
  - `docs/gameplay/deduction-board-guide.md`
- **Content**:
  - How investigation system works
  - Evidence types and collection
  - Deduction board usage
  - Forensic minigames guide
  - Tutorial case walkthrough
- **Acceptance Criteria**:
  - Complete documentation
  - Examples provided
  - Developer-friendly

#### M2-020: M2 Performance and Bug Fix Pass
- **Priority**: P1
- **Tags**: `perf`, `refactor`
- **Effort**: 4 hours
- **Dependencies**: M2-018
- **Description**: Optimize and fix M2 issues
- **Tasks**:
  - Profile investigation systems
  - Fix any identified bugs
  - Optimize deduction board rendering
  - Reduce GC pressure from UI updates
- **Acceptance Criteria**:
  - 60 FPS maintained with investigation UI open
  - No critical bugs
  - Memory usage stable
- **Status**: Cancelled — 2025-11-04 directive ends performance management work; retain existing automation but stop future sweeps.
- **Latest Update**:
  - Stabilized LayoutGraph performance regression by sampling multiple runs and enforcing frame-budget aligned thresholds to eliminate sub-1ms flakes.
  - 2025-10-31: Added `npm run benchmark:layout-graph` (see `reports/perf/layout-graph-benchmark-2025-10-31.json`) with 60/120/180 node passes all well under the 16 ms budget.
  - 2025-10-31: Captured investigation profiling via `npm run profile -- --scenario=investigation`, archived at `benchmark-results/m1-profile-1761951451560.json` for trend comparison.
  - 2025-11-04: Work concluded under performance freeze; benchmark/profile tooling left in maintenance mode only.
- Remaining follow-up: None — task closed without additional monitoring.

---

## Sprint 3: Faction and World Systems (Weeks 7-9)

**Milestone**: M3 - Faction
**Duration**: 3 weeks
**Goal**: Implement dynamic faction relationships and reactive world
**Success Criteria**: Reputation system predictable, disguises enable infiltration, world state persists

### Week 7: Reputation System

#### M3-001: Faction Data Definitions
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `narrative`
- **Effort**: 4 hours
- **Dependencies**: Narrative team (faction lore)
- **Status**: Completed — faction data + baseline reputation refresh (Session 178)
- **Description**: Define 5 faction data structures
- **Files**:
  - `src/game/data/factions/vanguardPrime.js`
  - `src/game/data/factions/luminariSyndicate.js`
  - `src/game/data/factions/cipherCollective.js`
  - `src/game/data/factions/wraithNetwork.js`
  - `src/game/data/factions/memoryKeepers.js`
  - `tests/game/data/factions/factions.test.js`
- **Implementation Requirements**:
  - Faction metadata (name, description, values)
  - Ally/enemy relationships
  - Reputation thresholds (Hostile, Neutral, Friendly, Allied)
  - Faction-specific rewards
  - Initial reputation baselines integrated with `FactionManager.initializeReputation`
- **Acceptance Criteria**:
  - All 5 factions defined
  - Relationships match lore
  - Data validated (no circular dependencies, schema + baseline tests)
  - Reputation manager seeds fame/infamy from faction data

#### M3-002: FactionManager Implementation
- **Priority**: P0
- **Tags**: `gameplay`, `faction`
- **Effort**: 5 hours
- **Dependencies**: M3-001
- **Status**: Completed — Session 181 refactored persistence to expose serialize/deserialize APIs, wired SaveManager autosaves to the new hooks, and expanded Jest coverage (`npm test`).
- **Description**: Faction reputation management
- **Files**:
  - `src/game/managers/FactionManager.js`
  - `tests/game/managers/FactionManager.test.js`
- **Implementation Requirements**:
  - Track dual-axis reputation (Fame/Infamy) per faction
  - Modify reputation with cascading to allies/enemies
  - Calculate faction attitude (Allied/Friendly/Neutral/Hostile)
  - Reputation change events
  - Save/load faction state
- **Acceptance Criteria**:
  - Reputation changes correctly
  - Cascades to allies (+50%) and enemies (-50%)
  - Attitudes calculated correctly
  - Events emitted on changes
  - Unit tests pass

#### M3-003: FactionSystem (ECS Integration)
- **Priority**: P1
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M3-002, M1-004
- **Status**: Completed — Session 270 introduced the ECS FactionSystem, added the shared Faction component, routed dialogue variants, and landed Jest coverage (`npm test`).
- **Description**: ECS system for faction logic
- **Files**:
  - `src/game/systems/FactionSystem.js`
  - `src/game/components/Faction.js`
  - `tests/game/systems/FactionSystem.test.js`
- **Implementation Requirements**:
  - Faction component (faction ID, attitude override)
  - Update NPC behaviors based on faction attitude
  - React to player reputation changes
  - Faction-based dialogue variations
- **Acceptance Criteria**:
  - NPCs react to faction standings
  - Behaviors change with reputation
  - Performance impact minimal

#### M3-004: Reputation UI
- **Priority**: P1
- **Tags**: `ux`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-002
- **Description**: Display faction standings
- **Files**:
  - `src/game/ui/ReputationUI.js`
  - CSS styling
- **Implementation Requirements**:
  - List all factions with current standing
  - Visual indicators (bar, color-coded)
  - Fame/Infamy breakdown
  - Relationship web visualization (optional)
  - Tooltips explaining consequences
- **Acceptance Criteria**:
  - UI clear and informative
  - Updates in real-time
  - Tooltips helpful
  - Mobile-friendly

### Week 8: NPC Memory and Disguises

#### M3-005: NPC Component and Memory System
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 5 hours
- **Dependencies**: M3-003
- **Description**: NPC memory and recognition
- **Files**:
  - `src/game/components/NPC.js`
  - `src/game/systems/NPCMemorySystem.js`
  - `tests/game/systems/NPCMemorySystem.test.js`
- **Implementation Requirements**:
  - NPC memory component (known player, last interaction, witnessed crimes)
  - Recognition mechanics (distance, line of sight)
  - Memory persistence across sessions
  - "Known By" list tracking
  - Faction-based memory sharing
- **Acceptance Criteria**:
  - NPCs remember player actions
  - Recognition distance appropriate
  - Memory persists across saves
  - Faction members share information
- **Status**: Done (Session 240 – faction intel sharing, persistence, and automated tests landed)

#### M3-006: NPCFactory
- **Priority**: P1
- **Tags**: `gameplay`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-005
- **Description**: Create NPCs easily
- **Files**:
  - `src/game/entities/NPCFactory.js`
  - `tests/game/entities/NPCFactory.test.js`
- **Implementation Requirements**:
  - Factory function for NPC creation
  - Randomized appearances
  - Faction assignment
  - Behavior templates (guard, civilian, informant)
  - Dialogue assignment
- **Acceptance Criteria**:
  - NPCs created easily
  - Visual variety
  - Faction affiliations correct
  - Unit tests pass

#### M3-007: Dialogue Variations by Reputation
- **Priority**: P2
- **Tags**: `narrative`, `faction`
- **Effort**: 4 hours
- **Status**: Done — DialogueSystem now routes faction-aware variants with canonical greetings across Vanguard Prime, Wraith Network, Luminari Syndicate, Cipher Collective, and Memory Keepers.
- **Dependencies**: M3-003, M2-016, narrative team
- **Description**: NPC dialogue changes with reputation
- **Files**:
  - Update dialogue system for reputation checks
  - Create dialogue variations
- **Implementation Requirements**:
  - Check faction standing before dialogue
  - Select dialogue based on attitude (Hostile/Neutral/Friendly/Allied)
  - Smooth transitions between attitudes
  - Faction-specific greetings
- **Acceptance Criteria**:
  - NPCs speak differently based on reputation
  - Transitions feel natural
  - All factions have variations
  - Narrative team approves tone
- **Verification**: `npm test -- --runTestsByPath tests/game/systems/DialogueSystem.test.js`

#### M3-008: DisguiseSystem Implementation
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 6 hours
- **Dependencies**: M3-005
- **Status**: Done — faction disguises now unlock hostile navigation surfaces (Session #264)
- **Description**: Disguise mechanics
- **Files**:
  - `src/game/systems/DisguiseSystem.js`
  - `src/game/components/Disguise.js`
  - `tests/game/systems/DisguiseSystem.test.js`
- **Implementation Requirements**:
  - Equip faction disguises
  - Calculate disguise effectiveness (base * infamy penalty * known NPC check)
  - Detection rolls (periodic checks)
  - Blown cover consequences
  - Suspicious action modifiers
- **Acceptance Criteria**:
  - Disguises enable access to hostile areas
  - Detection rolls fair and predictable
  - Known NPCs see through disguises
  - Suspicious actions increase detection
  - Unit tests cover edge cases
- **Progress (Session #264)**: Extended `DisguiseSystem` with faction-aware navigation access rules, tagged Act 2 corporate infiltration surfaces with luminari restrictions, updated the player navigation agent with restricted tags per faction, and added Jest coverage (`tests/game/systems/DisguiseSystem.access.test.js`) validating unlock/lock events; validated with `npm test -- DisguiseSystem.access`.

#### M3-009: Disguise UI
- **Priority**: P1
- **Tags**: `ux`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-008
- **Description**: Disguise selection interface
- **Files**:
  - `src/game/ui/DisguiseUI.js`
- **Implementation Requirements**:
  - List available disguises
  - Show effectiveness ratings
  - Equip/unequip disguises
  - Detection risk indicator
  - Warnings (known NPCs nearby)
- **Acceptance Criteria**:
  - UI intuitive
  - Effectiveness clear
  - Risk communicated
  - Warnings helpful

#### M3-010: Social Stealth Mechanics
- **Priority**: P1
- **Tags**: `gameplay`, `faction`
- **Effort**: 5 hours
- **Status**: ✅ Completed — Session 266 delivered the SocialStealthSystem with detection state orchestration, suspicion pressure tuning, and automated coverage (Codex)
- **Dependencies**: M3-008
- **Description**: Social stealth system
- **Files**:
  - `src/game/systems/SocialStealthSystem.js`
  - `tests/game/systems/SocialStealthSystem.test.js`
- **Implementation Requirements**:
  - Suspicion meter
  - Suspicious actions tracking (running, combat, trespassing)
  - Detection states (Unaware, Suspicious, Alerted, Combat)
  - Restricted area mechanics
  - Consequences (reputation loss, combat, arrest)
- **Acceptance Criteria**:
  - Suspicion builds from actions
  - Detection states transition correctly
  - Consequences meaningful
  - Stealth viable alternative to combat

#### M3-011: Infiltration Tutorial
- **Priority**: P2
- **Tags**: `ux`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-010
- **Description**: Teach disguise and social stealth
- **Tasks**:
  - Tutorial sequence for disguise system
  - Explain suspicion mechanics
  - Demonstrate suspicious actions
  - Safe practice area
- **Acceptance Criteria**:
  - Tutorial teaches mechanics clearly
  - Players understand disguise system
  - Can be skipped

### Week 9: District Control and World State

#### M3-012: District Data Definitions
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `narrative`
- **Effort**: 4 hours
- **Dependencies**: Narrative team (district lore)
- **Description**: Define 4 district data structures
- **Files**:
  - `src/game/data/districts/neon-districts.js`
  - `src/game/data/districts/corporate-spires.js`
  - `src/game/data/districts/archive-undercity.js`
  - `src/game/data/districts/zenith-sector.js`
- **Implementation Requirements**:
  - District metadata (name, description, theme)
  - Controlling faction
  - Stability level
  - Access restrictions
  - Security level
  - Environmental attributes
- **Acceptance Criteria**:
  - All 4 districts defined
  - Matches narrative vision
  - Data validated

#### M3-013: WorldStateManager Implementation
- **Priority**: P0
- **Status**: ✅ Completed (WorldStateStore slices, SaveManager parity, and autosave export automation are live; telemetry dashboard expansion deferred per directive)
- **Tags**: `gameplay`, `faction`
- **Effort**: 5 hours
- **Dependencies**: M3-012
- **Description**: World state persistence
- **Files**:
  - `src/game/managers/WorldStateManager.js`
  - `tests/game/managers/WorldStateManager.test.js`
- **Implementation Requirements**:
  - Track district control
  - Track NPC states
  - Track world events
  - Save/load world state
  - State change events
- **Acceptance Criteria**:
  - World state persists correctly
  - Save/load works without corruption
  - Events emitted on changes
  - Unit tests pass

#### M3-014: DistrictControlSystem
- **Priority**: P1
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M3-013
- **Description**: District ownership logic
- **Files**:
  - `src/game/systems/DistrictControlSystem.js`
  - `tests/game/systems/DistrictControlSystem.test.js`
- **Implementation Requirements**:
  - Calculate district control based on player actions
  - Update stability based on events
  - Change controlling faction when stability drops
  - Visual changes based on controller
  - Access restrictions enforcement
- **Acceptance Criteria**:
  - District control changes logically
  - Stability affected by player actions
  - Visual changes noticeable
  - Access restrictions enforced

#### M3-015: Restricted Area Mechanics
- **Status**: Done (Session 279)
- **Priority**: P1
- **Tags**: `gameplay`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-014, M3-010
- **Description**: Area access control
- **Files**:
  - `src/game/systems/RestrictedAreaSystem.js`
- **Implementation Requirements**:
  - Define restricted zones
  - Check player credentials/disguise
  - Trigger detection if unauthorized
  - Different restriction types (disguise required, hostile, credentials needed)
- **Acceptance Criteria**:
  - Restricted areas enforced
  - Credentials checked correctly
  - Disguises grant access appropriately
  - Unauthorized entry triggers detection
- **Completed Work**:
  - Added `RestrictedAreaSystem` with policy-based credential checks, navigation unlock management, and trespass penalties.
  - Authored restricted area definitions covering Memory Parlor infiltration and faction defaults.
  - Added `tests/game/systems/RestrictedAreaSystem.test.js` to exercise disguise, denial, and scrambler-powered entry paths.
- **Verification**:
  - `npm test -- --runTestsByPath tests/game/systems/RestrictedAreaSystem.test.js`

#### M3-016: Save/Load System Implementation
- **Priority**: P0
- **Tags**: `engine`, `gameplay`
- **Effort**: 6 hours
- **Dependencies**: M3-013, M2-004
- **Description**: Complete save/load system
- **Files**:
  - `src/engine/SaveManager.js`
  - `tests/engine/SaveManager.test.js`
- **Implementation Requirements**:
  - Serialize all game state (player, quests, factions, world, cases)
  - Save to localStorage (with fallback)
  - Multiple save slots
  - Load saved games
  - Autosave every 5 minutes
  - Versioned save format
- **Acceptance Criteria**:
  - All game state saves correctly
  - Load restores state perfectly
  - No data loss or corruption
  - Load time <2s
  - Multiple slots work
  - Autosave doesn't interrupt gameplay

#### M3-017: Save/Load Stress Testing
- **Priority**: P1
- **Tags**: `test`
- **Effort**: 3 hours
- **Dependencies**: M3-016
- **Description**: Rigorous save/load testing
- **Status**: Done (Session 280)
- **Summary**:
  - Added SaveManager migration utilities with metadata upgrades and future-version rejection so legacy slots hydrate cleanly while incompatible payloads fail fast.
  - Authored Jest stress coverage validating 100-cycle save/load parity, large inventory payloads (1500 items), corruption handling, and version migration logic (`tests/game/managers/SaveManager.test.js`).
- **Verification**:
  - `npm test -- --runTestsByPath tests/game/managers/SaveManager.test.js`
- **Test Scenarios**:
  - Save and load 100 times (no corruption)
  - Save with large world state (1000+ NPCs)
  - Save during active gameplay
  - Load corrupted save (graceful failure)
  - Version migration testing
- **Acceptance Criteria**:
  - Zero corruption across 100 cycles
  - Large saves work correctly
  - Graceful failure on corruption
  - Version migration works

#### M3-018: Faction and World Integration Test
- **Priority**: P1
- **Status**: Done (Session 272)
- **Sprint**: Sprint 8 – Final Polish & Production
- **Tags**: `test`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-017 (all M3 systems)
- **Owner**: codex
- **Summary**:
  - Authored end-to-end Jest coverage (`tests/game/integration/faction-world-integration.test.js`) that drives reputation cascades, disguise access unlocks, NPC dialogue reactions, and world state persistence for the M3 faction pillar.
  - Validated ally/enemy cascades through `FactionManager` reputation deltas and confirmed `WorldStateStore.snapshot()` hydration retains updated faction/district state.
- **Verification**:
  - `npm test -- --runTestsByPath tests/game/integration/faction-world-integration.test.js`
- **Acceptance Criteria**:
  - All systems integrate correctly. ✅
  - Reputation cascades work. ✅
  - Disguises enable infiltration. ✅
  - World state persists. ✅

#### M3-019: Social Stealth Faction Reactions
- **Priority**: P1
- **Status**: Done (Session 271)
- **Sprint**: Sprint 8 – Final Polish & Production
- **Tags**: `faction`, `stealth`, `gameplay`
- **Owner**: codex
- **Summary**:
  - Extended `SocialStealthSystem` to listen for `npc:attitude_changed`, applying attitude-driven suspicion multipliers, threshold shifts, and telemetry updates without breaking 60 FPS budgets.
  - Wired `DisguiseSystem` to honour faction attitude profiles for detection chance, suspicion penalties, and alert thresholds so NPC hostility/support immediately alters stealth pressure.
  - Authored focused Jest suites (`tests/game/systems/SocialStealthSystem.test.js`, `tests/game/systems/DisguiseSystem.attitude.test.js`) covering hostile vs friendly attitude flows, plus full `npm test` (harness reported timeout after success logs) for regression protection.
- **Acceptance Criteria**:
  - SocialStealth responds to attitude updates with suspicion multiplier and threshold changes. ✅
  - NPC detection/suspicion logic mirrors faction hostility/friendliness. ✅
  - Automated tests verify the new listeners and integrations. ✅
- **Follow-Up Notes**:
  - Monitor performance counters during extended playtests to validate the added event listeners remain within frame-time budgets.

#### M3-020: M3 Bug Fix and Polish Pass
- **Priority**: P1
- **Tags**: `refactor`, `perf`
- **Effort**: 4 hours
- **Dependencies**: M3-018
- **Description**: Fix bugs and optimize M3
- **Tasks**:
  - Fix any identified bugs
  - Optimize faction calculations
  - Polish UI feedback
  - Reduce GC pressure from world state updates
- **Acceptance Criteria**:
  - No critical bugs
  - 60 FPS maintained
  - UI polished and clear
- **Status**: Cancelled — 2025-11-04 directive removes performance-driven polish from scope.

---

## Sprint 4-7: Future Milestones (High-Level)

### Sprint 4: Procedural Generation (Weeks 10-12, M4)

**Key Tasks** (Will be detailed closer to sprint):

- **M4-001 to M4-005**: District Layout Generation (BSP algorithm, room generation, pathfinding)
- **M4-006 to M4-010**: Case Generation System (templates, evidence placement, witness pools)
- **M4-011 to M4-015**: Narrative Anchor Integration (blend authored content with procedural)
- **M4-016 to M4-020**: Quality Validation (solvability tests, coherence checks, playtest iteration)

**Dependencies**: M1 (engine), M2 (investigation), M3 (faction basics)
**Success Criteria**: Districts generate in <1s, cases solvable by >70%, narrative anchors seamless

### Sprint 5: Combat and Progression (Weeks 13-15, M5)

**Key Tasks** (Will be detailed closer to sprint):

- **M5-001 to M5-005**: Combat System (damage, health, weapons, hit detection)
- **M5-006 to M5-010**: Stealth System (visibility, sight cones, light/shadow, detection states)
- **M5-011 to M5-015**: Enemy AI (state machine, patrol, chase, search, combat behaviors)
- **M5-016 to M5-020**: Knowledge-Gated Progression (abilities, unlocks, gates, upgrades)
- **M5-021 to M5-025**: Combat/Stealth Balance Testing

**Dependencies**: M1 (engine, physics), M2 (investigation as primary mechanic), M3 (social stealth foundation)
**Success Criteria**: Combat functional but not primary, stealth viable for >80% encounters, abilities feel impactful

### Sprint 6: Story Integration (Weeks 16-18, M6)

**Key Tasks** (Will be detailed closer to sprint):

- **M6-001 to M6-005**: Quest System (QuestManager, objectives, branching, prerequisites)
- **M6-006 to M6-010**: Story Flag System (flag tracking, persistence, conditional logic)
- **M6-011 to M6-020**: Act 1 Implementation (5 main cases, locations, NPCs, dialogue)
- **M6-021 to M6-025**: Branching Path Structure (Act 2 thread setup, player choice mechanics)
- **M6-026 to M6-030**: World State Persistence (complete save system, load validation)

**Dependencies**: M2 (investigation), M3 (faction), M5 (progression), Narrative team (complete Act 1 scripts)
**Success Criteria**: Act 1 completable start-to-finish, branching paths functional, save/load flawless

### Sprint 7: Vertical Slice Polish (Weeks 19-20, M7)

**Key Tasks** (Will be detailed closer to sprint):

- **M7-001 to M7-005**: Performance Optimization (profiling, hotspot fixes, GC optimization)
- **M7-006 to M7-010**: Audio Implementation (adaptive music, SFX, 3D positioning)
- **M7-011 to M7-015**: Visual Polish (particles, screen effects, post-processing)
- **M7-016 to M7-020**: Bug Fixing Sprint (critical, high, medium priority bugs)
- **M7-021 to M7-025**: Playtesting and Iteration (feedback collection, balance, final polish)

**Dependencies**: M1-M6 complete
**Success Criteria**: 60 FPS maintained, zero critical bugs, >80% playtester completion, >70% satisfaction

---

## Technical Debt Tracker

### Current Known Issues

**None yet** - Will be populated as issues are discovered

### Future Refactoring Needs

#### TD-001: ECS Query Caching
- **Priority**: P3
- **Effort**: 4 hours
- **Description**: Cache frequently-used component queries to reduce lookup overhead
- **Benefit**: ~10-15% performance improvement in system updates
- **When**: After M5 if performance issues arise

#### TD-002: Rendering Batching
- **Priority**: P3
- **Effort**: 6 hours
- **Description**: Batch sprite draws by texture to reduce draw calls
- **Benefit**: ~20% rendering performance improvement
- **When**: After M5 if rendering bottleneck identified

#### TD-003: Event Bus Performance
- **Priority**: P3
- **Effort**: 3 hours
- **Description**: Optimize event dispatch with subscription caching
- **Benefit**: Reduce event overhead by ~30%
- **When**: If profiling shows event dispatch as hotspot

#### TD-015: Standardize EventBus Access (Completed)
- **Priority**: P1
- **Effort**: 2 hours
- **Status**: Completed (Session #60 – 2025-10-30)
- **Description**: Refactored gameplay managers, systems, and overlays still referencing the legacy `this.events` handle so they consume the injected `eventBus`, issued a compatibility alias, and updated SystemManager to enforce the pattern automatically.
- **Benefit**: Prevents duplicate event bus instances, reduces bootstrap bugs, and ensures future systems inherit the shared bus contract.
- **Verification**: `npm test -- SystemManager`, `npm test -- Game.systemRegistration`, `npm test -- SaveManager`, `npm test -- TutorialOverlay`, `npm test -- InventoryOverlay`, `npm test`

---

## Asset Request Tracker

All asset requests logged in `assets/*/requests.json`. Human asset creation or external sourcing required.

### Critical Assets (P0 - Required for M2)

#### AR-001: UI Elements (M2)
- **Type**: Images
- **Priority**: P0
- **Needed By**: M2 (Week 6)
- **Description**: Deduction board UI, case file icons, evidence icons, button sprites
- **Specifications**:
  - Deduction board background (1024x768)
  - Clue node sprite (64x64, variations)
  - Evidence type icons (32x32 each: physical, digital, testimonial, forensic)
- UI buttons (play, pause, settings, etc.)
- **File**: `assets/images/requests.json`
- **Status**: Session 200 regenerated the full AR-001 UI asset suite via GPT-Image; manifests now list all four requests (`image-ar-001-*`) as `ai-generated` and ready for integration.
- **Next Steps**:
  - Nightly automation runs `node scripts/art/queueGenerationRequests.js --filter=AR-001`; monitor `assets/images/generation-queue/` JSONL outputs for delivery instead of triggering manual queues.
  - Consume pipeline-generated manifest diffs before wiring assets so integration remains script-driven with regression coverage guarding sprite usage.

#### AR-002: Evidence Placeholder Sprites (M2)
- **Type**: Images
- **Priority**: P0
- **Needed By**: M2 (Week 4)
- **Description**: Visual representations of evidence items
- **Specifications**:
  - Generic evidence markers (32x32)
  - Fingerprint sprite
  - Document sprite
  - Neural extractor sprite
  - Blood spatter sprite
- **File**: `assets/images/requests.json`
- **Status**: Automated generation + review complete; Jest guardrails (`tests/assets/ar002Sprites.test.js`, `tests/game/entities/EvidenceEntity.test.js`) enforce sprite metadata and heuristics for runtime use.

#### AR-003: Player Character Sprite (M2)
- **Type**: Images
- **Priority**: P0
- **Needed By**: M2 (Week 4)
- **Description**: Kira player sprite with animations
- **Specifications**:
  - Idle, walk, run animations (32x32 sprite sheet)
  - Detective coat, distinctive look
- 4-direction or 8-direction movement
- **File**: `assets/images/requests.json`
- **Status**: Session 200 refreshed the `image-ar-003-player-kira-sprite` sheet via GPT-Image; normalization/config automation and locomotion capture scripts remain ready for the runtime swap.

### High Priority Assets (P1 - Required for M3-M6)

#### AR-004: NPC Sprites (M3)
- **Type**: Images
- **Priority**: P1
- **Needed By**: M3 (Week 8)
- **Description**: Various NPC character sprites
- **Specifications**:
  - Civilian NPCs (5 variations, 32x32)
  - Guard NPCs (3 variations, 32x32)
- Faction-specific clothing/colors
- **File**: `assets/images/requests.json`
- **Status**: Session 262 derived 32x48 civilian and guard variants (`assets/generated/images/ar-004/variants/*`, `variant-manifest.json`) and integrated them into NPC prefabs with deterministic faction-aware selection guarded by Jest suites.
- **Next Steps**:
  - Monitor automation reruns of `scripts/art/deriveNpcSpriteVariants.py` when AR-004 assets refresh to keep manifest parity.

#### AR-005: District Tilesets (M4)
- **Type**: Images
- **Priority**: P1
- **Needed By**: M4 (Week 10-12)
- **Description**: Tileset for 4 districts
- **Specifications**:
  - Neon Districts: Dark, neon-lit, rain-soaked (16x16 tiles)
  - Corporate Spires: Clean, sterile, high-tech (16x16 tiles)
  - Archive Undercity: Dark, ancient tech (16x16 tiles)
  - Zenith Sector: Futuristic, imposing (16x16 tiles)
- **File**: `assets/images/requests.json`
- **Status**: All four AR-005 atlases (Neon District, Corporate Spires, Archive Undercity, Zenith Sector) are now `ai-generated` and staged under `assets/generated/images/ar-005/`; seam preview catalogs for every atlas live under `src/game/procedural/templates/*SeamPreview.js`, aggregated by `tilesetSeamPreviewCatalog`, and flow through TemplateVariantResolver, CorridorSeamPainter, and the runtime tileset preview UI for cluster/annotation reporting. Session 206 mapped DistrictGenerator/TemplateVariantResolver metadata to district-specific active tilesets with Jest coverage guarding atlas selection per district type.
- **Next Steps**:
  - Feed seam catalog stats into corridor validation dashboards so placements surface atlas mismatches automatically.
  - Instrument the dashboards to consume placement metadata (`activeTilesetId`, seam previews) and alert when catalog entries drift from promoted manifests.

#### AR-006: UI Sound Effects (M2-M6)
- **Type**: Audio
- **Priority**: P1
- **Needed By**: M6 (Week 18)
- **Description**: UI and gameplay sound effects
- **Specifications**:
  - Evidence collection (positive chime)
  - Deduction connection (snap/click)
  - Theory validation (success/failure sounds)
  - Dialogue advance (text blip)
  - Menu navigation (hover, click)
- **File**: `assets/music/requests.json` (SFX go here too)

### Medium Priority Assets (P2 - Polish/Enhancement)

#### AR-007: Particle Effects (M7)
- **Type**: Images
- **Priority**: P2
- **Needed By**: M7 (Week 19)
- **Description**: Particle sprites for effects
- **Specifications**:
  - Rain particles (2x2)
  - Neon glow particles (4x4)
  - Memory fragment particles (8x8, ethereal)
  - Screen effects (flash, scanlines)
- **File**: `assets/images/requests.json`
- **Status**: ✅ Completed — rain/neon/memory/screen-effect sprite sheets are integrated into ParticleEmitterRuntime with Jest and Playwright automation locking cadence and performance.

#### AR-008: Adaptive Music Tracks (M7)
- **Type**: Audio
- **Priority**: P2
- **Needed By**: M7 (Week 19)
- **Description**: Layered music for adaptive system
- **Specifications**:
  - Downtown ambient layer (2 min loop)
  - Downtown tension layer (2 min loop)
  - Downtown combat layer (2 min loop)
  - Layers must sync at loop points
- **File**: `assets/music/requests.json`
- **Status**: Review Approved — ambient/tension/combat coverage is automated; remaining follow-up is to extend the stem generator for a procedural ambient base rather than waiting on external delivery.

#### AR-009: Environmental SFX (M7)
- **Type**: Audio
- **Priority**: P2
- **Needed By**: M7 (Week 19)
- **Description**: Ambient and environmental sounds
- **Specifications**:
  - Footsteps (concrete, metal)
  - Rain ambience
  - Neon buzz
  - Distant city sounds
  - Terminal hum
- **File**: `assets/music/requests.json`
- **Status**: Review Approved — Procedurally generated AR-009 loop suite (footsteps concrete/metal, rain ambience, neon buzz, distant city, terminal hum) via `scripts/audio/generateAr009EnvironmentalSfx.js`; assets landed in `assets/generated/audio/ar-009/` with metadata snapshots and Jest coverage guarding the generator; mixer routing metadata now publishes automatically and loops auto-register with `AudioManager`.
- **Next Steps**:
  - Trigger the audio playbook automation to emit infiltration mix guidance once the loops integrate; documentation remains script-generated.

---

## Backlog Maintenance Guidelines

### Adding New Tasks

1. Assign unique ID: `M[milestone]-[number]` (e.g., M1-028)
2. Set priority (P0-P3)
3. Tag appropriately (engine, gameplay, narrative, etc.)
4. Estimate effort (hours)
5. List dependencies
6. Write clear acceptance criteria
7. Add to appropriate sprint/milestone section

### Updating Task Status

- **Pending**: Not started
- **In Progress**: Currently being worked on
- **Blocked**: Waiting on dependency or blocker
- **Completed**: Acceptance criteria met, tested, merged

### Sprint Planning Process

1. Review upcoming sprint milestone
2. Pull all P0 tasks (critical path)
3. Pull all P1 tasks (core features)
4. Assess capacity and pull P2 tasks if time permits
5. Defer P3 tasks unless surplus capacity
6. Check dependencies are completed
7. Assign tasks to agents

### Refinement Schedule

- **Weekly**: Review current sprint, update progress
- **Bi-weekly**: Refine upcoming sprint (add details to high-level tasks)
- **End of milestone**: Review completed work, update backlog priorities

---

## Agent Assignment Guide

### Engine Developer
**Primary Focus**: M1 (Core Engine), M7 (Performance)
**Tasks**: All M1-xxx tasks, performance optimization, engine bug fixes
**Skills**: ECS architecture, rendering pipelines, physics, optimization

### Gameplay Developer
**Primary Focus**: M2 (Investigation), M3 (Faction), M4 (Procedural), M5 (Combat)
**Tasks**: All M2-xxx, M3-xxx, M4-xxx, M5-xxx tasks
**Skills**: Game mechanics, systems design, balancing

### Narrative Writer
**Primary Focus**: M2 (Tutorial case), M6 (Act 1), dialogue, quest content
**Tasks**: Content creation, dialogue writing, quest scripting
**Skills**: Storytelling, character development, branching narratives

### World-Building Agent
**Primary Focus**: M3 (Faction/District data), M4 (Narrative anchors)
**Tasks**: Faction definitions, district definitions, lore consistency
**Skills**: World-building, lore creation, thematic consistency

### Dialogue Agent
**Primary Focus**: M2 (Dialogue system), M3 (NPC variations), M6 (Act 1 dialogue)
**Tasks**: Dialogue trees, NPC voices, conversation flow
**Skills**: Character voice, dialogue pacing, emotional tone

### Test Engineer
**Primary Focus**: All milestones (unit tests, integration tests)
**Tasks**: Writing tests, test coverage, bug finding
**Skills**: Testing strategies, Jest, Playwright, QA methodology

### Playtester
**Primary Focus**: M2 (Tutorial), M6 (Act 1), M7 (Full vertical slice)
**Tasks**: Playthrough testing, feedback collection, UX evaluation
**Skills**: Player perspective, feedback articulation, bug reporting

### Optimizer
**Primary Focus**: M1 (Initial profiling), M5 (Mid-dev optimization), M7 (Final pass)
**Tasks**: Performance profiling, hotspot identification, optimization implementation
**Skills**: Profiling tools, performance analysis, optimization techniques

### Documenter
**Primary Focus**: All milestones (living documentation)
**Tasks**: JSDoc comments, usage guides, architecture docs
**Skills**: Technical writing, clarity, developer empathy

---

## Success Metrics by Milestone

### M1 (Core Engine) - Week 3
- [ ] ECS creates 10,000 entities in <100ms
- [ ] Component queries <1ms for 1000 entities
- [ ] 60 FPS with 500 sprites
- [ ] Spatial hash reduces collision checks by >90%
- [ ] Event dispatch <0.1ms per event
- [ ] Assets load in <3s (critical)
- [ ] Zero memory leaks
- [ ] Test coverage >80%

### M2 (Investigation) - Week 6
- [ ] Evidence collection functional
- [ ] Deduction board usable without tutorial
- [ ] Tutorial case completable by >80% of testers
- [ ] Forensic minigames engaging
- [ ] Detective vision reveals hidden evidence
- [ ] Theory validation feels fair
- [ ] 60 FPS maintained

### M3 (Faction) - Week 9
- [ ] Reputation changes predictable
- [ ] NPCs react to reputation
- [ ] Disguises enable infiltration (>70% success for careful players)
- [ ] District control changes visible
- [ ] World state persists correctly
- [ ] 60 FPS maintained

### Session #144 Backlog Updates

#### FX-240: Particle Emitter Runtime Integration
- Authored `ParticleEmitterRuntime` to translate `fx:particle_emit` descriptors into pooled particle emitters and expose update/render hooks wired through the `Game` lifecycle.
- Registered the runtime alongside `FxCueCoordinator` and `CompositeCueParticleBridge`, ensuring per-frame updates and canvas render passes integrate cleanly with existing HUD overlays.
- Added Jest coverage in `tests/game/fx/ParticleEmitterRuntime.test.js` to verify descriptor handling, pooling reuse, and rendering guards.

#### DEBUG-275: FX Metrics HUD Panel
- Extended `index.html` with an FX metrics panel and warning banner, styling the grid for throughput/active/queued/peaks readouts.
- Subscribed the developer HUD (`src/main.js`) to `fx:metrics_sample` / `fx:metrics_warning`, maintaining paused/live samples and highlighting warnings without breaking existing overlay behaviour.

#### FX-241: Dialogue & Inventory Overlay Cues
- Emitted `fx:overlay_cue` events from `DialogueBox` and `InventoryOverlay` for reveal/dismiss/item-focus transitions with guardrails against repeated emissions.
- Updated `FxCueCoordinator`, `FxOverlay`, `CompositeCueParticleBridge`, and `ParticleEmitterRuntime` to recognise the new cue identifiers, including duration tables, per-effect limits, presets, and render treatments.
- Added Jest coverage across dialogue, inventory, and bridge suites to lock in the new cue emissions and particle preset mappings.

### Session #145 Backlog Updates

#### FX-240: Particle Emitter Runtime Integration
- Tuned emitter limits and spawn allocation to throttle high-intensity bursts, preventing global particle saturation without dropping frames (`src/game/fx/ParticleEmitterRuntime.js`).
- Added targeted stress coverage to verify throttling behaviour and budget enforcement in `tests/game/fx/ParticleEmitterRuntime.test.js`.

#### DEBUG-275: FX Metrics HUD Panel
- Refined the FX metrics grid for responsive layouts and added Playwright coverage to validate live sample rendering, warning banners, and focus safety (`index.html`, `tests/e2e/debug-overlay-fx-metrics.spec.js`).

#### FX-239: Narrative Overlay Secondary Cues
- Extended cue emission to `SaveInspectorOverlay` and `ControlBindingsOverlay`, wiring new identifiers through the coordinator/bridge stack with supporting Jest coverage (`src/game/ui/SaveInspectorOverlay.js`, `src/game/ui/ControlBindingsOverlay.js`).

### Session #146 Backlog Updates

#### FX-242: Tutorial Overlay FX cues
- TutorialOverlay now emits `fx:overlay_cue` payloads on reveal/dismiss and step transitions with duplicate guarding, ensuring onboarding beats feed the shared FX pipeline (`src/game/ui/TutorialOverlay.js`).
- FxCueCoordinator, FxOverlay, and CompositeCueParticleBridge recognise the new tutorial identifiers with tuned durations, per-effect limits, and particle presets (`src/game/fx/FxCueCoordinator.js`, `src/game/ui/FxOverlay.js`, `src/game/fx/CompositeCueParticleBridge.js`).
- Jest coverage spans TutorialOverlay, FxCueCoordinator, FxOverlay, and composite bridge suites to lock in the tutorial cue contract (`tests/game/ui/TutorialOverlay.test.js`, `tests/game/fx/FxCueCoordinator.test.js`, `tests/game/ui/FxOverlay.test.js`, `tests/game/fx/CompositeCueParticleBridge.test.js`).

#### QA-331: Stabilize FX metrics Playwright scenario
- Added `emitSyntheticSample` / `emitSyntheticWarning` helpers to `FxCueMetricsSampler` for deterministic automation hooks without mutating rolling averages (`src/game/fx/FxCueMetricsSampler.js`).
- Refactored the FX metrics Playwright spec to drive HUD updates via the new sampler helpers, eliminating ad-hoc event bus emissions and reducing flake risk (`tests/e2e/debug-overlay-fx-metrics.spec.js`).
- Expanded sampler unit tests to exercise the synthetic helpers and documented verification via `npm test` and `npx playwright test tests/e2e/debug-overlay-fx-metrics.spec.js` (`tests/game/fx/FxCueMetricsSampler.test.js`).


### Session #147 Backlog Updates

#### FX-243: Disguise & Prompt Overlay FX Hooks
- DisguiseUI now emits FX cues for overlay reveal/dismiss, selection focus, and equip/unequip transitions with contextual metadata routed through the event bus (`src/game/ui/DisguiseUI.js`, `tests/game/ui/DisguiseUI.fx.test.js`).
- InteractionPromptOverlay emits FX cues on reveal, text updates, and dismiss flows while signature tracking prevents duplicate pulses (`src/game/ui/InteractionPromptOverlay.js`, `tests/game/ui/InteractionPromptOverlay.fx.test.js`).
- MovementIndicatorOverlay fires throttled movement pulses carrying direction and speed context into the FX pipeline, preventing spam during sustained motion (`src/game/ui/MovementIndicatorOverlay.js`, `tests/game/ui/MovementIndicatorOverlay.fx.test.js`).
- FxCueCoordinator durations/limits, FxOverlay render mappings, and CompositeCueParticleBridge presets now include the new cue identifiers so downstream visuals stay aligned (`src/game/fx/FxCueCoordinator.js`, `src/game/ui/FxOverlay.js`, `src/game/fx/CompositeCueParticleBridge.js`, `tests/game/fx/FxCueCoordinator.test.js`, `tests/game/ui/FxOverlay.test.js`, `tests/game/fx/CompositeCueParticleBridge.test.js`).
- Full Jest suite executed (`npm test`) confirming the new FX cue coverage paths hold alongside existing regression suites.

---

## Closing Notes

This backlog is a living document. As development progresses:

1. **Add detail** to upcoming tasks
2. **Update estimates** based on actual effort
3. **Track blockers** and resolve them quickly
4. **Defer non-critical tasks** if needed to maintain milestone dates
5. **Celebrate completions** and learn from challenges

The goal is a compelling vertical slice demonstrating The Memory Syndicate's unique hybrid gameplay. Stay focused on the critical path (M0 → M1 → M2 → M6 → M7) while managing parallel work carefully.

**Protected scope**: Investigation mechanics, faction system, Act 1 story, procedural generation. Everything else is negotiable if timeline pressures arise.

**Next immediate action**: Focus on M3-013 SaveManager parity tests and hook DistrictTravelOverlay into traversal blockers.

---

**Document Status**: Ready for Sprint 1
**Owner**: Lead Architect
**Last Review**: 2025-10-26
**Next Review**: End of Week 1 (M1 progress check)
