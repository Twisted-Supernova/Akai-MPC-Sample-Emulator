# MPC Sample — Web Replica

A browser-based, single-page recreation of the Akai Professional **MPC Sample** hardware
sampler: same chassis layout, same button/knob/mode names, same menu structure — and it's
**functionally real**, not a static mockup. Sampling, chopping, sequencing, effects, and
playback all run on the Web Audio API.

Built from the official `MPC Sample User Guide v1.3.0 (RevA)` — every control name, mode,
parameter range, and effect list in this app is taken directly from that manual, not guessed.
Where the manual is silent or something genuinely can't exist in a browser, that's called out
explicitly in [Section 6](#6-honesty-section--whats-real-vs-simplified).

## Quick start

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. Click anywhere once to let the browser unlock audio (required
by all browsers — the "Power" state on real hardware).

```bash
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

No backend, no API keys, nothing to configure. Works fully offline once loaded.

---

## 1. What's genuinely functional

- **Sampling**: drag-and-drop or file-picker upload (`.wav .mp3 .aif/.aiff .flac .ogg`), mic
  recording, and "Resample" (re-recording the app's own master output) — all real audio via
  `getUserMedia` / `decodeAudioData` / `MediaRecorder`.
- **8 banks × 16 pads** (128 total), each with independent sample, start/end/loop points,
  volume, pan, tune (semitone + fine + Warp), amp envelope, filter (8 real types: Off, Classic,
  LPF2/4, HPF2/4, BPF2/4) with its own envelope, polyphony/mute-group/pad-link/offset.
- **32-voice polyphony cap** with oldest-voice stealing, and a **20-minute max sample length** —
  both real hardware limits, enforced here too.
- **Pad Play overlays**: Chop (Threshold/Regions 4-8-16/Manual, with Extract/Split/Merge),
  Loop (+ Loop Lock), Reverse, Mute, 16 Levels (Velocity/Filter/Tune spread), Note On mode.
- **Sequencer**: up to 128 sequences (16 × 8 banks), 960 PPQN look-ahead scheduler (the standard
  "tight" Web Audio scheduling pattern, not `setTimeout`), real-time recording with
  quantize/swing/count-in/metronome, Step Edit grid, Half/Double Speed and Half/Double Seq.
- **Effects — all four engines, fully wired, real DSP, not placeholders**:
  - **Pad FX**: all 16 named effects with the manual's exact parameter ranges, the real
    "max 4 concurrent, oldest bypassed on the 5th, Latch" constraint.
  - **Knob FX**: the full confirmed library — **28 effects** (Delay family, 3 Reverb sizes +
    Spring Reverb, 3 filters, Bus Compressor, Limiter, Pumper, Transient, Noise Gate, Amp Sim,
    Tube Drive, Soft Clipper, Ensemble, Multi-Chorus, Phaser, Flanger, Auto-Wah, Auto-Pan, 3
    vintage emulators) — applicable per-pad or to all pads, with Bypass.
  - **Flex Beat**: pad-triggered time-based warp effects on the whole sequence, One Shot/Loop,
    Quantize, dry/wet Mix.
  - **Compressor**: real `DynamicsCompressorNode`, with the Color (tape-warmth) mode.
- **Song Mode**: chain sequences into a song, **export to a real downloadable WAV** via
  `OfflineAudioContext`, or flatten to a new sequence.
- **Project persistence**: Save/Load/New against `localStorage` (pad params + sequences, not
  audio buffers — see §6).
- **Undo/Redo** (`SHIFT` + `-`/`+`) across pad, sequence, and song edits.
- **Keyboard mapping** for playing pads without a MIDI controller or touch device:

  ```
  Row 13–16:  1  2  3  4
  Row 9–12:   Q  W  E  R
  Row 5–8:    A  S  D  F
  Row 1–4:    Z  X  C  V
  ```
  Hold `Shift` for the secondary pad functions printed under each pad.

## 2. Visual design

Checked directly against product photos of the real unit (not just the manual's line diagrams),
so this goes further than "best-effort from the written spec":
- **Two-tone chassis**: a glossy black top panel (AKAI logo, Main Volume, display, meters,
  speaker, MPC SAMPLE wordmark) sitting above a cream/off-white lower body — not one uniform
  surface.
- **Buttons are dark charcoal keycaps with white text** by default, not light cream — only Pad
  FX/Knob FX (orange), Chop/Mute/Loop/16 Levels (bright blue), and a couple of special cases
  break from that.
- **Knobs, encoder, and fader cap are white/cream plastic with a grey top**, each knob framed by
  a thin grey rotation-arc with dots at both ends — not black knobs.
- **Pads are light grey/silver** with a **colored LED rim-glow** (blue once a sample is loaded,
  amber for the currently selected pad, red/amber for mute states, etc.) rather than the pad
  face itself changing color — matches how the real RGB pads read in photos.
- Shift-function labels (printed under buttons/pads) are **dark grey/black text**, not red —
  red is reserved for a couple of specific accents (the Sample/Seq Record indicator bar).
- "MODE" and "PAD PLAY" section labels with hairline dividers, and an embossed "MPC SAMPLE"
  wordmark on the front lip, both taken directly from the photos.
- **B1/B2/B3** function buttons sit *above* the display; **K1/K2/K3** knobs sit *below* it —
  the real hardware layout (see the corrections log in §7).
- The 4×4 pad grid uses the real hardware's numbering (pad 1 = bottom-left, pad 16 = top-right)
  and the real printed shift-labels (Trim Sample, Time Correct, Warp, Project, Fader, Rec
  Quantize, Resample, Song, Compressor, Half Speed, Double Speed, MIDI Config, Full Level, Half
  Seq, Double Seq, Count-In).

Still not a pixel-perfect clone — proportions, exact fonts, and finer bevel/shadow details are
approximated — but the color system, panel layout, and control styling are now matched against
real photos rather than guessed.

## 3. Tech stack

| Concern | Choice |
|---|---|
| UI | React 19 (function components + hooks), Vite |
| Audio | Web Audio API only — no external audio libraries |
| State | Two `useReducer` stores in React Context: `project` (pads/sequences/song/effects — undo-able) and `ui` (current mode, menus, transient state) |
| Styling | Plain CSS per component, hand-built to the hardware's proportions |
| Persistence | `localStorage` (project data only) |

## 4. File structure

```
src/
  audio/
    AudioEngine.js       — master bus, voice pool, Pad FX/Knob FX/Compressor routing
    Scheduler.js          — 960 PPQN look-ahead sequencer clock
    padVoice.js            — single pad playback chain (envelope, filter, tune, loop, reverse)
    effects.js              — real Web Audio DSP graphs for all Pad FX / Knob FX
    liveCapture.js            — rolling capture buffer (Beat Repeat, Rev Stepper, Granulator, Recall)
    chopAnalysis.js             — threshold / region slicing
    demoKit.js                   — synthesized placeholder drum kit
    songExport.js                 — OfflineAudioContext render for Song Mode WAV export
    wavEncoder.js                  — AudioBuffer -> WAV Blob
    usePlaybackEngine.js            — React hook wiring the Scheduler into project state
  state/
    projectReducer.js     — banks/pads/sequences/song/effects (undo-able project data)
    uiReducer.js            — mode state machine, menus, shift, transient UI
    ProjectContext.jsx        — React context, undo/redo history, sample registry, recorder
    usePadActions.js            — what a pad tap/hold does in every mode (the pad dispatcher)
    useShiftActions.js            — SHIFT + pad 1-16 secondary functions
    useKnobBindings.js              — central "what do K1-K3 currently control" legend
    useButtonBindings.js              — central "what do B1-B3 currently do" legend
  components/
    Chassis.jsx, PadGrid.jsx, Knob.jsx, Encoder.jsx, Fader.jsx, Btn.jsx, TopStrip.jsx,
    TransportBar.jsx, ModeButtons.jsx, PadPlayButtons.jsx, UtilityClusters.jsx,
    BFunctionButtons.jsx
    Display/               — screen router + every mode's screen view
    MenuPages/               — Input Config, Fader, Time Correct, MIDI Config, Project, Song, Sample Select
  storage/
    projectStorage.js     — localStorage read/write
  data/
    constants.js           — every effect list, parameter range, and label sourced from the manual
```

## 5. What's simplified, and why

Approximations are inherent to reimplementing hardware DSP/firmware in a browser. Flagged here
so nothing looks like an oversight:

- **Chop "Threshold"** uses a simplified peak/RMS onset scan, not Akai's proprietary algorithm —
  broadly similar, not bit-identical.
- **Warp / time-stretch** changes pitch and playback rate together (a single
  `AudioBufferSourceNode.playbackRate`); true independent time-stretch (Warp = Pitch mode
  preserving formants) is out of scope for a from-scratch implementation.
- **Beat Repeat / Rev Stepper / Granulator / Pad FX "Half Speed"** work against a real rolling
  capture buffer of the live signal (the same technique hardware loopers use), via a
  `ScriptProcessorNode` — deprecated in favor of `AudioWorklet`, but far simpler to wire for this
  scope and universally supported.
- **Noise Gate / Transient / Pumper / Auto-Wah** use analyser-driven envelope followers rather
  than the exact detector Akai ships — same behavior family, not a bit-exact clone.
- **Flex Beat's 15 named effects**: the manual documents Flex Beat's *behavior* in detail (pad 1
  = fixed Empty slot, One Shot/Loop, Quantize, Mix) but — unlike Pad FX and Knob FX — never
  publishes a named list for the other 15 slots. Rather than invent names the manual doesn't
  give, they're implemented as generic numbered warp effects (`Flex 2`…`Flex 16`) with real
  pitch/time/volume-warp DSP behind them.
- **Song Mode's offline WAV export** replays each sequence's pad hits (sample, envelope, filter,
  tune, chop, loop, mute — all faithfully reproduced) through the project's Compressor setting.
  Pad FX / Knob FX / Flex Beat are live-performance effects driven by real-time gestures rather
  than stored per-event automation in this data model, so they are **not** included in the
  offline render — only in real-time playback.
- **MIDI Configuration** is UI-only: the menu is fully navigable and its settings persist, but
  nothing is wired to a physical MIDI device (Web MIDI is Chromium-only and was out of scope for
  this pass — see the original build plan's Section 6 for the tradeoff).
- **Project persistence** saves pad parameters and sequence data only, not audio buffers (a
  `localStorage` value has practical size limits, and projects can reference many samples) —
  reloading a saved project requires re-attaching your own audio files.
- **Hardware-only, shown as accurate but inert UI**: physical MIDI/Sync/Audio I/O jacks, microSD
  card slot, battery/charging state — there's no such hardware to reflect in a browser tab.
- **True poly-aftertouch** (continuous per-pad pressure after the initial hit) isn't available
  from a mouse, keyboard, or most touchscreens. Initial-hit velocity works (via
  `PointerEvent.pressure` where a device reports it, otherwise a fixed default); sustained
  pressure doesn't. Pad FX "how hard you press" is approximated with hold-duration instead.

## 6. Honesty section — what's real vs. simplified

This project follows the same rule as the original build plan: **say plainly what changed
between "the real hardware" and "what a browser can actually do,"** rather than silently
smoothing it over. If you're evaluating this against the physical MPC Sample, §5 above is the
complete list of where they diverge and why.

## 7. Corrections log — plan vs. the actual manual

The initial build plan (`README_2.md`, kept in the parent folder for the historical record) was
written before the manual PDF was available in this project and made a few reasonable but wrong
guesses about the physical layout. Once the manual was reviewed page-by-page, these were
corrected before writing any code:

| # | Plan assumed | Manual actually says | Impact |
|---|---|---|---|
| 1 | Dark grey/black chassis | Light silver/off-white console, 7.6"×9.3"×2.0" | Chassis color palette |
| 2 | B1-3 buttons under the display, K1-3 beside them | B1-3 **above** the display, K1-3 **below** it | Chassis layout |
| 3 | Knob FX: "large library, implement a representative subset" | Manual publishes a **complete** ~28-effect table with exact parameters | Built the full set, not a subset |
| 4 | Generic filter description | 8 named filter types (Off/Classic/LPF2/LPF4/HPF2/HPF4/BPF2/BPF4), Classic modeled after the MPC3000 | Pad/Knob filter implementation |
| 5 | Sample-mode B-button pages assumed straightforward | 3 independent page groups (B1: Trim/Mix/Amp Env, B2: Tune/Play, B3: Filter/Filt Env), all shown as header tabs at once, one "active" for K1-K3 | Display layout + central knob-legend design |

Everything else in the original plan (128 pads/sequences, 960 PPQN, 32-voice cap, 20-minute max
sample, 4-concurrent Pad FX with Latch, 25-second Recall, MIDI as 1/8" TRS not DIN, MIDI UI-only
for v1, synthesized placeholder demo kit, params-only project save) was confirmed correct against
the manual and built as specified.

## 8. Known gaps

- The physical hardware's absolute-position knobs with "soft takeover" (an arrow indicator until
  you turn the knob to match the current value) is approximated here as **relative/scaled**
  drag control, since a mouse has no absolute rotational position to take over from.
- `-`/`+` buttons (non-SHIFT) don't yet decrement/increment a "currently selected parameter" —
  the real hardware ties this to an explicit selected-parameter concept (via the Encoder) that
  this build doesn't track. SHIFT+`-`/`+` (Undo/Redo) is fully wired.
- Encoder turning is wired for the Knob FX effect-select list and sequence playhead nudging; not
  every menu's scroll-list is Encoder-driven yet (most are click-to-select instead, which covers
  the same functionality for a mouse/touch-first interface).

## 9. Functionality QA pass — what got fixed

A full click-through pass of every mode, menu, and control (driven programmatically, verifying
actual state changes rather than just visual appearance) turned up several real bugs, all now
fixed and re-verified:

- **Pad selection never followed pad taps in Sample Mode.** Tapping a pad played its sound but
  the display/knobs stayed locked on whatever pad was selected first — meaning every "load a
  sample onto pad X" action was silently landing on pad 1 regardless of which pad you'd tapped.
  This was the most significant bug found; it's now fixed, and taps (including on empty pads)
  correctly update what the display and K1-K3 are editing.
- **The Fader was rendered with no `value`/`onChange` at all** — dragging it would have thrown
  immediately. It's now bound to whatever parameter the Fader menu has selected (Pad Volume/Pan/
  Tune/Amp Attack/Amp Decay/Filter Cutoff/Kit Volume), matching the manual's menu.
- **Knob FX and the Compressor updated their on-screen state but never told the audio engine** —
  selecting an effect, toggling Bypass/All Pads/Color, and turning the Compressor's knobs had
  zero audible effect. Both are now kept in sync with the engine via dedicated effects.
- **Flex Beat had no audio implementation at all**, despite the UI suggesting otherwise. It now
  runs real time-based warp DSP (reusing the same live-capture technique as Beat Repeat/Rev
  Stepper) triggered by the physical pads, with working Mode/Mix knobs and Quantize.
- **Enum-typed effect parameters** (Color's Mode, Delay's Time division, Amp Sim's Cab Model,
  etc.) displayed `NaN`/`undefined` and could corrupt the underlying effect — the knob binding
  now correctly converts between the stored string value and the knob's numeric position.
- **"Normalize" (SHIFT+B2 in Sample Mode) was a flag with no audio effect.** It now measures the
  sample's actual peak and adjusts pad volume so the peak sits at 0dB, as the manual describes.
- **"◄ Back" was decorative (no click handler) in Input Config, Fader Menu, and MIDI Config**,
  and Song Mode had no way to close it at all. All now close their menu properly.
- **Mode buttons (Sample/Seq/Pad FX/Knob FX) didn't close open menus**, so opening something like
  Project or MIDI Config and then switching modes left the display stuck on that menu forever.
- **Keyboard-triggered pads didn't show the held/triggered visual state**, and SHIFT+keyboard
  didn't run pad shift-functions the way a physical SHIFT+pad-click did. Both now match.
- "Kit Volume" existed as a per-pad field that nothing read; it's now a real project-level gain
  stage wired into the engine, matching the manual's "volume of the entire kit" description.

---

Source of truth for every control, mode, and parameter: `MPC Sample User Guide v1.3.0 (RevA)`
(Akai Professional / inMusic Brands). This is an independent fan recreation for educational/
personal use — not affiliated with or endorsed by Akai Professional or inMusic Brands.
