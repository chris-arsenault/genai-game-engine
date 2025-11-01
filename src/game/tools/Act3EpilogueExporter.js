import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ACT3_EPILOGUE_LIBRARY } from '../data/narrative/Act3EpilogueLibrary.js';

function isSummary(candidate) {
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      Array.isArray(candidate.stances) &&
      typeof candidate.generatedAt === 'string'
  );
}

export function buildAct3EpilogueSummary() {
  const library = ACT3_EPILOGUE_LIBRARY;
  const stances = (library.stances ?? []).map((stance) => {
    const beats = Array.isArray(stance.epilogueBeats) ? stance.epilogueBeats : [];
    return {
      stanceId: stance.id,
      stanceFlag: stance.stanceFlag ?? null,
      title: stance.title,
      cinematicId: stance.cinematicId ?? null,
      musicCue: stance.musicCue ?? null,
      summary: stance.summary ?? '',
      beatCount: beats.length,
      beats: beats.map((beat, index) => ({
        id: beat.id,
        order: index + 1,
        title: beat.title,
        description: beat.description ?? '',
        narrativeBeat: beat.narrativeBeat ?? null,
        telemetryTag: beat.telemetryTag ?? null,
      })),
    };
  });

  const stats = {
    totalStances: stances.length,
    totalBeats: stances.reduce((acc, entry) => acc + (entry.beatCount ?? 0), 0),
    stanceIds: stances.map((entry) => entry.stanceId),
  };

  return {
    generatedAt: new Date().toISOString(),
    version: library.version ?? '1.0.0',
    stats,
    stances,
  };
}

export async function writeAct3EpilogueSummary(outputPath, options = {}) {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('[writeAct3EpilogueSummary] outputPath is required');
  }

  const summary =
    options.summary && isSummary(options.summary)
      ? options.summary
      : buildAct3EpilogueSummary();
  const pretty = options.pretty !== false;
  const payload = pretty ? JSON.stringify(summary, null, 2) : JSON.stringify(summary);

  const targetDir = path.dirname(outputPath);
  await mkdir(targetDir, { recursive: true });
  await writeFile(outputPath, `${payload}\n`, 'utf8');

  return {
    outputPath,
    stanceCount: summary.stances.length,
    totalBeats: summary.stats.totalBeats,
  };
}

export function renderAct3EpilogueMarkdown(summary, options = {}) {
  const summaryData = isSummary(summary) ? summary : buildAct3EpilogueSummary();
  const headingLevel = Number.isInteger(options.headingLevel) && options.headingLevel > 0
    ? options.headingLevel
    : 2;
  const heading = (depth) => '#'.repeat(Math.max(1, headingLevel + depth - 1));

  const lines = [];
  lines.push('# Act 3 Epilogue Review Packet');
  lines.push('');
  lines.push(`Generated: ${summaryData.generatedAt}`);
  lines.push(`Version: ${summaryData.version}`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push('| Stance | Cinematic | Music Cue | Beats |');
  lines.push('| --- | --- | --- | ---: |');
  for (const stance of summaryData.stances) {
    lines.push(
      `| ${stance.title} | ${stance.cinematicId ?? '—'} | ${stance.musicCue ?? '—'} | ${stance.beatCount} |`
    );
  }
  lines.push('');

  for (const stance of summaryData.stances) {
    lines.push(`${heading(1)} ${stance.title}`);
    lines.push('');
    lines.push(`- **Stance ID:** ${stance.stanceId}`);
    lines.push(`- **Flag:** ${stance.stanceFlag ?? '—'}`);
    lines.push(`- **Cinematic:** ${stance.cinematicId ?? '—'}`);
    lines.push(`- **Music Cue:** ${stance.musicCue ?? '—'}`);
    lines.push('');
    lines.push(`${stance.summary}`);
    lines.push('');
    lines.push(`${heading(2)} Key Moments`);
    lines.push('');
    for (const beat of stance.beats) {
      lines.push(`- \`${String(beat.order).padStart(2, '0')}\` **${beat.title}:** ${beat.description}`);
      if (beat.narrativeBeat || beat.telemetryTag) {
        lines.push(
          `  - Narrative Beat: ${beat.narrativeBeat ?? '—'} | Telemetry: ${beat.telemetryTag ?? '—'}`
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export async function writeAct3EpilogueMarkdown(outputPath, options = {}) {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('[writeAct3EpilogueMarkdown] outputPath is required');
  }

  const summary =
    options.summary && isSummary(options.summary)
      ? options.summary
      : buildAct3EpilogueSummary();
  const markdown = renderAct3EpilogueMarkdown(summary, options);

  const targetDir = path.dirname(outputPath);
  await mkdir(targetDir, { recursive: true });
  await writeFile(outputPath, `${markdown}\n`, 'utf8');

  return {
    outputPath,
    stanceCount: summary.stances.length,
  };
}
