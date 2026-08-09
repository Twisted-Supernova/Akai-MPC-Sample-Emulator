import { useMemo } from 'react';
import { useProjectState } from './ProjectContext';
import { MODES } from './uiReducer';
import { padKey, seqKey, createInitialProject } from './projectReducer';

// Central legend for the B1/B2/B3 function buttons - mirrors useKnobBindings for K1-K3.
function normalizeSample(engine, pad, applyPatch) {
  const entry = pad.sampleId ? engine.getBufferEntry(pad.sampleId) : null;
  if (!entry) return;
  const { buffer } = entry;
  const startSample = Math.floor(pad.start * buffer.length);
  const endSample = Math.max(startSample + 1, Math.floor(pad.end * buffer.length));
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = startSample; i < endSample; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }
  if (peak <= 0.0001) return;
  const neededDb = -20 * Math.log10(peak);
  applyPatch({ volume: Math.max(-74, Math.min(6, neededDb)) });
}

export function useButtonBindings() {
  const { project, dispatchProject, ui, dispatchUi, engine } = useProjectState();

  return useMemo(() => {
    if (ui.compressorOpen) {
      const c = project.compressor;
      return {
        b1: {
          label: 'Color',
          onClick: () => dispatchProject({ type: 'SET_COMPRESSOR', patch: { color: !c.color } }),
        },
        b2: { label: '' },
        b3: {
          label: c.bypass ? 'Bypassed' : 'Bypass',
          onClick: () => dispatchProject({ type: 'SET_COMPRESSOR', patch: { bypass: !c.bypass } }),
        },
      };
    }

    if (ui.flexBeatOpen) {
      return {
        b1: { label: '' },
        b2: { label: '' },
        b3: {
          label: project.flexBeat.quantize ? 'Quantize: On' : 'Quantize: Off',
          onClick: () => dispatchProject({ type: 'SET_FLEX_BEAT', patch: { quantize: !project.flexBeat.quantize } }),
        },
      };
    }

    if (ui.midiConfigOpen) {
      return {
        b1: { label: 'Back', onClick: () => dispatchUi({ type: 'CLOSE_MENU', menu: 'midiConfigOpen' }) },
        b2: {
          label: 'Reset Settings',
          onClick: () => {
            if (!window.confirm('Reset all settings to factory defaults?')) return;
            const fresh = createInitialProject();
            dispatchProject({ type: 'SET_MIDI_CONFIG', patch: fresh.midiConfig });
            dispatchProject({ type: 'SET_INPUT_CONFIG', patch: fresh.inputConfig });
            dispatchProject({ type: 'SET_FADER_MENU', patch: fresh.faderMenu });
            dispatchProject({ type: 'SET_TIME_CORRECT', patch: fresh.timeCorrect });
            dispatchProject({ type: 'SET_COMPRESSOR', patch: fresh.compressor });
          },
        },
        b3: {
          label: 'Reset Data',
          onClick: () => {
            if (!window.confirm('This deletes all user content and cannot be undone. Continue?')) return;
            dispatchProject({ type: 'LOAD_PROJECT', project: createInitialProject() });
            dispatchUi({ type: 'CLOSE_ALL_MENUS' });
          },
        },
      };
    }

    const bank = project.currentPadBank;
    const padNum = project.currentPad;
    const pad = project.pads[padKey(bank, padNum)];

    if (ui.mode === MODES.SAMPLE) {
      return {
        b1: {
          label: ui.sampleTabs.b1,
          onClick: () => dispatchUi({ type: 'CYCLE_SAMPLE_TAB', group: 'b1' }),
          shiftLabel: 'Loop Lock',
          onShiftClick: () => dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch: { loopLock: !pad.loopLock } }),
        },
        b2: {
          label: ui.sampleTabs.b2,
          onClick: () => dispatchUi({ type: 'CYCLE_SAMPLE_TAB', group: 'b2' }),
          shiftLabel: 'Normalize',
          onShiftClick: () =>
            normalizeSample(engine, pad, (patch) => dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch })),
        },
        b3: {
          label: ui.sampleTabs.b3,
          onClick: () => dispatchUi({ type: 'CYCLE_SAMPLE_TAB', group: 'b3' }),
        },
      };
    }

    if (ui.mode === MODES.SEQUENCE) {
      const seqK = seqKey(project.currentSeqBank, project.currentSeq);
      const seq = project.sequences[seqK];
      return {
        b1: { label: 'BPM', onClick: () => {} },
        b2: {
          label: `BPM:${seq.bpmMode}`,
          onClick: () =>
            dispatchProject({
              type: 'UPDATE_SEQUENCE',
              bank: project.currentSeqBank,
              seq: project.currentSeq,
              patch: { bpmMode: seq.bpmMode === 'SEQ' ? 'GBL' : 'SEQ' },
            }),
        },
        b3: {
          label: seq.recQuantize ? 'Rec Quant: On' : 'Rec Quant: Off',
          onClick: () =>
            dispatchProject({
              type: 'UPDATE_SEQUENCE',
              bank: project.currentSeqBank,
              seq: project.currentSeq,
              patch: { recQuantize: !seq.recQuantize },
            }),
        },
      };
    }

    if (ui.mode === MODES.PAD_FX) {
      const activePad = Number(Object.keys(project.padFx.active)[0]);
      return {
        b1: {
          label: 'Latch',
          onClick: () => {
            if (!activePad) return;
            const latched = project.padFx.latchOrder.includes(activePad);
            dispatchProject({
              type: 'SET_PAD_FX_STATE',
              padFx: {
                ...project.padFx,
                latchOrder: latched
                  ? project.padFx.latchOrder.filter((p) => p !== activePad)
                  : [...project.padFx.latchOrder, activePad],
              },
            });
          },
        },
        b2: { label: '' },
        b3: { label: '' },
      };
    }

    if (ui.mode === MODES.KNOB_FX) {
      return {
        b1: { label: 'FX Select', onClick: () => dispatchUi({ type: 'TOGGLE_MENU', menu: 'fxSelectOpen' }) },
        b2: {
          label: 'All Pads',
          onClick: () => dispatchProject({ type: 'SET_KNOB_FX', patch: { allPads: !project.knobFx.allPads } }),
        },
        b3: {
          label: 'Bypass',
          onClick: () => dispatchProject({ type: 'SET_KNOB_FX', patch: { bypass: !project.knobFx.bypass } }),
        },
      };
    }

    return { b1: { label: '' }, b2: { label: '' }, b3: { label: '' } };
  }, [project, ui, dispatchProject, dispatchUi, engine]);
}
