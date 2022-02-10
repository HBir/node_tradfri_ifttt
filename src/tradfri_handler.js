// TODO: Fix these disabled rules
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const RGBColor = require('rgbcolor');
const tradfriLib = require('node-tradfri-client');

// TODO: Don't use global mutable variables
const groups = {};
const lightbulbs = {};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// eslint-disable-next-line no-unused-vars

function performOperation(tradfri, bulb, command, state) {
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

function executeCommand(tradfri, idraw, command, state) {
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

          performOperation(tradfri, bulb, command, state);
        }
      }
      return;
    }
  }

  for (const bulbid in lightbulbs) {
    const bulb = lightbulbs[bulbid];
    if (bulb.name.toLowerCase().startsWith(id)) {
      console.log('for bulbid: ', command, bulb.name, `(${bulb.instanceId})`, state);

      performOperation(tradfri, bulb, command, state);
      // we don't return, so we can apply to all bulbs that share a naming convention
    }
  }
}

function deviceUpdated(device) {
  console.log('tradfri_deviceUpdated', device.instanceId, device.name);
  if (device.type === tradfriLib.AccessoryTypes.lightbulb) {
    // remember it
    lightbulbs[device.instanceId] = device;
  }
}

function deviceRemoved(instanceId) {
  if (instanceId in lightbulbs) {
    console.log('tradfri_deviceRemoved', instanceId, lightbulbs[instanceId].name);
    delete lightbulbs[instanceId];
  }
}

function groupUpdated(group) {
  // remember it
  console.log('tradfri_groupUpdated', group.instanceId, group.name);
  groups[group.instanceId] = group;
}

async function registerDevicesAndGroups(GatewayDetails) {
  console.log(GatewayDetails);
}

module.exports = {
  executeCommand,
  deviceUpdated,
  deviceRemoved,
  groupUpdated,
  registerDevicesAndGroups,
};
