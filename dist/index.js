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

var mkdirp = (0, _es6Promisify2['default'])(_mkdirp2['default']);
var rimraf = (0, _es6Promisify2['default'])(_rimraf2['default']);
var installPlayerglobal = (0, _es6Promisify2['default'])(_playerglobalLatest.install);
var mktmpdir = (0, _es6Promisify2['default'])(_tmp2['default'].dir.bind(_tmp2['default']));
var chmod = (0, _es6Promisify2['default'])(_fs2['default'].chmod);
var readdir = (0, _es6Promisify2['default'])(_fs2['default'].readdir);
var rename = (0, _es6Promisify2['default'])(_fs2['default'].rename);
var stat = (0, _es6Promisify2['default'])(_fs2['default'].stat);

var PKG_ROOT = _path2['default'].resolve(__dirname, '..');
var FLEX_SDK_ROOT = _path2['default'].join(PKG_ROOT, 'lib', 'flex-sdk');
var VERSIONS = require(_path2['default'].join(PKG_ROOT, 'versions.json'));

var IS_WINDOWS = /^win/.test(_os2['default'].platform());

var FlexSdkProvider = (function () {
  function FlexSdkProvider(options) {
    _classCallCheck(this, FlexSdkProvider);

    this._options = (0, _defaults2['default'])(options, { root: FLEX_SDK_ROOT });
  }

  _createClass(FlexSdkProvider, [{
    key: 'download',
    value: function download(version) {
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
    key: 'locate',
    value: function locate(version) {
      var dir = this._toPath(version);
      return stat(dir).then(function () {
        return dir;
      });
    }
  }, {
    key: 'get',
    value: function get(version) {
      var _this = this;

      return this.locate(version)['catch'](function () {
        return _this.download(version);
      });
    }
  }, {
    key: '_toPath',
    value: function _toPath(version) {
      return _path2['default'].join(this._options.root, version);
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
    key: '_toUrl',
    value: function _toUrl(version) {
      if (!VERSIONS.hasOwnProperty(version)) {
        throw new Error('Unknown version: ' + version);
      }
      return VERSIONS[version];
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
    key: '_downloadAndExtract',
    value: function _downloadAndExtract(url, dir) {
      var dl = new _download2['default']({ extract: true }).get(url).dest(dir);
      return (0, _es6Promisify2['default'])(dl.run.bind(dl))();
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