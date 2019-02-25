'use strict';

var _RPCConnection = require('@jest-runner/rpc/RPCConnection');
var _RPCConnection2 = _interopRequireDefault(_RPCConnection);
var _NuclideE2ERPC = require('../rpc/NuclideE2ERPC');
var _NuclideE2ERPC2 = _interopRequireDefault(_NuclideE2ERPC);
var _jestCircus = require('jest-circus');
var _jestCircus2 = _interopRequireDefault(_jestCircus);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */ module.exports = {
  async activate() {
    // Disable prompt to download react devtools in atom tests
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {isDisabled: true};
    Object.assign(global, _jestCircus2.default);
    const rpcConnection = new _RPCConnection2.default(_NuclideE2ERPC2.default);
    await rpcConnection.connect();
  },
  deactivate() {}
};