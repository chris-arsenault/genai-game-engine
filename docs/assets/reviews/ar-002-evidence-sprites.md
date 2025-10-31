# AR-002 Evidence Sprite Review (2025-11-02)

## Summary
- Confirmed all five AR-002 sprites generated in Session 186 remain present at 32×32 resolution with RGBA metadata consistent with neon noir UI requirements.
- Verified `EvidenceEntity` heuristics now bind the correct sprite for fingerprint, document, neural extractor, and blood spatter evidence while maintaining a generic marker fallback for unspecified forensic items.
- Tutorial case copy aligns with the new sprites; interaction prompts and palette metadata continue to surface the holographic marker art without regressions.

## Asset Findings
| Sprite | File | Notes | Tutorial Alignment |
| --- | --- | --- | --- |
| Generic Marker | `assets/generated/images/ar-002/image-ar-002-generic-marker.png` | Transparent holographic placard with neutral cyan core; serves as fallback for forensic/generic evidence. | Used by tutorial evidence that does not specify a bespoke visual (e.g., neural residue). Prompts remain accurate (“Scan the neural extractor hotspot” still renders the marker when overrides are absent). |
| Fingerprint | `assets/generated/images/ar-002/image-ar-002-fingerprint.png` | High-contrast cyan fingerprint swirl against dark background; maintains readability at 32×32. | Mirrors tutorial clue language (“Latent Fingerprint Sample”) and matches EvidenceEntity auto-selection triggered by “fingerprint”. |
| Dossier | `assets/generated/images/ar-002/image-ar-002-document.png` | Folded dossier with neon ribbon accent; preserves legibility for case files. | Supports badge/document evidence (“Marcus’s MCD Badge”, “Confidential Case File”) with consistent tone to tutorial objective copy. |
| Neural Extractor | `assets/generated/images/ar-002/image-ar-002-neural-extractor.png` | Compact chrome device with blue prongs and scan glow; emphasizes tech provenance. | Aligns with tutorial Objective 1 (“Scan the neural extractor hotspot”) and the derived clue text about specialized equipment. |
| Forensic Vial | `assets/generated/images/ar-002/image-ar-002-blood-spatter.png` | Contained neon vial silhouette; respects M2 rating guidelines while highlighting forensic nature. | Matches tutorial prompts about analyzing blood patterns and does not conflict with case tone. |

## Automation Coverage
- `tests/assets/ar002Sprites.test.js` parses PNG headers to assert 32×32 resolution, 8-bit depth, RGBA color, and non-interlaced metadata for all AR-002 sprites.
- `tests/game/entities/EvidenceEntity.test.js` now verifies heuristic sprite selection for each evidence keyword and the digital fallback case, preventing regressions in future content drops.

## Follow-ups
- Neural residue/electromagnetic evidence still falls back to the generic marker; consider sourcing a bespoke sprite once AR-002 bespoke deliveries land to reduce visual repetition.
- Continue to run `npm test` after integrating future bespoke art to keep metadata and heuristic coverage in sync.
