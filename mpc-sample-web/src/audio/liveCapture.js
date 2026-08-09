// Continuously captures the last N seconds of a live audio signal into a circular buffer so
// buffer-based effects (Beat Repeat, Rev Stepper, Granulator, Half Speed) can read real slices
// of "what just played" the same way the hardware's live DSP would. Uses ScriptProcessorNode -
// deprecated but universally supported and far simpler than an AudioWorklet module for this use
// case; see README for the tradeoff note.

export function createLiveCapture(ctx, seconds = 4) {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const bufferL = new Float32Array(length);
  const bufferR = new Float32Array(length);
  let writeIndex = 0;

  const processor = ctx.createScriptProcessor(2048, 2, 2);
  processor.onaudioprocess = (e) => {
    const inL = e.inputBuffer.getChannelData(0);
    const inR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inL;
    const outL = e.outputBuffer.getChannelData(0);
    const outR = e.outputBuffer.getChannelData(1);
    for (let i = 0; i < inL.length; i++) {
      bufferL[writeIndex] = inL[i];
      bufferR[writeIndex] = inR[i];
      writeIndex = (writeIndex + 1) % length;
      outL[i] = inL[i];
      outR[i] = inR[i];
    }
  };

  function snapshot(durationSeconds) {
    const sampleCount = Math.min(length, Math.floor(durationSeconds * ctx.sampleRate));
    const out = ctx.createBuffer(2, sampleCount, ctx.sampleRate);
    const outL = out.getChannelData(0);
    const outR = out.getChannelData(1);
    for (let i = 0; i < sampleCount; i++) {
      const idx = (writeIndex - sampleCount + i + length * 4) % length;
      outL[i] = bufferL[idx];
      outR[i] = bufferR[idx];
    }
    return out;
  }

  return { node: processor, snapshot };
}
