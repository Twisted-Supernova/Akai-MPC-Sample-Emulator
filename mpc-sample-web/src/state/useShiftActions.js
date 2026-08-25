import { useCallback } from 'react';
import { useProjectState } from './ProjectContext';
import { padKey, seqKey } from './projectReducer';

// SHIFT + pad 1-16 secondary functions (Manual p.20).
export function useShiftActions() {
  const { project, dispatchProject, ui, dispatchUi } = useProjectState();

  return useCallback(
    (padNum) => {
      const bank = project.currentPadBank;
      const seqBank = project.currentSeqBank;
      const seqKeyStr = seqKey(seqBank, project.currentSeq);

      switch (padNum) {
        case 1: // Full Level
          dispatchUi({ type: 'SET_FULL_LEVEL_OVERRIDE', value: !ui.fullLevelOverride });
          break;
        case 2: // Half Seq
          dispatchProject({ type: 'HALVE_SEQUENCE' });
          break;
        case 3: // Double Seq
          dispatchProject({ type: 'DOUBLE_SEQUENCE' });
          break;
        case 4: // Count-In
          dispatchProject({
            type: 'UPDATE_SEQUENCE',
            bank: seqBank,
            seq: project.currentSeq,
            patch: { countIn: !project.sequences[seqKeyStr].countIn },
          });
          break;
        case 5: // Compressor
          dispatchUi({ type: 'TOGGLE_MENU', menu: 'compressorOpen' });
          break;
        // Stretching/compressing the event ticks has to move the loop length with them. The
        // scheduler wraps at bars * ticksPerBar, so leaving `bars` alone after halving the speed
        // pushes everything past the old length outside the loop, where it never plays again.
        case 6: { // Half Speed (sequence)
          const seq = project.sequences[seqKeyStr];
          dispatchProject({
            type: 'UPDATE_SEQUENCE',
            bank: seqBank,
            seq: project.currentSeq,
            patch: {
              bars: Math.min(128, seq.bars * 2),
              events: seq.events.map((e) => ({ ...e, tick: e.tick * 2 })),
            },
          });
          break;
        }
        case 7: { // Double Speed (sequence)
          const seq = project.sequences[seqKeyStr];
          dispatchProject({
            type: 'UPDATE_SEQUENCE',
            bank: seqBank,
            seq: project.currentSeq,
            patch: {
              bars: Math.max(1, Math.round(seq.bars / 2)),
              events: seq.events.map((e) => ({ ...e, tick: Math.round(e.tick / 2) })),
            },
          });
          break;
        }
        case 8: // MIDI Config
          dispatchUi({ type: 'TOGGLE_MENU', menu: 'midiConfigOpen' });
          break;
        case 9: // Fader menu
          dispatchUi({ type: 'TOGGLE_MENU', menu: 'faderMenuOpen' });
          break;
        case 10: // Rec Quantize
          dispatchProject({
            type: 'UPDATE_SEQUENCE',
            bank: seqBank,
            seq: project.currentSeq,
            patch: { recQuantize: !project.sequences[seqKeyStr].recQuantize },
          });
          break;
        case 11: // Resample - handled by parent via engine (see TransportBar)
          break;
        case 12: // Song
          dispatchUi({ type: 'TOGGLE_MENU', menu: 'songModeOpen' });
          break;
        case 13: { // Trim Sample
          const pad = project.pads[padKey(bank, project.currentPad)];
          dispatchProject({
            type: 'UPDATE_PAD',
            bank,
            pad: project.currentPad,
            patch: { start: 0, end: 1, loopStart: pad.start > 0 ? 0 : pad.loopStart },
          });
          break;
        }
        case 14: // Time Correct
          dispatchUi({ type: 'TOGGLE_MENU', menu: 'timeCorrectOpen' });
          break;
        case 15: { // Warp mode toggle (Off -> Time Stretch handled in Tune tab; this just documents intent)
          const pad = project.pads[padKey(bank, project.currentPad)];
          const modes = ['Off', 50, 200, 'Seq'];
          const idx = modes.indexOf(pad.tune.warp);
          const nextWarp = modes[(idx + 1) % modes.length];
          dispatchProject({ type: 'UPDATE_PAD_NESTED', bank, pad: project.currentPad, field: 'tune', patch: { warp: nextWarp } });
          break;
        }
        case 16: // Project
          dispatchUi({ type: 'TOGGLE_MENU', menu: 'projectMenuOpen' });
          break;
        default:
          break;
      }
    },
    [project, ui, dispatchProject, dispatchUi]
  );
}
