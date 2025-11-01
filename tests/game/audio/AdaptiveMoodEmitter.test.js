import { EventBus } from '../../../src/engine/events/EventBus.js';
import { AdaptiveMoodEmitter } from '../../../src/game/audio/AdaptiveMoodEmitter.js';
import { SuspicionMoodMapper } from '../../../src/game/audio/SuspicionMoodMapper.js';

describe('AdaptiveMoodEmitter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits adaptive mood events with telemetry payload', () => {
    const eventBus = new EventBus();
    const moodHandler = jest.fn();
    const telemetryHandler = jest.fn();
    eventBus.on('audio:adaptive:set_mood', moodHandler);
    eventBus.on('audio:adaptive:emitter_event', telemetryHandler);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(5000);
    const emitter = new AdaptiveMoodEmitter(eventBus, { defaultSource: 'test' });

    const emitted = emitter.emitMood('stealth', { duration: 4 });

    expect(emitted).toBe(true);
    expect(moodHandler).toHaveBeenCalledWith({
      mood: 'stealth',
      options: expect.objectContaining({ duration: 4, source: 'test' }),
    });
    expect(telemetryHandler).toHaveBeenCalledWith({
      mood: 'stealth',
      options: expect.objectContaining({ duration: 4, source: 'test' }),
      timestamp: 5000,
    });
    nowSpy.mockRestore();
  });

  it('debounces identical mood emissions within debounce window', () => {
    const eventBus = new EventBus();
    const moodHandler = jest.fn();
    eventBus.on('audio:adaptive:set_mood', moodHandler);
    eventBus.on('audio:adaptive:emitter_event', jest.fn());

    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100)
      .mockReturnValueOnce(1400)
      .mockReturnValueOnce(1800);

    const emitter = new AdaptiveMoodEmitter(eventBus, { debounceMs: 250 });

    expect(emitter.emitMood('alert')).toBe(true);
    expect(emitter.emitMood('alert')).toBe(false);
    expect(emitter.emitMood('alert', { force: true })).toBe(true);
    expect(moodHandler).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('emits from state using provided mapper', () => {
    const eventBus = new EventBus();
    const moodHandler = jest.fn();
    eventBus.on('audio:adaptive:set_mood', moodHandler);

    const mapper = new SuspicionMoodMapper({ thresholds: { alert: 20 } });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2000);

    const emitter = new AdaptiveMoodEmitter(eventBus, { moodMapper: mapper, defaultSource: 'bridge' });
    const emitted = emitter.emitFromState({
      suspicion: 30,
      alertActive: true,
      timestamp: 2000,
    });

    expect(emitted).toBe(true);
    expect(moodHandler).toHaveBeenCalledTimes(1);
    const payload = moodHandler.mock.calls[0][0];
    expect(payload.mood).toBe('alert');
    expect(payload.options.source).toBe('suspicion-mapper');
    expect(payload.options.priority).toBe('alert');
    expect(payload.options.metadata).toEqual(
      expect.objectContaining({
        alertActive: true,
        combatEngaged: false,
        scramblerActive: false,
        suspicion: 30,
      })
    );

    nowSpy.mockRestore();
  });

  it('throws when emitFromState called without mapper', () => {
    const eventBus = new EventBus();
    const emitter = new AdaptiveMoodEmitter(eventBus);
    expect(() => emitter.emitFromState({ suspicion: 10 })).toThrow(
      '[AdaptiveMoodEmitter] emitFromState requires a SuspicionMoodMapper instance'
    );
  });

  it('stops emitting after dispose', () => {
    const eventBus = new EventBus();
    const moodHandler = jest.fn();
    eventBus.on('audio:adaptive:set_mood', moodHandler);

    const emitter = new AdaptiveMoodEmitter(eventBus);
    emitter.dispose();

    expect(emitter.emitMood('stealth')).toBe(false);
    expect(moodHandler).not.toHaveBeenCalled();
  });

  it('reports telemetry state via getState', () => {
    const eventBus = new EventBus();
    const emitter = new AdaptiveMoodEmitter(eventBus, { debounceMs: 100 });

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(3200);
    emitter.emitMood('stealth');
    nowSpy.mockRestore();

    const state = emitter.getState();
    expect(state.lastMood).toBe('stealth');
    expect(state.lastEmitTime).toBe(3200);
    expect(state.debounceMs).toBe(100);
    expect(state.disposed).toBe(false);
  });
});
