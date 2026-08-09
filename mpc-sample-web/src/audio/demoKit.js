// Synthesized placeholder demo kit - NOT real Akai factory content (see README, Section 6 of the
// original build plan). Six basic drum voices rendered to AudioBuffers via Web Audio synthesis.

function noiseBuffer(ctx, duration) {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

async function renderOffline(duration, sampleRate, renderFn) {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OfflineCtx(1, Math.ceil(duration * sampleRate), sampleRate);
  renderFn(ctx);
  return ctx.startRendering();
}

async function synthKick(ctx) {
  return renderOffline(0.5, ctx.sampleRate, (offline) => {
    const osc = offline.createOscillator();
    const gain = offline.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, 0);
    osc.frequency.exponentialRampToValueAtTime(40, 0.15);
    gain.gain.setValueAtTime(1, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.45);
    osc.connect(gain).connect(offline.destination);
    osc.start(0);
    osc.stop(0.5);
  });
}

async function synthSnare(ctx) {
  return renderOffline(0.3, ctx.sampleRate, (offline) => {
    const noise = offline.createBufferSource();
    noise.buffer = noiseBuffer(offline, 0.3);
    const noiseFilter = offline.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = offline.createGain();
    noiseGain.gain.setValueAtTime(1, 0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, 0.2);

    const osc = offline.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 180;
    const oscGain = offline.createGain();
    oscGain.gain.setValueAtTime(0.7, 0);
    oscGain.gain.exponentialRampToValueAtTime(0.001, 0.12);

    noise.connect(noiseFilter).connect(noiseGain).connect(offline.destination);
    osc.connect(oscGain).connect(offline.destination);
    noise.start(0);
    osc.start(0);
    osc.stop(0.15);
  });
}

async function synthHihat(ctx, open = false) {
  const duration = open ? 0.4 : 0.08;
  return renderOffline(duration, ctx.sampleRate, (offline) => {
    const noise = offline.createBufferSource();
    noise.buffer = noiseBuffer(offline, duration);
    const filter = offline.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = offline.createGain();
    gain.gain.setValueAtTime(0.8, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);
    noise.connect(filter).connect(gain).connect(offline.destination);
    noise.start(0);
  });
}

async function synthClap(ctx) {
  return renderOffline(0.35, ctx.sampleRate, (offline) => {
    const filter = offline.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1;
    filter.connect(offline.destination);
    [0, 0.02, 0.04, 0.08].forEach((t) => {
      const noise = offline.createBufferSource();
      noise.buffer = noiseBuffer(offline, 0.15);
      const g = offline.createGain();
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.connect(g).connect(filter);
      noise.start(t);
    });
  });
}

async function synthTom(ctx, freq = 120) {
  return renderOffline(0.4, ctx.sampleRate, (offline) => {
    const osc = offline.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, 0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, 0.3);
    const gain = offline.createGain();
    gain.gain.setValueAtTime(1, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.4);
    osc.connect(gain).connect(offline.destination);
    osc.start(0);
    osc.stop(0.4);
  });
}

async function synthPerc(ctx) {
  return renderOffline(0.2, ctx.sampleRate, (offline) => {
    const osc = offline.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, 0);
    osc.frequency.exponentialRampToValueAtTime(300, 0.1);
    const gain = offline.createGain();
    gain.gain.setValueAtTime(0.5, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.18);
    osc.connect(gain).connect(offline.destination);
    osc.start(0);
    osc.stop(0.2);
  });
}

export async function buildDemoKit(ctx) {
  const [kick, snare, hatClosed, hatOpen, clap, tomLow, tomHigh, perc] = await Promise.all([
    synthKick(ctx),
    synthSnare(ctx),
    synthHihat(ctx, false),
    synthHihat(ctx, true),
    synthClap(ctx),
    synthTom(ctx, 90),
    synthTom(ctx, 160),
    synthPerc(ctx),
  ]);
  return [
    { name: 'Demo Kick', buffer: kick },
    { name: 'Demo Snare', buffer: snare },
    { name: 'Demo Hat Closed', buffer: hatClosed },
    { name: 'Demo Hat Open', buffer: hatOpen },
    { name: 'Demo Clap', buffer: clap },
    { name: 'Demo Tom Low', buffer: tomLow },
    { name: 'Demo Tom High', buffer: tomHigh },
    { name: 'Demo Perc', buffer: perc },
  ];
}
