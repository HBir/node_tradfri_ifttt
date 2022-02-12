const tradfriLib = require('node-tradfri-client');
const log = require('./logger');

function deviceUpdated(tradfri, device) {
  log.info('Device updated', device.instanceId, device.name);
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

const getGroups = (tradfri) => Object.keys(tradfri.groups).reduce((prev, key) => ({
  [key]: tradfri.groups[key].group.name,
  ...prev,
}), {});

const getDevices = (tradfri) => {
  console.log(JSON.stringify(tradfri.groups));
  return Object.keys(tradfri.devices).reduce((prev, key) => ({
    ...prev,
    [tradfriLib.AccessoryTypes[tradfri.devices[key].type]]: {
      ...prev[tradfriLib.AccessoryTypes[tradfri.devices[key].type]],
      [key]: tradfri.devices[key].name,
    },
  }
  ), {});
};

async function getInfo(tradfri) {
  const success = await tradfri.ping(5);
  return {
    serverRunning: true,
    gatewayConnected: success,
    connected: {
      groups: getGroups(tradfri),
      devices: getDevices(tradfri),
    },
  };
}

module.exports = {
  deviceUpdated,
  getGroups,
  getDevices,
  getInfo,
};
