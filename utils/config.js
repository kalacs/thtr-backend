const merge = require("deepmerge");

module.exports = function getConfig(defaultConfig, userConfig) {
  return merge(defaultConfig, userConfig);
};
