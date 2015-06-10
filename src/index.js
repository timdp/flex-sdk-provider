'use strict'

import es6promise from 'es6-promise'
import promisify from 'es6-promisify'
import {install} from 'playerglobal-latest'
import Download from 'download'
import defaults from 'defaults'
import tmp from 'tmp'
import mkdirpCps from 'mkdirp'
import rimrafCps from 'rimraf'
import fs from 'fs'
import path from 'path'
import os from 'os'

es6promise.polyfill()

const mkdirp = promisify(mkdirpCps)
const rimraf = promisify(rimrafCps)
const installPlayerglobal = promisify(install)
const mktmpdir = promisify(tmp.dir.bind(tmp))
const chmod = promisify(fs.chmod)
const readdir = promisify(fs.readdir)
const rename = promisify(fs.rename)
const stat = promisify(fs.stat)

const PKG_ROOT = path.resolve(__dirname, '..')
const FLEX_SDK_ROOT = path.join(PKG_ROOT, 'lib', 'flex-sdk')
const VERSIONS = require(path.join(PKG_ROOT, 'versions.json'))

const IS_WINDOWS = /^win/.test(os.platform())

class FlexSdkProvider {
  constructor (options) {
    this._options = defaults(options, {root: FLEX_SDK_ROOT})
  }
  download (version) {
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
  locate (version) {
    const dir = this._toPath(version)
    return stat(dir).then(() => dir)
  }
  get (version) {
    return this.locate(version).catch(() => this.download(version))
  }
  get versions () {
    return Object.keys(VERSIONS)
  }
  static download (version) {
    return FlexSdkProvider._getInstance().download(version)
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
  static _toUrl (version) {
    if (!VERSIONS.hasOwnProperty(version)) {
      throw new Error('Unknown version: ' + version)
    }
    return VERSIONS[version]
  }
  _toPath (version) {
    return path.join(this._options.root, version)
  }
  static _maybeMakeExecutable (file) {
    return stat(file).then(stats => {
      if (!stats.isDirectory()) {
        return chmod(file, '755')
      }
    })
  }
  static _fixPermissions (dir) {
    return readdir(dir)
      .then(contents => contents.reduce((prev, curr) => {
        const p = path.join(dir, curr)
        return prev.then(() => FlexSdkProvider._maybeMakeExecutable(p))
      }, Promise.resolve()))
  }
  static _downloadAndExtract (url, dir) {
    const dl = new Download({extract: true}).get(url).dest(dir)
    return promisify(dl.run.bind(dl))()
  }
}

export default FlexSdkProvider
