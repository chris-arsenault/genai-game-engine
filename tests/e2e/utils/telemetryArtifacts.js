import fs from 'fs/promises';
import path from 'path';
import { TelemetryArtifactWriterAdapter } from '../../../src/game/telemetry/TelemetryArtifactWriterAdapter.js';
import { FileSystemTelemetryWriter } from '../../../src/game/telemetry/FileSystemTelemetryWriter.js';

function slugify(value) {
  if (!value) {
    return 'telemetry';
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'telemetry';
}

/**
 * Capture SaveManager inspector telemetry from the running game and attach it
 * to the provided Playwright test. Artifacts are persisted to disk using the
 * same filesystem writer leveraged by the CLI pipeline for consistency.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {Object} [options]
 * @param {string} [options.prefix]
 * @param {string|string[]} [options.formats]
 * @param {string} [options.artifactDir]
 * @param {boolean} [options.attachSummary=true]
 * @returns {Promise<{ summary: Object, artifacts: Array, artifactDir: string, artifactPaths: string[] }>}
 */
export async function captureTelemetryArtifacts(page, testInfo, options = {}) {
  if (!page) {
    throw new Error('captureTelemetryArtifacts requires a Playwright page instance');
  }

  const prefix = options.prefix ?? `pw-${slugify(testInfo?.title)}`;
  const outputRoot =
    options.artifactDir ??
    (testInfo?.outputDir ? path.join(testInfo.outputDir, 'telemetry', prefix) : path.resolve('.playwright-artifacts', prefix));
  const artifactDir = path.resolve(outputRoot);
  await fs.mkdir(artifactDir, { recursive: true });

  const formats = Array.isArray(options.formats)
    ? options.formats
    : typeof options.formats === 'string'
    ? options.formats.split(',').map((entry) => entry.trim()).filter(Boolean)
    : undefined;

  const exportPayload = await page.evaluate(
    async ({ prefixValue, formatsValue }) => {
      if (!window?.game?.saveManager) {
        throw new Error('Game save manager unavailable for telemetry export');
      }
      const exportResult = await window.game.saveManager.exportInspectorSummary({
        prefix: prefixValue,
        formats: formatsValue,
      });
      return {
        summary: exportResult.summary,
        artifacts: exportResult.artifacts.map((artifact) => ({
          filename: artifact.filename,
          mimeType: artifact.mimeType ?? 'application/octet-stream',
          type: artifact.type,
          section: artifact.section ?? null,
          content: artifact.content,
        })),
      };
    },
    { prefixValue: prefix, formatsValue: formats }
  );

  const adapter = new TelemetryArtifactWriterAdapter({
    writers: [new FileSystemTelemetryWriter({ artifactRoot: artifactDir })],
  });

  await adapter.writeArtifacts(exportPayload.artifacts, {
    artifactDir,
    prefix,
    testTitle: testInfo?.title ?? null,
  });

  if (testInfo?.attach) {
    if (options.attachSummary !== false) {
      await testInfo.attach(`telemetry-summary-${prefix}`, {
        body: Buffer.from(JSON.stringify(exportPayload.summary, null, 2), 'utf8'),
        contentType: 'application/json',
      });
    }

    for (const artifact of exportPayload.artifacts) {
      const filepath = path.join(artifactDir, artifact.filename);
      await testInfo.attach(artifact.filename, {
        path: filepath,
        contentType: artifact.mimeType,
      });
    }
  }

  return {
    summary: exportPayload.summary,
    artifacts: exportPayload.artifacts,
    artifactDir,
    artifactPaths: exportPayload.artifacts.map((artifact) => path.join(artifactDir, artifact.filename)),
  };
}

