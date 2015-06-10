'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$defineProperty = require('babel-runtime/core-js/object/define-property')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

_Object$defineProperty(exports, '__esModule', {
  value: true
});

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _es6Promisify = require('es6-promisify');

var _es6Promisify2 = _interopRequireDefault(_es6Promisify);

var _playerglobalLatest = require('playerglobal-latest');

var _download = require('download');

var _download2 = _interopRequireDefault(_download);

var _defaults = require('defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _tmp = require('tmp');

var _tmp2 = _interopRequireDefault(_tmp);

var _fsExists = require('fs-exists');

var _fsExists2 = _interopRequireDefault(_fsExists);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

_es6Promise2['default'].polyfill();

var exists = (0, _es6Promisify2['default'])(_fsExists2['default']);
var mkdirp = (0, _es6Promisify2['default'])(_mkdirp2['default']);
var rimraf = (0, _es6Promisify2['default'])(_rimraf2['default']);
var installPlayerglobal = (0, _es6Promisify2['default'])(_playerglobalLatest.install);
var mktmpdir = (0, _es6Promisify2['default'])(_tmp2['default'].dir.bind(_tmp2['default']));
var readFile = (0, _es6Promisify2['default'])(_fs2['default'].readFile);
var writeFile = (0, _es6Promisify2['default'])(_fs2['default'].writeFile);
var chmod = (0, _es6Promisify2['default'])(_fs2['default'].chmod);
var readdir = (0, _es6Promisify2['default'])(_fs2['default'].readdir);
var rename = (0, _es6Promisify2['default'])(_fs2['default'].rename);
var stat = (0, _es6Promisify2['default'])(_fs2['default'].stat);

var IS_WINDOWS = /^win/.test(_os2['default'].platform());

var PKG_ROOT = _path2['default'].resolve(__dirname, '..');
var FLEX_SDK_ROOT = _path2['default'].join(PKG_ROOT, 'lib', 'flex-sdk');
var VERSIONS = require(_path2['default'].join(PKG_ROOT, 'versions.json'));

var RETRY_INTERVAL = 200;
var UPDATE_INTERVAL = 500;
var MAX_AGE = 1000;

var UPDATE_TIMEOUTS = {};

var FlexSdkProvider = (function () {
  function FlexSdkProvider(options) {
    _classCallCheck(this, FlexSdkProvider);

    this._options = (0, _defaults2['default'])(options, { root: FLEX_SDK_ROOT });
  }

  _createClass(FlexSdkProvider, [{
    key: 'download',
    value: function download(version) {
      var _this = this;

      var dir = null;
      return this._awaitUnlock(version).then(function () {
        return _this._beginDownload(version);
      }).then(function () {
        return _this._downloadAndInstall(version);
      }).then(function (_dir) {
        return dir = _dir;
      }).then(function () {
        return _this._endDownload(version);
      }, function (err) {
        return _this._setDownloading(version, false).then(function () {
          throw err;
        });
      }).then(function () {
        return dir;
      });
    }
  }, {
    key: 'isDownloading',
    value: function isDownloading(version) {
      var lockFile = this._toLockFile(version);
      return exists(lockFile).then(function (ex) {
        if (!ex) {
          return false;
        }
        return FlexSdkProvider._readLockFile(lockFile);
      });
    }
  }, {
    key: 'locate',
    value: function locate(version) {
      var _this2 = this;

      return this._awaitUnlock(version).then(function () {
        var dir = _this2._toPath(version);
        return stat(dir).then(function () {
          return dir;
        });
      });
    }
  }, {
    key: 'get',
    value: function get(version) {
      var _this3 = this;

      return this.locate(version)['catch'](function () {
        return _this3.isDownloading(version).then(function (dl) {
          return !dl ? _this3.download(version) : _this3._awaitUnlock(version).then(function () {
            return _this3.locate(version);
          });
        });
      });
    }
  }, {
    key: '_awaitUnlock',
    value: function _awaitUnlock(version) {
      var _this4 = this;

      return this.isDownloading(version).then(function (dl) {
        if (!dl) {
          return false;
        }
        return FlexSdkProvider._delay(RETRY_INTERVAL).then(function () {
          return _this4._awaitUnlock(version);
        });
      });
    }
  }, {
    key: '_beginDownload',
    value: function _beginDownload(version) {
      var lockFile = this._toLockFile(version);
      FlexSdkProvider._writeLockFileSoon(lockFile);
      return FlexSdkProvider._writeLockFile(lockFile);
    }
  }, {
    key: '_endDownload',
    value: function _endDownload(version) {
      var lockFile = this._toLockFile(version);
      FlexSdkProvider._cancelWritingLockFile(lockFile);
      return rimraf(lockFile);
    }
  }, {
    key: '_downloadAndInstall',
    value: function _downloadAndInstall(version) {
      var url = FlexSdkProvider._toUrl(version);
      var target = this._toPath(version);
      var tmpdir = null;
      return mkdirp(this._options.root).then(function () {
        return mktmpdir();
      }).then(function (_tmpdir) {
        tmpdir = _tmpdir;
        return FlexSdkProvider._downloadAndExtract(url, tmpdir);
      }).then(function () {
        if (!IS_WINDOWS) {
          return FlexSdkProvider._fixPermissions(_path2['default'].join(tmpdir, 'bin'));
        }
      }).then(function () {
        return mkdirp(_path2['default'].join(tmpdir, 'frameworks', 'libs', 'player'));
      }).then(function () {
        return installPlayerglobal(tmpdir);
      }).then(function () {
        return rimraf(target);
      }).then(function () {
        return rename(tmpdir, target);
      }).then(function () {
        return target;
      });
    }
  }, {
    key: '_toPath',
    value: function _toPath(version) {
      return _path2['default'].join(this._options.root, version);
    }
  }, {
    key: '_toLockFile',
    value: function _toLockFile(version) {
      return _path2['default'].join(this._options.root, '' + version + '.lock');
    }
  }, {
    key: 'versions',
    get: function () {
      return _Object$keys(VERSIONS);
    }
  }], [{
    key: 'download',
    value: function download(version) {
      return FlexSdkProvider._getInstance().download(version);
    }
  }, {
    key: 'isDownloading',
    value: function isDownloading(version) {
      return FlexSdkProvider._getInstance().isDownloading(version);
    }
  }, {
    key: 'locate',
    value: function locate(version) {
      return FlexSdkProvider._getInstance().locate(version);
    }
  }, {
    key: 'get',
    value: function get(version) {
      return FlexSdkProvider._getInstance().get(version);
    }
  }, {
    key: '_getInstance',
    value: function _getInstance() {
      if (!FlexSdkProvider._instance) {
        FlexSdkProvider._instance = new FlexSdkProvider();
      }
      return FlexSdkProvider._instance;
    }
  }, {
    key: '_writeLockFileSoon',
    value: function _writeLockFileSoon(file) {
      UPDATE_TIMEOUTS[file] = setTimeout(function () {
        FlexSdkProvider._writeLockFile(file).then(function () {
          return FlexSdkProvider._writeLockFileSoon(file);
        });
      }, UPDATE_INTERVAL);
    }
  }, {
    key: '_cancelWritingLockFile',
    value: function _cancelWritingLockFile(file) {
      clearTimeout(UPDATE_TIMEOUTS[file]);
      UPDATE_TIMEOUTS[file] = null;
    }
  }, {
    key: '_readLockFile',
    value: function _readLockFile(file) {
      return readFile(file, { encoding: 'utf8' }).then(function (str) {
        return parseInt(str, 10);
      })['catch'](function (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        return 0;
      }).then(function (lockDate) {
        return lockDate + MAX_AGE >= new Date().getTime();
      });
    }
  }, {
    key: '_writeLockFile',
    value: function _writeLockFile(file) {
      return writeFile(file, '' + new Date().getTime(), { encoding: 'utf8' });
    }
  }, {
    key: '_downloadAndExtract',
    value: function _downloadAndExtract(url, dir) {
      var dl = new _download2['default']({ extract: true }).get(url).dest(dir);
      return (0, _es6Promisify2['default'])(dl.run.bind(dl))();
    }
  }, {
    key: '_fixPermissions',
    value: function _fixPermissions(dir) {
      return readdir(dir).then(function (contents) {
        return contents.reduce(function (prev, curr) {
          var p = _path2['default'].join(dir, curr);
          return prev.then(function () {
            return FlexSdkProvider._maybeMakeExecutable(p);
          });
        }, _Promise.resolve());
      });
    }
  }, {
    key: '_maybeMakeExecutable',
    value: function _maybeMakeExecutable(file) {
      return stat(file).then(function (stats) {
        if (!stats.isDirectory()) {
          return chmod(file, '755');
        }
      });
    }
  }, {
    key: '_toUrl',
    value: function _toUrl(version) {
      if (!VERSIONS.hasOwnProperty(version)) {
        throw new Error('Unknown version: ' + version);
      }
      return VERSIONS[version];
    }
  }, {
    key: '_delay',
    value: function _delay(time) {
      return new _Promise(function (resolve) {
        return setTimeout(resolve, time);
      });
    }
  }, {
    key: 'versions',
    get: function () {
      return FlexSdkProvider._getInstance().versions;
    }
  }]);

  return FlexSdkProvider;
})();

exports['default'] = FlexSdkProvider;
module.exports = exports['default'];