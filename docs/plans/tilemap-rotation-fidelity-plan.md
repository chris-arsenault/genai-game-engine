# Tilemap Rotation Fidelity Plan

## Context
- Research consulted: _None recorded for tilemap rotation; note need for future procedural art research._
- Architecture decisions referenced:
  - `Graph-Based District Layout with BSP Subdivision` (2025-10-27).
  - `NarrativeAnchorManager for Hybrid Fixed-Procedural Districts` (2025-10-27).
- Current system state:
  - `DistrictGenerator` supports rotated room bounds for placement/collision but tilemaps remain axis-aligned.
  - Corridor validation ensures rotated rooms fit but visual seams may misalign (doors, walls, props).
  - Tile templates do not provide rotated variants; corridor painter assumes default orientation.
- Problem being solved: Ensure rotated rooms render correctly by rotating tile content or selecting appropriate variants so procedural districts look coherent and corridor seams host door tiles.

## Architecture Overview
```
Room Template (0°) ──┐
                     ├─> TemplateVariantResolver ──┐
Room Rotation (θ) ──┘                             │
                                                  ▼
TileRotationMatrix → TilemapTransformer → CorridorSeamPainter → Final Tilemap
```

### Component Breakdown
Component 1: `TileRotationMatrix`

- **Purpose**: Provide reusable math utilities for rotating tile coordinates and adjusting tile orientation metadata.
- **Responsibilities**:
  - Compute rotated tile positions for 90° increments and arbitrary angles (fallback to nearest supported orientation).
  - Adjust tile metadata (flip flags, rotation codes) for the renderer.
  - Offer helpers for bounding box recalculation.
- **Dependencies**:
  - None beyond standard math utilities.
- **Interface**:
  ```javascript
  export class TileRotationMatrix {
    static rotateTileCoords(x, y, width, height, rotation);
    static normalizeRotation(rotation);
    static transformTile(tile, rotation);
  }
  ```
- **Events**: None.
- **Testing**: Unit tests verifying rotations for 0/90/180/270° and metadata transformations.

Component 2: `TemplateVariantResolver`

- **Purpose**: Manage mapping between base room templates and rotated/alt variants when pure rotation insufficient.
- **Responsibilities**:
  - Load variant definitions (`templates/rooms/*.json`) specifying available rotations or bespoke art.
  - Determine whether to rotate tiles or swap to variant asset.
  - Provide seam metadata (door positions) for each orientation.
- **Dependencies**:
  - Procedural asset manifest (`src/game/procedural/templates/index.js`).
  - Narrative anchors (ensuring important rooms have bespoke variants).
- **Interface**:
  ```javascript
  export class TemplateVariantResolver {
    constructor(manifest);
    resolve(roomType, baseTemplateId, rotation);
  }
  ```
- **Events**: None.
- **Testing**: Unit tests verifying variant selection logic and seam metadata.

Component 3: `TilemapTransformer`

- **Purpose**: Apply rotation transformations or variants to room tile data and stitch corridors appropriately.
- **Responsibilities**:
  - Use `TileRotationMatrix` to transform base tiles when variants not available.
  - Merge variant seam descriptors with `CorridorSeamPainter`.
  - Update collision layers and metadata to reflect rotation.
- **Dependencies**:
  - `TemplateVariantResolver`.
  - `TileMap` builder within `DistrictGenerator`.
- **Interface**:
  ```javascript
  class TilemapTransformer {
    constructor(variantResolver);
    transform(roomTemplate, rotation);
    applyCorridorSeams(roomInstance, corridors);
  }
  ```
- **Events**: None.
- **Testing**: Integration tests with sample templates verifying rotated output and seams align.

Component 4: `CorridorSeamPainter`

- **Purpose**: Paint door tiles/decals at corridor connection points for rotated rooms.
- **Responsibilities**:
  - Determine seam direction from rotated room orientation.
  - Place appropriate door tiles (including rotated art) and collision updates.
- **Dependencies**:
  - `TilemapTransformer` seam metadata.
  - Tile asset catalog.
- **Interface**:
  ```javascript
  export function paintCorridorSeams(tilemap, seams, rotation);
  ```
- **Events**: None.
- **Testing**: Integration tests for seam painting across orientations.

### Data Flow
- `DistrictGenerator` selects rotation for room.
- `TemplateVariantResolver.resolve()` returns either a rotated tilemap or variant ID with seam data.
- `TilemapTransformer.transform()` generates rotated tile layer(s) and updates collision metadata.
- Corridors processed through `CorridorSeamPainter`, ensuring door tiles align with rotated orientation.
- Final tilemap composed with correct visuals and seams.

## Implementation Order

Phase 1: Math & variant scaffolding (Est: 2 hours)
- Files: `src/engine/procedural/TileRotationMatrix.js`, `tests/engine/procedural/TileRotationMatrix.test.js`.
- Success criteria: Rotation utilities validated for standard angles.

Phase 2: Variant manifest & resolver (Est: 2 hours)
- Files: `src/game/procedural/templates/index.js`, `src/game/procedural/TemplateVariantResolver.js`, tests.
- Success criteria: Resolver returns correct variant or fallback rotation decision.

Phase 3: Tilemap transformer integration (Est: 3 hours)
- Modified files: `src/game/procedural/DistrictGenerator.js`, `src/game/procedural/TileMap.js`, `tests/game/procedural/DistrictGenerator.test.js`.
- Success criteria: Rotated room tilemaps align visually; tests compare before/after snapshots.

Phase 4: Corridor seam painting (Est: 2 hours)
- Files: `src/game/procedural/CorridorSeamPainter.js`, `tests/game/procedural/CorridorSeamPainter.test.js`.
- Success criteria: Door tiles render at seam entry points for all rotations.

Phase 5: Documentation & tooling (Est: 1 hour)
- Files: `docs/guides/procedural-generation-integration.md` update; optional new art sourcing checklist.
- Success criteria: Documentation covers rotation variants and seam authoring.

## File Changes

### New Files
- `src/engine/procedural/TileRotationMatrix.js` – Math utilities for tile rotation.
- `src/game/procedural/TemplateVariantResolver.js` – Variant selection and seam metadata.
- `src/game/procedural/CorridorSeamPainter.js` – Corridor seam rendering helper.
- `tests/engine/procedural/TileRotationMatrix.test.js` – Rotation math coverage.
- `tests/game/procedural/TemplateVariantResolver.test.js` – Variant logic tests.
- `tests/game/procedural/CorridorSeamPainter.test.js` – Seam painting coverage.

### Modified Files
- `src/game/procedural/DistrictGenerator.js` – Integrate transformer & seam painter during room placement.
- `src/game/procedural/TileMap.js` – Support rotated tile writes and orientation metadata.
- `tests/game/procedural/DistrictGenerator.test.js` – Add scenarios covering rotated tilemaps and seams.
- `docs/guides/procedural-generation-integration.md` – Document rotation workflow.
- `assets/tilesets/manifest.json` – (If required) declare rotated variant assets or door tiles.

### Interface Definitions
```javascript
export class TemplateVariantResolver {
  /**
   * @param {Object} manifest
   */
  constructor(manifest = {}) {
    this.manifest = manifest;
  }

  /**
   * @param {string} roomType
   * @param {string} templateId
   * @param {number} rotation
   * @returns {{ template: object, rotation: number, seams: object[] }}
   */
  resolve(roomType, templateId, rotation = 0) {}
}
```

## Performance Considerations
- Rotation process should operate during generation only; avoid per-frame costs.
- Cache rotated tilemaps for identical template+rotation combinations to reduce repeated work (memoization keyed by templateId+rotation).
- Ensure seam painting iterates only over relevant tiles (corridor endpoints) to keep complexity O(seams).
- Monitor generation time; target <75 ms for standard district generation with rotations enabled.

## Testing Strategy

### Unit Tests
- Rotation matrix outputs for 0/90/180/270°.
- Variant resolver selecting correct assets for rotated rooms.

### Integration Tests
- District generation snapshot comparing rotated tilemaps to expected results.
- Corridor seam painter ensures door tiles placed correctly for each orientation.
- Narrative anchor rooms confirm variant override retains fixed orientation requirements.

### Performance Tests
- Benchmark district generation with rotation enabled vs disabled; ensure delta <20 ms.

## Rollout Plan
1. Implement rotation utilities and resolver with tests (Phases 1–2).
2. Integrate into `DistrictGenerator` guarded by config flag for incremental rollout.
3. Update corridor painting to respect orientation; validate via Jest snapshots.
4. Conduct visual smoke tests (Playwright) capturing rotated rooms.
5. Update docs and backlog; enable feature globally.

## Risk Assessment
1. **Risk**: Tile metadata (collision layers) misaligned after rotation.
   - Mitigation: Extend transformer to rotate collision masks and include tests.
   - Likelihood: Medium
   - Impact: High
2. **Risk**: Lack of art assets for rotated variants.
   - Mitigation: Provide fallback rotation using matrix; create sourcing notes for bespoke art.
   - Likelihood: Medium
   - Impact: Medium
3. **Risk**: Generation time spikes due to repeated transformations.
   - Mitigation: Cache results; profile generation pipeline.
   - Likelihood: Low
   - Impact: Medium

## Success Metrics
- Rotated rooms render without visual seams or misaligned doors in Memory Parlor districts.
- Jest/Playwright regression coverage passes for rotated layouts.
- Generation time remains within 20 ms of previous baseline.
- Documentation updated; designers can author rotation-aware templates confidently.
