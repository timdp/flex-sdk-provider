'use strict'

var Promise = require('es6-promise').Promise
var promisify = require('es6-promisify')
var Download = require('download')
var defaults = require('defaults')
var tmp = require('tmp')
var fs = require('fs')
var path = require('path')
var os = require('os')

var mkdirp = promisify(require('mkdirp'))
var rimraf = promisify(require('rimraf'))
var installPlayerglobal = promisify(require('playerglobal-latest').install)
var mktmpdir = promisify(tmp.dir.bind(tmp))
var chmod = promisify(fs.chmod)
var readdir = promisify(fs.readdir)
var rename = promisify(fs.rename)
var stat = promisify(fs.stat)

var DEFAULT_ROOT = path.join(__dirname, 'lib', 'flex-sdk')
var VERSIONS = require(path.join(__dirname, 'versions.json'))

var isWindows = /^win/.test(os.platform())

var FlexSdkProvider = function (options) {
  this._options = defaults(options, {root: DEFAULT_ROOT})
}

FlexSdkProvider.prototype.versions = function () {
  return Object.keys(VERSIONS)
}

FlexSdkProvider.prototype.download = function (version) {
  var that = this
  var url = this._toUrl(version)
  var target = this._toPath(version)
  var tmpdir
  return mkdirp(this._options.root)
    .then(function () {
      return mktmpdir()
    })
    .then(function (_tmpdir) {
      tmpdir = _tmpdir
      return that._downloadAndExtract(url, tmpdir)
    })
    .then(function () {
      if (!isWindows) {
        return that._fixPermissions(path.join(tmpdir, 'bin'))
      }
    })
    .then(function () {
      return mkdirp(path.join(tmpdir, 'frameworks', 'libs', 'player'))
    })
    .then(function () {
      return installPlayerglobal(tmpdir)
    })
    .then(function () {
      return rimraf(target)
    })
    .then(function () {
      return rename(tmpdir, target)
    })
    .then(function () {
      return target
    })
}

FlexSdkProvider.prototype.locate = function (version) {
  var dir = this._toPath(version)
  return stat(dir)
    .then(function () {
      return dir
    })
}

FlexSdkProvider.prototype.get = function (version) {
  var that = this
  return this.locate(version)
    .catch(function () {
      return that.download(version)
    })
}

FlexSdkProvider.prototype._toUrl = function (version) {
  if (!VERSIONS.hasOwnProperty(version)) {
    throw new Error('Unknown version: ' + version)
  }
  return VERSIONS[version]
}

FlexSdkProvider.prototype._toPath = function (version) {
  return path.join(this._options.root, version)
}

FlexSdkProvider.prototype._maybeMakeExecutable = function (file) {
  return stat(file)
    .then(function (stats) {
      if (!stats.isDirectory()) {
        return chmod(file, '755')
      }
    })
}

FlexSdkProvider.prototype._fixPermissions = function (dir) {
  var that = this
  return readdir(dir)
    .then(function (contents) {
      return contents.reduce(function (prev, curr) {
        return prev.then(function () {
          return that._maybeMakeExecutable(path.join(dir, curr))
        })
      }, Promise.resolve())
    })
}

FlexSdkProvider.prototype._downloadAndExtract = function (url, dir) {
  var dl = new Download({extract: true})
    .get(url)
    .dest(dir)
  return promisify(dl.run.bind(dl))()
}

var getInstance = (function () {
  var instance = null
  return function () {
    if (instance === null) {
      instance = new FlexSdkProvider()
    }
    return instance
  }
})()

FlexSdkProvider.versions = function () {
  return getInstance().versions()
}

FlexSdkProvider.download = function (version) {
  return getInstance().get(version)
}

FlexSdkProvider.locate = function (version) {
  return getInstance().locate(version)
}

FlexSdkProvider.get = function (version) {
  return getInstance().get(version)
}

module.exports = FlexSdkProvider
