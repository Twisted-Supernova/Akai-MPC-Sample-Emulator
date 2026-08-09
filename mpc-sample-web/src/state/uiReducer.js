// UI / mode state machine - separate from project data so transient UI never touches
// undo-able project state. Mirrors the hardware's single-active-mode design.

export const MODES = {
  SAMPLE: 'SAMPLE',
  SEQUENCE: 'SEQUENCE',
  PAD_FX: 'PAD_FX',
  KNOB_FX: 'KNOB_FX',
  SAMPLE_RECORD: 'SAMPLE_RECORD',
};

export const PAD_GRID_MODES = {
  TRIGGER: 'TRIGGER',
  CHOP: 'CHOP',
  MUTE: 'MUTE',
  SIXTEEN_LEVELS: 'SIXTEEN_LEVELS',
};

export function createInitialUiState() {
  return {
    mode: MODES.SAMPLE,
    shiftHeld: false,
    heldPads: [], // pad numbers currently held, from either pointer or keyboard input
    padGridMode: PAD_GRID_MODES.TRIGGER,
    stepEditOpen: false,
    flexBeatOpen: false,
    fxSelectOpen: false,
    inputConfigOpen: false,
    faderMenuOpen: false,
    timeCorrectOpen: false,
    midiConfigOpen: false,
    projectMenuOpen: false,
    songModeOpen: false,
    compressorOpen: false,
    sampleSelectOpen: false,
    saveSampleOpen: false,
    noteOnOverride: null,
    fullLevelOverride: false,
    noteRepeat: { active: false, division: '1/16', triplet: false },
    playing: false,
    recordingSeq: false,
    seqArmed: false,
    playheadTick: 0,
    queuedSeq: null,
    // Sample Mode has 3 independent B-button page groups, all shown as header tabs at once;
    // `active` tracks which group's tab most recently changed - that's the one whose params
    // K1-K3 currently control and whose footer labels are shown (Manual p.24-30).
    sampleTabs: { b1: 'Trim', b2: 'Tune', b3: 'Filter', active: 'b1' },
    lastError: null,
    eraseArmed: false,
    copySource: null, // { kind: 'sample'|'sequence', bank, index }
    copyTargets: [],
    undoStack: [],
    redoStack: [],
  };
}

export function uiReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
        padGridMode: PAD_GRID_MODES.TRIGGER,
      };

    case 'SET_SHIFT':
      return { ...state, shiftHeld: action.held };

    case 'SET_PAD_GRID_MODE':
      return {
        ...state,
        padGridMode: state.padGridMode === action.mode ? PAD_GRID_MODES.TRIGGER : action.mode,
      };

    case 'OPEN_MENU':
      return { ...state, [action.menu]: true };

    case 'CLOSE_MENU':
      return { ...state, [action.menu]: false };

    case 'CLOSE_ALL_MENUS':
      return {
        ...state,
        inputConfigOpen: false,
        faderMenuOpen: false,
        timeCorrectOpen: false,
        midiConfigOpen: false,
        projectMenuOpen: false,
        songModeOpen: false,
        compressorOpen: false,
        stepEditOpen: false,
        flexBeatOpen: false,
        fxSelectOpen: false,
        sampleSelectOpen: false,
        saveSampleOpen: false,
      };

    case 'TOGGLE_MENU':
      return { ...state, [action.menu]: !state[action.menu] };

    case 'CYCLE_SAMPLE_TAB': {
      const group = action.group; // 'b1' | 'b2' | 'b3'
      const options = { b1: ['Trim', 'Mix', 'Amp Env'], b2: ['Tune', 'Play'], b3: ['Filter', 'Filt Env'] }[group];
      const current = state.sampleTabs[group];
      const next = options[(options.indexOf(current) + 1) % options.length];
      return { ...state, sampleTabs: { ...state.sampleTabs, [group]: next, active: group } };
    }

    case 'SET_NOTE_REPEAT':
      return { ...state, noteRepeat: { ...state.noteRepeat, ...action.patch } };

    case 'SET_PLAYING':
      return { ...state, playing: action.playing };

    case 'SET_RECORDING_SEQ':
      return { ...state, recordingSeq: action.recording };

    case 'SET_SEQ_ARMED':
      return { ...state, seqArmed: action.armed };

    case 'SET_PLAYHEAD':
      return { ...state, playheadTick: action.tick };

    case 'SET_QUEUED_SEQ':
      return { ...state, queuedSeq: action.seq };

    case 'SET_FULL_LEVEL_OVERRIDE':
      return { ...state, fullLevelOverride: action.value };

    case 'SET_COPY_SOURCE':
      return { ...state, copySource: action.source, copyTargets: [] };

    case 'TOGGLE_COPY_TARGET': {
      const exists = state.copyTargets.some(
        (t) => t.bank === action.target.bank && t.pad === action.target.pad
      );
      return {
        ...state,
        copyTargets: exists
          ? state.copyTargets.filter((t) => !(t.bank === action.target.bank && t.pad === action.target.pad))
          : [...state.copyTargets, action.target],
      };
    }

    case 'CLEAR_COPY':
      return { ...state, copySource: null, copyTargets: [] };

    case 'SET_ERROR':
      return { ...state, lastError: action.message };

    case 'SET_ERASE_ARMED':
      return { ...state, eraseArmed: action.value };

    case 'ADD_HELD_PAD':
      return state.heldPads.includes(action.pad) ? state : { ...state, heldPads: [...state.heldPads, action.pad] };

    case 'REMOVE_HELD_PAD':
      return { ...state, heldPads: state.heldPads.filter((p) => p !== action.pad) };

    default:
      return state;
  }
}
