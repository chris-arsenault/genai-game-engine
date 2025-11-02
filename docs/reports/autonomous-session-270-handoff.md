# Autonomous Development Session #270 – Faction System ECS Integration
**Date**: 2025-11-06  
**Sprint**: Sprint 8 – Final Polish & Production  
**Duration**: ~60m  
**Focus**: Wire the global FactionManager reputation state into the ECS so NPC behaviour and dialogue react immediately to faction attitude shifts.

## Summary
- Added a dedicated `FactionSystem` that listens to reputation/attitude events, keeps `Faction` components synced with the FactionManager, and emits per-entity attitude updates for downstream systems.
- Introduced a lightweight `Faction` component on NPC entities, pushing behaviour state and dialogue variant selection alongside the existing `FactionMember` reputation data.
- Updated `Game.initializeGameSystems()` to register the new system (priority-aligned with social stealth layers) and refreshed Jest coverage plus documentation/backlog entries to reflect the new flow.
- Captured an architecture decision documenting the event-driven FactionSystem approach and how it centralises faction-aware narrative hooks.

## Deliverables
- `src/game/systems/FactionSystem.js` – event-driven ECS system bridging FactionManager, NPC behaviour, and dialogue routing.
- `src/game/components/Faction.js` – component storing primary faction metadata, overrides, and active dialogue variants.
- `src/game/entities/NPCEntity.js`, `src/game/Game.js` – NPC factory now adds `Faction` components and the game bootstraps the new system.
- `tests/game/systems/FactionSystem.test.js`, `tests/game/Game.systemRegistration.test.js` – Jest coverage for attitude synchronisation, dialogue variants, overrides, and registration expectations.
- `docs/plans/backlog.md` – M3-003 marked completed with notes on the new system and coverage.

## Verification
- `npm test -- tests/game/systems/FactionSystem.test.js`
- `npm test`

## Backlog Updates
- MCP backlog item **M3-003: FactionSystem (ECS Integration)** marked done with completed work notes; no remaining next steps.
- `docs/plans/backlog.md` updated to record the completed status and reference the new system deliverables.

## Outstanding Work & Next Steps
- Hook SocialStealth/NPC AI listeners into `npc:attitude_changed` as needed for stealth reactivity and suspicion tuning.
- Extend dialogue content to author faction-specific variants that leverage the new routing.
- Monitor faction event volume during playtests to ensure the added system stays within frame-time budgets.

## Notes
- Architecture decision `22af4dd8-91e1-4062-a1e0-2922bae0d8c6` captures the rationale for centralising faction-to-ECS synchronisation via the new system.
- FactionSystem listens to `interaction:dialogue` at priority 40 so dialogue variants resolve before `DialogueSystem`; adjust future listeners to respect this ordering if they depend on resolved IDs.
- Behaviour state hints (`supportive`/`neutral`/`aggressive`) are exposed on NPC components for upcoming AI logic but are currently informational only.
