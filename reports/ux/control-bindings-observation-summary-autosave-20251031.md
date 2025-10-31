# Control Bindings Overlay Observation Summary

- Generated: 2025-10-31T20:33:42.762Z
- Total Events: 7
- Session Duration: 4s 800ms

## Metrics

| Metric | Value |
| --- | ---: |
| Selection Moves | 2 |
| Selection Blocked | 1 |
| List Mode Changes | 1 |
| List Mode Attempts (No Change) | 0 |
| Page Navigations | 1 |
| Page Navigation Blocked | 1 |
| Direct Page Set Changes | 0 |
| Direct Page Set Blocked | 0 |
| Capture Started | 0 |
| Capture Cancelled | 0 |
| Bindings Applied | 1 |
| Bindings Reset | 0 |
| Manual Override Events | 0 |

## Navigation Heuristics

| Heuristic | Value |
| --- | --- |
| Average dwell between selection changes | 1s 600ms |
| Longest dwell | 1s 600ms (on Move Down) |
| Last recorded dwell | 1s 600ms on Move Down |
| Selection blocked ratio | 33% (1/3) |
| Paging blocked ratio | 50% (1/2) |

## Actions Visited

- moveUp
- interact
- inventory

## Actions Remapped

- inventory

## List Modes Visited

- sections
- alphabetical

## Page Range

- First Page Observed: 0
- Last Page Observed: 1

## Recommendations

- Paging attempts were blocked 50% (1/2) of the time—consider clearer boundaries or wrap-around paging to prevent dead ends.

## Recent Events

| Timestamp | Event | Action | Details |
| --- | --- | --- | --- |
| 2025-10-31T20:35:00.000Z | selection_move | moveUp | changed=true, mode=sections, page=0 |
| 2025-10-31T20:35:01.600Z | selection_move | interact | changed=true, mode=sections, page=0 |
| 2025-10-31T20:35:03.300Z | selection_move | interact | changed=false, mode=sections, page=0 |
| 2025-10-31T20:35:03.400Z | list_mode_change | interact | changed=true, mode=alphabetical, page=0 |
| 2025-10-31T20:35:03.600Z | page_navigate | inventory | changed=true, mode=alphabetical, page=1 |
| 2025-10-31T20:35:04.100Z | page_navigate | inventory | changed=false, mode=alphabetical, page=1 |
| 2025-10-31T20:35:04.800Z | binding_applied | inventory | changed=true, mode=alphabetical, page=1 |
