import { EventBus } from '../../../src/engine/events/EventBus.js';
import { AudioFeedbackController } from '../../../src/game/audio/AudioFeedbackController.js';

describe('AudioFeedbackController', () => {
  let eventBus;
  let audioManager;
  let now;
  let controller;

  beforeEach(() => {
    eventBus = new EventBus();
    audioManager = { playSFX: jest.fn() };
    now = 0;
    controller = new AudioFeedbackController(eventBus, audioManager, {
      now: () => now,
      movementCooldown: 0.25,
      promptCooldown: 0.4,
      movementVolume: 0.5,
      promptVolume: 0.7,
      evidenceVolume: 0.9
    });
    controller.init();
  });

  afterEach(() => {
    controller.cleanup();
  });

  it('throttles movement pulse playback', () => {
    eventBus.emit('player:moving', { direction: { x: 1, y: 0 } });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_movement_pulse', 0.5);

    audioManager.playSFX.mockClear();
    now += 0.1;
    eventBus.emit('player:moving', { direction: { x: 0, y: 1 } });
    expect(audioManager.playSFX).not.toHaveBeenCalled();

    now += 0.3;
    eventBus.emit('player:moving', { direction: { x: -1, y: 0 } });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_movement_pulse', 0.5);
  });

  it('plays evidence collection cue', () => {
    eventBus.emit('evidence:collected', { evidenceId: 'sample' });
    expect(audioManager.playSFX).toHaveBeenCalledWith('evidence_collect', 0.9);
  });

  it('plays prompt chime with cooldown', () => {
    eventBus.emit('ui:show_prompt', { text: 'Press E' });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_prompt_ping', 0.7);

    audioManager.playSFX.mockClear();
    now += 0.1;
    eventBus.emit('ui:show_prompt', { text: 'Press E' });
    expect(audioManager.playSFX).not.toHaveBeenCalled();
  });

  it('forwards audio:sfx:play events to audio manager', () => {
    eventBus.emit('audio:sfx:play', { id: 'quest_complete', volume: 0.4 });
    expect(audioManager.playSFX).toHaveBeenCalledWith('quest_complete', 0.4);
  });

  it('stops reacting after cleanup', () => {
    controller.cleanup();
    audioManager.playSFX.mockClear();
    eventBus.emit('evidence:collected', { evidenceId: 'sample' });
    expect(audioManager.playSFX).not.toHaveBeenCalled();
  });
});
