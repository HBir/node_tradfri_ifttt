const express = require('express');
const tradfriLib = require('node-tradfri-client');
const nodeCleanup = require('node-cleanup');
const { engine } = require('express-handlebars');
const path = require('path');
const colors = require('colors');

const {
  executeCommand,
  deviceUpdated,
  getInfo,
  log
} = require('./src/tradfri_handler');

// Copy envfile(copy_this).js and rename to envfile.js
const {
  PORT, PASS, HUBIP, APIUSER, APIKEY,
} = require('./resources/envfile');

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

const { TradfriClient } = tradfriLib;
const options = { watchConnection: true };
const tradfri = new TradfriClient(HUBIP, options);


/* Endpoints */
app.get('/', async (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', async (req, res) => {
  const data = await getInfo(tradfri);
  res.render('dashboard', {
    data,
    PASS,
  });
});

app.get('/health', async (req, res) => {
  log.info('/health');
  res.send(getInfo(tradfri));
});

app.get('/rebootGateway', async (req, res) => {
  log.info('Manually rebooting gateway...');
  const reboot = await tradfri.rebootGateway();
  res.send(`Reboot succesfully started: ${reboot}`);
});

app.get('/api/:command/:id/:state', (req, res) => {
  try {
    if (req.query.password !== PASS) {
      log.info('invalid password');
      res.status(403).send('wrong password');
      return;
    }

    const { command } = req.params;
    if (command === 'turn'
        || command === 'dim'
        || command === 'temp'
        || command === 'color') {
      const result = executeCommand(tradfri, req.params.id, command, req.params.state);
      log.info(result);
      res.send(result);
      return;
    }

  log.info('unknown command', command);
  res.status(404).send('wrong command');
} catch (err) {
  log.error(err)
  res.send(err)
}
});

app.listen(PORT, async () => {
  log.info(`Listening on port ${PORT}`);
  tradfri.on('ping failed', (failedPingCount) => log.error(`ping failed #${failedPingCount}`))
    // .on('ping succeeded', () => log.info('ping'))
    .on('connection alive', () => log.info('Connection alive'))
    .on('connection lost', () => log.warn('Connection lost'))
    .on('connection failed', (attempt, max) => log.warn(`Connection failed #${attempt}${max === Infinity ? '' : `/${max}`}`))
    .on('reconnecting', (attempt, max) => log.info(`Reconnecting... #${attempt}${max === Infinity ? '' : `/${max}`}`))
    .on('gateway offline', () => log.warn('Gateway offline'))
    .on('give up', () => log.warn('Give up'));
  try {
    await tradfri.connect(APIUSER, APIKEY);
  } catch(err) {
    log.error(err)
  }

  tradfri.on('rebooting', (reason) => log.info('Rebooting', reason))
    .on('internet connectivity changed', (connected) => log.info('Internet connectivity changed connected:', connected))
    .on('firmware update available', (releaseNotes, priority) => log.info('Firmware update available priority:', priority))
    .observeNotifications();

  tradfri.on('group updated', (group) => log.info('Group updated', group.instanceId, group.name))
    .on('group removed', (instanceId) => log.info('Group removed', instanceId))
    .on('scene updated', (groupid, scene) => log.info('Scene updated', groupid, scene.name))
    .on('scene removed', (groupId, instanceId) => log.info('Scene removed', groupId, instanceId))
    .observeGroupsAndScenes();

  tradfri.on('device updated', (device) => deviceUpdated(tradfri, device))
    .on('device removed', (instanceId) => log.info('Device removed', instanceId))
    .observeDevices();
});

nodeCleanup(() => {
  log.info('Cleaning up...');
  if (tradfri) {
    log.info('Destroying tradfri connection');
    tradfri.destroy();
  }
});
