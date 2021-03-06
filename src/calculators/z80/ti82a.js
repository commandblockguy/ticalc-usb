const properties = {
  name: "TI-82 Advanced",
  status: "experimental",

  // This is a filter for navigator.usb.requestDevice
  // See http://www.linux-usb.org/usb.ids for IDs
  identifier: {
    vendorId: 0x0451,
    productId: 0xe008
  },

  // This is the matcher used to identify this specific device
  matcher: {
    vendorId: 0x0451,
    productId: 0xe008,
    productName: "TI-82 Advanced"
  },

  // These are the file types we can send this particular device
  compatibleFiles: [
    'TI-83',
    'TI-84 Plus'
  ]
};

const Calculator = require('../../dusb/ti84series');
module.exports = {
  ...properties,
  connect: device => new Calculator({ device, properties }).connect()
};
