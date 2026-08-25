import { useMemo } from 'react';
import { useProjectState } from './ProjectContext';
import { MODES, PAD_GRID_MODES } from './uiReducer';
import { padKey, seqKey, activePadFxNumber } from './projectReducer';
import { PAD_FX_LIST, KNOB_FX_LIST, FILTER_TYPES } from '../data/constants';

// Enum-type params (Color's Mode, Delay's Time division, Amp Sim's Cab Model, etc.) are stored as
// their string value, but the Knob control needs a numeric 0..n-1 index to turn/display. This
// converts between the two consistently so dragging never produces NaN/undefined.
function buildParamBinding(p, rawStoredValue) {
  if (p.values) {
    const storedString = rawStoredValue ?? p.default ?? p.values[0];
    const index = Math.max(0, p.values.indexOf(storedString));
    return {
      value: index,
      min: 0,
      max: p.values.length - 1,
      isEnum: true,
      enumValues: p.values,
      formatValue: (v) => p.values[Math.round(v)] ?? '',
      toStored: (knobValue) => p.values[Math.round(knobValue)],
    };
  }
  return {
    value: rawStoredValue ?? p.default ?? p.min ?? 0,
    min: p.min ?? 0,
    max: p.max ?? 100,
    isEnum: false,
    enumValues: null,
    formatValue: (v) => `${Math.round(v * 100) / 100}${p.unit ?? ''}`,
    toStored: (knobValue) => knobValue,
  };
}

// Central "current knob/button legend": one source of truth for what K1-K3 (and B1-B3) currently
// do, consumed by both the physical Knob components and the Display footer labels - mirrors the
// hardware's context-sensitive control mapping (Manual Section 3 concept).
export function useKnobBindings() {
  const { project, dispatchProject, ui, engine } = useProjectState();

  return useMemo(() => {
    if (ui.compressorOpen) {
      const c = project.compressor;
      const patch = (p) => dispatchProject({ type: 'SET_COMPRESSOR', patch: p });
      return [
        { label: 'Attack', value: c.attack, min: 0.1, max: 150, onChange: (v) => patch({ attack: v }), formatValue: (v) => `${v.toFixed(1)}ms` },
        { label: 'Release', value: c.release, min: 3.0, max: 300, onChange: (v) => patch({ release: v }), formatValue: (v) => `${v.toFixed(1)}ms` },
        {
          label: ui.shiftHeld ? 'In Boost' : 'Amount',
          value: ui.shiftHeld ? c.inBoost : c.amount,
          min: ui.shiftHeld ? -12 : 0,
          max: ui.shiftHeld ? 12 : 100,
          onChange: (v) => patch(ui.shiftHeld ? { inBoost: v } : { amount: v }),
          formatValue: (v) => (ui.shiftHeld ? `${v.toFixed(1)}dB` : `${v.toFixed(0)}%`),
        },
      ];
    }

    if (ui.flexBeatOpen) {
      const fb = project.flexBeat;
      const patch = (p) => dispatchProject({ type: 'SET_FLEX_BEAT', patch: p });
      return [
        {
          label: 'Mode',
          value: fb.mode === 'Loop' ? 1 : 0,
          min: 0,
          max: 1,
          onChange: (v) => patch({ mode: Math.round(v) > 0 ? 'Loop' : 'One Shot' }),
          formatValue: (v) => (Math.round(v) > 0 ? 'Loop' : 'One Shot'),
        },
        { label: '', value: 0, min: 0, max: 1, onChange: () => {}, formatValue: () => '' },
        {
          label: 'Mix',
          value: fb.mix,
          min: 0,
          max: 100,
          onChange: (v) => {
            patch({ mix: Math.round(v) });
            engine.setFlexBeatMix(Math.round(v));
          },
          formatValue: (v) => `${Math.round(v)}%`,
        },
      ];
    }

    const bank = project.currentPadBank;
    const padNum = project.currentPad;
    const pad = project.pads[padKey(bank, padNum)];

    function patchPad(field, patch) {
      dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: padNum, field, patch });
    }
    function patchPadFlat(patch) {
      dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch });
    }

    if (ui.mode === MODES.SAMPLE) {
      if (ui.padGridMode === PAD_GRID_MODES.CHOP && ui.sampleTabs.active === 'b1') {
        const slice = pad.chop.slices[pad.chop.selectedSlice] ?? { start: 0, end: 1 };
        const setSlice = (patch) => {
          const slices = pad.chop.slices.slice();
          slices[pad.chop.selectedSlice] = { ...slice, ...patch };
          patchPad('chop', { slices });
        };
        return [
          { label: 'Start', value: slice.start, min: 0, max: 1, onChange: (v) => setSlice({ start: v }), formatValue: (v) => `${Math.round(v * 100)}%` },
          { label: 'End', value: slice.end, min: 0, max: 1, onChange: (v) => setSlice({ end: v }), formatValue: (v) => `${Math.round(v * 100)}%` },
          { label: 'Chop Type', value: 0, min: 0, max: 1, onChange: () => {}, formatValue: () => pad.chop.type },
        ];
      }

      if (ui.sampleTabs.active === 'b1') {
        if (ui.sampleTabs.b1 === 'Trim') {
          return [
            { label: 'Start', value: pad.start, min: 0, max: 1, onChange: (v) => patchPadFlat({ start: v }), formatValue: (v) => `${Math.round(v * 100)}%` },
            { label: 'End', value: pad.end, min: 0, max: 1, onChange: (v) => patchPadFlat({ end: v }), formatValue: (v) => `${Math.round(v * 100)}%` },
            { label: 'Loop', value: pad.loopStart, min: 0, max: 1, onChange: (v) => patchPadFlat({ loopStart: v }), formatValue: (v) => `${Math.round(v * 100)}%` },
          ];
        }
        if (ui.sampleTabs.b1 === 'Mix') {
          return [
            { label: 'Volume', value: pad.volume, min: -74, max: 6, onChange: (v) => patchPadFlat({ volume: v }), formatValue: (v) => `${v.toFixed(1)}dB` },
            { label: 'Pan', value: pad.pan, min: -50, max: 50, onChange: (v) => patchPadFlat({ pan: v }), formatValue: (v) => (v === 0 ? 'C' : v < 0 ? `${-v}L` : `${v}R`) },
            { label: '', value: 0, min: 0, max: 1, onChange: () => {}, formatValue: () => '' },
          ];
        }
        // Amp Env
        const decayLabel = pad.noteOn ? 'Release' : 'Decay';
        return [
          { label: 'Attack', value: pad.ampEnv.attack, min: 0, max: 127, onChange: (v) => patchPad('ampEnv', { attack: v }), formatValue: (v) => Math.round(v) },
          { label: decayLabel, value: pad.ampEnv.decay, min: 0, max: 127, onChange: (v) => patchPad('ampEnv', { decay: v }), formatValue: (v) => Math.round(v) },
          { label: 'Vel Sens', value: pad.ampEnv.velSens, min: 0, max: 127, onChange: (v) => patchPad('ampEnv', { velSens: v }), formatValue: (v) => Math.round(v) },
        ];
      }

      if (ui.sampleTabs.active === 'b2') {
        if (ui.sampleTabs.b2 === 'Tune') {
          return [
            { label: 'Semi Tune', value: pad.tune.semi, min: -24, max: 24, onChange: (v) => patchPad('tune', { semi: Math.round(v) }), formatValue: (v) => Math.round(v) },
            { label: 'Fine Tune', value: pad.tune.fine, min: -90, max: 90, onChange: (v) => patchPad('tune', { fine: Math.round(v) }), formatValue: (v) => Math.round(v) },
            { label: 'Warp', value: 0, min: 0, max: 1, onChange: () => {}, formatValue: () => String(pad.tune.warp) },
          ];
        }
        return [
          { label: 'Polyphony', value: pad.play.polyphony === 'Mono' ? 0 : 1, min: 0, max: 1, onChange: (v) => patchPad('play', { polyphony: v > 0.5 ? 'Poly' : 'Mono' }), formatValue: () => pad.play.polyphony },
          { label: 'Mute Grp', value: pad.play.muteGroup === 'Off' ? 0 : pad.play.muteGroup, min: 0, max: 16, onChange: (v) => patchPad('play', { muteGroup: v < 0.5 ? 'Off' : Math.round(v) }), formatValue: () => pad.play.muteGroup },
          { label: 'Offset', value: pad.play.offset, min: 0, max: 100, onChange: (v) => patchPad('play', { offset: v }), formatValue: (v) => `${Math.round(v)}%` },
        ];
      }

      // b3
      if (ui.sampleTabs.b3 === 'Filter') {
        return [
          { label: 'Cutoff', value: pad.filter.cutoff, min: 0, max: 127, onChange: (v) => patchPad('filter', { cutoff: v }), formatValue: (v) => Math.round(v) },
          { label: 'Reso', value: pad.filter.reso, min: 0, max: 127, onChange: (v) => patchPad('filter', { reso: v }), formatValue: (v) => Math.round(v) },
          { label: 'Type', value: 0, min: 0, max: 1, onChange: () => {}, formatValue: () => pad.filter.type, cycle: () => {
            const idx = FILTER_TYPES.indexOf(pad.filter.type);
            patchPad('filter', { type: FILTER_TYPES[(idx + 1) % FILTER_TYPES.length] });
          } },
        ];
      }
      return [
        { label: 'Attack', value: pad.filterEnv.attack, min: 0, max: 127, onChange: (v) => patchPad('filterEnv', { attack: v }), formatValue: (v) => Math.round(v) },
        { label: pad.noteOn ? 'Release' : 'Decay', value: pad.filterEnv.decay, min: 0, max: 127, onChange: (v) => patchPad('filterEnv', { decay: v }), formatValue: (v) => Math.round(v) },
        { label: 'Depth', value: pad.filterEnv.depth, min: 0, max: 127, onChange: (v) => patchPad('filterEnv', { depth: v }), formatValue: (v) => Math.round(v) },
      ];
    }

    if (ui.mode === MODES.SEQUENCE) {
      const seqK = seqKey(project.currentSeqBank, project.currentSeq);
      const seq = project.sequences[seqK];
      function patchSeq(patch) {
        dispatchProject({ type: 'UPDATE_SEQUENCE', bank: project.currentSeqBank, seq: project.currentSeq, patch });
      }
      return [
        { label: 'Bars', value: seq.bars, min: 1, max: 128, onChange: (v) => patchSeq({ bars: Math.round(v) }), formatValue: (v) => Math.round(v) },
        { label: 'Q', value: 0, min: 0, max: 1, onChange: () => {}, formatValue: () => seq.q, cycle: () => {
          const opts = ['1/4', '1/8', '1/16', '1/32', '1/16t', '1/8t'];
          const idx = opts.indexOf(seq.q);
          patchSeq({ q: opts[(idx + 1) % opts.length] });
        } },
        { label: 'RT Swing', value: seq.swing, min: 0, max: 75, onChange: (v) => patchSeq({ swing: Math.round(v) }), formatValue: (v) => `${Math.round(v)}%` },
      ];
    }

    if (ui.mode === MODES.PAD_FX) {
      const activePad = activePadFxNumber(project.padFx);
      if (!activePad) return [];
      const fx = PAD_FX_LIST[activePad - 1];
      const state = project.padFx.paramState?.[activePad] ?? {};
      return fx.params.map((p) => {
        const binding = buildParamBinding(p, state[p.key]);
        return {
          label: p.label,
          value: binding.value,
          min: binding.min,
          max: binding.max,
          isEnum: binding.isEnum,
          enumValues: binding.enumValues,
          unit: p.unit,
          onChange: (v) => {
            const paramState = { ...(project.padFx.paramState ?? {}) };
            paramState[activePad] = { ...(paramState[activePad] ?? {}), [p.key]: binding.toStored(v) };
            dispatchProject({ type: 'SET_PAD_FX_STATE', padFx: { ...project.padFx, paramState } });
            const seq = project.sequences[seqKey(project.currentSeqBank, project.currentSeq)];
            const bpm = seq.bpmMode === 'SEQ' ? seq.bpm : project.globalBpm;
            engine.setPadFxParams(activePad, paramState[activePad], bpm);
          },
          formatValue: binding.formatValue,
        };
      });
    }

    if (ui.mode === MODES.KNOB_FX) {
      const fx = KNOB_FX_LIST[project.knobFx.effectIndex];
      const params = ui.shiftHeld && fx.shiftParams ? fx.shiftParams : fx.params;
      const target = ui.shiftHeld ? 'shiftParams' : 'params';
      const state = project.knobFx[target] ?? {};
      return params.map((p) => {
        const binding = buildParamBinding(p, state[p.key]);
        return {
          label: p.label,
          value: binding.value,
          min: binding.min,
          max: binding.max,
          isEnum: binding.isEnum,
          enumValues: binding.enumValues,
          unit: p.unit,
          onChange: (v) => {
            const nextTargetState = { ...state, [p.key]: binding.toStored(v) };
            dispatchProject({ type: 'SET_KNOB_FX', patch: { [target]: nextTargetState } });
            const seq = project.sequences[seqKey(project.currentSeqBank, project.currentSeq)];
            const bpm = seq.bpmMode === 'SEQ' ? seq.bpm : project.globalBpm;
            engine.setKnobFxParams({ ...project.knobFx.params, ...(target === 'params' ? nextTargetState : {}) }, bpm);
          },
          formatValue: binding.formatValue,
        };
      });
    }

    return [];
  }, [project, ui, dispatchProject, engine]);
}
