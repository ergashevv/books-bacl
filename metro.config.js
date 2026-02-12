const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

// Ignore server files from Metro bundler (but allow scripts in node_modules)
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /\/server\/.*/,
  /^scripts\/.*/, // Only block scripts in project root, not node_modules
];

// Enable package exports resolution
config.resolver.unstable_enablePackageExports = true;

// Add custom resolver for react-native-reanimated scripts
// The validate-worklets-version script uses Node.js APIs and cannot be bundled
// Use a stub version instead
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // expo-font web loader imports this package directly.
  // In some Metro setups this resolution can fail unless we map it explicitly.
  if (moduleName === 'fontfaceobserver') {
    try {
      return {
        filePath: require.resolve('fontfaceobserver'),
        type: 'sourceFile',
      };
    } catch (e) {
      // Fall through to default resolver if package is not present.
    }
  }

  // Handle react-native-reanimated script imports with stub
  if (moduleName === 'react-native-reanimated/scripts/validate-worklets-version') {
    const stubPath = path.resolve(__dirname, 'metro-stubs/react-native-reanimated/scripts/validate-worklets-version.js');
    if (fs.existsSync(stubPath)) {
      return {
        filePath: stubPath,
        type: 'sourceFile',
      };
    }
  }
  
  // Fall back to default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  // Use default Metro resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
