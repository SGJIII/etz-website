const { Asset } = require('parcel-bundler');

class NoopAsset extends Asset {
  async generate() {
    return {
      js: 'module.exports = {};',
    };
  }
}

module.exports = NoopAsset;
