# Spatial Hash Metrics Window Profiling

- Generated: 2025-10-30T13:33:59.266Z
- Frames simulated per window: 360
- Entity density: base 28, variance 14
- Collision cell size: 64

| Window | Samples Retained | Retention (s) | Avg Cells | Peak Entities | Avg Max Bucket | Payload (bytes) | Avg getMetrics (ms) |
| ------ | ---------------- | ------------- | --------- | ------------- | --------------- | ---------------- | ------------------- |
| 60 | 60 | 1 | 52.99 | 41 | 4.17 | 4921 | 0.0056 |
| 90 | 90 | 1.5 | 51.98 | 41 | 4.16 | 7381 | 0.0032 |
| 120 | 120 | 2 | 52.16 | 41 | 4.22 | 9841 | 0.0048 |
| 180 | 180 | 3 | 52.33 | 41 | 4.19 | 14761 | 0.0043 |

## Notes
- Sample count is capped by the metrics window; larger windows retain more history but increase payload size.
- `Avg getMetrics` captures the mean cost of collecting spatial hash instrumentation per frame.
- Payload bytes approximate the JSON footprint when exporting rolling metrics alongside telemetry artifacts.
- 120-frame default retains ~2 seconds of history for ~9.8 KB, while 180 frames raises payload by ~50% for diminishing telemetry value; 90-frame window halves retention but trims payload to ~7.4 KB if export budgets tighten.
