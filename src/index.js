'use strict'

import es6promise from 'es6-promise'
import promisify from 'es6-promisify'
import {install} from 'playerglobal-latest'
import Download from 'download'
import defaults from 'defaults'
import tmp from 'tmp'
import existsCps from 'fs-exists'
import mkdirpCps from 'mkdirp'
import rimrafCps from 'rimraf'
import fs from 'fs'
import path from 'path'
import os from 'os'

es6promise.polyfill()

const exists = promisify(existsCps)
const mkdirp = promisify(mkdirpCps)
const rimraf = promisify(rimrafCps)
const installPlayerglobal = promisify(install)
const mktmpdir = promisify(tmp.dir.bind(tmp))
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const chmod = promisify(fs.chmod)
const readdir = promisify(fs.readdir)
const rename = promisify(fs.rename)
const stat = promisify(fs.stat)

const IS_WINDOWS = /^win/.test(os.platform())

const PKG_ROOT = path.resolve(__dirname, '..')
const FLEX_SDK_ROOT = path.join(PKG_ROOT, 'lib', 'flex-sdk')
const VERSIONS = require(path.join(PKG_ROOT, 'versions.json'))

const RETRY_INTERVAL = 200
const UPDATE_INTERVAL = 500
const MAX_AGE = 1000

const UPDATE_TIMEOUTS = {}

class FlexSdkProvider {
  constructor (options) {
    this._options = defaults(options, {root: FLEX_SDK_ROOT})
  }
  download (version) {
    let dir = null
    return this._awaitUnlock(version)
      .then(() => this._beginDownload(version))
      .then(() => this._downloadAndInstall(version))
      .then(_dir => dir = _dir)
      .then(() => this._endDownload(version),
        err => this._setDownloading(version, false).then(() => { throw err }))
      .then(() => dir)
  }
  isDownloading (version) {
    const lockFile = this._toLockFile(version)
    return exists(lockFile)
      .then(ex => {
        if (!ex) {
          return false
        }
        return FlexSdkProvider._readLockFile(lockFile)
      })
  }
  locate (version) {
    return this._awaitUnlock(version)
      .then(() => {
        const dir = this._toPath(version)
        return stat(dir).then(() => dir)
      })
  }
  get (version) {
    return this.locate(version)
      .catch(() => {
        return this.isDownloading(version)
          .then(dl => !dl ? this.download(version) :
            this._awaitUnlock(version).then(() => this.locate(version)))
      })
  }
  get versions () {
    return Object.keys(VERSIONS)
  }
  static download (version) {
    return FlexSdkProvider._getInstance().download(version)
  }
  static isDownloading (version) {
    return FlexSdkProvider._getInstance().isDownloading(version)
  }
  static locate (version) {
    return FlexSdkProvider._getInstance().locate(version)
  }
  static get (version) {
    return FlexSdkProvider._getInstance().get(version)
  }
  static get versions () {
    return FlexSdkProvider._getInstance().versions
  }
  static _getInstance () {
    if (!FlexSdkProvider._instance) {
      FlexSdkProvider._instance = new FlexSdkProvider()
    }
    return FlexSdkProvider._instance
  }
  _awaitUnlock (version) {
    return this.isDownloading(version)
      .then(dl => {
        if (!dl) {
          return false
        }
        return FlexSdkProvider._delay(RETRY_INTERVAL)
          .then(() => this._awaitUnlock(version))
      })
  }
  _beginDownload (version) {
    const lockFile = this._toLockFile(version)
    FlexSdkProvider._writeLockFileSoon(lockFile)
    return FlexSdkProvider._writeLockFile(lockFile)
  }
  _endDownload (version) {
    const lockFile = this._toLockFile(version)
    FlexSdkProvider._cancelWritingLockFile(lockFile)
    return rimraf(lockFile)
  }
  static _writeLockFileSoon (file) {
    UPDATE_TIMEOUTS[file] = setTimeout(() => {
      FlexSdkProvider._writeLockFile(file)
        .then(() => FlexSdkProvider._writeLockFileSoon(file))
    }, UPDATE_INTERVAL)
  }
  static _cancelWritingLockFile (file) {
    clearTimeout(UPDATE_TIMEOUTS[file])
    UPDATE_TIMEOUTS[file] = null
  }
  static _readLockFile (file) {
    return readFile(file, {encoding: 'utf8'})
      .then(str => parseInt(str, 10))
      .catch(err => {
        if (err.code !== 'ENOENT') {
          throw err
        }
        return 0
      })
      .then(lockDate => (lockDate + MAX_AGE >= new Date().getTime()))
  }
  static _writeLockFile (file) {
    return writeFile(file, '' + new Date().getTime(), {encoding: 'utf8'})
  }
  _downloadAndInstall (version) {
    const url = FlexSdkProvider._toUrl(version)
    const target = this._toPath(version)
    let tmpdir = null
    return mkdirp(this._options.root)
      .then(() => mktmpdir())
      .then(_tmpdir => {
        tmpdir = _tmpdir
        return FlexSdkProvider._downloadAndExtract(url, tmpdir)
      })
      .then(() => {
        if (!IS_WINDOWS) {
          return FlexSdkProvider._fixPermissions(path.join(tmpdir, 'bin'))
        }
      })
      .then(() => mkdirp(path.join(tmpdir, 'frameworks', 'libs', 'player')))
      .then(() => installPlayerglobal(tmpdir))
      .then(() => rimraf(target))
      .then(() => rename(tmpdir, target))
      .then(() => target)
  }
  static _downloadAndExtract (url, dir) {
    const dl = new Download({extract: true}).get(url).dest(dir)
    return promisify(dl.run.bind(dl))()
  }
  static _fixPermissions (dir) {
    return readdir(dir)
      .then(contents => contents.reduce((prev, curr) => {
        const p = path.join(dir, curr)
        return prev.then(() => FlexSdkProvider._maybeMakeExecutable(p))
      }, Promise.resolve()))
  }
  static _maybeMakeExecutable (file) {
    return stat(file).then(stats => {
      if (!stats.isDirectory()) {
        return chmod(file, '755')
      }
    })
  }
  static _toUrl (version) {
    if (!VERSIONS.hasOwnProperty(version)) {
      throw new Error(`Unknown version: ${version}`)
    }
    return VERSIONS[version]
  }
  _toPath (version) {
    return path.join(this._options.root, version)
  }
  _toLockFile (version) {
    return path.join(this._options.root, `${version}.lock`)
  }
  static _delay (time) {
    return new Promise(resolve => setTimeout(resolve, time))
  }
}

export default FlexSdkProvider
