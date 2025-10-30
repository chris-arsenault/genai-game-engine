import { EventBus } from '../../../src/engine/events/EventBus.js';
import { AudioFeedbackController } from '../../../src/game/audio/AudioFeedbackController.js';

describe('AudioFeedbackController', () => {
  let eventBus;
  let audioManager;
  let now;
  let controller;

  beforeEach(() => {
    eventBus = new EventBus();
    audioManager = { playSFX: jest.fn(() => null) };
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

  it('plays detective vision activation loop and shutdown cues', () => {
    const loopStop = jest.fn();
    audioManager.playSFX.mockImplementation((id, payload) => {
      if (payload && typeof payload === 'object' && payload.loop) {
        return { stop: loopStop };
      }
      return null;
    });

    audioManager.playSFX.mockClear();
    eventBus.emit('detective_vision:activated', { duration: 4 });

    expect(audioManager.playSFX).toHaveBeenNthCalledWith(
      1,
      'investigation_clue_ping',
      controller.options.detectiveVisionActivateVolume
    );
    expect(audioManager.playSFX).toHaveBeenNthCalledWith(
      2,
      'investigation_trace_loop',
      expect.objectContaining({
        loop: true,
        volume: controller.options.detectiveVisionLoopVolume,
      })
    );

    eventBus.emit('detective_vision:deactivated', { reason: 'manual' });
    expect(loopStop).toHaveBeenCalledTimes(1);
    expect(audioManager.playSFX).toHaveBeenNthCalledWith(
      3,
      'investigation_negative_hit',
      controller.options.detectiveVisionDeactivateVolume
    );
  });

  it('plays insufficient resource cue for detective vision energy warnings', () => {
    audioManager.playSFX.mockClear();
    eventBus.emit('ability:insufficient_resource', {
      ability: 'detective_vision',
      resource: 'energy',
    });
    expect(audioManager.playSFX).toHaveBeenCalledWith(
      'investigation_negative_hit',
      controller.options.detectiveVisionInsufficientVolume
    );
  });

  it('stops detective vision loop when controller is cleaned up', () => {
    const loopStop = jest.fn();
    audioManager.playSFX.mockImplementation((id, payload) => {
      if (payload && typeof payload === 'object' && payload.loop) {
        return { stop: loopStop };
      }
      return null;
    });

    eventBus.emit('detective_vision:activated', {});
    controller.cleanup();
    expect(loopStop).toHaveBeenCalledTimes(1);
  });

  it('allows runtime detective vision mix calibration', () => {
    controller.applyDetectiveVisionMix({
      activationVolume: 0.5,
      loopVolume: 0.18,
      deactivateVolume: 0.33,
      insufficientVolume: 0.42,
    });

    expect(controller.options.detectiveVisionActivateVolume).toBeCloseTo(0.5);
    expect(controller.options.detectiveVisionLoopVolume).toBeCloseTo(0.18);
    expect(controller.options.detectiveVisionDeactivateVolume).toBeCloseTo(0.33);
    expect(controller.options.detectiveVisionInsufficientVolume).toBeCloseTo(0.42);
    expect(controller.detectiveVisionMix).toMatchObject({
      activationVolume: 0.5,
      loopVolume: 0.18,
      deactivateVolume: 0.33,
      insufficientVolume: 0.42,
    });
  });

  it('retunes active detective vision loop volume when calibration changes', () => {
    const setVolume = jest.fn();
    audioManager.playSFX.mockImplementation((id, payload) => {
      if (payload && typeof payload === 'object' && payload.loop) {
        return { stop: jest.fn(), setVolume };
      }
      return null;
    });

    eventBus.emit('detective_vision:activated', {});
    controller.applyDetectiveVisionMix({ loopVolume: 0.26 });
    expect(setVolume).toHaveBeenCalledWith(0.26);
  });
});
