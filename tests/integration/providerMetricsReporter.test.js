import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import {
  summariseProviderResults,
  formatMarkdown,
  main as reportProviderMetrics,
} from '../../scripts/telemetry/reportProviderMetrics.js';

describe('telemetry provider metrics reporter', () => {
  describe('summariseProviderResults', () => {
    it('aggregates provider statuses and metadata', () => {
      const summary = summariseProviderResults([
        {
          provider: 'githubUpload',
          status: 'uploaded',
          exitCode: 0,
          durationMs: 1200,
          artifactName: 'ci-telemetry',
          fileCount: 3,
          skippedReason: null,
        },
        {
          provider: 's3Upload',
          status: 'failed',
          exitCode: 1,
          durationMs: 300,
          artifactName: 'ci-telemetry',
          fileCount: 2,
          skippedReason: 'credentials',
        },
      ]);

      expect(summary.total).toBe(2);
      expect(summary.statusCounts).toEqual({
        uploaded: 1,
        failed: 1,
      });
      expect(summary.hasFailures).toBe(true);
      expect(summary.providers[0]).toEqual(
        expect.objectContaining({
          provider: 'githubUpload',
          status: 'uploaded',
          exitCode: 0,
          artifactName: 'ci-telemetry',
          fileCount: 3,
        })
      );
    });
  });

  describe('formatMarkdown', () => {
    it('renders table output for dashboards', () => {
      const markdown = formatMarkdown({
        total: 1,
        statusCounts: { uploaded: 1 },
        providers: [
          {
            provider: 'githubUpload',
            status: 'uploaded',
            exitCode: 0,
            durationMs: 250,
            artifactName: 'inspector-telemetry',
            fileCount: 4,
            skippedReason: null,
          },
        ],
        hasFailures: false,
      });

      expect(markdown).toContain('## Telemetry Provider Uploads');
      expect(markdown).toContain('| githubUpload | uploaded | 0 | 250 | inspector-telemetry | 4 | — |');
      expect(markdown).toContain('Status breakdown: `uploaded`: 1');
    });
  });

  describe('main', () => {
    let tempDir;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'provider-metrics-'));
    });

    afterEach(async () => {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
        tempDir = null;
      }
    });

    it('writes markdown summary to the specified path', async () => {
      const metadataPath = path.join(tempDir, 'ci-artifacts.json');
      const summaryPath = path.join(tempDir, 'summary.md');
      const metadata = {
        providerResults: [
          {
            provider: 'githubUpload',
            status: 'uploaded',
            exitCode: 0,
            durationMs: 512,
            artifactName: 'inspector-telemetry',
            fileCount: 2,
          },
        ],
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      const result = await reportProviderMetrics(
        ['--metadata', metadataPath, '--summary', summaryPath],
        {}
      );

      const summaryContent = await fs.readFile(summaryPath, 'utf8');
      expect(summaryContent).toContain('Telemetry Provider Uploads');
      expect(summaryContent).toContain('githubUpload');
      expect(result.providerSummary.total).toBe(1);
    });

    it('handles missing metadata gracefully', async () => {
      const metadataPath = path.join(tempDir, 'missing-ci-artifacts.json');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const result = await reportProviderMetrics(['--metadata', metadataPath], {});

        expect(result.summary).toBeNull();
        expect(result.providerSummary).toBeNull();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
