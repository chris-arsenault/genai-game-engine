#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  auditPlaceholderStatus,
  renderPlaceholderAuditMarkdown,
} from '../../src/game/tools/PlaceholderAudit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MANIFEST = path.resolve(__dirname, '../../assets/images/requests.json');
const DEFAULT_PLACEHOLDER_DIR = path.resolve(
  __dirname,
  '../../assets/generated/ar-placeholders'
);
const DEFAULT_JSON_OUT = path.resolve(
  __dirname,
  '../../reports/art/placeholder-audit.json'
);
const DEFAULT_MD_OUT = path.resolve(
  __dirname,
  '../../reports/art/placeholder-audit.md'
);

async function main() {
  const args = process.argv.slice(2);
  const options = {
    manifestPath: DEFAULT_MANIFEST,
    placeholderDir: DEFAULT_PLACEHOLDER_DIR,
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
  };

  for (const arg of args) {
    if (arg.startsWith('--manifest=')) {
      options.manifestPath = path.resolve(process.cwd(), arg.slice(11));
    } else if (arg.startsWith('--placeholder-dir=')) {
      options.placeholderDir = path.resolve(
        process.cwd(),
        arg.slice('--placeholder-dir='.length)
      );
    } else if (arg.startsWith('--json-out=')) {
      options.jsonOut = path.resolve(process.cwd(), arg.slice(11));
    } else if (arg.startsWith('--markdown-out=')) {
      options.markdownOut = path.resolve(process.cwd(), arg.slice(15));
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
  }

  try {
    const audit = await auditPlaceholderStatus({
      manifestPath: options.manifestPath,
      placeholderDir: options.placeholderDir,
    });
    await ensureDirectory(options.jsonOut);
    await ensureDirectory(options.markdownOut);

    await fs.writeFile(
      options.jsonOut,
      `${JSON.stringify(audit, null, 2)}\n`,
      'utf-8'
    );
    await fs.writeFile(
      options.markdownOut,
      renderPlaceholderAuditMarkdown(audit),
      'utf-8'
    );

    process.stdout.write(
      `[auditPlaceholderAssets] Placeholder entries: ${audit.placeholderEntryCount}, missing files: ${audit.missingFileCount}\n`
    );
    process.stdout.write(
      `[auditPlaceholderAssets] JSON report: ${options.jsonOut}\n`
    );
    process.stdout.write(
      `[auditPlaceholderAssets] Markdown summary: ${options.markdownOut}\n`
    );
  } catch (error) {
    process.stderr.write(
      `[auditPlaceholderAssets] Failed to audit placeholders: ${error.message}\n`
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
      'Usage: node scripts/art/auditPlaceholderAssets.js [options]',
      '',
      'Options:',
      '  --manifest=<path>         Path to the asset requests manifest JSON.',
      '  --placeholder-dir=<path>  Directory that stores generated placeholders.',
      '  --json-out=<path>         Output path for the JSON audit report.',
      '  --markdown-out=<path>     Output path for the Markdown summary.',
      '  -h, --help                Show this message.',
      '',
    ].join('\n')
  );
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

main();
