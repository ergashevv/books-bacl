const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ignore server files from Metro bundler
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /server\/.*/,
  /scripts\/.*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
