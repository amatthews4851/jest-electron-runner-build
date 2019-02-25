'use strict';

var _run_test = require('jest-runner/build/run_test');
var _run_test2 = _interopRequireDefault(_run_test);

var _utils = require('@jest-runner/core/utils');

var _electron = require('electron');
var _resolver = require('../utils/resolver');
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
 */ const isMain = process.env.isMain === 'true';
const _runInNode = async testData => {
  try {
    return (0, _run_test2.default)(
      testData.path,
      testData.globalConfig,
      testData.config,
      (0, _resolver.getResolver)(testData.config, testData.rawModuleMap)
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return (0, _utils.buildFailureTestResult)(
      testData.path,
      error,
      testData.config,
      testData.globalConfig
    );
  }
};

const _runInBrowserWindow = testData => {
  return new Promise(resolve => {
    const workerID = (0, _utils.makeUniqWorkerId)();
    const win = new _electron.BrowserWindow({show: false});

    win.loadURL(`file://${require.resolve('../index.html')}`);
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('run-test', testData, workerID);
    });

    _electron.ipcMain.once(workerID, (event, testResult) => {
      win.destroy();
      resolve(testResult);
    });
  }).catch(error => {
    const testResult = (0, _utils.buildFailureTestResult)(
      testData.path,
      error,
      testData.config,
      testData.globalConfig
    );

    return testResult;
  });
};

const _runTest = testData => {
  return isMain ? _runInNode(testData) : _runInBrowserWindow(testData);
};

module.exports = {
  runTest(testData) {
    return _runTest(testData);
  },
  shutDown() {
    return Promise.resolve();
  }
};
