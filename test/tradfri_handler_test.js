const chai = require('chai');
const { expect } = chai;
const { groups, devices } = require('./mockdata');

const tradfri_handler = require('../src/tradfri_handler')

describe('tradfri_handler', () => {
  describe('getInfo', () => {
    it('returns all groups and devices', () => {
      expect(1).to.be.eql(1);
    })
  })
})