// Stub for react-native-reanimated/scripts/validate-worklets-version
// This script uses Node.js APIs and cannot be bundled for React Native
// The validation should happen at build time, so we return a no-op for runtime

/** @returns {{ ok: boolean; message?: string }} */
function validateWorkletsVersion(reanimatedVersion) {
  // Return success - validation should have happened at build time
  // This is safe because the actual validation happens during native build
  return { ok: true };
}

module.exports = validateWorkletsVersion;
