import { useMemo } from 'react';
import { useProjectState } from './ProjectContext';
import { padKey } from './projectReducer';

const RANGES = {
  'Pad Volume': { min: -74, max: 6 },
  'Pad Pan': { min: -50, max: 50 },
  'Pad Tune': { min: -24, max: 24 },
  'Pad Amp Attack': { min: 0, max: 127 },
  'Pad Amp Decay': { min: 0, max: 127 },
  'Pad Filter Cutoff': { min: 0, max: 127 },
  'Kit Volume': { min: -74, max: 6 },
};

// Central binding for the physical Fader - what it reads/writes depends on the Fader menu's
// selected parameter (Manual: "Menus > Fader"), same "current control legend" pattern as
// useKnobBindings/useButtonBindings.
export function useFaderBinding() {
  const { project, dispatchProject, engine } = useProjectState();

  return useMemo(() => {
    const param = project.faderMenu.param;
    const range = RANGES[param] ?? { min: 0, max: 1 };
    const bank = project.currentPadBank;
    const padNum = project.currentPad;
    const pad = project.pads[padKey(bank, padNum)];

    function toPct(raw) {
      return (raw - range.min) / (range.max - range.min);
    }
    function fromPct(pct) {
      return range.min + pct * (range.max - range.min);
    }

    let raw = 0;
    let setRaw = () => {};

    switch (param) {
      case 'Pad Volume':
        raw = pad.volume;
        setRaw = (v) => dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch: { volume: v } });
        break;
      case 'Pad Pan':
        raw = pad.pan;
        setRaw = (v) => dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch: { pan: v } });
        break;
      case 'Pad Tune':
        raw = pad.tune.semi;
        setRaw = (v) => dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: padNum, field: 'tune', patch: { semi: Math.round(v) } });
        break;
      case 'Pad Amp Attack':
        raw = pad.ampEnv.attack;
        setRaw = (v) => dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: padNum, field: 'ampEnv', patch: { attack: v } });
        break;
      case 'Pad Amp Decay':
        raw = pad.ampEnv.decay;
        setRaw = (v) => dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: padNum, field: 'ampEnv', patch: { decay: v } });
        break;
      case 'Pad Filter Cutoff':
        raw = pad.filter.cutoff;
        setRaw = (v) => dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: padNum, field: 'filter', patch: { cutoff: v } });
        break;
      case 'Kit Volume':
        raw = project.kitVolume;
        setRaw = (v) => {
          dispatchProject({ type: 'SET_KIT_VOLUME', value: v });
          engine.setKitVolume(v);
        };
        break;
      default:
        break;
    }

    return {
      enabled: project.faderMenu.enabled,
      param,
      value: project.faderMenu.enabled ? Math.min(1, Math.max(0, toPct(raw))) : 0,
      onChange: (pct) => {
        if (!project.faderMenu.enabled) return;
        setRaw(fromPct(pct));
      },
    };
  }, [project, dispatchProject, engine]);
}
