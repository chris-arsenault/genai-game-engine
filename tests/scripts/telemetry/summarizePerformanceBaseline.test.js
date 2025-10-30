import {
  evaluateMetric,
  formatMarkdownSummary,
  summariseBaseline,
} from '../../../scripts/telemetry/summarizePerformanceBaseline.js';

describe('summarizePerformanceBaseline utilities', () => {
  test('evaluateMetric marks metrics without thresholds as info', () => {
    const metric = evaluateMetric('customMetric', { averageMs: 1.23 });
    expect(metric.status).toBe('info');
    expect(metric.utilisation).toBeNull();
  });

  test('evaluateMetric raises warning and critical states based on utilisation', () => {
    const warning = evaluateMetric(
      'nearThreshold',
      { averageMs: 8, thresholdMs: 10, maxMs: 9, samples: [8, 9] },
      { warningRatio: 0.7, criticalRatio: 0.9 }
    );
    expect(warning.status).toBe('warning');
    expect(warning.utilisation).toBeCloseTo(80);

    const critical = evaluateMetric(
      'overThreshold',
      { averageMs: 9.6, thresholdMs: 10, maxMs: 11, samples: [9.5, 11] },
      { warningRatio: 0.7, criticalRatio: 0.95 }
    );
    expect(critical.status).toBe('critical');
    expect(critical.issues).toContain('Average within 96% of threshold');
  });

  test('summariseBaseline processes metric entries', () => {
    const baseline = {
      generatedAt: '2025-10-30T01:51:29.522Z',
      runs: 5,
      metrics: {
        forensicAnalysis: {
          averageMs: 0.0337,
          thresholdMs: 4,
          minMs: 0.0047,
          maxMs: 0.1467,
          samples: [0.0337],
          passed: true,
        },
      },
    };

    const summary = summariseBaseline(baseline);
    expect(summary.metrics).toHaveLength(1);
    expect(summary.metrics[0]).toMatchObject({
      name: 'forensicAnalysis',
      status: 'ok',
      thresholdMs: 4,
    });
  });

  test('formatMarkdownSummary renders table and alerts', () => {
    const summary = {
      generatedAt: '2025-10-30T01:51:29.522Z',
      runs: 5,
      metrics: [
        {
          name: 'stableMetric',
          averageMs: 1,
          thresholdMs: 10,
          utilisation: 10,
          status: 'ok',
          minMs: 0.5,
          maxMs: 1.5,
          sampleCount: 5,
          issues: [],
        },
        {
          name: 'busyMetric',
          averageMs: 9.6,
          thresholdMs: 10,
          utilisation: 96,
          status: 'critical',
          minMs: 8,
          maxMs: 12,
          sampleCount: 5,
          issues: ['Average within 96% of threshold'],
        },
      ],
    };

    const markdown = formatMarkdownSummary(summary);
    expect(markdown).toContain('| Metric | Avg (ms) | Threshold (ms) | Utilisation | Status |');
    expect(markdown).toContain('| busyMetric | 9.6 | 10 | 96% | CRITICAL | 8 / 12 | 5 |');
    expect(markdown).toContain('## Alerts');
    expect(markdown).toContain('[CRITICAL]: busyMetric');
  });
});

