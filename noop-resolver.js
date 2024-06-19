const path = require('path');

module.exports = function (bundler) {
  bundler.addAssetType('noop', require.resolve('./noop-asset.js'));
  bundler.addPackager('noop', require.resolve('./noop-packager.js'));
};
