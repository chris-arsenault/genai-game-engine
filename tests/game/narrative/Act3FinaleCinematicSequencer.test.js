import { EventBus } from '../../../src/engine/events/EventBus.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import {
  Act3FinaleCinematicSequencer,
  ACT3_FINALE_INFILTRATION_FLAG,
} from '../../../src/game/narrative/Act3FinaleCinematicSequencer.js';

function createManagers() {
  const eventBus = new EventBus();
  const storyFlags = new StoryFlagManager(eventBus);
  storyFlags.init();
  return { eventBus, storyFlags };
}

describe('Act3FinaleCinematicSequencer', () => {
  test('emits finale cinematic when infiltration completes with stance flag', () => {
    const { eventBus, storyFlags } = createManagers();
    const sequencer = new Act3FinaleCinematicSequencer({
      eventBus,
      storyFlagManager: storyFlags,
    });

    const received = [];
    eventBus.on('narrative:finale_cinematic_ready', (payload) => {
      received.push(payload);
    });

    sequencer.init();

    storyFlags.setFlag('act3_stance_opposition', true);
    storyFlags.setFlag(ACT3_FINALE_INFILTRATION_FLAG, true);

    expect(received).toHaveLength(1);
    const payload = received[0];
    expect(payload.cinematicId).toBe('cinematic_act3_opposition_shutdown');
    expect(payload.stanceId).toBe('opposition');
    expect(payload.infiltrationFlag).toBe(ACT3_FINALE_INFILTRATION_FLAG);
    expect(Array.isArray(payload.epilogueBeats)).toBe(true);
    expect(payload.epilogueBeats.length).toBeGreaterThan(0);
    expect(payload.epilogueBeats[0]).toEqual(
      expect.objectContaining({
        order: 1,
        title: expect.any(String),
      })
    );
    expect(Array.isArray(payload.epilogueBeats[0].voiceover)).toBe(true);
    expect(payload.epilogueBeats[0].voiceover[0]).toEqual(
      expect.objectContaining({
        speaker: expect.any(String),
        line: expect.any(String),
      })
    );

    sequencer.dispose();
  });

  test('dispatches immediately when flags already set before init', () => {
    const { eventBus, storyFlags } = createManagers();
    storyFlags.setFlag('act3_stance_support', true);
    storyFlags.setFlag(ACT3_FINALE_INFILTRATION_FLAG, true);

    const sequencer = new Act3FinaleCinematicSequencer({
      eventBus,
      storyFlagManager: storyFlags,
    });

    const received = [];
    eventBus.on('narrative:finale_cinematic_ready', (payload) => {
      received.push(payload);
    });

    sequencer.init();

    expect(received).toHaveLength(1);
    expect(received[0].cinematicId).toBe('cinematic_act3_support_release');

    sequencer.dispose();
  });

  test('re-dispatches when infiltration flag toggles off and on again', () => {
    const { eventBus, storyFlags } = createManagers();
    const sequencer = new Act3FinaleCinematicSequencer({
      eventBus,
      storyFlagManager: storyFlags,
    });

    const received = [];
    eventBus.on('narrative:finale_cinematic_ready', (payload) => {
      received.push(payload);
    });

    sequencer.init();

    storyFlags.setFlag('act3_stance_alternative', true);
    storyFlags.setFlag(ACT3_FINALE_INFILTRATION_FLAG, true);

    expect(received).toHaveLength(1);
    expect(received[0].cinematicId).toBe('cinematic_act3_alternative_release');

    storyFlags.setFlag(ACT3_FINALE_INFILTRATION_FLAG, false);
    storyFlags.setFlag(ACT3_FINALE_INFILTRATION_FLAG, true);

    expect(received).toHaveLength(2);
    expect(received[1].cinematicId).toBe('cinematic_act3_alternative_release');

    sequencer.dispose();
  });
});
