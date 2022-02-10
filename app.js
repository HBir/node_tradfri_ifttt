const express = require('express');
const promiseRetry = require('promise-retry');
const tradfriLib = require('node-tradfri-client');
const nodeCleanup = require('node-cleanup');

const {
  executeCommand,
  deviceUpdated,
  deviceRemoved,
  groupUpdated,
} = require('./src/tradfri_handler');

// Copy envfile(copy_this).js and rename to envfile.js
const {
  PORT, PASS, HUBIP, APIUSER, APIKEY,
} = require('./resources/envfile');

const app = express();

const { TradfriClient } = tradfriLib;

const options = {
  watchConnection: false,
};

const tradfri = new TradfriClient(HUBIP, options);

nodeCleanup(() => {
  console.log('Cleaning up...');
  if (tradfri) {
    console.log('Destroying tradfri connection');
    tradfri.destroy();
  }
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

app.get('/health', (req, res) => {
  console.log('health check');
  res.send('up and running');
});

app.get('/api/:command/:id/:state', (req, res) => {
  if (req.query.password !== PASS) {
    console.log('invalid password');
    res.status(403).send('wrong password');
    return;
  }

  const { command } = req.params;
  if (command === 'turn'
      || command === 'dim'
      || command === 'temp'
      || command === 'color') {
    executeCommand(tradfri, req.params.id, command, req.params.state);
    res.send('done');
    return;
  }

  console.log('unknown command', command);
  res.status(404).send('wrong command');
});

app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);
  const connection = await tradfri.connect(APIUSER, APIKEY);
  console.log(tradfri.watcher);
  tradfri.on('ping failed', console.log('ping failed'))
    .on('ping succeeded', console.log('ping succeeded'))
    .on('connection alive', console.log('connection alive'))
    .on('connection lost', console.log('connection lost'))
    .on('gateway offline', console.log('gateway offline'))
    .on('give up', console.log('give up'))
    .on('reconnecting', console.log('reconnecting'));

  await connection;
  // await connection;
  tradfri.on('device updated', deviceUpdated)
    .on('device removed', deviceRemoved)
    .observeDevices();
  tradfri.on('group updated', groupUpdated)
    .observeGroupsAndScenes();
});
