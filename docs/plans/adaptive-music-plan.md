# Adaptive Music Layering Plan

## Context
- **Research consulted**: `docs/plans/audio-system-plan.md` (Phase 3 adaptive layering goals), Session #46 handoff outstanding items (adaptive layering + SFX catalog), existing ambient controller implementation (`src/game/audio/AmbientSceneAudioController.js`).
- **Current system state**: `AudioManager` supports multi-track adaptive playback through `AdaptiveMusicLayerController`; Memory Parlor now layers ambient/tension/combat stems (procedurally generated) with telemetry. SFX catalog loader is live with UI + investigative cues, and debug overlay exposes live mix telemetry plus SFX preview controls.
- **Problem being solved**: Deliver adaptive music that blends ambient, tension, and combat layers with seamless crossfades tied to narrative/gameplay states, while staging an extensible SFX catalog pipeline that AssetManager can preload. This unlocks dynamic scoring for stealth/combat transitions and prepares UI/gameplay audio feedback.

## Architecture Overview
```
+----------------------------+          +-------------------------------+
|        AudioManager        |          |     AdaptiveMusicLayerController|
| - AudioContext             |          | - Layer registry (ambient/tension/combat)|
| - Gain buses (master/music)|----+---->| - State machine (stealth/combat hooks)  |
| - Buffer cache             |    |     | - Fade scheduler per layer              |
| - Asset bridge (future)    |    |     +-------------------------------+
+----------------------------+    |                 ^
                                  |                 |
                                  v                 |
+----------------------------+    |     +------------------------------+
| AmbientSceneAudioController|----+---->| EventBus (stealth/combat events)|
| - Scene config (Memory Parlor)|       +------------------------------+
| - Scrambler boosts            |
| - State forwarding to adaptive|
+-------------------------------+

AssetManager (catalog) -> AudioManager.loadSound/loadMusic -> Buffer cache shared by layers and SFX pool
```

## Component Breakdown

### Component 1: `AdaptiveMusicLayerController`
- **Purpose**: Manage a set of synchronized looping layers (ambient, tension, combat) and smoothly transition their mix based on named states (`ambient`, `alert`, `combat`).
- **Responsibilities**:
  - Lazily load required buffers via `AudioManager` (`loadMusic`) and cache metadata (loop points, base volume, default fade).
  - Instantiate per-layer gain nodes that feed AudioManager's music bus; start sources in lockstep to maintain phase alignment.
  - Maintain a finite state machine describing target mix per state; expose `setState(stateName, { fadeDuration })`.
  - Emit optional telemetry (`audio:adaptive:state_changed`) for overlays.
- **Dependencies**:
  - `AudioManager` (must expose `getBuffer(id)` and `createBusGain('music')` for sub-bus creation).
  - EventBus for telemetry.
- **Interface**:
```javascript
class AdaptiveMusicLayerController {
  constructor(audioManager, options = {}) {}
  async init() {}
  async preload() {}
  setState(stateName, options = {}) {}
  getState() {}
  dispose() {}
}
```
- **Events**: Emits `audio:adaptive:state_changed` with `{ from, to, timestamp }`; listens optionally to EventBus if provided.
- **Testing**: Mocked `AudioContext` verifying fade scheduling, loop alignment, and state transitions without creating duplicate sources.

### Component 2: `AdaptiveMusicLayer` (internal helper)
- **Purpose**: Encapsulate individual layer playback (buffer source + gain automation).
- **Responsibilities**:
  - Start buffer with configured loop points and maintain reference to gain node.
  - Provide `setVolume(volume, fadeDuration, now)` to schedule ramps.
  - Handle stop/dispose logic.
- **Dependencies**:
  - Audio context + destination gain supplied by controller.
- **Interface** (internal use):
```javascript
class AdaptiveMusicLayer {
  constructor(audioContext, buffer, destinationGain, options) {}
  start(startTime) {}
  setVolume(volume, { fadeDuration }, now) {}
  dispose(stopTime) {}
}
```
- **Testing**: Covered indirectly through controller unit tests.

### Component 3: `AmbientSceneAudioController` (updated)
- **Purpose**: Route Memory Parlor scrambler events into adaptive states instead of directly manipulating master music volume.
- **Responsibilities**:
  - Configure adaptive controller with layer/state mapping (ambient baseline, stealth tension lift, scrambler alert boost, combat escalation) backed by bespoke tension/combat stems.
  - Forward `firewall:scrambler_*` events to `AdaptiveMusicLayerController.setState` (`alert` during scrambler active, fallback to ambient/stealth on cooldown/expiry).
  - React to disguise lifecycle (`disguise:equipped`, `disguise:removed`, `disguise:blown`) and combat cadence (`combat:initiated`, `combat:resolved`) so stealth/combat states override ambient contexts with clear priority ordering.
  - Default configuration now loads procedural stems (`goodnightmare-tension.wav`, `goodnightmare-combat.wav`) while retaining ambient fallback if assets fail, and exposes an optional `stealth` state profile.
- **Dependencies**:
  - `AdaptiveMusicLayerController` (new dependency).
  - Existing EventBus + scrambler event schema.
- **Interface changes**: Additional options `states`, `layers`, `adaptiveControllerOptions`.
- **Testing**: Updated unit suite verifying state transitions and fallback behavior.

### Component 4: Debug Audio Telemetry & Preview Tools
- **Purpose**: Surface adaptive mix state and SFX catalog metadata to narrative/audio designers for rapid iteration.
- **Responsibilities**:
  - Capture `audio:adaptive:state_changed` events via `Game.getAdaptiveAudioTelemetry()` and render live history in the debug overlay.
  - Expose catalog metadata through `Game.getSfxCatalogEntries()` and allow designers to trigger previews with `Game.previewSfx(soundId)`.
  - Provide clear licensing/source annotations (CC0 procedural stems + UI cues) for audit.
- **Dependencies**:
  - `Game` coordinator (event bus access, catalog loader residency).
  - Debug overlay DOM in `index.html`/`main.js`.
- **Interface**:
```javascript
game.getAdaptiveAudioTelemetry(); // { currentState, history[] }
game.getSfxCatalogEntries();      // [{ id, file, tags, description, baseVolume }]
game.previewSfx('investigation_clue_ping');
```
- **Testing**: Jest coverage in `tests/game/ui/GameAudioTelemetry.test.js` (telemetry) and `tests/game/Game.uiOverlays.test.js` (SFX preview hook) plus Playwright smoke (`tests/e2e/adaptive-audio-transitions.spec.js`, `tests/e2e/sfx-catalog-filter.spec.js`).

### Component 4: `SFXCatalog` configuration
- **Purpose**: Provide declarative SFX asset definitions consumed by `AssetManager` and `AudioManager`.
- **Responsibilities**:
  - JSON manifest under `assets/sfx/catalog.json` describing id, file, tags, default volume, licensing.
  - Loader utility `src/game/audio/SFXCatalogLoader.js` to iterate manifest, call `AssetManager.loadAudio` or `AudioManager.loadSound`, and expose metadata for narrative hooks.
- **Testing**: Unit test ensuring loader registers all catalog entries and respects volume defaults.

## Data Flow
```
Scene load →
  AmbientSceneAudioController.init()
    ├─> AdaptiveMusicLayerController.preload() // load buffers via AudioManager
    └─> AdaptiveMusicLayerController.init()
             ├─> create GainNode per layer (ambient/tension/combat)
             ├─> start buffer sources with shared start time
             └─> set default state ('ambient')

Gameplay event (scrambler activated) →
  EventBus emits firewall:scrambler_activated →
    AmbientSceneAudioController.setState('alert') →
      AdaptiveMusicLayerController ramps volumes (ambient 0.55→0.35, tension 0→0.75, combat 0)
      Event telemetry audio:adaptive:state_changed broadcast

Combat escalation (future hook) →
  Controller.setState('combat') →
    Combat layer gain ramps up, others attenuate.

SFX request →
  UI/System emits 'sfx:play' with id →
    SFXCatalogLoader ensures AudioManager has buffer →
    AudioManager.playSFX id using pool (volume default from catalog)
```

## Implementation Order

### Phase A: Engine Enhancements (Est. 3 hours)
- Extend `AudioManager` with `getBuffer(id)` and `createBusGain(bus)` utilities.
- Implement `AdaptiveMusicLayerController` and internal helper.
- Unit tests for controller covering preload, state changes, fade scheduling, and disposal.

### Phase B: Scene Integration (Est. 2 hours)
- Refactor `AmbientSceneAudioController` to compose adaptive controller.
- Define Memory Parlor layer/state configuration (ambient base, scrambler alert, combat placeholder).
- Update tests to validate state-driven behavior.
- Emit telemetry for adaptive state changes.

### Phase C: SFX Catalog Pipeline (Est. 2 hours)
- Author `assets/sfx/catalog.json` with initial UI/core gameplay cues (confirm licensing).
- Implement `SFXCatalogLoader` bridging AssetManager and AudioManager.
- Integrate loader into game bootstrap (`Game.js`) and ensure fallback in headless environments.
- Unit tests verifying manifest parsing and AudioManager invocation.

### Phase D: CI/Docs (Est. 1 hour)
- Update GitHub Actions Playwright job summary.
- Document adaptive music + SFX catalog in audio plan & changelog/backlog.

## File Changes
- **New**: `src/engine/audio/AdaptiveMusicLayerController.js`, `src/engine/audio/internal/AdaptiveMusicLayer.js` (or inline), `src/game/audio/SFXCatalogLoader.js`, `assets/sfx/catalog.json`, `tests/engine/audio/AdaptiveMusicLayerController.test.js`, `tests/game/audio/SFXCatalogLoader.test.js`.
- **Modified**: `src/engine/audio/AudioManager.js`, `src/game/audio/AmbientSceneAudioController.js`, `src/game/Game.js`, `docs/plans/backlog.md` (task updates), `docs/CHANGELOG.md`.
- **Build/Test**: `package.json` scripts remain unchanged; rely on `npm test`.

## Performance Considerations
- Keep layer count small (≤3 simultaneous loops) to preserve CPU budget; reuse shared start time to avoid drift.
- Reuse GainNodes instead of recreating sources on each state change; avoid per-frame allocations by scheduling once per transition.
- Ensure `SFXCatalogLoader` batches fetches and respects AssetManager caching.

## Testing Strategy
### Unit
- Adaptive controller fade scheduling, state transitions, dispose cleanup.
- SFX catalog loader ensuring all entries load and default volumes applied.

### Integration
- Ambient controller integration test verifying state change wiring and scrambler reactions.
- Game bootstrap test verifying loader invoked.

### Performance
- Benchmark layered playback (scripted via mock context) to confirm minimal allocations.

## Rollout Plan
1. Land engine enhancements with tests.
2. Integrate ambient controller and Memory Parlor configuration.
3. Introduce SFX catalog + loader; populate initial assets.
4. Update docs/backlog; record architecture decision.
5. Monitor Playwright + audio unit tests for regressions; profile layering under scrambler spam.

## Risk Assessment
1. **Risk**: AudioContext drift causing desync between layers.
   - **Mitigation**: Start all buffers at shared timestamp and avoid restarting sources per transition.
   - **Likelihood**: Medium, **Impact**: High.
2. **Risk**: Increased CPU usage from multiple simultaneous loops.
   - **Mitigation**: Limit to lightweight ambient loops; profile under load.
   - **Likelihood**: Low, **Impact**: Medium.
3. **Risk**: Asset licensing gaps for new SFX.
   - **Mitigation**: Document sources, store metadata in catalog, vet under CC0/Public Domain.

## Success Metrics
- Adaptive state transitions complete within configured fade durations without audible pops.
- Unit + ambient integration tests achieve >90% coverage for new modules.
- Minimum of three SFX catalog entries available and playing via AudioManager.
- 60 FPS maintained under scrambler stress scenarios (no additional GC churn from audio layering).
- Documentation/backlog updated to reflect adaptive music + SFX catalog availability.
