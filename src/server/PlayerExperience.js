import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.sharedConfig = this.require('shared-config');
    this.checkin = this.require('checkin');
    this.fileSystem = this.require('file-system', { enableCache: false });
  }

  start() {}

  enter(client) {
    super.enter(client);
    this.broadcast(client.type, client, 'play');
  }

  exit(client) {
    super.exit(client);
    // ...
  }
}
