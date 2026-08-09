import { BANKS, PADS_PER_BANK, SEQUENCES_PER_BANK, FILTER_TYPES } from '../data/constants';

export function padKey(bank, pad) {
  return `${bank}${String(pad).padStart(2, '0')}`;
}

export function seqKey(bank, seq) {
  return `${bank}${String(seq).padStart(2, '0')}`;
}

function makeDefaultPad() {
  return {
    sampleId: null,
    name: '',
    start: 0,
    end: 1,
    loopStart: 0,
    volume: 0, // dB, -Inf..+6
    pan: 0, // -50..50
    tune: { semi: 0, fine: 0, warp: 'Off', beats: 4 },
    ampEnv: { attack: 0, decay: 32, decayFrom: 'End', release: 20, velSens: 96 },
    filter: { cutoff: 127, reso: 0, type: FILTER_TYPES[0] },
    filterEnv: { attack: 0, decay: 0, decayFrom: 'End', release: 0, depth: 0 },
    play: { polyphony: 'Poly', muteGroup: 'Off', padLink: 'Off', offset: 0 },
    noteOn: false,
    loop: false,
    loopLock: true,
    reverse: false,
    muted: false,
    chop: { type: 'Threshold', threshold: 30, slices: [], selectedSlice: 0 },
    sixteenLevels: { active: false, type: 'Velocity' },
  };
}

function makeDefaultSequence(bank, seq) {
  return {
    name: `Seq ${bank}${String(seq).padStart(2, '0')}`,
    bars: 2,
    bpmMode: 'SEQ', // SEQ | GBL
    bpm: 90,
    q: '1/16',
    swing: 0,
    recQuantize: true,
    countIn: false,
    events: [], // { padBank, pad, tick, velocity, durationTicks }
    automation: [], // { padBank, pad, param, tick, value }
  };
}

export function createInitialProject() {
  const pads = {};
  const sequences = {};
  BANKS.forEach((bank) => {
    for (let p = 1; p <= PADS_PER_BANK; p++) {
      pads[padKey(bank, p)] = makeDefaultPad();
    }
    for (let s = 1; s <= SEQUENCES_PER_BANK; s++) {
      sequences[seqKey(bank, s)] = makeDefaultSequence(bank, s);
    }
  });

  return {
    name: 'New Project',
    globalBpm: 90,
    kitVolume: 0, // dB, -74..6 - overall kit level, separate from the per-pad "Kit Volume" fader target
    timeSignature: { numerator: 4, denominator: 4 },
    metronome: 'Off', // Off | On | Record
    metronomeVolume: 80,
    currentPadBank: 'A',
    currentPad: 1,
    currentSeqBank: 'A',
    currentSeq: 1,
    pads,
    sequences,
    song: [], // ordered list of { bank, seq }
    padFx: {
      active: {}, // padNumber -> { engagedAt, latched, amount, params }
      latchOrder: [],
      paramState: {}, // padNumber -> { [paramKey]: value }
    },
    knobFx: {
      effectIndex: 0,
      params: {},
      shiftParams: {},
      affectedPads: {}, // `${bank}-${pad}` -> bool
      allPads: false,
      bypass: false,
    },
    flexBeat: {
      activeSlot: 1,
      mode: 'One Shot', // One Shot | Loop
      quantize: true,
      mix: 100,
    },
    compressor: {
      bypass: true,
      color: false,
      attack: 20,
      release: 100,
      amount: 30,
      inBoost: 0,
    },
    inputConfig: {
      source: 'Mic',
      monitor: 'Auto',
      threshold: -48,
      recLength: 'Free',
      recInputEffects: 'Off',
    },
    faderMenu: {
      enabled: true,
      param: 'Pad Volume',
    },
    timeCorrect: {
      selectedPads: [],
      q: '1/16',
      shift: 0,
      swing: 0,
    },
    midiConfig: {
      midiPort: 'External',
      midiInChannel: 'All',
      midiOutChannel: 1,
      padMidiIn: 'Off',
      padMidiOut: 'Always',
      midiSyncIn: 'Off',
      midiSyncOut: 'Off',
      midiThru: 'Off',
      receiveProgramChange: 'Off',
      cvSyncOut: 'Off',
      cvSyncBase: 1,
      cvSyncDivision: 1,
      parameterTakeover: 'Scaled',
      knobFxTakeover: 'Scaled',
      faderTakeover: 'Pickup',
    },
  };
}

function updatePad(state, bank, pad, updater) {
  const key = padKey(bank, pad);
  return {
    ...state,
    pads: {
      ...state.pads,
      [key]: updater(state.pads[key]),
    },
  };
}

function updateCurrentSequence(state, updater) {
  const key = seqKey(state.currentSeqBank, state.currentSeq);
  return {
    ...state,
    sequences: {
      ...state.sequences,
      [key]: updater(state.sequences[key]),
    },
  };
}

export function projectReducer(state, action) {
  switch (action.type) {
    case 'LOAD_PROJECT':
      return action.project;

    case 'SET_PAD_BANK':
      return { ...state, currentPadBank: action.bank };

    case 'SET_CURRENT_PAD':
      return { ...state, currentPad: action.pad };

    case 'SET_SEQ_BANK':
      return { ...state, currentSeqBank: action.bank };

    case 'SET_CURRENT_SEQ':
      return { ...state, currentSeq: action.seq };

    case 'UPDATE_PAD':
      return updatePad(state, action.bank, action.pad, (p) => ({ ...p, ...action.patch }));

    case 'UPDATE_PAD_NESTED':
      return updatePad(state, action.bank, action.pad, (p) => ({
        ...p,
        [action.field]: { ...p[action.field], ...action.patch },
      }));

    case 'LOAD_SAMPLE_TO_PAD':
      return updatePad(state, action.bank, action.pad, (p) => ({
        ...p,
        sampleId: action.sampleId,
        name: action.name,
        start: 0,
        end: 1,
        loopStart: 0,
        chop: { type: 'Threshold', threshold: 30, slices: [], selectedSlice: 0 },
      }));

    case 'SET_ALL_PADS_FULL_LEVEL':
      return state; // handled at engine level (velocity override flag), see uiReducer

    case 'SET_GLOBAL_BPM':
      return { ...state, globalBpm: action.bpm };

    case 'SET_KIT_VOLUME':
      return { ...state, kitVolume: action.value };

    case 'SET_METRONOME':
      return { ...state, metronome: action.value };

    case 'SET_METRONOME_VOLUME':
      return { ...state, metronomeVolume: action.value };

    case 'SET_TIME_SIGNATURE':
      return { ...state, timeSignature: action.value };

    case 'UPDATE_SEQUENCE':
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [seqKey(action.bank, action.seq)]: {
            ...state.sequences[seqKey(action.bank, action.seq)],
            ...action.patch,
          },
        },
      };

    case 'ADD_SEQUENCE_EVENT':
      return updateCurrentSequence(state, (seq) => ({
        ...seq,
        events: [...seq.events, action.event],
      }));

    case 'REMOVE_SEQUENCE_EVENTS_FOR_PAD':
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [seqKey(action.bank, action.seq)]: {
            ...state.sequences[seqKey(action.bank, action.seq)],
            events: state.sequences[seqKey(action.bank, action.seq)].events.filter(
              (e) => !(e.padBank === action.padBank && e.pad === action.pad)
            ),
          },
        },
      };

    case 'SET_SEQUENCE_EVENTS':
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [seqKey(action.bank, action.seq)]: {
            ...state.sequences[seqKey(action.bank, action.seq)],
            events: action.events,
          },
        },
      };

    case 'HALVE_SEQUENCE': {
      const key = seqKey(state.currentSeqBank, state.currentSeq);
      const seq = state.sequences[key];
      const newBars = Math.max(1, seq.bars / 2);
      const maxTick = newBars * 4 * 960; // PPQN * beats/bar approximation
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [key]: { ...seq, bars: newBars, events: seq.events.filter((e) => e.tick < maxTick) },
        },
      };
    }

    case 'DOUBLE_SEQUENCE': {
      const key = seqKey(state.currentSeqBank, state.currentSeq);
      const seq = state.sequences[key];
      const oldBars = seq.bars;
      const ticksPerBar = 4 * 960;
      const duplicated = seq.events.map((e) => ({ ...e, tick: e.tick + oldBars * ticksPerBar }));
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [key]: { ...seq, bars: oldBars * 2, events: [...seq.events, ...duplicated] },
        },
      };
    }

    case 'SET_SONG':
      return { ...state, song: action.song };

    case 'ADD_SONG_STEP':
      return { ...state, song: [...state.song, action.step] };

    case 'REMOVE_SONG_STEP':
      return { ...state, song: state.song.filter((_, i) => i !== action.index) };

    case 'SET_PAD_FX_STATE':
      return { ...state, padFx: action.padFx };

    case 'SET_KNOB_FX':
      return { ...state, knobFx: { ...state.knobFx, ...action.patch } };

    case 'SET_FLEX_BEAT':
      return { ...state, flexBeat: { ...state.flexBeat, ...action.patch } };

    case 'SET_COMPRESSOR':
      return { ...state, compressor: { ...state.compressor, ...action.patch } };

    case 'SET_INPUT_CONFIG':
      return { ...state, inputConfig: { ...state.inputConfig, ...action.patch } };

    case 'SET_FADER_MENU':
      return { ...state, faderMenu: { ...state.faderMenu, ...action.patch } };

    case 'SET_TIME_CORRECT':
      return { ...state, timeCorrect: { ...state.timeCorrect, ...action.patch } };

    case 'SET_MIDI_CONFIG':
      return { ...state, midiConfig: { ...state.midiConfig, ...action.patch } };

    case 'SET_PROJECT_NAME':
      return { ...state, name: action.name };

    default:
      return state;
  }
}
