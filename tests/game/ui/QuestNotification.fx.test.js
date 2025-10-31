import { QuestNotification } from '../../../src/game/ui/QuestNotification.js';

describe('QuestNotification FX cues', () => {
  let eventBus;
  let overlay;

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(() => jest.fn()),
    };

    overlay = new QuestNotification(360, {
      eventBus,
    });
  });

  function getFxPayloads() {
    return eventBus.emit.mock.calls
      .filter(([event]) => event === 'fx:overlay_cue')
      .map(([, payload]) => payload);
  }

  it('emits display cue on initial notification', () => {
    overlay.addNotification('Quest Started', 'Breach the grid', 'started');

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'questNotificationDisplay',
      context: expect.objectContaining({
        reason: 'initialDisplay',
        type: 'started',
        title: 'Quest Started',
      }),
    });
  });

  it('emits queued cue when notifications stack and advances with auto dismiss', () => {
    overlay.addNotification('Quest Started', 'Breach the grid', 'started');
    eventBus.emit.mockClear();

    overlay.addNotification('Objective Completed', 'Disable the alarm grid', 'objective');

    let fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'questNotificationQueued',
      context: expect.objectContaining({
        reason: 'queuedWhileActive',
        queueLength: 1,
        type: 'objective',
      }),
    });

    // Advance time to trigger auto rotation
    overlay.update(5); // seconds
    fxPayloads = getFxPayloads();
    const dismissCue = fxPayloads.find((payload) => payload.effectId === 'questNotificationDismiss');
    expect(dismissCue).toBeDefined();
    expect(dismissCue.context).toMatchObject({
      reason: 'autoAdvance',
      type: 'started',
    });
    const displayCue = fxPayloads.find((payload) => payload.effectId === 'questNotificationDisplay' && payload.context.type === 'objective');
    expect(displayCue).toBeDefined();
    expect(displayCue.context.reason).toBe('autoAdvance');
  });

  it('emits dismiss and clear cues when cleared manually', () => {
    overlay.addNotification('Quest Started', 'Breach the grid', 'started');
    overlay.addNotification('Objective Completed', 'Disable the alarm grid', 'objective');
    eventBus.emit.mockClear();

    overlay.clear();

    const fxPayloads = getFxPayloads();
    const dismissCue = fxPayloads.find((payload) => payload.effectId === 'questNotificationDismiss');
    expect(dismissCue).toBeDefined();
    expect(dismissCue.context.reason).toBe('manualClear');

    const clearCue = fxPayloads.find((payload) => payload.effectId === 'questNotificationClear');
    expect(clearCue).toBeDefined();
    expect(clearCue.context).toMatchObject({
      reason: 'manual',
      clearedQueued: 1,
      clearedActive: true,
    });
  });

  it('emits dismiss cue when final notification expires', () => {
    overlay.addNotification('Quest Started', 'Breach the grid', 'started');
    eventBus.emit.mockClear();

    overlay.update(5);

    const fxPayloads = getFxPayloads();
    const dismissCue = fxPayloads.find((payload) => payload.effectId === 'questNotificationDismiss');
    expect(dismissCue).toBeDefined();
    expect(dismissCue.context.reason).toBe('autoAdvance');
  });
});
