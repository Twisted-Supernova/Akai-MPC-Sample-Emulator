import { createPadVoice } from './padVoice';
import { audioBufferToWavBlob } from './wavEncoder';
import { padKey, seqKey } from '../state/projectReducer';
import { PPQN, TICKS_PER_BAR } from '../data/constants';

// Renders Song Mode to a downloadable WAV via OfflineAudioContext. This replays each sequence's
// pad hits (amp/filter/envelope/tune/chop/loop faithfully reproduced) through the project's
// Compressor setting. Pad FX / Knob FX / Flex Beat are live-performance effects driven by
// real-time gestures rather than stored per-event automation in this data model, so they are not
// replayed in the offline render - see README for this simplification.
export async function renderSongToWavBlob(project, engine) {
  if (!project.song.length) return null;

  const stepDurations = project.song.map(({ bank, seq }) => {
    const sequence = project.sequences[seqKey(bank, seq)];
    const bpm = sequence.bpmMode === 'SEQ' ? sequence.bpm : project.globalBpm;
    return (sequence.bars * TICKS_PER_BAR / PPQN) * (60 / bpm);
  });
  const totalDuration = stepDurations.reduce((a, b) => a + b, 0) + 1;

  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(2, Math.ceil(totalDuration * 44100), 44100);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 0.9;

  let compressorTarget = masterGain;
  if (!project.compressor.bypass) {
    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.value = -1 - project.compressor.amount * 0.4;
    comp.ratio.value = 1 + project.compressor.amount / 6;
    comp.attack.value = project.compressor.attack / 1000;
    comp.release.value = project.compressor.release / 1000;
    comp.connect(masterGain);
    compressorTarget = comp;
  }
  masterGain.connect(offlineCtx.destination);

  let cursor = 0;
  project.song.forEach(({ bank, seq }, i) => {
    const sequence = project.sequences[seqKey(bank, seq)];
    const bpm = sequence.bpmMode === 'SEQ' ? sequence.bpm : project.globalBpm;
    const secPerTick = 60 / bpm / PPQN;
    sequence.events.forEach((event) => {
      const pad = project.pads[padKey(event.padBank, event.pad)];
      if (!pad?.sampleId || pad.muted) return;
      const entry = engine.getBufferEntry(pad.sampleId);
      if (!entry) return;
      const when = cursor + event.tick * secPerTick;
      if (when >= totalDuration) return;
      createPadVoice(offlineCtx, {
        buffer: entry.buffer,
        pad,
        velocity: event.velocity ?? 0.85,
        destination: compressorTarget,
        now: when,
        isNoteOn: !!pad.noteOn,
      });
    });
    cursor += stepDurations[i];
  });

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWavBlob(rendered);
}
