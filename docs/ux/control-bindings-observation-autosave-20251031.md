# Control Bindings Observation – Autosave 2025-10-31

- **Observation Source**: `telemetry-artifacts/ux/control-bindings/20251031T203500Z/observation.json`
- **Exported Reports**:
  - `reports/ux/control-bindings-observation-summary-autosave-20251031.json`
  - `reports/ux/control-bindings-observation-summary-autosave-20251031.md`
- **Generation Timestamp**: 2025-10-31T20:33:42.762Z
- **Session Duration**: 4.8 seconds
- **Total Events**: 7

## Key Findings

- Selection blocked ratio hit 33% (1 of 3 moves), signalling hesitation when paging between action groups.
- Paging blocked ratio reached 50% (1 of 2 attempts), reinforcing the need for clearer page boundaries or wrap-around behaviour.
- Average dwell between selection changes measured 1.6 seconds, with the longest dwell on the Move Down action.
- Remap activity targeted the `inventory` action after switching list mode from sections to alphabetical.

## Recommendations

- Prioritise UX tweaks that reduce paging dead ends (consider explicit wrap-around or disabled-state signalling).
- Monitor blocked ratios after implementing pagination changes to confirm the heuristics fall below 20%.

## Next Automation Window

- **Next Export**: 2025-11-07 via `npm run telemetry:autosave-dashboard` followed by `node scripts/ux/exportControlBindingsObservations.js --label autosave-20251107`.

