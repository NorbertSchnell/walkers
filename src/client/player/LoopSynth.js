import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

function cent2lin(cent) {
  return Math.pow(2, cent / 1200);
}

export default class LoopSynth {
  constructor(options = {}) {
    this.fadeInTime = 0.020;
    this.fadeOutTime = 0.100;
    this.maxTransposition = 1200;

    if (options.fadeInTime !== undefined)
      this.fadeInTime = options.fadeInTime;

    if (options.fadeOutTime !== undefined)
      this.fadeOutTime = options.fadeOutTime;

    if (options.maxTransposition !== undefined)
      this.maxTransposition = options.maxTransposition;

    this.minCutoffFreq = 20;
    this.maxCutoffFreq = 0.5 * audioContext.sampleRate;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.cutoff = audioContext.createBiquadFilter();
    this.cutoff.connect(audioContext.destination);
    this.cutoff.type = 'lowpass';
    this.cutoff.frequency.value = this.maxCutoffFreq;
    this.cutoff.Q.value = 0;

    this.source = null;
    this.env = null;
    this.playbackRate = 1;
  }

  start(buffer) {
    const time = audioContext.currentTime;

    this.stop(time);

    let env = audioContext.createGain();
    env.connect(this.cutoff);
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(1, time + this.fadeInTime);

    let source = audioContext.createBufferSource();
    source.connect(env);
    source.buffer = buffer;
    source.playbackRate.value = this.playbackRate;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    source.loop = true;
    source.start(audioContext.currentTime);

    this.source = source;
    this.env = env;
  }

  stop() {
    const time = audioContext.currentTime;

    if (this.source) {
      this.env.gain.setValueAtTime(this.env.gain.value, time);
      this.env.gain.linearRampToValueAtTime(0, time + this.fadeOutTime);
      this.source.stop(time + this.fadeOutTime);

      this.source = null;
      this.env = null;
    }
  }

  setPitch(value) {
    const factor = 1 - Math.max(0, Math.min(90, value)) / 90;
    this.cutoff.frequency.value = this.minCutoffFreq * Math.exp(this.logCutoffRatio * factor);
  }

  setRoll(value) {
    const minRoll = 20;
    const maxRoll = 65;
    let factor = Math.max(-maxRoll, Math.min(maxRoll, value));

    if (factor < minRoll && factor > -minRoll)
      factor = 0;
    else if (factor > minRoll)
      factor = (factor - minRoll) / (maxRoll - minRoll);
    else
      factor = (factor + minRoll) / (maxRoll - minRoll);

    this.playbackRate = cent2lin(factor * this.maxTransposition);

    if (this.source)
      this.source.playbackRate.value = this.playbackRate;
  }
}
