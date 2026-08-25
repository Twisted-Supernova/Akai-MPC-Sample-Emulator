import { PPQN, TICKS_PER_BAR } from '../data/constants';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;

// Standard "tight" Web Audio look-ahead scheduler: a fast setInterval repeatedly schedules any
// events that fall within the next SCHEDULE_AHEAD_SEC window using precise AudioContext time,
// rather than relying on setTimeout accuracy for the actual audio triggering.
export class Scheduler {
  constructor(engine, callbacks) {
    this.engine = engine;
    this.callbacks = callbacks; // { getSequence, getBpm, getTimeSig, getPadState, onScheduleTick, onLoopEnd, onPlayheadUpdate }
    this.timer = null;
    this.currentTick = 0;
    this.nextNoteTime = 0;
    this.running = false;
    this.metronomeBeatTick = 0;
  }

  ticksPerBeat() {
    return PPQN;
  }

  secondsPerTick(bpm) {
    return 60 / bpm / PPQN;
  }

  start(fromTick = 0) {
    // Starting while already running would overwrite this.timer and orphan the previous interval -
    // unstoppable, and scheduling the same events a second time. Restarting is the caller's intent,
    // so tear the old one down rather than refusing.
    this.stop();
    this.engine.ensureContext();
    this.engine.resume();
    this.currentTick = fromTick;
    this.nextNoteTime = this.engine.ctx.currentTime + 0.05;
    this.running = true;
    this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    if (!this.running) return;
    const bpm = this.callbacks.getBpm();
    const sequence = this.callbacks.getSequence();
    if (!sequence) return;
    const ticksPerBar = sequence.timeSigTicksPerBar ?? TICKS_PER_BAR;
    const totalTicks = sequence.bars * ticksPerBar;
    const secPerTick = this.secondsPerTick(bpm);

    while (this.nextNoteTime < this.engine.ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      const tickInLoop = this.currentTick % totalTicks;
      this.callbacks.onScheduleTick(tickInLoop, this.nextNoteTime, this.currentTick);

      this.nextNoteTime += secPerTick;
      this.currentTick += 1;

      if (this.currentTick % totalTicks === 0) {
        this.callbacks.onLoopEnd?.();
      }
    }
    this.callbacks.onPlayheadUpdate?.(this.currentTick % totalTicks);
  }
}
