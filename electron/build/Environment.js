'use strict';
Object.defineProperty(exports, '__esModule', {value: true});

var _jestMock = require('jest-mock');
var _jestMock2 = _interopRequireDefault(_jestMock);
var _jestUtil = require('jest-util');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

class ElectronEnvironment {
  constructor(config) {
    this.global = global;
    this.moduleMocker = new _jestMock2.default.ModuleMocker(global);
    this.fakeTimers = {
      useFakeTimers() {
        throw new Error('fakeTimers are not supproted in atom environment');
      }
    };

    (0, _jestUtil.installCommonGlobals)(global, config.globals);
  }

  async setup() {}

  async teardown() {}

  runScript(script) {
    // Since evrey tests runs in a new window we don't need any extra isolation
    // as we need in Jest node runner
    return script.runInThisContext();
  }
}
exports.default = ElectronEnvironment;
/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */
