import { useEffect, useRef, useCallback } from 'react';
import { useProjectState } from '../state/ProjectContext';
import { padKey, seqKey } from '../state/projectReducer';
import { Scheduler } from './Scheduler';
import { PPQN } from '../data/constants';

function playClick(engine, when, volume, accent) {
  const ctx = engine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1500 : 1000;
  gain.gain.setValueAtTime((volume / 100) * (accent ? 0.5 : 0.3), when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
  osc.connect(gain).connect(engine.masterGain);
  osc.start(when);
  osc.stop(when + 0.05);
}

export function usePlaybackEngine() {
  const { project, dispatchProject, ui, dispatchUi, engine } = useProjectState();
  const schedulerRef = useRef(null);
  const stateRef = useRef({ project, ui });
  const eventsMapRef = useRef(new Map());

  useEffect(() => {
    stateRef.current = { project, ui };
  }, [project, ui]);

  useEffect(() => {
    const seq = project.sequences[seqKey(project.currentSeqBank, project.currentSeq)];
    const map = new Map();
    seq.events.forEach((e) => {
      if (!map.has(e.tick)) map.set(e.tick, []);
      map.get(e.tick).push(e);
    });
    eventsMapRef.current = map;
  }, [project.sequences, project.currentSeqBank, project.currentSeq]);

  useEffect(() => {
    schedulerRef.current = new Scheduler(engine, {
      getBpm: () => {
        const s = stateRef.current;
        const seq = s.project.sequences[seqKey(s.project.currentSeqBank, s.project.currentSeq)];
        return seq.bpmMode === 'SEQ' ? seq.bpm : s.project.globalBpm;
      },
      getSequence: () => {
        const s = stateRef.current;
        return s.project.sequences[seqKey(s.project.currentSeqBank, s.project.currentSeq)];
      },
      onScheduleTick: (tickInLoop, when) => {
        const s = stateRef.current;
        const events = eventsMapRef.current.get(tickInLoop);
        if (events) {
          events.forEach((e) => {
            const padState = s.project.pads[padKey(e.padBank, e.pad)];
            if (padState?.sampleId && !padState.muted) {
              engine.triggerPad(padState, {
                bank: e.padBank,
                pad: e.pad,
                velocity: e.velocity ?? 0.85,
                when,
                knobFxState: s.project.knobFx,
              });
            }
          });
        }
        if (tickInLoop % PPQN === 0) {
          const metro = s.project.metronome;
          if (metro === 'On' || (metro === 'Record' && s.ui.recordingSeq)) {
            const beatsPerBar = s.project.timeSignature.numerator;
            const beatIndex = Math.round(tickInLoop / PPQN) % beatsPerBar;
            playClick(engine, when, s.project.metronomeVolume, beatIndex === 0);
          }
        }
      },
      onLoopEnd: () => {
        const s = stateRef.current;
        if (s.ui.queuedSeq) {
          dispatchProject({ type: 'SET_CURRENT_SEQ', seq: s.ui.queuedSeq.seq });
          dispatchUi({ type: 'SET_QUEUED_SEQ', seq: null });
        }
      },
      onPlayheadUpdate: (tick) => dispatchUi({ type: 'SET_PLAYHEAD', tick }),
    });
    return () => schedulerRef.current?.stop();
  }, [engine, dispatchProject, dispatchUi]);

  const play = useCallback(
    (fromTick = 0) => {
      dispatchUi({ type: 'SET_PLAYING', playing: true });
      schedulerRef.current.start(fromTick);
    },
    [dispatchUi]
  );

  const stop = useCallback(() => {
    dispatchUi({ type: 'SET_PLAYING', playing: false });
    dispatchUi({ type: 'SET_RECORDING_SEQ', recording: false });
    dispatchUi({ type: 'SET_SEQ_ARMED', armed: false });
    schedulerRef.current?.stop();
    dispatchUi({ type: 'SET_PLAYHEAD', tick: 0 });
  }, [dispatchUi]);

  const stopAllAudio = useCallback(() => {
    engine.stopAll();
  }, [engine]);

  const toggleSeqRecord = useCallback(() => {
    if (ui.recordingSeq) {
      dispatchUi({ type: 'SET_RECORDING_SEQ', recording: false });
    } else {
      dispatchUi({ type: 'SET_SEQ_ARMED', armed: true });
      dispatchUi({ type: 'SET_RECORDING_SEQ', recording: true });
      if (!ui.playing) play(0);
    }
  }, [ui.recordingSeq, ui.playing, dispatchUi, play]);

  return { play, stop, stopAllAudio, toggleSeqRecord };
}
