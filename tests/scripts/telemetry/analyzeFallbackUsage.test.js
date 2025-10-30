import path from 'path';
import {
  aggregateFallbackSummaries,
  formatFallbackReport,
  resolveMetadataPaths,
} from '../../../scripts/telemetry/analyzeFallbackUsage.js';

describe('analyzeFallbackUsage utilities', () => {
  test('resolveMetadataPaths combines CLI args and defaults', () => {
    const cwd = process.cwd();
    const result = resolveMetadataPaths(
      {
        metadata: ['custom/ci.json'],
        _: ['extra/manifest.json'],
      },
      {}
    );

    expect(result).toEqual([
      path.resolve(cwd, 'custom/ci.json'),
      path.resolve(cwd, 'extra/manifest.json'),
    ]);
  });

  test('resolveMetadataPaths falls back to environment and default path', () => {
    const result = resolveMetadataPaths({}, { CI_ARTIFACT_METADATA: '/tmp/ci-artifacts.json' });
    expect(result).toEqual([path.resolve('/tmp/ci-artifacts.json')]);

    const defaultResult = resolveMetadataPaths({}, {});
    expect(defaultResult).toEqual([path.resolve('telemetry-artifacts/ci-artifacts.json')]);
  });

  test('aggregateFallbackSummaries tallies attempts per provider and manifest', () => {
    const manifestPath = path.join(process.cwd(), 'telemetry-artifacts/ci-artifacts.json');
    const secondManifestPath = path.join(process.cwd(), 'telemetry-artifacts/run-2.json');
    const entries = [
      {
        path: manifestPath,
        summary: {
          attempted: true,
          attempts: 2,
          succeeded: 1,
          failed: 1,
          partial: 0,
          skipped: 0,
          lastAttemptedAt: '2025-10-31T23:59:59.000Z',
          providers: {
            githubActionsApi: {
              attempts: 2,
              succeeded: 1,
              failed: 1,
              partial: 0,
              skipped: 0,
              lastStatus: 'failed',
              lastAttemptedAt: '2025-10-31T23:59:59.000Z',
            },
          },
        },
      },
      {
        path: secondManifestPath,
        summary: null,
      },
    ];

    const aggregate = aggregateFallbackSummaries(entries);

    expect(aggregate.totalManifests).toBe(2);
    expect(aggregate.manifestsWithFallback).toBe(1);
    expect(aggregate.attempts).toBe(2);
    expect(aggregate.succeeded).toBe(1);
    expect(aggregate.failed).toBe(1);
    expect(aggregate.partial).toBe(0);
    expect(aggregate.skipped).toBe(0);
    expect(aggregate.lastAttemptedAt).toBe('2025-10-31T23:59:59.000Z');
    expect(aggregate.providers.githubActionsApi).toEqual(
      expect.objectContaining({
        manifests: 1,
        attempts: 2,
        succeeded: 1,
        failed: 1,
        partial: 0,
        skipped: 0,
        lastStatus: 'failed',
        lastAttemptedAt: '2025-10-31T23:59:59.000Z',
      })
    );
  });

  test('formatFallbackReport emits markdown summary', () => {
    const manifestPath = path.join(process.cwd(), 'telemetry-artifacts/ci-artifacts.json');
    const aggregate = {
      totalManifests: 1,
      manifestsWithFallback: 1,
      attempts: 3,
      succeeded: 2,
      failed: 1,
      partial: 0,
      skipped: 0,
      lastAttemptedAt: '2025-10-31T23:59:59.000Z',
      providers: {
        githubActionsApi: {
          manifests: 1,
          attempts: 3,
          succeeded: 2,
          failed: 1,
          partial: 0,
          skipped: 0,
          lastStatus: 'failed',
          lastAttemptedAt: '2025-10-31T23:59:59.000Z',
        },
      },
      sources: [
        {
          path: manifestPath,
          attempted: true,
          attempts: 3,
          succeeded: 2,
          failed: 1,
          partial: 0,
          skipped: 0,
          lastAttemptedAt: '2025-10-31T23:59:59.000Z',
        },
      ],
    };

    const report = formatFallbackReport(aggregate);
    expect(report).toContain('## Telemetry Fallback Usage');
    expect(report).toContain('Total fallback attempts: 3');
    expect(report).toContain('| githubActionsApi | 1 | 3 | 2 | 0 | 1');
    expect(report).toContain('| telemetry-artifacts/ci-artifacts.json | 3 | 2 | 0 | 1 | 0 | 2025-10-31T23:59:59.000Z |');
  });
});
