/**
 * SuspicionMoodMapper
 *
 * Translates disguise suspicion, alert flags, and combat engagement state
 * into adaptive music mood suggestions. Designed to keep thresholds data-driven
 * so narrative teams can tune stealth tension pacing without touching emitters.
 */
export class SuspicionMoodMapper {
  /**
   * @param {object} [options]
   * @param {string} [options.defaultMood='ambient'] - Fallback mood when calm.
   * @param {object} [options.thresholds] - Suspicion thresholds for each mood.
   * @param {number} [options.thresholds.stealth=6] - Suspicion required for stealth tension.
   * @param {number} [options.thresholds.alert=25] - Suspicion required for alert escalations.
    * @param {number} [options.thresholds.combat=60] - Suspicion required for full combat escalation.
   * @param {number} [options.thresholds.calm=4] - Suspicion considered calm enough to reset.
   * @param {number} [options.scramblerGraceSeconds=5] - Optional duration to keep stealth mood after scrambler ends.
   * @param {string} [options.source='suspicion-mapper'] - Telemetry source tag.
   */
  constructor(options = {}) {
    const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) };
    this._thresholds = normalizeThresholds(thresholds);

    this.defaultMood = typeof options.defaultMood === 'string' && options.defaultMood.trim()
      ? options.defaultMood.trim()
      : 'ambient';
    this.source = typeof options.source === 'string' && options.source.trim()
      ? options.source.trim()
      : 'suspicion-mapper';
    this.scramblerGraceSeconds = Number.isFinite(options.scramblerGraceSeconds)
      ? Math.max(0, options.scramblerGraceSeconds)
      : DEFAULT_SCRAMBLER_GRACE_SECONDS;

    this._lastMood = this.defaultMood;
    this._lastSnapshot = {
      suspicion: 0,
      scramblerActive: false,
      alertActive: false,
      combatEngaged: false,
    };
    this._scramblerTailExpiry = 0;
  }

  /**
   * Update thresholds at runtime (e.g., faction-specific tuning).
   * @param {object} overrides
   */
  setThresholds(overrides = {}) {
    this._thresholds = normalizeThresholds({
      ...this._thresholds,
      ...(overrides || {}),
    });
  }

  /**
   * Map snapshot -> adaptive mood instruction.
   * @param {object} snapshot
   * @param {number} [snapshot.suspicion=0]
   * @param {boolean} [snapshot.alertActive=false]
   * @param {boolean} [snapshot.combatEngaged=false]
   * @param {boolean} [snapshot.scramblerActive=false]
   * @param {string} [snapshot.moodHint]
   * @param {number} [snapshot.timestamp=Date.now()]
   * @returns {{ mood: string, options: object }}
   */
  mapState(snapshot = {}) {
    const now = Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : Date.now();
    const suspicion = clampNumber(snapshot.suspicion, 0, 100);
    const combatEngaged = Boolean(snapshot.combatEngaged);
    const alertActive = Boolean(snapshot.alertActive);
    const scramblerActive = Boolean(snapshot.scramblerActive);
    const moodHint = typeof snapshot.moodHint === 'string' ? snapshot.moodHint.trim() : '';

    if (scramblerActive) {
      this._scramblerTailExpiry = now + this.scramblerGraceSeconds * 1000;
    } else if (now > this._scramblerTailExpiry) {
      this._scramblerTailExpiry = 0;
    }

    let mood = this.defaultMood;
    let force = false;
    let priority = 'calm';

    if (moodHint) {
      mood = moodHint;
      force = true;
      priority = 'hint';
    } else if (combatEngaged || suspicion >= this._thresholds.combat) {
      mood = 'combat';
      priority = 'combat';
    } else if (alertActive || suspicion >= this._thresholds.alert) {
      mood = 'alert';
      priority = 'alert';
    } else if (
      suspicion >= this._thresholds.stealth ||
      scramblerActive ||
      (this._scramblerTailExpiry > now && suspicion >= this._thresholds.calm)
    ) {
      mood = 'stealth';
      priority = scramblerActive ? 'scrambler' : 'stealth';
    }

    // Apply calm fallback when suspicion is low enough and no flags active.
    if (mood === 'alert' && suspicion <= this._thresholds.stealth && !alertActive) {
      mood = this.defaultMood;
      priority = 'calm';
    }
    if (mood === 'stealth' && suspicion <= this._thresholds.calm && !scramblerActive && now > this._scramblerTailExpiry) {
      mood = this.defaultMood;
      priority = 'calm';
    }

    this._lastMood = mood;
    this._lastSnapshot = {
      suspicion,
      scramblerActive,
      alertActive,
      combatEngaged,
    };

    return {
      mood,
      options: {
        force,
        priority,
        source: this.source,
        metadata: {
          suspicion,
          alertActive,
          combatEngaged,
          scramblerActive,
          moodHint: moodHint || null,
        },
      },
    };
  }

  /**
   * @returns {object} Copy of current thresholds
   */
  getThresholds() {
    return { ...this._thresholds };
  }
}

const DEFAULT_THRESHOLDS = Object.freeze({
  stealth: 6,
  alert: 24,
  combat: 60,
  calm: 4,
});

const DEFAULT_SCRAMBLER_GRACE_SECONDS = 4;

function normalizeThresholds(thresholds) {
  const result = { ...DEFAULT_THRESHOLDS };
  for (const key of Object.keys(DEFAULT_THRESHOLDS)) {
    if (Number.isFinite(thresholds[key])) {
      result[key] = thresholds[key];
    }
  }
  return result;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

