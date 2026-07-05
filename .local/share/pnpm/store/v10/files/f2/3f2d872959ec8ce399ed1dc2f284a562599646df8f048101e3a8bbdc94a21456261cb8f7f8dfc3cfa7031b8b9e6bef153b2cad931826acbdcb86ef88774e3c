"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useWindowDimensions = void 0;
var _react = require("react");
var _bindings = require("../../bindings");
let initialDimensions = {
  width: 0,
  height: 0
};
_bindings.WindowDimensionsEvents.addListener("windowDidResize", e => {
  initialDimensions = e;
});
const useWindowDimensions = () => {
  const [dimensions, setDimensions] = (0, _react.useState)(initialDimensions);
  (0, _react.useEffect)(() => {
    const subscription = _bindings.WindowDimensionsEvents.addListener("windowDidResize", e => {
      setDimensions(e);
    });
    return () => {
      subscription.remove();
    };
  }, []);
  return dimensions;
};
exports.useWindowDimensions = useWindowDimensions;
//# sourceMappingURL=index.android.js.map