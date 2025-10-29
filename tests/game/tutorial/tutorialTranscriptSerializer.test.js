import {
  buildTutorialTranscript,
  serializeTranscriptToCsv,
  serializeTranscriptToMarkdown,
} from '../../../src/game/tutorial/serializers/tutorialTranscriptSerializer.js';

describe('tutorial transcript serializer', () => {
  test('buildTutorialTranscript normalizes entries and applies limits', () => {
    const entries = [
      {
        event: 'tutorial_started',
        timestamp: 1000,
        actionTaken: 'started',
        metadata: { totalSteps: 4 },
      },
      {
        event: 'tutorial_step_started',
        promptId: 'intro',
        promptText: 'Introduction',
        actionTaken: 'step_started',
        timestamp: 2000,
        metadata: { stepIndex: 0 },
      },
      {
        event: 'tutorial_step_completed',
        promptId: 'intro',
        actionTaken: 'step_completed',
        timestamp: 2500,
        metadata: { durationMs: 500 },
      },
    ];

    const normalized = buildTutorialTranscript(entries, { limit: 2 });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toEqual(
      expect.objectContaining({
        sequence: 0,
        event: 'tutorial_step_started',
        promptId: 'intro',
        title: 'Introduction',
        timestampIso: new Date(2000).toISOString(),
      })
    );
    expect(normalized[1].metadata).toEqual(expect.objectContaining({ durationMs: 500 }));
  });

  test('serializeTranscriptToCsv outputs header and escaped rows', () => {
    const transcript = buildTutorialTranscript(
      [
        {
          event: 'tutorial_step_started',
          promptId: 'intro',
          promptText: 'Intro, Investigator',
          timestamp: 1000,
          actionTaken: 'step_started',
          followUpNarrative: 'Welcome aboard',
          metadata: { stepIndex: 0 },
        },
      ],
      { limit: 10 }
    );

    const csv = serializeTranscriptToCsv(transcript);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'sequence,event,prompt_id,title,action,timestamp,timestamp_iso,follow_up_narrative,metadata'
    );
    expect(lines[1]).toContain('"Intro, Investigator"');
    expect(lines[1]).toContain('"stepIndex"');
  });

  test('serializeTranscriptToMarkdown builds table rows', () => {
    const transcript = buildTutorialTranscript([
      {
        event: 'tutorial_completed',
        timestamp: 5000,
        actionTaken: 'completed',
        followUpNarrative: 'Case closed',
      },
    ]);

    const markdown = serializeTranscriptToMarkdown(transcript);
    const rows = markdown.split('\n');

    expect(rows[0]).toBe('| # | Event | Prompt | Action | Timestamp | Narrative |');
    expect(rows[2]).toContain('tutorial_completed');
    expect(rows[2]).toContain('Case closed');
  });
});
