import { EventBus } from '../../../src/engine/events/EventBus.js';
import { AudioFeedbackController } from '../../../src/game/audio/AudioFeedbackController.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';

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

  it('maps save/load overlay cues to SFX playback', () => {
    audioManager.playSFX.mockClear();
    eventBus.emit('fx:overlay_cue', {
      overlay: 'saveLoad',
      effectId: 'saveLoadOverlayReveal',
      source: 'test',
    });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_prompt_ping', controller.options.promptVolume);

    audioManager.playSFX.mockClear();
    eventBus.emit('fx:overlay_cue', {
      overlay: 'saveLoad',
      effectId: 'saveLoadOverlayDismiss',
      source: 'test',
    });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_prompt_ping', controller.options.promptVolume);
  });

  it('throttles rapid save/load overlay focus cues', () => {
    audioManager.playSFX.mockClear();
    eventBus.emit('fx:overlay_cue', {
      overlay: 'saveLoad',
      effectId: 'saveLoadOverlayFocus',
      index: 0,
    });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_movement_pulse', controller.options.movementVolume);

    audioManager.playSFX.mockClear();
    eventBus.emit('fx:overlay_cue', {
      overlay: 'saveLoad',
      effectId: 'saveLoadOverlayFocus',
      index: 1,
    });
    expect(audioManager.playSFX).not.toHaveBeenCalled();

    now += 0.3;
    eventBus.emit('fx:overlay_cue', {
      overlay: 'saveLoad',
      effectId: 'saveLoadOverlayFocus',
      index: 2,
    });
    expect(audioManager.playSFX).toHaveBeenCalledWith('ui_movement_pulse', controller.options.movementVolume);
  });

  it('ignores overlay cues for unrelated overlays', () => {
    audioManager.playSFX.mockClear();
    eventBus.emit('fx:overlay_cue', {
      overlay: 'inventory',
      effectId: 'saveLoadOverlayReveal',
    });
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

  it('derives movement, prompt, and detective vision cue volumes from GameConfig defaults', () => {
    const defaultEventBus = new EventBus();
    const defaultAudioManager = { playSFX: jest.fn(() => null) };
    let defaultNow = 0;
    const defaultController = new AudioFeedbackController(defaultEventBus, defaultAudioManager, {
      now: () => defaultNow,
    });
    defaultController.init();

    defaultEventBus.emit('player:moving', { direction: { x: 0, y: 1 } });
    expect(defaultAudioManager.playSFX).toHaveBeenCalledTimes(1);
    const movementCalls = defaultAudioManager.playSFX.mock.calls;
    const firstCall = movementCalls[movementCalls.length - 1];
    expect(firstCall[0]).toBe('ui_movement_pulse');
    expect(firstCall[1]).toBeDefined();
    expect(firstCall[1]).toBeCloseTo(GameConfig.audio.sfxVolume * 0.65, 5);

    defaultAudioManager.playSFX.mockClear();
    defaultEventBus.emit('ui:show_prompt', { text: 'Queued prompt' });
    expect(defaultAudioManager.playSFX).toHaveBeenCalledTimes(1);
    const promptCalls = defaultAudioManager.playSFX.mock.calls;
    const promptCall = promptCalls[promptCalls.length - 1];
    expect(promptCall[0]).toBe('ui_prompt_ping');
    expect(promptCall[1]).toBeCloseTo(GameConfig.audio.sfxVolume * 0.75, 5);

    defaultAudioManager.playSFX.mockClear();
    const loopStop = jest.fn();
    defaultAudioManager.playSFX.mockImplementation((id, payload) => {
      if (payload && typeof payload === 'object' && payload.loop) {
        return { stop: loopStop };
      }
      return null;
    });

    defaultEventBus.emit('detective_vision:activated', {});
    expect(defaultAudioManager.playSFX).toHaveBeenCalledTimes(2);
    const [activationCall, loopCall] = defaultAudioManager.playSFX.mock.calls;
    expect(activationCall[0]).toBe('investigation_clue_ping');
    expect(activationCall[1]).toBeCloseTo(GameConfig.audio.detectiveVision.activationVolume, 5);
    expect(loopCall[0]).toBe('investigation_trace_loop');
    expect(loopCall[1]).toMatchObject({ loop: true });
    expect(loopCall[1].volume).toBeCloseTo(GameConfig.audio.detectiveVision.loopVolume, 5);

    defaultEventBus.emit('detective_vision:deactivated', {});
    expect(defaultAudioManager.playSFX).toHaveBeenCalledTimes(3);
    const recordedCalls = defaultAudioManager.playSFX.mock.calls;
    const deactivateCall = recordedCalls[recordedCalls.length - 1];
    expect(deactivateCall[0]).toBe('investigation_negative_hit');
    expect(deactivateCall[1]).toBeCloseTo(GameConfig.audio.detectiveVision.deactivateVolume, 5);

    defaultController.cleanup();
  });
});
