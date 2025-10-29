import { EventBus } from '../../../src/engine/events/EventBus.js';
import { TutorialTranscriptRecorder } from '../../../src/game/tutorial/TutorialTranscriptRecorder.js';

describe('TutorialTranscriptRecorder', () => {
  let eventBus;
  let recorder;

  beforeEach(() => {
    jest.useFakeTimers();
    eventBus = new EventBus();
    recorder = new TutorialTranscriptRecorder(eventBus, {
      maxEntries: 3,
      updateDebounceMs: 10,
    });
  });

  afterEach(() => {
    recorder.stop();
    jest.useRealTimers();
  });

  test('records tutorial lifecycle events and normalizes payloads', () => {
    recorder.start();

    const timestamp = Date.UTC(2025, 9, 30, 17, 0, 0);
    const stepStart = timestamp + 1000;
    const stepComplete = stepStart + 500;

    eventBus.emit('tutorial:started', { totalSteps: 5, startedAt: timestamp });
    eventBus.emit('tutorial:step_started', {
      stepId: 'movement',
      stepIndex: 0,
      totalSteps: 5,
      title: 'Movement Basics',
      description: 'Learn how to move',
      startedAt: stepStart,
    });
    eventBus.emit('tutorial:step_completed', {
      stepId: 'movement',
      totalSteps: 5,
      completedAt: stepComplete,
      durationMs: 500,
    });

    jest.advanceTimersByTime(11);

    const transcript = recorder.getTranscript();
    expect(transcript).toHaveLength(3);
    expect(transcript[0]).toEqual(
      expect.objectContaining({
        event: 'tutorial_started',
        metadata: expect.objectContaining({ totalSteps: 5 }),
      })
    );
    expect(transcript[1]).toEqual(
      expect.objectContaining({
        event: 'tutorial_step_started',
        promptId: 'movement',
        promptText: 'Movement Basics',
        metadata: expect.objectContaining({ stepIndex: 0 }),
      })
    );
    expect(transcript[2]).toEqual(
      expect.objectContaining({
        event: 'tutorial_step_completed',
        promptId: 'movement',
        metadata: expect.objectContaining({ durationMs: 500 }),
      })
    );
  });

  test('enforces max entry retention', () => {
    recorder.start();
    eventBus.emit('tutorial:started', { totalSteps: 2 });
    eventBus.emit('tutorial:step_started', { stepId: 'intro', stepIndex: 0, totalSteps: 2 });
    eventBus.emit('tutorial:step_completed', { stepId: 'intro', totalSteps: 2 });
    eventBus.emit('tutorial:step_started', { stepId: 'case_file', stepIndex: 1, totalSteps: 2 });

    jest.advanceTimersByTime(12);

    const transcript = recorder.getTranscript();
    expect(transcript).toHaveLength(3);
    expect(transcript[0].event).toBe('tutorial_step_started');
    expect(transcript[0].promptId).toBe('intro');
    expect(transcript[transcript.length - 1].promptId).toBe('case_file');
  });

  test('emits throttled transcript update events', () => {
    const emitSpy = jest.spyOn(eventBus, 'emit');
    recorder.start();

    eventBus.emit('tutorial:started', {});
    eventBus.emit('tutorial:step_started', { stepId: 'intro', totalSteps: 4 });

    // Debounce prevents immediate emission; advance timers to flush.
    expect(
      emitSpy.mock.calls.filter(([eventName]) => eventName === 'tutorial:transcript_updated')
    ).toHaveLength(0);

    jest.advanceTimersByTime(10);

    const transcriptEvents = emitSpy.mock.calls.filter(
      ([eventName]) => eventName === 'tutorial:transcript_updated'
    );

    expect(transcriptEvents).toHaveLength(1);
    expect(transcriptEvents[0][1]).toEqual(
      expect.objectContaining({
        count: 2,
        lastEntry: expect.objectContaining({ event: 'tutorial_step_started' }),
      })
    );
  });
});
