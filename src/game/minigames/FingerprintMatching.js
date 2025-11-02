import { FingerprintDefaults, normalizePuzzle } from './fingerprintPuzzleUtils.js';

const {
  DEFAULT_TIME_LIMIT_SECONDS,
  MINIMUM_TIME_LIMIT_SECONDS,
  MINIMUM_DIFFICULTY,
} = FingerprintDefaults;

/**
 * Logic controller for the fingerprint matching minigame.
 */
export class FingerprintMatching {
  /**
   * @param {Object} [options]
   * @param {Object} [options.eventBus]
   * @param {Function} [options.onResult]
   * @param {number} [options.defaultTimeLimit=90]
   * @param {number} [options.timePenaltySeconds=10]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus ?? null;
    this.onResult = typeof options.onResult === 'function' ? options.onResult : null;
    this.defaultTimeLimit = Number.isFinite(options.defaultTimeLimit)
      ? Math.max(MINIMUM_TIME_LIMIT_SECONDS, options.defaultTimeLimit)
      : DEFAULT_TIME_LIMIT_SECONDS;
    this.timePenaltySeconds = Number.isFinite(options.timePenaltySeconds)
      ? Math.max(0, options.timePenaltySeconds)
      : 10;

    this.reset();
  }

  /**
   * Reset state to idle.
   */
  reset() {
    this.state = 'idle'; // idle | active | success | failure
    this.puzzleId = null;
    this.difficulty = MINIMUM_DIFFICULTY;
    this.partialPattern = [];
    this.candidates = [];
    this.allowRetries = true;
    this.timeLimitSeconds = null;
    this.remainingSeconds = null;
    this.elapsedSeconds = 0;
    this.hoveredCandidateIndex = -1;
    this.selectedCandidateIndex = -1;
    this.attempts = [];
    this.result = null;
    this.metadata = {};
  }

  /**
   * Load puzzle and enter active play state.
   * @param {Object} rawPuzzle
   */
  loadPuzzle(rawPuzzle) {
    const puzzle = normalizePuzzle(rawPuzzle, {
      defaultTimeLimit: this.defaultTimeLimit,
    });

    this.puzzleId = puzzle.id;
    this.difficulty = puzzle.difficulty;
    this.partialPattern = puzzle.partialPattern;
    this.candidates = puzzle.candidates;
    this.allowRetries = puzzle.allowRetries;
    this.timeLimitSeconds = puzzle.timeLimitSeconds;
    this.remainingSeconds = puzzle.timeLimitSeconds;
    this.elapsedSeconds = 0;
    this.hoveredCandidateIndex = -1;
    this.selectedCandidateIndex = -1;
    this.attempts = [];
    this.metadata = puzzle.metadata;
    this.state = 'active';
    this.result = null;
  }

  /**
   * Tick countdown timer.
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    if (this.state !== 'active') return;
    const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    this.elapsedSeconds += delta;

    if (this.timeLimitSeconds === null) return;

    this.remainingSeconds = Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);
    if (this.remainingSeconds === 0) {
      this._complete({
        success: false,
        reason: 'timeout',
        candidateId: null,
        attempts: this.attempts.slice(),
        timeRemaining: 0,
      });
    }
  }

  /**
   * Select candidate index.
   * @param {number} index
   * @returns {Object|null}
   */
  selectCandidate(index) {
    if (this.state !== 'active') return null;
    if (!Number.isInteger(index) || index < 0 || index >= this.candidates.length) {
      return null;
    }

    const candidate = this.candidates[index];
    this.selectedCandidateIndex = index;
    const attempt = this._buildAttempt(candidate, index);
    this.attempts.push(attempt);

    if (attempt.success) {
      this._complete({
        success: true,
        reason: 'match',
        candidateId: candidate.id,
        attempts: this.attempts.slice(),
        matchScore: attempt.matchScore,
        matchedFeatures: attempt.matchedFeatures,
        timeRemaining: this.timeLimitSeconds === null ? null : this.remainingSeconds,
      });
      return this.result;
    }

    if (this.timeLimitSeconds !== null && this.timePenaltySeconds > 0) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - this.timePenaltySeconds);
      this.elapsedSeconds = Math.min(
        this.timeLimitSeconds,
        this.timeLimitSeconds - this.remainingSeconds,
      );
    }

    if (!this.allowRetries || this.remainingSeconds === 0) {
      this._complete({
        success: false,
        reason: this.remainingSeconds === 0 ? 'timeout' : 'exhausted_attempts',
        candidateId: candidate.id,
        attempts: this.attempts.slice(),
        timeRemaining: this.remainingSeconds,
      });
    } else {
      this.selectedCandidateIndex = -1;
    }

    return this.result;
  }

  /**
   * Track hover index (UI helper).
   * @param {number} index
   */
  setHoveredCandidate(index) {
    if (!Number.isInteger(index)) {
      this.hoveredCandidateIndex = -1;
    } else {
      this.hoveredCandidateIndex =
        index >= 0 && index < this.candidates.length ? index : -1;
    }
  }

  /**
   * Snapshot render-ready state.
   * @returns {Object}
   */
  getState() {
    return {
      puzzleId: this.puzzleId,
      state: this.state,
      difficulty: this.difficulty,
      allowRetries: this.allowRetries,
      timeLimitSeconds: this.timeLimitSeconds,
      remainingSeconds: this.timeLimitSeconds === null ? null : this.remainingSeconds,
      elapsedSeconds: this.elapsedSeconds,
      partialPattern: this.partialPattern,
      candidates: this.candidates.map((candidate, idx) => ({
        id: candidate.id,
        label: candidate.label,
        description: candidate.description,
        matchScore: candidate.matchScore,
        matchedFeatureIds: candidate.matchedFeatureIds.slice(),
        falseFeatureIds: candidate.falseFeatureIds.slice(),
        metadata: candidate.metadata,
        isCorrect: candidate.isCorrect,
        locked: candidate.locked,
        selectable: this.state === 'active' && !candidate.locked,
        attempted: this.attempts.some((attempt) => attempt.candidateIndex === idx),
        lastAttemptSuccess: this.attempts.some(
          (attempt) => attempt.candidateIndex === idx && attempt.success,
        ),
        index: idx,
      })),
      hoveredCandidateIndex: this.hoveredCandidateIndex,
      selectedCandidateIndex: this.selectedCandidateIndex,
      attempts: this.attempts.slice(),
      result: this.result ? { ...this.result } : null,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Build attempt summary.
   * @param {Object} candidate
   * @param {number} candidateIndex
   * @returns {Object}
   * @private
   */
  _buildAttempt(candidate, candidateIndex) {
    const totalPartial = Math.max(1, this.partialPattern.length);
    const coverage = candidate.matchedFeatureIds.length / totalPartial;
    return {
      candidateId: candidate.id,
      candidateIndex,
      success: Boolean(candidate.isCorrect),
      matchScore: candidate.matchScore,
      matchedFeatures: candidate.matchedFeatureIds.slice(),
      falseMatches: candidate.falseFeatureIds.slice(),
      coverage,
      timestamp: Date.now(),
    };
  }

  /**
   * Finalize result and emit events.
   * @param {Object} payload
   * @private
   */
  _complete(payload) {
    if (this.state !== 'active') return;
    this.state = payload.success ? 'success' : 'failure';
    this.result = {
      puzzleId: this.puzzleId,
      ...payload,
    };

    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('forensic:minigame_result', this.result);
    }
    if (this.onResult) {
      this.onResult(this.result);
    }
  }
}
