// TODO: Fix these disabled rules
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const RGBColor = require('rgbcolor');
const tradfriLib = require('node-tradfri-client');

// TODO: Don't use global mutable variables
// const groups = {};
// const devices = {};
// const plugs = {}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// eslint-disable-next-line no-unused-vars

function performOperation(tradfri, device, command, state) {
  // console.log(device);
  const currentState = (device.lightList || device.plugList)[0].onOff;
  console.log(
    command, device.name, `(${device.instanceId})`, currentState ? 'on' : 'off', '>', state
  );
  if (command === 'turn') {
    if (state === 'toggle') {
      tradfri.operateLight(device, { onOff: !currentState });
    } else {
      tradfri.operateLight(device, { onOff: state === 'on' });
    }
  } else if (command === 'dim') {
    tradfri.operateLight(device, { dimmer: state });
  } else if (command === 'temp') {
    tradfri.operateLight(device, { colorTemperature: state });
  } else if (command === 'color') {
    // Fixup color names into rgb value strings if necessary
    const color = new RGBColor(state).toHex().slice(1);
    tradfri.operateLight(device, { color });
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
  console.log(id);
  return replaceAll(id.replace(/the/g, '').trim().toLowerCase(), '_', ' ');
};

// function executeGroup()

function executeCommand(tradfri, idRaw, command, state) {
  const devices = tradfri.devices;
  const groups = tradfri.groups;
  const id = trimCommandString(idRaw);

  console.log('executeCommand', command, id, state);
  const groupMatch = Object.keys(groups).filter((group) =>  groups[group].group.name.toLowerCase().includes(id));
  if (groupMatch.length > 0) {
    tradfri.operateGroup(group, { onOff: state === 'on' });
    console.log("for group:", groupId);
    for (const deviceId of group.deviceIDs) {
      const device = devices[deviceId];
      if (device.type === tradfriLib.AccessoryTypes.lightbulb ||
            device.type === tradfriLib.AccessoryTypes.plug) { // skip non-bulbs
        performOperation(tradfri, device, command, state);
      }
    }
    return;
  }
  console.log(devices);
  const deviceMatch = Object.keys(devices).filter((device) =>  devices[device].device.name.toLowerCase().startsWith(id));
  for (const deviceID in deviceMatch) {
    console.log(deviceID);
    const device = devices[deviceID];

  }

  for (const bulbid in devices) {
    console.log(bulbid);
    const bulb = devices[bulbid];
    if (bulb.name.toLowerCase().startsWith(id)) {
      console.log('for bulbid: ', command, bulb.name, `(${bulb.instanceId})`, state);

      performOperation(tradfri, bulb, command, state);
      // we don't return, so we can apply to all bulbs that share a naming convention
    }
  }
}

function deviceUpdated(device) {
  console.log('deviceUpdated', device.instanceId, device.name);
  // if (device.type === tradfriLib.AccessoryTypes.lightbulb ||
  //   device.type === tradfriLib.AccessoryTypes.plug) {
  //   devices[device.instanceId] = {
  //     onOff: (device.lightList || device.plugList)[0].onOff,
  //     dimmer: (device.lightList || device.plugList)[0].dimmer,
  //     name: device.name,
  //     deviceID: device.instanceId
  //   };
  // }
}

function deviceRemoved(instanceId) {
  if (instanceId in devices) {
    console.log('deviceRemoved', instanceId, devices[instanceId].name);
    // delete devices[instanceId];
  }
}

function groupUpdated(group) {
  console.log('groupUpdated', group.instanceId, group.name);
  // groups[group.instanceId] = group;
}

function groupRemoved(group) {
  console.log('groupRemoved', group.instanceId, group.name);
  // delete groups[group.instanceId];
}

const getGroups = () => Object.keys(groups).reduce((prev, key) => ({
  [key]: groups[key].name,
  ...prev,
}), {});

const getDevices = () => Object.keys(devices).reduce((prev, key) => ({
  [key]: devices[key].name,
  ...prev,
}), {});

module.exports = {
  executeCommand,
  deviceUpdated,
  deviceRemoved,
  groupUpdated,
  groupRemoved,
  getGroups,
  getDevices,
};
