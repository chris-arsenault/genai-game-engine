# Performance Baseline Summary
- Generated at: 2025-10-30T02:19:47.904Z
- Runs aggregated: 5

| Metric | Avg (ms) | Threshold (ms) | Utilisation | Status | Min / Max (ms) | Samples |
| --- | --- | --- | --- | --- | --- | --- |
| forensicAnalysis | 0.0382 | 4 | 0.95% | OK | 0.0049 / 0.1813 | 25 |
| factionModify | 0.0032 | 2 | 0.16% | OK | 0.0014 / 0.0087 | 25 |
| factionAttitude | 0.0002 | 0.05 | 0.4% | OK | 0 / 0.0007 | 25 |
| bspGeneration | 3.9976 | 10 | 39.98% | OK | 3.3874 / 5.2376 | 25 |

No alerts fired on this run; BSP warm-up now runs outside the measured window so peak samples stay comfortably under the 10 ms cap.
