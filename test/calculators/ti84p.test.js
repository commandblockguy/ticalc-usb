const replay = require('../helpers/replay');
const TI84P = require('../../src/calculators/z80/ti84p');
let calculator;

describe('TI-84 Plus support', () => {

  beforeAll(async () => {
    calculator = await replay.load({
      calculator: TI84P,
      replay: './test/calculators/ti84p.replay.json'
    });
  });

  describe('the device', () => {
    it('is recognized as a TI-84 Plus', () => {
      // This is an insufficient test because it is taken
      // from the USB device, we need to fix that:
      expect(calculator.name).toEqual('TI-84 Plus');
    });

    it('is handled by the Ti84series class', () => {
      expect(calculator.constructor.name).toEqual('Ti84series');
    });

    it('has a buffer size of 250 bytes', () => {
      expect(calculator._d._bufferSize).toEqual(250);
    });
  });

  describe('communicating through USB', () => {
    it('is ready', async () => {
      expect(await calculator.isReady()).toBe(true);
    });

    it('gets the amount of free memory', async () => {
      expect(await calculator.getFreeMem()).toEqual({
        ram:   23370,
        flash: 415043
      });
    });
  });

  describe('the replay', () => {
    it('has no unplayed steps left over', () => {
      expect(replay.unplayedSteps()).toEqual([]);
    });
  });

});
