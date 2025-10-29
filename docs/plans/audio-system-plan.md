# Audio System Implementation Plan

## Context
- **Research consulted**: Existing audio requirements captured in `docs/plans/project-overview.md` (AudioManager + adaptive music section), Session #30 audio feedback handoff, Session #45 handoff outstanding items.
- **Current system state**: `src/engine/audio/AudioManager.js` and `src/engine/audio/AdaptiveMusic.js` are skeletal. `AudioFeedbackController` emits SFX requests but receives no audible output. Memory Parlor ambient/audio hooks are pending. Asset manifest lacks integrated audio buffers.
- **Problem being solved**: Deliver a production-ready audio foundation that can (1) load and cache SFX/music, (2) provide reliable playback with pooling + volume buses, (3) expose narrative hooks for scrambler/scene transitions, and (4) unblock Memory Parlor ambient loop integration and future adaptive music layers.

## Architecture Overview
```
┌────────────────────────────┐
│        Engine (ECS)        │
│  ┌──────────────────────┐  │
│  │    AudioManager      │◄─┼── AssetManager (optional source URLs)
│  │  - AudioContext      │  │
│  │  - Gain buses        │  │
│  │  - Buffer caches     │  │
│  │  - SFX pool          │  │
│  └───────┬──────────────┘  │
│          │ Play/Load API   │
│  ┌───────▼──────────────┐  │
│  │   MusicChannel       │◄─┼── Ambient controllers (scene-specific)
│  │ - current source     │  │
│  │ - fade automation    │  │
│  └───────┬──────────────┘  │
│          │ Event hooks      │
│  ┌───────▼──────────────┐  │
│  │AudioFeedbackController│◄─┼── EventBus (sfx cues)
│  └──────────────────────┘  │
└────────────────────────────┘
```

### Component Breakdown

#### Component 1: `AudioManager`
- **Purpose**: Centralized Web Audio API wrapper responsible for initializing the audio graph, caching decoded buffers, routing playback through master/music/SFX buses, and exposing promise-based load/play primitives.
- **Responsibilities**:
  - Initialize lazily on first use (supports user-gesture requirement).
  - Maintain separate gain nodes for `master`, `music`, `sfx`, and optional `ambience`.
  - Decode and cache audio buffers (both SFX and long-form music) from URLs or Blob sources.
  - Manage an object pool of `AudioBufferSourceNode` + `GainNode` pairs for low-latency SFX dispatch.
  - Expose `playSFX`, `playMusic`, `stopMusic`, `fadeMusic`, and `setBusVolume` APIs.
  - Provide no-op fallbacks when AudioContext is unavailable (headless/testing environment).
  - Surface load/play failures through structured errors and debug logs.
- **Dependencies**:
  - Browser `AudioContext` / `webkitAudioContext`.
  - Optional integration with `AssetManager` (accept predecoded buffers or fetch URLs directly).
- **Interface**:
```javascript
class AudioManager {
  async init(options) {}
  async loadSound(soundId, urlOrBuffer, {gainBus, preDecode} = {}) {}
  async loadMusic(trackId, urlOrBuffer, {loop, loopStart, loopEnd} = {}) {}
  playSFX(soundId, {volume, detune, position} = {}) {}
  playMusic(trackId, {volume, fadeDuration, startAt} = {}) {}
  stopMusic({fadeDuration} = {}) {}
  setBusVolume(bus, volume, {fadeDuration} = {}) {}
  setListenerPosition(x, y) {}
}
```
- **Events**:
  - Emits debug events via `EventBus` (e.g., `audio:music:started`, `audio:sfx:missing`) to support tooling overlays.
  - Listens optionally to `audio:*` events routed from gameplay systems.
- **Testing**: Use dependency-injected mock `AudioContext` to verify buffer caching, pooling reuse, fade automation sequencing, and fallback behavior in Node (no Web Audio).

#### Component 2: `MusicChannel`
- **Purpose**: Dedicated helper attached to `AudioManager` to manage a single active music stream with crossfade automation and state tracking.
- **Responsibilities**:
  - Track currently playing track metadata, source node, and fade envelopes.
  - Schedule fades using `AudioContext.currentTime` for sample-accurate transitions.
  - Support `loopStart` / `loopEnd` markers for seamless loops (Memory Parlor ambient).
  - Provide `setState` hook for future adaptive layering.
- **Dependencies**:
  - `AudioManager` for audio context, gain nodes, and buffer lookup.
- **Interface**:
```javascript
class MusicChannel {
  constructor(audioContext, destinationGain) {}
  play(buffer, {volume, fadeDuration, loop, loopStart, loopEnd, startAt} = {}) {}
  stop({fadeDuration} = {}) {}
  getCurrentTrack() {}
}
```
- **Events**: Raises callbacks to `AudioManager` for onStart/onComplete; optionally emits overlay metrics.
- **Testing**: Unit tests validate fade automation scheduling, loop marker application, and cleanup.

#### Component 3: `SFXPool`
- **Purpose**: Lightweight object pool for short-lived SFX nodes to avoid per-play allocations.
- **Responsibilities**:
  - Maintain reusable `GainNode` instances and guard against node reuse after stop.
  - Support detune/volume overrides per play.
  - Return nodes to pool on `ended` event.
- **Dependencies**: Web Audio `AudioBufferSourceNode`, `GainNode`.
- **Interface**:
```javascript
class SFXPool {
  constructor(audioContext, destinationGain, poolSize = 24) {}
  acquire(buffer) {}
  release(source) {}
}
```
- **Events**: none (internal).
- **Testing**: Validate reuse counts, fallback creation when pool exhausted, cleanup after stop.

#### Component 4: `AmbientSceneAudioController` (Memory Parlor integration)
- **Purpose**: Scene-scoped controller that coordinates ambient loop playback and scrambler-driven intensity adjustments.
- **Responsibilities**:
  - Request ambient track preload on scene load.
  - Start loop with stealth-friendly volume baseline.
  - On `firewall:scrambler_activated`, raise intensity (volume or layered cue) for duration; restore after `scrambler_expired`.
  - Provide cleanup to stop music and release scene-specific buffers when scene unloads.
- **Dependencies**: `AudioManager`, EventBus.
- **Interface**:
```javascript
class AmbientSceneAudioController {
  constructor(audioManager, eventBus, options = {}) {}
  async init() {}
  dispose() {}
}
```
- **Events**:
  - Listens to `firewall:scrambler_*`, `scene:unloaded`.
  - Optionally emits `audio:ambient:state` for debug overlays.
- **Testing**: Unit tests mocking `AudioManager` to ensure event-driven volume/fade calls, cleanup operations, and idempotent init/teardown.

## Data Flow
```
Player input / world events
  └─> EventBus ──> AudioFeedbackController (SFX cues)
                            │
                            └─> AudioManager.playSFX(...)

Quest / Scene transitions (Memory Parlor load)
  └─> AmbientSceneAudioController.init()
            │
            ├─> AudioManager.loadMusic('memory_parlor_ambient', url)
            └─> AudioManager.playMusic('memory_parlor_ambient', { loop, volume })
                    │
                    └─> MusicChannel schedules fade + loop markers

Scrambler activation / expiry events
  └─> AmbientSceneAudioController
            │
            ├─> AudioManager.setBusVolume('music', 0.9, fade)
            └─> After expiry → AudioManager.setBusVolume('music', 0.55, fade)

World state overlay
  └─> EventBus receives `audio:*` telemetry for debug layer.
```

## Implementation Order

### Phase 1: Core Audio Foundation (Est. 3-4 hours)
- Implement `AudioManager` with initialization guards, buffer caches, bus routing, pooling, and tests.
- Create `MusicChannel` + `SFXPool` helpers (unit-tested).
- Ensure Node/Jest compatibility via injected mock context or graceful fallbacks.
- Files:
  - `src/engine/audio/AudioManager.js` (major implementation)
  - `src/engine/audio/MusicChannel.js` (new)
  - `src/engine/audio/SFXPool.js` (new)
  - `tests/engine/audio/AudioManager.test.js`
  - `tests/engine/audio/MusicChannel.test.js`
  - `tests/engine/audio/SFXPool.test.js`
- Success Criteria:
  - Tests validate initialization, load/play semantics, pooling reuse, fade scheduling.
  - AudioManager no-ops cleanly when Web Audio unavailable.

### Phase 2: Scene-Level Ambient Integration (Est. 2 hours)
- Add `AmbientSceneAudioController` for Memory Parlor (new file under `src/game/audio/`).
- Update `loadMemoryParlorScene` to instantiate controller with cleanup handshake.
- Source ambient asset (`assets/music/memory-parlor/goodnightmare.mp3`) and register in manifest (or direct load path).
- Add unit tests for controller (mock event bus + audio manager).
- Success Criteria:
  - Ambient loop starts on scene load, volume reacts to scrambler events with tests verifying event dispatch.

### Phase 3: CI/Tooling Enhancements + Docs (Est. 1 hour)
- Extend GitHub Actions workflow with HTML reporter/traces.
- Document audio system usage + debug overlay integration.
- Update backlog, architecture decisions, and session handoff.

### Phase 4: Adaptive Music Layering & Catalog (Est. 4 hours)
- Implement `AdaptiveMusicLayerController` for layered ambient/alert/combat mixes (see `docs/plans/adaptive-music-plan.md` for detailed design).
- Refactor `AmbientSceneAudioController` to delegate state transitions and telemetry to adaptive controller.
- Bootstrap SFX catalog (`assets/sfx/catalog.json`) and loader to prewarm Kenney UI cues via `SFXCatalogLoader`.
- Update Game initialization to await catalog preload before wiring `AudioFeedbackController`.
- Success Criteria:
  - Scrambler events trigger adaptive state changes with unit coverage.
  - CC0 UI cues loaded and playable through AudioManager (no fallback logging).
  - Debug overlay surfaces adaptive telemetry + SFX preview buttons for designers.
  - CI publishes Playwright summary referencing HTML report/trace artifacts.

## File Changes

### New Files
- `src/engine/audio/MusicChannel.js` – Handles music playback + fade automation.
- `src/engine/audio/SFXPool.js` – Manages pooled SFX playback nodes.
- `src/game/audio/AmbientSceneAudioController.js` – Memory Parlor ambient controller.
- `tests/engine/audio/AudioManager.test.js` – Core AudioManager tests.
- `tests/engine/audio/MusicChannel.test.js` – Fade + state coverage.
- `tests/engine/audio/SFXPool.test.js` – Pooling behavior tests.
- `tests/game/audio/AmbientSceneAudioController.test.js` – Event-driven ambient coverage.
- `tests/game/audio/GameAudioTelemetry.test.js` – Adaptive telemetry + debug hooks coverage.
- `assets/music/memory-parlor/goodnightmare.mp3` – Ambient loop (FreePD CC0).
- `assets/music/memory-parlor/goodnightmare-tension.wav` – Procedural tension stem (CC0 self-authored).
- `assets/music/memory-parlor/goodnightmare-combat.wav` – Procedural combat stem (CC0 self-authored).
- `assets/sfx/investigation/` – Procedural investigative cues (clue ping, trace loop, negative hit).

### Modified Files
- `src/engine/audio/AudioManager.js` – Full implementation and new API surface.
- `src/game/Game.js` – Pass audio options to scene loader, expose ambient controller lifecycle, surface telemetry & SFX previews.
- `src/game/scenes/MemoryParlorScene.js` – Wire AmbientSceneAudioController.
- `assets/manifest.example.json` (and manifest if present) – Register ambient asset.
- `index.html` / `src/main.js` – Debug overlay wiring for adaptive telemetry and SFX preview UI.
- `assets/sfx/catalog.json` – Expanded catalog metadata (UI + investigation cues).
- `.github/workflows/ci.yml` – Add HTML reporter artifact publishing.
- `docs/CHANGELOG.md`, `docs/plans/backlog.md` – Reflect audio/CI updates.
- `docs/guides/audio-overview.md` (new or updated) – Document system for devs.

### Interface Definitions
```javascript
// Simplified audio API for gameplay systems
class AudioManager {
  /** @returns {Promise<void>} */
  async init() {}
  /** @returns {Promise<AudioBuffer>} */
  async loadSound(id, source, options) {}
  /** @returns {Promise<AudioBuffer>} */
  async loadMusic(id, source, options) {}
  /** @returns {boolean} */
  hasBuffer(id) {}
  /** @returns {void} */
  playSFX(id, options) {}
  /** @returns {void} */
  playMusic(id, options) {}
  /** @returns {void} */
  setBusVolume(bus, volume, options) {}
  /** @returns {void} */
  dispose() {}
}

class AmbientSceneAudioController {
  constructor(audioManager, eventBus, options) {}
  async init() {}
  dispose() {}
}
```

## Performance Considerations
- **Memory**: Cached audio buffers capped via configuration; large music buffers released on scene exit.
- **CPU hotspots**: Avoid frequent allocations—object pool pre-allocates nodes; fade automation uses AudioParam scheduling instead of manual updates.
- **Optimization opportunities**: Future spatialization via PannerNodes, streaming via MediaElementSource for very long tracks, dynamic compression on master bus.
- **Profiling points**: Monitor `AudioContext.baseLatency`, `AudioBufferSourceNode` counts. Use Chrome tracing to verify no main-thread jank on decode.
- **Stress scenarios**: Multiple SFX triggered per frame (combat), rapid scrambler toggling. Ensure fades accumulate without clipping or residual nodes.

## Testing Strategy
### Unit Tests
- AudioManager initialization fallback when Web Audio missing.
- Buffer caching and idempotent load behavior.
- SFXPool reuse + release after `ended` event.
- MusicChannel fade scheduling and loop markers.
- AmbientSceneAudioController responding to scrambler events.

### Integration Tests
- Simulated EventBus sequence: Memory Parlor load → scrambler activated → expired; assert audio manager receives expected calls (mocked environment).
- Optional Playwright smoke step verifying audio telemetry overlay events (future).

### Performance Tests
- Node-based benchmark generating 100 SFX plays/minute verifying pool reuse counts (future).
- Browser profiling session (manual) to ensure 16 ms frame budget unaffected.

## Rollout Plan
1. Implement Phase 1 foundation + tests (`npm test`).
2. Integrate Memory Parlor ambient controller + tests.
3. Update asset manifest + source audio file (document licensing).
4. Extend CI workflow for Playwright HTML artifacts.
5. Document audio system usage & update backlog.
6. Run Playwright smoke tests (local) to ensure pipeline parity.
7. Record architecture decision & publish updated handoff.

## Risk Assessment
1. **Risk**: Web Audio initialization blocked by autoplay policies.
   - *Mitigation*: Provide `init({resumeOnGesture})` helper + log warnings; degrade gracefully until user gesture triggers `resume`.
2. **Risk**: Large audio buffers inflate memory.
   - *Mitigation*: Release music buffers on scene exit; support streaming fallback.
3. **Risk**: CI tests fail due to missing Web Audio.
   - *Mitigation*: Mock AudioContext in Jest tests; guard runtime code against undefined context.

## Success Metrics
- AudioManager tests achieve >90% statement coverage.
- Memory Parlor ambient loop audibly reacts to scrambler events (manual + telemetry confirmation).
- CI workflow publishes Playwright HTML report + traces artifacts on every run.
- Documentation updated; backlog reflects completed audio tasks.
- `npm test` + `npx playwright test --reporter=line,html` succeed locally with new audio tests.
