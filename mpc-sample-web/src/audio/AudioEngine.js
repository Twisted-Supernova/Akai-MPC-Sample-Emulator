import { createPadVoice } from './padVoice';
import { buildDemoKit } from './demoKit';
import { createEffectInstance, createFlexWarpEffect } from './effects';
import { createLiveCapture } from './liveCapture';
import { MAX_VOICES, MAX_SAMPLE_SECONDS } from '../data/constants';

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = new Map(); // sampleId -> { buffer, name, duration }
    this.voices = []; // { voice, bank, pad, isNoteOn }
    this.padFxSlots = [null, null, null, null]; // { padNumber, instance, name }
    this.knobFxInstance = null;
    this.knobFxName = null;
    this.compressorInstance = null;
    this.compressorBypassed = true;
    this.micStream = null;
    this.listeners = new Set();
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    this.preFxBus = this.ctx.createGain();
    this.padFxChainOut = this.ctx.createGain();
    this.preFxBus.connect(this.padFxChainOut); // rewired dynamically as slots engage

    this.postFxBus = this.ctx.createGain();
    this.flexBeatDry = this.ctx.createGain();
    this.flexBeatWet = this.ctx.createGain();
    this.flexBeatWet.gain.value = 0;
    this.padFxChainOut.connect(this.flexBeatDry);
    this.padFxChainOut.connect(this.flexBeatWet);
    this.flexBeatDry.connect(this.postFxBus);
    this.flexBeatWetOut = this.ctx.createGain();
    this.flexBeatWetOut.connect(this.postFxBus);
    this.flexBeatInstance = null;

    this.knobFxAllPadsInput = this.ctx.createGain();
    this.knobFxAllPadsOutput = this.ctx.createGain();
    this.postFxBus.connect(this.knobFxAllPadsInput);
    this.knobFxAllPadsInput.connect(this.knobFxAllPadsOutput); // bypassed by default

    this.compressorInput = this.ctx.createGain();
    this.compressorOutput = this.ctx.createGain();
    this.knobFxAllPadsOutput.connect(this.compressorInput);
    this.compressorInput.connect(this.compressorOutput); // bypassed by default
    this.compressorOutput.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);

    this.kitGain = this.ctx.createGain(); // "Kit Volume" - overall level of all pad voices, distinct from Main Volume
    this.kitGain.connect(this.preFxBus);
    this.knobFxPerPadBus = this.ctx.createGain();
    this.knobFxPerPadBus.connect(this.kitGain);
    this.dryVoiceBus = this.ctx.createGain();
    this.dryVoiceBus.connect(this.kitGain);

    this.meterAnalyser = this.ctx.createAnalyser();
    this.meterAnalyser.fftSize = 256;
    this.masterGain.connect(this.meterAnalyser);

    return this.ctx;
  }

  resume() {
    this.ensureContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  onVoiceCountChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notifyVoiceCount() {
    this.listeners.forEach((cb) => cb(this.voices.length));
  }

  // --- Sample management ---
  registerBuffer(buffer, name) {
    const id = nextId('smp');
    const duration = Math.min(buffer.duration, MAX_SAMPLE_SECONDS);
    this.buffers.set(id, { buffer, name, duration });
    return { id, name, duration };
  }

  async loadSampleFromFile(file) {
    this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    return this.registerBuffer(buffer, file.name.replace(/\.[^/.]+$/, ''));
  }

  async loadDemoKit() {
    this.ensureContext();
    const kit = await buildDemoKit(this.ctx);
    return kit.map(({ name, buffer }) => this.registerBuffer(buffer, name));
  }

  getBufferEntry(sampleId) {
    return this.buffers.get(sampleId);
  }

  // --- Voice pool ---
  stealOldestVoiceIfNeeded() {
    if (this.voices.length < MAX_VOICES) return;
    const oldest = this.voices.reduce((a, b) => (a.voice.startedAt < b.voice.startedAt ? a : b));
    oldest.voice.stop();
    this.voices = this.voices.filter((v) => v !== oldest);
  }

  isPadAffectedByKnobFx(bank, pad, knobFxState) {
    if (!knobFxState || knobFxState.bypass || !this.knobFxInstance) return false;
    if (knobFxState.allPads) return false; // handled on the bus, not per-voice
    return !!knobFxState.affectedPads[`${bank}-${pad}`];
  }

  triggerPad(padState, { bank, pad, velocity, sliceOverride, knobFxState, when }) {
    this.ensureContext();
    this.resume();
    const entry = padState.sampleId ? this.buffers.get(padState.sampleId) : null;
    if (!entry) return null;

    this.stealOldestVoiceIfNeeded();

    const effectivePad = sliceOverride ? { ...padState, ...sliceOverride } : padState;
    const isNoteOn = !!padState.noteOn;
    const startTime = when != null ? Math.max(when, this.ctx.currentTime) : this.ctx.currentTime;

    if (effectivePad.play.polyphony === 'Mono') {
      this.voices
        .filter((v) => v.bank === bank && v.pad === pad)
        .forEach((v) => v.voice.stop());
      this.voices = this.voices.filter((v) => !(v.bank === bank && v.pad === pad));
    }

    if (effectivePad.play.muteGroup !== 'Off') {
      this.voices
        .filter((v) => v.muteGroup === effectivePad.play.muteGroup && v.muteGroup !== undefined)
        .forEach((v) => v.voice.stop());
      this.voices = this.voices.filter((v) => v.muteGroup !== effectivePad.play.muteGroup);
    }

    const destination = this.isPadAffectedByKnobFx(bank, pad, knobFxState)
      ? this.knobFxPerPadBus
      : this.dryVoiceBus;

    const voice = createPadVoice(this.ctx, {
      buffer: entry.buffer,
      pad: effectivePad,
      velocity,
      destination,
      now: startTime,
      isNoteOn,
    });

    const record = { voice, bank, pad, isNoteOn, muteGroup: effectivePad.play.muteGroup !== 'Off' ? effectivePad.play.muteGroup : undefined };
    this.voices.push(record);
    this.notifyVoiceCount();

    voice.source.onended = () => {
      this.voices = this.voices.filter((v) => v.voice !== voice);
      this.notifyVoiceCount();
    };

    return voice;
  }

  releasePad(bank, pad) {
    this.voices
      .filter((v) => v.bank === bank && v.pad === pad && v.isNoteOn)
      .forEach((v) => v.voice.release());
  }

  stopAll() {
    this.voices.forEach((v) => v.voice.stop());
    this.voices = [];
    this.notifyVoiceCount();
  }

  // --- Pad FX (up to 4 concurrent, oldest bypassed on 5th, re-engage on release) ---
  engagePadFx(padNumber, name) {
    this.ensureContext();
    const already = this.padFxSlots.findIndex((s) => s && s.padNumber === padNumber);
    if (already !== -1) return;
    let slotIndex = this.padFxSlots.findIndex((s) => s === null);
    let bypassedName = null;
    if (slotIndex === -1) {
      const evicted = this.padFxSlots[0];
      bypassedName = evicted.padNumber;
      evicted.instance.dispose();
      this.padFxSlots.shift();
      this.padFxSlots.push(null);
      slotIndex = 3;
    }
    const instance = createEffectInstance(this.ctx, name);
    if (!instance) return;
    this.padFxSlots[slotIndex] = { padNumber, name, instance };
    this.rewirePadFxChain();
    return bypassedName;
  }

  disengagePadFx(padNumber) {
    const idx = this.padFxSlots.findIndex((s) => s && s.padNumber === padNumber);
    if (idx === -1) return;
    this.padFxSlots[idx].instance.dispose();
    this.padFxSlots[idx] = null;
    this.rewirePadFxChain();
  }

  setPadFxParams(padNumber, params, bpm) {
    const slot = this.padFxSlots.find((s) => s && s.padNumber === padNumber);
    if (slot) slot.instance.setParams(params, bpm);
  }

  rewirePadFxChain() {
    try {
      this.preFxBus.disconnect();
    } catch (e) { /* ignore */ }
    const active = this.padFxSlots.filter(Boolean);
    let node = this.preFxBus;
    active.forEach((slot) => {
      node.connect(slot.instance.input);
      node = slot.instance.output;
    });
    node.connect(this.padFxChainOut);
  }

  // --- Flex Beat (single time-based warp effect applied to the whole sequence) ---
  engageFlexBeat(slotIndex, params, bpm) {
    this.ensureContext();
    this.disengageFlexBeat();
    const instance = createFlexWarpEffect(this.ctx, slotIndex);
    if (!instance) return;
    this.flexBeatInstance = instance;
    this.flexBeatWet.connect(instance.input);
    instance.output.connect(this.flexBeatWetOut);
    instance.setParams(params, bpm);
    if (this.flexBeatOneShotTimer) clearTimeout(this.flexBeatOneShotTimer);
    if (params.oneShot) {
      this.flexBeatOneShotTimer = setTimeout(() => this.disengageFlexBeat(), params.oneShotDurationMs ?? 2000);
    }
  }

  disengageFlexBeat() {
    if (this.flexBeatOneShotTimer) {
      clearTimeout(this.flexBeatOneShotTimer);
      this.flexBeatOneShotTimer = null;
    }
    if (!this.flexBeatInstance) return;
    try {
      this.flexBeatWet.disconnect(this.flexBeatInstance.input);
      this.flexBeatInstance.output.disconnect(this.flexBeatWetOut);
    } catch (e) { /* ignore */ }
    this.flexBeatInstance.dispose();
    this.flexBeatInstance = null;
    this.flexBeatWet.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    this.flexBeatDry.gain.setTargetAtTime(1, this.ctx.currentTime, 0.02);
  }

  setFlexBeatMix(mixPercent) {
    this.ensureContext();
    const wet = Math.max(0, Math.min(100, mixPercent)) / 100;
    this.flexBeatWet.gain.setTargetAtTime(this.flexBeatInstance ? wet : 0, this.ctx.currentTime, 0.02);
    this.flexBeatDry.gain.setTargetAtTime(1 - wet, this.ctx.currentTime, 0.02);
  }

  // --- Knob FX (single effect, applied to specific pads or all pads) ---
  setKnobFxEffect(name) {
    this.ensureContext();
    if (this.knobFxInstance) {
      this.knobFxInstance.dispose();
      try {
        this.knobFxAllPadsInput.disconnect();
        this.knobFxPerPadBus.disconnect();
      } catch (e) { /* ignore */ }
      this.knobFxAllPadsInput.connect(this.knobFxAllPadsOutput);
      this.knobFxPerPadBus.connect(this.kitGain);
    }
    this.knobFxName = name;
    this.knobFxInstance = createEffectInstance(this.ctx, name);
  }

  updateKnobFxRouting({ allPads, bypass }) {
    if (!this.knobFxInstance) return;
    try {
      this.knobFxAllPadsInput.disconnect();
      this.knobFxPerPadBus.disconnect();
    } catch (e) { /* ignore */ }

    if (bypass) {
      this.knobFxAllPadsInput.connect(this.knobFxAllPadsOutput);
      this.knobFxPerPadBus.connect(this.kitGain);
      return;
    }
    if (allPads) {
      this.knobFxAllPadsInput.connect(this.knobFxInstance.input);
      this.knobFxInstance.output.connect(this.knobFxAllPadsOutput);
      this.knobFxPerPadBus.connect(this.kitGain);
    } else {
      this.knobFxAllPadsInput.connect(this.knobFxAllPadsOutput);
      this.knobFxPerPadBus.connect(this.knobFxInstance.input);
      this.knobFxInstance.output.connect(this.kitGain);
    }
  }

  setKnobFxParams(params, bpm) {
    if (this.knobFxInstance) this.knobFxInstance.setParams(params, bpm);
  }

  // --- Compressor (master bus insert) ---
  setKitVolume(db) {
    this.ensureContext();
    this.kitGain.gain.setTargetAtTime(Math.pow(10, db / 20), this.ctx.currentTime, 0.01);
  }

  setCompressorState({ bypass, attack, release, amount, inBoost, color }) {
    this.ensureContext();
    if (!this.compressorInstance) {
      this.compressorInstance = this.ctx.createDynamicsCompressor();
      this.compressorColorShaper = this.ctx.createWaveShaper();
      this.compressorBoost = this.ctx.createGain();
    }
    try {
      this.compressorInput.disconnect();
    } catch (e) { /* ignore */ }
    if (bypass) {
      this.compressorInput.connect(this.compressorOutput);
      return;
    }
    const boostLinear = Math.pow(10, (inBoost ?? 0) / 20);
    this.compressorBoost.gain.setTargetAtTime(boostLinear, this.ctx.currentTime, 0.01);
    this.compressorInstance.threshold.setTargetAtTime(-1 - (amount ?? 30) * 0.4, this.ctx.currentTime, 0.01);
    this.compressorInstance.ratio.setTargetAtTime(1 + (amount ?? 30) / 6, this.ctx.currentTime, 0.01);
    this.compressorInstance.attack.setTargetAtTime((attack ?? 20) / 1000, this.ctx.currentTime, 0.01);
    this.compressorInstance.release.setTargetAtTime((release ?? 100) / 1000, this.ctx.currentTime, 0.01);

    this.compressorInput.connect(this.compressorBoost);
    if (color) {
      const n = 1024;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 1.5) * 1.05;
      }
      this.compressorColorShaper.curve = curve;
      this.compressorBoost.connect(this.compressorColorShaper);
      this.compressorColorShaper.connect(this.compressorInstance);
    } else {
      this.compressorBoost.connect(this.compressorInstance);
    }
    this.compressorInstance.connect(this.compressorOutput);
  }

  // --- Mic input for Sample Record mode ---
  async getMicStream() {
    if (this.micStream) return this.micStream;
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return this.micStream;
  }

  getResampleStream() {
    this.ensureContext();
    if (!this.resampleDestination) {
      this.resampleDestination = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.resampleDestination);
    }
    return this.resampleDestination.stream;
  }

  attachInputMonitor(stream, shouldMonitor) {
    this.ensureContext();
    this.detachInputMonitor();
    this.inputSourceNode = this.ctx.createMediaStreamSource(stream);
    this.inputCapture = createLiveCapture(this.ctx, 25);
    this.inputSourceNode.connect(this.inputCapture.node);
    this.inputMeterAnalyser = this.ctx.createAnalyser();
    this.inputMeterAnalyser.fftSize = 256;
    this.inputSourceNode.connect(this.inputMeterAnalyser);
    if (shouldMonitor) {
      this.inputMonitorGain = this.ctx.createGain();
      this.inputSourceNode.connect(this.inputMonitorGain).connect(this.masterGain);
    }
  }

  detachInputMonitor() {
    if (this.inputSourceNode) {
      try {
        this.inputSourceNode.disconnect();
      } catch (e) { /* ignore */ }
      this.inputSourceNode = null;
    }
    this.inputCapture = null;
    this.inputMonitorGain = null;
  }

  getInputCaptureSnapshot(seconds) {
    if (!this.inputCapture) return null;
    return this.inputCapture.snapshot(seconds);
  }

  getInputMeterLevel() {
    if (!this.inputMeterAnalyser) return 0;
    const data = new Uint8Array(this.inputMeterAnalyser.frequencyBinCount);
    this.inputMeterAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  getMeterLevel() {
    if (!this.meterAnalyser) return 0;
    const data = new Uint8Array(this.meterAnalyser.frequencyBinCount);
    this.meterAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }
}

export const audioEngine = new AudioEngine();
