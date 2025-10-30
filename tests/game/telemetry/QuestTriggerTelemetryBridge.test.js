import { EventBus } from '../../../src/engine/events/EventBus.js';
import { QuestTriggerTelemetryBridge } from '../../../src/game/telemetry/QuestTriggerTelemetryBridge.js';

describe('QuestTriggerTelemetryBridge', () => {
  let eventBus;
  let bridge;
  let enteredEvents;
  let exitedEvents;

  beforeEach(() => {
    eventBus = new EventBus();
    enteredEvents = [];
    exitedEvents = [];
    bridge = new QuestTriggerTelemetryBridge(eventBus, {
      source: 'test_bridge',
      getActiveScene: () => ({
        id: 'test_scene',
        metadata: {
          branchId: 'branch_act2_test',
        },
      }),
      priority: 5,
    });
    bridge.attach();
    eventBus.on('telemetry:trigger_entered', (payload) => enteredEvents.push(payload));
    eventBus.on('telemetry:trigger_exited', (payload) => exitedEvents.push(payload));
  });

  afterEach(() => {
    bridge.dispose();
  });

  it('emits telemetry when quest triggers broadcast metadata tags', () => {
    eventBus.emit('area:entered', {
      areaId: 'test_area',
      data: {
        questId: 'quest-example',
        objectiveId: 'objective-example',
        triggerId: 'test_trigger_id',
        metadata: {
          telemetryTag: 'test_trigger_tag',
          extraContext: 'branch-depth',
        },
      },
      triggerPosition: { x: 120, y: 340 },
      targetPosition: { x: 130, y: 360 },
    });

    expect(enteredEvents).toHaveLength(1);
    expect(enteredEvents[0]).toMatchObject({
      source: 'test_bridge',
      telemetryTag: 'test_trigger_tag',
      triggerId: 'test_trigger_id',
      areaId: 'test_area',
      questId: 'quest-example',
      objectiveId: 'objective-example',
      sceneId: 'test_scene',
      branchId: 'branch_act2_test',
    });
    expect(enteredEvents[0].metadata).toEqual(
      expect.objectContaining({
        extraContext: 'branch-depth',
      })
    );
    expect(enteredEvents[0].triggerPosition).toEqual({ x: 120, y: 340 });
    expect(enteredEvents[0].targetPosition).toEqual({ x: 130, y: 360 });
  });

  it('emits exit telemetry and skips duplicate enter events once dispatched', () => {
    const payload = {
      areaId: 'test_area',
      data: {
        questId: 'quest-example',
        objectiveId: 'objective-example',
        metadata: {
          telemetryTag: 'test_trigger_tag',
        },
      },
    };

    eventBus.emit('area:entered', payload);
    expect(enteredEvents).toHaveLength(1);

    // Re-emitting the same payload should be ignored once telemetryDispatched is set
    eventBus.emit('area:entered', payload);
    expect(enteredEvents).toHaveLength(1);

    eventBus.emit('area:exited', {
      areaId: 'test_area',
      data: {
        questId: 'quest-example',
        objectiveId: 'objective-example',
        metadata: {
          telemetryTag: 'test_trigger_tag',
        },
      },
    });

    expect(exitedEvents).toHaveLength(1);
    expect(exitedEvents[0]).toMatchObject({
      source: 'test_bridge',
      telemetryTag: 'test_trigger_tag',
      areaId: 'test_area',
      questId: 'quest-example',
      objectiveId: 'objective-example',
    });
  });
});
