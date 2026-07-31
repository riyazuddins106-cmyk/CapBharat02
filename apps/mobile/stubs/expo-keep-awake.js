// Stub for expo-keep-awake — redirected via metro.config.js resolveRequest.
// expo/src/launch/withDevTools.tsx optionally requires this package and calls
// useKeepAwake(). The real native module throws "Unable to activate keep awake"
// on Android Expo Go. This stub satisfies the import with safe no-ops so the
// error never occurs. withDevTools's try/catch is irrelevant — the require()
// itself succeeds (it's the async hook call that threw), so we must provide
// working no-op exports, not just make the module unresolvable.
'use strict';

const ExpoKeepAwakeTag = 'ExpoKeepAwakeDefaultTag';

function useKeepAwake(_tag, _options) {
  // no-op hook — intentionally does nothing
}

async function activateKeepAwakeAsync(_tag) {}
async function deactivateKeepAwake(_tag) {}
function activateKeepAwake(_tag) { return Promise.resolve(); }
async function isAvailableAsync() { return false; }
function addListener(_tagOrListener, _listener) { return { remove: function() {} }; }

module.exports = {
  ExpoKeepAwakeTag,
  useKeepAwake,
  activateKeepAwakeAsync,
  activateKeepAwake,
  deactivateKeepAwake,
  isAvailableAsync,
  addListener,
};
