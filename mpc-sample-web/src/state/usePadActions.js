import { useCallback } from 'react';
import { useProjectState } from './ProjectContext';
import { MODES, PAD_GRID_MODES } from './uiReducer';
import { padKey, seqKey } from './projectReducer';
import { chopByThreshold, chopByRegions } from '../audio/chopAnalysis';
import { flexBeatParamsForSlot } from '../audio/effects';

export function usePadActions() {
  const {
    project, dispatchProject, ui, dispatchUi, engine,
    recordingState, startSampleRecording, stopSampleRecording, registerSample,
  } = useProjectState();

  const currentBpm = useCallback(() => {
    const seq = project.sequences[seqKey(project.currentSeqBank, project.currentSeq)];
    return seq.bpmMode === 'SEQ' ? seq.bpm : project.globalBpm;
  }, [project]);

  const getVelocity = useCallback(
    (e) => {
      if (ui.fullLevelOverride) return 1;
      if (e && typeof e.pressure === 'number' && e.pressure > 0) return e.pressure;
      return 0.85;
    },
    [ui.fullLevelOverride]
  );

  const triggerSamplePad = useCallback(
    (padNum, velocity, e) => {
      const bank = project.currentPadBank;
      const pad = project.pads[padKey(bank, padNum)];

      // Tapping a pad always selects it for viewing/editing on the display (Manual p.24: "Press a
      // PAD to trigger it and view its sample on the display") - Mute/Chop repurpose the grid for
      // a different job (toggling mute, picking a slice of the *current* pad) so they don't shift
      // the selection.
      if (ui.padGridMode !== PAD_GRID_MODES.MUTE && ui.padGridMode !== PAD_GRID_MODES.CHOP) {
        dispatchProject({ type: 'SET_CURRENT_PAD', pad: padNum });
      }

      if (!pad.sampleId) return;

      if (ui.padGridMode === PAD_GRID_MODES.MUTE) {
        dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch: { muted: !pad.muted } });
        return;
      }

      if (ui.padGridMode === PAD_GRID_MODES.CHOP) {
        const slice = pad.chop.slices[padNum - 1] ?? pad.chop.slices[pad.chop.selectedSlice];
        dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: padNum, field: 'chop', patch: { selectedSlice: padNum - 1 } });
        if (slice) {
          engine.triggerPad(pad, {
            bank,
            pad: padNum,
            velocity,
            sliceOverride: { start: slice.start, end: slice.end, loop: false },
            knobFxState: project.knobFx,
          });
        }
        return;
      }

      if (pad.muted) return;

      let sliceOverride;
      if (pad.sixteenLevels.active) {
        sliceOverride = sixteenLevelsOverride(pad, padNum);
        engine.triggerPad(pad, { bank, pad: padNum, velocity, sliceOverride, knobFxState: project.knobFx });
        return;
      }

      engine.triggerPad(pad, { bank, pad: padNum, velocity, knobFxState: project.knobFx });

      if (ui.recordingSeq && ui.playing) {
        recordEvent(bank, padNum, velocity);
      }
    },
    [project, ui, engine, dispatchProject]
  );

  function sixteenLevelsOverride(pad, padNum) {
    const type = pad.sixteenLevels.type;
    if (type === 'Tune') {
      const semitoneOffset = padNum - 4;
      return { tune: { ...pad.tune, semi: Math.max(-24, Math.min(24, pad.tune.semi + semitoneOffset)) } };
    }
    if (type === 'Filter') {
      const t = (padNum - 1) / 15;
      const cutoff = Math.round(t * 127);
      return { filter: { ...pad.filter, cutoff } };
    }
    return {}; // Velocity type handled via velocity scale directly by caller
  }

  const recordEvent = useCallback(
    (bank, padNum, velocity) => {
      const tick = ui.playheadTick;
      dispatchProject({
        type: 'ADD_SEQUENCE_EVENT',
        event: { padBank: bank, pad: padNum, tick, velocity },
      });
    },
    [ui.playheadTick, dispatchProject]
  );

  const releaseSamplePad = useCallback(
    (padNum) => {
      const bank = project.currentPadBank;
      engine.releasePad(bank, padNum);
    },
    [project.currentPadBank, engine]
  );

  const selectSequencePad = useCallback(
    (padNum) => {
      dispatchProject({ type: 'SET_CURRENT_SEQ', seq: padNum });
      if (ui.playing) {
        dispatchUi({ type: 'SET_QUEUED_SEQ', seq: { bank: project.currentSeqBank, seq: padNum } });
      }
    },
    [dispatchProject, dispatchUi, ui.playing, project.currentSeqBank]
  );

  const triggerPadFx = useCallback(
    (padNum, velocity) => {
      const bpm = currentBpm();
      const bypassedNum = engine.engagePadFx(padNum, PAD_FX_NAME(padNum));
      engine.setPadFxParams(padNum, {}, bpm);
      const padFx = { ...project.padFx };
      padFx.active = { ...padFx.active, [padNum]: { amount: velocity } };
      if (bypassedNum) delete padFx.active[bypassedNum];
      dispatchProject({ type: 'SET_PAD_FX_STATE', padFx });
    },
    [engine, project.padFx, dispatchProject, currentBpm]
  );

  const releasePadFx = useCallback(
    (padNum) => {
      const latched = project.padFx.latchOrder.includes(padNum);
      if (latched) return;
      engine.disengagePadFx(padNum);
      const padFx = { ...project.padFx, active: { ...project.padFx.active } };
      delete padFx.active[padNum];
      dispatchProject({ type: 'SET_PAD_FX_STATE', padFx });
    },
    [engine, project.padFx, dispatchProject]
  );

  const toggleKnobFxPad = useCallback(
    (padNum) => {
      const bank = project.currentPadBank;
      const key = `${bank}-${padNum}`;
      const affectedPads = { ...project.knobFx.affectedPads };
      affectedPads[key] = !affectedPads[key];
      dispatchProject({ type: 'SET_KNOB_FX', patch: { affectedPads } });
    },
    [project, dispatchProject]
  );

  const toggleSampleRecordPad = useCallback(
    async (padNum) => {
      const bank = project.currentPadBank;
      if (recordingState.recording) {
        if (recordingState.pad !== padNum) return;
        const blob = await stopSampleRecording();
        if (!blob || blob.size === 0) return;
        const arrayBuffer = await blob.arrayBuffer();
        try {
          const buffer = await engine.ctx.decodeAudioData(arrayBuffer);
          const entry = engine.registerBuffer(buffer, `Rec-${bank}${String(padNum).padStart(2, '0')}`);
          registerSample(entry);
          dispatchProject({ type: 'LOAD_SAMPLE_TO_PAD', bank, pad: padNum, sampleId: entry.id, name: entry.name });
        } catch (err) {
          dispatchUi({ type: 'SET_ERROR', message: 'Could not decode recording' });
        }
        return;
      }
      const source = project.inputConfig.source;
      let stream = null;
      if (source === 'Mic') {
        try {
          stream = await engine.getMicStream();
        } catch (err) {
          dispatchUi({ type: 'SET_ERROR', message: 'Microphone permission denied' });
          return;
        }
      } else if (source === 'Resample') {
        stream = engine.getResampleStream();
      } else {
        dispatchUi({ type: 'SET_ERROR', message: `${source} input is hardware-only - not available in a browser` });
        return;
      }
      startSampleRecording(bank, padNum, stream);
    },
    [project, recordingState, engine, startSampleRecording, stopSampleRecording, registerSample, dispatchProject, dispatchUi]
  );

  const triggerFlexBeat = useCallback(
    (padNum) => {
      dispatchProject({ type: 'SET_FLEX_BEAT', patch: { activeSlot: padNum } });
      if (padNum === 1) {
        engine.disengageFlexBeat();
        return;
      }
      const bpm = currentBpm();
      const params = {
        ...flexBeatParamsForSlot(padNum),
        oneShot: project.flexBeat.mode === 'One Shot',
        mix: project.flexBeat.mix,
      };
      engine.engageFlexBeat(padNum, params, bpm);
      engine.setFlexBeatMix(project.flexBeat.mix);
    },
    [engine, dispatchProject, currentBpm, project.flexBeat]
  );

  const handlePadDown = useCallback(
    (padNum, e) => {
      const velocity = getVelocity(e);

      if (ui.flexBeatOpen) {
        triggerFlexBeat(padNum);
        return;
      }

      if (ui.eraseArmed) {
        const bank = project.currentPadBank;
        if (ui.mode === MODES.SEQUENCE) {
          dispatchProject({ type: 'SET_SEQUENCE_EVENTS', bank: project.currentSeqBank, seq: padNum, events: [] });
        } else {
          dispatchProject({
            type: 'REMOVE_SEQUENCE_EVENTS_FOR_PAD',
            bank: project.currentSeqBank,
            seq: project.currentSeq,
            padBank: bank,
            pad: padNum,
          });
          if (ui.mode === MODES.SAMPLE) {
            dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch: { sampleId: null, name: '' } });
          }
        }
        return;
      }

      if (ui.copySource) {
        dispatchUi({ type: 'TOGGLE_COPY_TARGET', target: { bank: project.currentPadBank, pad: padNum } });
        return;
      }

      if (ui.mode === MODES.SAMPLE_RECORD) {
        toggleSampleRecordPad(padNum);
        return;
      }
      // While Seq Record is armed, pads return to sample-triggering so you can play/record a
      // performance, even though Sequence Mode's screen stays visible (Manual p.9/41).
      if (ui.mode === MODES.SEQUENCE && !ui.seqArmed) {
        selectSequencePad(padNum);
        return;
      }
      if (ui.mode === MODES.PAD_FX) {
        triggerPadFx(padNum, velocity);
        return;
      }
      if (ui.mode === MODES.KNOB_FX) {
        toggleKnobFxPad(padNum);
        return;
      }
      triggerSamplePad(padNum, velocity, e);
    },
    [ui, project, getVelocity, selectSequencePad, triggerPadFx, toggleKnobFxPad, triggerSamplePad, toggleSampleRecordPad, triggerFlexBeat, dispatchUi, dispatchProject]
  );

  const handlePadUp = useCallback(
    (padNum) => {
      if (ui.mode === MODES.SAMPLE || (ui.mode === MODES.SEQUENCE && ui.seqArmed)) releaseSamplePad(padNum);
      if (ui.mode === MODES.PAD_FX) releasePadFx(padNum);
    },
    [ui.mode, ui.seqArmed, releaseSamplePad, releasePadFx]
  );

  const runChop = useCallback(
    (bank, padNum, type, thresholdOverride) => {
      const pad = project.pads[padKey(bank, padNum)];
      const entry = engine.getBufferEntry(pad.sampleId);
      if (!entry) return;
      let slices;
      const threshold = thresholdOverride ?? pad.chop.threshold;
      if (type === 'Threshold') slices = chopByThreshold(entry.buffer, threshold);
      else if (type === 'Regions 4') slices = chopByRegions(4);
      else if (type === 'Regions 8') slices = chopByRegions(8);
      else if (type === 'Regions 16') slices = chopByRegions(16);
      else slices = pad.chop.slices.length ? pad.chop.slices : [{ start: 0, end: 1 }];
      dispatchProject({
        type: 'UPDATE_PAD_NESTED',
        bank,
        pad: padNum,
        field: 'chop',
        patch: { type, slices, threshold, selectedSlice: 0 },
      });
    },
    [project, engine, dispatchProject]
  );

  return {
    handlePadDown,
    handlePadUp,
    runChop,
    getVelocity,
  };
}

function PAD_FX_NAME(padNum) {
  const names = [
    'Half Speed', 'Chorus', 'Flanger', 'Phaser', 'Comb Filter', 'LP Filter', 'HP Filter', 'BP Filter',
    'Ring Mod', 'LoFi', 'Color', 'Granulator', 'Beat Repeat', 'Rev Stepper', 'Delay', 'Reverb',
  ];
  return names[padNum - 1];
}
