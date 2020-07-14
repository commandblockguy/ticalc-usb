const calculators = [
  require('./calculators/ti84p')
  // ...To be extended in the future?
];

const calcCache = {};
const eventHandlers = {
  connect: [],
  disconnect: []
};

module.exports = {

  models: () => calculators.map(c => c.name),

  choose: async () => {
    if ( !navigator.usb ) throw 'WebUSB not supported by this web browser';

    // Ask user to pick a device
    let device;
    try {
      device = await navigator.usb.requestDevice({
        filters: calculators.map(c => c.identifier)
      });
    } catch(e) {
      if ( e.message == "No device selected." )
        return;
      throw e;
    }

    // Wrap WebUSB device in a calculator object
    const calc = await createDevice(device);

    // Fire connect event
    eventHandlers.connect.forEach(h => h(calc));
  },

  addEventListener: (evnt, handler) => {
    if ( !Object.keys(eventHandlers).includes(evnt) )
      throw `Invalid event name: ${evnt}`;

    eventHandlers[evnt].push(handler);
  }

};

async function createDevice(device) {
  // Which type of device are we dealing with?
  const deviceHandler = calculators.find(c =>
    c.identifier.vendorId == device.vendorId &&
    c.identifier.productId == device.productId
  );

  if ( !deviceHandler )
    throw "Woops! Could not find device handler. WebUSB's filters are more complicated than I can currently handle.";

  // Create calculator instance and store in cache
  const calc = await deviceHandler.connect(device);
  calcCache[device] = calc;

  return calc;
}

async function findOrCreateDevice(device) {
  return calcCache[device] || await createDevice(device);
}

if ( navigator.usb ) {
  navigator.usb.addEventListener('connect', async e => {
    const calc = await findOrCreateDevice(device);
    console.debug('📱 Calculator connected');
    if ( !calc ) return;
    eventHandlers.connect.forEach(h => h(calc));
  });

  navigator.usb.addEventListener('disconnect', e => {
    const calc = calcCache[e.device];
    console.debug('📱 Calculator disconnected');
    if ( !calc ) return;
    eventHandlers.disconnect.forEach(h => h(calc));
  });

  // If we load the page, and we have existing paired devices, connect to those
  setTimeout(async () => {
    const devices = await navigator.usb.getDevices();
    devices.forEach(async device => {
      const calc = await findOrCreateDevice(device);
      eventHandlers.connect.forEach(h => h(calc));
    });
  }, 1);
}
