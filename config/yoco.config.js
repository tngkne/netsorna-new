/**
 * Yoco Payment Gateway Configuration
 */
module.exports = {
  currency: 'ZAR',
  mode: process.env.ENVIRONMENT === 'production' ? 'live' : 'test',
  publicKey: process.env.YOCO_PUBLIC_KEY || 'pk_test_yoco_default_key',
  endpoints: {
    checkout: 'https://online.yoco.com/v1/charges'
  }
};
