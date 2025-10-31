import { createHash } from 'node:crypto';

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 2;
const DEFAULT_DURATION_SECONDS = 64;

/**
 * Generate an adaptive audio stem for ambient/tension/combat layers.
 * Returns a PCM WAV buffer plus metadata for downstream ingestion.
 *
 * @param {object} options
 * @param {'ambient'|'tension'|'combat'} options.mode - Stem flavour to generate.
 * @param {number} [options.durationSeconds=64] - Loop duration in seconds.
 * @param {number} [options.sampleRate=44100] - PCM sample rate.
 * @param {number} [options.channels=2] - Channel count (1 or 2).
 * @param {string} [options.seed='ar008'] - Seed for deterministic noise layers.
 * @returns {{ buffer: Buffer, metadata: object }}
 */
export function generateAdaptiveStem(options) {
  const {
    mode,
    durationSeconds = DEFAULT_DURATION_SECONDS,
    sampleRate = DEFAULT_SAMPLE_RATE,
    channels = DEFAULT_CHANNELS,
    seed = 'ar008',
  } = options ?? {};

  if (mode !== 'ambient' && mode !== 'tension' && mode !== 'combat') {
    throw new Error(`generateAdaptiveStem: Unsupported mode "${mode}"`);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('generateAdaptiveStem: durationSeconds must be positive');
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('generateAdaptiveStem: sampleRate must be positive');
  }
  if (channels !== 1 && channels !== 2) {
    throw new Error('generateAdaptiveStem: channels must be 1 or 2 (stereo)');
  }

  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const envelopes = buildLoopEnvelope(totalSamples);
  const left = new Float32Array(totalSamples);
  const right = channels === 2 ? new Float32Array(totalSamples) : null;
  const prng = createPrng(seed + mode);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    let baseSample;
    if (mode === 'ambient') {
      baseSample = ambientSample(t, i, sampleRate, prng);
    } else if (mode === 'tension') {
      baseSample = tensionSample(t, i, sampleRate, prng);
    } else {
      baseSample = combatSample(t, i, sampleRate, prng);
    }
    const enveloped = baseSample * envelopes[i];
    left[i] = clamp(enveloped, -1, 1);
    if (right) {
      // Add subtle stereo motion for width
      const stereoMod = 0.98 + 0.02 * Math.sin((2 * Math.PI * t) / 9);
      right[i] = clamp(enveloped * stereoMod, -1, 1);
    }
  }

  const wavBuffer = encodeWav({ left, right, sampleRate });
  const statistics = analyzeWave({ left, right });

  return {
    buffer: wavBuffer,
    metadata: {
      mode,
      durationSeconds,
      sampleRate,
      channels,
      loopStartSeconds: 0,
      loopEndSeconds: durationSeconds,
      seed,
      statistics,
      checksumSha256: createHash('sha256').update(wavBuffer).digest('hex'),
    },
  };
}

function ambientSample(t, index, sampleRate, prng) {
  const padFreq = 48; // low-mid pad fundamental
  const subFreq = 24; // subharmonic support
  const shimmerFreq = 640; // airy shimmer overtone

  const drift = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.015 * t);
  const pad =
    0.5 * Math.sin(2 * Math.PI * padFreq * t + Math.sin(t * 0.12)) * drift;
  const sub =
    0.3 * Math.sin(2 * Math.PI * subFreq * t + Math.cos(t * 0.08)) * 0.65;
  const shimmer =
    0.12 *
    Math.sin(2 * Math.PI * shimmerFreq * t + Math.sin(t * 0.5)) *
    (0.25 + 0.75 * Math.sin(2 * Math.PI * 0.05 * t) ** 2);
  const filteredNoise = (prng() * 2 - 1) * 0.03;

  if (index === 0) {
    ambientSample._last = 0;
  }

  const raw = pad + sub + shimmer + filteredNoise;
  const smoothed = 0.75 * ambientSample._last + 0.25 * raw;
  ambientSample._last = smoothed;
  return smoothed;
}

function tensionSample(t, index, sampleRate, prng) {
  const baseFreq = 110; // A2
  const damped = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.08 * t);
  const harmonic = 0.4 * Math.sin(2 * Math.PI * baseFreq * t);
  const overtone = 0.3 * Math.sin(2 * Math.PI * baseFreq * 1.5 * t + Math.sin(t * 0.5));
  const lowPad = 0.25 * Math.sin(2 * Math.PI * 55 * t + Math.cos(t * 0.2));

  const noise = (prng() * 2 - 1) * 0.08;
  const pulse = 0.15 * Math.sin(2 * Math.PI * (baseFreq / 4) * t + Math.sin(t * 0.125));
  const swells = 0.2 * Math.sin(2 * Math.PI * 0.02 * t + Math.sin(t * 0.05));

  // Gentle filter: average with previous tension sample
  if (index === 0) {
    tensionSample._last = 0;
  }
  const raw = (harmonic + overtone + lowPad + noise + pulse + swells) * damped;
  const smoothed = 0.6 * raw + 0.4 * tensionSample._last;
  tensionSample._last = smoothed;
  return smoothed;
}

function combatSample(t, index, sampleRate, prng) {
  const bpm = 124;
  const beatPeriod = 60 / bpm;
  const beatPhase = (t % beatPeriod) / beatPeriod;

  const bassFreq = 55;
  const leadFreq = 440;
  const rhythmFreq = 176;

  const bass = 0.5 * Math.sin(2 * Math.PI * bassFreq * t);
  const lead = 0.35 * Math.sin(2 * Math.PI * leadFreq * t + Math.sin(t * 0.5));
  const rhythm = 0.25 * Math.sign(Math.sin(2 * Math.PI * rhythmFreq * t));

  const pulse = pulseEnvelope(beatPhase) * Math.sin(2 * Math.PI * 880 * t);
  const noisePerc = (prng() * 2 - 1) * 0.12 * pulseEnvelope(beatPhase * 2);

  const riser = 0.2 * Math.sin(2 * Math.PI * 0.04 * t + Math.sin(t * 0.2));
  const drive = 0.18 * Math.sin(2 * Math.PI * 0.5 * t);

  if (index === 0) {
    combatSample._last = 0;
  }

  const raw = bass + lead + rhythm + pulse + noisePerc + riser + drive;
  const saturated = Math.tanh(raw * 1.2);
  const smoothed = 0.55 * saturated + 0.45 * combatSample._last;
  combatSample._last = smoothed;
  return smoothed;
}

function pulseEnvelope(phase) {
  if (phase < 0.15) {
    return Math.sin((phase / 0.15) * Math.PI);
  }
  if (phase > 0.5) {
    const tail = (phase - 0.5) / 0.5;
    return 1 - tail;
  }
  return 1;
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
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // audio format PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
  header.writeUInt16LE(channels * bytesPerSample, 32); // block align
  header.writeUInt16LE(8 * bytesPerSample, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.allocUnsafe(dataSize);
  for (let i = 0; i < totalSamples; i += 1) {
    const frameOffset = i * channels * bytesPerSample;
    const sampleL = floatToInt16(left[i]);
    data.writeInt16LE(sampleL, frameOffset);
    if (right) {
      const sampleR = floatToInt16(right[i]);
      data.writeInt16LE(sampleR, frameOffset + bytesPerSample);
    }
  }

  return Buffer.concat([header, data]);
}

function analyzeWave({ left, right }) {
  let peak = 0;
  let sumSquaresLeft = 0;
  let sumSquaresRight = 0;

  for (let i = 0; i < left.length; i += 1) {
    const l = left[i];
    peak = Math.max(peak, Math.abs(l));
    sumSquaresLeft += l * l;
    if (right) {
      const r = right[i];
      peak = Math.max(peak, Math.abs(r));
      sumSquaresRight += r * r;
    }
  }

  const sampleCount = left.length;
  const rmsLeft = Math.sqrt(sumSquaresLeft / sampleCount);
  const rmsRight = right ? Math.sqrt(sumSquaresRight / sampleCount) : rmsLeft;

  return {
    peak,
    rms: {
      left: rmsLeft,
      right: rmsRight,
    },
  };
}

function floatToInt16(value) {
  const v = Math.max(-1, Math.min(1, value));
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
