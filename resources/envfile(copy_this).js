require('dotenv').config();

// Prefill environment variables here in case dotenv does not work in your environment
const DEV = '';
const PORT = '';
const PASS = '';
const HUBIP = '';
const APIUSER = '';
const APIKEY = '';

module.exports = {
  DEV: process.env.DEV || DEV,
  PORT: process.env.PORT || PORT,
  PASS: process.env.PASS || PASS,
  HUBIP: process.env.HUBIP || HUBIP,
  APIUSER: process.env.APIUSER || APIUSER,
  APIKEY: process.env.APIKEY || APIKEY,
};
