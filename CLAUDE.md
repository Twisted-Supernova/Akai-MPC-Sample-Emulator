# Akai MPC Sample Emulator

Browser emulation of the Akai MPC Sample hardware groovebox — real Web Audio DSP, not a mockup.
Every parameter list, label and range comes from `MPC Sample User Guide v1.3.0 RevA.pdf` in this
directory; the README records where the emulation knowingly diverges from the hardware.

## Layout

```
mpc-sample-web/          the app (Vite + React 19, plain JS, no TypeScript)
  src/audio/             Web Audio layer — engine, voices, effects, scheduler, export
  src/state/             reducers + "binding" hooks (what K1-K3 / B1-B3 / fader do right now)
  src/components/        chassis, pads, knobs, and the Display/ + MenuPages/ screens
  src/data/constants.js  every list and range transcribed from the manual
  src/storage/           localStorage project persistence
```

## Commands

Run from `mpc-sample-web/`.

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

`oxlint` exits 0 with ~27 pre-existing warnings, almost all `catch (e) { /* ignore */ }` around
Web Audio `disconnect()` calls that legitimately throw when an edge isn't connected. Don't treat
the warning count as a regression signal; treat the **exit code** as one. Use `catch { }` (optional
catch binding) in new code so it doesn't add to the pile.

## Architecture

- `AudioEngine` (`src/audio/AudioEngine.js`) is a module-level singleton (`audioEngine`) holding the
  whole node graph. React never owns audio nodes; components call engine methods.
- **Signal path:** voices → `dryVoiceBus`/`knobFxPerPadBus` → `kitGain` → `preFxBus` → Pad FX chain →
  `padFxChainOut` → Flex Beat dry/wet → `postFxBus` → Knob FX (all-pads) → compressor → `masterGain`.
- **State is split deliberately.** `projectReducer` holds saveable/undoable musical data;
  `uiReducer` holds transient mode and menu state so undo never rewinds a menu. Undo history lives
  in a ref in `ProjectContext`, not in either reducer.
- **Binding hooks are the single source of truth for control legends.** `useKnobBindings`,
  `useButtonBindings` and `useFaderBinding` each return "what this control does in the current
  mode", consumed by both the physical control components and the Display footer labels. Add a new
  mode's controls there, not in the components.
- **Engine sync hooks** (`useKnobFxSync`, `useCompressorSync`) push project state into the engine.
  Screens that change engine-backed state need a sync hook or the UI updates while the audio doesn't.

## Web Audio invariants

These are the traps this codebase has actually hit. Check them before touching the audio layer.

1. **`AudioBufferSourceNode.buffer` may be assigned exactly once.** A second assignment throws
   `InvalidStateError`. Choose the buffer (forward or reversed) *before* the single assignment.
2. **A `ScriptProcessorNode` only fires `onaudioprocess` while its output reaches the destination.**
   Using one as a pure tap silently captures nothing. `createLiveCapture` returns a zero-gain `sink`
   for exactly this reason — callers must connect it downstream.
3. **`disconnect()` the outgoing edges before rebuilding a chain.** Disconnecting only the head node
   leaves every downstream edge live, and the signal then reaches the tail through both the old and
   new paths. See `rewirePadFxChain` and `setCompressorState`.
4. **A fresh `GainNode` has gain 1.0, and `setTargetAtTime` approaches its target from the current
   value.** Any noise source or feedback loop must be initialised at construction, or it runs at
   unity for the length of the first approach.
5. **Reading `AudioParam.value` at schedule time gives the pre-automation value**, not the value the
   automation will hold at some future time. Anchor envelope segments on the computed number
   (`peakGain`), never on `.value`.
6. **The scheduler is a look-ahead `setInterval`** (`Scheduler.js`). `start()` tears down any running
   interval first — an overwritten timer handle is unstoppable.

## Conventions

- `PPQN` (960) and `TICKS_PER_BAR` live in `data/constants.js`. Never hand-write `960` or `4 * 960`.
- Sequencer is 4/4 throughout. `sequence.timeSigTicksPerBar` is read by `Scheduler` but nothing
  writes it yet — `project.timeSignature` currently affects only the metronome accent.
- Pad and sequence lookups always go through `padKey(bank, pad)` / `seqKey(bank, seq)`.
- `project.padFx.active` is keyed by pad number. Integer-like keys enumerate in ascending numeric
  order, **not** insertion order — use `activePadFxNumber(padFx)` to get the most recently engaged
  effect rather than indexing `Object.keys(...)`.
- Saving a file to disk goes through `audio/downloadBlob.js`.
- Comments explain *why*, especially where a line looks wrong but isn't. Match that density.

## Known gaps

Real, unimplemented, and deliberately left alone — not regressions.

- SHIFT+pad 11 (RESAMPLE) is a no-op; its comment points at TransportBar handling that doesn't exist.
- Knob FX **shift** parameters are stored but never sent to the engine (`useKnobBindings` only
  forwards `params`), so e.g. Delay's Sync mode is unreachable.
- Time signature doesn't change the loop length (see above).
- `uiReducer`'s `undoStack`/`redoStack` and `constants.WARP_VALUES` are dead.
- The playhead dispatches to `ui` every 25 ms and the meters `setState` every frame, so the whole
  control surface re-renders ~40-60×/sec during playback. Works, but it's the obvious perf target.
- 16 Levels stays `active` after the pad grid leaves that mode, and an active 16-Levels pad returns
  early in `triggerSamplePad`, so its hits aren't recorded into the sequence.

## Change log

### 2026-08-25 — max-effort code review pass (15 findings, all fixed)

The repo had no diff to review (single import commit), so the review covered `mpc-sample-web/src/`
as a whole. Build and lint verified green after the changes.

**Silent-failure bugs**
- `padVoice.js` — reverse playback threw `InvalidStateError` on every hit (double `buffer` assign);
  also aborted any song export containing a reversed pad.
- `liveCapture.js` + `effects.js` + `AudioEngine.js` — the capture `ScriptProcessorNode` was never
  pulled, so Beat Repeat / Rev Stepper / Granulator / Half Speed / every Flex Beat slot and the
  SHIFT+Sample Record "Recall" all produced silence. Added a zero-gain `sink`.
- `useShiftActions.js` — SHIFT+pad 6 (Half Speed) doubled event ticks without doubling `bars`, so
  half the sequence fell outside the loop and stopped playing. Both Half and Double Speed now move
  the bar count with the events.

**Routing / graph bugs**
- `AudioEngine.rewirePadFxChain` — stale slot output edges survived a rebuild, summing the signal
  through both old and new paths (~+6 dB plus a leak past the newer effect).
- `AudioEngine.setCompressorState` — the color waveshaper stayed wired after Color was switched off,
  so the signal reached the compressor twice.
- `Scheduler.start` — a second Play orphaned the previous `setInterval`, double-scheduling notes and
  leaving an interval that Stop couldn't clear.

**Envelope / parameter bugs**
- `padVoice.js` — `velSens` 127 disabled velocity instead of maximising it; `decayFrom: 'Start'`
  anchored on `gain.value` and jumped to unity gain, ignoring pad volume and velocity.
- `effects.js` — Vinyl/Tape noise gains and Delay/Phaser/mod-delay feedback gains started at the
  GainNode default of 1.0, producing a noise or feedback burst on effect selection.
- `usePadActions.js` — re-pressing a Pad FX pad sent `{}` params, discarding every knob edit.

**UI bugs**
- `useKnobBindings` / `useButtonBindings` — knobs addressed the lowest-numbered engaged Pad FX
  rather than the newest. Added `engagedAt` (already documented in the reducer) and
  `activePadFxNumber()`.
- `Encoder.jsx` — the post-drag `click` fired `onPress`, closing FX Select on every turn.
- `SongModeView` / `UtilityClusters` — WAV downloads used a detached anchor and revoked the object
  URL synchronously (broken in Firefox, could abort large mixdowns). Extracted `downloadBlob.js`;
  song export now surfaces render errors instead of swallowing them.

**Cleanup**
- Added `TICKS_PER_BAR` and removed five hand-written copies of the bar length, including a local
  `const PPQN = 960` in `TimeCorrectView` that shadowed the exported constant.
- Removed a dead `seqKey &&` guard and a triple sequence lookup in `useKnobBindings`.
- `detachInputMonitor` now disconnects the capture nodes; new `AudioEngine.stopMicStream()` releases
  the microphone when Sample Record mode closes (it previously stayed live for the whole session).
