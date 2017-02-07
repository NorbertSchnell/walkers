import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

window.addEventListener('load', () => {
  const config = window.soundworksConfig;
  soundworks.client.init(config.clientType, config);
  soundworks.client.setViewContentDefinitions(viewContent);
  soundworks.client.setViewTemplateDefinitions(viewTemplates);

  const experience = new PlayerExperience(config.assetsDomain);

  soundworks.client.start();
});
