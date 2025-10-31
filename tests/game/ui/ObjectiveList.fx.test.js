import { ObjectiveList } from '../../../src/game/ui/ObjectiveList.js';

describe('ObjectiveList FX cues', () => {
  let eventBus;
  let list;

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
    };

    list = new ObjectiveList(0, 0, 320, {
      maxHeight: 180,
      eventBus,
    });
  });

  function getFxPayloads() {
    return eventBus.emit.mock.calls
      .filter(([event]) => event === 'fx:overlay_cue')
      .map(([, payload]) => payload);
  }

  it('emits refresh cue on initial objective load', () => {
    list.loadObjectives([
      { description: 'Survey the plaza', completed: false },
      { description: 'Trace the energy signatures', completed: false },
    ]);

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'objectiveListRefresh',
      context: expect.objectContaining({
        reason: 'initial',
        totalObjectives: 2,
        completedObjectives: 0,
      }),
    });
  });

  it('emits refresh with delta when objectives change', () => {
    list.loadObjectives([{ description: 'Secure access codes', completed: false }]);
    eventBus.emit.mockClear();

    list.loadObjectives([
      { description: 'Secure access codes', completed: false },
      { description: 'Patch into the grid', completed: false },
    ]);

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'objectiveListRefresh',
      context: expect.objectContaining({
        reason: 'update',
        totalObjectives: 2,
        totalDelta: 1,
      }),
    });
  });

  it('emits completion cue when objectives newly complete', () => {
    list.loadObjectives([{ description: 'Sync with Zara', completed: false }]);
    eventBus.emit.mockClear();

    list.loadObjectives([{ description: 'Sync with Zara', completed: true }]);

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(2);
    const completionCue = fxPayloads.find((payload) => payload.effectId === 'objectiveListCompletion');
    expect(completionCue).toBeDefined();
    expect(completionCue.context).toMatchObject({
      newlyCompleted: 1,
      totalCompleted: 1,
      totalObjectives: 1,
    });
  });

  it('emits scroll cue when offset changes', () => {
    const objectives = Array.from({ length: 10 }, (_, index) => ({
      description: `Objective ${index + 1}`,
      completed: false,
    }));
    list.loadObjectives(objectives);
    eventBus.emit.mockClear();

    list.scroll(30);

    const fxPayloads = getFxPayloads();
    expect(fxPayloads).toHaveLength(1);
    expect(fxPayloads[0]).toMatchObject({
      effectId: 'objectiveListScroll',
      context: expect.objectContaining({
        reason: 'userScroll',
        offset: expect.any(Number),
        delta: 30,
      }),
    });
  });
});
