import fs from "node:fs/promises";
import path from "node:path";

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function parsePromptHeading(rawHeading = "") {
  const heading = rawHeading.trim();
  if (!heading) {
    return { label: "", requestId: null };
  }

  const match = heading.match(/^(.*?)(?:\(([^)]+)\))?$/);
  if (!match) {
    return { label: heading, requestId: null };
  }

  const label = match[1].trim();
  const requestToken = match[2] ? match[2].trim() : null;

  if (!requestToken) {
    return { label, requestId: null };
  }

  const cleaned = requestToken.replace(/^[`"']+/, "").replace(/[`"']+$/, "");
  return { label, requestId: cleaned || null };
}

function extractCodeBlock(lines, startIndex) {
  let inside = false;
  const buffer = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (!inside) {
      if (line.trim().startsWith("```")) {
        inside = true;
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      return { block: buffer.join("\n"), endIndex: i };
    }

    buffer.push(line);
  }

  return { block: buffer.join("\n"), endIndex: lines.length - 1 };
}

export function parsePromptMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let negativePrompt = "";
  let currentArId = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith("## Negative Prompt")) {
      const { block } = extractCodeBlock(lines, i + 1);
      negativePrompt = block.trim();
      break;
    }

    const arMatch = line.match(/^##\s+(AR-\d+)/i);
    if (arMatch) {
      currentArId = arMatch[1].toUpperCase();
      continue;
    }

    const promptMatch = line.match(/^###\s+Prompt(?:\s*:?\s*(.*))?$/i);
    if (promptMatch) {
      const headingInfo = parsePromptHeading(promptMatch[1] ?? "");
      const { block, endIndex } = extractCodeBlock(lines, i + 1);
      const prompt = block.trim();
      entries.push({
        arId: currentArId,
        label: headingInfo.label,
        requestId: headingInfo.requestId,
        prompt,
      });
      i = endIndex;
    }
  }

  return { entries, negativePrompt };
}

function createManifestIndex(manifest) {
  const byId = new Map();
  const byAr = new Map();

  manifest.forEach((entry) => {
    byId.set(entry.id, entry);

    if (!byAr.has(entry.arId)) {
      byAr.set(entry.arId, []);
    }
    byAr.get(entry.arId).push(entry);
  });

  return { byId, byAr };
}

function selectManifestEntry(promptEntry, manifestIndex, usedIds) {
  if (!promptEntry.arId) {
    throw new Error(`Prompt entry "${promptEntry.label}" is missing an AR identifier.`);
  }

  if (promptEntry.requestId) {
    const direct = manifestIndex.byId.get(promptEntry.requestId);
    if (!direct) {
      throw new Error(
        `No manifest entry found for request id "${promptEntry.requestId}" (AR ${promptEntry.arId}).`,
      );
    }
    if (usedIds.has(direct.id)) {
      throw new Error(`Manifest entry "${direct.id}" referenced multiple times.`);
    }
    return direct;
  }

  const candidates = (manifestIndex.byAr.get(promptEntry.arId) || []).filter(
    (entry) => !usedIds.has(entry.id),
  );

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length > 1 && promptEntry.label) {
    const normalizedLabel = normalizeWhitespace(promptEntry.label).toLowerCase();
    const matched = candidates.find((entry) =>
      entry.title && entry.title.toLowerCase().includes(normalizedLabel),
    );
    if (matched) {
      return matched;
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `No unused manifest entries available for ${promptEntry.arId}. ` +
        `Provide an explicit request id in the prompt heading.`,
    );
  }

  throw new Error(
    `Multiple manifest entries available for ${promptEntry.arId} and none matched label "${promptEntry.label}". ` +
      `Add the request id to the prompt heading (e.g., \`(image-ar-002-example)\`).`,
  );
}

export function buildPromptPackage({ entries, negativePrompt }, manifest, options = {}) {
  const manifestIndex = createManifestIndex(manifest);
  const usedIds = new Set();
  const filterSet = options.filter?.length ? new Set(options.filter) : null;

  const filteredEntries = entries.filter((entry) => {
    if (!filterSet) {
      return true;
    }

    if (filterSet.has(entry.arId)) {
      return true;
    }

    if (entry.requestId && filterSet.has(entry.requestId)) {
      return true;
    }

    return false;
  });

  const packaged = filteredEntries.map((entry) => {
    const manifestEntry = selectManifestEntry(entry, manifestIndex, usedIds);
    usedIds.add(manifestEntry.id);

    return {
      requestId: manifestEntry.id,
      arId: manifestEntry.arId,
      title: manifestEntry.title,
      usage: manifestEntry.usage,
      notes: manifestEntry.notes,
      status: manifestEntry.status,
      prompt: entry.prompt,
      negativePrompt,
      label: entry.label,
    };
  });

  const metadata = {
    generatedAt: new Date().toISOString(),
    totalRequests: packaged.length,
    negativePrompt,
  };

  return { metadata, requests: packaged };
}

export async function readManifest(manifestPath) {
  const content = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(content);
}

export async function writePromptPackage(outputPath, data) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(outputPath, `${json}\n`, "utf8");
}

export async function updateManifestWithPackage(manifestPath, bundle, options = {}) {
  const manifest = await readManifest(manifestPath);
  const byId = new Map(bundle.requests.map((request) => [request.requestId, request]));
  const updated = manifest.map((entry) => {
    if (!byId.has(entry.id)) {
      return entry;
    }

    const packaged = byId.get(entry.id);

    return {
      ...entry,
      status: options.status ?? "prompt-packaged",
      promptPackage: options.promptPackagePath ?? null,
      promptPackagedAt: bundle.metadata.generatedAt,
    };
  });

  const json = JSON.stringify(updated, null, 2);
  await fs.writeFile(manifestPath, `${json}\n`, "utf8");
}

export async function loadPromptSource(markdownPath) {
  const content = await fs.readFile(markdownPath, "utf8");
  return parsePromptMarkdown(content);
}
