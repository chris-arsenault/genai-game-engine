import { EventBus } from '../../../../src/engine/events/EventBus.js';
import { WorldStateStore } from '../../../../src/game/state/WorldStateStore.js';
import { questSlice } from '../../../../src/game/state/slices/questSlice.js';
import { buildQuestViewModel } from '../../../../src/game/ui/helpers/questViewModel.js';

describe('questViewModel NPC availability integration', () => {
  let eventBus;
  let worldStateStore;
  let questManager;

  beforeEach(() => {
    eventBus = new EventBus();
    worldStateStore = new WorldStateStore(eventBus, { enableDebug: false });
    worldStateStore.init();
    questManager = {
      getQuest: jest.fn(),
    };
  });

  test('includes detailed NPC availability for blocked objectives', () => {
    const questState = questSlice.getInitialState();
    const questId = 'quest.stealth';
    const objectiveId = 'meet_contact';
    const recordedAt = Date.UTC(2025, 9, 30, 18, 0, 0);

    questState.byId[questId] = {
      id: questId,
      title: 'Stealth Contact',
      type: 'story',
      status: 'active',
      description: 'Coordinate with the handler to enter the district unnoticed.',
      objectives: {
        [objectiveId]: {
          id: objectiveId,
          title: 'Meet the handler',
          description: 'Find Vela in the rooftop relay hub.',
          status: 'blocked',
          progress: 0,
          target: 1,
          blocked: {
            reason: 'npc_unavailable',
            message: 'Vela is currently rotating safe houses.',
            recordedAt,
          },
        },
      },
      objectivesOrder: [objectiveId],
      blockedObjectives: {
        [objectiveId]: {
          questId,
          questTitle: 'Stealth Contact',
          questType: 'story',
          objectiveId,
          objectiveTitle: 'Meet the handler',
          npcId: 'npc.vela',
          npcName: 'Vela',
          reason: 'npc_unavailable',
          requirement: 'Wait for shift change',
          message: 'Hold position until the patrol schedule flips.',
          recordedAt,
          tag: 'handler',
        },
      },
      lastBlockedAt: recordedAt,
      lastBlocked: {
        questId,
        objectiveId,
        npcId: 'npc.vela',
        reason: 'npc_unavailable',
        recordedAt,
      },
    };
    questState.activeIds = [questId];
    questState.npcAvailability = {
      'npc.vela': {
        npcId: 'npc.vela',
        npcName: 'Vela',
        factionId: 'cipher_collective',
        tag: 'handler',
        available: false,
        updatedAt: recordedAt,
        reason: 'npc_unavailable',
        objectives: [
          {
            questId,
            objectiveId,
            objectiveTitle: 'Meet the handler',
            reason: 'npc_unavailable',
            requirement: 'Wait for shift change',
            message: 'Relay is dark until the next window.',
            recordedAt,
          },
        ],
      },
    };

    worldStateStore.state.quest = questState;

    questManager.getQuest.mockReturnValue({
      id: questId,
      title: 'Stealth Contact',
      type: 'story',
      objectives: [
        {
          id: objectiveId,
          title: 'Meet the handler',
          description: 'Find Vela on the relay rooftop.',
          trigger: { count: 1 },
        },
      ],
    });

    const viewModel = buildQuestViewModel(worldStateStore, questManager, questId);

    expect(viewModel).toBeTruthy();
    expect(viewModel.objectives[0].blocked).toEqual(
      expect.objectContaining({
        npcId: 'npc.vela',
        npcName: 'Vela',
        reason: 'npc_unavailable',
        requirement: 'Wait for shift change',
        message: 'Hold position until the patrol schedule flips.',
        status: 'blocked',
      })
    );

    expect(viewModel.npcAvailability).toHaveLength(1);
    const availability = viewModel.npcAvailability[0];
    expect(availability).toEqual(
      expect.objectContaining({
        npcId: 'npc.vela',
        npcName: 'Vela',
        available: false,
        reason: 'npc_unavailable',
        tag: 'handler',
      })
    );
    expect(availability.objectives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: objectiveId,
          title: 'Meet the handler',
          reason: 'npc_unavailable',
        }),
      ])
    );
  });

  test('omits NPC availability when no objectives are blocked', () => {
    const questId = 'quest.briefing';
    const questState = questSlice.getInitialState();
    const recordedAt = Date.UTC(2025, 9, 30, 18, 30, 0);

    questState.byId[questId] = {
      id: questId,
      title: 'Safehouse Briefing',
      status: 'active',
      type: 'story',
      description: 'Listen to the debrief from HQ.',
      objectives: {
        attend_briefing: {
          id: 'attend_briefing',
          title: 'Attend the briefing',
          status: 'in_progress',
          progress: 0,
          target: 1,
        },
      },
      objectivesOrder: ['attend_briefing'],
      blockedObjectives: {},
    };
    questState.activeIds = [questId];
    questState.npcAvailability = {
      'npc.harlow': {
        npcId: 'npc.harlow',
        npcName: 'Harlow',
        available: true,
        updatedAt: recordedAt,
        reason: 'availability_restored',
        objectives: [],
      },
    };

    worldStateStore.state.quest = questState;

    questManager.getQuest.mockReturnValue({
      id: questId,
      title: 'Safehouse Briefing',
      type: 'story',
      objectives: [
        {
          id: 'attend_briefing',
          title: 'Attend the briefing',
          trigger: { count: 1 },
        },
      ],
    });

    const viewModel = buildQuestViewModel(worldStateStore, questManager, questId);

    expect(viewModel.objectives[0].blocked).toBeNull();
    expect(viewModel.npcAvailability).toEqual([]);
  });
});
