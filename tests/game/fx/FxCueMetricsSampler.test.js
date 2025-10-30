import { FxCueMetricsSampler } from '../../../src/game/fx/FxCueMetricsSampler.js';

describe('FxCueMetricsSampler', () => {
  let coordinator;
  let eventBus;
  let currentTime;

  beforeEach(() => {
    currentTime = 100;
    coordinator = {
      getMetrics: jest.fn(),
    };
    eventBus = {
      emit: jest.fn(),
    };
  });

  it('emits samples with rolling averages and peaks', () => {
    const metricsSequence = [
      { totalAccepted: 10, totalDeferred: 1, totalDropped: 0, totalReplayed: 0, active: 3, queued: 1 },
      { totalAccepted: 14, totalDeferred: 2, totalDropped: 0, totalReplayed: 1, active: 4, queued: 2 },
    ];
    let cursor = 0;
    coordinator.getMetrics.mockImplementation(() => metricsSequence[cursor]);

    const onSample = jest.fn();
    const sampler = new FxCueMetricsSampler(coordinator, eventBus, {
      sampleIntervalSeconds: 0.5,
      averageWindowSeconds: 1,
      getNow: () => currentTime,
      onSample,
    });

    sampler.start();

    sampler.update(0.25);
    expect(onSample).not.toHaveBeenCalled();

    sampler.update(0.25);
    expect(onSample).toHaveBeenCalledTimes(1);
    let snapshot = onSample.mock.calls[0][0];
    expect(snapshot.throughputPerSecond).toBe(0);
    expect(snapshot.active).toBe(3);
    expect(snapshot.averages).toMatchObject({ throughput: 0, active: 3, queued: 1 });

    cursor = 1;
    currentTime += 0.5;
    sampler.update(0.5);
    expect(onSample).toHaveBeenCalledTimes(2);
    snapshot = onSample.mock.calls[1][0];
    expect(snapshot.throughputPerSecond).toBeCloseTo(8, 5); // (14 - 10) / 0.5
    expect(snapshot.peaks.active).toBe(4);
    expect(snapshot.peaks.throughput).toBeCloseTo(8, 5);
    expect(snapshot.averages.throughput).toBeGreaterThan(0);

    const emitPayload = eventBus.emit.mock.calls[1][1];
    expect(emitPayload).toMatchObject({
      throughputPerSecond: snapshot.throughputPerSecond,
      peaks: snapshot.peaks,
    });
  });

  it('raises warnings when thresholds are hit and honours debounce', () => {
    const metrics = { totalAccepted: 20, totalDeferred: 2, totalDropped: 1, totalReplayed: 0, active: 15, queued: 1 };
    coordinator.getMetrics.mockReturnValue(metrics);

    const warnings = [];
    const sampler = new FxCueMetricsSampler(coordinator, eventBus, {
      sampleIntervalSeconds: 0.25,
      averageWindowSeconds: 0.5,
      warningActiveThreshold: 10,
      warningQueuedThreshold: 5,
      warningThroughputThreshold: 1,
      warningDebounceSeconds: 1,
      getNow: () => currentTime,
      onWarning: (payload) => warnings.push(payload),
    });

    sampler.start();
    sampler.update(0.25);
    expect(warnings).toHaveLength(0);

    currentTime += 0.25;
    sampler.update(0.25);
    expect(warnings).toHaveLength(1);

    eventBus.emit.mockClear();
    sampler.update(0.25);
    expect(warnings).toHaveLength(1);

    currentTime += 1.1;
    sampler.update(0.25);
    expect(warnings).toHaveLength(2);
    expect(eventBus.emit).toHaveBeenCalledWith('fx:metrics_warning', expect.any(Object));
  });

  it('stops sampling when stopped', () => {
    coordinator.getMetrics.mockReturnValue({ totalAccepted: 0, totalDeferred: 0, totalDropped: 0, totalReplayed: 0, active: 0, queued: 0 });

    const onSample = jest.fn();
    const sampler = new FxCueMetricsSampler(coordinator, eventBus, {
      sampleIntervalSeconds: 0.2,
      getNow: () => currentTime,
      onSample,
    });

    sampler.start();
    sampler.update(0.2);
    expect(onSample).toHaveBeenCalledTimes(1);

    sampler.stop();
    onSample.mockClear();
    sampler.update(0.2);
    expect(onSample).not.toHaveBeenCalled();
  });
});
