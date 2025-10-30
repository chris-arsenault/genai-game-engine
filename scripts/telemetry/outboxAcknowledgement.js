#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import {
  collectStatus,
  recordAcknowledgement,
} from "./lib/outboxAcknowledgement.js";

function printUsage() {
  console.log(`Usage: node scripts/telemetry/outboxAcknowledgement.js [options]

Options:
  --base <path>          Base outbox directory (default telemetry-artifacts/analytics/outbox)
  --acknowledge <label>  Record acknowledgement for an outbox label
  --by <name>            Person/team confirming acknowledgement (required with --acknowledge)
  --method <value>       Communication method (email, slack, etc.)
  --note <text>          Additional note to store with acknowledgement
  --format <fmt>         Output format when listing statuses (text|json)
  --help                 Show this message
`);
}

function parseArgs(argv) {
  const options = {
    format: "text",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--base":
        options.base = argv[i + 1];
        i += 1;
        break;
      case "--acknowledge":
        options.acknowledge = argv[i + 1];
        i += 1;
        break;
      case "--by":
        options.by = argv[i + 1];
        i += 1;
        break;
      case "--method":
        options.method = argv[i + 1];
        i += 1;
        break;
      case "--note":
        options.note = argv[i + 1];
        i += 1;
        break;
      case "--format":
        options.format = argv[i + 1];
        i += 1;
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

  const baseDir = path.resolve(
    process.cwd(),
    args.base ?? "telemetry-artifacts/analytics/outbox",
  );
  const analyticsDir = path.resolve(baseDir, "..");

  try {
    if (args.acknowledge) {
      const acknowledgement = await recordAcknowledgement({
        analyticsDir,
        baseDir,
        label: args.acknowledge,
        acknowledgedBy: args.by,
        method: args.method,
        note: args.note,
      });

      console.log(
        `Recorded acknowledgement for ${acknowledgement.label} at ${acknowledgement.acknowledgedAt}`,
      );
      return;
    }

    const status = await collectStatus(baseDir);
    if (args.format === "json") {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    if (status.length === 0) {
      console.log("No telemetry outbox packages found.");
      return;
    }

    for (const pkg of status) {
      if (pkg.acknowledged) {
        console.log(`✔ ${pkg.label} acknowledged at ${pkg.acknowledgement.acknowledgedAt}`);
      } else {
        console.log(`✖ ${pkg.label} awaiting acknowledgement`);
      }
    }
  } catch (error) {
    console.error(`[telemetry-ack] ${error.message}`);
    process.exitCode = 1;
  }
}

run();
