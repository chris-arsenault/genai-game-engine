import fs from "node:fs/promises";
import path from "node:path";

export async function listOutboxPackages(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);
  const packages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    packages.push({
      label: entry.name,
      dir: path.join(baseDir, entry.name),
      readmePath: path.join(baseDir, entry.name, "README.md"),
      acknowledgementPath: path.join(baseDir, entry.name, "acknowledgement.json"),
    });
  }

  return packages;
}

export function appendIngestionStatus(readmeContent, line) {
  const lines = readmeContent.split(/\r?\n/);
  const headerIndex = lines.findIndex((value) => value.trim() === "## Ingestion Status");
  const statusLine = line.trim();

  if (headerIndex === -1) {
    return `${readmeContent.trimEnd()}\n\n## Ingestion Status\n\n- ${statusLine}\n`;
  }

  let insertIndex = lines.length;
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ") && i > headerIndex + 1) {
      insertIndex = i;
      break;
    }
  }

  const updated = [...lines];

  // Ensure there is at least a blank line after the header
  if (headerIndex + 1 === insertIndex) {
    updated.splice(insertIndex, 0, "");
    insertIndex += 1;
  }

  updated.splice(insertIndex, 0, `- ${statusLine}`);
  return `${updated.join("\n").trimEnd()}\n`;
}

async function loadJsonIfExists(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function recordAcknowledgement({
  analyticsDir,
  baseDir,
  label,
  acknowledgedBy,
  method,
  note,
  now = new Date(),
}) {
  if (!label) {
    throw new Error("A label is required to record acknowledgement");
  }
  if (!acknowledgedBy) {
    throw new Error("Acknowledged by is required (use --by)");
  }

  const outboxDir = path.join(baseDir, label);
  const exists = await fs.stat(outboxDir).then(() => true).catch(() => false);
  if (!exists) {
    throw new Error(`Outbox package "${label}" not found at ${outboxDir}`);
  }

  const timestamp = now.toISOString();
  const acknowledgement = {
    label,
    acknowledgedAt: timestamp,
    acknowledgedBy,
    method: method ?? null,
    note: note ?? null,
  };

  const ackPath = path.join(outboxDir, "acknowledgement.json");
  await fs.writeFile(ackPath, `${JSON.stringify(acknowledgement, null, 2)}\n`, "utf8");

  const readmePath = path.join(outboxDir, "README.md");
  try {
    const readmeContent = await fs.readFile(readmePath, "utf8");
    const messageParts = [
      `${timestamp.slice(0, 10)}: Analytics acknowledged via ${method || "manual confirmation"}`,
      ` (${acknowledgedBy})`,
    ];
    if (note) {
      messageParts.push(` – ${note}`);
    }
    const updatedReadme = appendIngestionStatus(readmeContent, messageParts.join(""));
    await fs.writeFile(readmePath, updatedReadme, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const logPath = path.join(analyticsDir, "acknowledgements.json");
  const log = await loadJsonIfExists(logPath, []);
  const filteredLog = Array.isArray(log)
    ? log.filter((entry) => entry.label !== label)
    : [];
  filteredLog.push(acknowledgement);
  await fs.writeFile(logPath, `${JSON.stringify(filteredLog, null, 2)}\n`, "utf8");

  return acknowledgement;
}

export async function collectStatus(baseDir) {
  const packages = await listOutboxPackages(baseDir);
  const statuses = [];

  for (const pkg of packages) {
    const ack = await loadJsonIfExists(pkg.acknowledgementPath, null);
    statuses.push({
      label: pkg.label,
      acknowledged: Boolean(ack),
      acknowledgement: ack,
    });
  }

  return statuses;
}
