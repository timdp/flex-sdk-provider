'use strict'

import Promise from 'pinkie-promise'
import pify from 'pify'
import {install} from 'playerglobal-latest'
import Download from 'download'
import defaults from 'defaults'
import userHome from 'user-home'
import tmp from 'tmp'
import mkdirpCps from 'mkdirp'
import del from 'del'
import slash from 'slash'
import fs from 'fs'
import path from 'path'
import os from 'os'

const mkdirp = pify(mkdirpCps)
const installPlayerglobal = pify(install)
const mktmpdir = pify(tmp.dir.bind(tmp))
const readFile = pify(fs.readFile)
const writeFile = pify(fs.writeFile)
const chmod = pify(fs.chmod)
const readdir = pify(fs.readdir)
const rename = pify(fs.rename)
const stat = pify(fs.stat)

const IS_WINDOWS = /^win/.test(os.platform())

const PKG_ROOT = path.resolve(__dirname, '..')
const FLEX_SDK_ROOT = path.join(userHome, '.flex-sdk')
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
      .then((_dir) => { dir = _dir })
      .then(() => this._endDownload(version),
        (err) => this._endDownload(version).then(() => { throw err }))
      .then(() => dir)
  }

  isDownloading (version) {
    const lockFile = this._toLockFile(version)
    return stat(lockFile)
      .catch(() => false)
      .then((ex) => ex && FlexSdkProvider._readLockFile(lockFile))
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
          .then((dl) => !dl ? this.download(version)
            : this._awaitUnlock(version).then(() => this.locate(version)))
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
      .then((dl) => {
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
    return del(lockFile, {force: true})
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
    return readFile(file, 'utf8')
      .then((str) => parseInt(str, 10))
      .catch((err) => {
        if (err.code !== 'ENOENT') {
          throw err
        }
        return 0
      })
      .then((lockDate) => (lockDate + MAX_AGE >= new Date().getTime()))
  }

  static _writeLockFile (file) {
    return mkdirp(path.dirname(file))
      .then(() => writeFile(file, '' + new Date().getTime(), 'utf8'))
  }

  _downloadAndInstall (version) {
    const url = FlexSdkProvider._toUrl(version)
    const target = this._toPath(version)
    let tmpdir = null
    return mkdirp(this._options.root)
      .then(() => mktmpdir())
      .then(([dir]) => { tmpdir = dir })
      .then(() => FlexSdkProvider._downloadAndExtract(url, tmpdir))
      .then(() => {
        if (!IS_WINDOWS) {
          return FlexSdkProvider._fixPermissions(path.join(tmpdir, 'bin'))
        }
      })
      .then(() => mkdirp(path.join(tmpdir, 'frameworks', 'libs', 'player')))
      .then(() => installPlayerglobal(tmpdir))
      .then(() => del(target, {force: true}))
      .then(() => rename(tmpdir, target))
      .then(() => FlexSdkProvider._writeEnvProperties(target))
      .then(() => target)
  }

  static _downloadAndExtract (url, dir) {
    const dl = new Download({extract: true}).get(url).dest(dir)
    return pify(dl.run.bind(dl))()
  }

  static _fixPermissions (dir) {
    return readdir(dir)
      .then((contents) => contents.reduce((prev, curr) => {
        const p = path.join(dir, curr)
        return prev.then(() => FlexSdkProvider._maybeMakeExecutable(p))
      }, Promise.resolve()))
  }

  static _maybeMakeExecutable (file) {
    return stat(file).then((stats) => {
      if (!stats.isDirectory()) {
        return chmod(file, '755')
      }
    })
  }

  static _writeEnvProperties (installDir) {
    const filePath = path.join(installDir, 'env.properties')
    const playerDir = slash(path.join(installDir, 'frameworks', 'libs', 'player'))
    const contents = `env.PLAYERGLOBAL_HOME=${playerDir}\n`
    return writeFile(filePath, contents, 'utf8')
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
    return new Promise((resolve) => setTimeout(resolve, time))
  }
}

export default FlexSdkProvider
