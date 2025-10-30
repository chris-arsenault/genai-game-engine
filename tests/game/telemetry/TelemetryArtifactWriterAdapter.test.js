import { TelemetryArtifactWriterAdapter } from '../../../src/game/telemetry/TelemetryArtifactWriterAdapter.js';

describe('TelemetryArtifactWriterAdapter', () => {
  const createClock = () => {
    let current = 0;
    return () => {
      current += 1;
      return current * 2; // deterministic deterministic increments
    };
  };

  const createEventBusMock = () => ({
    emit: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fans out artifacts to all writers and emits summary event', async () => {
    const writerA = jest.fn().mockResolvedValue();
    const writerB = {
      write: jest.fn().mockResolvedValue(),
      id: 'filesystem',
    };
    const eventBus = createEventBusMock();

    const adapter = new TelemetryArtifactWriterAdapter({
      writers: [writerA, writerB],
      eventBus,
      now: createClock(),
    });

    const artifacts = [
      { filename: 'a.json', type: 'json', content: '{}' },
      { filename: 'b.csv', type: 'csv', content: 'row' },
    ];

    const result = await adapter.writeArtifacts(artifacts, { missionId: 'cascade' });

    expect(writerA).toHaveBeenCalledTimes(2);
    expect(writerB.write).toHaveBeenCalledTimes(2);
    expect(writerA).toHaveBeenCalledWith(expect.objectContaining({ filename: 'a.json' }), expect.objectContaining({ missionId: 'cascade' }));
    expect(result.artifactsAttempted).toBe(2);
    expect(result.artifactsWritten).toBe(4); // 2 artifacts * 2 writers
    expect(result.failures).toHaveLength(0);

    expect(eventBus.emit).toHaveBeenCalledTimes(1);
    const summaryPayload = eventBus.emit.mock.calls[0][1];

    expect(summaryPayload.artifactsAttempted).toBe(2);
    expect(summaryPayload.artifactsWritten).toBe(4);
    expect(summaryPayload.context).toEqual(expect.objectContaining({ missionId: 'cascade' }));
    expect(summaryPayload.writerSummaries).toHaveLength(2);
    summaryPayload.writerSummaries.forEach((writerSummary) => {
      expect(writerSummary.successes).toBe(2);
    });
  });

  test('continues when a writer throws and emits failure event', async () => {
    const successfulWriter = jest.fn().mockResolvedValue();
    const failingWriter = jest.fn().mockRejectedValue(new Error('disk full'));
    const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
    const eventBus = createEventBusMock();

    const adapter = new TelemetryArtifactWriterAdapter({
      writers: [successfulWriter, failingWriter],
      eventBus,
      logger,
      now: createClock(),
    });

    const artifacts = [{ filename: 'summary.json', type: 'json', content: '{}' }];

    const result = await adapter.writeArtifacts(artifacts, { runId: 'ci-run' });

    expect(successfulWriter).toHaveBeenCalledTimes(1);
    expect(failingWriter).toHaveBeenCalledTimes(1);
    expect(result.failures).toHaveLength(1);

    const failedWriterId = result.failures[0].writerId;
    expect(result.failures[0]).toEqual(
      expect.objectContaining({
        writerId: failedWriterId,
        artifact: expect.objectContaining({ filename: 'summary.json' }),
        error: expect.any(Error),
      })
    );

    expect(logger.warn).toHaveBeenCalledWith('[TelemetryArtifactWriterAdapter] Writer failed', {
      writerId: failedWriterId,
      filename: 'summary.json',
      message: 'disk full',
    });

    expect(eventBus.emit).toHaveBeenNthCalledWith(
      1,
      'telemetry:artifact_failed',
      expect.objectContaining({
        writerId: failedWriterId,
        filename: 'summary.json',
        errorMessage: 'disk full',
        context: expect.objectContaining({ runId: 'ci-run' }),
      })
    );
    expect(eventBus.emit).toHaveBeenNthCalledWith(
      2,
      'telemetry:artifacts_written',
      expect.objectContaining({
        artifactsWritten: 1,
        failures: 1,
      })
    );
  });

  test('allows writers to be registered after construction', async () => {
    const adapter = new TelemetryArtifactWriterAdapter({
      now: createClock(),
    });

    const registered = adapter.addWriter(async (artifact, context) => {
      expect(artifact.filename).toBe('dynamic.csv');
      expect(context.label).toBe('post');
    }, { id: 'dynamic-writer' });

    expect(registered.id).toBe('dynamic-writer');

    const result = await adapter.writeArtifacts(
      [{ filename: 'dynamic.csv', type: 'csv', content: 'x' }],
      { label: 'post' }
    );

    expect(result.artifactsWritten).toBe(1);
    expect(result.failures).toHaveLength(0);
    expect(result.writerSummaries).toEqual([
      expect.objectContaining({ id: 'dynamic-writer', successes: 1, failures: 0 }),
    ]);
  });
});
