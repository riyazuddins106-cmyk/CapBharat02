"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useKeyboardAnimation = void 0;
var _react = require("react");
var _reactNativeReanimated = require("react-native-reanimated");
var _context = require("../../context");
var _hooks = require("../../hooks");
const useKeyboardAnimation = () => {
  const {
    reanimated
  } = (0, _context.useKeyboardContext)();

  // calculate it only once on mount, to avoid `SharedValue` reads during a render
  const [initialHeight] = (0, _react.useState)(() => -reanimated.height.value);
  const [initialProgress] = (0, _react.useState)(() => reanimated.progress.value);
  const heightWhenOpened = (0, _reactNativeReanimated.useSharedValue)(initialHeight);
  const height = (0, _reactNativeReanimated.useSharedValue)(initialHeight);
  const progress = (0, _reactNativeReanimated.useSharedValue)(initialProgress);
  const isClosed = (0, _reactNativeReanimated.useSharedValue)(initialProgress === 0);
  (0, _hooks.useKeyboardHandler)({
    onStart: e => {
      "worklet";

      if (e.height > 0) {
        // eslint-disable-next-line react-compiler/react-compiler
        isClosed.value = false;
        heightWhenOpened.value = e.height;
      }
    },
    onMove: e => {
      "worklet";

      progress.value = e.progress;
      height.value = e.height;
    },
    onInteractive: e => {
      "worklet";

      progress.value = e.progress;
      height.value = e.height;
    },
    onEnd: e => {
      "worklet";

      isClosed.value = e.height === 0;
      height.value = e.height;
      progress.value = e.progress;
    }
  }, []);
  return {
    height,
    progress,
    heightWhenOpened,
    isClosed
  };
};
exports.useKeyboardAnimation = useKeyboardAnimation;
//# sourceMappingURL=hooks.js.map