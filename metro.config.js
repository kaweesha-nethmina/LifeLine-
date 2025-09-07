const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Firebase and Hermes compatibility issue
// This is necessary because newer Firebase SDK versions use .cjs files
// and unstable_enablePackageExports can cause issues with how Metro bundles them.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
