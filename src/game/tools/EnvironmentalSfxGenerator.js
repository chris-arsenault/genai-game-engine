import { createHash } from 'node:crypto';

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 2;
const DEFAULT_DURATION_SECONDS = 20;

const TARGET_PEAK = 0.95;

/**
 * Generate a loopable environmental SFX bed for ambience and diegetic loops.
 * Supports deterministic synthesis for AR-009 assets.
 *
 * @param {object} options
 * @param {
 *   'footsteps-concrete' |
 *   'footsteps-metal' |
 *   'rain-ambience' |
 *   'neon-buzz' |
 *   'distant-city' |
 *   'terminal-hum'
 * } options.type
 * @param {number} [options.durationSeconds=20]
 * @param {number} [options.sampleRate=44100]
 * @param {number} [options.channels=2]
 * @param {string} [options.seed='ar009']
 * @returns {{ buffer: Buffer, metadata: object }}
 */
export function generateEnvironmentalSfx(options) {
  const {
    type,
    durationSeconds = DEFAULT_DURATION_SECONDS,
    sampleRate = DEFAULT_SAMPLE_RATE,
    channels = DEFAULT_CHANNELS,
    seed = 'ar009',
  } = options ?? {};

  validateOptions({ type, durationSeconds, sampleRate, channels });

  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(totalSamples);
  const right = channels === 2 ? new Float32Array(totalSamples) : null;
  const envelope = buildLoopEnvelope(totalSamples);
  const prng = createPrng(`${seed}-${type}`);

  switch (type) {
    case 'footsteps-concrete':
      synthFootsteps({ left, right, sampleRate, prng, surface: 'concrete' });
      break;
    case 'footsteps-metal':
      synthFootsteps({ left, right, sampleRate, prng, surface: 'metal' });
      break;
    case 'rain-ambience':
      synthRain({ left, right, sampleRate, prng });
      break;
    case 'neon-buzz':
      synthNeonBuzz({ left, right, sampleRate, prng });
      break;
    case 'distant-city':
      synthDistantCity({ left, right, sampleRate, prng });
      break;
    case 'terminal-hum':
      synthTerminalHum({ left, right, sampleRate, prng });
      break;
    default:
      throw new Error(`generateEnvironmentalSfx: Unsupported type "${type}"`);
  }

  applyEnvelope(left, envelope);
  if (right) {
    applyEnvelope(right, envelope);
  }

  normalizeBuffer(left, right, TARGET_PEAK);

  const buffer = encodeWav({ left, right, sampleRate });
  const statistics = analyzeWave({ left, right });

  return {
    buffer,
    metadata: {
      type,
      durationSeconds,
      sampleRate,
      channels,
      loopStartSeconds: 0,
      loopEndSeconds: durationSeconds,
      seed: `${seed}-${type}`,
      statistics,
      checksumSha256: createHash('sha256').update(buffer).digest('hex'),
    },
  };
}

function validateOptions({ type, durationSeconds, sampleRate, channels }) {
  const supportedTypes = new Set([
    'footsteps-concrete',
    'footsteps-metal',
    'rain-ambience',
    'neon-buzz',
    'distant-city',
    'terminal-hum',
  ]);
  if (!supportedTypes.has(type)) {
    throw new Error(`generateEnvironmentalSfx: Unsupported type "${type}"`);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('generateEnvironmentalSfx: durationSeconds must be positive');
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('generateEnvironmentalSfx: sampleRate must be positive');
  }
  if (channels !== 1 && channels !== 2) {
    throw new Error('generateEnvironmentalSfx: channels must be 1 or 2 (stereo)');
  }
}

function synthFootsteps({ left, right, sampleRate, prng, surface }) {
  const totalSamples = left.length;
  const ambientDepth = surface === 'metal' ? 0.02 : 0.016;
  let rumble = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    rumble = rumble * 0.975 + (prng() - 0.5) * 0.004;
    const drift = (prng() - 0.5) * ambientDepth;
    const base = rumble * 0.35 + drift;
    left[i] += base;
    if (right) {
      const phase = Math.sin((i / sampleRate) * 0.8);
      right[i] += base * (0.92 + 0.08 * phase);
    }
  }

  const stepDuration = Math.floor(sampleRate * 0.22);
  let cursor = Math.floor(sampleRate * 0.45);
  let stepIndex = 0;
  const hardness = surface === 'metal' ? 0.36 : 0.24;
  const baseFreq = surface === 'metal' ? 180 : 120;

  while (cursor < totalSamples - stepDuration) {
    const stereoPhase = stepIndex * (Math.PI / 2);
    addFootstepEvent({
      left,
      right,
      sampleRate,
      start: cursor,
      duration: stepDuration,
      baseFreq,
      hardness,
      prng,
      metallic: surface === 'metal',
      stereoPhase,
    });
    cursor += Math.floor(sampleRate * (0.48 + prng() * 0.1));
    stepIndex += 1;
  }
}

function addFootstepEvent({
  left,
  right,
  sampleRate,
  start,
  duration,
  baseFreq,
  hardness,
  prng,
  metallic,
  stereoPhase,
}) {
  const totalSamples = left.length;
  const pan = right ? 0.4 * Math.sin(stereoPhase) : 0;
  const jitter = 0.92 + prng() * 0.16;
  for (let i = 0; i < duration; i += 1) {
    const index = start + i;
    if (index >= totalSamples) {
      break;
    }
    const t = i / sampleRate;
    const progress = i / duration;
    const envelope = Math.sin(progress * Math.PI) ** 2;
    let sample =
      envelope *
      (Math.sin(2 * Math.PI * baseFreq * jitter * t) * 0.65 +
        Math.sin(2 * Math.PI * baseFreq * 0.5 * t) * 0.35 +
        (prng() - 0.5) * hardness);

    if (metallic) {
      sample += envelope * 0.4 * Math.sin(2 * Math.PI * baseFreq * 3.5 * t);
    } else {
      sample += envelope * 0.3 * Math.sin(2 * Math.PI * baseFreq * 1.7 * t);
    }

    left[index] += sample * (1 - pan * 0.5);
    if (right) {
      right[index] += sample * (1 + pan);
    }
  }

  if (!metallic) {
    return;
  }

  const tailDuration = Math.floor(sampleRate * 0.16);
  for (let i = 0; i < tailDuration; i += 1) {
    const index = start + duration + i;
    if (index >= totalSamples) {
      break;
    }
    const decay = Math.exp((-5 * i) / tailDuration);
    const ring =
      decay * Math.sin(2 * Math.PI * baseFreq * 5.2 * (i / sampleRate)) * 0.35;
    left[index] += ring * (1 - pan * 0.35);
    if (right) {
      right[index] += ring * (1 + pan * 0.35);
    }
  }
}

function synthRain({ left, right, sampleRate, prng }) {
  const totalSamples = left.length;
  let low = 0;
  let mid = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    low = low * 0.993 + (prng() - 0.5) * 0.01;
    mid = mid * 0.985 + (prng() - 0.5) * 0.04;
    const high = (prng() - 0.5) * 0.05;
    const drizzle = low * 0.35 + mid * 0.45 + high * 0.2;
    left[i] += drizzle;
    if (right) {
      right[i] += drizzle * (0.94 + 0.06 * Math.sin((i / sampleRate) * 0.5));
    }
  }

  const dropCount = Math.floor((totalSamples / sampleRate) * 10);
  const dropDuration = Math.floor(sampleRate * 0.18);
  for (let d = 0; d < dropCount; d += 1) {
    const start = Math.floor(prng() * (totalSamples - dropDuration));
    const pan = right ? 0.6 * (prng() * 2 - 1) : 0;
    for (let i = 0; i < dropDuration; i += 1) {
      const index = start + i;
      if (index >= totalSamples) {
        break;
      }
      const progress = i / dropDuration;
      const envelope = Math.sin(progress * Math.PI) ** 2;
      const sparkle = envelope * Math.sin(2 * Math.PI * 2400 * (i / sampleRate));
      left[index] += sparkle * (1 - 0.5 * pan);
      if (right) {
        right[index] += sparkle * (1 + 0.5 * pan);
      }
    }
  }
}

function synthNeonBuzz({ left, right, sampleRate, prng }) {
  const totalSamples = left.length;
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const flicker = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.7 * t + Math.sin(t * 0.3));
    const base =
      Math.sin(2 * Math.PI * 60 * t) * 0.4 +
      Math.sin(2 * Math.PI * 120 * t + Math.sin(t * 0.5)) * 0.25 +
      Math.sin(2 * Math.PI * 480 * t + Math.sin(t * 1.2)) * 0.12;
    const noise = (prng() - 0.5) * 0.05;
    const sample = base * flicker + noise;
    left[i] += sample;
    if (right) {
      right[i] += sample * (0.96 + 0.04 * Math.sin(2 * Math.PI * 0.12 * t));
    }
  }

  const crackles = Math.floor((totalSamples / sampleRate) * 6);
  const crackleDuration = Math.floor(sampleRate * 0.08);
  for (let c = 0; c < crackles; c += 1) {
    const start = Math.floor(prng() * (totalSamples - crackleDuration));
    const amplitude = 0.4 + prng() * 0.3;
    const pan = right ? (prng() * 2 - 1) * 0.5 : 0;
    for (let i = 0; i < crackleDuration; i += 1) {
      const index = start + i;
      if (index >= totalSamples) {
        break;
      }
      const env = Math.sin((i / crackleDuration) * Math.PI);
      const spark = env * (prng() * 2 - 1) * amplitude;
      left[index] += spark * (1 - 0.5 * pan);
      if (right) {
        right[index] += spark * (1 + 0.5 * pan);
      }
    }
  }
}

function synthDistantCity({ left, right, sampleRate, prng }) {
  const totalSamples = left.length;
  let rumble = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    rumble = rumble * 0.996 + (prng() - 0.5) * 0.006;
    const hiss = (prng() - 0.5) * 0.018;
    const base = rumble * 0.55 + hiss;
    left[i] += base;
    if (right) {
      right[i] += base * (0.9 + 0.1 * Math.sin((i / sampleRate) * 0.2));
    }
  }

  const hornCount = Math.max(2, Math.floor((totalSamples / sampleRate) * 3));
  for (let h = 0; h < hornCount; h += 1) {
    const start = Math.floor(prng() * totalSamples * 0.8);
    const duration = Math.floor(sampleRate * (0.8 + prng() * 1.2));
    const freq = 180 + prng() * 220;
    const pan = right ? (prng() * 2 - 1) * 0.35 : 0;
    addHornEvent({ left, right, start, duration, freq, sampleRate, pan });
  }
}

function addHornEvent({ left, right, start, duration, freq, sampleRate, pan }) {
  const totalSamples = left.length;
  for (let i = 0; i < duration; i += 1) {
    const index = start + i;
    if (index >= totalSamples) {
      break;
    }
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.15));
    const release = Math.min(1, (duration - i) / (sampleRate * 0.25));
    const envelope = Math.sin(Math.PI * attack * release);
    const vibrato = Math.sin(2 * Math.PI * 0.7 * t) * 0.4;
    const sample =
      envelope *
      (Math.sin(2 * Math.PI * freq * t + vibrato) * 0.5 +
        Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.18);
    left[index] += sample * (1 - pan);
    if (right) {
      right[index] += sample * (1 + pan);
    }
  }
}

function synthTerminalHum({ left, right, sampleRate, prng }) {
  const totalSamples = left.length;
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const modulator =
      0.6 + 0.4 * Math.sin(2 * Math.PI * 0.05 * t + Math.sin(2 * Math.PI * 0.19 * t));
    const base =
      Math.sin(2 * Math.PI * 50 * t) * 0.45 +
      Math.sin(2 * Math.PI * 100 * t + Math.sin(t * 0.3)) * 0.25 +
      Math.sin(2 * Math.PI * 200 * t + Math.sin(t * 0.5)) * 0.12;
    const noise = (prng() - 0.5) * 0.015;
    const sample = base * modulator + noise;
    left[i] += sample;
    if (right) {
      right[i] += sample * (0.97 + 0.03 * Math.sin(2 * Math.PI * 0.11 * t));
    }
  }

  const pulses = Math.floor((totalSamples / sampleRate) * 4);
  const pulseDuration = Math.floor(sampleRate * 0.35);
  for (let p = 0; p < pulses; p += 1) {
    const start = Math.floor(prng() * (totalSamples - pulseDuration));
    const pan = right ? (prng() * 2 - 1) * 0.25 : 0;
    for (let i = 0; i < pulseDuration; i += 1) {
      const index = start + i;
      if (index >= totalSamples) {
        break;
      }
      const progress = i / pulseDuration;
      const env = Math.sin(progress * Math.PI) ** 2;
      const glitch = env * (prng() * 2 - 1) * 0.18;
      left[index] += glitch * (1 - 0.5 * pan);
      if (right) {
        right[index] += glitch * (1 + 0.5 * pan);
      }
    }
  }
}

function applyEnvelope(buffer, envelope) {
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] *= envelope[i];
  }
}

function normalizeBuffer(left, right, targetPeak) {
  let peak = 0;
  for (let i = 0; i < left.length; i += 1) {
    peak = Math.max(peak, Math.abs(left[i]));
    if (right) {
      peak = Math.max(peak, Math.abs(right[i]));
    }
  }
  if (peak === 0) {
    return;
  }

  const scale = Math.min((targetPeak || 1) / peak, 5);
  if (Math.abs(scale - 1) < 1e-3) {
    return;
  }

  for (let i = 0; i < left.length; i += 1) {
    left[i] = clamp(left[i] * scale, -1, 1);
    if (right) {
      right[i] = clamp(right[i] * scale, -1, 1);
    }
  }
}

function buildLoopEnvelope(sampleCount) {
  const fadeSamples = Math.max(1, Math.floor(sampleCount * 0.01));
  const envelope = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    let amp = 1;
    if (i < fadeSamples) {
      amp *= Math.sin((i / fadeSamples) * (Math.PI / 2));
    }
    if (i >= sampleCount - fadeSamples) {
      const tail = (sampleCount - i - 1) / fadeSamples;
      amp *= Math.sin(tail * (Math.PI / 2));
    }
    envelope[i] = amp;
  }
  return envelope;
}

function encodeWav({ left, right, sampleRate }) {
  const channels = right ? 2 : 1;
  const totalSamples = left.length;
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(8 * bytesPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.allocUnsafe(dataSize);
  for (let i = 0; i < totalSamples; i += 1) {
    const frameOffset = i * channels * bytesPerSample;
    data.writeInt16LE(floatToInt16(left[i]), frameOffset);
    if (right) {
      data.writeInt16LE(floatToInt16(right[i]), frameOffset + bytesPerSample);
    }
  }

  return Buffer.concat([header, data]);
}

function analyzeWave({ left, right }) {
  let peak = 0;
  let sumSqLeft = 0;
  let sumSqRight = 0;
  for (let i = 0; i < left.length; i += 1) {
    const l = left[i];
    peak = Math.max(peak, Math.abs(l));
    sumSqLeft += l * l;
    if (right) {
      const r = right[i];
      peak = Math.max(peak, Math.abs(r));
      sumSqRight += r * r;
    }
  }
  const count = left.length;
  const rmsLeft = Math.sqrt(sumSqLeft / count);
  const rmsRight = right ? Math.sqrt(sumSqRight / count) : rmsLeft;
  return {
    peak,
    rms: {
      left: rmsLeft,
      right: rmsRight,
    },
  };
}

function floatToInt16(value) {
  const v = clamp(value, -1, 1);
  return v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff);
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function createPrng(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 0x1a2b3c4d;
}
