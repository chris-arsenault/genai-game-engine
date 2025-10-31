import { overlayTheme } from './theme/overlayTheme.js';

/**
 * FxOverlay
 *
 * Lightweight screen-space FX layer that listens for fx:overlay_cue events and
 * renders short-lived canvas treatments (screen flashes, edge pulses, quest
 * bursts, forensic scans, etc.).
 */
export class FxOverlay {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {EventBus} eventBus
   * @param {object} [options]
   */
  constructor(canvas, eventBus, options = {}) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.effects = [];
    this._unbindFx = null;
    this.maxConcurrentEffects = Math.max(1, Number(options.maxConcurrentEffects) || 10);

    const defaultScreenEffectMap = {
      forensicRevealFlash: 'flash',
      forensicPulse: 'scanline',
      detectiveVisionActivation: 'glitch',
    };
    const screenOptions = options.screenEffects || {};
    const screenFrames = screenOptions.frames || {};

    const { palette } = overlayTheme;

    this.theme = {
      activationInner: options.activationInner || 'rgba(80, 255, 225, 0.75)',
      activationOuter: options.activationOuter || 'rgba(40, 180, 200, 0)',
      activationRim: options.activationRim || palette.accent,
      activationDuration: options.activationDuration || 0.45,
      deactivateColor: options.deactivateColor || 'rgba(255, 120, 120, 0.6)',
      deactivateOuter: options.deactivateOuter || 'rgba(255, 0, 80, 0)',
      deactivateDuration: options.deactivateDuration || 0.35,
      deactivateRimColor: options.deactivateRimColor || 'rgba(255, 160, 160, 0.7)',
      questPulseTop: options.questPulseTop || 'rgba(255, 220, 130, 0.85)',
      questPulseBottom: options.questPulseBottom || 'rgba(255, 160, 60, 0.0)',
      questPulseRim: options.questPulseRim || palette.highlight,
      questPulseDuration: options.questPulseDuration || 0.8,
      questCompleteInner: options.questCompleteInner || 'rgba(255, 255, 210, 0.9)',
      questCompleteOuter: options.questCompleteOuter || 'rgba(255, 190, 90, 0.0)',
      questCompleteRays: options.questCompleteRays || 'rgba(255, 220, 120, 0.8)',
      questCompleteDuration: options.questCompleteDuration || 1.05,
      forensicPulseInner: options.forensicPulseInner || 'rgba(120, 200, 255, 0.75)',
      forensicPulseOuter: options.forensicPulseOuter || 'rgba(30, 140, 220, 0)',
      forensicPulseDuration: options.forensicPulseDuration || 0.6,
      forensicRevealColor: options.forensicRevealColor || 'rgba(80, 255, 200, 0.8)',
      forensicRevealRim: options.forensicRevealRim || 'rgba(40, 200, 160, 0.4)',
      forensicRevealDuration: options.forensicRevealDuration || 0.75,
      dialogueStartTop: options.dialogueStartTop || 'rgba(130, 200, 255, 0.75)',
      dialogueStartBottom: options.dialogueStartBottom || 'rgba(40, 80, 120, 0)',
      dialogueBeatInner: options.dialogueBeatInner || 'rgba(230, 255, 255, 0.8)',
      dialogueBeatOuter: options.dialogueBeatOuter || 'rgba(60, 120, 180, 0)',
      dialogueChoiceAccent: options.dialogueChoiceAccent || 'rgba(200, 255, 210, 0.75)',
      dialogueCompleteInner: options.dialogueCompleteInner || 'rgba(255, 240, 210, 0.9)',
      dialogueCompleteOuter: options.dialogueCompleteOuter || 'rgba(255, 180, 90, 0.1)',
      caseEvidenceInner: options.caseEvidenceInner || 'rgba(140, 210, 255, 0.7)',
      caseEvidenceOuter: options.caseEvidenceOuter || 'rgba(50, 90, 140, 0)',
      caseClueInner: options.caseClueInner || 'rgba(160, 255, 220, 0.7)',
      caseClueOuter: options.caseClueOuter || 'rgba(40, 110, 90, 0)',
      caseObjectiveInner: options.caseObjectiveInner || 'rgba(255, 215, 180, 0.75)',
      caseObjectiveOuter: options.caseObjectiveOuter || 'rgba(180, 90, 40, 0)',
      caseSolvedInner: options.caseSolvedInner || 'rgba(255, 255, 220, 0.9)',
      caseSolvedOuter: options.caseSolvedOuter || 'rgba(255, 205, 130, 0.15)',
    };

    this.screenEffects = {
      enabled: screenOptions.enabled !== false,
      imagePath: screenOptions.imagePath
        || 'assets/generated/ar-007/image-ar-007-screen-effects-pack.png',
      frameCount: Math.max(1, Number(screenOptions.frameCount) || 3),
      orientation: screenOptions.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      frames: {
        flash: {
          index: 0,
          duration: 0.45,
          baseAlpha: 0.85,
          falloffPower: 1.35,
          ...screenFrames.flash,
        },
        scanline: {
          index: 1,
          duration: 0.6,
          baseAlpha: 0.6,
          falloffPower: 1.5,
          ...screenFrames.scanline,
        },
        glitch: {
          index: 2,
          duration: 0.48,
          baseAlpha: 0.65,
          falloffPower: 1.4,
          jitter: 0.014,
          ...screenFrames.glitch,
        },
      },
      effectMap: {
        ...defaultScreenEffectMap,
        ...(screenOptions.effectMap || {}),
      },
      loader: screenOptions.assetLoader || null,
      image: screenOptions.image || null,
      imageLoaded: Boolean(screenOptions.image),
      loading: false,
      frameRects: new Map(),
    };

    if (this.screenEffects.imageLoaded && this.screenEffects.image) {
      this._computeScreenEffectFrameRects();
    }
  }

  init() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function') {
      return;
    }
    this._unbindFx = this.eventBus.on('fx:overlay_cue', (payload) => {
      this._handleFxCue(payload);
    });
  }

  update(deltaTime) {
    if (!this.effects.length) {
      return;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.elapsed += deltaTime;
      if (effect.elapsed >= effect.duration) {
        this.effects.splice(i, 1);
      }
    }
  }

  render(ctx) {
    if (!this.effects.length) {
      return;
    }
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i];
      if (typeof effect.render === 'function') {
        effect.render(ctx, effect, this.canvas, this.theme);
      }
    }
  }

  cleanup() {
    if (typeof this._unbindFx === 'function') {
      this._unbindFx();
    }
    this._unbindFx = null;
    this.effects.length = 0;
  }

  _handleFxCue(payload = {}) {
    if (!payload || !payload.effectId) {
      return;
    }

    const screenVariant = this.screenEffects?.effectMap
      ? this.screenEffects.effectMap[payload.effectId]
      : null;

    switch (payload.effectId) {
      case 'caseFileOverlayReveal':
        this._spawnCaseObjectiveEffect({ ...payload, effectId: 'caseObjectivePulse' });
        break;
      case 'caseFileOverlayDismiss':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'questLogOverlayReveal':
      case 'questLogTabPulse':
      case 'questLogOverlayDismiss':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'questLogQuestSelected':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'detectiveVisionActivation':
        this._spawnActivationEffect(payload);
        break;
      case 'detectiveVisionDeactivate':
      case 'detectiveVisionDeactivation':
        this._spawnDeactivationEffect(payload);
        break;
      case 'questMilestonePulse':
      case 'questUpdatePulse':
        this._spawnQuestMilestoneEffect(payload);
        break;
      case 'questCompleteBurst':
        this._spawnQuestCompleteEffect(payload);
        break;
      case 'forensicPulse':
      case 'forensicScanWave':
        this._spawnForensicPulseEffect(payload);
        break;
      case 'forensicRevealFlash':
        this._spawnForensicRevealEffect(payload);
        break;
      case 'dialogueStartPulse':
      case 'dialogueIntroPulse':
        this._spawnDialogueStartEffect(payload);
        break;
      case 'dialogueOverlayReveal':
        this._spawnDialogueStartEffect({ ...payload, effectId: 'dialogueStartPulse' });
        break;
      case 'dialogueOverlayDismiss':
        this._spawnDialogueCompleteEffect({ ...payload, effectId: 'dialogueCompleteBurst' });
        break;
      case 'dialogueBeatPulse':
      case 'dialogueChoicePulse':
        this._spawnDialogueBeatEffect(payload);
        break;
      case 'dialogueOverlayChoiceFocus':
        this._spawnDialogueBeatEffect({ ...payload, effectId: 'dialogueBeatPulse' });
        break;
      case 'dialogueCompleteBurst':
        this._spawnDialogueCompleteEffect(payload);
        break;
      case 'caseEvidencePulse':
      case 'caseCluePulse':
        this._spawnCaseProgressEffect(payload);
        break;
      case 'caseObjectivePulse':
        this._spawnCaseObjectiveEffect(payload);
        break;
      case 'inventoryOverlayReveal':
        this._spawnCaseObjectiveEffect({ ...payload, effectId: 'caseObjectivePulse' });
        break;
      case 'inventoryOverlayDismiss':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'inventoryItemFocus':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseEvidencePulse' });
        break;
      case 'disguiseOverlayReveal':
        this._spawnCaseObjectiveEffect({ ...payload, effectId: 'caseObjectivePulse' });
        break;
      case 'disguiseOverlayDismiss':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'disguiseSelectionFocus':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseEvidencePulse' });
        break;
      case 'disguiseEquipIntent':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'disguiseUnequipIntent':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'tutorialOverlayReveal':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'tutorialOverlayDismiss':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'tutorialStepStarted':
        this._spawnCaseObjectiveEffect({ ...payload, effectId: 'caseObjectivePulse' });
        break;
      case 'tutorialStepCompleted':
        this._spawnQuestCompleteEffect({ ...payload, effectId: 'questCompleteBurst' });
        break;
      case 'caseSolvedBurst':
        this._spawnCaseSolvedEffect(payload);
        break;
      case 'interactionPromptReveal':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'interactionPromptUpdate':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseEvidencePulse' });
        break;
      case 'interactionPromptDismiss':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'movementIndicatorPulse':
        this._spawnForensicPulseEffect({ ...payload, effectId: 'forensicPulse' });
        break;
      case 'objectiveListRefresh':
        this._spawnCaseObjectiveEffect({ ...payload, effectId: 'caseObjectivePulse' });
        break;
      case 'objectiveListCompletion':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'objectiveListScroll':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'crossroadsBranchLandingReveal':
      case 'crossroadsBranchLandingUpdate':
        this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        break;
      case 'crossroadsBranchLandingDismiss':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'questNotificationDisplay': {
        const type = payload?.context?.type;
        if (type === 'completed') {
          this._spawnQuestCompleteEffect({ ...payload, effectId: 'questCompleteBurst' });
        } else if (type === 'failed') {
          this._spawnDeactivationEffect({ ...payload, effectId: 'detectiveVisionDeactivate' });
        } else {
          this._spawnQuestMilestoneEffect({ ...payload, effectId: 'questMilestonePulse' });
        }
        break;
      }
      case 'questNotificationDismiss':
      case 'questNotificationClear':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseCluePulse' });
        break;
      case 'questNotificationQueued':
        this._spawnCaseProgressEffect({ ...payload, effectId: 'caseEvidencePulse' });
        break;
      default:
        break;
    }

    this._spawnScreenEffect(screenVariant, payload);
  }

  _enqueueEffect(effect) {
    if (!effect) {
      return;
    }
    if (this.effects.length >= this.maxConcurrentEffects) {
      this.effects.shift();
    }
    this.effects.push(effect);
  }

  _spawnActivationEffect(payload) {
    const duration = Math.max(0.18, Number(payload.duration) || this.theme.activationDuration);
    this._enqueueEffect({
      id: 'detectiveVisionActivation',
      elapsed: 0,
      duration,
      render: this._renderActivation.bind(this),
    });
  }

  _spawnDeactivationEffect(payload) {
    const duration = Math.max(0.16, Number(payload.cooldown) ? Math.min(Number(payload.cooldown), 1) : this.theme.deactivateDuration);
    this._enqueueEffect({
      id: 'detectiveVisionDeactivate',
      elapsed: 0,
      duration,
      render: this._renderDeactivation.bind(this),
    });
  }

  _spawnQuestMilestoneEffect(payload) {
    const duration = Math.max(0.3, Number(payload.duration) || this.theme.questPulseDuration);
    this._enqueueEffect({
      id: 'questMilestonePulse',
      elapsed: 0,
      duration,
      render: this._renderQuestMilestone.bind(this),
    });
  }

  _spawnQuestCompleteEffect(payload) {
    const duration = Math.max(0.4, Number(payload.duration) || this.theme.questCompleteDuration);
    this._enqueueEffect({
      id: 'questCompleteBurst',
      elapsed: 0,
      duration,
      render: this._renderQuestComplete.bind(this),
    });
  }

  _spawnForensicPulseEffect(payload) {
    const duration = Math.max(0.25, Number(payload.duration) || this.theme.forensicPulseDuration);
    this._enqueueEffect({
      id: 'forensicPulse',
      elapsed: 0,
      duration,
      render: this._renderForensicPulse.bind(this),
    });
  }

  _spawnForensicRevealEffect(payload) {
    const duration = Math.max(0.3, Number(payload.duration) || this.theme.forensicRevealDuration);
    this._enqueueEffect({
      id: 'forensicRevealFlash',
      elapsed: 0,
      duration,
      render: this._renderForensicReveal.bind(this),
    });
  }

  _spawnDialogueStartEffect(payload) {
    const duration = Math.max(0.25, Number(payload.duration) || 0.6);
    this._enqueueEffect({
      id: 'dialogueStartPulse',
      elapsed: 0,
      duration,
      render: this._renderDialogueStart.bind(this),
    });
  }

  _spawnDialogueBeatEffect(payload) {
    const id = payload.effectId === 'dialogueChoicePulse' ? 'dialogueChoicePulse' : 'dialogueBeatPulse';
    const duration = Math.max(0.2, Number(payload.duration) || 0.5);
    this._enqueueEffect({
      id,
      variant: id,
      elapsed: 0,
      duration,
      render: this._renderDialogueBeat.bind(this),
    });
  }

  _spawnDialogueCompleteEffect(payload) {
    const duration = Math.max(0.35, Number(payload.duration) || 0.9);
    this._enqueueEffect({
      id: 'dialogueCompleteBurst',
      elapsed: 0,
      duration,
      render: this._renderDialogueComplete.bind(this),
    });
  }

  _spawnCaseProgressEffect(payload) {
    const variant = payload.effectId === 'caseCluePulse' ? 'caseCluePulse' : 'caseEvidencePulse';
    const duration = Math.max(0.25, Number(payload.duration) || 0.55);
    this._enqueueEffect({
      id: variant,
      variant,
      elapsed: 0,
      duration,
      render: this._renderCaseProgress.bind(this),
    });
  }

  _spawnCaseObjectiveEffect(payload) {
    const duration = Math.max(0.3, Number(payload.duration) || 0.65);
    this._enqueueEffect({
      id: 'caseObjectivePulse',
      variant: 'caseObjectivePulse',
      elapsed: 0,
      duration,
      render: this._renderCaseProgress.bind(this),
    });
  }

  _spawnCaseSolvedEffect(payload) {
    const duration = Math.max(0.45, Number(payload.duration) || 1.05);
    this._enqueueEffect({
      id: 'caseSolvedBurst',
      elapsed: 0,
      duration,
      render: this._renderCaseSolved.bind(this),
    });
  }

  _spawnScreenEffect(variant, payload = {}) {
    if (!variant || !this.screenEffects?.enabled) {
      return;
    }

    const config = this.screenEffects.frames?.[variant];
    if (!config) {
      return;
    }

    this._ensureScreenEffectImage();

    const effectId = `screen-${variant}`;
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      if (this.effects[i]?.id === effectId) {
        this.effects.splice(i, 1);
      }
    }

    const requestedDuration = Number(payload.duration);
    const duration = Math.max(
      0.2,
      Number.isFinite(requestedDuration) && requestedDuration > 0
        ? requestedDuration
        : Number(config.duration) || Number(this.theme.questPulseDuration) || 0.5
    );

    this._enqueueEffect({
      id: effectId,
      variant,
      elapsed: 0,
      duration,
      render: this._renderScreenEffect.bind(this),
    });
  }

  _renderActivation(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.2);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const rimThickness = Math.max(4, maxRadius * 0.015);

    ctx.save();
    ctx.globalAlpha = eased;

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0, maxRadius * 0.15 * progress), cx, cy, maxRadius);
    gradient.addColorStop(0, theme.activationInner);
    gradient.addColorStop(0.6, theme.activationOuter);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = theme.activationRim;
    ctx.lineWidth = rimThickness;
    ctx.globalAlpha = eased * 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(canvas.width, canvas.height), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _renderDialogueStart(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.4);
    const bandHeight = canvas.height * 0.32;

    ctx.save();
    ctx.globalAlpha = Math.max(0, eased);

    const gradient = ctx.createLinearGradient(0, 0, 0, bandHeight);
    gradient.addColorStop(0, theme.dialogueStartTop);
    gradient.addColorStop(1, theme.dialogueStartBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, bandHeight);
    ctx.restore();
  }

  _renderDialogueBeat(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.6);
    const radiusBase = Math.min(canvas.width, canvas.height) * 0.25;
    const radius = radiusBase * (0.6 + 0.5 * (1 - eased));
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.3;

    ctx.save();
    ctx.globalAlpha = Math.max(0, eased);

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0, radius * 0.1), cx, cy, radius);

    if (effect.variant === 'dialogueChoicePulse') {
      gradient.addColorStop(0, theme.dialogueChoiceAccent);
      gradient.addColorStop(0.7, theme.dialogueBeatInner);
    } else {
      gradient.addColorStop(0, theme.dialogueBeatInner);
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    }
    gradient.addColorStop(1, theme.dialogueBeatOuter);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderDialogueComplete(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.2);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.sqrt(cx * cx + cy * cy);

    ctx.save();
    ctx.globalAlpha = Math.max(0, eased);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, theme.dialogueCompleteInner);
    gradient.addColorStop(0.55, theme.dialogueCompleteOuter);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  _renderCaseProgress(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.5);
    let cx = canvas.width * 0.25;
    let cy = canvas.height * 0.82;
    let inner = theme.caseEvidenceInner;
    let outer = theme.caseEvidenceOuter;

    if (effect.variant === 'caseCluePulse') {
      cx = canvas.width * 0.75;
      inner = theme.caseClueInner;
      outer = theme.caseClueOuter;
    } else if (effect.variant === 'caseObjectivePulse') {
      cx = canvas.width * 0.5;
      cy = canvas.height * 0.88;
      inner = theme.caseObjectiveInner;
      outer = theme.caseObjectiveOuter;
    }

    const radius = Math.min(canvas.width, canvas.height) * 0.22;

    ctx.save();
    ctx.globalAlpha = Math.max(0, eased);

    const gradient = ctx.createRadialGradient(cx, cy, Math.max(0, radius * 0.2), cx, cy, radius);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.8, outer);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderCaseSolved(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.1);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.sqrt(cx * cx + cy * cy);

    ctx.save();
    ctx.globalAlpha = Math.max(0, eased);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, theme.caseSolvedInner);
    gradient.addColorStop(0.6, theme.caseSolvedOuter);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  _renderDeactivation(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const fade = Math.pow(1 - progress, 1.5);
    const rimFade = fade * 0.9;

    ctx.save();
    ctx.globalAlpha = fade;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme.deactivateColor);
    gradient.addColorStop(1, theme.deactivateOuter);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rimThickness = Math.max(6, Math.min(canvas.width, canvas.height) * 0.02);
    ctx.strokeStyle = theme.deactivateRimColor;
    ctx.globalAlpha = rimFade;
    ctx.lineWidth = rimThickness;
    ctx.strokeRect(
      rimThickness / 2,
      rimThickness / 2,
      canvas.width - rimThickness,
      canvas.height - rimThickness
    );
    ctx.restore();
  }

  _renderScreenEffect(ctx, effect, canvas) {
    if (!this.screenEffects?.enabled || !this.screenEffects.imageLoaded) {
      return;
    }

    const frameRect = this.screenEffects.frameRects.get(effect.variant);
    if (!frameRect) {
      return;
    }

    const frameConfig = this.screenEffects.frames?.[effect.variant] || {};
    const progress = Math.min(1, effect.elapsed / Math.max(effect.duration, 0.0001));
    const falloffPower = Number(frameConfig.falloffPower) || 1.4;
    const eased = Math.pow(Math.max(0, 1 - progress), falloffPower);
    const baseAlpha = Math.min(Math.max(Number(frameConfig.baseAlpha) || 0.6, 0), 1);
    const alpha = baseAlpha * eased;
    if (alpha <= 0.01) {
      return;
    }

    const jitterFactor = Math.max(0, Number(frameConfig.jitter) || 0);
    const offsetX = jitterFactor
      ? (Math.random() * 2 - 1) * canvas.width * jitterFactor
      : 0;
    const offsetY = jitterFactor
      ? (Math.random() * 2 - 1) * canvas.height * jitterFactor
      : 0;

    ctx.save();
    const previousComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      this.screenEffects.image,
      frameRect.sx,
      frameRect.sy,
      frameRect.sw,
      frameRect.sh,
      offsetX,
      offsetY,
      canvas.width,
      canvas.height
    );
    ctx.globalCompositeOperation = previousComposite;
    ctx.restore();
  }

  _renderQuestMilestone(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const intensity = Math.pow(1 - progress, 1.4);
    const bandHeight = Math.max(canvas.height * 0.28 * intensity, 40);

    ctx.save();
    ctx.globalAlpha = intensity;

    const gradient = ctx.createLinearGradient(0, 0, 0, bandHeight);
    gradient.addColorStop(0, theme.questPulseTop);
    gradient.addColorStop(1, theme.questPulseBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, bandHeight);

    ctx.strokeStyle = theme.questPulseRim;
    ctx.lineWidth = Math.max(3, bandHeight * 0.12);
    ctx.globalAlpha = intensity * 0.85;
    ctx.beginPath();
    ctx.moveTo(0, bandHeight);
    ctx.lineTo(canvas.width, bandHeight);
    ctx.stroke();
    ctx.restore();
  }

  _renderQuestComplete(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = 1 - Math.pow(progress, 1.3);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.max(canvas.width, canvas.height) * 0.6;

    ctx.save();
    ctx.globalAlpha = eased;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    gradient.addColorStop(0, theme.questCompleteInner);
    gradient.addColorStop(1, theme.questCompleteOuter);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rayCount = 12;
    ctx.strokeStyle = theme.questCompleteRays;
    ctx.lineWidth = Math.max(2, maxRadius * 0.015);
    ctx.globalAlpha = eased * 0.9;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount;
      const length = maxRadius * (0.65 + 0.35 * Math.sin(i * 1.37));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (maxRadius * 0.2), cy + Math.sin(angle) * (maxRadius * 0.2));
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderForensicPulse(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const fade = 1 - progress;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.15;
    const radius = baseRadius + baseRadius * progress * 2.5;

    ctx.save();
    ctx.globalAlpha = fade;

    const gradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.25, cx, cy, radius);
    gradient.addColorStop(0, theme.forensicPulseInner);
    gradient.addColorStop(1, theme.forensicPulseOuter);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.forensicPulseInner;
    ctx.lineWidth = Math.max(2, radius * 0.05);
    ctx.globalAlpha = fade * 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _renderForensicReveal(ctx, effect, canvas, theme) {
    const progress = Math.min(1, effect.elapsed / effect.duration);
    const eased = Math.pow(1 - progress, 1.1);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const outer = Math.max(canvas.width, canvas.height) * 0.45;

    ctx.save();
    ctx.globalAlpha = eased;

    ctx.strokeStyle = theme.forensicRevealRim;
    ctx.lineWidth = Math.max(4, outer * 0.02);
    ctx.beginPath();
    ctx.arc(cx, cy, outer * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = theme.forensicRevealColor;
    ctx.globalAlpha = eased * 0.8;
    ctx.fillRect(0, cy - 1, canvas.width, 2);
    ctx.fillRect(cx - 1, 0, 2, canvas.height);
    ctx.restore();
  }

  _ensureScreenEffectImage() {
    const config = this.screenEffects;
    if (!config?.enabled || config.imageLoaded || config.loading) {
      return;
    }

    const handleFailure = () => {
      config.loading = false;
      config.enabled = false;
    };

    if (config.loader && typeof config.loader.loadImage === 'function' && config.imagePath) {
      config.loading = true;
      config.loader.loadImage(config.imagePath)
        .then((image) => {
          this._setScreenEffectImage(image);
        })
        .catch((error) => {
          console.warn('[FxOverlay] Screen effect image load failed:', error?.message || error);
          handleFailure();
        });
      return;
    }

    if (typeof Image === 'function' && config.imagePath) {
      config.loading = true;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        this._setScreenEffectImage(image);
      };
      image.onerror = () => {
        handleFailure();
      };
      image.src = config.imagePath;
      return;
    }

    handleFailure();
  }

  _setScreenEffectImage(image) {
    if (!image) {
      this.screenEffects.enabled = false;
      this.screenEffects.loading = false;
      return;
    }
    this.screenEffects.image = image;
    this.screenEffects.imageLoaded = true;
    this.screenEffects.loading = false;
    this._computeScreenEffectFrameRects();
  }

  _computeScreenEffectFrameRects() {
    const config = this.screenEffects;
    if (!config || !config.imageLoaded || !config.image) {
      return;
    }

    const width = Number(config.image.width) || 0;
    const height = Number(config.image.height) || 0;
    if (!width || !height) {
      config.frameRects.clear();
      return;
    }

    const frameCount = Math.max(1, Number(config.frameCount) || 1);
    const rects = config.frameRects;
    rects.clear();

    const frameEntries = Object.entries(config.frames || {});
    if (config.orientation === 'horizontal') {
      const frameWidth = width / frameCount;
      for (let i = 0; i < frameEntries.length; i += 1) {
        const [key, frame] = frameEntries[i];
        const index = Math.min(frameCount - 1, Math.max(0, Number(frame.index) || 0));
        rects.set(key, {
          sx: frameWidth * index,
          sy: 0,
          sw: frameWidth,
          sh: height,
        });
      }
      return;
    }

    const frameHeight = height / frameCount;
    for (let i = 0; i < frameEntries.length; i += 1) {
      const [key, frame] = frameEntries[i];
      const index = Math.min(frameCount - 1, Math.max(0, Number(frame.index) || 0));
      rects.set(key, {
        sx: 0,
        sy: frameHeight * index,
        sw: width,
        sh: frameHeight,
      });
    }
  }
}
