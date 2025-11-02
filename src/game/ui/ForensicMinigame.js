import { FingerprintMatching } from '../minigames/FingerprintMatching.js';
import { emitOverlayVisibility } from './helpers/overlayEvents.js';

const HEADER_HEIGHT = 56;
const PADDING = 20;

export class ForensicMinigame {
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.visible = false;
    this.activeMode = null;
    this.currentContext = {};
    this.candidateRects = [];
    this.resultState = null;

    this.eventBus = options.eventBus ?? null;
    this.fingerprintGame = new FingerprintMatching({
      eventBus: this.eventBus,
      onResult: (result) => this._applyResult(result),
      defaultTimeLimit: options.defaultTimeLimit,
      timePenaltySeconds: options.timePenaltySeconds,
    });
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus ?? null;
    this.fingerprintGame.eventBus = this.eventBus;
  }

  openFingerprintPuzzle(puzzle, context = {}) {
    this.fingerprintGame.loadPuzzle(puzzle);
    this.activeMode = 'fingerprint';
    this.currentContext = { ...context };
    this.resultState = null;
    this._setVisible(true, 'openFingerprint');
    this._emit('forensic:minigame_opened', { type: 'fingerprint', puzzleId: this.fingerprintGame.puzzleId, context: this.currentContext });
  }

  close(source = 'close') {
    if (!this.visible) return;
    this._setVisible(false, source);
    this.fingerprintGame.reset();
    this.activeMode = null;
    this.currentContext = {};
    this.resultState = null;
    this.candidateRects = [];
  }

  update(deltaSeconds) {
    if (!this.visible) return;
    if (this.activeMode === 'fingerprint') {
      this.fingerprintGame.update(deltaSeconds);
    }
  }

  render(ctx) {
    if (!this.visible) return;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.activeMode === 'fingerprint') {
      const state = this.fingerprintGame.getState();
      this._renderHeader(ctx, state);
      this._renderFingerprint(ctx, state);
      this._renderCandidates(ctx, state);
      if (this.resultState) {
        const width = this.width * 0.5;
        const height = 48;
        const x = (this.width - width) / 2;
        const y = HEADER_HEIGHT + PADDING;
        ctx.fillStyle = this.resultState.success
          ? 'rgba(40, 126, 98, 0.9)'
          : 'rgba(166, 52, 70, 0.9)';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = this.resultState.success ? '#94f7d7' : '#f7a8b4';
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.resultState.message, x + width / 2, y + 30);
      }
    }

    ctx.restore();
  }

  onMouseMove(x, y) {
    if (!this.visible || this.activeMode !== 'fingerprint') return;
    const hoverIndex = this._candidateIndexAt(x, y);
    this.fingerprintGame.setHoveredCandidate(hoverIndex);
  }

  onMouseUp(x, y) {
    if (!this.visible || this.activeMode !== 'fingerprint') return;
    const index = this._candidateIndexAt(x, y);
    if (index !== -1) this.fingerprintGame.selectCandidate(index);
  }

  onKeyDown(key) {
    if (!this.visible) return;
    if (key === 'Escape') this.close('escape');
  }

  _setVisible(visible, source) {
    const desired = Boolean(visible);
    if (this.visible === desired) return;
    this.visible = desired;
    emitOverlayVisibility(this.eventBus, 'forensicMinigame', this.visible, {
      source,
      type: this.activeMode,
      context: this.currentContext,
    });
  }

  _applyResult(result) {
    const success = Boolean(result?.success);
    this.resultState = { message: success ? 'Fingerprint match confirmed.' : this._failureMessage(result), success };
    this._emit('forensic:minigame_ui_feedback', { type: 'fingerprint', result, context: { ...this.currentContext } });
  }

  _renderHeader(ctx, state) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 28, 44, 0.95)';
    ctx.fillRect(0, 0, this.width, HEADER_HEIGHT);

    ctx.fillStyle = '#79c3ff';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Forensic Console — Fingerprint Matching', PADDING, 38);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px "Segoe UI", sans-serif';
    const limit = state.timeLimitSeconds;
    if (limit === null) ctx.fillText('No Time Limit', this.width - PADDING, 36);
    else {
      const safe = Math.max(0, state.remainingSeconds ?? limit);
      ctx.fillText(
        `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(Math.floor(safe % 60)).padStart(2, '0')}`,
        this.width - PADDING,
        36,
      );
    }
    ctx.restore();
  }

  _renderFingerprint(ctx, state) {
    const x = PADDING;
    const y = HEADER_HEIGHT + PADDING;
    const width = Math.floor(this.width * 0.45);
    const height = this.height - y - PADDING;

    ctx.save();
    ctx.fillStyle = 'rgba(16, 24, 36, 0.92)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(120, 150, 255, 0.35)';
    ctx.strokeRect(x, y, width, height);

    const highlight = this._activeFeatureIds(state);
    const scale = Math.min(width, height) * 0.8;
    const originX = x + width / 2;
    const originY = y + height / 2;

    ctx.lineCap = 'round';
    for (const feature of state.partialPattern) {
      const points = Array.isArray(feature.points) ? feature.points : [];
      if (points.length < 2) continue;
      ctx.beginPath();
      const first = points[0];
      ctx.moveTo(
        originX + (first.x ?? first[0] ?? 0) * scale,
        originY + (first.y ?? first[1] ?? 0) * scale,
      );
      for (let i = 1; i < points.length; i += 1) {
        const point = points[i];
        ctx.lineTo(
          originX + (point.x ?? point[0] ?? 0) * scale,
          originY + (point.y ?? point[1] ?? 0) * scale,
        );
      }
      const active = highlight.has(feature.id);
      ctx.strokeStyle = active ? '#7dffd5' : '#3c5470';
      ctx.lineWidth = active ? 3 : 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderCandidates(ctx, state) {
    const panelX = Math.floor(this.width * 0.47) + PADDING;
    const panelY = HEADER_HEIGHT + PADDING;
    const panelWidth = this.width - panelX - PADDING;
    const panelHeight = this.height - panelY - PADDING;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 20, 32, 0.92)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = 'rgba(120, 150, 255, 0.35)';
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    const itemHeight = 88;
    const gap = 10;
    const startX = panelX + 14;
    const startY = panelY + 14;

    this.candidateRects = [];
    state.candidates.forEach((candidate, index) => {
      const rect = {
        x: startX,
        y: startY + index * (itemHeight + gap),
        width: panelWidth - 28,
        height: itemHeight,
      };
      this.candidateRects.push(rect);
      this._renderCandidate(ctx, candidate, rect, state);
    });

    ctx.restore();
  }

  _renderCandidate(ctx, candidate, rect, state) {
    const hovered = state.hoveredCandidateIndex === candidate.index;
    const selected = state.selectedCandidateIndex === candidate.index;
    const success = state.attempts.some(
      (attempt) => attempt.candidateIndex === candidate.index && attempt.success,
    );

    ctx.save();
    ctx.fillStyle = success
      ? 'rgba(36, 110, 84, 0.85)'
      : hovered || selected
        ? 'rgba(42, 58, 88, 0.95)'
        : 'rgba(24, 36, 54, 0.82)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = success ? 'rgba(126, 229, 199, 0.9)' : 'rgba(120, 156, 241, 0.6)';
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText(candidate.label, rect.x + 14, rect.y + 30);
    ctx.fillStyle = '#6fe1bb';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText(
      `${Math.round(candidate.matchScore * 100)}% ridge confidence`,
      rect.x + 14,
      rect.y + 54,
    );
    ctx.restore();
  }

  _candidateIndexAt(x, y) {
    for (let i = 0; i < this.candidateRects.length; i += 1) {
      const rect = this.candidateRects[i];
      if (
        rect &&
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
      ) {
        return i;
      }
    }
    return -1;
  }

  _activeFeatureIds(state) {
    const result = new Set();
    const hovered = state.candidates[state.hoveredCandidateIndex];
    if (hovered) {
      hovered.matchedFeatureIds.forEach((id) => result.add(id));
      return result;
    }
    for (const attempt of state.attempts) {
      if (!attempt.success) continue;
      const candidate = state.candidates[attempt.candidateIndex];
      candidate?.matchedFeatureIds.forEach((id) => result.add(id));
    }
    return result;
  }

  _failureMessage(result) {
    if (!result) return 'No match found.';
    if (result.reason === 'timeout') return 'Analysis timed out.';
    if (result.reason === 'exhausted_attempts') return 'All candidates exhausted.';
    return 'Fingerprint mismatch.';
  }

  _emit(event, payload) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') return;
    this.eventBus.emit(event, payload);
  }
}
