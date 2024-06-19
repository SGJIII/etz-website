const { Packager } = require('parcel-bundler');

class NoopPackager extends Packager {
  async addAsset(asset) {
    // no-op
  }

  async end() {
    // no-op
  }
}

module.exports = NoopPackager;
