const recorder = require('./webusb/recorder');
const calculators = [
  require('./calculators/ti84p'),
  require('./calculators/ti84pse')
];

let recording;
const calcCache = {};
const eventHandlers = {
  connect: [],
  disconnect: []
};

module.exports = {

  browserSupported,

  models: () => calculators.map(c => c.name),

  addEventListener: (evnt, handler) => {
    if ( !Object.keys(eventHandlers).includes(evnt) )
      throw `Invalid event name: ${evnt}`;

    eventHandlers[evnt].push(handler);
  },

  init: async ({ usb }) => {
    if ( !usb) usb = findOrCreateWebUSBRecording();

    attachEventHandlers();

    // If we load the page, and we have existing paired devices, connect them
    const devices = await navigator.usb.getDevices();
    for ( let i = 0; i < devices.length; i++ ) {
      const calc = await findOrCreateDevice(devices[i]);
      eventHandlers.connect.forEach(h => h(calc));
    }
  },

  choose: async ({ catchAll, usb }) => {
    if ( !usb ) usb = findOrCreateWebUSBRecording();
    if ( catchAll ) calculators.push(require('./calculators/catchAll'));

    // Ask user to pick a device
    let device;
    try {
      device = await usb.requestDevice({
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

  getRecording: () => recording

};

function browserSupported() {
  return !!navigator.usb;
}

async function createDevice(device) {
  // Which type of device are we dealing with?
  const deviceHandler = calculators.find(c =>
    Object.keys(c.matcher).every(m => c.matcher[m] == device[m])
  );

  // If we couldn't find it, our USB identifiers catch more than we can support
  if ( !deviceHandler ) throw {
    message: "Calculator model not supported",
    device
  };

  // Create calculator instance and store in cache
  const calc = await deviceHandler.connect(device);
  calcCache[device] = calc;

  return calc;
}

async function findOrCreateDevice(device) {
  return calcCache[device] || await createDevice(device);
}

function attachEventHandlers() {
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
}

// We work with a recorder wrapper around navigator.usb by default, so we can
// dump the recording to the console or the user if something goes wrong. Also,
// this allows for a clean point to inject some logging.
function findOrCreateWebUSBRecording() {
  if ( !browserSupported() ) throw 'Browser not supported';
  if ( recording ) return recording;
  recording = recorder(navigator.usb, {
    injections: {
      transferIn: (args, result) =>
        console.debug("🖥←📱 Received:", prettify(new Uint8Array(result.data.buffer))),
      transferOut: (args, result) =>
        console.debug("🖥→📱 Sent:    ", prettify(args[1]))
    }
  });
  return recording;
}

function prettify(buffer) {
  const hex = [...buffer].map(b =>
    b.toString(16)
     .toUpperCase()
     .padStart(2, "0")
  );
  return [
    hex.slice(0,4).join(''),
    hex.slice(4,5).join(''),
    hex.length > 10 ? [
      hex.slice(5,9).join(''),
      hex.slice(9,11).join(''),
      hex.slice(11).join(',')
    ] : hex.slice(5).join(',')
  ].flat().join(' ');
}
