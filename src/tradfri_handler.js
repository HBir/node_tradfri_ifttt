const RGBColor = require('rgbcolor');
const tradfriLib = require('node-tradfri-client');
const _ = require('lodash');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

async function operate(tradfri, device, operation) {
  if (device.type === tradfriLib.AccessoryTypes.lightbulb) {
    tradfri.operateLight(device, operation);
  } else if (device.type === tradfriLib.AccessoryTypes.plug && operation.onOff !== null) {
    tradfri.operatePlug(device, operation);
  }
}

function performOperation(tradfri, device, command, state) {
  const currentState = (device.lightList || device.plugList)[0].onOff;
  console.log(command, device.name, `(${device.instanceId})`, currentState ? 'on' : 'off', '>', state);
  if (command === 'turn') {
    operate(tradfri, device, { onOff: state === 'on' });
  } else if (command === 'dim') {
    operate(tradfri, device, { dimmer: state });
  } else if (command === 'temp') {
    operate(tradfri, device, { colorTemperature: state });
  } else if (command === 'color') {
    // Fixup color names into rgb value strings if necessary
    const color = new RGBColor(state).toHex().slice(1);
    operate(tradfri, device, { color });
  }
}

const trimCommandString = (id) => ((id === 'all')
  ? '' : replaceAll(id.replace(/the/g, '').trim().toLowerCase(), '_', ' '));

function toggleState(state, onOff) {
  if (state === 'toggle') {
    return onOff ? 'off' : 'on';
  }
  return state;
}

function executeCommand(tradfri, idRaw, command, state) {
  const devices = _.pickBy(tradfri.devices, (device) =>
    device.type === tradfriLib.AccessoryTypes.lightbulb
    || device.type === tradfriLib.AccessoryTypes.plug);
  const { groups } = tradfri;

  const id = trimCommandString(idRaw);

  console.log('executeCommand', command, id, state);
  const groupMatch = Object.keys(groups)
    .filter((group) => groups[group].group.name.toLowerCase().includes(id));

  if (groupMatch.length >= 1 && groupMatch[0]) {
    const updatedState = toggleState(state, groups[groupMatch[0]].group.onOff);
    groupMatch.forEach((groupId) => {
      const { group } = groups[groupId];

      tradfri.operateGroup(group, { onOff: updatedState === 'on' });
      group.deviceIDs.forEach((deviceId) => {
        const device = devices[deviceId];
        if (device) {
          performOperation(tradfri, device, command, updatedState);
        }
      });
    });
    return `Updated ${groupMatch.length} group(s)`;
  }

  const deviceMatch = Object.keys(devices).filter((device) => devices[device].name.toLowerCase().startsWith(id));
  if (deviceMatch.length >= 1 && deviceMatch[0]) {
    const updatedState = toggleState(state, devices[deviceMatch[0]].plugList[0].onOff);
    deviceMatch.forEach((deviceId) => performOperation(tradfri, devices[deviceId], command, updatedState));
    return `Updated ${deviceMatch.length} device(s)`;
  }
  return `No matches for ${id}`;
}

function deviceUpdated(tradfri, device) {
  console.log('deviceUpdated', device.instanceId, device.name);
  // Updating group onOff status when device status change
  Object.keys(tradfri.groups).forEach((key) => {
    const deviceInGroup = tradfri.groups[key].group.deviceIDs.find((deviceId) => deviceId === device.instanceId);
    if (deviceInGroup && device.type === tradfriLib.AccessoryTypes.lightbulb) {
      /* eslint-disable no-param-reassign */
      tradfri.groups[key].group.onOff = device.lightList[0].onOff;
      tradfri.groups[key].group.dimmer = device.lightList[0].dimmer;
    }
    if (deviceInGroup && device.type === tradfriLib.AccessoryTypes.plug) {
      tradfri.groups[key].group.onOff = device.plugList[0].onOff;
    }
    /* eslint-disable no-param-reassign */
  });
}

function deviceRemoved(instanceId) {
  console.log('deviceRemoved', instanceId);
}

function groupUpdated(group) {
  console.log('groupUpdated', group.instanceId, group.name);
}

function groupRemoved(instanceId) {
  console.log('groupRemoved', instanceId);
}

const getGroups = (tradfri) => Object.keys(tradfri.groups).reduce((prev, key) => ({
  [key]: tradfri.groups[key].group.name,
  ...prev,
}), {});

const getDevices = (tradfri) => Object.keys(tradfri.devices).reduce((prev, key) => ({
  ...prev,
  [tradfriLib.AccessoryTypes[tradfri.devices[key].type]]: {
    ...prev[tradfriLib.AccessoryTypes[tradfri.devices[key].type]],
    [key]: tradfri.devices[key].name,
  },
}
), {});

module.exports = {
  executeCommand,
  deviceUpdated,
  deviceRemoved,
  groupUpdated,
  groupRemoved,
  getGroups,
  getDevices,
};
