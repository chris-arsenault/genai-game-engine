#!/usr/bin/env node
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const summaryPath = resolveCwd(options.summary);
  await assertFileExists(summaryPath, '--summary');

  const summaryRaw = await readFile(summaryPath, 'utf8');
  const summary = parseSummary(summaryRaw, summaryPath);

  const label = options.label ?? deriveLabel(summary);
  const outDir = resolveCwd(options.outDir);
  const dispatchDir = path.join(outDir, label);

  await mkdir(dispatchDir, { recursive: true });

  const summaryDest = path.join(dispatchDir, path.basename(summaryPath));
  await copyFile(summaryPath, summaryDest);

  const attachments = [];
  if (options.includeSamples) {
    const samples = Array.isArray(summary?.sources?.samples)
      ? summary.sources.samples
      : [];
    for (const samplePath of samples) {
      try {
        const resolvedSample = resolveCwd(samplePath);
        await assertFileExists(resolvedSample, '--include-samples sample');
        const filename = path.basename(resolvedSample);
        const destination = path.join(dispatchDir, filename);
        await copyFile(resolvedSample, destination);
        attachments.push({
          type: 'sample',
          filename,
          source: resolvedSample,
        });
      } catch (error) {
        console.warn(
          `[dispatchQuestTelemetrySummary] Unable to copy sample ${samplePath}:`,
          error.message ?? error
        );
      }
    }
  }

  const checksum = crypto.createHash('sha256').update(summaryRaw).digest('hex');
  const manifest = buildManifest({
    summary,
    summaryPath,
    summaryDest,
    checksum,
    label,
    recipients: options.recipients,
    notes: options.notes,
    attachments,
  });

  const manifestPath = path.join(dispatchDir, 'dispatch-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const readmePath = path.join(dispatchDir, 'README.md');
  await writeFile(readmePath, buildReadme(manifest), 'utf8');

  console.log(
    `[dispatchQuestTelemetrySummary] Dispatched telemetry parity summary → ${dispatchDir}`
  );
}

if (process.argv[1] && process.argv[1].includes('dispatchQuestTelemetrySummary.js')) {
  main().catch((error) => {
    console.error('[dispatchQuestTelemetrySummary] Unexpected failure:', error);
    process.exitCode = 1;
  });
}

function parseArgs(args) {
  const options = {
    summary: 'telemetry-artifacts/reports/act2-crossroads-parity-summary.json',
    outDir: 'telemetry-artifacts/analytics/outbox',
    label: null,
    includeSamples: false,
    recipients: [],
    notes: [],
  };

  for (const arg of args) {
    if (arg === '--include-samples') {
      options.includeSamples = true;
    } else if (arg.startsWith('--summary=')) {
      options.summary = arg.slice('--summary='.length).trim();
    } else if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.slice('--out-dir='.length).trim();
    } else if (arg.startsWith('--label=')) {
      options.label = sanitizeLabel(arg.slice('--label='.length).trim());
    } else if (arg.startsWith('--recipient=')) {
      const recipient = arg.slice('--recipient='.length).trim();
      if (recipient.length > 0) {
        options.recipients.push(recipient);
      }
    } else if (arg.startsWith('--note=')) {
      const note = arg.slice('--note='.length).trim();
      if (note.length > 0) {
        options.notes.push(note);
      }
    }
  }

  return options;
}

function resolveCwd(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return process.cwd();
  }
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(process.cwd(), targetPath);
}

async function assertFileExists(targetPath, label) {
  try {
    await access(targetPath);
  } catch {
    throw new Error(`[dispatchQuestTelemetrySummary] ${label} file not found at ${targetPath}`);
  }
}

function parseSummary(raw, summaryPath) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `[dispatchQuestTelemetrySummary] Unable to parse summary JSON at ${summaryPath}: ${error.message}`
    );
  }
}

function deriveLabel(summary) {
  const label =
    summary?.sources?.dataset && typeof summary.sources.dataset === 'string'
      ? path.basename(summary.sources.dataset).replace(/\.[^/.]+$/, '')
      : null;
  const timestamp =
    summary?.generatedAt && typeof summary.generatedAt === 'string'
      ? summary.generatedAt.replace(/[:T]/g, '').replace(/\..+$/, '')
      : null;
  if (label && timestamp) {
    return sanitizeLabel(`${label}-${timestamp}`);
  }
  if (label) {
    return sanitizeLabel(label);
  }
  if (timestamp) {
    return sanitizeLabel(timestamp);
  }
  return sanitizeLabel(createTimestampLabel());
}

function sanitizeLabel(raw) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function createTimestampLabel() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(
    now.getUTCHours()
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function buildManifest({ summary, summaryPath, summaryDest, checksum, label, recipients, notes, attachments }) {
  const dispatchedAt = new Date().toISOString();
  return {
    dispatchedAt,
    label,
    recipients,
    notes,
    summary: {
      filename: path.basename(summaryDest),
      checksum: `sha256:${checksum}`,
      source: summaryPath,
      ok: summary?.ok ?? null,
      totals: summary?.totals ?? null,
      coverage: summary?.coverage ?? null,
      unexpectedFields: summary?.unexpectedFields ?? [],
    },
    sources: summary?.sources ?? {},
    nextSteps: summary?.nextSteps ?? [],
    attachments,
  };
}

function buildReadme(manifest) {
  const lines = [
    '# Quest Telemetry Parity Dispatch',
    '',
    `- **Label**: ${manifest.label}`,
    `- **Dispatched At**: ${manifest.dispatchedAt}`,
    `- **Recipients**: ${manifest.recipients.length > 0 ? manifest.recipients.join(', ') : 'n/a'}`,
    `- **Summary File**: ${manifest.summary.filename}`,
    `- **Checksum**: ${manifest.summary.checksum}`,
    '',
    '## Coverage',
    '',
    '```json',
    JSON.stringify(manifest.summary.coverage ?? {}, null, 2),
    '```',
  ];

  if (manifest.nextSteps && manifest.nextSteps.length > 0) {
    lines.push('', '## Next Steps', '');
    for (const step of manifest.nextSteps) {
      lines.push(`- ${step}`);
    }
  }

  if (manifest.notes && manifest.notes.length > 0) {
    lines.push('', '## Notes', '');
    for (const note of manifest.notes) {
      lines.push(`- ${note}`);
    }
  }

  if (manifest.attachments && manifest.attachments.length > 0) {
    lines.push('', '## Attachments', '');
    for (const attachment of manifest.attachments) {
      lines.push(`- ${attachment.type}: ${attachment.filename}`);
    }
  }

  return lines.join('\n');
}
