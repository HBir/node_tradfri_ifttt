// TODO: Fix these disabled rules
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable camelcase */
const express = require('express');
const promiseRetry = require('promise-retry');

const app = express();

const tradfriLib = require('node-tradfri-client');
const nodeCleanup = require('node-cleanup');
const RGBColor = require('rgbcolor');

// Copy envfile(copy_this).js and rename to envfile.js
const {
  PORT, PASS, HUBIP, APIUSER, APIKEY,
} = require('./envfile');

const { TradfriClient } = tradfriLib;

// TODO: Don't use global mutable variables
let tradfri = new TradfriClient(HUBIP);
const groups = {};
const lightbulbs = {};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// eslint-disable-next-line no-unused-vars
nodeCleanup((exitCode, signal) => {
  console.log('Cleaning up...');
  if (tradfri) {
    console.log('Destroying tradfri connection');
    tradfri.destroy();
  }
  tradfri = undefined;
});

function performOperation(bulb, command, state) {
  console.log(command, bulb.name, `(${bulb.instanceId})`, state);
  if (command === 'turn') {
    tradfri.operateLight(bulb, { onOff: state === 'on' });
  } else if (command === 'dim') {
    tradfri.operateLight(bulb, { dimmer: state });
  } else if (command === 'temp') {
    tradfri.operateLight(bulb, { colorTemperature: state });
  } else if (command === 'color') {
    // Fixup color names into rgb value strings if necessary
    const color = new RGBColor(state).toHex().slice(1);
    tradfri.operateLight(bulb, { color });
  }
}

const trimCommandString = (id) => {
  // If it's just "all" then we set it to the empty string, so we fall back
  // to setting every bulb (because every bulb name starts with empty string)
  if (id === 'all') {
    return '';
  }
  // When the id gets passed as "the living room" turn it into "living room"
  // Also "all the" gets turned into all.
  return replaceAll(id.replace(/the/g, '').trim().toLowerCase(), '_', ' ');
};

function executeCommand(idraw, command, state) {
  const id = trimCommandString(idraw);

  console.log('executeCommand', command, id, state);

  for (const groupId in groups) {
    const group = groups[groupId];
    if (group.name.toLowerCase() === id) {
      tradfri.operateGroup(group, { onOff: state === 'on' });
      for (const deviceId of group.deviceIDs) {
        const bulb = lightbulbs[deviceId];
        if (bulb) { // skip non-bulbs
          console.log('for group:, ', command, bulb.name, `(${bulb.instanceId})`, state);

          performOperation(bulb, command, state);
        }
      }
      return;
    }
  }

  for (const bulbid in lightbulbs) {
    const bulb = lightbulbs[bulbid];
    if (bulb.name.toLowerCase().startsWith(id)) {
      console.log('for bulbid: ', command, bulb.name, `(${bulb.instanceId})`, state);

      performOperation(bulb, command, state);
      // we don't return, so we can apply to all bulbs that share a naming convention
    }
  }
}

function tradfri_deviceUpdated(device) {
  console.log('tradfri_deviceUpdated', device.instanceId, device.name);
  if (device.type === tradfriLib.AccessoryTypes.lightbulb) {
    // remember it
    lightbulbs[device.instanceId] = device;
  }
}

function tradfri_deviceRemoved(instanceId) {
  if (instanceId in lightbulbs) {
    console.log('tradfri_deviceRemoved', instanceId, lightbulbs[instanceId].name);
    delete lightbulbs[instanceId];
  }
}

function tradfri_groupUpdated(group) {
  // remember it
  console.log('tradfri_groupUpdated', group.instanceId, group.name);
  groups[group.instanceId] = group;
}

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
    executeCommand(req.params.id, command, req.params.state);
    res.send('done');
    return;
  }

  console.log('unknown command', command);
  res.status(404).send('wrong command');
});

app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);

  await promiseRetry((retry, number) => tradfri.connect(APIUSER, APIKEY)
    .catch(async (err) => {
      console.log('[ERROR] Failed attempt number', number);
      console.log(err);
      await sleep(5000 * number);
      if (number <= 1000) {
        retry();
      }
      throw err;
    }));

  tradfri.on('device updated', tradfri_deviceUpdated)
    .on('device removed', tradfri_deviceRemoved)
    .observeDevices();
  tradfri.on('group updated', tradfri_groupUpdated)
    .observeGroupsAndScenes();
});
