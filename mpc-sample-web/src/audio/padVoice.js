// Single pad-hit playback chain: source -> amp envelope -> filter (+ filter envelope) -> pan -> output.

function cutoffToHz(cutoff127) {
  // 0-127 -> ~20Hz-20kHz, logarithmic
  const t = cutoff127 / 127;
  return 20 * Math.pow(1000, t);
}

function resoToQ(reso127) {
  return 0.1 + (reso127 / 127) * 24.9;
}

function envTimeSeconds(v127) {
  // 0-127 -> 0.001s - 8s, exponential-feeling curve
  return 0.001 + Math.pow(v127 / 127, 2) * 8;
}

function biquadTypeForFilterType(type) {
  if (type === 'LPF2' || type === 'LPF4' || type === 'Classic') return 'lowpass';
  if (type === 'HPF2' || type === 'HPF4') return 'highpass';
  if (type === 'BPF2' || type === 'BPF4') return 'bandpass';
  return null;
}

function buildFilterChain(ctx, filterConfig) {
  const type = biquadTypeForFilterType(filterConfig.type);
  if (!type) return { input: null, output: null, nodes: [], setFrequency: () => {} };
  const isFourPole = filterConfig.type === 'LPF4' || filterConfig.type === 'HPF4';
  const stages = isFourPole ? 2 : 1;
  const nodes = [];
  for (let i = 0; i < stages; i++) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoffToHz(filterConfig.cutoff);
    f.Q.value = filterConfig.type === 'Classic' ? resoToQ(filterConfig.reso) * 1.4 : resoToQ(filterConfig.reso);
    nodes.push(f);
  }
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return {
    input: nodes[0],
    output: nodes[nodes.length - 1],
    nodes,
    setFrequency: (hz, time) => nodes.forEach((n) => n.frequency.setValueAtTime(hz, time)),
    rampFrequency: (hz, time) => nodes.forEach((n) => n.frequency.linearRampToValueAtTime(hz, time)),
  };
}

export function createPadVoice(ctx, { buffer, pad, velocity, destination, now, isNoteOn }) {
  const source = ctx.createBufferSource();

  // Tune: semitone + fine cents -> playbackRate; Warp mode changes duration independent of pitch
  // (approximated here via playbackRate changes only - true time-stretch is out of scope for a
  // single AudioBufferSourceNode; see README for the Warp/Time-Stretch fidelity note).
  const semi = pad.tune.semi;
  const cents = pad.tune.fine;
  let rate = Math.pow(2, (semi + cents / 100) / 12);
  if (pad.tune.warp !== 'Off' && typeof pad.tune.warp === 'number') {
    rate *= 100 / pad.tune.warp;
  }
  source.playbackRate.value = rate;
  source.loop = false;

  const duration = buffer.duration;
  const startOffset = pad.start * duration;
  const endOffset = pad.end * duration;
  const loopStartOffset = pad.loopStart * duration;
  const region = Math.max(0.001, endOffset - startOffset);

  const ampGain = ctx.createGain();
  // velSens 0 = ignore velocity entirely, 127 = full velocity scaling. Both ends must fall out of
  // the same expression - special-casing the top of the range inverts the parameter's meaning.
  const velScale = 1 - (1 - velocity) * (pad.ampEnv.velSens / 127);
  const peakGain = Math.pow(10, pad.volume / 20) * velScale;

  const attackTime = envTimeSeconds(pad.ampEnv.attack);
  ampGain.gain.setValueAtTime(0.0001, now);
  ampGain.gain.linearRampToValueAtTime(Math.max(peakGain, 0.0001), now + attackTime);

  const filterChain = buildFilterChain(ctx, pad.filter);
  if (filterChain.input && pad.filterEnv.depth > 0) {
    const baseHz = cutoffToHz(pad.filter.cutoff);
    const depthHz = (pad.filterEnv.depth / 127) * (20000 - baseHz);
    const fAttack = envTimeSeconds(pad.filterEnv.attack);
    filterChain.setFrequency(baseHz, now);
    filterChain.rampFrequency(Math.min(20000, baseHz + depthHz), now + fAttack);
  }

  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (panner) panner.pan.value = pad.pan / 50;

  let chain = source;
  chain.connect(ampGain);
  let tail = ampGain;
  if (filterChain.input) {
    tail.connect(filterChain.input);
    tail = filterChain.output;
  }
  if (panner) {
    tail.connect(panner);
    tail = panner;
  }
  tail.connect(destination);

  const playRegionDuration = region / source.playbackRate.value;

  // AudioBufferSourceNode.buffer may only be assigned once - assigning a second time throws
  // InvalidStateError - so reverse playback has to pick its buffer here rather than swap one in
  // after the fact. Reverse pre-renders the trimmed region backwards, since the node can't play
  // backwards natively.
  source.buffer = pad.reverse ? reverseBufferRegion(ctx, buffer, startOffset, endOffset) : buffer;

  if (pad.reverse) {
    source.start(now, 0);
  } else if (pad.loop) {
    source.loop = true;
    source.loopStart = pad.loopLock ? startOffset : loopStartOffset;
    source.loopEnd = endOffset;
    source.start(now, startOffset);
  } else {
    source.start(now, startOffset, isNoteOn ? undefined : playRegionDuration);
  }

  function scheduleDecayOrRelease({ decayFrom, timeParam, atTime, sampleEndTime }) {
    const decayTime = envTimeSeconds(timeParam);
    if (decayFrom === 'Start') {
      // Anchor on peakGain, not ampGain.gain.value: this runs synchronously at trigger time, before
      // any automation has been applied, so the getter would return the node's pre-attack default.
      ampGain.gain.setValueAtTime(Math.max(peakGain, 0.0001), atTime);
      ampGain.gain.linearRampToValueAtTime(0.0001, atTime + decayTime);
    } else {
      const tailStart = Math.max(atTime, sampleEndTime - decayTime);
      ampGain.gain.setValueAtTime(peakGain, tailStart);
      ampGain.gain.linearRampToValueAtTime(0.0001, sampleEndTime);
    }
  }

  if (!isNoteOn && !pad.loop) {
    const sampleEndTime = now + attackTime + playRegionDuration;
    scheduleDecayOrRelease({
      decayFrom: pad.ampEnv.decayFrom,
      timeParam: pad.ampEnv.decay,
      atTime: now + attackTime,
      sampleEndTime,
    });
  }

  return {
    source,
    ampGain,
    filterChain,
    startedAt: now,
    isNoteOn,
    padRef: pad,
    stop(atTime = ctx.currentTime) {
      try {
        ampGain.gain.cancelScheduledValues(atTime);
        ampGain.gain.setValueAtTime(ampGain.gain.value, atTime);
        ampGain.gain.linearRampToValueAtTime(0.0001, atTime + 0.01);
        source.stop(atTime + 0.02);
      } catch (e) {
        /* already stopped */
      }
    },
    release(atTime = ctx.currentTime) {
      if (!isNoteOn) return;
      const releaseTime = envTimeSeconds(pad.ampEnv.decay);
      ampGain.gain.cancelScheduledValues(atTime);
      ampGain.gain.setValueAtTime(ampGain.gain.value, atTime);
      ampGain.gain.linearRampToValueAtTime(0.0001, atTime + releaseTime);
      try {
        source.stop(atTime + releaseTime + 0.02);
      } catch (e) {
        /* ignore */
      }
    },
  };
}

const reversedCache = new WeakMap();

function reverseBufferRegion(ctx, buffer, startOffset, endOffset) {
  const cacheKey = `${startOffset}-${endOffset}`;
  let cacheForBuffer = reversedCache.get(buffer);
  if (!cacheForBuffer) {
    cacheForBuffer = new Map();
    reversedCache.set(buffer, cacheForBuffer);
  }
  if (cacheForBuffer.has(cacheKey)) return cacheForBuffer.get(cacheKey);

  const startSample = Math.floor(startOffset * buffer.sampleRate);
  const endSample = Math.floor(endOffset * buffer.sampleRate);
  const length = Math.max(1, endSample - startSample);
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      dst[i] = src[endSample - 1 - i] || 0;
    }
  }
  cacheForBuffer.set(cacheKey, out);
  return out;
}

export { cutoffToHz, resoToQ, envTimeSeconds };
