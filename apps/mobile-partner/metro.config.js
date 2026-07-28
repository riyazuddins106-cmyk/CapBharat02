const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
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

// pnpm's node_modules entries are symlinks into the .pnpm virtual store.
// Metro's own hierarchical resolver follows those symlinks down to their
// REAL path, but a naive extraNodeModules override (pointing at the
// symlink itself) makes Metro treat the symlink path and the real path as
// two different modules — even though they're the same file on disk. That
// mismatch is what causes "more than one copy of React" / "Invalid hook
// call" / "Cannot read property 'useState' of null". Resolving to the
// realpath here guarantees every import lands on the exact same instance.
function resolveReal(pkg) {
  return fs.realpathSync(require.resolve(pkg, { paths: [projectRoot] }));
}

config.resolver.unstable_enableSymlinks = true;

// Packages that don't declare React as an explicit dependency (e.g. the
// @expo-google-fonts/* font packages) fall back to pnpm's shared hoist
// folder (node_modules/.pnpm/node_modules) via our nodeModulesPaths entry
// below — and that shared folder happens to point 'react' at whichever
// version customer-web/admin-web hoisted (18.3.1), NOT the mobile app's
// 19.1.0. extraNodeModules alone can't fix this because it's only used as
// a fallback AFTER normal hierarchical resolution succeeds/fails — and
// here it succeeds (with the wrong version) before extraNodeModules is
// ever consulted. So we forcibly intercept these module names in
// resolveRequest, which always wins regardless of what hierarchical
// lookup would have found.
const FORCED_MODULES = {
  'react':                   resolveReal('react'),
  'react-dom':               resolveReal('react-dom'),
  'react-native':            resolveReal('react-native'),
  'react-native-reanimated': resolveReal('react-native-reanimated'),
};

// react-native-worklets declares a "react-native" source entry that points to
// TypeScript. Under pnpm, Metro can resolve that source entry before the
// compiled package entry, which crashes the Reanimated 4 bundle. Force the
// compiled entry instead.
const reanimatedRoot = path.dirname(resolveReal('react-native-reanimated'));
const workletsRoot = path.dirname(
  require.resolve('react-native-worklets/package.json', { paths: [reanimatedRoot] }),
);
FORCED_MODULES['react-native-worklets'] = path.join(workletsRoot, 'lib/module/index.js');

config.resolver.extraNodeModules = { ...FORCED_MODULES };

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(FORCED_MODULES, moduleName)) {
    return { type: 'sourceFile', filePath: FORCED_MODULES[moduleName] };
  }

  // ESM packages in the monorepo (e.g. @servenow/shared) use .js extensions
  // in their TypeScript source imports. Metro resolves TS source directly and
  // cannot map .js → .ts, so we strip the .js suffix for relative imports
  // that originate from inside the workspace and let Metro find the .ts file.
  if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
    const origin = context.originModulePath || '';
    if (origin.startsWith(workspaceRoot) && moduleName.endsWith('.js')) {
      const stripped = moduleName.slice(0, -3);
      try {
        return (defaultResolveRequest || context.resolveRequest)(
          context, stripped, platform,
        );
      } catch (_) { /* fall through to normal resolution */ }
    }
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

config.projectRoot = projectRoot;

module.exports = config;
