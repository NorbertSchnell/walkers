import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audio = soundworks.audio;
const scheduler = audio.getScheduler();

function emptyFun() {}

function cent2lin(cent) {
  return Math.pow(2, cent / 1200);
}

class ScrubEngine extends audio.GranularEngine {
  constructor() {
    super();

    this.cyclic = true;
    this.periodAbs = 0.015;
    this.periodRel = 0;
    this.durationAbs = 0.120;
    this.durationRel = 0;
    this.attackAbs = 0;
    this.attackRel = 0.5;
    this.releaseAbs = 0;
    this.releaseRel = 0.5;

    this.speed = 1;
    this.lastTime = undefined;
    this.position = 0;

    this.loop = false;
    this.onStop = emptyFun;
  }

  advanceTime(time) {
    const speed = this.speed;
    const speedCoeff = Math.min(1, 10 * Math.abs(speed - 1));

    this.positionVar = 0.02 * speedCoeff;
    this.gain = 0.5 * (1 + speedCoeff);

    this.position += (time - this.lastTime) * speed;

    if (!this.loop && this.position >= this.bufferDuration) {
      this.onStop();
      return;
    }

    this.lastTime = time;

    if (this.position >= this.bufferDuration)
      this.position = 0;

    return super.advanceTime(time);
  }
}

export default class StretchSynth {
  constructor(options = {}) {
    this.fadeInTime = 0.020;
    this.fadeOutTime = 0.100;

    this.minCutoffFreq = 20;
    this.maxCutoffFreq = 0.5 * audioContext.sampleRate;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.cutoff = audioContext.createBiquadFilter();
    this.cutoff.connect(audioContext.destination);
    this.cutoff.type = 'lowpass';
    this.cutoff.frequency.value = this.maxCutoffFreq;
    this.cutoff.Q.value = 0;

    this.engine = new ScrubEngine();
    this.engine.connect(this.cutoff);
    this.engine.onStop = options.onStop;

    this.audioBuffers = null;
    this.bufferIndex = 0;
  }

  start(buffer, onStop = emptyFun) {
    const time = audioContext.currentTime;

    this.engine.buffer = buffer;

    if (!this.engine.master)
      scheduler.add(this.engine, time);
    else
      scheduler.resetEngineTime(this.engine, time);

    this.engine.position = 0;
    this.engine.lastTime = time;
    this.engine.onStop = onStop;
  }

  stop() {
    const time = audioContext.currentTime;

    if (this.engine.master)
      scheduler.remove(this.engine);
  }

  setPitch(value) {
    const factor = 1 - Math.max(0, Math.min(68, value)) / 68;
    this.cutoff.frequency.value = this.minCutoffFreq * Math.exp(this.logCutoffRatio * factor);
  }

  setRoll(value) {
    if(this.cutoff.frequency.value > this.minCutoffFreq) {	
      const minRoll = 20;
      const maxRoll = 68;
      let factor = Math.max(-maxRoll, Math.min(maxRoll, value));

      if (factor < minRoll && factor > -minRoll)
        factor = 0;
      else if (factor > minRoll)
        factor = (factor - minRoll) / (maxRoll - minRoll);
      else
        factor = (factor + minRoll) / (maxRoll - minRoll);

      this.engine.speed = 1 + factor;
    }
  }

  setLoop(value) {
    this.engine.loop = !!value;
  }
}
