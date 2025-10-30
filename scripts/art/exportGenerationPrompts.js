#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildPromptPackage,
  loadPromptSource,
  readManifest,
  updateManifestWithPackage,
  writePromptPackage,
} from "./lib/generationPromptPackager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printUsage() {
  console.log(`Usage: node scripts/art/exportGenerationPrompts.js [options]

Options:
  --prompts <path>        Path to prompt brief markdown (default docs/assets/generation-prompts-ar-001-005.md)
  --manifest <path>       Path to asset manifest JSON (default assets/images/requests.json)
  --output <path>         Output JSON file for packaged prompts (default assets/images/generation-payloads/ar-001-005.json)
  --filter <ids>          Comma-separated AR IDs or request IDs to include
  --no-manifest-update    Do not update manifest status/package metadata
  --status <value>        Status value to set in manifest (default prompt-packaged)
  --dry-run               Perform parsing without writing files
  --help                  Show this message
`);
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    manifestUpdate: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--prompts":
        options.prompts = argv[i + 1];
        i += 1;
        break;
      case "--manifest":
        options.manifest = argv[i + 1];
        i += 1;
        break;
      case "--output":
        options.output = argv[i + 1];
        i += 1;
        break;
      case "--filter":
        options.filter = argv[i + 1]?.split(",").map((value) => value.trim()).filter(Boolean);
        i += 1;
        break;
      case "--no-manifest-update":
        options.manifestUpdate = false;
        break;
      case "--status":
        options.status = argv[i + 1];
        i += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        break;
    }
  }

  return options;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const promptPath = args.prompts
    ? path.resolve(process.cwd(), args.prompts)
    : path.resolve(__dirname, "../../docs/assets/generation-prompts-ar-001-005.md");

  const manifestPath = args.manifest
    ? path.resolve(process.cwd(), args.manifest)
    : path.resolve(__dirname, "../../assets/images/requests.json");

  const outputPath = args.output
    ? path.resolve(process.cwd(), args.output)
    : path.resolve(
        __dirname,
        "../../assets/images/generation-payloads/ar-001-005.json",
      );

  try {
    const promptSource = await loadPromptSource(promptPath);
    const manifest = await readManifest(manifestPath);

    const bundle = buildPromptPackage(promptSource, manifest, {
      filter: args.filter,
    });

    if (args.dryRun) {
      console.log(JSON.stringify(bundle, null, 2));
      return;
    }

    await writePromptPackage(outputPath, {
      ...bundle,
      source: path.relative(process.cwd(), promptPath),
      manifest: path.relative(process.cwd(), manifestPath),
      output: path.relative(process.cwd(), outputPath),
    });

    if (args.manifestUpdate) {
      await updateManifestWithPackage(manifestPath, bundle, {
        status: args.status,
        promptPackagePath: path.relative(path.dirname(manifestPath), outputPath),
      });
    }

    console.log(
      `Packaged ${bundle.requests.length} prompt requests into ${path.relative(process.cwd(), outputPath)}`,
    );
  } catch (error) {
    console.error(`[prompt-export] ${error.message}`);
    process.exitCode = 1;
  }
}

run();
