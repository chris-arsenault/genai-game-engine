import { GameplayAdaptiveAudioBridge } from '../../../src/game/audio/GameplayAdaptiveAudioBridge.js';

class MockEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const handlers = this.listeners.get(event);
    handlers.push(handler);
    return () => {
      const list = this.listeners.get(event);
      const index = list.indexOf(handler);
      if (index >= 0) {
        list.splice(index, 1);
      }
    };
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.slice().forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[MockEventBus] handler error', error);
      }
    });
  }
}

describe('GameplayAdaptiveAudioBridge', () => {
  let eventBus;
  let emitter;
  let componentRegistry;

  beforeEach(() => {
    eventBus = new MockEventBus();
    emitter = {
      emitFromState: jest.fn(),
    };
    const disguise = {
      suspicionLevel: 12,
      equipped: true,
    };
    componentRegistry = {
      queryEntities: jest.fn(() => [1]),
      getComponent: jest.fn((entityId, type) => {
        if (type === 'Disguise') {
          return disguise;
        }
        return null;
      }),
      __disguise: disguise,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('emits suspicion snapshot when disguise events fire', () => {
    const bridge = new GameplayAdaptiveAudioBridge(eventBus, emitter, {
      componentRegistry,
      updateIntervalMs: 0,
    });
    bridge.attach();

    eventBus.emit('disguise:suspicious_action', { totalSuspicion: 32 });
    componentRegistry.__disguise.suspicionLevel = 32;
    bridge.update(0.016);

    expect(emitter.emitFromState).toHaveBeenCalledTimes(1);
    expect(emitter.emitFromState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        suspicion: 32,
        alertActive: false,
        combatEngaged: false,
        scramblerActive: false,
      })
    );
  });

  it('falls back to component suspicion when events lack values', () => {
    componentRegistry.getComponent = jest.fn((entityId, type) => {
      if (type === 'Disguise') {
        return { suspicionLevel: 48, equipped: true };
      }
      return null;
    });

    const bridge = new GameplayAdaptiveAudioBridge(eventBus, emitter, {
      componentRegistry,
      updateIntervalMs: 0,
    });
    bridge.attach();

    bridge.update(0.05);

    expect(emitter.emitFromState).toHaveBeenCalledTimes(1);
    expect(emitter.emitFromState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        suspicion: 48,
      })
    );
  });

  it('expires mood hints after configured duration', () => {
    jest.useFakeTimers();

    const bridge = new GameplayAdaptiveAudioBridge(eventBus, emitter, {
      componentRegistry,
      updateIntervalMs: 0,
      moodHintDurationMs: 100,
    });
    bridge.attach();

    eventBus.emit('area:entered', {
      areaId: 'crime_scene_entry',
      metadata: { moodHint: 'investigation_peak' },
    });
    bridge.update(0.016);

    expect(emitter.emitFromState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        moodHint: 'investigation_peak',
      })
    );

    emitter.emitFromState.mockClear();
    jest.advanceTimersByTime(150);
    bridge.update(0.016);

    expect(emitter.emitFromState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        moodHint: null,
      })
    );
  });
});
