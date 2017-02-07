import * as soundworks from 'soundworks/client';
import PitchAndRollEstimator from './PitchAndRollEstimator.js';
import ButtonView from './ButtonView.js';
import LoopSynth from './LoopSynth.js';
import StretchSynth from './StretchSynth.js';

const audioContext = soundworks.audioContext;

function getBaseName(fileName) {
  let slashIndex = fileName.lastIndexOf("/");

  if (slashIndex >= 0)
    fileName = fileName.substring(slashIndex + 1);

  let dotIndex = fileName.lastIndexOf(".");

  if (dotIndex >= 0)
    fileName = fileName.substring(0, dotIndex);

  return fileName;
}

function getButtonName(filePath) {
  const baseName = getBaseName(filePath);
  const segs = baseName.split('_');
  let skip = true;

  if(segs.length > 1) {
    let i = 0;

    // skip leading numbers
    if(!isNaN(parseInt(segs[0])))
      i++;

    let buttonName = segs[i];

    for (i++; i < segs.length; i++)
      buttonName += ' ' + segs[i];

    return buttonName;
  }

  return baseName;
}

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', {
      features: ['web-audio']
    });

    this.fileSystem = this.require('file-system', {
      list: {
        path: 'sounds',
        directories: true,
        recursive: false,
      }
    });

    this.audioBufferManager = this.require('audio-buffer-manager');

    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity']
    });

    this.synth = new StretchSynth();
    this.audioBuffers = null;

    this.buttonSelectDir = this.buttonSelectDir.bind(this);
    this.toggleLoop = this.toggleLoop.bind(this);
    this.buttonHome = this.buttonHome.bind(this);
    this.buttonStartPlaying = this.buttonStartPlaying.bind(this);
    this.buttonStopPlaying = this.buttonStopPlaying.bind(this);
  }

  init() {
    this.pitchAndRoll = new PitchAndRollEstimator();
  }

  buttonSelectDir(index, def) {
    this.hide();
    this.audioBufferManager.show();

    this.fileSystem.getList({
      path: `sounds/${def.label}`,
      directories: false,
      recursive: false,
    }).then((fileList) => {
      const definitions = [];

      for (let filePath of fileList) {
        definitions.push({
          label: getButtonName(filePath),
        });
      }

      this.audioBufferManager
        .loadFiles(fileList, this.audioBufferManager.view)
        .then(() => {
          this.audioBuffers = this.audioBufferManager.getAudioBufferArray();

          // create a list of buttons from the sound files names in the chosen directory
          this.view = new ButtonView(definitions, this.toggleLoop, this.buttonHome, this.buttonStartPlaying, this.buttonStopPlaying, { showHeader: true, buttonState: true });

          this.audioBufferManager.hide();
          this.show();
        });
    });
  }

  toggleLoop(value) {
    this.synth.setLoop(value);
  }

  buttonHome(value) {
    //this.synth.stop();
    //this.hide();
    //this.showMenu();
    location.reload();
  }

  buttonStartPlaying(index, def) {
    const audioBuffer = this.audioBuffers[index];
    this.synth.start(audioBuffer, () => {
        this.view.releaseButton(index, true); // release it, but silently!
      });
  }

  buttonStopPlaying(index, def) {
    this.synth.stop();
  }

  showMenu() {
    const definitions = [];

    // create a list of buttons from the directories in /sounds
    for (let filePath of this.fileSystem.fileList) {
      definitions.push({
        label: getBaseName(filePath),
      });
    }

    this.view = new ButtonView(definitions, null, null, this.buttonSelectDir, null, { showHeader: false, buttonState: false });
    this.show();    
  }

  start() {
    super.start(); // don't forget this

    if (!this.hasStarted)
      this.init();

    this.showMenu();

    // setup motion input listeners
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {
        const accX = data[0];
        const accY = data[1];
        const accZ = data[2];

        const pitchAndRoll = this.pitchAndRoll;
        pitchAndRoll.estimateFromAccelerationIncludingGravity(accX, accY, accZ);

        this.synth.setPitch(pitchAndRoll.pitch);
        this.synth.setRoll(pitchAndRoll.roll);
      });
    }
  }
}
