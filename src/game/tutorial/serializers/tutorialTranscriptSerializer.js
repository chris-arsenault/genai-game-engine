const DEFAULT_LIMIT = Infinity;

/**
 * Normalize raw transcript entries into a stable DTO for exports.
 * @param {Array<Object>} entries
 * @param {Object} [options]
 * @param {number} [options.limit] - Maximum number of entries to include (most recent retained).
 * @returns {Array<Object>}
 */
export function buildTutorialTranscript(entries, options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const limit =
    typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : DEFAULT_LIMIT;

  const startIndex = Math.max(0, list.length - limit);
  const normalized = [];

  for (let index = startIndex; index < list.length; index += 1) {
    const entry = list[index] ?? {};
    const timestamp =
      typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp) ? entry.timestamp : null;
    normalized.push({
      sequence: normalized.length,
      event: entry.event ?? 'unknown',
      promptId: entry.promptId ?? null,
      title: entry.promptText ?? null,
      action: entry.actionTaken ?? entry.event ?? 'unknown',
      timestamp,
      timestampIso: timestamp ? new Date(timestamp).toISOString() : null,
      followUpNarrative: entry.followUpNarrative ?? null,
      metadata: cloneMetadata(entry.metadata),
    });
  }

  return normalized;
}

/**
 * Serialize transcript DTOs into CSV format suitable for QA spreadsheets.
 * @param {Array<Object>} transcript
 * @returns {string}
 */
export function serializeTranscriptToCsv(transcript) {
  const rows = [
    [
      'sequence',
      'event',
      'prompt_id',
      'title',
      'action',
      'timestamp',
      'timestamp_iso',
      'follow_up_narrative',
      'metadata',
    ],
  ];

  for (const entry of Array.isArray(transcript) ? transcript : []) {
    const metadataJson = JSON.stringify(entry.metadata ?? {});
    rows.push([
      entry.sequence ?? '',
      entry.event ?? '',
      entry.promptId ?? '',
      entry.title ?? '',
      entry.action ?? '',
      entry.timestamp ?? '',
      entry.timestampIso ?? '',
      entry.followUpNarrative ?? '',
      metadataJson,
    ]);
  }

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

/**
 * Serialize transcript DTOs into a Markdown table for docs/playbooks.
 * @param {Array<Object>} transcript
 * @returns {string}
 */
export function serializeTranscriptToMarkdown(transcript) {
  const lines = ['| # | Event | Prompt | Action | Timestamp | Narrative |', '| --- | --- | --- | --- | --- | --- |'];

  for (const entry of Array.isArray(transcript) ? transcript : []) {
    lines.push(
      `| ${entry.sequence ?? ''} | ${escapeMarkdown(entry.event ?? '')} | ${escapeMarkdown(entry.title ?? '')} | ${escapeMarkdown(entry.action ?? '')} | ${escapeMarkdown(entry.timestampIso ?? '')} | ${escapeMarkdown(entry.followUpNarrative ?? '')} |`
    );
  }

  return lines.join('\n');
}

function cloneMetadata(value) {
  if (value === null || value === undefined) {
    return {};
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneMetadata(item));
  }
  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) {
        continue;
      }
      result[key] = cloneMetadata(val);
    }
    return result;
  }
  return value;
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function escapeMarkdown(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\|/g, '\\|');
}
