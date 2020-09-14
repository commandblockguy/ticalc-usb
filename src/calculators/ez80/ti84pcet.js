const Ti84PCET = require('../../dusb/ti84series');

module.exports = {
  name: "TI-84 Plus CE-T",

  // This is a filter for navigator.usb.requestDevice
  // See http://www.linux-usb.org/usb.ids for IDs
  identifier: {
    vendorId: 0x0451,
    productId: 0xe008
  },

  // This is the matcher used to find this specific device
  matcher: {
    vendorId: 0x0451,
    productId: 0xe008,
    productName: "TI-84 Plus CE"
  },

  connect: device => new Ti84PCET({
    device,

    // These are the file types we can send this particular device
    compatibleFiles: [
      'TI-83',
      'TI-84 Plus',
      'TI-84 Plus Color'
    ]
  }).connect()
}
