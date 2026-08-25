// Data sourced directly from "MPC Sample User Guide v1.3.0 RevA.pdf" (Akai Professional).
// Every list, label, and parameter range below is taken from the manual - nothing invented.

export const BANKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const PADS_PER_BANK = 16;
export const SEQUENCES_PER_BANK = 16;
export const MAX_VOICES = 32;
export const MAX_SAMPLE_SECONDS = 20 * 60;
export const PPQN = 960;
// Bar length in ticks. The sequencer is 4/4 throughout (Scheduler falls back to this, and Half/
// Double Seq, Time Correct, Step Edit and both song exports all lay events out on it), so it lives
// here once rather than as a hand-written `4 * 960` at each call site.
export const TICKS_PER_BAR = PPQN * 4;

// Pad numbering: 1 = bottom-left, 4 = bottom-right, 13 = top-left, 16 = top-right (matches hardware).
// grid row 0 = top (pads 13-16), row 3 = bottom (pads 1-4)
export const PAD_GRID_LAYOUT = [
  [13, 14, 15, 16],
  [9, 10, 11, 12],
  [5, 6, 7, 8],
  [1, 2, 3, 4],
];

// SHIFT + pad secondary functions (Manual p.20)
export const PAD_SHIFT_FUNCTIONS = {
  1: { label: 'FULL LEVEL', action: 'fullLevel' },
  2: { label: 'HALF SEQ', action: 'halfSeq' },
  3: { label: 'DOUBLE SEQ', action: 'doubleSeq' },
  4: { label: 'COUNT-IN', action: 'countIn' },
  5: { label: 'COMPRESSOR', action: 'openCompressor' },
  6: { label: 'HALF SPEED', action: 'halfSpeed' },
  7: { label: 'DOUBLE SPEED', action: 'doubleSpeed' },
  8: { label: 'MIDI CONFIG', action: 'openMidiConfig' },
  9: { label: 'FADER', action: 'openFaderMenu' },
  10: { label: 'REC QUANTIZE', action: 'toggleRecQuantize' },
  11: { label: 'RESAMPLE', action: 'resample' },
  12: { label: 'SONG', action: 'openSong' },
  13: { label: 'TRIM SAMPLE', action: 'trimSample' },
  14: { label: 'TIME CORRECT', action: 'openTimeCorrect' },
  15: { label: 'WARP', action: 'toggleWarpMode' },
  16: { label: 'PROJECT', action: 'openProject' },
};

// Keyboard mapping (README spec, matches manual's pad numbering: bottom row = pad 1-4)
export const KEYBOARD_PAD_MAP = {
  '1': 13, '2': 14, '3': 15, '4': 16,
  'q': 9, 'w': 10, 'e': 11, 'r': 12,
  'a': 5, 's': 6, 'd': 7, 'f': 8,
  'z': 1, 'x': 2, 'c': 3, 'v': 4,
};

export const FILTER_TYPES = ['Off', 'Classic', 'LPF2', 'LPF4', 'HPF2', 'HPF4', 'BPF2', 'BPF4'];

export const CHOP_TYPES = ['Threshold', 'Regions 4', 'Regions 8', 'Regions 16', 'Manual'];

export const SIXTEEN_LEVEL_TYPES = ['Velocity', 'Filter', 'Tune'];

export const WARP_VALUES = { OFF: 'Off', SEQ: 'Seq' };

// Pad FX - 16 fixed effects, one per pad (Manual p.47-49). Max 4 concurrent (voice-stealing, oldest first).
export const PAD_FX_LIST = [
  { pad: 1, name: 'Half Speed', params: [
    { key: 'speed', label: 'Speed', type: 'enum', values: ['x1.5', 'x2', 'x4'], default: 'x1.5' },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 100 },
  ] },
  { pad: 2, name: 'Chorus', params: [
    { key: 'rate', label: 'Rate', min: 0.40, max: 3.20, unit: 'Hz', default: 1.0 },
    { key: 'depth', label: 'Depth', min: 0, max: 100, unit: '%', default: 50 },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 20 },
  ] },
  { pad: 3, name: 'Flanger', params: [
    { key: 'rate', label: 'Rate', min: 0.02, max: 10.00, unit: 'Hz', default: 0.5 },
    { key: 'depth', label: 'Depth', min: 0, max: 100, unit: '%', default: 50 },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 30 },
  ] },
  { pad: 4, name: 'Phaser', params: [
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'speed', label: 'Speed', type: 'enum', values: ['2 bars', '1 bar', '1/2', '1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/4' },
    { key: 'range', label: 'Range', min: 0, max: 100, unit: '%', default: 50 },
  ] },
  { pad: 5, name: 'Comb Filter', params: [
    { key: 'speed', label: 'Speed', type: 'enum', values: ['2 bars', '1 bar', '1/2', '1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/4' },
  ] },
  { pad: 6, name: 'LP Filter', params: [
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'speed', label: 'Speed', type: 'enum', values: ['2 bars', '1 bar', '1/2', '1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/4' },
    { key: 'range', label: 'Range', min: 0, max: 100, unit: '%', default: 50 },
  ] },
  { pad: 7, name: 'HP Filter', params: [
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'speed', label: 'Speed', type: 'enum', values: ['2 bars', '1 bar', '1/2', '1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/4' },
    { key: 'range', label: 'Range', min: 0, max: 100, unit: '%', default: 50 },
  ] },
  { pad: 8, name: 'BP Filter', params: [
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'speed', label: 'Speed', type: 'enum', values: ['2 bars', '1 bar', '1/2', '1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/4' },
    { key: 'range', label: 'Range', min: 0, max: 100, unit: '%', default: 50 },
  ] },
  { pad: 9, name: 'Ring Mod', params: [
    { key: 'maxFreq', label: 'Max Freq', min: 40.00, max: 400.00, unit: 'Hz', default: 200 },
  ] },
  { pad: 10, name: 'LoFi', params: [
    { key: 'bitcrush', label: 'Bitcrush', min: 24.00, max: 2.00, unit: 'bit', default: 12 },
    { key: 'decimator', label: 'Decimator', min: 0, max: 100, unit: '%', default: 0 },
  ] },
  { pad: 11, name: 'Color', params: [
    { key: 'mode', label: 'Mode', type: 'enum', values: ['Cassette', 'Flutter', 'Tube Amp', 'Vinyl', 'Saturation', 'Radio'], default: 'Cassette' },
  ] },
  { pad: 12, name: 'Granulator', params: [
    { key: 'density', label: 'Density', min: 1.0, max: 300.0, unit: '/s', default: 20 },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 20 },
    { key: 'grainLen', label: 'Grain Len', min: 10.0, max: 200.0, unit: 'ms', default: 60 },
  ] },
  { pad: 13, name: 'Beat Repeat', params: [
    { key: 'division', label: 'Division', type: 'enum', values: ['1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/16' },
    { key: 'reverse', label: 'Reverse', type: 'enum', values: ['Off', 'On'], default: 'Off' },
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, unit: '%', default: 0 },
  ] },
  { pad: 14, name: 'Rev Stepper', params: [
    { key: 'delayTime', label: 'Delay Time', type: 'enum', values: ['1/4', '1/4t', '1/8', '1/8t', '1/16', '1/16t', '1/32', '1/64'], default: '1/16' },
    { key: 'repeats', label: 'Repeats', min: 2, max: 8, default: 4 },
  ] },
  { pad: 15, name: 'Delay', params: [
    { key: 'time', label: 'Time', type: 'enum', values: ['1/1', '1/2', '1/4d', '1/4', '1/4t', '1/8d', '1/8', '1/8t', '1/16d', '1/16', '1/16t', '1/32d', '1/32', '1/32t', '1/64d', '1/64', '1/64t'], default: '1/8' },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'range', label: 'Range', type: 'enum', values: ['Normal', 'X-Feedback', 'Ping-Pong'], default: 'Normal' },
  ] },
  { pad: 16, name: 'Reverb', params: [
    { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 250, unit: 'ms', default: 20 },
    { key: 'decay', label: 'Decay', min: 0, max: 100, unit: '%', default: 50 },
    { key: 'diffusion', label: 'Diffusion', min: 0, max: 100, unit: '%', default: 50 },
  ] },
];

// Knob FX - large shared effect library (Manual p.52-55). Full confirmed list with parameters.
export const KNOB_FX_LIST = [
  { name: 'Delay', params: [
    { key: 'time', label: 'Time', type: 'enum', values: ['1/32', '1/16T', '1/32D', '1/16', '1/8T', '1/16D', '1/8', '1/4T', '1/8D', '1/4', '2/4T', '1/4D', '2/4', '5/8', '3/4', '7/8', '4/4', '5/4', '6/4', '8/4'], default: '1/8' },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 50 },
  ], shiftParams: [
    { key: 'sync', label: 'Sync', type: 'enum', values: ['Off', 'On'], default: 'On' },
    { key: 'damping', label: 'Damping', min: 1.00, max: 20.0, unit: 'kHz', default: 10 },
    { key: 'width', label: 'Width', min: 0, max: 100, unit: '%', default: 50 },
  ] },
  { name: 'Diff Delay', params: [
    { key: 'time', label: 'Time', type: 'enum', values: ['1/64', '1/32', '1/16T', '1/32D', '1/16', '1/8T', '1/16D', '1/8', '1/4T', '1/8D', '1/4', '1/2T', '1/4D', '2/4', '4/4T', '3/4', '4/4'], default: '1/8' },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 50 },
  ], shiftParams: [
    { key: 'sync', label: 'Sync', type: 'enum', values: ['Off', 'On'], default: 'On' },
    { key: 'diffusion', label: 'Diffusion', min: 0, max: 100, unit: '%', default: 50 },
    { key: 'highDamp', label: 'High Damp', min: 0, max: 100, unit: '%', default: 50 },
  ] },
  { name: 'Tape Delay', params: [
    { key: 'time', label: 'Time', type: 'enum', values: ['1', '1/2', '1/2.', '1/4', '1/4.', '1/8', '1/8.', '1/16', '1/16.'], default: '1/8' },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, default: 30 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, default: 50 },
  ], shiftParams: [
    { key: 'wowFlutter', label: 'Wow/Flut', min: 0, max: 100, default: 20 },
    { key: 'ramp', label: 'Ramp', min: 0, max: 100, default: 0 },
    { key: 'spread', label: 'Spread', min: 0, max: 100, default: 30 },
  ] },
  { name: 'Sample Delay', params: [
    { key: 'left', label: 'Left', min: 0.0, max: 250.0, unit: 'ms', default: 0 },
    { key: 'right', label: 'Right', min: 0.0, max: 250.0, unit: 'ms', default: 0 },
  ] },
  { name: 'Reverb Small', params: [
    { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 250, unit: 'ms', default: 10 },
    { key: 'time', label: 'Time', min: 0.4, max: 71.5, unit: 's', default: 1.2 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 30 },
  ], shiftParams: [
    { key: 'erTailMix', label: 'ER/Tail Mix', min: 0, max: 100, default: 50 },
    { key: 'density', label: 'Density', min: 0, max: 100, default: 50 },
    { key: 'lowCut', label: 'Low Cut', min: 1, max: 1000, unit: 'Hz', default: 100 },
  ] },
  { name: 'Reverb Medium', params: [
    { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 250, unit: 'ms', default: 15 },
    { key: 'time', label: 'Time', min: 0.4, max: 71.5, unit: 's', default: 2.2 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 30 },
  ], shiftParams: [
    { key: 'erTailMix', label: 'ER/Tail Mix', min: 0, max: 100, default: 50 },
    { key: 'density', label: 'Density', min: 0, max: 100, default: 50 },
    { key: 'lowCut', label: 'Low Cut', min: 1, max: 1000, unit: 'Hz', default: 100 },
  ] },
  { name: 'Reverb Large', params: [
    { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 250, unit: 'ms', default: 20 },
    { key: 'time', label: 'Time', min: 0.4, max: 71.5, unit: 's', default: 4.5 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 30 },
  ], shiftParams: [
    { key: 'erTailMix', label: 'ER/Tail Mix', min: 0, max: 100, default: 50 },
    { key: 'density', label: 'Density', min: 0, max: 100, default: 50 },
    { key: 'lowCut', label: 'Low Cut', min: 1, max: 1000, unit: 'Hz', default: 100 },
  ] },
  { name: 'Spring Reverb', params: [
    { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 250, unit: 'ms', default: 0 },
    { key: 'time', label: 'Time', min: 1.0, max: 10.0, unit: 's', default: 2 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 30 },
  ], shiftParams: [
    { key: 'width', label: 'Width', min: 0, max: 100, default: 50 },
    { key: 'diffusion', label: 'Diffusion', min: 0, max: 100, default: 50 },
    { key: 'lowCut', label: 'Low Cut', min: 20.0, max: 1000, unit: 'Hz', default: 100 },
  ] },
  { name: 'HP Filter', params: [
    { key: 'frequency', label: 'Frequency', min: 10, max: 19999, unit: 'Hz', default: 200 },
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, default: 0 },
  ] },
  { name: 'LP Filter', params: [
    { key: 'frequency', label: 'Frequency', min: 22, max: 19999, unit: 'Hz', default: 8000 },
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, default: 0 },
  ] },
  { name: 'BP Filter', params: [
    { key: 'frequency', label: 'Frequency', min: 55.0, max: 20000, unit: 'Hz', default: 1000 },
    { key: 'resonance', label: 'Resonance', min: 0.7, max: 20.0, default: 1 },
  ] },
  { name: 'Bus Compressor', params: [
    { key: 'attack', label: 'Attack', min: 0, max: 100, default: 20 },
    { key: 'release', label: 'Release', min: 0, max: 100, default: 30 },
    { key: 'threshold', label: 'Threshold', min: -50, max: 0, unit: 'dB', default: -20 },
  ], shiftParams: [
    { key: 'ratio', label: 'Ratio', min: 1, max: 20, default: 4 },
    { key: 'output', label: 'Output', min: -6, max: 24, unit: 'dB', default: 0 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, default: 100 },
  ] },
  { name: 'Limiter', params: [
    { key: 'gain', label: 'Gain', min: -12.0, max: 36.0, unit: 'dB', default: 0 },
    { key: 'ceiling', label: 'Ceiling', min: -24.0, max: 0.0, unit: 'dB', default: 0 },
    { key: 'release', label: 'Release', min: 10.0, max: 10000, unit: 'ms', default: 100 },
  ] },
  { name: 'Pumper', params: [
    { key: 'speed', label: 'Speed', type: 'enum', values: ['Bar', '1/2', '1/2T', '1/4', '1/4T', '1/8', '1/8T', '1/16', '1/16T', '1/32', '1/32T'], default: '1/4' },
    { key: 'shape', label: 'Shape', min: 0, max: 100, default: 50 },
    { key: 'depth', label: 'Depth', min: 0, max: 100, default: 50 },
  ], shiftParams: [
    { key: 'attack', label: 'Attack', min: 0, max: 100, default: 10 },
    { key: 'hold', label: 'Hold', min: 0, max: 100, default: 10 },
    { key: 'release', label: 'Release', min: 0, max: 100, default: 50 },
  ] },
  { name: 'Transient', params: [
    { key: 'attack', label: 'Attack', min: -100, max: 100, unit: '%', default: 0 },
    { key: 'shape', label: 'Shape', min: 0, max: 100, default: 50 },
    { key: 'sustain', label: 'Sustain', min: -100, max: 100, unit: '%', default: 0 },
  ] },
  { name: 'Noise Gate', params: [
    { key: 'threshold', label: 'Threshold', min: -120.0, max: 0.0, unit: 'dB', default: -40 },
    { key: 'depth', label: 'Depth', min: 0, max: -120, unit: 'dB', default: -60 },
  ], shiftParams: [
    { key: 'attack', label: 'Attack', min: 0.01, max: 1000.0, unit: 'ms', default: 1 },
    { key: 'hold', label: 'Hold', min: 0, max: 1000, unit: 'ms', default: 50 },
    { key: 'release', label: 'Release', min: 1.00, max: 3000.0, unit: 'ms', default: 100 },
  ] },
  { name: 'Amp Sim', params: [
    { key: 'cabModel', label: 'Cab Model', type: 'enum', values: ['D.I.', 'Brit 1x8"', '1x12"', '2x10"', '2x12"', '4x10"', '4x12"', '1x15" Bass', '4x10" Bass', 'Radio'], default: 'D.I.' },
    { key: 'drive', label: 'Drive', min: 0.0, max: 11.0, default: 5 },
    { key: 'softClip', label: 'Soft Clip', min: 0, max: 100, unit: '%', default: 0 },
  ], shiftParams: [
    { key: 'bass', label: 'Bass', min: -12.0, max: 12.0, unit: 'dB', default: 0 },
    { key: 'mid', label: 'Mid', min: -12.0, max: 12.0, unit: 'dB', default: 0 },
    { key: 'treble', label: 'Treble', min: -12.0, max: 12.0, unit: 'dB', default: 0 },
  ] },
  { name: 'Tube Drive', params: [
    { key: 'drive', label: 'Drive', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'headroom', label: 'Headroom', min: -30.0, max: 0.0, unit: 'dB', default: -10 },
    { key: 'saturation', label: 'Saturation', min: 0, max: 100, unit: '%', default: 30 },
  ] },
  { name: 'Soft Clipper', params: [
    { key: 'drive', label: 'Drive', min: 1.0, max: 10000.0, unit: '%', default: 100 },
    { key: 'shape', label: 'Shape', type: 'enum', values: ['Tanh', 'Sine', 'Parabolic'], default: 'Tanh' },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 100 },
  ], shiftParams: [
    { key: 'truePeak', label: 'True Peak', type: 'enum', values: ['Off', 'On'], default: 'Off' },
    { key: 'relTime', label: 'Rel Time', min: 0.1, max: 100.0, unit: 'ms', default: 10 },
    { key: 'postLvl', label: 'Post Lvl', min: -80.0, max: 0.0, unit: 'dB', default: 0 },
  ] },
  { name: 'Ensemble', params: [
    { key: 'rate', label: 'Rate', min: 0.1, max: 10.0, unit: 'Hz', default: 1 },
    { key: 'depth', label: 'Depth', min: 0.00, max: 24.00, unit: 'ms', default: 5 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 50 },
  ], shiftParams: [
    { key: 'delay', label: 'Delay', min: 0.00, max: 24.00, unit: 'ms', default: 10 },
    { key: 'shimmer', label: 'Shimmer', min: 0, max: 100, default: 20 },
    { key: 'width', label: 'Width', min: 0, max: 100, default: 50 },
  ] },
  { name: 'Multi-Chorus', params: [
    { key: 'rate', label: 'Rate', min: 0.1, max: 10.0, unit: 'Hz', default: 1 },
    { key: 'depth', label: 'Depth', min: 0.00, max: 24.00, unit: 'ms', default: 8 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 50 },
  ], shiftParams: [
    { key: 'voices', label: 'Voices', type: 'enum', values: [3, 4, 6], default: 3 },
    { key: 'delay', label: 'Delay', min: 0.00, max: 24.00, unit: 'ms', default: 10 },
  ] },
  { name: 'Phaser', params: [
    { key: 'rate', label: 'Rate', min: 0.10, max: 10.00, unit: 'Hz', default: 0.5 },
    { key: 'depth', label: 'Depth', min: 0, max: 100, unit: '%', default: 50 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 50 },
  ], shiftParams: [
    { key: 'model', label: 'Model', type: 'enum', values: ['Vibe', 'Stone', 'Ninety', 'Tron'], default: 'Vibe' },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, default: 30 },
  ] },
  { name: 'Flanger', params: [
    { key: 'rate', label: 'Rate', min: 0.02, max: 10.00, unit: 'Hz', default: 0.3 },
    { key: 'depth', label: 'Depth', min: 0, max: 100, unit: '%', default: 50 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 50 },
  ], shiftParams: [
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, default: 30 },
  ] },
  { name: 'Auto-Wah', params: [
    { key: 'sens', label: 'Sens', min: 0, max: 100, default: 50 },
    { key: 'resonance', label: 'Resonance', min: 0, max: 100, default: 30 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 100 },
  ], shiftParams: [
    { key: 'center', label: 'Center', min: 0, max: 100, default: 50 },
    { key: 'attack', label: 'Attack', min: 0, max: 100, default: 20 },
    { key: 'release', label: 'Release', min: 0, max: 100, default: 40 },
  ] },
  { name: 'Auto-Pan', params: [
    { key: 'rate', label: 'Rate', min: 0, max: 100, default: 30 },
    { key: 'mix', label: 'Mix', min: 0, max: 100, unit: '%', default: 100 },
  ] },
  { name: 'Vintage Emulator', params: [
    { key: 'type', label: 'Type', type: 'enum', values: ['MPC3000', 'MPC60', 'SP1200', 'SP1200Ring'], default: 'MPC3000' },
  ] },
  { name: 'Vinyl Emulator', params: [
    { key: 'tone', label: 'Tone', min: 0, max: 100, default: 50 },
    { key: 'crackle', label: 'Crackle', min: 0, max: 100, unit: '%', default: 30 },
    { key: 'pitch', label: 'Pitch', min: 10, max: 100, unit: '%', default: 100 },
  ] },
  { name: 'Tape Emulator', params: [
    { key: 'wow', label: 'Wow', min: 10, max: 100, unit: '%', default: 30 },
    { key: 'noise', label: 'Noise', min: 10, max: 100, unit: '%', default: 20 },
    { key: 'pitch', label: 'Pitch', min: 20, max: 100, unit: '%', default: 100 },
  ] },
];

// Flex Beat: manual confirms 16 pad-triggered time-based effects (Pad 1 = fixed Empty slot),
// but does NOT publish a named list for the 15 non-empty slots (unlike Pad FX/Knob FX).
// Built as generic, numbered warp effects rather than inventing names - see README.
export const FLEX_BEAT_SLOTS = [
  { pad: 1, name: 'Empty', empty: true },
  ...Array.from({ length: 15 }, (_, i) => ({ pad: i + 2, name: `Flex ${i + 2}`, empty: false })),
];

export const MENU_TAKEOVER_MODES = ['Pickup', 'Scaled', 'Instant'];

export const IMPORT_FORMATS_HARDWARE = ['.wav', '.mp3', '.aif', '.aiff', '.snd', '.s1s', '.s3s', '.flac', '.ogg'];
export const IMPORT_FORMATS_BROWSER_SUPPORTED = ['.wav', '.mp3', '.aif', '.aiff', '.flac', '.ogg'];
