# MPC Sample — Web Replica: Build Plan

Status: **Planning only — nothing has been built yet.** This document is the spec for the developer.
Revision: v2 — corrected after a second accuracy pass against the manual (see Section 10, Corrections Log).

**Confirmed decisions (locked in):**
- Use case: **both** — a genuinely functional sampler that also looks/feels identical to the hardware.
- Depth: **full scope**, including Knob FX, Flex Beat, Song Mode, and Step Edit.
- Sample source: **both** — user-uploaded files and built-in sounds.

**Section 8 questions — now resolved:**
- Demo kit: ship the small synthesized placeholder kit (as proposed).
- Song export: offline-rendered downloadable WAV is acceptable.
- MIDI Config: **UI-only for v1** — no Web MIDI wiring. Reduces scope; can be revisited in a later version.
- Project persistence: parameters/patterns only, no audio buffers — as proposed.

All open questions from v1/v2 are now closed. Section 8 below is kept as a historical record of what was asked
and decided, not as a live open-questions list.

Source of truth for all hardware behaviour: `MPC Sample User Guide v1.3.0 RevA.pdf` (uploaded to project).
Every control, label, mode name, and shift-function referenced below is taken directly from that manual — not
guessed. Where the manual is silent or a real feature can't exist in a browser, that's called out explicitly in
**Section 6 (Scope & Honesty Notes)**. Please read that section before estimating — it's the part that prevents
scope surprises later.

---

## 1. Goal

A browser-based, single-page app that looks and feels like the physical Akai MPC Sample: same chassis layout,
same button/knob/pad names, same modes and menu structure — and is **functionally real**, not just a static
mockup. Sampling, chopping, sequencing, effects, and playback should actually work using the Web Audio API.

Two audiences in one deliverable:
1. Someone who wants to actually make a beat with it (real audio).
2. Someone who wants it to be visually/behaviourally indistinguishable from the hardware.

---

## 2. Tech Stack Recommendation

| Concern | Choice | Why |
|---|---|---|
| UI framework | React (function components + hooks) | Complex, deeply interconnected state (128 pads × params, 8 sequences, mode state machine) is much safer in React than hand-rolled DOM. |
| Audio engine | Web Audio API, no external audio libs | Full control over scheduling, effects graph, and sample playback; no black-box dependency. |
| State management | React context + `useReducer` for the "project" (pads/banks/sequences), local `useState` for transient UI (which knob page is showing, etc.) | Keeps the audio-engine state and UI state cleanly separated. |
| Styling | Plain CSS / CSS modules, hand-built to match the hardware chassis | This is a hardware-replica UI, not a generic web app — no component library skinning. See Section 4. |
| Persistence | `window.storage` (artifact key-value store) for **project data** (pad params, sequences, patterns). Audio buffers are **not** persisted (see Section 6). | Keeps saved projects small and fast; avoids the 5MB/key ceiling. |
| MIDI | Web MIDI API (`navigator.requestMIDIAccess`) | This is a case where the browser *can* do the real thing — see Section 6. |
| Mic input | `getUserMedia` + `AudioContext` | Needed for Sample Record mode. |

---

## 3. Information Architecture (Modes & Screens)

Mirrors the manual's own structure. The app is a single **mode state machine** — exactly one of these is active
at a time, with SHIFT held temporarily overlaying secondary functions:

- **Sample Mode** (default) — trigger/view/edit a sample on the selected pad
- **Sequence Mode** — record/play/edit note events
  - Step Edit (SHIFT+SEQ)
  - Song Mode (Pad 12 shift function, own page)
- **Pad FX Mode** — pads trigger sequence-wide effects
  - Flex Beat (SHIFT+PAD FX)
- **Knob FX Mode** — knobs control a single effect parameter
  - FX Select (SHIFT+KNOB FX)
- **Sample Record Mode** — record new samples from mic/input/resample
- **Pad Play overlays** (apply within Sample Mode): Chop, Loop, Mute, 16 Levels
- **Menus** (accessed via SHIFT combos): Input Configuration, Fader, Time Correct, MIDI Configuration, Project,
  Compressor

Each mode/menu maps to what the **display** shows and what the **B1–B3** function buttons and **K1–K3** knobs
currently do — this mapping is context-sensitive throughout, exactly as on the hardware, and needs a central
"current knob/button legend" concept rather than being hardcoded per screen.

---

## 4. Visual Design Plan

Chassis: dark grey/black unit, hardware-accurate proportions and control grouping, Akai-red accent for
branding/active-state highlights. Layout regions, top to bottom:

1. **Top strip** — Power button, Main Volume knob, bank indicator, battery/charging icons, L/R meters
2. **Display** — 2.4" simulated colour LCD: waveform view, menu/parameter view, VU/level view, BPM popup —
   rendered via `<canvas>` for the waveform, DOM for text/menu overlays
3. **B1/B2/B3** function buttons directly under the display, **K1/K2/K3** knobs beside them
4. **Mode row** — Sample, Seq, Pad FX, Knob FX
5. **Pad Play row** — Chop, Loop, Mute, 16 Levels
6. **Utility column** — Shift, Encoder, -/+, Erase, Note Repeat, Pad Bank, Sample Select, Tap Tempo
7. **Transport** — Sample Record, Seq Record, Play, Stop
8. **Fader** — vertical, with LED brightness feedback
9. **Pad grid** — 4×4, RGB-lit, velocity-sensitive to click/touch pressure-duration, with **secondary shift-labels
   printed below each pad** (Full Level, Half Seq, Double Seq, Count-In, Compressor, Half Speed, Double Speed,
   MIDI Config, Fader, Rec Quantize, Resample, Song, Trim Sample, Time Correct, Warp, Project) — matches manual
   exactly.

LED behaviour rule (from manual, must be replicated precisely):
- Active function → bright LED
- Available but inactive → dim LED
- Unavailable in current mode → LED off
- Held SHIFT reveals secondary functions in **red**: dim red = available, bright red = active

Keyboard mapping for pads (for people without a MIDI controller / touch device):
```
Row 13–16:  1  2  3  4
Row 9–12:   Q  W  E  R
Row 5–8:    A  S  D  F
Row 1–4:    Z  X  C  V
```

---

## 5. Functional Spec by Feature

### 5.1 Core pad engine
- 8 banks (A–H) × 16 pads = 128 independent pad slots, each with: sample buffer, name, start/end/loop-start
  points, volume, pan, tune (semitones), amp attack, amp decay/release, filter cutoff + type, play mode
  (One Shot / Note On), loop on/off, reverse on/off, mute state.
- Velocity derived from click/touch pressure-duration (or MIDI velocity if a controller is connected) with
  poly-voice playback so overlapping hits don't cut each other off (matches "poly-aftertouch" spirit, though true
  aftertouch pressure isn't available from mouse/keyboard/most touchscreens — noted in Section 6).
- Absolute-position knob/fader behaviour with the "soft takeover" arrow indicator described in the manual —
  this is a specific, testable interaction, not just a slider.

### 5.2 Sample loading
- Drag-and-drop or file picker onto a pad (user's own audio files).
- Built-in **demo kit**: since no licensed Akai sample content is available, this will be a small set of
  Web-Audio-synthesized drum sounds (kick/snare/hats/clap/tom/perc) standing in for factory content — labelled
  clearly as a placeholder kit, not real MPC factory sounds.
- Real hardware import formats per spec: `.wav .mp3 .aif/.aiff .snd .s1s .s3s .flac .ogg`. Of these, only
  **wav, mp3, aiff, flac, and ogg** are realistically decodable via the browser's `decodeAudioData` — `.snd` is a
  legacy/ambiguous format and `.s1s`/`.s3s` are Akai-proprietary sample formats with no browser decoder. File
  picker/drag-drop should accept the real-world subset and give a clear "unsupported format" message for the
  rest, rather than silently failing.
- Real hardware constraints worth building to rather than ignoring: **32-voice polyphony** (voice pool should
  cap and steal oldest voice past 32 concurrent), and a **20-minute maximum length per sample**.
- Sample Record mode: record from mic (`getUserMedia`), or "Resample" (re-record the app's own master output).
  Rear audio in / USB audio in are hardware-only — represented in the UI, not functional (Section 6).

### 5.3 Pad Play overlays (Sample Mode)
- **Chop**: Threshold / Regions (4/8/16) / Manual chop types, each pad plays a slice; K1/K2 adjust slice
  start/end, K3 adjusts chop type/threshold — implemented with real waveform analysis (simple peak/RMS scan for
  Threshold mode).
- **Loop**: loop start point via K3, plays between loop start and sample end.
- **Mute**: per-pad mute toggle, red/yellow LED states as specified.
- **16 Levels**: Velocity / Filter / Tune spread modes, computed and applied per manual's rules (e.g. Tune
  centres original pitch on Pad 4).
- **Reverse** and **Note On** playback mode (shift functions on Loop/Chop).

### 5.4 Sequencer
- Up to **16 sequences × 8 banks (128 total) per project**, per the manual's own spec sheet — corrected from v1,
  which understated this as "8 sequences." Each sequence has adjustable length (Half Seq / Double Seq),
  Half/Double Speed.
- Sequencer timing resolution: **960 pulses per quarter note (PPQN)**, matching the manual's spec sheet — the
  look-ahead scheduler's internal clock resolution should be built to this, not an arbitrary tick rate.
- Recall Recording: there's a **small inconsistency in the manual itself** worth knowing about — the
  feature-level description says SHIFT+SAMPLE RECORD retrieves the **last 25 seconds** of audio input, while the
  spec-sheet appendix rounds this to "30 seconds of audio or pad performance" as a general figure. Plan: build
  to the more specific 25-second figure for audio recall; sequence recall has no fixed duration in the manual —
  it's explicitly "the last loop of sequence playback," however long that loop is.
- Real-time recording of pad hits into step-quantized events using a look-ahead Web Audio scheduler (the
  standard "tight" browser-audio scheduling pattern — not `setTimeout`-only timing).
- Step Edit: grid editor per pad/step, with fader repurposed for event timing as in the manual.
- Rec Quantize, Count-In, Metronome (Off/On/Record) states.
- Song Mode: chain sequences into an ordered song. **Export decided (Section 8): offline-rendered, downloadable
  WAV** via `OfflineAudioContext` — not instant like the hardware, but a real audio file, not a UI mock.

### 5.5 Effects
The manual specifies **four effect engines** with real, named effect lists — v1 of this plan invented placeholder
names ("Filter Sweep," "Delay Throw," "Stutter/Gate") instead of pulling the actual list. Corrected below.

- **Pad FX**: a **fixed set of 16 named effects, one per pad**, triggered/held during sequence playback, pressure
  = effect depth. Confirmed list from the manual: 1 Half Speed, 2 Chorus, 3 Flanger, 4 Phaser, 5 Comb Filter,
  6 LP Filter, 7 HP Filter, 8 BP Filter, 9 Ring Mod, 10 LoFi, 11 Color, 12 Granulator, 13 Beat Repeat,
  14 Rev Stepper, 15 Delay, 16 Reverb — each with its own K1–K3 parameter set and value ranges specified in the
  manual (e.g. Chorus: Rate 0.40–3.20 Hz, Depth 0–100%, Feedback 0–100%). Important behavioural detail: **only
  four Pad FX can be active at once** — a 5th press bypasses the first-engaged effect (voice-stealing, oldest
  first), and B1 **Latches** an effect at its current depth. This needs to be modelled as a real constraint, not
  just "16 independent toggles."
- **Flex Beat**: pad-triggered, time-based pitch/time/volume warp effects applied to the whole sequence during
  playback. Pad 1 is always the fixed "Empty" (no-op) slot; pads 2–16 trigger effects. One Shot vs Loop mode
  (K1), dry/wet Mix (K3), and a Quantize toggle (B3) that snaps effect entry to the nearest time division are all
  specified. **Note for the developer:** the manual describes Flex Beat's *behaviour* in detail but I could not
  find a definitive named list of its 15 non-empty effects (unlike Pad FX and Knob FX, which have full tables) —
  worth a manual re-check or a follow-up question to Akai/the manual's later pages before building named effects
  here; don't invent names for this one.
- **Knob FX**: K1–K3 control one selected effect at a time, chosen via Encoder, applied to specific pads (press
  to enable, brightly lit = affected) or all pads (B2), with B3 Bypass. This is a large effect library (part of
  the product's "60+ effects across four engines" spec claim) — confirmed entries include a Delay family (Delay,
  Diff Delay, Tape Delay, Sample Delay), Transient, Noise Gate, Amp Sim, Tube Drive, Soft Clipper, Ensemble, and
  Multi-Chorus, each with detailed parameter ranges including sync-to-tempo note divisions. Realistic build plan:
  implement a solid, representative subset with correct parameter behaviour rather than promise all 60+; flag to
  you which ones are included once scoped.
- **Compressor**: real `DynamicsCompressorNode`-based effect on the master bus. Note: the spec sheet formally
  calls this engine "**Color-Compressor**," while the operational chapter and pad label just say "Compressor" —
  worth using "Compressor" in the UI (matches what's printed on the hardware/pad) but worth knowing both names
  exist so nothing looks like a mismatch if you cross-reference the spec sheet.

### 5.6 Transport & timing
- Play, Stop (double-press = stop all audio), Play/Continue (SHIFT+Play, resumes from playhead), Tap Tempo
  (+ hold Tap Tempo and turn Encoder to adjust BPM from popup), Metro cycling.

### 5.7 Menus
- **Input Configuration**: Source/Monitor/Threshold/Rec Length — Mic source is genuinely functional; Rear/USB
  sources are UI-only (no such hardware exists in a browser).
- **Fader**: parameter select (Pad Volume/Pan/Tune/Attack/Decay-Release/Filter Cutoff/Kit Volume), on/off.
- **Time Correct**: quantization settings applied to recorded events.
- **MIDI Configuration**: Port/Channel/Sync settings — **UI-only for v1** (decided in Section 8): the menu is
  fully navigable and its settings persist, but nothing is actually wired to a physical MIDI device. Reset
  function clears the in-browser project (that part is real).
- **Project**: New/Save/Load against `window.storage` (not real file/SD storage — see Section 6).

### 5.8 Erase & Copy
- Erase: context-sensitive per manual — clear a pad's sample, clear note events (hold+hold pad while playing),
  clear all events for a pad in Step Edit, clear a sequence — each with the confirm-via-B3/cancel-via-B1 flow
  described in the manual.
- Copy: SHIFT+Copy sample/sequence to one or more destination pads, with red pad highlighting for selected
  destinations while held.

---

## 6. Scope & Honesty Notes (read before estimating)

Things that are **hardware-only and cannot be made to actually function** in a browser artifact, and will be
built as accurate-looking, clearly-inert UI:
- Physical MIDI DIN / CV Sync Out ports, 1/4" audio I/O, microSD card slot, battery/charging state — there's no
  such hardware to reflect, so these show static/placeholder states.
- True poly-aftertouch (continuous per-pad pressure after the initial hit) — no input device available in a
  browser provides this signal reliably. Initial-hit velocity will work; sustained pressure won't.

Things that are hardware-only in principle but the browser *could* do for real — decided against for v1 to
control scope:
- **MIDI In/Out via USB** — Web MIDI API genuinely works in Chromium-based browsers (Chrome/Edge; not
  Safari/Firefox), and could make Pad MIDI In/Out real rather than decorative. **Decided: UI-only for v1** — the
  MIDI Configuration menu will display and let you change settings, but nothing will actually be wired to a
  physical controller. Worth revisiting in a later version if there's demand. For accuracy: the hardware's real
  MIDI In/Out are **1/8" (3.5mm) TRS Type-A jacks**, needing a TRS-to-5-pin-DIN adapter cable to reach
  traditional MIDI DIN gear — there's no DIN connector on the unit itself, regardless of what we build here.

Things the browser can do for real and **should** be wired properly rather than faked:
- **Mic input** for Sample Record mode — real `getUserMedia` audio, standing in for the hardware's Mic source.
  Rear/USB hardware audio-in sources remain UI-only, same reasoning as always (no such physical inputs exist in
  a browser).

Things that need a **realistic reduction in fidelity**, flagged so nobody is surprised later:
- "Export to a new audio file" from Song Mode will produce a downloadable audio file (via `OfflineAudioContext`
  render + WAV/MP3 encode) — this is achievable, but it's an offline render, not instant like the hardware.
- Chop Mode's "Threshold" type will use a simplified peak/RMS-based slice detection, not Akai's proprietary
  algorithm — behaviour will be broadly similar, not bit-identical.
- Flex Beat's time/pitch warping will use a simplified granular approach; extreme warp settings won't sound
  identical to the real DSP.
- **Decided (Section 8): saved projects persist pad parameters and sequence data only, not audio buffers**
  (storage values are capped at 5MB and projects can include many samples) — reloading a saved project will
  require re-attaching audio files. This should be surfaced clearly in the Project menu UI so it's not a silent
  data-loss surprise.
- **Decided (Section 8): demo kit is a small synthesized placeholder kit** (kick/snare/hats/clap/tom/perc via
  Web Audio synthesis), not real Akai factory content — labelled clearly as a placeholder in the UI.
- **Decided (Section 8): MIDI Configuration is UI-only for v1** — no Web MIDI wiring. See Section 5.7.

---

## 7. Suggested File/Module Structure

```
/src
  /audio
    AudioEngine.js         — AudioContext, master bus, effects graph, voice pool
    Scheduler.js           — look-ahead sequencer clock
    padVoice.js            — single pad playback (buffer, envelope, filter, pan)
    chopAnalysis.js        — threshold/region slicing
    demoKit.js             — synthesized placeholder drum sounds
  /state
    projectReducer.js      — banks/pads/sequences/song, useReducer store
    modeMachine.js          — current mode + shift-state logic
  /components
    Chassis.jsx
    Display/               — waveform canvas, menu view, VU view, BPM popup
    PadGrid.jsx
    Knobs.jsx (K1-3, Encoder, Fader)
    TransportBar.jsx
    MenuPages/              — InputConfig, FaderMenu, TimeCorrect, MidiConfig, Project, Compressor
  /storage
    projectStorage.js       — window.storage read/write
README.md (this file)
```

---

## 8. Questions Asked Before Dev Started (resolved — kept for record)

1. **Demo kit sounds** → Ship a small synthesized placeholder kit.
2. **Song export** → Offline-rendered downloadable WAV.
3. **MIDI** → UI-only for v1; Web MIDI wiring is out of scope for this version.
4. **Project persistence** → Parameters/patterns only, no audio buffers.

---

## 10. Corrections Log (v1 → v2)

Logged so the developer can see exactly what changed on re-verification and why, rather than silently editing:

| # | v1 said | Correction | Why |
|---|---|---|---|
| 1 | Pad FX effects described generically ("filter sweep," "delay throw," "stutter") | Full confirmed 16-effect named list with per-effect parameters (Section 5.5) | v1 names were invented, not sourced from the manual — that's exactly the kind of inaccuracy to avoid. |
| 2 | Knob FX described generically | Confirmed effect names (Delay family, Transient, Noise Gate, Amp Sim, Tube Drive, Soft Clipper, Ensemble, Multi-Chorus) with real parameter ranges | Same reason — manual has a real, detailed table. |
| 3 | "8 sequences" | Up to **128** (16 sequences × 8 banks) per project | Directly stated in the spec sheet; v1 guessed low. |
| 4 | No mention of simultaneous Pad FX limit | Max **4 concurrent Pad FX**, oldest bypassed on 5th press, B1 = Latch | This is a real behavioural constraint in the manual that changes how the feature must be modelled, not just a detail. |
| 5 | "MIDI DIN ports" | Corrected to **1/8" TRS Type-A**, DIN reached only via adapter cable | Precision matters here since it affects how we describe/scope the MIDI section. |
| 6 | No sample-format realism check | Added real import-format list, flagged which 5 of 8 formats browsers can actually decode | Prevents promising `.s1s`/`.s3s` support that can't exist. |
| 7 | No polyphony/length limits | Added 32-voice cap, 20-min max sample length | Real hardware constraints, cheap to build to, avoids silently-unbounded resource use. |
| 8 | Compressor named plainly | Noted spec sheet calls it "Color-Compressor" vs. operational "Compressor" | Minor, but avoids confusion if someone cross-checks the spec appendix. |
| 9 | Flex Beat effects implied to have a named list like Pad FX | Flagged explicitly: **no confirmed named list found** for Flex Beat's 15 non-empty effects | Better to say "unconfirmed, don't invent" than repeat mistake #1 in a different section. |
| 10 | Recall Recording said generically | Flagged a real **inconsistency in the manual** (25s vs. 30s) and stated which figure to build to and why | The manual itself isn't fully self-consistent here; worth surfacing rather than silently picking one number. |
| 11 | Section 8 open questions unanswered | All four resolved: placeholder demo kit, WAV song export, **MIDI UI-only (no Web MIDI)**, parameters-only project save | Your decisions, applied throughout Sections 5–7 wherever they change scope (Sample source, Song Mode, MIDI Configuration, Project persistence, file structure). |

## 9. Suggested Build Order (milestones)

1. Chassis shell + display + mode state machine (no audio yet) — gets the "feel" right first
2. Core pad audio engine + sample load/trigger + banks
3. Trim/Chop/Loop/Reverse/Mute/16 Levels (Pad Play overlays)
4. Sequencer record/play/Step Edit + transport + tap tempo
5. Effects: Pad FX, Knob FX, Flex Beat, Compressor
6. Menus: Input Config, Fader, Time Correct, MIDI Config, Project
7. Song Mode + export
8. Polish pass: LED-state accuracy, keyboard mapping, responsive/touch, save/load
