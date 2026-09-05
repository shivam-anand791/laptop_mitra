const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch all workspace packages for changes (packages are at repo root)
config.watchFolders = [
  path.resolve(__dirname, '../../../packages'),
];

// Resolve workspace packages correctly
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

// Disable package exports to avoid issues with pnpm symlinks
config.resolver.unstable_enablePackageExports = false;

module.exports = config;