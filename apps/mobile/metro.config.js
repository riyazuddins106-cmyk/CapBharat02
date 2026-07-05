const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo so Metro can resolve shared packages
config.watchFolders = [workspaceRoot];

// Tell Metro where to look for node_modules:
// 1. App-level node_modules
// 2. Workspace root node_modules
// 3. pnpm virtual store (where hoisted transitive deps live)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules/.pnpm/node_modules'),
];

config.projectRoot = projectRoot;

module.exports = config;
