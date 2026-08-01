/**
 * Yoco Payment Gateway Configuration
 */

const yocoConfig = {
  currency: 'ZAR',
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
  publicKey: process.env.YOCO_PUBLIC_KEY || 'pk_test_9e87d40f5E4Mmokee984',
  endpoints: {
    checkout: 'https://online.yoco.com/v1/checkout/instant'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = yocoConfig;
}

export default yocoConfig;
