#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { processConfig } from "./lib/overlayPipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printUsage() {
  console.log(`Usage: node scripts/art/generateOverlayDerivatives.js [options]

Options:
  --config <path>      Path to overlay configuration JSON file.
  --filter <ids>       Comma-separated list of request ids to process.
  --dry-run            Process without writing files.
  --help               Show this message.`);
}

function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--config":
        options.config = argv[i + 1];
        i += 1;
        break;
      case "--filter":
        options.filter = argv[i + 1]?.split(",").map((id) => id.trim());
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

  const configPath = args.config
    ? path.resolve(process.cwd(), args.config)
    : path.resolve(
        __dirname,
        "../../assets/images/overlay-derivatives-act2-crossroads.json",
      );

  try {
    const results = await processConfig(configPath, {
      dryRun: args.dryRun,
      filter: args.filter,
    });

    if (results.length === 0) {
      console.log("No overlay entries processed.");
      return;
    }

    results.forEach((result) => {
      console.log(
        `${args.dryRun ? "[dry-run] " : ""}${result.id} -> ${result.outputPath} (${result.width}x${result.height})`,
      );
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

run();
