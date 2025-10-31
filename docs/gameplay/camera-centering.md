# Camera Centering & Follow Tuning

The player camera is driven by `CameraFollowSystem`, which reads `GameConfig.camera` to determine how aggressively the viewport tracks the player, how much lead it applies in the direction of travel, and when to suppress motion to avoid jitter during interaction prompts. These notes close out CORE-302’s outstanding documentation requirement and provide the baseline for the CORE-303 investigative loop handoff.

## Runtime Flow

1. `CameraFollowSystem` queries the first entity tagged with `PlayerController` and `Transform`.
2. The system computes a look-ahead offset using the player’s current velocity and `GameConfig.camera.lookAheadDistance`.
3. If the distance to the target exceeds `GameConfig.camera.deadzone`, the system lerps towards that target using `GameConfig.camera.followSpeed`.
4. Movement emits `camera:moved`, ensuring UI overlays and narrative triggers can react to camera transitions. Shake-related cues use `Camera.shake`, which respects `GameConfig.camera.shakeDecay` and `minShakeThreshold`.

Unit coverage for this behaviour lives in `tests/game/systems/CameraFollowSystem.test.js`, validating look-ahead application, deadzone constraints, and follow speed smoothing.

## Tuning Parameters

| Config Key | Default | Purpose | Suggested Range (CORE-303) |
|------------|---------|---------|-----------------------------|
| `followSpeed` | `0.1` | Fraction of the remaining distance applied per frame. Lower values smooth the follow, higher values feel snappier. | `0.08 – 0.18` |
| `lookAheadDistance` | `100` | Pixels to bias towards current velocity, keeping destination tiles in frame during traversal. | `80 – 140` |
| `deadzone` | `32` | Radius around the player (in pixels) where the camera stays still, preventing jitter while interacting with evidence or NPCs. | `24 – 48` |
| `shakeDecay` | `0.8` | Multiplier applied to shake intensity each frame. Lower values dampen quicker. | `0.75 – 0.9` |
| `minShakeThreshold` | `0.1` | Shake stops when intensity falls below this value, keeping UI steady after cinematic beats. | `0.05 – 0.15` |

## Handoff Notes for CORE-303

- When Detective Vision or witness conversations lock the player in place, consider temporarily increasing `deadzone` to `48` to avoid micro-adjustments that nudge the camera mid-dialogue. Restore the default once control is returned.
- If the investigative loop introduces sprint phases, bump `lookAheadDistance` to `120` in tandem with the sprint toggle to keep destination interactables framed.
- Narrative overlays listening to `camera:moved` should debounce on `requestAnimationFrame` rather than timers so they stay in sync with the renderer’s 60 FPS cadence.

Update both `GameConfig.camera` and this page when altering the values so future sessions inherit the rationale behind any tuning adjustments.
