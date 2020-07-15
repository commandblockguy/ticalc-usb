const Device = require('../dusb/device');
const v = require('../dusb/magic-values');
const b = require('../byte-mangling');

module.exports = class Ti84series {

  constructor(device) {
    this._d = new Device(device);
    this.name = name;
  }

  async connect() {
    await this._d.connect();
    return this;
  }

  canReceive(file) {
    return [
      'TI-83',
      'TI-84 Plus'
    ].includes(file.calcType);
  }

  // Check if the calculator is connected and listening
  async isReady() {
    try {
      await this._d.send({
        type: v.virtualPacketTypes.DUSB_VPKT_PING,
        data: v.modes.DUSB_MODE_NORMAL
      });
      await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_MODE_SET);
      return true;
    } catch(e) {
      console.debug(e);
      return false;
    }
  }

  // Remotely press a key on the calculator
  // For key values, see https://github.com/debrouxl/tilibs/blob/master/libticalcs/trunk/src/keys83p.h
  async pressKey(key) {
    await this._d.send({
      type: v.virtualPacketTypes.DUSB_VPKT_EXECUTE,
      data: [0, 0, v.executeCommands.DUSB_EID_KEY, 0, key]
    });
    await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_DELAY_ACK);
    // This does not seem strictly necessary:
    // await this._d.wait(100);
    await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_DATA_ACK);
  }

  // Request the amount of free RAM and Flash memory
  async getFreeMem() {
    await this._d.send({
      type: v.virtualPacketTypes.DUSB_VPKT_PARM_REQ,
      data: [
        0, 2,
        b.intToBytes(v.parameters.DUSB_PID_FREE_RAM, 2),
        b.intToBytes(v.parameters.DUSB_PID_FREE_FLASH, 2)
      ].flat()
    });

    const delayResponse = await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_DELAY_ACK);
    const delay = b.bytesToInt(delayResponse.data);
    await this._d.wait(delay / 1000);

    const paramsResponse = await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_PARM_DATA);
    const params = b.destructParameters(paramsResponse.data);
    if ( !params.every(p => p.ok) )
      throw 'Could not succesfully get all parameters';

    return {
      ram: params.find(p => p.type == v.parameters.DUSB_PID_FREE_RAM).value,
      flash: params.find(p => p.type == v.parameters.DUSB_PID_FREE_FLASH).value,
    };
  }

  // Send a TI file to the calculator
  async sendFile(file) {
    for ( let i = 0; i < file.entries.length; i++ ) {
      await this._sendEntry(file.entries[i]);
    }
  }

  async _sendEntry(entry) {
    await this._d.send({
      type: v.virtualPacketTypes.DUSB_VPKT_RTS,
      data: [
        0, entry.name.length,
        ...b.asciiToBytes(entry.name, entry.name.length), 0,
        ...b.intToBytes(entry.size, 4),
        v.transferModes.SILENT,
        ...b.constructParameters([
          {
            type: v.attributes.DUSB_AID_VAR_TYPE,
            size: 4,
            value: 0xF0070000 + entry.type
          },
          {
            type: v.attributes.DUSB_AID_ARCHIVED,
            size: 1,
            value: entry.attributes && entry.attributes.archived ? 1 : 0
          },
          {
            type: v.attributes.DUSB_AID_VAR_VERSION,
            size: 4,
            value: entry.attributes && entry.attributes.version || 0
          }
        ])
      ]
    })
    await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_DATA_ACK);

    await this._d.send({
      type: v.virtualPacketTypes.DUSB_VPKT_VAR_CNTS,
      data: entry.data
    });
    await this._d.expect(v.virtualPacketTypes.DUSB_VPKT_DATA_ACK);

    await this._d.send({
      type: v.virtualPacketTypes.DUSB_VPKT_EOT
    });
  }

}
