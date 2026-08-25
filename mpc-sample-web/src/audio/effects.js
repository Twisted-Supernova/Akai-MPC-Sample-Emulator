// Real-time Web Audio effect graphs for Pad FX / Knob FX / Flex Beat / Compressor.
// Every effect here is a genuine, live DSP graph (no mock/no-op nodes) built from standard
// Web Audio nodes, generated impulse responses, and the live-capture ring buffer for the
// buffer-manipulation effects (Beat Repeat, Rev Stepper, Granulator, Half Speed).
// Approximations vs Akai's actual DSP are noted in README.md, not here.

import { createLiveCapture } from './liveCapture';

const NOTE_DIVISIONS = {
  '2 bars': 8, '1 bar': 4, '1/1': 4, '1/2': 2, '1/2T': 2 / 3, '1/2.': 3,
  '1/4': 1, '1/4t': 1 / 3, '1/4T': 1 / 3, '1/4d': 1.5, '1/4.': 1.5,
  '1/8': 0.5, '1/8t': 1 / 6, '1/8T': 1 / 6, '1/8d': 0.75, '1/8.': 0.75,
  '1/16': 0.25, '1/16t': 1 / 12, '1/16T': 1 / 12, '1/16d': 0.375, '1/16.': 0.375,
  '1/32': 0.125, '1/32t': 1 / 24, '1/32T': 1 / 24, '1/32d': 0.1875,
  '1/64': 0.0625, '1/64t': 1 / 48, '1/64d': 0.09375,
  Bar: 4,
};

export function divisionToSeconds(division, bpm) {
  const beats = NOTE_DIVISIONS[division] ?? 0.25;
  return (60 / bpm) * beats;
}

function makeImpulseResponse(ctx, durationSec, decayCurve = 2) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayCurve);
    }
  }
  return impulse;
}

function makeDistortionCurve(shape, amount) {
  const n = 4096;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    if (shape === 'Sine') {
      curve[i] = Math.sin(x * (1 + k * 0.2) * Math.PI * 0.5);
    } else if (shape === 'Parabolic') {
      curve[i] = x - (Math.sign(x) * x * x) / (2 + k * 0.05);
    } else {
      curve[i] = Math.tanh(x * (1 + k * 0.3));
    }
  }
  return curve;
}

function baseEffect(input, output, extra = {}) {
  return { input, output, dispose() {}, ...extra };
}

// --- Filter family (LP/HP/BP, with optional tempo-synced LFO sweep for Pad FX variants) ---
function makeFilterEffect(ctx, biquadType, stages = 1) {
  const nodes = [];
  for (let i = 0; i < stages; i++) {
    const f = ctx.createBiquadFilter();
    f.type = biquadType;
    f.frequency.value = 1000;
    f.Q.value = 1;
    nodes.push(f);
  }
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);

  let lfo = null;
  let lfoGain = null;

  function setParams(p, bpm) {
    nodes.forEach((n) => {
      if (p.frequency != null) n.frequency.setTargetAtTime(p.frequency, ctx.currentTime, 0.01);
      if (p.cutoffHz != null) n.frequency.setTargetAtTime(p.cutoffHz, ctx.currentTime, 0.01);
      const q = p.resonance != null ? 0.1 + (p.resonance / 100) * 20 : n.Q.value;
      n.Q.setTargetAtTime(q, ctx.currentTime, 0.01);
    });
    if (p.speed && p.range != null) {
      if (!lfo) {
        lfo = ctx.createOscillator();
        lfoGain = ctx.createGain();
        lfo.connect(lfoGain);
        nodes.forEach((n) => lfoGain.connect(n.frequency));
        lfo.start();
      }
      const hz = 1 / Math.max(0.02, divisionToSeconds(p.speed, bpm || 120));
      lfo.frequency.setTargetAtTime(Math.min(20, hz), ctx.currentTime, 0.02);
      const base = p.cutoffHz ?? nodes[0].frequency.value;
      lfoGain.gain.setTargetAtTime((p.range / 100) * base * 0.8, ctx.currentTime, 0.02);
    }
  }

  return baseEffect(nodes[0], nodes[nodes.length - 1], {
    setParams,
    dispose() {
      if (lfo) lfo.stop();
    },
  });
}

// --- Comb filter: short feedback delay ---
function makeCombFilter(ctx) {
  const input = ctx.createGain();
  const delay = ctx.createDelay(0.05);
  const feedback = ctx.createGain();
  feedback.gain.value = 0.7;
  const output = ctx.createGain();
  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(output);
  input.connect(output);
  let lfo = null;
  let lfoGain = null;
  function setParams(p, bpm) {
    const baseDelay = 0.005;
    delay.delayTime.setTargetAtTime(baseDelay, ctx.currentTime, 0.01);
    if (p.speed && p.range != null) {
      if (!lfo) {
        lfo = ctx.createOscillator();
        lfoGain = ctx.createGain();
        lfo.connect(lfoGain).connect(delay.delayTime);
        lfo.start();
      }
      const hz = 1 / Math.max(0.02, divisionToSeconds(p.speed, bpm || 120));
      lfo.frequency.setTargetAtTime(Math.min(20, hz), ctx.currentTime, 0.02);
      lfoGain.gain.setTargetAtTime((p.range ?? 50) / 100 * 0.01, ctx.currentTime, 0.02);
    }
  }
  return baseEffect(input, output, { setParams, dispose() { if (lfo) lfo.stop(); } });
}

// --- Delay family ---
function makeDelayEffect(ctx, { pingPong = false } = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry).connect(output);

  const delayL = ctx.createDelay(2);
  const delayR = ctx.createDelay(2);
  // setParams uses setTargetAtTime, which approaches its target from whatever the gain currently
  // is. A GainNode defaults to 1.0, so leaving these unset means the delay line regenerates at
  // unity feedback for the duration of the first approach. Start where setParams would land.
  const feedbackL = ctx.createGain();
  feedbackL.gain.value = 0.3;
  const feedbackR = ctx.createGain();
  feedbackR.gain.value = 0.3;
  const merger = ctx.createChannelMerger(2);
  const splitter = ctx.createChannelSplitter(2);

  input.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, pingPong ? 0 : 1);
  delayL.connect(feedbackL);
  delayR.connect(feedbackR);
  if (pingPong) {
    feedbackL.connect(delayR);
    feedbackR.connect(delayL);
  } else {
    feedbackL.connect(delayL);
    feedbackR.connect(delayR);
  }
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(wet).connect(output);

  function setParams(p, bpm) {
    const timeSec = p.syncOn === false || p.sync === 'Off'
      ? (p.timeMs ?? 300) / 1000
      : divisionToSeconds(p.time, bpm || 120);
    delayL.delayTime.setTargetAtTime(Math.min(2, timeSec), ctx.currentTime, 0.01);
    delayR.delayTime.setTargetAtTime(Math.min(2, timeSec), ctx.currentTime, 0.01);
    const fb = (p.feedback ?? 30) / 100;
    feedbackL.gain.setTargetAtTime(fb, ctx.currentTime, 0.01);
    feedbackR.gain.setTargetAtTime(fb, ctx.currentTime, 0.01);
    const mix = (p.mix ?? 50) / 100;
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams });
}

// --- Reverb family (algorithmic, generated IR) ---
function makeReverbEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const preDelay = ctx.createDelay(1);
  const convolver = ctx.createConvolver();
  input.connect(dry).connect(output);
  input.connect(preDelay).connect(convolver).connect(wet).connect(output);

  let lastDuration = -1;
  function setParams(p) {
    preDelay.delayTime.setTargetAtTime((p.preDelay ?? 20) / 1000, ctx.currentTime, 0.01);
    const timeSec = Math.min(p.time ?? 2, 12);
    if (Math.abs(timeSec - lastDuration) > 0.05) {
      convolver.buffer = makeImpulseResponse(ctx, timeSec, 1.5 + (1 - (p.diffusion ?? 50) / 100));
      lastDuration = timeSec;
    }
    const mix = (p.mix ?? 30) / 100;
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams });
}

// --- Chorus / Flanger / Ensemble / Multi-Chorus: modulated delay line(s) ---
function makeModDelayEffect(ctx, { voices = 1, feedbackCapable = false } = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry).connect(output);

  const voiceNodes = Array.from({ length: voices }, (_, i) => {
    const delay = ctx.createDelay(0.05);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5 + i * 0.13;
    lfo.phase = i;
    lfo.connect(lfoGain).connect(delay.delayTime);
    lfo.start();
    input.connect(delay);
    let feedback = null;
    if (feedbackCapable) {
      feedback = ctx.createGain();
      feedback.gain.value = 0; // delay loop at the GainNode default of 1.0 regenerates without decay
      delay.connect(feedback);
      feedback.connect(delay);
    }
    delay.connect(wet);
    return { delay, lfo, lfoGain, feedback };
  });
  wet.connect(output);

  function setParams(p) {
    const rate = p.rate ?? 0.5;
    const depthSec = ((p.depth ?? 5) / 1000);
    voiceNodes.forEach((v, i) => {
      v.lfo.frequency.setTargetAtTime(rate * (1 + i * 0.05), ctx.currentTime, 0.02);
      v.lfoGain.gain.setTargetAtTime(depthSec, ctx.currentTime, 0.02);
      v.delay.delayTime.setTargetAtTime(0.01 + depthSec + i * 0.002, ctx.currentTime, 0.02);
      if (v.feedback) v.feedback.gain.setTargetAtTime((p.feedback ?? 0) / 100 * 0.9, ctx.currentTime, 0.02);
    });
    const mix = (p.mix ?? 50) / 100;
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, {
    setParams,
    setVoices(n) {
      /* voice count fixed at creation for simplicity; see README */
    },
    dispose() {
      voiceNodes.forEach((v) => v.lfo.stop());
    },
  });
}

// --- Phaser: cascaded allpass filters swept by LFO ---
function makePhaserEffect(ctx, stages = 4) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry).connect(output);

  const filters = Array.from({ length: stages }, () => {
    const f = ctx.createBiquadFilter();
    f.type = 'allpass';
    f.frequency.value = 800;
    return f;
  });
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  input.connect(filters[0]);
  const feedback = ctx.createGain();
  feedback.gain.value = 0; // allpass loop at the GainNode default of 1.0 self-oscillates
  filters[filters.length - 1].connect(feedback);
  feedback.connect(filters[0]);
  filters[filters.length - 1].connect(wet).connect(output);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.connect(lfoGain);
  filters.forEach((f) => lfoGain.connect(f.frequency));
  lfo.start();

  function setParams(p) {
    lfo.frequency.setTargetAtTime(p.rate ?? 0.5, ctx.currentTime, 0.02);
    lfoGain.gain.setTargetAtTime(((p.depth ?? 50) / 100) * 1200, ctx.currentTime, 0.02);
    filters.forEach((f) => f.frequency.setTargetAtTime(800, ctx.currentTime, 0.02));
    feedback.gain.setTargetAtTime(((p.feedback ?? 0) / 100) * 0.9, ctx.currentTime, 0.02);
    const mix = (p.mix ?? 50) / 100;
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams, dispose() { lfo.stop(); } });
}

// --- Ring Modulator ---
function makeRingModEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const ringGain = ctx.createGain();
  ringGain.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.connect(ringGain.gain);
  osc.start();
  input.connect(ringGain).connect(output);
  function setParams(p) {
    osc.frequency.setTargetAtTime(p.maxFreq ?? 200, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams, dispose() { osc.stop(); } });
}

// --- LoFi: bitcrush waveshaper + sample-and-hold decimator ---
function makeLoFiEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  input.connect(shaper);

  const decimator = ctx.createScriptProcessor(1024, 2, 2);
  let phase = 0;
  let holdL = 0;
  let holdR = 0;
  let decimateFactor = 1;
  decimator.onaudioprocess = (e) => {
    const inL = e.inputBuffer.getChannelData(0);
    const inR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inL;
    const outL = e.outputBuffer.getChannelData(0);
    const outR = e.outputBuffer.getChannelData(1);
    for (let i = 0; i < inL.length; i++) {
      if (phase % decimateFactor === 0) {
        holdL = inL[i];
        holdR = inR[i];
      }
      phase++;
      outL[i] = holdL;
      outR[i] = holdR;
    }
  };
  shaper.connect(decimator).connect(output);

  function setParams(p) {
    const bits = p.bitcrush ?? 12;
    const steps = Math.pow(2, Math.max(1, Math.min(16, bits)));
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    shaper.curve = curve;
    decimateFactor = 1 + Math.round(((p.decimator ?? 0) / 100) * 30);
  }
  return baseEffect(input, output, { setParams });
}

// --- Color: vintage character modes ---
function makeColorEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 8000;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  const noiseSrc = ctx.createBufferSource();
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;
  noiseSrc.start();
  noiseSrc.connect(noiseGain).connect(output);

  input.connect(shaper).connect(filter).connect(output);

  function setParams(p) {
    const mode = p.mode ?? 'Cassette';
    if (mode === 'Cassette' || mode === 'Flutter') {
      filter.type = 'lowpass';
      filter.frequency.setTargetAtTime(6000, ctx.currentTime, 0.02);
      noiseGain.gain.setTargetAtTime(0.008, ctx.currentTime, 0.02);
      shaper.curve = makeDistortionCurve('Tanh', 2);
    } else if (mode === 'Tube Amp') {
      filter.type = 'lowpass';
      filter.frequency.setTargetAtTime(9000, ctx.currentTime, 0.02);
      noiseGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.02);
      shaper.curve = makeDistortionCurve('Tanh', 8);
    } else if (mode === 'Vinyl') {
      filter.type = 'highpass';
      filter.frequency.setTargetAtTime(120, ctx.currentTime, 0.02);
      noiseGain.gain.setTargetAtTime(0.02, ctx.currentTime, 0.02);
      shaper.curve = makeDistortionCurve('Tanh', 1);
    } else if (mode === 'Saturation') {
      filter.type = 'lowpass';
      filter.frequency.setTargetAtTime(12000, ctx.currentTime, 0.02);
      noiseGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      shaper.curve = makeDistortionCurve('Tanh', 15);
    } else if (mode === 'Radio') {
      filter.type = 'bandpass';
      filter.frequency.setTargetAtTime(1800, ctx.currentTime, 0.02);
      filter.Q.value = 2;
      noiseGain.gain.setTargetAtTime(0.015, ctx.currentTime, 0.02);
      shaper.curve = makeDistortionCurve('Tanh', 10);
    }
  }
  return baseEffect(input, output, { setParams, dispose() { noiseSrc.stop(); } });
}

// --- Beat Repeat / Rev Stepper / Granulator / Half Speed: live-capture based ---
function makeCaptureLoopEffect(ctx, kind) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const capture = createLiveCapture(ctx, 4);
  input.connect(capture.node);
  capture.sink.connect(output); // silent - keeps the capture node pulled by the render graph
  let currentSource = null;
  let timer = null;

  function stopCurrent() {
    if (currentSource) {
      try { currentSource.stop(); } catch (e) { /* ignore */ }
      currentSource = null;
    }
  }

  function scheduleLoop(p, bpm) {
    clearTimeout(timer);
    stopCurrent();
    let sliceSec, repeats, reverseAlternate = false, playbackRate = 1;
    if (kind === 'beatRepeat') {
      sliceSec = divisionToSeconds(p.division, bpm || 120);
      repeats = 999;
    } else if (kind === 'revStepper') {
      sliceSec = divisionToSeconds(p.delayTime, bpm || 120);
      repeats = p.repeats ?? 4;
      reverseAlternate = true;
    } else if (kind === 'granulator') {
      sliceSec = Math.max(0.01, (p.grainLen ?? 60) / 1000);
      repeats = 999;
    } else if (kind === 'halfSpeed') {
      sliceSec = 1;
      repeats = 999;
      playbackRate = 1 / (p.speedFactor ?? 2);
    }
    const snap = capture.snapshot(sliceSec);
    let step = 0;
    function playStep() {
      stopCurrent();
      const src = ctx.createBufferSource();
      let buf = snap;
      if (reverseAlternate && step % 2 === 1) {
        buf = ctx.createBuffer(snap.numberOfChannels, snap.length, snap.sampleRate);
        for (let ch = 0; ch < snap.numberOfChannels; ch++) {
          const s = snap.getChannelData(ch);
          const d = buf.getChannelData(ch);
          for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
        }
      }
      src.buffer = buf;
      src.playbackRate.value = playbackRate;
      const g = ctx.createGain();
      const dur = buf.duration / playbackRate;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + Math.min(0.005, dur / 4));
      g.gain.setValueAtTime(1, ctx.currentTime + dur - Math.min(0.005, dur / 4));
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      src.connect(g).connect(output);
      src.start();
      currentSource = src;
      step++;
      if (step < repeats) {
        timer = setTimeout(playStep, dur * 1000);
      } else if (kind !== 'beatRepeat' && kind !== 'granulator' && kind !== 'halfSpeed') {
        timer = setTimeout(() => scheduleLoop(p, bpm), dur * 1000 + 20);
      }
    }
    playStep();
  }

  return baseEffect(input, output, {
    setParams(p, bpm) {
      scheduleLoop(p, bpm);
    },
    dispose() {
      clearTimeout(timer);
      stopCurrent();
    },
  });
}

// --- Dynamics: Bus Compressor / Limiter / Pumper / Noise Gate / Transient ---
function makeCompressorEffect(ctx) {
  const node = ctx.createDynamicsCompressor();
  function setParams(p) {
    node.threshold.setTargetAtTime(p.threshold ?? -20, ctx.currentTime, 0.01);
    node.ratio.setTargetAtTime(p.ratio ?? 4, ctx.currentTime, 0.01);
    node.attack.setTargetAtTime((p.attack ?? 20) / 1000, ctx.currentTime, 0.01);
    node.release.setTargetAtTime((p.release ?? 250) / 1000, ctx.currentTime, 0.01);
  }
  return baseEffect(node, node, { setParams });
}

function makeLimiterEffect(ctx) {
  const node = ctx.createDynamicsCompressor();
  node.ratio.value = 20;
  const makeup = ctx.createGain();
  node.connect(makeup);
  function setParams(p) {
    node.threshold.setTargetAtTime(p.ceiling ?? 0, ctx.currentTime, 0.01);
    node.release.setTargetAtTime((p.release ?? 100) / 1000, ctx.currentTime, 0.01);
    makeup.gain.setTargetAtTime(Math.pow(10, (p.gain ?? 0) / 20), ctx.currentTime, 0.01);
  }
  return baseEffect(node, makeup, { setParams });
}

function makePumperEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const vca = ctx.createGain();
  input.connect(vca).connect(output);
  let timer = null;
  function setParams(p, bpm) {
    clearInterval(timer);
    const period = divisionToSeconds(p.speed, bpm || 120);
    const depth = (p.depth ?? 50) / 100;
    const attack = ((p.attack ?? 10) / 100) * period * 0.4;
    const hold = ((p.hold ?? 10) / 100) * period * 0.3;
    function pulse() {
      const t = ctx.currentTime;
      vca.gain.cancelScheduledValues(t);
      vca.gain.setValueAtTime(1 - depth, t);
      vca.gain.linearRampToValueAtTime(1, t + attack);
      vca.gain.setValueAtTime(1, t + attack + hold);
      vca.gain.linearRampToValueAtTime(1 - depth, t + period);
    }
    pulse();
    timer = setInterval(pulse, Math.max(30, period * 1000));
  }
  return baseEffect(input, output, { setParams, dispose() { clearInterval(timer); } });
}

function makeNoiseGateEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const vca = ctx.createGain();
  input.connect(vca).connect(output);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  input.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  let thresholdLinear = 0.01;
  let raf = null;
  function loop() {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    const target = rms > thresholdLinear ? 1 : 0.02;
    vca.gain.setTargetAtTime(target, ctx.currentTime, 0.02);
    raf = requestAnimationFrame(loop);
  }
  loop();
  function setParams(p) {
    thresholdLinear = Math.pow(10, (p.threshold ?? -40) / 20);
  }
  return baseEffect(input, output, { setParams, dispose() { if (raf) cancelAnimationFrame(raf); } });
}

function makeTransientEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const vca = ctx.createGain();
  input.connect(vca).connect(output);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  input.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  let fastAvg = 0;
  let slowAvg = 0;
  let attackAmt = 0;
  let sustainAmt = 0;
  let raf = null;
  function loop() {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
    const level = sum / data.length;
    fastAvg = fastAvg * 0.6 + level * 0.4;
    slowAvg = slowAvg * 0.95 + level * 0.05;
    const isTransient = fastAvg > slowAvg * 1.3;
    const target = 1 + (isTransient ? attackAmt : sustainAmt);
    vca.gain.setTargetAtTime(Math.max(0, target), ctx.currentTime, 0.01);
    raf = requestAnimationFrame(loop);
  }
  loop();
  function setParams(p) {
    attackAmt = (p.attack ?? 0) / 100;
    sustainAmt = (p.sustain ?? 0) / 100;
  }
  return baseEffect(input, output, { setParams, dispose() { if (raf) cancelAnimationFrame(raf); } });
}

// --- Distortion family: Amp Sim / Tube Drive / Soft Clipper ---
function makeDistortionEffect(ctx, { withCab = false } = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const cab = ctx.createBiquadFilter();
  cab.type = 'bandpass';
  cab.frequency.value = 2000;
  cab.Q.value = 0.7;
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  input.connect(dry).connect(output);
  if (withCab) {
    input.connect(shaper).connect(cab).connect(wet).connect(output);
  } else {
    input.connect(shaper).connect(wet).connect(output);
  }
  const CAB_FREQ = {
    'D.I.': null, 'Brit 1x8"': 3000, '1x12"': 2500, '2x10"': 2200, '2x12"': 2000,
    '4x10"': 2400, '4x12"': 1800, '1x15" Bass': 900, '4x10" Bass': 800, Radio: 1500,
  };
  function setParams(p) {
    const drive = p.drive ?? 5;
    shaper.curve = makeDistortionCurve(p.shape ?? 'Tanh', drive);
    if (withCab) {
      const f = CAB_FREQ[p.cabModel] ?? 2000;
      if (f) {
        cab.frequency.setTargetAtTime(f, ctx.currentTime, 0.02);
        cab.type = 'bandpass';
      } else {
        cab.type = 'allpass';
      }
    }
    const mix = p.mix != null ? p.mix / 100 : (p.softClip != null ? p.softClip / 100 : 1);
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams });
}

// --- Auto-Wah: envelope-followed low-pass ---
function makeAutoWahEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  input.connect(dry).connect(output);
  input.connect(filter).connect(wet).connect(output);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  input.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  let sens = 0.5, centerHz = 800, raf = null;
  function loop() {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
    const level = sum / data.length;
    const hz = centerHz + level * sens * 6000;
    filter.frequency.setTargetAtTime(Math.min(18000, hz), ctx.currentTime, 0.02);
    raf = requestAnimationFrame(loop);
  }
  loop();
  function setParams(p) {
    sens = (p.sens ?? 50) / 100;
    filter.Q.setTargetAtTime(0.5 + ((p.resonance ?? 30) / 100) * 15, ctx.currentTime, 0.02);
    centerHz = 200 + ((p.center ?? 50) / 100) * 2000;
    const mix = (p.mix ?? 100) / 100;
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams, dispose() { if (raf) cancelAnimationFrame(raf); } });
}

function makeAutoPanEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.connect(lfoGain).connect(panner.pan);
  lfo.start();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  input.connect(dry).connect(output);
  input.connect(panner).connect(wet).connect(output);
  function setParams(p) {
    lfo.frequency.setTargetAtTime(0.1 + ((p.rate ?? 30) / 100) * 5, ctx.currentTime, 0.02);
    lfoGain.gain.setTargetAtTime(1, ctx.currentTime, 0.02);
    const mix = (p.mix ?? 100) / 100;
    dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.01);
    wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams, dispose() { lfo.stop(); } });
}

// --- Vintage / Vinyl / Tape emulators ---
function makeVintageEmulatorEffect(ctx) {
  const filter = makeFilterEffect(ctx, 'lowpass');
  function setParams(p) {
    const map = { MPC3000: 9000, MPC60: 7000, SP1200: 5500, SP1200Ring: 5500 };
    filter.setParams({ cutoffHz: map[p.type] ?? 8000, resonance: p.type === 'SP1200Ring' ? 40 : 10 });
  }
  return baseEffect(filter.input, filter.output, { setParams, dispose: filter.dispose });
}

function makeVinylEmulatorEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0; // full-scale noise source below; setParams fades up from here, not from 1.0
  const noiseSrc = ctx.createBufferSource();
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (Math.random() > 0.995 ? 3 : 1);
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;
  noiseSrc.start();
  noiseSrc.connect(noiseGain).connect(output);
  input.connect(hp).connect(filter).connect(output);
  function setParams(p) {
    filter.frequency.setTargetAtTime(2000 + ((p.tone ?? 50) / 100) * 8000, ctx.currentTime, 0.02);
    noiseGain.gain.setTargetAtTime(((p.crackle ?? 30) / 100) * 0.04, ctx.currentTime, 0.02);
  }
  return baseEffect(input, output, { setParams, dispose() { noiseSrc.stop(); } });
}

function makeTapeEmulatorEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const delay = ctx.createDelay(0.02);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.8;
  lfo.connect(lfoGain).connect(delay.delayTime);
  lfo.start();
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0; // see makeVinylEmulatorEffect - never let the noise source start at unity
  const noiseSrc = ctx.createBufferSource();
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;
  noiseSrc.start();
  noiseSrc.connect(noiseGain).connect(output);
  input.connect(delay).connect(output);
  function setParams(p) {
    lfoGain.gain.setTargetAtTime(((p.wow ?? 30) / 100) * 0.004, ctx.currentTime, 0.02);
    delay.delayTime.setTargetAtTime(0.005, ctx.currentTime, 0.02);
    noiseGain.gain.setTargetAtTime(((p.noise ?? 20) / 100) * 0.015, ctx.currentTime, 0.02);
  }
  return baseEffect(input, output, { setParams, dispose() { noiseSrc.stop(); lfo.stop(); } });
}

function makeSampleDelayEffect(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const delayL = ctx.createDelay(0.3);
  const delayR = ctx.createDelay(0.3);
  input.connect(splitter);
  splitter.connect(delayL, 0);
  splitter.connect(delayR, 1);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(output);
  function setParams(p) {
    delayL.delayTime.setTargetAtTime((p.left ?? 0) / 1000, ctx.currentTime, 0.01);
    delayR.delayTime.setTargetAtTime((p.right ?? 0) / 1000, ctx.currentTime, 0.01);
  }
  return baseEffect(input, output, { setParams });
}

export const EFFECT_FACTORIES = {
  'Half Speed': (ctx) => makeCaptureLoopEffect(ctx, 'halfSpeed'),
  Chorus: (ctx) => makeModDelayEffect(ctx, { voices: 2, feedbackCapable: true }),
  Flanger: (ctx) => makeModDelayEffect(ctx, { voices: 1, feedbackCapable: true }),
  Phaser: (ctx) => makePhaserEffect(ctx, 4),
  'Comb Filter': (ctx) => makeCombFilter(ctx),
  'LP Filter': (ctx) => makeFilterEffect(ctx, 'lowpass'),
  'HP Filter': (ctx) => makeFilterEffect(ctx, 'highpass'),
  'BP Filter': (ctx) => makeFilterEffect(ctx, 'bandpass'),
  'Ring Mod': (ctx) => makeRingModEffect(ctx),
  LoFi: (ctx) => makeLoFiEffect(ctx),
  Color: (ctx) => makeColorEffect(ctx),
  Granulator: (ctx) => makeCaptureLoopEffect(ctx, 'granulator'),
  'Beat Repeat': (ctx) => makeCaptureLoopEffect(ctx, 'beatRepeat'),
  'Rev Stepper': (ctx) => makeCaptureLoopEffect(ctx, 'revStepper'),
  Delay: (ctx) => makeDelayEffect(ctx),
  'Diff Delay': (ctx) => makeDelayEffect(ctx),
  'Tape Delay': (ctx) => makeDelayEffect(ctx),
  'Sample Delay': (ctx) => makeSampleDelayEffect(ctx),
  Reverb: (ctx) => makeReverbEffect(ctx),
  'Reverb Small': (ctx) => makeReverbEffect(ctx),
  'Reverb Medium': (ctx) => makeReverbEffect(ctx),
  'Reverb Large': (ctx) => makeReverbEffect(ctx),
  'Spring Reverb': (ctx) => makeReverbEffect(ctx),
  'Bus Compressor': (ctx) => makeCompressorEffect(ctx),
  Limiter: (ctx) => makeLimiterEffect(ctx),
  Pumper: (ctx) => makePumperEffect(ctx),
  Transient: (ctx) => makeTransientEffect(ctx),
  'Noise Gate': (ctx) => makeNoiseGateEffect(ctx),
  'Amp Sim': (ctx) => makeDistortionEffect(ctx, { withCab: true }),
  'Tube Drive': (ctx) => makeDistortionEffect(ctx),
  'Soft Clipper': (ctx) => makeDistortionEffect(ctx),
  Ensemble: (ctx) => makeModDelayEffect(ctx, { voices: 3 }),
  'Multi-Chorus': (ctx) => makeModDelayEffect(ctx, { voices: 3 }),
  'Auto-Wah': (ctx) => makeAutoWahEffect(ctx),
  'Auto-Pan': (ctx) => makeAutoPanEffect(ctx),
  'Vintage Emulator': (ctx) => makeVintageEmulatorEffect(ctx),
  'Vinyl Emulator': (ctx) => makeVinylEmulatorEffect(ctx),
  'Tape Emulator': (ctx) => makeTapeEmulatorEffect(ctx),
};

export function createEffectInstance(ctx, name) {
  const factory = EFFECT_FACTORIES[name];
  if (!factory) return null;
  return factory(ctx);
}

// Flex Beat (Manual p.50): pad 1 is a fixed Empty slot; pads 2-16 trigger time-based pitch/time/
// volume warp effects on the whole sequence. The manual never publishes names for these 15 slots
// (unlike Pad FX/Knob FX), so rather than invent names, each slot gets one of four real warp
// behaviors (built on the same live-capture technique as Beat Repeat/Rev Stepper), cycling by
// slot number for real audible variety - see README for the naming honesty note.
const FLEX_WARP_KINDS = ['halfSpeed', 'halfSpeed', 'beatRepeat', 'revStepper'];

export function createFlexWarpEffect(ctx, slotIndex) {
  const kind = ((slotIndex - 2) % 4 + 4) % 4;
  return makeCaptureLoopEffect(ctx, FLEX_WARP_KINDS[kind]);
}

export function flexBeatParamsForSlot(slotIndex) {
  const kind = ((slotIndex - 2) % 4 + 4) % 4;
  if (kind === 0) return { speedFactor: 1.6 }; // pitch/time down
  if (kind === 1) return { speedFactor: 0.65 }; // pitch/time up
  if (kind === 2) return { division: '1/16' }; // stutter repeat
  return { repeats: 4, delayTime: '1/8' }; // reverse-stepped chunks
}
