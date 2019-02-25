'use strict';
Object.defineProperty(exports, '__esModule', {value: true});

var _child_process = require('child_process');
var _once = require('./utils/once.js');
var _JestWorkerRPCProcess = require('./rpc/JestWorkerRPCProcess.generated');
var _JestWorkerRPCProcess2 = _interopRequireDefault(_JestWorkerRPCProcess);
var _get_electron_bin = require('./utils/get_electron_bin.js');
var _throat = require('throat');
var _throat2 = _interopRequireDefault(_throat);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);
    if (typeof Object.getOwnPropertySymbols === 'function') {
      ownKeys = ownKeys.concat(
        Object.getOwnPropertySymbols(source).filter(function(sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        })
      );
    }
    ownKeys.forEach(function(key) {
      _defineProperty(target, key, source[key]);
    });
  }
  return target;
}
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

// Share ipc server and farm between multiple runs, so we don't restart

let jestWorkerRPCProcess;

const isMain = target => target === 'main';
const isRenderer = target => target === 'renderer';

const startWorker = async ({rootDir, target}) => {
  if (isRenderer(target) && jestWorkerRPCProcess) {
    return jestWorkerRPCProcess;
  }

  const proc = new _JestWorkerRPCProcess2.default({
    spawn: ({serverID}) => {
      const injectedCodePath = require.resolve(
        './electron_process_injected_code.js'
      );

      const currentNodeBinPath = process.execPath;
      const electronBin = (0, _get_electron_bin.getElectronBin)(rootDir);
      return (0, _child_process.spawn)(
        currentNodeBinPath,
        [electronBin, injectedCodePath],
        {
          stdio: [
            'inherit',
            // redirect child process' stdout to parent process stderr, so it
            // doesn't break any tools that depend on stdout (like the ones
            // that consume a generated JSON report from jest's stdout)
            process.stderr,
            'inherit'
          ],

          env: _objectSpread(
            {},
            process.env,
            isMain(target) ? {isMain: 'true'} : {},
            {
              JEST_SERVER_ID: serverID
            }
          ),

          detached: true
        }
      );
    }
  });

  if (isRenderer(target)) {
    jestWorkerRPCProcess = proc;
  }

  await proc.start();
  DISPOSABLES.add(() => {
    proc.stop();
  });

  return proc;
};

const registerProcessListeners = cleanup => {
  registerProcessListener('SIGINT', () => {
    cleanup();
    process.exit(130);
  });

  registerProcessListener('exit', () => {
    cleanup();
  });

  registerProcessListener('uncaughtException', () => {
    cleanup();
    // This will prevent other handlers to handle errors
    // (e.g. global Jest handler). TODO: find a way to provide
    // a cleanup function to Jest so it runs it instead
    process.exit(1);
  });
};

const DISPOSABLES = new Set();

class TestRunner {
  getTarget() {
    throw new Error('Must be implemented in a subclass');
  }

  constructor(globalConfig) {
    _defineProperty(this, '_globalConfig', void 0);
    _defineProperty(this, '_ipcServerPromise', void 0);
    this._globalConfig = globalConfig;
  }

  async runTests(tests, watcher, onStart, onResult, onFailure) {
    const isWatch = this._globalConfig.watch || this._globalConfig.watchAll;
    const {maxWorkers, rootDir} = this._globalConfig;
    const concurrency = isWatch ? 1 : Math.min(tests.length, maxWorkers);
    const target = this.getTarget();

    const cleanup = (0, _once.once)(() => {
      for (const dispose of DISPOSABLES) {
        dispose();
        DISPOSABLES.delete(dispose);
      }
    });

    registerProcessListeners(cleanup);

    // Startup the process for renderer tests, since it'll be one
    // process that every test will share.
    isRenderer(target) && (await startWorker({rootDir, target}));

    await Promise.all(
      tests.map(
        (0, _throat2.default)(concurrency, async test => {
          onStart(test);
          const config = test.context.config;
          const globalConfig = this._globalConfig;
          // $FlowFixMe
          const rpc = await startWorker({rootDir, target});
          await rpc.remote
            .runTest({
              serializableModuleMap: test.context.moduleMap.toJSON(),
              config,
              globalConfig,
              path: test.path
            })
            .then(testResult => {
              testResult.testExecError != null
                ? onFailure(test, testResult.testExecError)
                : onResult(test, testResult);
            })
            .catch(error => onFailure(test, error));
          // If we're running tests in electron 'main' process
          // we need to respawn them for every single test.
          isMain(target) && rpc.stop();
        })
      )
    );

    if (!isWatch) {
      cleanup();
    }
  }
}
exports.default = TestRunner;

// Because in watch mode the TestRunner is recreated each time, we have
// to make sure we're not registering new process events on every test
// run trigger (at some point EventEmitter will start complaining about a
// memory leak if we do).We'll keep a global map of callbalks (because
// `process` is global) and deregister the old callbacks before we register
// new ones.
const REGISTERED_PROCESS_EVENTS_MAP = new Map();
const registerProcessListener = (eventName, cb) => {
  if (REGISTERED_PROCESS_EVENTS_MAP.has(eventName)) {
    process.off(eventName, REGISTERED_PROCESS_EVENTS_MAP.get(eventName));
  }
  process.on(eventName, cb);
  REGISTERED_PROCESS_EVENTS_MAP.set(eventName, cb);
};
