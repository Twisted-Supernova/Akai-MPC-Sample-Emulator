import { useEffect } from 'react';
import { useProjectState } from './ProjectContext';
import { seqKey } from './projectReducer';
import { KNOB_FX_LIST } from '../data/constants';

// Keeps the audio engine's live Knob FX effect instance and routing (per-pad / all-pads / bypass)
// in sync with project state. Without this, the Knob FX screen updates but no audio actually
// changes - the engine never learns which effect is selected or how it should be routed.
export function useKnobFxSync() {
  const { project, engine } = useProjectState();
  const { effectIndex, allPads, bypass, params } = project.knobFx;

  useEffect(() => {
    engine.ensureContext();
    const fx = KNOB_FX_LIST[effectIndex];
    engine.setKnobFxEffect(fx.name);
    const seq = project.sequences[seqKey(project.currentSeqBank, project.currentSeq)];
    const bpm = seq.bpmMode === 'SEQ' ? seq.bpm : project.globalBpm;
    engine.setKnobFxParams(params, bpm);
    engine.updateKnobFxRouting({ allPads, bypass });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectIndex, engine]);

  useEffect(() => {
    engine.updateKnobFxRouting({ allPads, bypass });
  }, [allPads, bypass, engine]);
}
