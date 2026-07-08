const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo so Metro can resolve shared packages
config.watchFolders = [workspaceRoot];

// Tell Metro where to look for node_modules:
// 1. App-level node_modules (highest priority)
// 2. Workspace root node_modules
// 3. pnpm virtual store (where hoisted transitive deps live)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules/.pnpm/node_modules'),
];

// Force ALL packages in the monorepo to use the SAME React & RN copies.
// Without this, pnpm's isolated node_modules causes each package to resolve
// its own React, creating multiple instances → "Cannot read property 'useState' of null".
config.resolver.extraNodeModules = {
  'react':                    path.resolve(projectRoot, 'node_modules/react'),
  'react-dom':                path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native':             path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated':  path.resolve(projectRoot, 'node_modules/react-native-reanimated'),
};

config.projectRoot = projectRoot;

module.exports = config;
