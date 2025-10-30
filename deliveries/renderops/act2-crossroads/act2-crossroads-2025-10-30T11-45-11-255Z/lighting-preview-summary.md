# Act 2 Crossroads Lighting Preview — RenderOps Shareout

*Generated*: 2025-10-30T10:59:01.451150+00:00

## Snapshot

- Segments evaluated: 11
- Status counts: ok=9, skipped=2
- Hotspots detected: 0

## Segment Breakdown

| Segment | Preset | Status | Target Luminance | Projected Luminance | Deviation | Allowed | Average Alpha | Delta |
| ------- | ------ | ------ | ---------------- | ------------------- | --------- | ------- | ------------- | ----- |
| crossroads_floor_safehouse | safehouse_idle | skipped | n/a | n/a | n/a | n/a | n/a | n/a |
| crossroads_branch_walkway | branch_idle | skipped | n/a | n/a | n/a | n/a | n/a | n/a |
| crossroads_selection_pad | selection_ready | ok | 0.050 | 0.006 | -0.044 | 0.070 | 0.133 | -0.000 |
| crossroads_checkpoint_plaza | checkpoint_idle | ok | 0.015 | 0.002 | -0.013 | 0.050 | 0.118 | 0.000 |
| crossroads_selection_conduit | thread_ready | ok | 0.460 | 0.485 | 0.025 | 0.080 | 0.784 | -0.000 |
| crossroads_safehouse_light_arc | safehouse_idle | ok | 0.100 | 0.005 | -0.095 | 0.120 | 0.133 | -0.000 |
| crossroads_checkpoint_glow | checkpoint_active | ok | 0.330 | 0.373 | 0.043 | 0.070 | 0.698 | -0.000 |
| crossroads_column_checkpoint_north | checkpoint_column_guard | ok | 0.450 | 0.414 | -0.036 | 0.080 | 0.761 | 0.000 |
| crossroads_column_checkpoint_south | checkpoint_column_guard | ok | 0.450 | 0.399 | -0.051 | 0.080 | 0.733 | -0.000 |
| crossroads_column_safehouse_left | safehouse_column_soft | ok | 0.100 | 0.079 | -0.021 | 0.060 | 0.694 | -0.000 |
| crossroads_column_safehouse_right | safehouse_column_soft | ok | 0.100 | 0.076 | -0.024 | 0.060 | 0.671 | 0.000 |

## Notes

- Safehouse floor and branch walkway remain `skipped` because their overlays are not controlled via the derivative pipeline; they rely on base material lighting and need manual confirmation during the in-engine review.
- All evaluable overlays remain within their luminance tolerance ranges following the Session 114 recalibration.
- Re-run `node scripts/art/previewCrossroadsLighting.js --out=reports/art/act2-crossroads-lighting-preview.json` after any RenderOps adjustments to keep this report in sync.
