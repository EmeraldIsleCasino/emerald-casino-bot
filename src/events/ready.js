const { saveAllDatabases } = require('../database');
const config = require('../utils/config');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} servers`);
    
    client.user.setActivity('Emerald Isle Casino ®', { type: 3 });
    
    setInterval(() => {
      saveAllDatabases();
    }, config.AUTOSAVE_INTERVAL);
    
    console.log(`[Autoping] Auto-save configured every ${config.AUTOSAVE_INTERVAL / 1000} seconds`);
  }
};
