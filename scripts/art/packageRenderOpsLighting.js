#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildRenderOpsPacket } from '../../src/game/tools/RenderOpsPacketBuilder.js';
import { enqueueRenderOpsApprovalJob } from '../../src/game/tools/RenderOpsApprovalQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_REPORT = path.resolve(
  __dirname,
  '../../reports/art/act2-crossroads-lighting-preview.json'
);
const DEFAULT_SUMMARY = path.resolve(
  __dirname,
  '../../reports/art/act2-crossroads-lighting-preview-summary.md'
);
const DEFAULT_OUTPUT_ROOT = path.resolve(
  __dirname,
  '../../reports/art/renderops-packets'
);
const DEFAULT_NEON_APPROVAL_JSON = path.resolve(
  __dirname,
  '../../reports/art/neon-glow-approval-status.json'
);
const DEFAULT_NEON_APPROVAL_MD = path.resolve(
  __dirname,
  '../../reports/art/neon-glow-approval-status.md'
);
const DEFAULT_APPROVAL_QUEUE_ROOT = path.resolve(
  __dirname,
  '../../reports/telemetry/renderops-approvals'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    reportPath: DEFAULT_REPORT,
    summaryPath: DEFAULT_SUMMARY,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    label: 'act2-crossroads',
    attachments: [],
    approvalQueueRoot: DEFAULT_APPROVAL_QUEUE_ROOT,
  };

  for (const arg of args) {
    if (arg.startsWith('--report=')) {
      options.reportPath = path.resolve(process.cwd(), arg.slice(9));
    } else if (arg.startsWith('--summary=')) {
      options.summaryPath = path.resolve(process.cwd(), arg.slice(10));
    } else if (arg.startsWith('--out-dir=')) {
      options.outputRoot = path.resolve(process.cwd(), arg.slice(10));
    } else if (arg.startsWith('--label=')) {
      options.label = arg.slice(8).trim();
    } else if (arg.startsWith('--attachment=')) {
      const attachmentPath = path.resolve(process.cwd(), arg.slice(13));
      options.attachments.push({ path: attachmentPath });
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    } else if (arg.startsWith('--approval-queue-root=')) {
      options.approvalQueueRoot = path.resolve(
        process.cwd(),
        arg.slice('--approval-queue-root='.length)
      );
    }
  }

  const attachmentPaths = new Set(
    options.attachments.map((entry) => path.resolve(entry.path))
  );

  if (fs.existsSync(DEFAULT_NEON_APPROVAL_JSON) && !attachmentPaths.has(DEFAULT_NEON_APPROVAL_JSON)) {
    options.attachments.push({
      path: DEFAULT_NEON_APPROVAL_JSON,
      label: 'Neon glow approvals — JSON summary',
    });
    attachmentPaths.add(DEFAULT_NEON_APPROVAL_JSON);
  }

  if (fs.existsSync(DEFAULT_NEON_APPROVAL_MD) && !attachmentPaths.has(DEFAULT_NEON_APPROVAL_MD)) {
    options.attachments.push({
      path: DEFAULT_NEON_APPROVAL_MD,
      label: 'Neon glow approvals — Markdown summary',
    });
    attachmentPaths.add(DEFAULT_NEON_APPROVAL_MD);
  }

  try {
    const {
      packetDir,
      metadata,
      archivePath,
      shareManifestPath,
      shareManifest,
      deliveryManifestPath,
      deliveryManifest,
    } = await buildRenderOpsPacket(options);
    process.stdout.write(
      `[packageRenderOpsLighting] Packet generated at ${packetDir}\n`
    );
    process.stdout.write(
      `[packageRenderOpsLighting] Segments evaluated: ${metadata.summary.total}, actionable segments: ${metadata.actionableSegments.length}\n`
    );
    if (archivePath) {
      process.stdout.write(
        `[packageRenderOpsLighting] Shareable archive created at ${archivePath}\n`
      );
    }
    if (shareManifestPath) {
      process.stdout.write(
        `[packageRenderOpsLighting] Share manifest available at ${shareManifestPath}\n`
      );
    }
    if (deliveryManifestPath) {
      process.stdout.write(
        `[packageRenderOpsLighting] Delivery manifest written to ${deliveryManifestPath}\n`
      );
    }

    const { jobPath, job } = await enqueueRenderOpsApprovalJob({
      packetDir,
      metadata,
      shareManifest,
      deliveryManifest,
      queueRoot: options.approvalQueueRoot,
      shareManifestPath,
      deliveryManifestPath,
    });

    process.stdout.write(
      `[packageRenderOpsLighting] Approval job staged at ${jobPath} (${job.status})\n`
    );
    if (job.actionableSegments.length > 0) {
      const segmentList = job.actionableSegments
        .map((segment) => `    - ${segment.segmentId} [${segment.status}]`)
        .join('\n');
      process.stdout.write(
        `[packageRenderOpsLighting] Pending approvals:\n${segmentList}\n`
      );
    } else {
      process.stdout.write(
        '[packageRenderOpsLighting] No actionable segments pending RenderOps approval\n'
      );
    }
  } catch (error) {
    process.stderr.write(
      `[packageRenderOpsLighting] Failed to generate packet: ${error.message}\n`
    );
    if (error.cause) {
      process.stderr.write(`  Cause: ${error.cause.message}\n`);
    }
    process.exitCode = 1;
  }
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/art/packageRenderOpsLighting.js [options]',
      '',
      'Options:',
      '  --report=<path>    Path to the lighting preview JSON report.',
      '  --summary=<path>   Path to the RenderOps-facing markdown summary.',
      '  --out-dir=<path>   Output directory root for generated packets.',
      '  --label=<value>    Label to include in the packet directory name.',
      '  --attachment=<path> Attach an additional file to the packet.',
      '  --approval-queue-root=<path> Directory for telemetry approval queue outputs.',
      '  -h, --help         Show this help message.',
      '',
    ].join('\n')
  );
}

main();
